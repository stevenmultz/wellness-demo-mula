"use server";

import { revalidatePath } from "next/cache";
import {
  addExtraWorkoutService,
  deleteExtraWorkoutService,
  getUserGrowthAnalyticsService,
  logSelfBodyMetricService,
  saveDailyMealService,
  saveDailySleepService,
  saveDailyStepsService,
  saveDailyWaterService,
  updateExtraWorkoutService,
} from "../services/daily-log";

function safeRevalidateDashboard() {
  try {
    revalidatePath("/dashboard");
  } catch {
    // Ignore outside Next.js request context
  }
}

export async function wellnessSaveDailySleep(rawInput: unknown) {
  const res = await saveDailySleepService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessSaveDailyWater(rawInput: unknown) {
  const res = await saveDailyWaterService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessSaveDailySteps(rawInput: unknown) {
  const res = await saveDailyStepsService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessSaveDailyMeal(rawInput: unknown) {
  const res = await saveDailyMealService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessAddExtraWorkout(rawInput: unknown) {
  const res = await addExtraWorkoutService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessUpdateExtraWorkout(rawInput: unknown) {
  const res = await updateExtraWorkoutService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessDeleteExtraWorkout(rawInput: unknown) {
  const res = await deleteExtraWorkoutService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessLogSelfBodyMetric(rawInput: unknown) {
  const res = await logSelfBodyMetricService(rawInput);
  if (res.success) safeRevalidateDashboard();
  return res;
}

export async function wellnessGetGrowthAnalytics(rawInput?: { range?: "30d" | "90d" | "1y" }) {
  return getUserGrowthAnalyticsService(rawInput);
}
