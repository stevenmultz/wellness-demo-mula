/**
 * SINGLE SOURCE OF TRUTH FOR WELLNESS METRICS, FORMULAS, AND TASK EVALUATION
 * --------------------------------------------------------------------------
 * Shared by Server Actions, RSC Dashboard hydration, Program Progress completion,
 * Cohort Metrics cards, and 1-Year Growth Analytics so thresholds, rounding,
 * and weights can NEVER drift apart across the codebase.
 */

export type MetricRating = "good" | "avg" | "bad";
export type DailyMealQualityMode = "ON_PLAN" | "PARTIAL" | "OFF_TRACK" | "SELF_LOGGED";

// ── Shared Biological & Activity Constants ───────────────────────────────────
export const WATER_TARGET_ML = 2500;
export const WATER_BOTTLE_ML = 500;
export const WATER_MAX_ML = 15000;
export const WATER_GOOD_MIN_ML = 2000;
export const WATER_AVG_MIN_ML = 1200;

export const STEPS_TARGET_DAILY = 10000;
export const STEPS_MAX_DAILY = 100000;
export const STEPS_KCAL_PER_STEP = 0.04;
export const STEPS_GOOD_MIN = 8000;
export const STEPS_AVG_MIN = 5000;

export const SLEEP_MIN_VALID_MINS = 60; // 1h
export const SLEEP_MAX_VALID_MINS = 1080; // 18h
export const SLEEP_TARGET_MINS = 450; // 7h 30m
export const SLEEP_GOOD_MIN_MINS = 420; // 7h
export const SLEEP_GOOD_MAX_MINS = 540; // 9h
export const SLEEP_AVG_MIN_MINS = 360; // 6h
export const SLEEP_AVG_MAX_MINS = 600; // 10h

export const MAX_EXTRA_WORKOUTS_PER_DAY = 10;
export const STANDALONE_BACKFILL_DAYS = 1; // Today + yesterday (H-1) in Maintenance/Standalone Pass mode

export const COMMITMENT_WEIGHTS_NO_CUSTOM = {
  activity: 0.3,
  meal: 0.25,
  sleep: 0.2,
  water: 0.15,
  steps: 0.1,
} as const;

export const COMMITMENT_WEIGHTS_WITH_CUSTOM = {
  activity: 0.25,
  meal: 0.2,
  sleep: 0.15,
  water: 0.15,
  steps: 0.1,
  custom: 0.15,
} as const;

export interface ExtraWorkoutPreset {
  id: "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom";
  labelEn: string;
  labelId: string;
  kcalPerMin: number;
  highIntensity: boolean;
  oftenCountedInSteps: boolean;
}

export const EXTRA_WORKOUT_PRESETS: readonly ExtraWorkoutPreset[] = [
  {
    id: "run",
    labelEn: "Cardio / Run",
    labelId: "Lari / Jogging",
    kcalPerMin: 9,
    highIntensity: true,
    oftenCountedInSteps: true,
  },
  {
    id: "strength",
    labelEn: "Strength / Gym",
    labelId: "Latihan Beban / Gym",
    kcalPerMin: 6,
    highIntensity: true,
    oftenCountedInSteps: false,
  },
  {
    id: "hiit",
    labelEn: "HIIT / Circuit",
    labelId: "HIIT / Circuit",
    kcalPerMin: 11,
    highIntensity: true,
    oftenCountedInSteps: false,
  },
  {
    id: "mobility",
    labelEn: "Mobility / Yoga",
    labelId: "Mobility / Yoga",
    kcalPerMin: 3,
    highIntensity: false,
    oftenCountedInSteps: false,
  },
  {
    id: "cycling",
    labelEn: "Cycling",
    labelId: "Bersepeda",
    kcalPerMin: 8,
    highIntensity: false,
    oftenCountedInSteps: false,
  },
  {
    id: "swim",
    labelEn: "Swimming",
    labelId: "Berenang",
    kcalPerMin: 9,
    highIntensity: false,
    oftenCountedInSteps: false,
  },
] as const;

