import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { RATE_LIMITS } from "../config";
import { requireAuth } from "../security/guards";
import { checkDistributedRateLimit, checkRateLimit } from "../security/rate-limit";
import {
  UpsertDailyMealSchema,
  UpsertDailySleepSchema,
  UpsertDailyStepsSchema,
  UpsertDailyWaterSchema,
  CreateExtraWorkoutSchema,
  UpdateExtraWorkoutSchema,
  DeleteExtraWorkoutSchema,
  UpsertSelfBodyMetricSchema,
  GetGrowthAnalyticsSchema,
  GetDailyLogsRangeSchema,
  UpsertUserVesselPreferencesSchema,
} from "../validators/daily-log";
import {
  WIB_OFFSET_MS,
  addWibDays,
  formatDateOnlyKey,
  formatWibDateKey,
  getProgramDayWibWindow,
  parseWibDateKey,
  toWibDateOnly,
} from "../utils/timezone";
import {
  MAX_EXTRA_WORKOUTS_PER_DAY,
  STANDALONE_BACKFILL_DAYS,
  computeDailyCaloriesSummary,
  computeExtraWorkoutKcal,
  computeMacroCalorieSplit,
  computePersonalizedCalorieTarget,
  computeSafeSleepMinutes,
  computeStepsBurnedKcal,
  mapMealQualityToProgramCompliance,
  WATER_GOOD_MIN_ML,
  SLEEP_GOOD_MIN_MINS,
  STEPS_GOOD_MIN,
} from "../utils/wellness-metrics";
import { safeJsonParse } from "../utils/json";
import { hasActiveTrackingWriteAccess } from "./tracking-entitlement";
import { computeVerifiedDayCompletionInTx } from "./program-progress";
import { resolveEffectiveProgramStart } from "./daily-log-hydration";
import type { WellnessActionResult } from "../actions/auth";

export interface ExtraWorkoutDTO {
  id: string;
  dailyLogId: string;
  activityType: string;
  title: string;
  durationMinutes: number;
  estimatedKcal: number;
  excludeFromNetBurn: boolean;
  notes: string | null;
  createdAt: string;
}

export interface DailyLogDTO {
  id: string;
  logDate: string; // "YYYY-MM-DD" WIB
  bedtime: string | null;
  wakeTime: string | null;
  sleepDurationMinutes: number | null;
  sleepFeeling: string | null;
  waterMl: number;
  urineColor?: string | null;
  stepsCount: number;
  stepsBurnedKcal: number;
  mealsCount: number | null;
  caloriesKcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  mealQualityMode: "ON_PLAN" | "PARTIAL" | "OFF_TRACK" | "SELF_LOGGED" | null;
  mealFeeling: string | null;
  mealEntriesJson: unknown;
  extraWorkouts: ExtraWorkoutDTO[];
}

export function serializeDailyLog(
  row: {
    id: string;
    logDate: Date;
    bedtime: string | null;
    wakeTime: string | null;
    sleepDurationMinutes: number | null;
    sleepFeeling: string | null;
    waterMl: number;
    urineColor?: string | null;
    stepsCount: number;
    stepsBurnedKcal: number;
    mealsCount: number | null;
    caloriesKcal: number;
    carbsG: number;
    proteinG: number;
    fatG: number;
    mealQualityMode: string | null;
    mealFeeling: string | null;
    mealEntriesJson: Prisma.JsonValue | null;
    extraWorkouts?: Array<{
      id: string;
      dailyLogId: string;
      activityType: string;
      title: string;
      durationMinutes: number;
      estimatedKcal: number;
      excludeFromNetBurn: boolean;
      notes: string | null;
      createdAt: Date;
    }>;
  }
): DailyLogDTO {
  return {
    id: row.id,
    logDate: formatDateOnlyKey(row.logDate),
    bedtime: row.bedtime,
    wakeTime: row.wakeTime,
    sleepDurationMinutes: row.sleepDurationMinutes,
    sleepFeeling: row.sleepFeeling,
    waterMl: row.waterMl,
    urineColor: row.urineColor ?? null,
    stepsCount: row.stepsCount,
    stepsBurnedKcal: row.stepsBurnedKcal,
    mealsCount: row.mealsCount,
    caloriesKcal: row.caloriesKcal,
    carbsG: row.carbsG,
    proteinG: row.proteinG,
    fatG: row.fatG,
    mealQualityMode: row.mealQualityMode as DailyLogDTO["mealQualityMode"],
    mealFeeling: row.mealFeeling,
    mealEntriesJson: row.mealEntriesJson,
    extraWorkouts: (row.extraWorkouts || []).map((w) => ({
      id: w.id,
      dailyLogId: w.dailyLogId,
      activityType: w.activityType,
      title: w.title,
      durationMinutes: w.durationMinutes,
      estimatedKcal: w.estimatedKcal,
      excludeFromNetBurn: w.excludeFromNetBurn,
      notes: w.notes,
      createdAt: w.createdAt.toISOString(),
    })),
  };
}

/**
 * Validates that `logDateKey` is a real calendar date and within the permitted write window:
 * - Never future dates (> today WIB).
 * - If `programDayId` is supplied, validates strict 00:00-23:59 WIB window for that ProgramDay.
 * - Otherwise (Maintenance / Standalone Pass mode), permits today and H-1 backfill (`STANDALONE_BACKFILL_DAYS = 1`).
 */
