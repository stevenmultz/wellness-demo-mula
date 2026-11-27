/**
 * STANDARDIZED TAP-TO-PLATE FOOD CATALOG & NUTRITION CALCULATOR
 * -------------------------------------------------------------
 * Single source of truth for 1-tap meal logging across Home & Coach Programs.
 * Eliminates manual gram guesswork while generating reliable calories, macros,
 * adherence quality, and human-readable meal logs for Coach/Admin inspection.
 */

export type FoodCategoryId = "carbs" | "protein" | "veggies" | "snacks";
export type MealSlotKey = "breakfast" | "lunch" | "dinner" | "snack";
export type CookingStyleId = "steamed" | "stir_fry" | "fried" | "coconut";
export type UrineColorId = "clear" | "normal" | "dark";

export interface StandardizedFoodItem {
  id: string;
  category: FoodCategoryId;
  nameId: string;
  nameEn: string;
  portionLabelId: string;
  portionLabelEn: string;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  /** Whether cooking oil/coconut modifier applies when added to a cooked meal */
  usesCookingModifier?: boolean;
  /** True for sweets, fried snacks, sugary drinks */
  isTreat?: boolean;
}

export const MEAL_SLOTS: ReadonlyArray<{
  key: MealSlotKey;
  labelEn: string;
  labelId: string;
}> = [
  { key: "breakfast", labelEn: "Breakfast", labelId: "Pagi" },
  { key: "lunch", labelEn: "Lunch", labelId: "Siang" },
  { key: "dinner", labelEn: "Dinner", labelId: "Malam" },
  { key: "snack", labelEn: "Snacks", labelId: "Snack" },
] as const;

export const FOOD_CATEGORIES: ReadonlyArray<{
  id: "all" | FoodCategoryId;
  labelEn: string;
  labelId: string;
}> = [
  { id: "all", labelEn: "All", labelId: "Semua" },
  { id: "carbs", labelEn: "Carbs", labelId: "Karbo" },
  { id: "protein", labelEn: "Protein", labelId: "Protein" },
  { id: "veggies", labelEn: "Veggies & Fruit", labelId: "Sayur & Buah" },
  { id: "snacks", labelEn: "Snacks & Drinks", labelId: "Snack & Minuman" },
] as const;

export const COOKING_STYLES: ReadonlyArray<{
  id: CookingStyleId;
  labelEn: string;
  labelId: string;
  extraFatG: number;
  extraCarbsG: number;
}> = [
  {
    id: "steamed",
    labelEn: "Steamed / Grilled",
    labelId: "Rebus / Bakar",
    extraFatG: 0,
    extraCarbsG: 0,
  },
  {
    id: "stir_fry",
    labelEn: "Stir-Fry / Normal",
    labelId: "Tumis / Biasa",
    extraFatG: 4,
    extraCarbsG: 0,
  },
  {
    id: "fried",
    labelEn: "Deep-Fried",
    labelId: "Goreng / Tepung",
    extraFatG: 11,
    extraCarbsG: 4,
  },
  {
    id: "coconut",
    labelEn: "Coconut / Curry",
    labelId: "Santan / Gulai",
    extraFatG: 13,
    extraCarbsG: 2,
  },
] as const;

export const URINE_COLOR_OPTIONS: ReadonlyArray<{
  id: UrineColorId;
  labelEn: string;
  labelId: string;
  hintEn: string;
  hintId: string;
  swatchHex: string;
}> = [
  {
    id: "clear",
    labelEn: "Pale / Clear",
    labelId: "Jernih / Pucat",
    hintEn: "Well hydrated",
    hintId: "Terhidrasi optimal",
    swatchHex: "#f4f1c9",
  },
  {
    id: "normal",
    labelEn: "Light Yellow",
    labelId: "Kuning Muda",
    hintEn: "Normal hydration",
    hintId: "Cukup minum",
    swatchHex: "#ead36b",
  },
  {
    id: "dark",
    labelEn: "Dark Amber",
    labelId: "Kuning Pekat",
    hintEn: "Need more water",
    hintId: "Kurang cairan",
    swatchHex: "#c98b27",
  },
] as const;