export interface ExtraWorkoutLike {
  activityType: string;
  durationMinutes: number;
  estimatedKcal: number;
  excludeFromNetBurn?: boolean;
}

// ── Sleep Calculation (Unified Server & Client) ──────────────────────────────
export function computeSafeSleepMinutes(
  bedtime?: string | null,
  wakeTime?: string | null
): number {
  if (!bedtime || !wakeTime || bedtime === "SKIPPED" || wakeTime === "SKIPPED") {
    return 0;
  }
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => !Number.isFinite(n))) return 0;
  if (bh < 0 || bh > 23 || wh < 0 || wh > 23 || bm < 0 || bm > 59 || wm < 0 || wm > 59) {
    return 0;
  }
  // Strict cross-midnight difference; identical bedtime & waketime yields 0 (never 24h)
  const total = (wh * 60 + wm + 1440 - (bh * 60 + bm)) % 1440;
  if (total < SLEEP_MIN_VALID_MINS || total > SLEEP_MAX_VALID_MINS) return 0;
  return total;
}

export function rateSleepMinutes(avgMins: number): MetricRating | undefined {
  if (!Number.isFinite(avgMins) || avgMins <= 0) return undefined;
  if (avgMins >= SLEEP_GOOD_MIN_MINS && avgMins <= SLEEP_GOOD_MAX_MINS) return "good";
  if (
    (avgMins >= SLEEP_AVG_MIN_MINS && avgMins < SLEEP_GOOD_MIN_MINS) ||
    (avgMins > SLEEP_GOOD_MAX_MINS && avgMins <= SLEEP_AVG_MAX_MINS)
  ) {
    return "avg";
  }
  return "bad";
}

// ── Steps & Extra Workouts Calorie Burn ──────────────────────────────────────
export function computeStepsBurnedKcal(stepsCount: number): number {
  if (!Number.isFinite(stepsCount) || stepsCount <= 0) return 0;
  const clamped = Math.min(STEPS_MAX_DAILY, Math.max(0, Math.round(stepsCount)));
  return Math.round(clamped * STEPS_KCAL_PER_STEP);
}

export function computeExtraWorkoutKcal(
  activityType: string,
  durationMinutes: number,
  customKcal?: number | null
): number {
  if (typeof customKcal === "number" && Number.isFinite(customKcal) && customKcal >= 0) {
    return Math.min(3500, Math.round(customKcal));
  }
  const preset = EXTRA_WORKOUT_PRESETS.find((p) => p.id === activityType);
  const rate = preset?.kcalPerMin ?? 6;
  const safeMins = Math.min(360, Math.max(1, Math.round(durationMinutes || 0)));
  return Math.min(3500, Math.round(safeMins * rate));
}

export interface DailyCaloriesSummary {
  foodKcal: number;
  stepsBurnKcal: number;
  extraWorkoutBurnKcal: number;
  totalBurnKcal: number;
  netKcal: number;
  hasFoodLogged: boolean;
}

export function computeDailyCaloriesSummary(input: {
  foodKcal?: number | null;
  stepsCount?: number | null;
  stepsBurnedKcal?: number | null;
  extraWorkouts?: ExtraWorkoutLike[] | null;
}): DailyCaloriesSummary {
  const foodKcal =
    typeof input.foodKcal === "number" && Number.isFinite(input.foodKcal) && input.foodKcal > 0
      ? Math.round(input.foodKcal)
      : 0;
  const stepsBurnKcal =
    typeof input.stepsBurnedKcal === "number" &&
    Number.isFinite(input.stepsBurnedKcal) &&
    input.stepsBurnedKcal > 0
      ? Math.round(input.stepsBurnedKcal)
      : computeStepsBurnedKcal(input.stepsCount ?? 0);

  const extraWorkoutBurnKcal = (input.extraWorkouts || []).reduce((acc, w) => {
    if (w.excludeFromNetBurn) return acc;
    const kcal =
      typeof w.estimatedKcal === "number" && Number.isFinite(w.estimatedKcal) && w.estimatedKcal > 0
        ? Math.round(w.estimatedKcal)
        : 0;
    return acc + kcal;
  }, 0);

  const totalBurnKcal = stepsBurnKcal + extraWorkoutBurnKcal;
  const hasFoodLogged = foodKcal > 0;
  const netKcal = hasFoodLogged ? Math.max(0, foodKcal - totalBurnKcal) : 0;

  return {
    foodKcal,
    stepsBurnKcal,
    extraWorkoutBurnKcal,
    totalBurnKcal,
    netKcal,
    hasFoodLogged,
  };
}

