import { prisma } from "../db";
import { requireAuth, requireProgramAccess } from "../security/guards";
import { parseCustomSubmissionValues } from "../utils/custom-tasks";
import { SubmitDayProgressSchema } from "../validators/program";
import { parseWorkoutOptionGroups, safeJsonParse } from "../utils/json";
import { calculateSleepDuration, getProgramDayWibWindow } from "../utils/timezone";
import type { WellnessActionResult } from "../actions/auth";

export interface ProgramSubmissionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  programDayId: string;
  dayNumber: number;
  dayTitle: string;
  dayType: string;
  isCompleted: boolean;
  videoWatched: boolean;
  checklistCompleted: string[];
  selectedWorkout: string | null;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  workoutNotes: string | null;
  eventFeedback: string | null;
  mealCompliance: string | null;
  mealNotes: string | null;
  dailyReflection: string | null;
  happinessRate: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  sleepDurationMinutes: number | null;
  assessmentResponse: string | null;
  customSubmissions?: Array<{
    id: string;
    customTaskId: string;
    title: string;
    taskType: string;
    values: Record<string, unknown>;
  }>;
  completedAt: string | null;
  updatedAt: string;
}

export interface ProgramSubmissionsPayload {
  submissions: ProgramSubmissionItem[];
  stats: {
    totalSubmissions: number;
    completedSubmissions: number;
    photoSubmissions: number;
    uniqueMembers: number;
  };
}

