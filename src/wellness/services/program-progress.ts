import { Prisma } from "@prisma/client";
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
        "Access denied. Active enrollment is required to log daily curriculum progress.",
    };
  }

  const isAnytimeOnline =
    programDay.program.locationType === "ONLINE" || !programDay.program.startAt;
  const { isCalendarUnlocked, isPast2359 } = isAnytimeOnline
    ? { isCalendarUnlocked: true, isPast2359: false }
    : getProgramDayWibWindow(programDay.program.startAt!, programDay.dayNumber);

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Access denied. Day ${programDay.dayNumber} unlocks on its scheduled date at 00:00 WIB.`,
    };
  }

  let progress;
  try {
    progress = await prisma.$transaction(async (tx) => {
      const existingProgress = await tx.programDayProgress.findUnique({
        where: {
          userId_programDayId: {
            userId: session.userId,
            programDayId,
          },
        },
      });

    if (isPast2359 && !existingProgress) {
      throw new Error(
        `Day ${programDay.dayNumber} submission window closed at 23:59 WIB. Missed days are recorded as skipped.`
      );
    }

    const finalBedtime = bedtime !== undefined ? bedtime || null : existingProgress?.bedtime ?? null;
    const finalWakeTime =
      wakeTime !== undefined ? wakeTime || null : existingProgress?.wakeTime ?? null;
    const computedSleep =
      finalBedtime && finalWakeTime ? calculateSleepDuration(finalBedtime, finalWakeTime) : null;
    const finalSleepMinutes =
      sleepDurationMinutes !== undefined
        ? sleepDurationMinutes
        : computedSleep?.totalMinutes ?? existingProgress?.sleepDurationMinutes ?? null;

    const nextVideoWatched =
      videoWatched !== undefined ? videoWatched : existingProgress?.isVideoWatched ?? false;
    const targetChecklist = safeJsonParse<string[]>(programDay.videoChecklistJson, []);

    let verifiedCompleted = isCompleted;
    if (verifiedCompleted) {
      if (programDay.dayType === "TRAINING_DAY" && programDay.videoUrl && !nextVideoWatched) {
        verifiedCompleted = false;
      }

      if (targetChecklist.length > 0) {
        const groups = parseWorkoutOptionGroups(
          safeJsonParse<string[]>(programDay.workoutOptionsJson, []),
          targetChecklist
        );
        const activeOption =
          (selectedWorkout !== undefined ? selectedWorkout : existingProgress?.selectedWorkout) ||
          groups[0]?.optionName ||
          "Workout";

        const activeGroup =
          groups.find(
            (g) => g.optionName.trim().toLowerCase() === activeOption.trim().toLowerCase()
          ) || groups[0];

        if (activeGroup && activeGroup.movements.length > 0 && programDay.dayType === "TRAINING_DAY") {
          const checkedSet = new Set(
            checklistCompleted.map((item) =>
              (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
            )
          );
          const allMovementsDone = activeGroup.movements.every((m) => {
            const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
            const plainKey = m.name.trim().toLowerCase();
            return checkedSet.has(scopedKey) || checkedSet.has(plainKey);
          });
          if (!allMovementsDone) verifiedCompleted = false;
        } else {
          const allChecklistDone = targetChecklist.every((item) => checklistCompleted.includes(item));
          if (!allChecklistDone) verifiedCompleted = false;
        }
      }

      const requiredCustomTasks = await tx.programDayCustomTask.findMany({
        where: { programDayId, isRequired: true },
        select: { id: true },
      });
      if (requiredCustomTasks.length > 0) {
        const submittedCount = await tx.programDayCustomSubmission.count({
          where: {
            userId: session.userId,
            programDayId,
            customTaskId: { in: requiredCustomTasks.map((t) => t.id) },
          },
        });
        if (submittedCount < requiredCustomTasks.length) {
          verifiedCompleted = false;
        }
      }
    }

    const payloadData = {
      isVideoWatched: nextVideoWatched,
      isCompleted: verifiedCompleted,
      checklistCompletedJson: checklistCompleted as Prisma.InputJsonValue,
      selectedWorkout:
        selectedWorkout !== undefined
          ? selectedWorkout || null
          : existingProgress?.selectedWorkout ?? null,
      workoutNotes:
        workoutNotes !== undefined ? workoutNotes || null : existingProgress?.workoutNotes ?? null,
      eventFeedback:
        eventFeedback !== undefined ? eventFeedback || null : existingProgress?.eventFeedback ?? null,
      mealCompliance:
        mealCompliance !== undefined ? mealCompliance || null : existingProgress?.mealCompliance ?? null,
      mealNotes: mealNotes !== undefined ? mealNotes || null : existingProgress?.mealNotes ?? null,
      dailyReflection:
        dailyReflection !== undefined
          ? dailyReflection || null
          : existingProgress?.dailyReflection ?? null,
      happinessRate:
        happinessRate !== undefined ? happinessRate : existingProgress?.happinessRate ?? null,
      bedtime: finalBedtime,
      wakeTime: finalWakeTime,
      sleepDurationMinutes: finalSleepMinutes,
      assessmentResponse:
        assessmentResponse !== undefined
          ? assessmentResponse || null
          : existingProgress?.assessmentResponse ?? null,
      completedAt: verifiedCompleted ? existingProgress?.completedAt ?? new Date() : null,
    };

      return tx.programDayProgress.upsert({
        where: {
          userId_programDayId: {
            userId: session.userId,
            programDayId,
          },
        },
        create: {
          userId: session.userId,
          programDayId,
          ...payloadData,
        },
        update: payloadData,
      });
    });
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save daily progress.",
    };
  }

  return {
    success: true,
    message: progress.isCompleted
      ? `Day ${programDay.dayNumber} completed! Great consistency.`
      : "Daily progress saved.",
    data: {
      ...progress,
      videoWatched: progress.isVideoWatched,
      checklistCompleted: safeJsonParse<string[]>(progress.checklistCompletedJson, []),
    },
  };
}

export async function getProgramSubmissionsService(
  programId: string,
  filters?: {
    dayNumber?: number;
    userId?: string;
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

  const limit = filters?.limit ? Math.min(500, Math.max(1, filters.limit)) : 200;

  const [rawRecords, rawCustomSubs] = await Promise.all([
    prisma.programDayProgress.findMany({
      where: {
        programDay: { programId, ...dayNumberFilter },
        ...userFilter,
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
      take: limit * 20,
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

  const submissions: ProgramSubmissionItem[] = rawRecords.map((r) => {
    uniqueUserIds.add(r.userId);
    if (r.isCompleted) completedCount++;

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
      videoWatched: r.isVideoWatched,
      checklistCompleted: safeJsonParse<string[]>(r.checklistCompletedJson, []),
      selectedWorkout: r.selectedWorkout,
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
        uniqueMembers: uniqueUserIds.size,
      },
    },
  };
}