export const FOOD_CATALOG: ReadonlyArray<StandardizedFoodItem> = [
  // ── 1. Carbs (Karbo Utama) ─────────────────────────────────────────────────
  {
    id: "nasi_putih",
    category: "carbs",
    nameId: "Nasi Putih",
    nameEn: "White Rice",
    portionLabelId: "1 centong",
    portionLabelEn: "1 scoop (100g)",
    calories: 130,
    carbsG: 28,
    proteinG: 3,
    fatG: 0,
  },
  {
    id: "nasi_merah",
    category: "carbs",
    nameId: "Nasi Merah",
    nameEn: "Brown / Red Rice",
    portionLabelId: "1 centong",
    portionLabelEn: "1 scoop (100g)",
    calories: 115,
    carbsG: 24,
    proteinG: 3,
    fatG: 1,
  },
  {
    id: "mie",
    category: "carbs",
    nameId: "Mie",
    nameEn: "Noodles (Mie)",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 bowl",
    calories: 280,
    carbsG: 44,
    proteinG: 8,
    fatG: 8,
  },
  {
    id: "kwetiaw",
    category: "carbs",
    nameId: "Kwetiaw",
    nameEn: "Flat Rice Noodles (Kwetiaw)",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 plate",
    calories: 290,
    carbsG: 48,
    proteinG: 6,
    fatG: 8,
  },
  {
    id: "bihun",
    category: "carbs",
    nameId: "Bihun / Soun",
    nameEn: "Rice Vermicelli (Bihun)",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 bowl",
    calories: 210,
    carbsG: 45,
    proteinG: 2,
    fatG: 2,
  },
  {
    id: "roti",
    category: "carbs",
    nameId: "Roti",
    nameEn: "Bread / Toast",
    portionLabelId: "2 lembar",
    portionLabelEn: "2 slices",
    calories: 150,
    carbsG: 28,
    proteinG: 5,
    fatG: 2,
  },
  {
    id: "bubur",
    category: "carbs",
    nameId: "Bubur",
    nameEn: "Rice Porridge (Bubur)",
    portionLabelId: "1 mangkuk",
    portionLabelEn: "1 bowl",
    calories: 235,
    carbsG: 36,
    proteinG: 9,
    fatG: 6,
  },
  {
    id: "kentang",
    category: "carbs",
    nameId: "Kentang",
    nameEn: "Potato",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 medium",
    calories: 130,
    carbsG: 29,
    proteinG: 3,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "ubi_singkong",
    category: "carbs",
    nameId: "Ubi / Singkong",
    nameEn: "Sweet Potato / Cassava",
    portionLabelId: "1 potong",
    portionLabelEn: "1 piece",
    calories: 135,
    carbsG: 31,
    proteinG: 2,
    fatG: 0,
  },
  {
    id: "oatmeal",
    category: "carbs",
    nameId: "Oatmeal",
    nameEn: "Oatmeal",
    portionLabelId: "1 mangkuk",
    portionLabelEn: "1 bowl",
    calories: 155,
    carbsG: 27,
    proteinG: 6,
    fatG: 3,
  },

  // ── 2. Protein (Hewani & Nabati) ───────────────────────────────────────────
  {
    id: "ayam",
    category: "protein",
    nameId: "Ayam",
    nameEn: "Chicken",
    portionLabelId: "1 potong",
    portionLabelEn: "1 piece (100g)",
    calories: 175,
    carbsG: 0,
    proteinG: 28,
    fatG: 6,
    usesCookingModifier: true,
  },
  {
    id: "sapi",
    category: "protein",
    nameId: "Sapi",
    nameEn: "Beef",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving (100g)",
    calories: 215,
    carbsG: 0,
    proteinG: 26,
    fatG: 12,
    usesCookingModifier: true,
  },
  {
    id: "ikan",
    category: "protein",
    nameId: "Ikan",
    nameEn: "Fish",
    portionLabelId: "1 potong",
    portionLabelEn: "1 fillet",
    calories: 145,
    carbsG: 0,
    proteinG: 25,
    fatG: 4,
    usesCookingModifier: true,
  },
  {
    id: "telur",
    category: "protein",
    nameId: "Telur",
    nameEn: "Egg",
    portionLabelId: "1 butir",
    portionLabelEn: "1 egg",
    calories: 75,
    carbsG: 1,
    proteinG: 6,
    fatG: 5,
    usesCookingModifier: true,
  },
  {
    id: "udang",
    category: "protein",
    nameId: "Udang",
    nameEn: "Shrimp",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 105,
    carbsG: 1,
    proteinG: 21,
    fatG: 2,
    usesCookingModifier: true,
  },
  {
    id: "kepiting_cumi",
    category: "protein",
    nameId: "Kepiting / Cumi",
    nameEn: "Crab / Squid",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 115,
    carbsG: 2,
    proteinG: 20,
    fatG: 3,
    usesCookingModifier: true,
  },
  {
    id: "tempe",
    category: "protein",
    nameId: "Tempe",
    nameEn: "Tempeh",
    portionLabelId: "2 potong",
    portionLabelEn: "2 slices",
    calories: 140,
    carbsG: 9,
    proteinG: 14,
    fatG: 6,
    usesCookingModifier: true,
  },
  {
    id: "tahu",
    category: "protein",
    nameId: "Tahu",
    nameEn: "Tofu",
    portionLabelId: "2 potong",
    portionLabelEn: "2 pieces",
    calories: 85,
    carbsG: 2,
    proteinG: 9,
    fatG: 5,
    usesCookingModifier: true,
  },

  // ── 3. Veggies & Fruit (Sayur & Buah) ──────────────────────────────────────
  {
    id: "buncis",
    category: "veggies",
    nameId: "Buncis",
    nameEn: "Green Beans (Buncis)",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 35,
    carbsG: 7,
    proteinG: 2,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "wortel",
    category: "veggies",
    nameId: "Wortel",
    nameEn: "Carrots (Wortel)",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 40,
    carbsG: 9,
    proteinG: 1,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "kacang_panjang",
    category: "veggies",
    nameId: "Kacang Panjang",
    nameEn: "Long Beans",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 45,
    carbsG: 8,
    proteinG: 3,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "bayam_kangkung",
    category: "veggies",
    nameId: "Bayam / Kangkung",
    nameEn: "Spinach / Water Spinach",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 35,
    carbsG: 5,
    proteinG: 3,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "brokoli_sawi",
    category: "veggies",
    nameId: "Brokoli / Sawi",
    nameEn: "Broccoli / Greens",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 serving",
    calories: 35,
    carbsG: 6,
    proteinG: 3,
    fatG: 0,
    usesCookingModifier: true,
  },
  {
    id: "lalapan_salad",
    category: "veggies",
    nameId: "Lalapan / Salad",
    nameEn: "Fresh Salad / Cucumber",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 bowl",
    calories: 30,
    carbsG: 6,
    proteinG: 1,
    fatG: 0,
  },
  {
    id: "pisang",
    category: "veggies",
    nameId: "Pisang",
    nameEn: "Banana",
    portionLabelId: "1 buah",
    portionLabelEn: "1 medium",
    calories: 95,
    carbsG: 24,
    proteinG: 1,
    fatG: 0,
  },
  {
    id: "buah_potong",
    category: "veggies",
    nameId: "Buah Potong",
    nameEn: "Fresh Cut Fruit",
    portionLabelId: "1 porsi",
    portionLabelEn: "1 cup",
    calories: 65,
    carbsG: 16,
    proteinG: 1,
    fatG: 0,
  },

  // ── 4. Snacks & Sweet Drinks (Snack & Minuman) ─────────────────────────────
  {
    id: "es_krim",
    category: "snacks",
    nameId: "Es Krim",
    nameEn: "Ice Cream",
    portionLabelId: "1 cup / scoop",
    portionLabelEn: "1 scoop",
    calories: 190,
    carbsG: 23,
    proteinG: 3,
    fatG: 10,
    isTreat: true,
  },
  {
    id: "biskuit",
    category: "snacks",
    nameId: "Biskuit / Cookies",
    nameEn: "Biscuits / Cookies",
    portionLabelId: "3-4 keping",
    portionLabelEn: "3-4 pcs",
    calories: 160,
    carbsG: 22,
    proteinG: 2,
    fatG: 7,
    isTreat: true,
  },
  {
    id: "gorengan",
    category: "snacks",
    nameId: "Gorengan",
    nameEn: "Fried Snack (Gorengan)",
    portionLabelId: "1 potong",
    portionLabelEn: "1 piece",
    calories: 140,
    carbsG: 14,
    proteinG: 2,
    fatG: 9,
    isTreat: true,
  },
  {
    id: "kopi_susu",
    category: "snacks",
    nameId: "Kopi Susu Manis",
    nameEn: "Sweet Iced Latte",
    portionLabelId: "1 gelas",
    portionLabelEn: "1 cup",
    calories: 180,
    carbsG: 24,
    proteinG: 4,
    fatG: 7,
    isTreat: true,
  },
  {
    id: "teh_manis_boba",
    category: "snacks",
    nameId: "Teh Manis / Boba",
    nameEn: "Sweet Tea / Boba",
    portionLabelId: "1 gelas",
    portionLabelEn: "1 cup",
    calories: 220,
    carbsG: 46,
    proteinG: 1,
    fatG: 3,
    isTreat: true,
  },
  {
    id: "cokelat_kue",
    category: "snacks",
    nameId: "Cokelat / Kue",
    nameEn: "Chocolate / Cake",
    portionLabelId: "1 potong",
    portionLabelEn: "1 slice",
    calories: 240,
    carbsG: 30,
    proteinG: 3,
    fatG: 12,
    isTreat: true,
  },
  {
    id: "kacang_edamame",
    category: "snacks",
    nameId: "Kacang / Edamame",
    nameEn: "Nuts / Edamame",
    portionLabelId: "1 genggam",
    portionLabelEn: "1 handful",
    calories: 150,
    carbsG: 7,
    proteinG: 7,
    fatG: 11,
  },
] as const;

