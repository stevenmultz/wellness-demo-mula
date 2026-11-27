"use server";

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
import type { WellnessActionResult } from "./auth";

function toSafeErrorResult<T = never>(
  err: unknown,
  fallbackMessage: string
): WellnessActionResult<T> {
  if (err instanceof Error) {
    if (err.name === "WellnessAuthError") {
      return {
        success: false,
        message: "Your session has expired. Please reload and sign in again.",
      };
    }
    if (err.name === "WellnessForbiddenError") {
      return {
        success: false,
        message: err.message || "You do not have permission for this action.",
      };
    }
  }
  console.error("[daily-log action error]:", err);
  return {
    success: false,
    message: fallbackMessage,
  };
}

export async function wellnessSaveDailySleep(rawInput: unknown) {
  try {
    return await saveDailySleepService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save sleep log. Please try again.");
  }
}

export async function wellnessSaveDailyWater(rawInput: unknown) {
  try {
    return await saveDailyWaterService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save water intake. Please try again.");
  }
}

export async function wellnessSaveDailySteps(rawInput: unknown) {
  try {
    return await saveDailyStepsService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save daily steps. Please try again.");
  }
}

export async function wellnessSaveDailyMeal(rawInput: unknown) {
  try {
    return await saveDailyMealService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save meal log. Please try again.");
  }
}

export async function wellnessAddExtraWorkout(rawInput: unknown) {
  try {
    return await addExtraWorkoutService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save extra workout. Please try again.");
  }
}

export async function wellnessUpdateExtraWorkout(rawInput: unknown) {
  try {
    return await updateExtraWorkoutService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not update extra workout. Please try again.");
  }
}

export async function wellnessDeleteExtraWorkout(rawInput: unknown) {
  try {
    return await deleteExtraWorkoutService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not remove extra workout. Please try again.");
  }
}

export async function wellnessLogSelfBodyMetric(rawInput: unknown) {
  try {
    return await logSelfBodyMetricService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not save body measurement. Please try again.");
  }
}

export async function wellnessGetGrowthAnalytics(rawInput?: { range?: "30d" | "90d" | "1y" }) {
  try {
    return await getUserGrowthAnalyticsService(rawInput);
  } catch (err) {
    return toSafeErrorResult(err, "Could not load analytics. Please try again.");
  }
}