export async function submitDayProgressService(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = SubmitDayProgressSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid day progress input.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    programDayId,
    videoWatched,
    isCompleted,
    checklistCompleted,
    selectedWorkout,
    photoBeforeUrl,
    photoAfterUrl,
    workoutNotes,
    eventFeedback,
    mealCompliance,
    mealNotes,
    dailyReflection,
    happinessRate,
    bedtime,
    wakeTime,
    sleepDurationMinutes,
    assessmentResponse,
  } = validation.data;

  const programDay = await prisma.programDay.findUnique({
    where: { id: programDayId },
    include: { program: true },
  });

  if (!programDay) {
    return { success: false, message: "Scheduled day not found." };
  }

  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      userId_programId: {
        userId: session.userId,
        programId: programDay.programId,
      },
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") {
    return {
      success: false,
      message:
        "Access denied. Active QRIS-verified enrollment is required to log daily curriculum progress.",
    };
  }

  const { isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(
    programDay.program.startDate,
    programDay.dayNumber
  );

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Day ${programDay.dayNumber} is locked until 00:00 WIB on its scheduled calendar date.`,
    };
  }

  // Existing answers stay editable after 23:59 WIB. A day with no saved row stays closed.
  const existingProgress = await prisma.programDayProgress.findUnique({
    where: {
      userId_programDayId: {
        userId: session.userId,
        programDayId,
      },
    },
  });

  if (isPast2359 && !existingProgress) {
    return {
      success: false,
      message: `The 23:59 WIB cutoff for Day ${programDay.dayNumber} has passed. Past days are read-only.`,
    };
  }

  const nextVideoWatched =
    videoWatched !== undefined
      ? videoWatched
      : existingProgress?.videoWatched ?? false;

  const finalBedtime = bedtime !== undefined ? bedtime : existingProgress?.bedtime || null;
  const finalWakeTime = wakeTime !== undefined ? wakeTime : existingProgress?.wakeTime || null;
  let finalSleepMinutes = sleepDurationMinutes;
  if (finalSleepMinutes === undefined && finalBedtime && finalWakeTime) {
    const calc = calculateSleepDuration(finalBedtime, finalWakeTime);
    finalSleepMinutes = calc ? calc.totalMinutes : null;
  }

  let verifiedCompleted = isCompleted;
  if (programDay.dayType === "TRAINING_DAY") {
    const rawChecklist: string[] = safeJsonParse<string[]>(programDay.videoChecklist, []);
    const groups = parseWorkoutOptionGroups(
      safeJsonParse<string[]>(programDay.workoutOptions, []),
      rawChecklist
    );

    const activeOptName =
      selectedWorkout ||
      existingProgress?.selectedWorkout ||
      groups[0]?.optionName ||
      "Workout";

    const activeGroup =
      groups.find(
        (g) => g.optionName.trim().toLowerCase() === activeOptName.trim().toLowerCase()
      ) || groups[0];

    if (activeGroup && activeGroup.movements.length > 0) {
      const checkedKeys = new Set(
        checklistCompleted.map((item) =>
          (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
        )
      );

      const allActiveMovementsDone = activeGroup.movements.every((m) => {
        const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
        const plainKey = m.name.trim().toLowerCase();
        return checkedKeys.has(scopedKey) || checkedKeys.has(plainKey);
      });

      if (!allActiveMovementsDone) {
        verifiedCompleted = false;
      }
    } else if (rawChecklist.length > 0) {
      const allTasksChecked = rawChecklist.every((t) => checklistCompleted.includes(t));
      if (!allTasksChecked) {
        verifiedCompleted = false;
      }
    }
  }

  if (verifiedCompleted) {
    const requiredCustomTasks = await prisma.programDayCustomTask.findMany({
      where: { programDayId, isRequired: true },
      select: { id: true },
    });
    if (requiredCustomTasks.length > 0) {
      const submittedCount = await prisma.programDayCustomSubmission.count({
        where: {
          userId: session.userId,
          customTaskId: { in: requiredCustomTasks.map((t) => t.id) },
        },
      });
      if (submittedCount < requiredCustomTasks.length) {
        verifiedCompleted = false;
      }
    }
  }

  const payloadData = {
    videoWatched: nextVideoWatched,
    isCompleted: verifiedCompleted,
    checklistCompleted: JSON.stringify(checklistCompleted),
    selectedWorkout:
      selectedWorkout !== undefined
        ? selectedWorkout || null
        : existingProgress?.selectedWorkout,
    photoBeforeUrl:
      photoBeforeUrl !== undefined ? photoBeforeUrl || null : existingProgress?.photoBeforeUrl,
    photoAfterUrl:
      photoAfterUrl !== undefined ? photoAfterUrl || null : existingProgress?.photoAfterUrl,
    workoutNotes:
      workoutNotes !== undefined ? workoutNotes || null : existingProgress?.workoutNotes,
    eventFeedback:
      eventFeedback !== undefined ? eventFeedback || null : existingProgress?.eventFeedback,
    mealCompliance:
      mealCompliance !== undefined ? mealCompliance || null : existingProgress?.mealCompliance,
    mealNotes: mealNotes !== undefined ? mealNotes || null : existingProgress?.mealNotes,
    dailyReflection:
      dailyReflection !== undefined
        ? dailyReflection || null
        : existingProgress?.dailyReflection,
    happinessRate:
      happinessRate !== undefined ? happinessRate : existingProgress?.happinessRate,
    bedtime: finalBedtime,
    wakeTime: finalWakeTime,
    sleepDurationMinutes: finalSleepMinutes,
    assessmentResponse:
      assessmentResponse !== undefined
        ? assessmentResponse || null
        : existingProgress?.assessmentResponse,
    completedAt: verifiedCompleted ? existingProgress?.completedAt ?? new Date() : null,
  };

  const progress = existingProgress
    ? await prisma.programDayProgress.update({
        where: { id: existingProgress.id },
        data: payloadData,
      })
    : await prisma.programDayProgress.create({
        data: {
          userId: session.userId,
          programDayId,
          ...payloadData,
        },
      });

  return {
    success: true,
    message: verifiedCompleted
      ? programDay.completedReminder || "Day marked as completed! Excellent job."
      : "Daily progress saved.",
    data: progress,
  };
}

export async function getProgramSubmissionsService(
  programId: string,
  filters?: {
    dayNumber?: number;
    userId?: string;
    hasPhotosOnly?: boolean;
    limit?: number;
  }
): Promise<WellnessActionResult<ProgramSubmissionsPayload>> {
  if (!programId) {
    return { success: false, message: "Program ID is required." };
  }

  await requireProgramAccess(programId);

  const dayNumberFilter =
    filters?.dayNumber !== undefined && filters.dayNumber > 0
      ? { dayNumber: filters.dayNumber }
      : {};
  const userFilter =
    filters?.userId && filters.userId !== "ALL" ? { userId: filters.userId } : {};
  const photoFilter = filters?.hasPhotosOnly
    ? { OR: [{ photoBeforeUrl: { not: null } }, { photoAfterUrl: { not: null } }] }
    : {};

  const limit = filters?.limit ? Math.min(500, Math.max(1, filters.limit)) : 200;

  const [rawRecords, rawCustomSubs] = await Promise.all([
    prisma.programDayProgress.findMany({
      where: {
        programDay: { programId, ...dayNumberFilter },
        ...userFilter,
        ...photoFilter,
      },
      take: limit,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        programDay: {
          select: { id: true, dayNumber: true, title: true, dayType: true },
        },
      },
      orderBy: [{ programDay: { dayNumber: "asc" } }, { completedAt: "desc" }],
    }),
    prisma.programDayCustomSubmission.findMany({
      where: {
        programDay: { programId, ...dayNumberFilter },
        ...userFilter,
      },
      include: {
        customTask: { select: { id: true, title: true, taskType: true } },
      },
    }),
  ]);

  const customSubsByPair = new Map<string, ProgramSubmissionItem["customSubmissions"]>();
  for (const cs of rawCustomSubs) {
    const key = `${cs.userId}:${cs.programDayId}`;
    const list = customSubsByPair.get(key) ?? [];
    list.push({
      id: cs.id,
      customTaskId: cs.customTaskId,
      title: cs.customTask.title,
      taskType: cs.customTask.taskType,
      values: parseCustomSubmissionValues(cs.valuesJson),
    });
    customSubsByPair.set(key, list);
  }

  const uniqueUserIds = new Set<string>();
  let completedCount = 0;
  let photoCount = 0;

  const submissions: ProgramSubmissionItem[] = rawRecords.map((r) => {
    uniqueUserIds.add(r.userId);
    if (r.isCompleted) completedCount++;
    if (r.photoBeforeUrl || r.photoAfterUrl) photoCount++;

    return {
      id: r.id,
      userId: r.userId,
      userName: r.user?.fullName || "Member",
      userEmail: r.user?.email || "",
      programDayId: r.programDayId,
      dayNumber: r.programDay.dayNumber,
      dayTitle: r.programDay.title,
      dayType: r.programDay.dayType,
      isCompleted: r.isCompleted,
      videoWatched: r.videoWatched,
      checklistCompleted: safeJsonParse<string[]>(r.checklistCompleted, []),
      selectedWorkout: r.selectedWorkout,
      photoBeforeUrl: r.photoBeforeUrl,
      photoAfterUrl: r.photoAfterUrl,
      workoutNotes: r.workoutNotes,
      eventFeedback: r.eventFeedback,
      mealCompliance: r.mealCompliance,
      mealNotes: r.mealNotes,
      dailyReflection: r.dailyReflection,
      happinessRate: r.happinessRate,
      bedtime: r.bedtime,
      wakeTime: r.wakeTime,
      sleepDurationMinutes: r.sleepDurationMinutes,
      assessmentResponse: r.assessmentResponse,
      customSubmissions: customSubsByPair.get(`${r.userId}:${r.programDayId}`) ?? [],
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return {
    success: true,
    message: "Program submissions loaded successfully.",
    data: {
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        completedSubmissions: completedCount,
        photoSubmissions: photoCount,
        uniqueMembers: uniqueUserIds.size,
      },
    },
  };
}
