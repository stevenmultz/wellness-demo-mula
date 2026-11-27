import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAuth, mockHasWriteAccess, mockRateLimit, mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    userDailyLog: {
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    userExtraWorkoutLog: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    programEnrollment: {
      findMany: vi.fn(),
    },
    programDayProgress: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    programDay: {
      findUnique: vi.fn(),
    },
    programDayCustomTask: {
      count: vi.fn(),
    },
    programDayCustomSubmission: {
      count: vi.fn(),
    },
  };

  const prisma = {
    userDailyLog: tx.userDailyLog,
    userExtraWorkoutLog: tx.userExtraWorkoutLog,
    userBodyMetricLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    programDay: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };

  return {
    mockRequireAuth: vi.fn(),
    mockHasWriteAccess: vi.fn(),
    mockRateLimit: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
}));
vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
  checkRateLimit: mockRateLimit,
}));
vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
}));
vi.mock("@/wellness/services/tracking-entitlement", () => ({
  hasActiveTrackingWriteAccess: mockHasWriteAccess,
}));

import {
  addExtraWorkoutService,
  deleteExtraWorkoutService,
  logSelfBodyMetricService,
  saveDailyMealService,
  saveDailySleepService,
  saveDailyStepsService,
  saveDailyWaterService,
} from "@/wellness/services/daily-log";

function makeDailyLogRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "dlog_1",
    userId: "user_1",
    logDate: new Date("2026-11-25T00:00:00.000Z"),
    bedtime: null,
    wakeTime: null,
    sleepDurationMinutes: null,
    sleepFeeling: null,
    waterMl: 0,
    stepsCount: 0,
    stepsBurnedKcal: 0,
    mealsCount: 0,
    caloriesKcal: 0,
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
    mealQualityMode: null,
    mealFeeling: null,
    mealEntriesJson: null,
    extraWorkouts: [],
    ...overrides,
  };
}

