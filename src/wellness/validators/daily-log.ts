import { z } from "zod";
import {
  STEPS_MAX_DAILY,
  WATER_MAX_ML,
} from "../utils/wellness-metrics";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const WibDateKeySchema = z
  .string()
  .trim()
  .regex(DATE_KEY_RE, "Date must be in YYYY-MM-DD format.");

export const UpsertDailySleepSchema = z.object({
  logDate: WibDateKeySchema,
  bedtime: z.string().trim().regex(TIME_24H_RE, "Bedtime must be HH:MM (24h)."),
  wakeTime: z.string().trim().regex(TIME_24H_RE, "Wake time must be HH:MM (24h)."),
  sleepFeeling: z.string().trim().max(120).optional().nullable(),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const UpsertDailyWaterSchema = z.object({
  logDate: WibDateKeySchema,
  waterMl: z.number().int().min(0).max(WATER_MAX_ML),
  urineColor: z.enum(["clear", "normal", "dark"]).optional().nullable(),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const UpsertUserVesselPreferencesSchema = z.object({
  waterVessels: z
    .object({
      glass: z.number().int().min(30).max(5000),
      mug: z.number().int().min(30).max(5000),
      bottle: z.number().int().min(30).max(5000),
      tumbler: z.number().int().min(30).max(5000),
    })
    .optional(),
});

export const UpsertDailyStepsSchema = z.object({
  logDate: WibDateKeySchema,
  stepsCount: z.number().int().min(0).max(STEPS_MAX_DAILY),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const MealSlotEntryInputSchema = z.object({
  status: z.enum(["followed", "similar", "off_track", "self_logged"]),
  slot: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  cooking: z.enum(["steamed", "stir_fry", "fried", "coconut"]).optional(),
  items: z.record(z.string().max(64), z.number().int().min(0).max(20)).optional(),
  mealItem: z.string().trim().max(240).optional(),
  calories: z.number().int().min(0).max(8000).optional().nullable(),
  carbsG: z.number().int().min(0).max(1500).optional().nullable(),
  proteinG: z.number().int().min(0).max(800).optional().nullable(),
  fatG: z.number().int().min(0).max(500).optional().nullable(),
});

export const UpsertDailyMealSchema = z
  .object({
    logDate: WibDateKeySchema,
    mealsCount: z.number().int().min(1).max(6),
    caloriesKcal: z.number().int().min(0).max(15000),
    carbsG: z.number().int().min(0).max(3000),
    proteinG: z.number().int().min(0).max(1500),
    fatG: z.number().int().min(0).max(1000),
    mealQualityMode: z.enum(["ON_PLAN", "PARTIAL", "OFF_TRACK", "SELF_LOGGED"]),
    mealFeeling: z.string().trim().max(120).optional().nullable(),
    mealEntries: z.array(MealSlotEntryInputSchema).max(6).optional().default([]),
    // Optional program-specific adherence & legacy mealNotes write-through
    programDayId: z.string().trim().min(1).max(128).optional().nullable(),
    programMealCompliance: z
      .enum(["FULL", "SIMILAR", "PARTIAL", "OFF_TRACK", "SKIPPED"])
      .optional()
      .nullable(),
    legacyMealNotesJson: z.string().max(8000).optional().nullable(),
  })
  .refine(
    (d) =>
      d.mealQualityMode !== "SELF_LOGGED" ||
      d.caloriesKcal > 0 ||
      d.carbsG > 0 ||
      d.proteinG > 0 ||
      d.fatG > 0,
    {
      message: "Please enter calories or macros greater than 0 when logging meals.",
      path: ["caloriesKcal"],
    }
  );

export const CreateExtraWorkoutSchema = z.object({
  logDate: WibDateKeySchema,
  activityType: z.enum(["run", "strength", "hiit", "mobility", "cycling", "swim", "custom"]),
  title: z.string().trim().min(1, "Workout name is required.").max(80),
  durationMinutes: z.number().int().min(1, "Duration must be at least 1 min.").max(360),
  customKcal: z.number().int().min(0).max(3500).optional().nullable(),
  excludeFromNetBurn: z.boolean().optional().default(false),
  notes: z.string().trim().max(240).optional().nullable(),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const UpdateExtraWorkoutSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(80).optional(),
  durationMinutes: z.number().int().min(1).max(360).optional(),
  customKcal: z.number().int().min(0).max(3500).optional().nullable(),
  excludeFromNetBurn: z.boolean().optional(),
  notes: z.string().trim().max(240).optional().nullable(),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const DeleteExtraWorkoutSchema = z.object({
  id: z.string().trim().min(1).max(128),
  programDayId: z.string().trim().min(1).max(128).optional().nullable(),
});

export const UpsertSelfBodyMetricSchema = z
  .object({
    weightKg: z.number().min(20).max(300).optional().nullable(),
    heightCm: z.number().min(100).max(250).optional().nullable(),
    waistCm: z.number().min(30).max(250).optional().nullable(),
    chestCm: z.number().min(40).max(250).optional().nullable(),
    hipsCm: z.number().min(40).max(250).optional().nullable(),
    bodyFatPct: z.number().min(3).max(70).optional().nullable(),
    restingHr: z.number().int().min(30).max(200).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
  })
  .refine(
    (d) =>
      d.weightKg != null ||
      d.heightCm != null ||
      d.waistCm != null ||
      d.chestCm != null ||
      d.hipsCm != null ||
      d.bodyFatPct != null ||
      d.restingHr != null,
    { message: "Please provide at least one body metric measurement." }
  );

export const GetGrowthAnalyticsSchema = z.object({
  range: z.enum(["30d", "90d", "1y"]).default("30d"),
});

export const GetDailyLogsRangeSchema = z.object({
  startDate: WibDateKeySchema,
  endDate: WibDateKeySchema,
});

export const UpsertTrackingPassPlanSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only."),
  name: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  durationDays: z.number().int().min(1).max(1095),
  actualPrice: z.number().int().min(0).max(50_000_000),
  discountPercentage: z.number().int().min(0).max(100).default(0),
  price: z.number().int().min(0).max(50_000_000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
  customTerms: z.string().trim().max(4000).optional().nullable(),
});

export const AdminCompTrackingGrantSchema = z.object({
  targetUserId: z.string().trim().min(1).max(128),
  durationDays: z.number().int().min(1).max(730),
  reason: z.string().trim().min(3, "Reason is required.").max(300),
});