// ── Personalized Daily Calorie Target (Mifflin-St Jeor + Safe Fallbacks) ─────
export interface CalorieTargetProfile {
  gender?: string | null;
  age?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
}

export interface PersonalizedCalorieTarget {
  targetKcal: number;
  isPersonalized: boolean;
  goodMinKcal: number;
  goodMaxKcal: number;
  avgLowMinKcal: number;
  avgHighMaxKcal: number;
}

export function computePersonalizedCalorieTarget(
  profile?: CalorieTargetProfile | null
): PersonalizedCalorieTarget {
  const genderNorm = (profile?.gender || "").trim().toLowerCase();
  const isMale = genderNorm === "male" || genderNorm === "m" || genderNorm === "laki-laki" || genderNorm === "pria";
  const isFemale = genderNorm === "female" || genderNorm === "f" || genderNorm === "perempuan" || genderNorm === "wanita";

  const w = profile?.weightKg ?? null;
  const h = profile?.heightCm ?? null;
  const a = profile?.age ?? null;

  let targetKcal = isFemale ? 1800 : isMale ? 2200 : 2000;
  let isPersonalized = false;

  if (
    typeof w === "number" &&
    w >= 30 &&
    w <= 250 &&
    typeof h === "number" &&
    h >= 120 &&
    h <= 230 &&
    typeof a === "number" &&
    a >= 14 &&
    a <= 95
  ) {
    const sexOffset = isMale ? 5 : isFemale ? -161 : -78;
    const bmr = 10 * w + 6.25 * h - 5 * a + sexOffset;
    // Lightly active baseline (1.375x) because active Steps & Extra Workouts are subtracted separately
    const estimated = Math.round((bmr * 1.375) / 50) * 50;
    targetKcal = Math.max(1400, Math.min(3000, estimated));
    isPersonalized = true;
  }

  return {
    targetKcal,
    isPersonalized,
    goodMinKcal: Math.round(targetKcal * 0.75),
    goodMaxKcal: Math.round(targetKcal * 1.1),
    avgLowMinKcal: Math.round(targetKcal * 0.55),
    avgHighMaxKcal: Math.round(targetKcal * 1.3),
  };
}

export function rateNetCalories(
  netKcal: number,
  hasFoodLogged: boolean,
  target: PersonalizedCalorieTarget
): MetricRating | undefined {
  if (!hasFoodLogged) return undefined;
  if (netKcal >= target.goodMinKcal && netKcal <= target.goodMaxKcal) return "good";
  if (
    (netKcal >= target.avgLowMinKcal && netKcal < target.goodMinKcal) ||
    (netKcal > target.goodMaxKcal && netKcal <= target.avgHighMaxKcal)
  ) {
    return "avg";
  }
  return "bad";
}

// ── Macro Caloric Percentages (4 / 4 / 9 kcal per gram, Largest-Remainder) ───
export interface MacroCalorieSplit {
  carbsPct: number;
  proteinPct: number;
  fatPct: number;
  totalMacroKcal: number;
}