async function validateWriteEligibility(params: {
  userId: string;
  logDateKey: string;
  programDayId?: string | null;
  now?: Date;
}): Promise<
  | { ok: true; logDate: Date; logDateKey: string }
  | { ok: false; code?: string; message: string }
> {
  const now = params.now ?? new Date();
  const parsedDate = parseWibDateKey(params.logDateKey);
  if (!parsedDate) {
    return { ok: false, message: "Invalid calendar date format." };
  }

  const todayKey = formatWibDateKey(now);
  if (params.logDateKey > todayKey) {
    return { ok: false, message: "Cannot log wellness data for a future date." };
  }

  const access = await hasActiveTrackingWriteAccess(params.userId, now);
  if (!access.allowed) {
    return {
      ok: false,
      code: "TRACKING_PASS_EXPIRED",
      message:
        "Your tracking access has expired. Join a new coach program or activate a 6-Month Tracking Pass to continue logging.",
    };
  }

  if (params.programDayId) {
    const programDay = await prisma.programDay.findUnique({
      where: { id: params.programDayId },
      include: { program: true },
    });
    if (!programDay) {
      return { ok: false, message: "Scheduled program day not found." };
    }
    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        userId_programId: {
          userId: params.userId,
          programId: programDay.programId,
        },
      },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      return {
        ok: false,
        message: "Active enrollment is required to log progress for this program day.",
      };
    }

    const effectiveStartAt = resolveEffectiveProgramStart(programDay.program, enrollment);

    if (effectiveStartAt) {
      const { unlockDate, isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(
        effectiveStartAt,
        programDay.dayNumber,
        now
      );
      if (!isCalendarUnlocked) {
        return {
          ok: false,
          message: `Day ${programDay.dayNumber} unlocks on its scheduled date at 00:00 WIB.`,
        };
      }
      if (isPast2359) {
        return {
          ok: false,
          message: `Day ${programDay.dayNumber} submission window closed at 23:59 WIB.`,
        };
      }
      const canonicalDayKey = formatWibDateKey(unlockDate);
      const canonicalDateOnly = parseWibDateKey(canonicalDayKey) ?? parsedDate;
      return { ok: true, logDate: canonicalDateOnly, logDateKey: canonicalDayKey };
    }
  } else {
    // Universal Daily Habits (Home): allow Today (H-0) and Yesterday (H-1 backfill),
    // while H-2 and older remain strictly Read-Only in the archive.
    const todayDateOnly = toWibDateOnly(now);
    const earliestAllowed = addWibDays(todayDateOnly, -STANDALONE_BACKFILL_DAYS);
    if (parsedDate < earliestAllowed) {
      return {
        ok: false,
        message: "Past dates older than yesterday are read-only in the archive.",
      };
    }
  }

  return { ok: true, logDate: parsedDate, logDateKey: params.logDateKey };
}

/**
 * Multi-Plan Auto-Sync (Zero N+1):
 * Finds all ACTIVE enrollments of `userId` whose scheduled ProgramDay falls on `logDateKey`,
 * and atomically re-evaluates `ProgramDayProgress.isCompleted` (and writes through fields for
 * explicitly targeted programDayId or existing rows) in ONE batched lookup.
 */
async function syncOverlappingProgramDaysInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    logDateKey: string;
    dailyLog: {
      bedtime: string | null;
      wakeTime: string | null;
      sleepDurationMinutes: number | null;
      sleepFeeling: string | null;
      waterMl: number;
      stepsCount: number;
      mealQualityMode: string | null;
    };
    explicitProgramDayId?: string | null;
    explicitMealCompliance?: string | null;
    explicitLegacyMealNotes?: string | null;
  }
): Promise<Record<string, boolean>> {
  const updatedCompletions: Record<string, boolean> = {};

  const activeEnrollments = await tx.programEnrollment.findMany({
    where: { userId: params.userId, status: "ACTIVE", program: { deletedAt: null } },
    select: {
      paidAt: true,
      approvedAt: true,
      createdAt: true,
      program: {
        select: {
          id: true,
          locationType: true,
          startAt: true,
          days: {
            select: {
              id: true,
              dayNumber: true,
              dayType: true,
              videoUrl: true,
              workoutOptionsJson: true,
              videoChecklistJson: true,
            },
          },
        },
      },
    },
  });

  const matchingDays: Array<{
    id: string;
    dayType: string;
    videoUrl: string | null;
    workoutOptionsJson: Prisma.JsonValue | null;
    videoChecklistJson: Prisma.JsonValue | null;
  }> = [];

  for (const enr of activeEnrollments) {
    const effectiveStart =
      enr.program.locationType === "ONLINE"
        ? enr.paidAt ?? enr.approvedAt ?? enr.createdAt ?? enr.program.startAt
        : enr.program.startAt;

    for (const d of enr.program.days) {
      const normalizedDay = {
        ...d,
        dayType:
          enr.program.locationType === "ONLINE" &&
          (d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
            ? "REST_DAY"
            : d.dayType,
      };
      if (d.id === params.explicitProgramDayId) {
        matchingDays.push(normalizedDay);
        continue;
      }
      if (!effectiveStart) continue;
      const win = getProgramDayWibWindow(effectiveStart, d.dayNumber);
      if (formatWibDateKey(win.unlockDate) === params.logDateKey) {
        matchingDays.push(normalizedDay);
      }
    }
  }

  if (matchingDays.length === 0) return updatedCompletions;

  const existingRows = await tx.programDayProgress.findMany({
    where: {
      userId: params.userId,
      programDayId: { in: matchingDays.map((d) => d.id) },
    },
  });
  const existingByDayId = new Map(existingRows.map((r) => [r.programDayId, r]));

  for (const day of matchingDays) {
    const existing = existingByDayId.get(day.id) ?? null;
    const isExplicit = day.id === params.explicitProgramDayId;

    // Only create/update ProgramDayProgress when explicit OR row already exists OR meal adherence needs sync
    if (!isExplicit && !existing) {
      continue;
    }

    const inheritedMealCompliance =
      isExplicit && params.explicitMealCompliance !== undefined
        ? params.explicitMealCompliance
        : existing?.mealCompliance ??
          mapMealQualityToProgramCompliance(params.dailyLog.mealQualityMode);

    const nextMealNotes =
      isExplicit && params.explicitLegacyMealNotes !== undefined
        ? params.explicitLegacyMealNotes
        : existing?.mealNotes ?? null;

    const mergedChecklist = safeJsonParse<string[]>(existing?.checklistCompletedJson, []);

    const verifiedCompleted = await computeVerifiedDayCompletionInTx(
      tx,
      params.userId,
      day,
      {
        isVideoWatched: existing?.isVideoWatched ?? false,
        checklistCompleted: mergedChecklist,
        selectedWorkout: existing?.selectedWorkout ?? null,
        workoutNotes: existing?.workoutNotes ?? null,
        eventFeedback: existing?.eventFeedback ?? null,
        mealCompliance: inheritedMealCompliance ?? null,
        mealNotes: nextMealNotes,
        bedtime: params.dailyLog.bedtime ?? existing?.bedtime ?? null,
        wakeTime: params.dailyLog.wakeTime ?? existing?.wakeTime ?? null,
        waterMlOverride: params.dailyLog.waterMl,
        stepsCountOverride: params.dailyLog.stepsCount,
      }
    );

    const writeData = {
      isCompleted: verifiedCompleted,
      completedAt: verifiedCompleted ? existing?.completedAt ?? new Date() : null,
      bedtime: params.dailyLog.bedtime ?? existing?.bedtime ?? null,
      wakeTime: params.dailyLog.wakeTime ?? existing?.wakeTime ?? null,
      sleepDurationMinutes:
        params.dailyLog.sleepDurationMinutes ?? existing?.sleepDurationMinutes ?? null,
      ...(params.dailyLog.sleepFeeling
        ? { assessmentResponse: `Sleep Feeling: ${params.dailyLog.sleepFeeling}` }
        : {}),
      ...(inheritedMealCompliance !== undefined
        ? { mealCompliance: inheritedMealCompliance }
        : {}),
      ...(isExplicit && params.explicitLegacyMealNotes !== undefined
        ? { mealNotes: params.explicitLegacyMealNotes }
        : {}),
    };

    if (existing) {
      await tx.programDayProgress.update({
        where: { id: existing.id },
        data: writeData,
      });
    } else if (isExplicit) {
      await tx.programDayProgress.create({
        data: {
          userId: params.userId,
          programDayId: day.id,
          ...writeData,
        },
      });
    }

    updatedCompletions[day.id] = verifiedCompleted;
  }

  return updatedCompletions;
}

// ── 1. Save Daily Sleep (Global + Multi-Plan Sync) ───────────────────────────
export async function saveDailySleepService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO; completionsByDayId: Record<string, boolean> }>> {
  const session = await requireAuth();
  const parsed = UpsertDailySleepSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid sleep log input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { logDate: logDateKey, bedtime, wakeTime, sleepFeeling, programDayId } = parsed.data;
  const sleepMins = computeSafeSleepMinutes(bedtime, wakeTime);
  if (sleepMins <= 0) {
    return {
      success: false,
      message: "Sleep duration must be between 1 hour and 18 hours.",
    };
  }

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey,
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.userDailyLog.upsert({
        where: { userId_logDate: { userId: session.userId, logDate: gate.logDate } },
        create: {
          userId: session.userId,
          logDate: gate.logDate,
          bedtime,
          wakeTime,
          sleepDurationMinutes: sleepMins,
          sleepFeeling: sleepFeeling ?? null,
        },
        update: {
          bedtime,
          wakeTime,
          sleepDurationMinutes: sleepMins,
          sleepFeeling: sleepFeeling !== undefined ? sleepFeeling : undefined,
        },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      const completionsByDayId = await syncOverlappingProgramDaysInTx(tx, {
        userId: session.userId,
        logDateKey: gate.logDateKey,
        dailyLog: saved,
        explicitProgramDayId: programDayId,
      });

      return { dailyLog: serializeDailyLog(saved), completionsByDayId };
    });

    return { success: true, message: "Sleep log saved.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save sleep log.",
    };
  }
}

// ── 2. Save Daily Water (Global + Multi-Plan Sync; supports Reset to 0) ──────
export async function saveDailyWaterService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO; completionsByDayId: Record<string, boolean> }>> {
  const session = await requireAuth();
  const parsed = UpsertDailyWaterSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid water intake input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { logDate: logDateKey, waterMl, urineColor, programDayId } = parsed.data;
  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey,
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.userDailyLog.upsert({
        where: { userId_logDate: { userId: session.userId, logDate: gate.logDate } },
        create: {
          userId: session.userId,
          logDate: gate.logDate,
          waterMl,
          ...(urineColor !== undefined ? { urineColor } : {}),
        },
        update: {
          waterMl,
          ...(urineColor !== undefined ? { urineColor } : {}),
        },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      const completionsByDayId = await syncOverlappingProgramDaysInTx(tx, {
        userId: session.userId,
        logDateKey: gate.logDateKey,
        dailyLog: saved,
        explicitProgramDayId: programDayId,
      });

      return { dailyLog: serializeDailyLog(saved), completionsByDayId };
    });

    return { success: true, message: "Water intake saved.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save water intake.",
    };
  }
}