describe("Daily Biomarker CRUD & Multi-Plan Sync Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T05:00:00.000Z"));
    mockRequireAuth.mockResolvedValue({ userId: "user_1", role: "USER" });
    mockHasWriteAccess.mockResolvedValue({ allowed: true, hasActiveCohort: false });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 14, resetMs: 60000 });
    mockPrisma.userBodyMetricLog.findFirst.mockResolvedValue(null);
    mockTx.programEnrollment.findMany.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("blocks writes cleanly when user tracking access is expired (Read-Only Archive)", async () => {
    mockHasWriteAccess.mockResolvedValueOnce({ allowed: false, reason: "EXPIRED" });

    const res = await saveDailyStepsService({
      logDate: "2026-11-25",
      stepsCount: 9500,
    });
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/expired/i);
    expect(mockTx.userDailyLog.upsert).not.toHaveBeenCalled();
  });

  it("saves sleep duration into UserDailyLog and rejects invalid short sleep (< 1h)", async () => {
    const invalidRes = await saveDailySleepService({
      logDate: "2026-11-25",
      bedtime: "22:00",
      wakeTime: "22:20",
    });
    expect(invalidRes.success).toBe(false);

    mockTx.userDailyLog.upsert.mockResolvedValueOnce(
      makeDailyLogRow({ bedtime: "22:30", wakeTime: "06:00", sleepDurationMinutes: 450 })
    );
    const okRes = await saveDailySleepService({
      logDate: "2026-11-25",
      bedtime: "22:30",
      wakeTime: "06:00",
      sleepFeeling: "Fresh",
    });
    expect(okRes.success).toBe(true);
    expect(okRes.data?.dailyLog.sleepDurationMinutes).toBe(450);
  });

  it("allows resetting waterMl to 0 and computes stepsBurnedKcal server-side", async () => {
    mockTx.userDailyLog.upsert.mockResolvedValueOnce(makeDailyLogRow({ waterMl: 0 }));
    const waterRes = await saveDailyWaterService({ logDate: "2026-11-25", waterMl: 0 });
    expect(waterRes.success).toBe(true);
    expect(waterRes.data?.dailyLog.waterMl).toBe(0);

    mockTx.userDailyLog.upsert.mockResolvedValueOnce(
      makeDailyLogRow({ stepsCount: 10000, stepsBurnedKcal: 400 })
    );
    const stepsRes = await saveDailyStepsService({ logDate: "2026-11-25", stepsCount: 10000 });
    expect(stepsRes.success).toBe(true);
    expect(mockTx.userDailyLog.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ stepsCount: 10000, stepsBurnedKcal: 400 }),
      })
    );
  });

  it("saves standalone SELF_LOGGED meal in Maintenance Mode without requiring programDayId", async () => {
    mockTx.userDailyLog.upsert.mockResolvedValueOnce(
      makeDailyLogRow({
        mealsCount: 3,
        caloriesKcal: 1750,
        carbsG: 180,
        proteinG: 120,
        fatG: 55,
        mealQualityMode: "SELF_LOGGED",
      })
    );
    const res = await saveDailyMealService({
      logDate: "2026-11-25",
      mealsCount: 3,
      caloriesKcal: 1750,
      carbsG: 180,
      proteinG: 120,
      fatG: 55,
      mealQualityMode: "SELF_LOGGED",
      mealEntries: [],
    });
    expect(res.success).toBe(true);
    expect(res.data?.dailyLog.mealQualityMode).toBe("SELF_LOGGED");
  });

  it("enforces MAX 10 extra workouts per day and stores excludeFromNetBurn flag", async () => {
    mockTx.userDailyLog.upsert.mockResolvedValueOnce({ id: "dlog_1" });
    mockTx.userExtraWorkoutLog.count.mockResolvedValueOnce(10);

    const cappedRes = await addExtraWorkoutService({
      logDate: "2026-11-25",
      activityType: "run",
      title: "Evening Jog",
      durationMinutes: 30,
    });
    expect(cappedRes.success).toBe(false);
    expect(cappedRes.message).toMatch(/maximum/i);

    mockTx.userDailyLog.upsert.mockResolvedValueOnce({ id: "dlog_1" });
    mockTx.userExtraWorkoutLog.count.mockResolvedValueOnce(1);
    mockTx.userExtraWorkoutLog.create.mockResolvedValueOnce({
      id: "wo_1",
      dailyLogId: "dlog_1",
      activityType: "run",
      title: "Morning Run",
      durationMinutes: 30,
      estimatedKcal: 315,
      excludeFromNetBurn: true,
      notes: null,
      createdAt: new Date("2026-11-25T01:00:00.000Z"),
    });
    mockTx.userDailyLog.findUniqueOrThrow.mockResolvedValueOnce(
      makeDailyLogRow({
        extraWorkouts: [
          {
            id: "wo_1",
            dailyLogId: "dlog_1",
            activityType: "run",
            title: "Morning Run",
            durationMinutes: 30,
            estimatedKcal: 315,
            excludeFromNetBurn: true,
            notes: null,
            createdAt: new Date("2026-11-25T01:00:00.000Z"),
          },
        ],
      })
    );

    const okRes = await addExtraWorkoutService({
      logDate: "2026-11-25",
      activityType: "run",
      title: "Morning Run",
      durationMinutes: 30,
      customKcal: 315,
      excludeFromNetBurn: true,
    });
    expect(okRes.success).toBe(true);
    expect(okRes.data?.workout.excludeFromNetBurn).toBe(true);
    expect(okRes.data?.workout.estimatedKcal).toBe(315);
  });

  it("prevents deleting an extra workout owned by another user", async () => {
    mockTx.userExtraWorkoutLog.findFirst.mockResolvedValueOnce(null);
    const res = await deleteExtraWorkoutService({ id: "other_user_wo" });
    expect(res.success).toBe(false);
    expect(mockTx.userExtraWorkoutLog.delete).not.toHaveBeenCalled();
  });

  it("logs SELF body metric in Maintenance Mode and rejects expired users", async () => {
    mockHasWriteAccess.mockResolvedValueOnce({ allowed: false, reason: "EXPIRED" });
    const blocked = await logSelfBodyMetricService({ weightKg: 68.5 });
    expect(blocked.success).toBe(false);

    mockPrisma.userBodyMetricLog.create.mockResolvedValueOnce({
      id: "bm_1",
      weightKg: 68.5,
      heightCm: null,
      waistCm: 79,
      bodyFatPct: null,
      recordedAt: new Date("2026-11-25T02:00:00.000Z"),
    });
    const ok = await logSelfBodyMetricService({ weightKg: 68.5, waistCm: 79 });
    expect(ok.success).toBe(true);
    expect(ok.data?.weightKg).toBe(68.5);
  });

  it("blocks editing/deleting old extra workouts past cutoff and rejects zero-kcal SELF_LOGGED meals", async () => {
    // Deleting a workout from 10 days ago must be rejected by cutoff gate
    mockPrisma.userExtraWorkoutLog.findFirst.mockResolvedValueOnce({
      id: "wo_old",
      dailyLog: { logDate: new Date("2026-11-10T00:00:00.000Z") },
    });
    const delOld = await deleteExtraWorkoutService({ id: "wo_old" });
    expect(delOld.success).toBe(false);
    expect(delOld.message).toMatch(/read-only/i);
    expect(mockTx.userExtraWorkoutLog.delete).not.toHaveBeenCalled();

    // Zero-calorie SELF_LOGGED meal is rejected by Zod refine
    const emptyMeal = await saveDailyMealService({
      logDate: "2026-11-25",
      mealsCount: 3,
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      mealQualityMode: "SELF_LOGGED",
      mealEntries: [],
    });
    expect(emptyMeal.success).toBe(false);
  });

  it("upserts same-day WIB SELF body metric instead of inserting duplicate rows", async () => {
    mockPrisma.userBodyMetricLog.findFirst.mockResolvedValueOnce({
      id: "bm_today",
      weightKg: 70,
      heightCm: 175,
      waistCm: null,
      chestCm: null,
      hipsCm: null,
      bodyFatPct: null,
      restingHr: null,
      notes: null,
    });
    mockPrisma.userBodyMetricLog.update.mockResolvedValueOnce({
      id: "bm_today",
      weightKg: 69.4,
      heightCm: 175,
      waistCm: null,
      bodyFatPct: null,
      recordedAt: new Date("2026-11-25T05:00:00.000Z"),
    });

    const res = await logSelfBodyMetricService({ weightKg: 69.4 });
    expect(res.success).toBe(true);
    expect(mockPrisma.userBodyMetricLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "bm_today" },
        data: expect.objectContaining({ weightKg: 69.4, heightCm: 175 }),
      })
    );
    expect(mockPrisma.userBodyMetricLog.create).not.toHaveBeenCalled();
  });
});
