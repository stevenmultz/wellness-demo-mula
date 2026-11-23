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

export interface DayCompletionCandidate {
  isVideoWatched: boolean;
  checklistCompleted: string[];
  selectedWorkout: string | null;
  workoutNotes: string | null;
  eventFeedback: string | null;
  mealCompliance: string | null;
  bedtime: string | null;
  wakeTime: string | null;
}

export interface DayCompletionDayMeta {
  id: string;
  dayType: string;
  videoUrl: string | null;
  workoutOptionsJson: Prisma.JsonValue | null;
  videoChecklistJson: Prisma.JsonValue | null;
}

/**
 * Authoritative server-side day completion evaluator (Single Source of Truth).
 * Every task is required (no optional tasks):
 * - Core tasks (3): Sleep + Activity (Training/Rest/Connect) + Meal (Daily Reflection removed)
 * - Custom tasks: ALL custom tasks attached to the day must be submitted.
 */
export async function computeVerifiedDayCompletionInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  programDay: DayCompletionDayMeta,
  state: DayCompletionCandidate
): Promise<boolean> {
  const sleepDone = Boolean(
    state.bedtime &&
      state.wakeTime &&
      state.bedtime !== "SKIPPED" &&
      state.wakeTime !== "SKIPPED"
  );
  const mealDone = Boolean(
    state.mealCompliance && state.mealCompliance !== "SKIPPED"
  );
  const activityHasInput =
    programDay.dayType === "TRAINING_DAY"
      ? Boolean(
          state.isVideoWatched ||
            (state.workoutNotes && state.workoutNotes !== "SKIPPED") ||
            (state.selectedWorkout && state.selectedWorkout !== "SKIPPED") ||
            state.checklistCompleted.length > 0
        )
      : programDay.dayType === "REST_DAY"
        ? Boolean(
            (state.workoutNotes && state.workoutNotes !== "SKIPPED") ||
              state.checklistCompleted.length > 0
          )
        : Boolean(state.eventFeedback && state.eventFeedback !== "SKIPPED");

  if (!sleepDone || !mealDone || !activityHasInput) {
    return false;
  }

  if (
    programDay.dayType === "TRAINING_DAY" &&
    programDay.videoUrl &&
    !state.isVideoWatched
  ) {
    return false;
  }

  const targetChecklist = safeJsonParse<string[]>(
    programDay.videoChecklistJson,
    []
  );
  if (targetChecklist.length > 0 && programDay.dayType === "TRAINING_DAY") {
    const groups = parseWorkoutOptionGroups(
      safeJsonParse<string[]>(programDay.workoutOptionsJson, []),
      targetChecklist
    );
    const activeOption =
      state.selectedWorkout || groups[0]?.optionName || "Workout";
    const activeGroup =
      groups.find(
        (g) =>
          g.optionName.trim().toLowerCase() === activeOption.trim().toLowerCase()
      ) || groups[0];

    if (activeGroup && activeGroup.movements.length > 0) {
      const checkedSet = new Set(
        state.checklistCompleted.map((item) =>
          (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
        )
      );
      const allMovementsDone = activeGroup.movements.every((m) => {
        const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
        const plainKey = m.name.trim().toLowerCase();
        return checkedSet.has(scopedKey) || checkedSet.has(plainKey);
      });
      if (!allMovementsDone) return false;
    } else {
      const allChecklistDone = targetChecklist.every((item) =>
        state.checklistCompleted.includes(item)
      );
      if (!allChecklistDone) return false;
    }
  }

  // ALL custom tasks on the day are required (no optional custom tasks)
  const dayCustomTasks = await tx.programDayCustomTask.findMany({
    where: { programDayId: programDay.id },
    select: { id: true },
  });
  if (dayCustomTasks.length > 0) {
    const submittedCount = await tx.programDayCustomSubmission.count({
      where: {
        userId,
        programDayId: programDay.id,
        customTaskId: { in: dayCustomTasks.map((t) => t.id) },
      },
    });
    if (submittedCount < dayCustomTasks.length) {
      return false;
    }
  }

  return true;
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

  const effectiveStartAt =
    programDay.program.locationType === "ONLINE"
      ? enrollment.paidAt ??
        enrollment.approvedAt ??
        enrollment.createdAt ??
        programDay.program.startAt
      : programDay.program.startAt;
  const { isCalendarUnlocked, isPast2359 } = !effectiveStartAt
    ? { isCalendarUnlocked: true, isPast2359: false }
    : getProgramDayWibWindow(effectiveStartAt, programDay.dayNumber);

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Access denied. Day ${programDay.dayNumber} unlocks on its scheduled date at 00:00 WIB.`,
    };
  }

  if (isPast2359) {
    return {
      success: false,
      message: `Day ${programDay.dayNumber} submission window closed at 23:59 WIB. Missed days are recorded as skipped.`,
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

      const finalBedtime =
        bedtime !== undefined ? bedtime || null : existingProgress?.bedtime ?? null;
      const finalWakeTime =
        wakeTime !== undefined ? wakeTime || null : existingProgress?.wakeTime ?? null;
      const computedSleep =
        finalBedtime && finalWakeTime
          ? calculateSleepDuration(finalBedtime, finalWakeTime)
          : null;
      const finalSleepMinutes =
        sleepDurationMinutes !== undefined
          ? sleepDurationMinutes
          : computedSleep?.totalMinutes ?? existingProgress?.sleepDurationMinutes ?? null;

      const nextVideoWatched =
        videoWatched !== undefined
          ? videoWatched
          : existingProgress?.isVideoWatched ?? false;
      const finalChecklist =
        checklistCompleted !== undefined
          ? checklistCompleted
          : safeJsonParse<string[]>(existingProgress?.checklistCompletedJson, []);

      const finalSelectedWorkout =
        selectedWorkout !== undefined
          ? selectedWorkout || null
          : existingProgress?.selectedWorkout ?? null;
      const finalWorkoutNotes =
        workoutNotes !== undefined
          ? workoutNotes || null
          : existingProgress?.workoutNotes ?? null;
      const finalEventFeedback =
        eventFeedback !== undefined
          ? eventFeedback || null
          : existingProgress?.eventFeedback ?? null;
      const finalMealCompliance =
        mealCompliance !== undefined
          ? mealCompliance || null
          : existingProgress?.mealCompliance ?? null;
      const finalMealNotes =
        mealNotes !== undefined ? mealNotes || null : existingProgress?.mealNotes ?? null;
      const finalDailyReflection =
        dailyReflection !== undefined
          ? dailyReflection || null
          : existingProgress?.dailyReflection ?? null;
      const finalHappinessRate =
        happinessRate !== undefined ? happinessRate : existingProgress?.happinessRate ?? null;
      const finalAssessmentResponse =
        assessmentResponse !== undefined
          ? assessmentResponse || null
          : existingProgress?.assessmentResponse ?? null;

      const verifiedCompleted = await computeVerifiedDayCompletionInTx(
        tx,
        session.userId,
        programDay,
        {
          isVideoWatched: nextVideoWatched,
          checklistCompleted: finalChecklist,
          selectedWorkout: finalSelectedWorkout,
          workoutNotes: finalWorkoutNotes,
          eventFeedback: finalEventFeedback,
          mealCompliance: finalMealCompliance,
          bedtime: finalBedtime,
          wakeTime: finalWakeTime,
        }
      );

      const payloadData = {
        isVideoWatched: nextVideoWatched,
        isCompleted: verifiedCompleted,
        checklistCompletedJson: finalChecklist as Prisma.InputJsonValue,
        selectedWorkout: finalSelectedWorkout,
        workoutNotes: finalWorkoutNotes,
        eventFeedback: finalEventFeedback,
        mealCompliance: finalMealCompliance,
        mealNotes: finalMealNotes,
        dailyReflection: finalDailyReflection,
        happinessRate: finalHappinessRate,
        bedtime: finalBedtime,
        wakeTime: finalWakeTime,
        sleepDurationMinutes: finalSleepMinutes,
        assessmentResponse: finalAssessmentResponse,
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
      take: Math.min(1000, limit * 5),
      orderBy: { submittedAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        programDay: {
          select: { id: true, dayNumber: true, title: true, dayType: true },
        },
        customTask: { select: { id: true, title: true, taskType: true } },
      },
    }),
  ]);

  const customSubsByPair = new Map<string, NonNullable<ProgramSubmissionItem["customSubmissions"]>>();
  const customOnlyMetaByPair = new Map<
    string,
    {
      userId: string;
      userName: string;
      userEmail: string;
      programDayId: string;
      dayNumber: number;
      dayTitle: string;
      dayType: string;
      updatedAt: Date;
    }
  >();

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

    const prevMeta = customOnlyMetaByPair.get(key);
    if (!prevMeta || cs.updatedAt > prevMeta.updatedAt) {
      customOnlyMetaByPair.set(key, {
        userId: cs.userId,
        userName: cs.user?.fullName || "Member",
        userEmail: cs.user?.email || "",
        programDayId: cs.programDayId,
        dayNumber: cs.programDay.dayNumber,
        dayTitle: cs.programDay.title,
        dayType: cs.programDay.dayType,
        updatedAt: cs.updatedAt,
      });
    }
  }

  const seenPairs = new Set<string>();
  const uniqueUserIds = new Set<string>();
  let completedCount = 0;

  const submissions: ProgramSubmissionItem[] = rawRecords.map((r) => {
    const pairKey = `${r.userId}:${r.programDayId}`;
    seenPairs.add(pairKey);
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
      customSubmissions: customSubsByPair.get(pairKey) ?? [],
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  // Include members who submitted Custom Tasks before logging any core task
  for (const [pairKey, meta] of customOnlyMetaByPair.entries()) {
    if (seenPairs.has(pairKey)) continue;
    uniqueUserIds.add(meta.userId);
    submissions.push({
      id: `custom-only:${pairKey}`,
      userId: meta.userId,
      userName: meta.userName,
      userEmail: meta.userEmail,
      programDayId: meta.programDayId,
      dayNumber: meta.dayNumber,
      dayTitle: meta.dayTitle,
      dayType: meta.dayType,
      isCompleted: false,
      videoWatched: false,
      checklistCompleted: [],
      selectedWorkout: null,
      workoutNotes: null,
      eventFeedback: null,
      mealCompliance: null,
      mealNotes: null,
      dailyReflection: null,
      happinessRate: null,
      bedtime: null,
      wakeTime: null,
      sleepDurationMinutes: null,
      assessmentResponse: null,
      customSubmissions: customSubsByPair.get(pairKey) ?? [],
      completedAt: null,
      updatedAt: meta.updatedAt.toISOString(),
    });
  }

  submissions.sort((a, b) => a.dayNumber - b.dayNumber || b.updatedAt.localeCompare(a.updatedAt));

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