export function computeMacroCalorieSplit(
  carbsG: number,
  proteinG: number,
  fatG: number
): MacroCalorieSplit {
  const cKcal = Math.max(0, carbsG) * 4;
  const pKcal = Math.max(0, proteinG) * 4;
  const fKcal = Math.max(0, fatG) * 9;
  const totalMacroKcal = cKcal + pKcal + fKcal;

  if (totalMacroKcal <= 0) {
    return { carbsPct: 0, proteinPct: 0, fatPct: 0, totalMacroKcal: 0 };
  }

  const raw = [
    { key: "c" as const, exact: (cKcal / totalMacroKcal) * 100 },
    { key: "p" as const, exact: (pKcal / totalMacroKcal) * 100 },
    { key: "f" as const, exact: (fKcal / totalMacroKcal) * 100 },
  ];
  const floored = raw.map((r) => ({
    key: r.key,
    val: Math.floor(r.exact),
    rem: r.exact - Math.floor(r.exact),
  }));
  let remainder = 100 - floored.reduce((acc, r) => acc + r.val, 0);
  const byRem = [...floored].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remainder; i++) {
    byRem[i % byRem.length].val += 1;
  }

  const map = new Map(byRem.map((r) => [r.key, r.val]));
  return {
    carbsPct: map.get("c") ?? 0,
    proteinPct: map.get("p") ?? 0,
    fatPct: map.get("f") ?? 0,
    totalMacroKcal: Math.round(totalMacroKcal),
  };
}

// ── Water, Steps, Weight, Percentage Rating Helpers ──────────────────────────
export function rateWaterMl(waterMl: number, allowEmptyNeutral = true): MetricRating | undefined {
  if (allowEmptyNeutral && waterMl <= 0) return undefined;
  if (waterMl >= WATER_GOOD_MIN_ML) return "good";
  if (waterMl >= WATER_AVG_MIN_ML) return "avg";
  return "bad";
}

export function rateStepsCount(
  stepsCount: number,
  allowEmptyNeutral = true
): MetricRating | undefined {
  if (allowEmptyNeutral && stepsCount <= 0) return undefined;
  if (stepsCount >= STEPS_GOOD_MIN) return "good";
  if (stepsCount >= STEPS_AVG_MIN) return "avg";
  return "bad";
}

export function rateWeeklyWeightChangeKg(
  weeklyDeltaKg: number | null,
  pointCount: number
): MetricRating | undefined {
  if (pointCount < 2 || weeklyDeltaKg === null || !Number.isFinite(weeklyDeltaKg)) {
    return undefined;
  }
  const absRate = Math.abs(weeklyDeltaKg);
  if (absRate <= 1.0) return "good";
  if (absRate <= 1.5) return "avg";
  return "bad";
}

export function ratePercentageScore(
  pct: number,
  hasData = true
): MetricRating | undefined {
  if (!hasData) return undefined;
  if (pct >= 80) return "good";
  if (pct >= 50) return "avg";
  return "bad";
}

// ── Multi-Plan Honest Meal Compliance Sync Mapper ────────────────────────────
export function mapMealQualityToProgramCompliance(
  mode: DailyMealQualityMode | string | null | undefined
): "SIMILAR" | "PARTIAL" | "OFF_TRACK" | null {
  if (!mode) return null;
  if (mode === "ON_PLAN") return "SIMILAR";
  if (mode === "PARTIAL") return "PARTIAL";
  if (mode === "OFF_TRACK") return "OFF_TRACK";
  if (mode === "SELF_LOGGED") return "SIMILAR";
  return null;
}

export function mapProgramComplianceToMealQuality(
  compliance: string | null | undefined
): DailyMealQualityMode | null {
  if (!compliance || compliance === "SKIPPED") return null;
  const upper = compliance.toUpperCase();
  if (upper === "FULL" || upper === "YES" || upper === "SIMILAR") return "ON_PLAN";
  if (upper === "PARTIAL") return "PARTIAL";
  if (upper === "OFF_TRACK" || upper === "NO") return "OFF_TRACK";
  return null;
}

// ── Unified Score Calculations for Commitment & Steps ────────────────────────
export function computeStepsScore(stepsCount: number): number {
  if (stepsCount >= STEPS_GOOD_MIN) return 1;
  if (stepsCount >= STEPS_AVG_MIN) return 0.8;
  if (stepsCount > 0) return 0.5;
  return 0;
}