// ── 3. Save Daily Steps (Global + Multi-Plan Sync; supports Reset to 0) ──────
export async function saveDailyStepsService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO; completionsByDayId: Record<string, boolean> }>> {
  const session = await requireAuth();
  const parsed = UpsertDailyStepsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid daily steps input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { logDate: logDateKey, stepsCount, programDayId } = parsed.data;
  const stepsBurnedKcal = computeStepsBurnedKcal(stepsCount);

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey,
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.userDailyLog.upsert({
        where: { userId_logDate: { userId: session.userId, logDate: gate.logDate } },
        create: {
          userId: session.userId,
          logDate: gate.logDate,
          stepsCount,
          stepsBurnedKcal,
        },
        update: {
          stepsCount,
          stepsBurnedKcal,
        },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      const completionsByDayId = await syncOverlappingProgramDaysInTx(tx, {
        userId: session.userId,
        logDateKey: gate.logDateKey,
        dailyLog: saved,
        explicitProgramDayId: programDayId,
      });

      return { dailyLog: serializeDailyLog(saved), completionsByDayId };
    });

    return { success: true, message: "Daily steps saved.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save daily steps.",
    };
  }
}

// ── 4. Save Daily Meal (Global Objective Intake + Program Adherence) ─────────
export async function saveDailyMealService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO; completionsByDayId: Record<string, boolean> }>> {
  const session = await requireAuth();
  const parsed = UpsertDailyMealSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid meal log input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    logDate: logDateKey,
    mealsCount,
    caloriesKcal,
    carbsG,
    proteinG,
    fatG,
    mealQualityMode,
    mealFeeling,
    mealEntries,
    programDayId,
    programMealCompliance,
    legacyMealNotesJson,
  } = parsed.data;

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey,
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const saved = await tx.userDailyLog.upsert({
        where: { userId_logDate: { userId: session.userId, logDate: gate.logDate } },
        create: {
          userId: session.userId,
          logDate: gate.logDate,
          mealsCount,
          caloriesKcal,
          carbsG,
          proteinG,
          fatG,
          mealQualityMode,
          mealFeeling: mealFeeling ?? null,
          mealEntriesJson: mealEntries as Prisma.InputJsonValue,
        },
        update: {
          mealsCount,
          caloriesKcal,
          carbsG,
          proteinG,
          fatG,
          mealQualityMode,
          mealFeeling: mealFeeling !== undefined ? mealFeeling : undefined,
          mealEntriesJson: mealEntries as Prisma.InputJsonValue,
        },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      const completionsByDayId = await syncOverlappingProgramDaysInTx(tx, {
        userId: session.userId,
        logDateKey: gate.logDateKey,
        dailyLog: saved,
        explicitProgramDayId: programDayId,
        explicitMealCompliance: programMealCompliance,
        explicitLegacyMealNotes: legacyMealNotesJson,
      });

      return { dailyLog: serializeDailyLog(saved), completionsByDayId };
    });

    return { success: true, message: "Meal log saved.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save meal log.",
    };
  }
}

// ── 5. Extra Workouts (More Training) Full CRUD ──────────────────────────────
export async function addExtraWorkoutService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO; workout: ExtraWorkoutDTO }>> {
  const session = await requireAuth();
  const parsed = CreateExtraWorkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid extra workout input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    logDate: logDateKey,
    activityType,
    title,
    durationMinutes,
    customKcal,
    excludeFromNetBurn,
    notes,
    programDayId,
  } = parsed.data;

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey,
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  const estimatedKcal = computeExtraWorkoutKcal(activityType, durationMinutes, customKcal);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dailyLog = await tx.userDailyLog.upsert({
        where: { userId_logDate: { userId: session.userId, logDate: gate.logDate } },
        create: { userId: session.userId, logDate: gate.logDate },
        update: {},
      });

      const currentCount = await tx.userExtraWorkoutLog.count({
        where: { dailyLogId: dailyLog.id },
      });
      if (currentCount >= MAX_EXTRA_WORKOUTS_PER_DAY) {
        throw new Error(
          `Maximum of ${MAX_EXTRA_WORKOUTS_PER_DAY} extra workouts per day reached.`
        );
      }

      const created = await tx.userExtraWorkoutLog.create({
        data: {
          dailyLogId: dailyLog.id,
          userId: session.userId,
          activityType,
          title,
          durationMinutes,
          estimatedKcal,
          excludeFromNetBurn,
          notes: notes ?? null,
        },
      });

      const refreshed = await tx.userDailyLog.findUniqueOrThrow({
        where: { id: dailyLog.id },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      return {
        dailyLog: serializeDailyLog(refreshed),
        workout: {
          id: created.id,
          dailyLogId: created.dailyLogId,
          activityType: created.activityType,
          title: created.title,
          durationMinutes: created.durationMinutes,
          estimatedKcal: created.estimatedKcal,
          excludeFromNetBurn: created.excludeFromNetBurn,
          notes: created.notes,
          createdAt: created.createdAt.toISOString(),
        },
      };
    });

    return { success: true, message: "Extra training logged.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add extra training.",
    };
  }
}

