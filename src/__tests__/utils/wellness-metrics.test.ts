import { describe, expect, it } from "vitest";
import {
  computeDailyCaloriesSummary,
  computeDayCommitmentScore,
  computeExtraWorkoutKcal,
  computeMacroCalorieSplit,
  computePersonalizedCalorieTarget,
  computeSafeSleepMinutes,
  computeStepsBurnedKcal,
  detectHighTrainingLoad,
  mapMealQualityToProgramCompliance,
  mapProgramComplianceToMealQuality,
  rateSleepMinutes,
  rateStepsCount,
  rateWaterMl,
} from "@/wellness/utils/wellness-metrics";

describe("wellness-metrics precision utilities", () => {
  describe("computeSafeSleepMinutes", () => {
    it("computes overnight sleep accurately", () => {
      expect(computeSafeSleepMinutes("22:30", "06:00")).toBe(450);
      expect(computeSafeSleepMinutes("23:15", "07:00")).toBe(465);
    });

    it("computes same-day sleep/nap accurately", () => {
      expect(computeSafeSleepMinutes("01:00", "08:30")).toBe(450);
      expect(computeSafeSleepMinutes("13:00", "14:30")).toBe(90);
    });

    it("rejects impossible durations (< 1h or > 18h) and malformed strings", () => {
      expect(computeSafeSleepMinutes("06:00", "06:00")).toBe(0);
      expect(computeSafeSleepMinutes("22:00", "22:30")).toBe(0); // 30m < 60m
      expect(computeSafeSleepMinutes("08:00", "05:00")).toBe(0); // 21h > 18h
      expect(computeSafeSleepMinutes("SKIPPED", "06:00")).toBe(0);
      expect(computeSafeSleepMinutes(null, "06:00")).toBe(0);
    });
  });

  describe("steps & extra workouts burn calculations", () => {
    it("computes 0.04 kcal per step and clamps negative input", () => {
      expect(computeStepsBurnedKcal(10_000)).toBe(400);
      expect(computeStepsBurnedKcal(8_000)).toBe(320);
      expect(computeStepsBurnedKcal(-500)).toBe(0);
    });

    it("uses smartwatch customKcal when provided, otherwise MET rate fallback", () => {
      expect(computeExtraWorkoutKcal("run", 30, null)).toBe(270); // 30 * 9
      expect(computeExtraWorkoutKcal("hiit", 20, null)).toBe(220); // 20 * 11
      expect(computeExtraWorkoutKcal("run", 30, 412)).toBe(412);
    });
  });

  describe("computeDailyCaloriesSummary (anti-double-counting)", () => {
    it("subtracts steps and included extra workouts from food kcal", () => {
      const summary = computeDailyCaloriesSummary({
        foodKcal: 2000,
        stepsCount: 10000,
        extraWorkouts: [
          { activityType: "run", durationMinutes: 30, estimatedKcal: 300, excludeFromNetBurn: false },
          { activityType: "run", durationMinutes: 25, estimatedKcal: 250, excludeFromNetBurn: true }, // excluded!
        ],
      });
      expect(summary.hasFoodLogged).toBe(true);
      expect(summary.stepsBurnKcal).toBe(400);
      expect(summary.extraWorkoutBurnKcal).toBe(300);
      expect(summary.totalBurnKcal).toBe(700);
      expect(summary.netKcal).toBe(1300);
    });

    it("reports hasFoodLogged = false when foodKcal is 0", () => {
      const summary = computeDailyCaloriesSummary({
        foodKcal: 0,
        stepsCount: 8000,
        extraWorkouts: [],
      });
      expect(summary.hasFoodLogged).toBe(false);
      expect(summary.netKcal).toBe(0);
    });
  });

  describe("computePersonalizedCalorieTarget (Mifflin-St Jeor)", () => {
    it("calculates distinct realistic targets for male and female profiles", () => {
      const male = computePersonalizedCalorieTarget({
        gender: "MALE",
        age: 30,
        weightKg: 75,
        heightCm: 175,
      });
      const female = computePersonalizedCalorieTarget({
        gender: "FEMALE",
        age: 30,
        weightKg: 60,
        heightCm: 162,
      });
      expect(male.isPersonalized).toBe(true);
      expect(female.isPersonalized).toBe(true);
      expect(male.targetKcal).toBeGreaterThan(female.targetKcal);
      expect(male.targetKcal).toBeGreaterThanOrEqual(1500);
      expect(female.targetKcal).toBeGreaterThanOrEqual(1400);
    });

    it("falls back safely to 2000 kcal when profile measurements are missing", () => {
      const fallback = computePersonalizedCalorieTarget({});
      expect(fallback.isPersonalized).toBe(false);
      expect(fallback.targetKcal).toBe(2000);
    });
  });

  describe("computeMacroCalorieSplit (4/4/9 kcal with largest-remainder)", () => {
    it("weights fat at 9 kcal/g vs carbs & protein at 4 kcal/g and sums to 100%", () => {
      // 100g carbs (400 kcal), 100g protein (400 kcal), 100g fat (900 kcal) -> total 1700 kcal
      const split = computeMacroCalorieSplit(100, 100, 100);
      expect(split.carbsPct + split.proteinPct + split.fatPct).toBe(100);
      expect(split.fatPct).toBe(53); // 900/1700 = 52.94% -> 53%
      expect(split.carbsPct).toBe(24);
      expect(split.proteinPct).toBe(23);
    });

    it("returns zeros when no macros logged", () => {
      const split = computeMacroCalorieSplit(0, 0, 0);
      expect(split).toEqual({
        carbsPct: 0,
        proteinPct: 0,
        fatPct: 0,
        totalMacroKcal: 0,
      });
    });
  });

  describe("commitment score, rating helpers, meal mapping & training load", () => {
    it("computes exact 5-task commitment weights (30/25/20/15/10 = 1.0)", () => {
      expect(
        computeDayCommitmentScore({
          activityRatio: 1,
          mealCompliance: "FULL",
          sleepMins: 450,
          waterMl: 2500,
          stepsCount: 9000,
        })
      ).toBeCloseTo(1.0, 5);

      expect(
        computeDayCommitmentScore({
          activityRatio: 1,
          mealCompliance: null,
          sleepMins: 450,
          waterMl: 0,
          stepsCount: 0,
        })
      ).toBeCloseTo(0.5, 5); // 0.30 + 0.20
    });

    it("re-balances weights to 25/20/15/15/10/15 when custom tasks exist", () => {
      expect(
        computeDayCommitmentScore({
          activityRatio: 1,
          mealCompliance: "FULL",
          sleepMins: 450,
          waterMl: 2500,
          stepsCount: 9000,
          customTotalCount: 2,
          customDoneCount: 2,
        })
      ).toBeCloseTo(1.0, 5);

      expect(
        computeDayCommitmentScore({
          activityRatio: 0,
          mealCompliance: null,
          sleepMins: 0,
          waterMl: 0,
          stepsCount: 0,
          customTotalCount: 1,
          customDoneCount: 1,
        })
      ).toBeCloseTo(0.15, 5);
    });

    it("maps meal quality modes cleanly between global log and program compliance", () => {
      expect(mapMealQualityToProgramCompliance("ON_PLAN")).toBe("SIMILAR");
      expect(mapMealQualityToProgramCompliance("SELF_LOGGED")).toBe("SIMILAR");
      expect(mapProgramComplianceToMealQuality("OFF_TRACK")).toBe("OFF_TRACK");
      expect(mapProgramComplianceToMealQuality("FULL")).toBe("ON_PLAN");
    });

    it("flags high training load on multi-program overlap, intense rest-day extra, or high training volume", () => {
      expect(
        detectHighTrainingLoad({ overlappingTrainingProgramsCount: 2 })
      ).toEqual({ isHighLoad: true, reasonCode: "MULTI_PROGRAM_TRAINING" });

      expect(
        detectHighTrainingLoad({
          dayType: "REST_DAY",
          extraWorkouts: [{ activityType: "hiit", durationMinutes: 30, estimatedKcal: 330 }],
        })
      ).toEqual({ isHighLoad: true, reasonCode: "REST_DAY_INTENSE_EXTRA" });

      expect(
        detectHighTrainingLoad({
          dayType: "TRAINING_DAY",
          extraWorkouts: [{ activityType: "mobility", durationMinutes: 20, estimatedKcal: 60 }],
        }).isHighLoad
      ).toBe(false);
    });

    it("rates sleep, water, and steps thresholds accurately", () => {
      expect(rateSleepMinutes(450)).toBe("good");
      expect(rateSleepMinutes(380)).toBe("avg");
      expect(rateSleepMinutes(300)).toBe("bad");
      expect(rateWaterMl(2600)).toBe("good");
      expect(rateWaterMl(1500)).toBe("avg");
      expect(rateWaterMl(800)).toBe("bad");
      expect(rateStepsCount(8500)).toBe("good");
      expect(rateStepsCount(6000)).toBe("avg");
      expect(rateStepsCount(2000)).toBe("bad");
    });
  });
});