const FOOD_BY_ID = new Map<string, StandardizedFoodItem>(
  FOOD_CATALOG.map((item) => [item.id, item])
);

const COOKING_BY_ID = new Map<CookingStyleId, (typeof COOKING_STYLES)[number]>(
  COOKING_STYLES.map((c) => [c.id, c])
);

export type PlateSlotsMap = Record<MealSlotKey, Record<string, number>>;
export type SlotCookingMap = Record<MealSlotKey, CookingStyleId>;

export function createEmptyPlateSlots(): PlateSlotsMap {
  return {
    breakfast: {},
    lunch: {},
    dinner: {},
    snack: {},
  };
}

export function createDefaultSlotCooking(): SlotCookingMap {
  return {
    breakfast: "stir_fry",
    lunch: "stir_fry",
    dinner: "stir_fry",
    snack: "steamed",
  };
}

export interface EvaluatedPlateSlot {
  slot: MealSlotKey;
  label: string;
  summaryText: string;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  status: "followed" | "similar" | "off_track";
}

export interface EvaluatedPlateSummary {
  totalPortions: number;
  mealsCount: number;
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  compliance: "FULL" | "PARTIAL" | "OFF_TRACK";
  slots: EvaluatedPlateSlot[];
}

export function evaluateStandardizedPlate(
  plateSlots: PlateSlotsMap | undefined | null,
  cookingBySlot: SlotCookingMap | undefined | null,
  isId = false
): EvaluatedPlateSummary {
  const safeSlots = plateSlots ?? createEmptyPlateSlots();
  const safeCooking = cookingBySlot ?? createDefaultSlotCooking();

  let totalPortions = 0;
  let totalCalories = 0;
  let totalCarbsG = 0;
  let totalProteinG = 0;
  let totalFatG = 0;
  let treatCalories = 0;
  let hasProtein = false;
  let hasVeggies = false;

  const evaluatedSlots: EvaluatedPlateSlot[] = [];

  for (const slotMeta of MEAL_SLOTS) {
    const counts = safeSlots[slotMeta.key] || {};
    const cookingStyle =
      COOKING_BY_ID.get(safeCooking[slotMeta.key] || "stir_fry") || COOKING_STYLES[1];

    let slotPortions = 0;
    let slotCal = 0;
    let slotCarbs = 0;
    let slotProt = 0;
    let slotFat = 0;
    let slotTreatCal = 0;
    let cookedDishPortions = 0;
    const itemLabels: string[] = [];

    for (const [foodId, rawQty] of Object.entries(counts)) {
      const qty = Math.max(0, Math.min(12, Math.round(Number(rawQty) || 0)));
      if (qty <= 0) continue;
      const food = FOOD_BY_ID.get(foodId);
      if (!food) continue;

      slotPortions += qty;
      totalPortions += qty;

      const baseCal = food.calories * qty;
      const baseC = food.carbsG * qty;
      const baseP = food.proteinG * qty;
      const baseF = food.fatG * qty;

      slotCal += baseCal;
      slotCarbs += baseC;
      slotProt += baseP;
      slotFat += baseF;

      if (food.category === "protein") hasProtein = true;
      if (food.category === "veggies") hasVeggies = true;
      if (food.isTreat) {
        slotTreatCal += baseCal;
        treatCalories += baseCal;
      }
      if (food.usesCookingModifier && slotMeta.key !== "snack") {
        cookedDishPortions += qty;
      }

      const displayName = isId ? food.nameId : food.nameEn;
      itemLabels.push(qty > 1 ? `${displayName} ×${qty}` : displayName);
    }

    if (slotPortions === 0) continue;

    // Apply cooking oil/coconut modifier once per cooked dish portion (capped at 2x per meal so veggies + chicken don't over-count oil)
    if (cookedDishPortions > 0 && (cookingStyle.extraFatG > 0 || cookingStyle.extraCarbsG > 0)) {
      const modFactor = Math.min(2, cookedDishPortions);
      const addFat = cookingStyle.extraFatG * modFactor;
      const addCarbs = cookingStyle.extraCarbsG * modFactor;
      const addKcal = addFat * 9 + addCarbs * 4;
      slotFat += addFat;
      slotCarbs += addCarbs;
      slotCal += addKcal;
      if (cookingStyle.id === "fried") {
        slotTreatCal += addKcal;
        treatCalories += addKcal;
      }
    }

    totalCalories += slotCal;
    totalCarbsG += slotCarbs;
    totalProteinG += slotProt;
    totalFatG += slotFat;

    const slotLabel = isId ? slotMeta.labelId : slotMeta.labelEn;
    const cookTag =
      cookedDishPortions > 0 && cookingStyle.id !== "stir_fry"
        ? ` (${isId ? cookingStyle.labelId : cookingStyle.labelEn})`
        : "";
    const slotTreatRatio = slotCal > 0 ? slotTreatCal / slotCal : 0;
    const slotStatus: "followed" | "similar" | "off_track" =
      slotTreatRatio > 0.55 ? "off_track" : slotProt >= 12 ? "followed" : "similar";

    evaluatedSlots.push({
      slot: slotMeta.key,
      label: slotLabel,
      summaryText: `${slotLabel}: ${itemLabels.join(", ")}${cookTag}`,
      calories: Math.round(slotCal),
      carbsG: Math.round(slotCarbs),
      proteinG: Math.round(slotProt),
      fatG: Math.round(slotFat),
      status: slotStatus,
    });
  }

  const treatRatio = totalCalories > 0 ? treatCalories / totalCalories : 0;
  const compliance: "FULL" | "PARTIAL" | "OFF_TRACK" =
    totalPortions === 0
      ? "PARTIAL"
      : treatRatio > 0.5
        ? "OFF_TRACK"
        : hasProtein && hasVeggies && treatRatio <= 0.25
          ? "FULL"
          : "PARTIAL";

  return {
    totalPortions,
    mealsCount: Math.max(1, evaluatedSlots.length),
    calories: Math.round(totalCalories),
    carbsG: Math.round(totalCarbsG),
    proteinG: Math.round(totalProteinG),
    fatG: Math.round(totalFatG),
    compliance,
    slots: evaluatedSlots,
  };
}