export async function updateExtraWorkoutService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO }>> {
  const session = await requireAuth();
  const parsed = UpdateExtraWorkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid workout update input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, title, durationMinutes, customKcal, excludeFromNetBurn, notes, programDayId } =
    parsed.data;

  const existingPreview = await prisma.userExtraWorkoutLog.findFirst({
    where: { id, userId: session.userId },
    select: {
      id: true,
      dailyLog: { select: { logDate: true } },
    },
  });
  if (!existingPreview) {
    return { success: false, message: "Extra workout log not found." };
  }

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey: formatDateOnlyKey(existingPreview.dailyLog.logDate),
    programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userExtraWorkoutLog.findFirst({
        where: { id, userId: session.userId },
      });
      if (!existing) {
        throw new Error("Extra workout log not found.");
      }

      const nextDuration = durationMinutes ?? existing.durationMinutes;
      const nextKcal =
        customKcal !== undefined
          ? computeExtraWorkoutKcal(existing.activityType, nextDuration, customKcal)
          : durationMinutes !== undefined
            ? computeExtraWorkoutKcal(existing.activityType, nextDuration, null)
            : existing.estimatedKcal;

      await tx.userExtraWorkoutLog.update({
        where: { id: existing.id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(durationMinutes !== undefined ? { durationMinutes: nextDuration } : {}),
          estimatedKcal: nextKcal,
          ...(excludeFromNetBurn !== undefined ? { excludeFromNetBurn } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      });

      const refreshed = await tx.userDailyLog.findUniqueOrThrow({
        where: { id: existing.dailyLogId },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      return { dailyLog: serializeDailyLog(refreshed) };
    });

    return { success: true, message: "Extra training updated.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update extra training.",
    };
  }
}

export async function deleteExtraWorkoutService(
  rawInput: unknown
): Promise<WellnessActionResult<{ dailyLog: DailyLogDTO }>> {
  const session = await requireAuth();
  const parsed = DeleteExtraWorkoutSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, message: "Workout ID is required." };
  }

  const existingPreview = await prisma.userExtraWorkoutLog.findFirst({
    where: { id: parsed.data.id, userId: session.userId },
    select: {
      id: true,
      dailyLog: { select: { logDate: true } },
    },
  });
  if (!existingPreview) {
    return { success: false, message: "Extra workout log not found." };
  }

  const gate = await validateWriteEligibility({
    userId: session.userId,
    logDateKey: formatDateOnlyKey(existingPreview.dailyLog.logDate),
    programDayId: parsed.data.programDayId,
  });
  if (!gate.ok) {
    return { success: false, message: gate.message };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userExtraWorkoutLog.findFirst({
        where: { id: parsed.data.id, userId: session.userId },
        select: { id: true, dailyLogId: true },
      });
      if (!existing) {
        throw new Error("Extra workout log not found.");
      }

      await tx.userExtraWorkoutLog.delete({ where: { id: existing.id } });

      const refreshed = await tx.userDailyLog.findUniqueOrThrow({
        where: { id: existing.dailyLogId },
        include: { extraWorkouts: { orderBy: { createdAt: "asc" } } },
      });

      return { dailyLog: serializeDailyLog(refreshed) };
    });

    return { success: true, message: "Extra training removed.", data: result };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to remove extra training.",
    };
  }
}

// ── 6. Self Body Metric Log (Available in BOTH Cohort & Maintenance/Pass Mode) ─
export async function logSelfBodyMetricService(
  rawInput: unknown
): Promise<
  WellnessActionResult<{
    id: string;
    weightKg: number | null;
    heightCm: number | null;
    waistCm: number | null;
    bodyFatPct: number | null;
    recordedAt: string;
  }>
> {
  const session = await requireAuth();

  const rl = await checkDistributedRateLimit(
    `body-metric:${session.userId}`,
    RATE_LIMITS.bodyMetric
  );
  if (!rl.allowed) {
    return {
      success: false,
      message: "Too many body metric updates. Please wait a moment.",
    };
  }

  const parsed = UpsertSelfBodyMetricSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid body measurement input.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const now = new Date();
  const access = await hasActiveTrackingWriteAccess(session.userId, now);
  if (!access.allowed) {
    return {
      success: false,
      message:
        "Your tracking access has expired. Join a new program or activate a Tracking Pass to log measurements.",
    };
  }

  // WIB same-day upsert for SELF entries prevents spamming 150+ rows and evicting historical metrics
  const todayDateOnly = toWibDateOnly(now);
  const startOfTodayWibUtc = new Date(todayDateOnly.getTime() - WIB_OFFSET_MS);
  const endOfTodayWibUtc = new Date(
    addWibDays(todayDateOnly, 1).getTime() - WIB_OFFSET_MS - 1
  );

  const existingToday =
    typeof (prisma as { userBodyMetricLog?: { findFirst?: unknown } }).userBodyMetricLog
      ?.findFirst === "function"
      ? await prisma.userBodyMetricLog.findFirst({
          where: {
            userId: session.userId,
            source: "SELF",
            recordedAt: { gte: startOfTodayWibUtc, lte: endOfTodayWibUtc },
          },
          orderBy: { recordedAt: "desc" },
        })
      : null;

  const saved = existingToday
    ? await prisma.userBodyMetricLog.update({
        where: { id: existingToday.id },
        data: {
          weightKg: parsed.data.weightKg ?? existingToday.weightKg,
          heightCm: parsed.data.heightCm ?? existingToday.heightCm,
          waistCm: parsed.data.waistCm ?? existingToday.waistCm,
          chestCm: parsed.data.chestCm ?? existingToday.chestCm,
          hipsCm: parsed.data.hipsCm ?? existingToday.hipsCm,
          bodyFatPct: parsed.data.bodyFatPct ?? existingToday.bodyFatPct,
          restingHr: parsed.data.restingHr ?? existingToday.restingHr,
          notes: parsed.data.notes ?? existingToday.notes,
          recordedAt: now,
        },
      })
    : await prisma.userBodyMetricLog.create({
        data: {
          userId: session.userId,
          programId: null,
          programDayId: null,
          source: "SELF",
          weightKg: parsed.data.weightKg ?? null,
          heightCm: parsed.data.heightCm ?? null,
          waistCm: parsed.data.waistCm ?? null,
          chestCm: parsed.data.chestCm ?? null,
          hipsCm: parsed.data.hipsCm ?? null,
          bodyFatPct: parsed.data.bodyFatPct ?? null,
          restingHr: parsed.data.restingHr ?? null,
          notes: parsed.data.notes ?? null,
          recordedAt: now,
        },
      });

  return {
    success: true,
    message: "Body measurement recorded.",
    data: {
      id: saved.id,
      weightKg: saved.weightKg,
      heightCm: saved.heightCm,
      waistCm: saved.waistCm,
      bodyFatPct: saved.bodyFatPct,
      recordedAt: saved.recordedAt.toISOString(),
    },
  };
}

