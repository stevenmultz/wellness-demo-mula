import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequireAuth, mockPrisma } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockPrisma: {
    userDailyLog: { findMany: vi.fn() },
    userBodyMetricLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
}));
vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
}));

import { getUserGrowthAnalyticsService } from "@/wellness/services/daily-log";

describe("1-Year Longitudinal Growth Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      userId: "user_1",
      gender: "FEMALE",
      age: 29,
    });
  });

  it("returns clean empty state with zero NaN when user has no logs", async () => {
    mockPrisma.userDailyLog.findMany.mockResolvedValueOnce([]);
    mockPrisma.userBodyMetricLog.findMany.mockResolvedValueOnce([]);

    const res = await getUserGrowthAnalyticsService({ range: "30d" });
    expect(res.success).toBe(true);
    expect(res.data?.totalLoggedDays).toBe(0);
    expect(res.data?.summary.avgSleepMins).toBe(0);
    expect(res.data?.summary.avgNetKcal).toBe(0);
    expect(res.data?.summary.latestWeightKg).toBeNull();
    expect(res.data?.series).toEqual([]);
  });

  it("aggregates monthly buckets for 1y range, honors excludeFromNetBurn, 4/4/9 macro split, and neutral weight delta", async () => {
    mockPrisma.userDailyLog.findMany.mockResolvedValueOnce([
      {
        logDate: new Date("2026-09-10T00:00:00.000Z"),
        bedtime: "22:30",
        wakeTime: "06:00",
        sleepDurationMinutes: 450,
        waterMl: 2500,
        stepsCount: 10000,
        stepsBurnedKcal: 400,
        caloriesKcal: 2000,
        carbsG: 200,
        proteinG: 120,
        fatG: 80,
        extraWorkouts: [
          {
            activityType: "run",
            durationMinutes: 30,
            estimatedKcal: 300,
            excludeFromNetBurn: false,
          },
          {
            activityType: "custom",
            durationMinutes: 20,
            estimatedKcal: 150,
            excludeFromNetBurn: true, // excluded from net burn!
          },
        ],
      },
      {
        logDate: new Date("2026-09-11T00:00:00.000Z"),
        bedtime: "23:00",
        wakeTime: "06:00",
        sleepDurationMinutes: 420,
        waterMl: 3000,
        stepsCount: 8000,
        stepsBurnedKcal: 320,
        caloriesKcal: 1800,
        carbsG: 180,
        proteinG: 110,
        fatG: 70,
        extraWorkouts: [],
      },
      {
        logDate: new Date("2026-10-05T00:00:00.000Z"),
        bedtime: "22:00",
        wakeTime: "06:00",
        sleepDurationMinutes: 480,
        waterMl: 1500,
        stepsCount: 6000,
        stepsBurnedKcal: 240,
        caloriesKcal: 0, // unlogged food day must NOT drag down avgFoodKcal!
        carbsG: 0,
        proteinG: 0,
        fatG: 0,
        extraWorkouts: [],
      },
    ]);
    mockPrisma.userBodyMetricLog.findMany.mockResolvedValueOnce([
      { weightKg: 64.0, heightCm: 162, recordedAt: new Date("2026-09-01T02:00:00.000Z") },
      { weightKg: 61.5, heightCm: 162, recordedAt: new Date("2026-10-15T02:00:00.000Z") },
    ]);

    const res = await getUserGrowthAnalyticsService({ range: "1y" });
    expect(res.success).toBe(true);
    const data = res.data!;

    expect(data.totalLoggedDays).toBe(3);
    expect(data.longestStreakDays).toBe(2); // Sep 10 & Sep 11
    expect(data.series).toHaveLength(2); // 2026-09 and 2026-10 monthly buckets
    expect(data.series[0].bucketKey).toBe("2026-09");
    expect(data.series[1].bucketKey).toBe("2026-10");

    // Averages
    expect(data.summary.avgSleepMins).toBe(450); // (450+420+480)/3
    expect(data.summary.sleepGoodRatePct).toBe(100); // all >= 420m
    expect(data.summary.waterGoalRatePct).toBe(67); // 2 of 3 >= 2000ml (WATER_GOOD_MIN_ML)
    expect(data.summary.avgFoodKcal).toBe(1900); // only the 2 logged food days: (2000+1800)/2
    // Day 1 net: 2000 - 400 - 300 = 1300; Day 2 net: 1800 - 320 = 1480 -> avg = 1390
    expect(data.summary.avgNetKcal).toBe(1390);
    // 4/4/9 macro split sums to 100
    const { carbsPct, proteinPct, fatPct } = data.summary.macroSplit;
    expect(carbsPct + proteinPct + fatPct).toBe(100);

    // Weight delta & personalized Mifflin-St Jeor target
    // Female 29yo, 61.5kg, 162cm -> BMR 1321.5 * 1.375 = 1817 -> rounds to 1800 kcal
    expect(data.summary.latestWeightKg).toBe(61.5);
    expect(data.summary.weightDeltaKg).toBe(-2.5);
    expect(data.calorieTargetKcal).toBe(1800);
  });
});
