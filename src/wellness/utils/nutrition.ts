/**
 * Shared Nutrition & Hydration JSON helpers for ProgramDayProgress.mealNotes.
 * Keeps Meal Control (adherence + calories/macros) and Water Intake (hydration)
 * independently updatable without overwriting each other and with full backwards compatibility.
 */

export interface ParsedNutritionNotes {
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  waterMl: number;
  hasMealData: boolean;
  hasWaterData: boolean;
}

function safeParseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractWaterMl(raw: string | null | undefined): number {
  const parsed = safeParseJsonObject(raw);
  if (!parsed) return 0;
  const val = parsed.waterMl;
  if (typeof val === "number" && Number.isFinite(val) && val > 0) {
    return Math.round(val);
  }
  return 0;
}

export function extractNutritionFromMealNotes(
  raw: string | null | undefined
): ParsedNutritionNotes {
  const parsed = safeParseJsonObject(raw);
  if (!parsed) {
    return {
      calories: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      waterMl: 0,
      hasMealData: false,
      hasWaterData: false,
    };
  }

  let calories = 0;
  let carbsG = 0;
  let proteinG = 0;
  let fatG = 0;
  let waterMl = 0;
  let hasMealData = false;
  let hasWaterData = false;

  if (typeof parsed.calories === "number" && Number.isFinite(parsed.calories) && parsed.calories > 0) {
    calories = Math.round(parsed.calories);
    hasMealData = true;
  }
  if (typeof parsed.carbsG === "number" && Number.isFinite(parsed.carbsG) && parsed.carbsG > 0) {
    carbsG = Math.round(parsed.carbsG);
    hasMealData = true;
  }
  if (typeof parsed.proteinG === "number" && Number.isFinite(parsed.proteinG) && parsed.proteinG > 0) {
    proteinG = Math.round(parsed.proteinG);
    hasMealData = true;
  }
  if (typeof parsed.fatG === "number" && Number.isFinite(parsed.fatG) && parsed.fatG > 0) {
    fatG = Math.round(parsed.fatG);
    hasMealData = true;
  }
  if (typeof parsed.waterMl === "number" && Number.isFinite(parsed.waterMl) && parsed.waterMl > 0) {
    waterMl = Math.round(parsed.waterMl);
    hasWaterData = true;
  }

  if (hasMealData && calories === 0 && (carbsG > 0 || proteinG > 0 || fatG > 0)) {
    calories = Math.round(carbsG * 4 + proteinG * 4 + fatG * 9);
  }

  return {
    calories,
    carbsG,
    proteinG,
    fatG,
    waterMl,
    hasMealData,
    hasWaterData,
  };
}

const MEAL_SPECIFIC_KEYS = [
  "mode",
  "plateSlots",
  "cookingBySlot",
  "checkedMeals",
  "mealsCount",
  "mealEntries",
  "mealFeeling",
  "calories",
  "carbsG",
  "proteinG",
  "fatG",
] as const;

/**
 * Merges incoming mealNotes with existing mealNotes so independent Meal Control
 * submissions and Water Intake submissions never wipe each other out.
 */
export function mergeMealNotesPayload(
  existingRaw: string | null | undefined,
  incomingRaw: string | null | undefined
): string | null {
  if (incomingRaw === undefined) return existingRaw ?? null;
  if (!incomingRaw || !incomingRaw.trim()) return existingRaw ?? null;

  const incomingObj = safeParseJsonObject(incomingRaw);
  const existingObj = safeParseJsonObject(existingRaw);

  if (!incomingObj) {
    // Plain text incoming: preserve existing waterMl only if existing was structured JSON
    if (existingObj && typeof existingObj.waterMl === "number" && existingObj.waterMl > 0) {
      return JSON.stringify({
        v: 5,
        legacyNote: incomingRaw.trim(),
        waterMl: existingObj.waterMl,
      });
    }
    return incomingRaw;
  }

  const incomingHasMealFields = MEAL_SPECIFIC_KEYS.some(
    (k) => incomingObj[k] !== undefined
  );
  const incomingHasWaterField =
    typeof incomingObj.waterMl === "number" && Number.isFinite(incomingObj.waterMl);

  if (!existingObj) {
    // Preserve plain-text legacy note if incoming is water-only
    if (!incomingHasMealFields && existingRaw && existingRaw.trim()) {
      return JSON.stringify({
        ...incomingObj,
        v: 5,
        legacyNote: existingRaw.trim(),
      });
    }
    return JSON.stringify(incomingObj);
  }

  // Case 1: Water-only update -> keep all existing meal fields intact, update only waterMl
  if (incomingHasWaterField && !incomingHasMealFields) {
    return JSON.stringify({
      ...existingObj,
      v: 5,
      waterMl: Math.max(0, Math.round(incomingObj.waterMl as number)),
    });
  }

  // Case 2: Meal update -> update meal fields, preserve existing waterMl if incoming omitted/null
  const preservedWater =
    incomingHasWaterField && (incomingObj.waterMl as number) > 0
      ? Math.round(incomingObj.waterMl as number)
      : typeof existingObj.waterMl === "number" && existingObj.waterMl > 0
        ? Math.round(existingObj.waterMl)
        : null;

  return JSON.stringify({
    ...existingObj,
    ...incomingObj,
    v: 5,
    waterMl: preservedWater,
  });
}

/**
 * Builds a merged JSON payload for updating Water Intake independently.
 */
export function buildWaterOnlyMealNotes(
  existingRaw: string | null | undefined,
  waterMl: number
): string {
  const safeWater = Math.max(0, Math.min(20000, Math.round(waterMl)));
  const merged = mergeMealNotesPayload(
    existingRaw,
    JSON.stringify({ v: 5, waterMl: safeWater })
  );
  return merged ?? JSON.stringify({ v: 5, waterMl: safeWater });
}