// ── 7. 1-Year Longitudinal Growth Analytics (Zero N+1, Single Parallel Fetch) ─
export interface GrowthSeriesPoint {
  bucketKey: string; // "YYYY-MM-DD" for 30d/90d or "YYYY-MM" for 1y
  label: string;
  avgSleepMins: number;
  avgWaterMl: number;
  avgSteps: number;
  avgNetKcal: number;
  avgFoodKcal: number;
  extraWorkoutMins: number;
  extraWorkoutKcal: number;
  loggedDays: number;
}

export interface GrowthAnalyticsPayload {
  range: "30d" | "90d" | "1y";
  periodDays: number;
  totalLoggedDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  calorieTargetKcal: number;
  summary: {
    avgSleepMins: number;
    sleepGoodRatePct: number;
    avgWaterMl: number;
    waterGoalRatePct: number;
    totalSteps: number;
    avgSteps: number;
    stepsGoalRatePct: number;
    avgFoodKcal: number;
    avgNetKcal: number;
    macroSplit: { carbsPct: number; proteinPct: number; fatPct: number };
    totalExtraWorkouts: number;
    totalExtraWorkoutMins: number;
    totalExtraWorkoutKcal: number;
    latestWeightKg: number | null;
    weightDeltaKg: number | null;
  };
  series: GrowthSeriesPoint[];
  weightSeries: Array<{ date: string; weightKg: number }>;
}