export function computeWaterScore(waterMl: number): number {
  if (waterMl >= WATER_GOOD_MIN_ML) return 1;
  if (waterMl >= 1500) return 0.85;
  if (waterMl > 0) return 0.6;
  return 0;
}

export function computeSleepScore(sleepMins: number): number {
  if (sleepMins >= SLEEP_GOOD_MIN_MINS && sleepMins <= SLEEP_GOOD_MAX_MINS) return 1;
  if (
    (sleepMins >= SLEEP_AVG_MIN_MINS && sleepMins < SLEEP_GOOD_MIN_MINS) ||
    (sleepMins > SLEEP_GOOD_MAX_MINS && sleepMins <= SLEEP_AVG_MAX_MINS)
  ) {
    return 0.85;
  }
  if (sleepMins > 0) return 0.6;
  return 0;
}

export function computeMealAdherenceScore(compliance: string | null | undefined): number {
  if (!compliance || compliance === "SKIPPED") return 0;
  const upper = compliance.toUpperCase();
  if (upper === "FULL" || upper === "YES" || upper === "SIMILAR") return 1;
  if (upper === "PARTIAL") return 0.5;
  return 0;
}

export function computeDayCommitmentScore(input: {
  activityRatio: number; // 0..1
  mealCompliance: string | null | undefined;
  sleepMins: number;
  waterMl: number;
  stepsCount: number;
  customTotalCount?: number;
  customDoneCount?: number;
}): number {
  const activity = Math.max(0, Math.min(1, input.activityRatio));
  const meal = computeMealAdherenceScore(input.mealCompliance);
  const sleep = computeSleepScore(input.sleepMins);
  const water = computeWaterScore(input.waterMl);
  const steps = computeStepsScore(input.stepsCount);

  if (input.customTotalCount && input.customTotalCount > 0) {
    const customRatio = Math.max(
      0,
      Math.min(1, (input.customDoneCount ?? 0) / input.customTotalCount)
    );
    const w = COMMITMENT_WEIGHTS_WITH_CUSTOM;
    return (
      activity * w.activity +
      meal * w.meal +
      sleep * w.sleep +
      water * w.water +
      steps * w.steps +
      customRatio * w.custom
    );
  }

  const w = COMMITMENT_WEIGHTS_NO_CUSTOM;
  return (
    activity * w.activity +
    meal * w.meal +
    sleep * w.sleep +
    water * w.water +
    steps * w.steps
  );
}

// ── Overtraining / High Load Non-Blocking Advisory ───────────────────────────
export interface TrainingLoadAdvisory {
  isHighLoad: boolean;
  reasonCode: "REST_DAY_INTENSE_EXTRA" | "HIGH_EXTRA_VOLUME_ON_TRAINING_DAY" | "MULTI_PROGRAM_TRAINING" | null;
}

export function detectHighTrainingLoad(input: {
  dayType?: string | null;
  overlappingTrainingProgramsCount?: number;
  extraWorkouts?: ExtraWorkoutLike[] | null;
}): TrainingLoadAdvisory {
  const workouts = input.extraWorkouts || [];
  const hasHighIntensityExtra = workouts.some((w) => {
    const preset = EXTRA_WORKOUT_PRESETS.find((p) => p.id === w.activityType);
    return (preset?.highIntensity ?? false) && w.durationMinutes >= 20;
  });
  const totalExtraMins = workouts.reduce((acc, w) => acc + (w.durationMinutes || 0), 0);

  if ((input.overlappingTrainingProgramsCount ?? 0) >= 2) {
    return { isHighLoad: true, reasonCode: "MULTI_PROGRAM_TRAINING" };
  }
  if (input.dayType === "REST_DAY" && hasHighIntensityExtra) {
    return { isHighLoad: true, reasonCode: "REST_DAY_INTENSE_EXTRA" };
  }
  if (input.dayType === "TRAINING_DAY" && totalExtraMins >= 60 && hasHighIntensityExtra) {
    return { isHighLoad: true, reasonCode: "HIGH_EXTRA_VOLUME_ON_TRAINING_DAY" };
  }
  return { isHighLoad: false, reasonCode: null };
}