export async function getUserGrowthAnalyticsService(
  rawInput: unknown
): Promise<WellnessActionResult<GrowthAnalyticsPayload>> {
  const session = await requireAuth();
  const parsed = GetGrowthAnalyticsSchema.safeParse(rawInput ?? { range: "30d" });
  const range = parsed.success ? parsed.data.range : "30d";
  const periodDays = range === "1y" ? 365 : range === "90d" ? 90 : 30;

  const todayDateOnly = toWibDateOnly(new Date());
  const startDateOnly = addWibDays(todayDateOnly, -(periodDays - 1));

  // Single parallel round-trip: max 366 daily logs + body metrics (Zero N+1)
  const [dailyRows, bodyLogs] = await Promise.all([
    prisma.userDailyLog.findMany({
      where: {
        userId: session.userId,
        logDate: { gte: startDateOnly, lte: todayDateOnly },
      },
      include: {
        extraWorkouts: {
          select: {
            activityType: true,
            durationMinutes: true,
            estimatedKcal: true,
            excludeFromNetBurn: true,
          },
        },
      },
      orderBy: { logDate: "asc" },
      take: 366,
    }),
    prisma.userBodyMetricLog.findMany({
      where: {
        userId: session.userId,
        recordedAt: { gte: new Date(startDateOnly.getTime() - WIB_OFFSET_MS) },
      },
      select: {
        weightKg: true,
        heightCm: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: "asc" },
      take: 366,
    }),
  ]);

  let sleepSum = 0;
  let sleepCount = 0;
  let sleepGoodCount = 0;
  let waterSum = 0;
  let waterCount = 0;
  let waterGoodCount = 0;
  let totalSteps = 0;
  let stepsCountDays = 0;
  let stepsGoodCount = 0;
  let foodKcalSum = 0;
  let netKcalSum = 0;
  let foodDays = 0;
  let carbsSum = 0;
  let proteinSum = 0;
  let fatSum = 0;
  let totalExtraWorkouts = 0;
  let totalExtraWorkoutMins = 0;
  let totalExtraWorkoutKcal = 0;

  const isMonthly = range === "1y";
  const buckets = new Map<
    string,
    {
      label: string;
      sleepSum: number;
      sleepN: number;
      waterSum: number;
      waterN: number;
      stepsSum: number;
      stepsN: number;
      netSum: number;
      foodSum: number;
      foodN: number;
      extraMins: number;
      extraKcal: number;
      loggedDays: number;
    }
  >();

  const activeDateKeys = new Set<string>();

  for (const row of dailyRows) {
    const key = formatDateOnlyKey(row.logDate);
    const hasAnyData =
      (row.sleepDurationMinutes ?? 0) > 0 ||
      row.waterMl > 0 ||
      row.stepsCount > 0 ||
      row.caloriesKcal > 0 ||
      row.extraWorkouts.length > 0;
    if (!hasAnyData) continue;

    activeDateKeys.add(key);

    const sleepMins =
      row.sleepDurationMinutes && row.sleepDurationMinutes > 0
        ? row.sleepDurationMinutes
        : computeSafeSleepMinutes(row.bedtime, row.wakeTime);

    if (sleepMins > 0) {
      sleepSum += sleepMins;
      sleepCount++;
      if (sleepMins >= SLEEP_GOOD_MIN_MINS) sleepGoodCount++;
    }
    if (row.waterMl > 0) {
      waterSum += row.waterMl;
      waterCount++;
      if (row.waterMl >= WATER_GOOD_MIN_ML) waterGoodCount++;
    }
    if (row.stepsCount > 0) {
      totalSteps += row.stepsCount;
      stepsCountDays++;
      if (row.stepsCount >= STEPS_GOOD_MIN) stepsGoodCount++;
    }

    const calSummary = computeDailyCaloriesSummary({
      foodKcal: row.caloriesKcal,
      stepsCount: row.stepsCount,
      stepsBurnedKcal: row.stepsBurnedKcal,
      extraWorkouts: row.extraWorkouts,
    });
    if (calSummary.hasFoodLogged) {
      foodKcalSum += calSummary.foodKcal;
      netKcalSum += calSummary.netKcal;
      foodDays++;
      carbsSum += row.carbsG;
      proteinSum += row.proteinG;
      fatSum += row.fatG;
    }

    let dayExtraMins = 0;
    let dayExtraKcal = 0;
    for (const w of row.extraWorkouts) {
      totalExtraWorkouts++;
      dayExtraMins += w.durationMinutes;
      dayExtraKcal += w.estimatedKcal;
    }
    totalExtraWorkoutMins += dayExtraMins;
    totalExtraWorkoutKcal += dayExtraKcal;

    const bucketKey = isMonthly ? key.slice(0, 7) : key;
    const label = isMonthly
      ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
          row.logDate
        )
      : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
          row.logDate
        );

    const b = buckets.get(bucketKey) ?? {
      label,
      sleepSum: 0,
      sleepN: 0,
      waterSum: 0,
      waterN: 0,
      stepsSum: 0,
      stepsN: 0,
      netSum: 0,
      foodSum: 0,
      foodN: 0,
      extraMins: 0,
      extraKcal: 0,
      loggedDays: 0,
    };

    if (sleepMins > 0) {
      b.sleepSum += sleepMins;
      b.sleepN++;
    }
    if (row.waterMl > 0) {
      b.waterSum += row.waterMl;
      b.waterN++;
    }
    if (row.stepsCount > 0) {
      b.stepsSum += row.stepsCount;
      b.stepsN++;
    }
    if (calSummary.hasFoodLogged) {
      b.netSum += calSummary.netKcal;
      b.foodSum += calSummary.foodKcal;
      b.foodN++;
    }
    b.extraMins += dayExtraMins;
    b.extraKcal += dayExtraKcal;
    b.loggedDays++;
    buckets.set(bucketKey, b);
  }

  // Compute current & longest streak in WIB
  let currentStreakDays = 0;
  let cursor = todayDateOnly;
  if (!activeDateKeys.has(formatDateOnlyKey(cursor))) {
    cursor = addWibDays(todayDateOnly, -1);
  }
  while (activeDateKeys.has(formatDateOnlyKey(cursor))) {
    currentStreakDays++;
    cursor = addWibDays(cursor, -1);
  }

  let longestStreakDays = 0;
  let running = 0;
  let prevKey: string | null = null;
  for (const key of Array.from(activeDateKeys).sort()) {
    if (prevKey) {
      const prevDt = parseWibDateKey(prevKey);
      const currDt = parseWibDateKey(key);
      if (prevDt && currDt && currDt.getTime() - prevDt.getTime() === 86400000) {
        running++;
      } else {
        running = 1;
      }
    } else {
      running = 1;
    }
    if (running > longestStreakDays) longestStreakDays = running;
    prevKey = key;
  }

  const weightSeries = bodyLogs
    .filter((b): b is { weightKg: number; heightCm: number | null; recordedAt: Date } =>
      typeof b.weightKg === "number" && b.weightKg > 20 && b.weightKg < 300
    )
    .map((b) => ({
      date: formatWibDateKey(b.recordedAt),
      weightKg: Number(b.weightKg.toFixed(1)),
    }));

  const latestWeightKg =
    weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].weightKg : null;
  const weightDeltaKg =
    weightSeries.length >= 2
      ? Number((weightSeries[weightSeries.length - 1].weightKg - weightSeries[0].weightKg).toFixed(1))
      : null;

  const latestHeightCm =
    [...bodyLogs].reverse().find((b) => typeof b.heightCm === "number" && b.heightCm > 100)?.heightCm ??
    null;

  const targetObj = computePersonalizedCalorieTarget({
    gender: session.gender,
    age: session.age,
    weightKg: latestWeightKg,
    heightCm: latestHeightCm,
  });

  const macroSplit = computeMacroCalorieSplit(carbsSum, proteinSum, fatSum);

  const series: GrowthSeriesPoint[] = Array.from(buckets.entries()).map(([bucketKey, b]) => ({
    bucketKey,
    label: b.label,
    avgSleepMins: b.sleepN > 0 ? Math.round(b.sleepSum / b.sleepN) : 0,
    avgWaterMl: b.waterN > 0 ? Math.round(b.waterSum / b.waterN) : 0,
    avgSteps: b.stepsN > 0 ? Math.round(b.stepsSum / b.stepsN) : 0,
    avgNetKcal: b.foodN > 0 ? Math.round(b.netSum / b.foodN) : 0,
    avgFoodKcal: b.foodN > 0 ? Math.round(b.foodSum / b.foodN) : 0,
    extraWorkoutMins: b.extraMins,
    extraWorkoutKcal: b.extraKcal,
    loggedDays: b.loggedDays,
  }));

  return {
    success: true,
    data: {
      range,
      periodDays,
      totalLoggedDays: activeDateKeys.size,
      currentStreakDays,
      longestStreakDays,
      calorieTargetKcal: targetObj.targetKcal,
      summary: {
        avgSleepMins: sleepCount > 0 ? Math.round(sleepSum / sleepCount) : 0,
        sleepGoodRatePct: sleepCount > 0 ? Math.round((sleepGoodCount / sleepCount) * 100) : 0,
        avgWaterMl: waterCount > 0 ? Math.round(waterSum / waterCount) : 0,
        waterGoalRatePct: waterCount > 0 ? Math.round((waterGoodCount / waterCount) * 100) : 0,
        totalSteps,
        avgSteps: stepsCountDays > 0 ? Math.round(totalSteps / stepsCountDays) : 0,
        stepsGoalRatePct:
          stepsCountDays > 0 ? Math.round((stepsGoodCount / stepsCountDays) * 100) : 0,
        avgFoodKcal: foodDays > 0 ? Math.round(foodKcalSum / foodDays) : 0,
        avgNetKcal: foodDays > 0 ? Math.round(netKcalSum / foodDays) : 0,
        macroSplit: {
          carbsPct: macroSplit.carbsPct,
          proteinPct: macroSplit.proteinPct,
          fatPct: macroSplit.fatPct,
        },
        totalExtraWorkouts,
        totalExtraWorkoutMins,
        totalExtraWorkoutKcal,
        latestWeightKg,
        weightDeltaKg,
      },
      series,
      weightSeries,
    },
  };
}

/**
 * Lightweight on-demand reader for a bounded date slice (capped at max 35 days)
 * so inspecting past dates from the Home calendar never loads all historical logs upfront.
 */
export async function getDailyLogsByRangeService(
  rawInput: unknown
): Promise<WellnessActionResult<DailyLogDTO[]>> {
  const session = await requireAuth();
  const rl = checkRateLimit(`daily_log_range:${session.userId}`, {
    windowMs: 60 * 1000,
    maxRequests: 60,
  });
  if (!rl.allowed) {
    return { success: false, message: "Too many requests. Please wait a moment." };
  }

  const parsed = GetDailyLogsRangeSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid date range.",
    };
  }

  const startDt = parseWibDateKey(parsed.data.startDate);
  const endDt = parseWibDateKey(parsed.data.endDate);
  if (!startDt || !endDt || endDt.getTime() < startDt.getTime()) {
    return { success: false, message: "Invalid date range." };
  }

  // Strictly cap query span to 35 days max to prevent DB/payload overload
  const maxSpanMs = 35 * 86400000;
  const clampedStartDt =
    endDt.getTime() - startDt.getTime() > maxSpanMs
      ? new Date(endDt.getTime() - maxSpanMs)
      : startDt;

  const rows = await prisma.userDailyLog.findMany({
    where: {
      userId: session.userId,
      logDate: {
        gte: clampedStartDt,
        lte: endDt,
      },
    },
    include: {
      extraWorkouts: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { logDate: "asc" },
    take: 36,
  });

  return {
    success: true,
    data: rows.map(serializeDailyLog),
  };
}

export interface UserVesselPreferencesDTO {
  waterVessels?: {
    glass: number;
    mug: number;
    bottle: number;
    tumbler: number;
  };
}

export async function getUserPreferencesService(): Promise<
  WellnessActionResult<UserVesselPreferencesDTO>
> {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { preferencesJson: true },
  });
  const parsed = UpsertUserVesselPreferencesSchema.safeParse(user?.preferencesJson ?? {});
  return {
    success: true,
    data: parsed.success ? parsed.data : {},
  };
}

export async function saveUserPreferencesService(
  rawInput: unknown
): Promise<WellnessActionResult<UserVesselPreferencesDTO>> {
  const session = await requireAuth();
  const rl = checkRateLimit(`user_prefs:${session.userId}`, {
    windowMs: 60 * 1000,
    maxRequests: 30,
  });
  if (!rl.allowed) {
    return { success: false, message: "Too many preference updates. Please wait a moment." };
  }

  const parsed = UpsertUserVesselPreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid preferences.",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { preferencesJson: true },
  });
  const prevObj =
    existing?.preferencesJson &&
    typeof existing.preferencesJson === "object" &&
    !Array.isArray(existing.preferencesJson)
      ? (existing.preferencesJson as Record<string, unknown>)
      : {};

  const merged = {
    ...prevObj,
    ...(parsed.data.waterVessels ? { waterVessels: parsed.data.waterVessels } : {}),
  };

  await prisma.user.update({
    where: { id: session.userId },
    data: { preferencesJson: merged as Prisma.InputJsonValue },
  });

  return {
    success: true,
    data: parsed.data,
  };
}
