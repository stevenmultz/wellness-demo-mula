"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Coffee,
  GlassWater,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Utensils,
  X,
} from "lucide-react";
import {
  wellnessGetUserPreferences,
  wellnessSaveUserPreferences,
} from "@/wellness/actions/daily-log";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  COOKING_STYLES,
  FOOD_CATALOG,
  FOOD_CATEGORIES,
  MEAL_SLOTS,
  URINE_COLOR_OPTIONS,
  evaluateStandardizedPlate,
  type CookingStyleId,
  type FoodCategoryId,
  type MealSlotKey,
} from "@/wellness/utils/food-catalog";
import { WATER_TARGET_ML } from "@/wellness/utils/wellness-metrics";
import {
  BEDTIME_PRESETS,
  HOURS_24,
  MEAL_FEELINGS,
  MINUTES_60,
  SLEEP_FEELINGS,
  TIME_24H_RE,
  WAKETIME_PRESETS,
  computeMealTotals,
  formatDuration,
  pad2,
  stripMealLabelPrefix,
  type FeelingOption,
  type MealDraft,
  type SubStepId,
} from "./checkInUtils";

export function StepHeader({
  title,
  subtitle,
}: {
  eyebrow?: string;
  rightLabel?: string;
  title: string;
  subtitle?: string | null;
  quote?: string | null;
}) {
  return (
    <div className="space-y-1 pb-1">
      <h1 className="text-xl sm:text-2xl font-geometric font-normal tracking-tight text-zinc-950 dark:text-white leading-snug">
        {title}
      </h1>
      {subtitle && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function FeelingSelector({
  items,
  selected,
  onSelect,
}: {
  items: ReadonlyArray<FeelingOption>;
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((item) => {
        const active = selected === item.label;
        const ItemIcon = item.Icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.label)}
            className={`w-full p-4 rounded-2xl border text-left transition select-none flex items-center gap-3.5 cursor-pointer ${
              active
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            {ItemIcon && (
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? "bg-white/15 text-white dark:bg-zinc-950/10 dark:text-zinc-950"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white"
                }`}
              >
                <ItemIcon className="w-5 h-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"
                }`}
              >
                {item.label}
              </p>
              <p
                className={`text-xs mt-0.5 leading-relaxed ${
                  active
                    ? "text-white/80 dark:text-zinc-950/80"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {item.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function loadCustomTimePresets(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && TIME_24H_RE.test(x)).slice(0, 9);
  } catch {
    return [];
  }
}

function saveCustomTimePresets(storageKey: string, list: string[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(list));
  } catch {
    /* ignore storage quota errors */
  }
}

function TimeInputField({
  idPrefix,
  label,
  value,
  presets,
  defaultHour = 6,
  onChange,
}: {
  idPrefix: string;
  label: string;
  value: string;
  presets: readonly string[];
  defaultHour?: number;
  onChange: (next: string) => void;
}) {
  const storageKey = `zera:sleep-presets:${idPrefix}`;
  const [customPresets, setCustomPresets] = useState<string[]>([]);
  const [addingPreset, setAddingPreset] = useState(false);
  const [presetHour, setPresetHour] = useState(() => pad2(defaultHour));
  const [presetMin, setPresetMin] = useState("00");

  useEffect(() => {
    setCustomPresets(loadCustomTimePresets(storageKey));
  }, [storageKey]);

  const validMatch = TIME_24H_RE.exec(value);
  const hourStr = validMatch ? validMatch[1] : "";
  const minStr = validMatch ? validMatch[2] : "";

  const allPresets = [
    ...presets,
    ...customPresets.filter((t) => !presets.includes(t)),
  ];

  const handleOpenAddPreset = () => {
    if (validMatch) {
      setPresetHour(validMatch[1]);
      setPresetMin(validMatch[2]);
    } else {
      setPresetHour(pad2(defaultHour));
      setPresetMin("00");
    }
    setAddingPreset((prev) => !prev);
  };

  const handleSavePreset = () => {
    const candidate = `${presetHour}:${presetMin}`;
    if (!TIME_24H_RE.test(candidate)) return;
    if (!presets.includes(candidate) && !customPresets.includes(candidate)) {
      const next = [...customPresets, candidate].slice(-9);
      setCustomPresets(next);
      saveCustomTimePresets(storageKey, next);
    }
    onChange(candidate);
    setAddingPreset(false);
  };

  const handleRemoveCustomPreset = (target: string) => {
    const next = customPresets.filter((t) => t !== target);
    setCustomPresets(next);
    saveCustomTimePresets(storageKey, next);
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="grid grid-cols-2 gap-3 min-w-0" role="group" aria-label={label}>
        <label
          htmlFor={`${idPrefix}-hour`}
          className="relative block rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 px-4 py-3 focus-within:border-zinc-950 dark:focus-within:border-white transition min-w-0 cursor-pointer"
        >
          <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Hour
          </span>
          <div className="relative flex items-center">
            <select
              id={`${idPrefix}-hour`}
              aria-label={`${label} hour`}
              value={hourStr}
              onChange={(e) => {
                const nextHour = e.target.value;
                if (!nextHour) {
                  onChange("");
                  return;
                }
                onChange(`${nextHour}:${minStr || "00"}`);
              }}
              className={`w-full min-w-0 appearance-none bg-transparent border-0 text-base sm:text-lg font-medium tabular-nums outline-none cursor-pointer pr-6 ${
                hourStr
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <option value="" className="bg-white dark:bg-[#141414] text-zinc-500">
                Select
              </option>
              {HOURS_24.map((h) => (
                <option
                  key={h}
                  value={h}
                  className="bg-white dark:bg-[#141414] text-zinc-950 dark:text-white"
                >
                  {h}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none absolute right-0" />
          </div>
        </label>

        <label
          htmlFor={`${idPrefix}-minute`}
          className="relative block rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 px-4 py-3 focus-within:border-zinc-950 dark:focus-within:border-white transition min-w-0 cursor-pointer"
        >
          <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Minute
          </span>
          <div className="relative flex items-center">
            <select
              id={`${idPrefix}-minute`}
              aria-label={`${label} minute`}
              value={minStr}
              onChange={(e) => {
                const nextMin = e.target.value;
                if (!nextMin) {
                  onChange("");
                  return;
                }
                onChange(`${hourStr || pad2(defaultHour)}:${nextMin}`);
              }}
              className={`w-full min-w-0 appearance-none bg-transparent border-0 text-base sm:text-lg font-medium tabular-nums outline-none cursor-pointer pr-6 ${
                minStr
                  ? "text-zinc-950 dark:text-white"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              <option value="" className="bg-white dark:bg-[#141414] text-zinc-500">
                Select
              </option>
              {MINUTES_60.map((m) => (
                <option
                  key={m}
                  value={m}
                  className="bg-white dark:bg-[#141414] text-zinc-950 dark:text-white"
                >
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none absolute right-0" />
          </div>
        </label>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Quick Presets
          </span>
          <button
            type="button"
            onClick={handleOpenAddPreset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-200/75 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300/70 dark:hover:bg-white/15 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{addingPreset ? "Cancel" : "Add Preset"}</span>
          </button>
        </div>

        {addingPreset && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 flex items-center gap-2">
            <select
              aria-label="Custom preset hour"
              value={presetHour}
              onChange={(e) => setPresetHour(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-sm font-medium tabular-nums text-zinc-950 dark:text-white outline-none cursor-pointer"
            >
              {HOURS_24.map((h) => (
                <option key={h} value={h} className="bg-white dark:bg-[#141414]">
                  {h}
                </option>
              ))}
            </select>
            <span className="text-sm font-bold text-zinc-400">:</span>
            <select
              aria-label="Custom preset minute"
              value={presetMin}
              onChange={(e) => setPresetMin(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-zinc-100 dark:bg-white/[0.06] text-sm font-medium tabular-nums text-zinc-950 dark:text-white outline-none cursor-pointer"
            >
              {MINUTES_60.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-[#141414]">
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSavePreset}
              className="h-10 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer shrink-0"
            >
              Save
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {allPresets.map((t) => {
            const isCustom = !presets.includes(t);
            const isSelected = value === t;
            return (
              <div key={t} className="relative">
                <button
                  type="button"
                  onClick={() => onChange(t)}
                  className={`w-full h-11 rounded-xl text-xs sm:text-sm font-medium tabular-nums transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : "bg-white dark:bg-[#141414] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/15 hover:border-zinc-300 dark:hover:border-white/25"
                  }`}
                >
                  {t}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCustomPreset(t);
                    }}
                    aria-label={`Remove ${t} preset`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs hover:opacity-90 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SleepStepView({
  currentSubStep,
  dayNumber,
  sleepRecommendation,
  wake,
  bed,
  sleepFeeling,
  totalSleepMins,
  sleepQuality,
  onChangeWake,
  onChangeBed,
  onChangeSleepFeeling,
}: {
  currentSubStep: SubStepId;
  dayNumber: number;
  sleepRecommendation?: string | null;
  wake: string;
  bed: string;
  sleepFeeling: string;
  totalSleepMins: number;
  sleepQuality: { label: string; cls: string } | null;
  onChangeWake: (v: string) => void;
  onChangeBed: (v: string) => void;
  onChangeSleepFeeling: (v: string) => void;
}) {
  void dayNumber;
  void sleepRecommendation;
  if (currentSubStep === "wake") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="What time did you wake up?" />
        <TimeInputField
          idPrefix="wake-time"
          label="Wake time"
          value={wake}
          presets={WAKETIME_PRESETS}
          defaultHour={6}
          onChange={onChangeWake}
        />
      </div>
    );
  }

  if (currentSubStep === "bed") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="What time did you go to bed?" />
        <TimeInputField
          idPrefix="bed-time"
          label="Bedtime"
          value={bed}
          presets={BEDTIME_PRESETS}
          defaultHour={22}
          onChange={onChangeBed}
        />
        {totalSleepMins > 0 && (
          <div className="pt-3 border-t border-zinc-200/90 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-600 dark:text-zinc-400 font-medium">
              Calculated Rest
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-zinc-950 dark:text-white">
                {formatDuration(totalSleepMins)}
              </span>
              {sleepQuality && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${sleepQuality.cls}`}
                >
                  {sleepQuality.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader title="How do you feel after waking up?" />
      <FeelingSelector
        items={SLEEP_FEELINGS}
        selected={sleepFeeling}
        onSelect={onChangeSleepFeeling}
      />

      {(sleepFeeling.toLowerCase().includes("sakit") ||
        sleepFeeling.toLowerCase().includes("sick") ||
        sleepFeeling.toLowerCase().includes("unwell")) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            Rest &amp; Recovery Recommended
          </p>
          <p className="text-zinc-700 dark:text-zinc-300">
            Your recovery comes first. If you are feeling unwell today, prioritize full rest, warm hydration, and skip heavy intensity so your immune system can recover faster.
          </p>
        </div>
      )}
    </div>
  );
}

function resolveInitialMealSlot(plateSlots: MealDraft["plateSlots"]): MealSlotKey {
  for (const s of MEAL_SLOTS) {
    const counts = plateSlots?.[s.key];
    if (counts && Object.values(counts).some((q) => q > 0)) {
      return s.key;
    }
  }
  try {
    const hourStr = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    }).format(new Date());
    const h = Number(hourStr);
    if (h >= 5 && h < 11) return "breakfast";
    if (h >= 11 && h < 16) return "lunch";
    if (h >= 16 && h < 21) return "dinner";
    return "snack";
  } catch {
    return "lunch";
  }
}

export function MealStepView({
  currentSubStep,
  dayNumber,
  recommendedMeals,
  mealDraft,
  setMealDraft,
  clearError,
  mealSyncedFromDailyLog,
}: {
  currentSubStep: SubStepId;
  dayNumber: number;
  recommendedMeals: string[];
  mealDraft: MealDraft;
  setMealDraft: React.Dispatch<React.SetStateAction<MealDraft>>;
  clearError: () => void;
  mealSyncedFromDailyLog?: boolean;
}) {
  void dayNumber;
  const { locale } = useLocale();
  const isId = locale === "id";

  const [activeSlot, setActiveSlot] = useState<MealSlotKey>(() =>
    resolveInitialMealSlot(mealDraft.plateSlots)
  );
  const [activeCategory, setActiveCategory] = useState<"all" | FoodCategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCoachMenu, setShowCoachMenu] = useState(false);

  const evaluated = useMemo(
    () =>
      evaluateStandardizedPlate(
        mealDraft.plateSlots,
        mealDraft.cookingBySlot,
        isId
      ),
    [mealDraft.plateSlots, mealDraft.cookingBySlot, isId]
  );

  const hasCustomCoachGuide = useMemo(() => {
    if (!recommendedMeals || recommendedMeals.length === 0) return false;
    return !recommendedMeals[0]?.startsWith("Nutrient-dense breakfast with clean protein");
  }, [recommendedMeals]);

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FOOD_CATALOG.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.nameId.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const setFoodPortion = (slot: MealSlotKey, foodId: string, nextQty: number) => {
    clearError();
    const clamped = Math.max(0, Math.min(12, Math.round(nextQty)));
    setMealDraft((prev) => {
      const prevSlot = { ...(prev.plateSlots?.[slot] || {}) };
      if (clamped <= 0) {
        delete prevSlot[foodId];
      } else {
        prevSlot[foodId] = clamped;
      }
      const nextPlateSlots = {
        ...prev.plateSlots,
        [slot]: prevSlot,
      };
      const summary = evaluateStandardizedPlate(
        nextPlateSlots,
        prev.cookingBySlot,
        isId
      );
      return {
        ...prev,
        plateSlots: nextPlateSlots,
        mealsCount: summary.mealsCount,
        calories: summary.calories,
        carbsG: summary.carbsG,
        proteinG: summary.proteinG,
        fatG: summary.fatG,
      };
    });
  };

  const setSlotCooking = (slot: MealSlotKey, cooking: CookingStyleId) => {
    clearError();
    setMealDraft((prev) => {
      const nextCooking = {
        ...prev.cookingBySlot,
        [slot]: cooking,
      };
      const summary = evaluateStandardizedPlate(
        prev.plateSlots,
        nextCooking,
        isId
      );
      return {
        ...prev,
        cookingBySlot: nextCooking,
        mealsCount: summary.mealsCount,
        calories: summary.calories,
        carbsG: summary.carbsG,
        proteinG: summary.proteinG,
        fatG: summary.fatG,
      };
    });
  };

  if (currentSubStep === "meal_plate") {
    const slotCounts = mealDraft.plateSlots?.[activeSlot] || {};
    const activeCooking = mealDraft.cookingBySlot?.[activeSlot] || "stir_fry";

    return (
      <div className="space-y-4 min-w-0">
        <StepHeader
          title={isId ? "Apa isi piring makanmu hari ini?" : "What was on your plate today?"}
          subtitle={
            isId
              ? "Tap makanan & minuman per waktu makan — kalori & makro terhitung otomatis."
              : "Tap food & drink portions by meal — calories & macros calculate automatically."
          }
        />

        {mealSyncedFromDailyLog && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
            {isId
              ? "Tersinkron dari catatan harianmu — cek atau sesuaikan porsinya."
              : "Synced from today's daily log — review or adjust portions below."}
          </div>
        )}

        {hasCustomCoachGuide && (
          <div className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCoachMenu((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <Utensils className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{isId ? "Panduan Menu Coach Hari Ini" : "Today's Coach Meal Guide"}</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  showCoachMenu ? "rotate-180" : ""
                }`}
              />
            </button>
            {showCoachMenu && (
              <ul className="px-3.5 pb-3 pt-1 border-t border-zinc-100 dark:border-white/10 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {recommendedMeals.map((line, idx) => (
                  <li key={idx} className="leading-relaxed">
                    • {stripMealLabelPrefix(line) || line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 1. Meal Session Tabs (Breakfast / Lunch / Dinner / Snacks) */}
        <div
          role="tablist"
          aria-label="Meal time"
          className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-zinc-200/70 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10"
        >
          {MEAL_SLOTS.map((s) => {
            const active = activeSlot === s.key;
            const slotTotalPortions = Object.values(
              mealDraft.plateSlots?.[s.key] || {}
            ).reduce((acc, n) => acc + (n > 0 ? n : 0), 0);
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSlot(s.key)}
                className={`h-9 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-[0.98] cursor-pointer ${
                  active
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                }`}
              >
                <span className="truncate">{isId ? s.labelId : s.labelEn}</span>
                {slotTotalPortions > 0 && (
                  <span
                    className={`min-w-4 h-4 px-1 rounded-full text-[10px] font-mono font-bold inline-flex items-center justify-center ${
                      active
                        ? "bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950"
                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    }`}
                  >
                    {slotTotalPortions}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 2. Search + Category Filter Pills */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isId
                  ? "Cari nasi, mie, ayam, sayur, biskuit..."
                  : "Search rice, noodles, chicken, veggies, snacks..."
              }
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-xs sm:text-sm text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-200 dark:bg-white/15 text-zinc-700 dark:text-zinc-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {FOOD_CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap transition active:scale-95 cursor-pointer ${
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300"
                  }`}
                >
                  {isId ? cat.labelId : cat.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Cooking Method Modifier (Main meals only) */}
        {activeSlot !== "snack" && (
          <div className="space-y-1.5">
            <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {isId ? "Cara Masak Dominan" : "Dominant Cooking Style"}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {COOKING_STYLES.map((style) => {
                const active = activeCooking === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSlotCooking(activeSlot, style.id)}
                    className={`h-8 px-2.5 rounded-xl border text-[11px] font-medium truncate transition active:scale-95 cursor-pointer ${
                      active
                        ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                        : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                    }`}
                  >
                    {isId ? style.labelId : style.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 2-Column Standardized Tap-to-Plate Food Chips */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto overscroll-contain pr-0.5 py-0.5">
          {filteredFoods.map((food) => {
            const qty = slotCounts[food.id] || 0;
            const selected = qty > 0;
            const title = isId ? food.nameId : food.nameEn;
            const portion = isId ? food.portionLabelId : food.portionLabelEn;

            return (
              <div
                key={food.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!selected) {
                    setFoodPortion(activeSlot, food.id, 1);
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !selected) {
                    e.preventDefault();
                    setFoodPortion(activeSlot, food.id, 1);
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition select-none flex flex-col justify-between gap-2 ${
                  selected
                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                    : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25 cursor-pointer active:scale-[0.98]"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      selected ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"
                    }`}
                  >
                    {title}
                  </p>
                  <p
                    className={`text-[11px] font-mono truncate mt-0.5 ${
                      selected
                        ? "text-white/75 dark:text-zinc-950/75"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {portion} · {food.calories} kcal
                  </p>
                </div>

                {selected ? (
                  <div
                    className="flex items-center justify-between gap-1 pt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setFoodPortion(activeSlot, food.id, qty - 1)}
                      aria-label={`Decrease ${title}`}
                      className="w-7 h-7 rounded-lg bg-white/15 dark:bg-zinc-950/10 hover:bg-white/25 dark:hover:bg-zinc-950/20 flex items-center justify-center transition active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold tabular-nums">
                      {qty}×
                    </span>
                    <button
                      type="button"
                      onClick={() => setFoodPortion(activeSlot, food.id, qty + 1)}
                      aria-label={`Increase ${title}`}
                      className="w-7 h-7 rounded-lg bg-white/15 dark:bg-zinc-950/10 hover:bg-white/25 dark:hover:bg-zinc-950/20 flex items-center justify-center transition active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    <span>
                      P {food.proteinG}g · C {food.carbsG}g
                    </span>
                    <Plus className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 5. Live Auto-Calculated Plate Summary */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/90 dark:border-white/15 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              {isId ? "Total Piring Hari Ini" : "Today's Plate Total"}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              {evaluated.totalPortions > 0
                ? `${evaluated.slots.length} ${
                    isId ? "waktu makan" : evaluated.slots.length === 1 ? "meal" : "meals"
                  }`
                : isId
                  ? "Belum ada item dipilih"
                  : "Tap items above"}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-400 block text-[10px]">Calories</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {evaluated.totalPortions > 0
                  ? `${evaluated.calories} kcal`
                  : mealDraft.calories
                    ? `${mealDraft.calories} kcal`
                    : "0 kcal"}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Carbs</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {evaluated.totalPortions > 0 ? evaluated.carbsG : mealDraft.carbsG ?? 0}g
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Protein</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {evaluated.totalPortions > 0 ? evaluated.proteinG : mealDraft.proteinG ?? 0}g
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">Fat</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {evaluated.totalPortions > 0 ? evaluated.fatG : mealDraft.fatG ?? 0}g
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fallbackTotals = computeMealTotals(
    mealDraft.mealEntries,
    mealDraft.mealsCount || 1
  );
  const displayCal =
    evaluated.totalPortions > 0
      ? evaluated.calories
      : mealDraft.calories || fallbackTotals.calories;
  const displayC =
    evaluated.totalPortions > 0
      ? evaluated.carbsG
      : mealDraft.carbsG ?? fallbackTotals.carbsG;
  const displayP =
    evaluated.totalPortions > 0
      ? evaluated.proteinG
      : mealDraft.proteinG ?? fallbackTotals.proteinG;
  const displayF =
    evaluated.totalPortions > 0
      ? evaluated.fatG
      : mealDraft.fatG ?? fallbackTotals.fatG;

  return (
    <div className="space-y-5 min-w-0">
      <StepHeader
        title={
          isId
            ? "Bagaimana kondisi perut & pencernaanmu?"
            : "How does your stomach & digestion feel?"
        }
        subtitle={
          isId
            ? "Cek rasa kenyang & kelancaran pencernaan setelah makan hari ini."
            : "Quick gut comfort & satiety check after today's meals."
        }
      />

      {displayCal > 0 && (
        <div className="p-4 rounded-2xl bg-white/85 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-2.5">
          {evaluated.slots.length > 0 && (
            <div className="space-y-1 pb-2 border-b border-zinc-100 dark:border-white/10">
              {evaluated.slots.map((s) => (
                <div
                  key={s.slot}
                  className="flex items-baseline justify-between gap-2 text-xs"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 truncate">
                    {s.summaryText}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500 shrink-0 tabular-nums">
                    {s.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px]">Calories</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {displayCal} kcal
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Carbs</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {displayC}g
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Protein</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {displayP}g
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Fat</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {displayF}g
              </span>
            </div>
          </div>
        </div>
      )}

      <FeelingSelector
        items={MEAL_FEELINGS}
        selected={mealDraft.mealFeeling}
        onSelect={(label) => {
          clearError();
          setMealDraft((prev) => ({ ...prev, mealFeeling: label }));
        }}
      />
    </div>
  );
}

function BottleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 2h4" />
      <path d="M10 2v3a2 2 0 0 1-.6 1.4L8 8a2 2 0 0 0-.6 1.4V20a2 2 0 0 0 2 2h5.2a2 2 0 0 0 2-2V9.4a2 2 0 0 0-.6-1.4l-1.4-1.6A2 2 0 0 1 14 5V2" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}

function TumblerIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 3h10l-1.5 17a2 2 0 0 1-2 1.9h-3a2 2 0 0 1-2-1.9L7 3z" />
      <line x1="6" y1="3" x2="18" y2="3" />
      <line x1="8" y1="10" x2="16" y2="10" />
    </svg>
  );
}

const DEFAULT_WATER_VESSELS = [
  {
    id: "glass",
    name: "Glass",
    defaultMl: 250,
    Icon: GlassWater,
  },
  {
    id: "mug",
    name: "Cup / Mug",
    defaultMl: 350,
    Icon: Coffee,
  },
  {
    id: "bottle",
    name: "Bottle",
    defaultMl: 500,
    Icon: BottleIcon,
  },
  {
    id: "tumbler",
    name: "Tumbler",
    defaultMl: 750,
    Icon: TumblerIcon,
  },
] as const;

type VesselId = (typeof DEFAULT_WATER_VESSELS)[number]["id"];
type VesselSizesMap = Record<VesselId, number>;

const WATER_VESSELS_STORAGE_KEY = "zera:water-vessels:v1";

function loadVesselSizes(): VesselSizesMap {
  const defaults: VesselSizesMap = {
    glass: 250,
    mug: 350,
    bottle: 500,
    tumbler: 750,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(WATER_VESSELS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<VesselId, unknown>>;
    for (const v of DEFAULT_WATER_VESSELS) {
      const n = Number(parsed?.[v.id]);
      if (Number.isFinite(n) && n >= 30 && n <= 5000) {
        defaults[v.id] = Math.round(n);
      }
    }
    return defaults;
  } catch {
    return defaults;
  }
}

function saveVesselSizes(sizes: VesselSizesMap) {
  try {
    window.localStorage.setItem(WATER_VESSELS_STORAGE_KEY, JSON.stringify(sizes));
  } catch {
    /* ignore storage quota errors */
  }
}

export function WaterStepView({
  waterMl,
  onChangeWaterMl,
  urineColor = null,
  onChangeUrineColor,
}: {
  waterMl: number;
  onChangeWaterMl: (next: number) => void;
  urineColor?: string | null;
  onChangeUrineColor?: (next: string | null) => void;
}) {
  const { locale } = useLocale();
  const isId = locale === "id";
  const TARGET_ML = WATER_TARGET_ML;
  const pct = Math.min(100, Math.round((Math.max(0, waterMl) / TARGET_ML) * 100));
  const [directInput, setDirectInput] = useState(() => (waterMl > 0 ? String(waterMl) : ""));
  const [vesselSizes, setVesselSizes] = useState<VesselSizesMap>(() => ({
    glass: 250,
    mug: 350,
    bottle: 500,
    tumbler: 750,
  }));
  const [editingSizes, setEditingSizes] = useState(false);

  useEffect(() => {
    setVesselSizes(loadVesselSizes());
    let cancelled = false;
    void wellnessGetUserPreferences().then((res) => {
      if (cancelled || !res.success || !res.data?.waterVessels) return;
      const dbVessels = res.data.waterVessels;
      setVesselSizes((prev) => {
        const merged: VesselSizesMap = {
          glass: dbVessels.glass || prev.glass,
          mug: dbVessels.mug || prev.mug,
          bottle: dbVessels.bottle || prev.bottle,
          tumbler: dbVessels.tumbler || prev.tumbler,
        };
        saveVesselSizes(merged);
        return merged;
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDirectInput(waterMl > 0 ? String(waterMl) : "");
  }, [waterMl]);

  const addAmount = (delta: number) => {
    const next = Math.max(0, Math.min(15000, (waterMl || 0) + delta));
    onChangeWaterMl(next);
  };

  const handleReset = () => {
    onChangeWaterMl(0);
    setDirectInput("");
  };

  const handleDirectInputChange = (raw: string) => {
    setDirectInput(raw);
    if (raw.trim() === "") {
      onChangeWaterMl(0);
      return;
    }
    const val = parseInt(raw, 10);
    if (!Number.isNaN(val) && val >= 0) {
      onChangeWaterMl(Math.min(15000, val));
    }
  };

  const handleUpdateVesselSize = (id: VesselId, raw: string) => {
    const val = parseInt(raw, 10);
    if (Number.isNaN(val)) return;
    const clamped = Math.max(30, Math.min(5000, val));
    setVesselSizes((prev) => {
      const next = { ...prev, [id]: clamped };
      saveVesselSizes(next);
      void wellnessSaveUserPreferences({ waterVessels: next });
      return next;
    });
  };

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader
        title="How much water did you drink today?"
        subtitle="Enter your total directly or tap your own glass, mug, bottle, or tumbler below."
      />

      {/* Direct Input & Progress Card */}
      <div className="p-5 rounded-2xl bg-white/85 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="water-direct-ml-input"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Total Water Intake (ml)
            </label>
            {waterMl > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="relative">
            <input
              id="water-direct-ml-input"
              type="number"
              inputMode="numeric"
              min={0}
              max={15000}
              step={50}
              placeholder="e.g. 2000"
              value={directInput}
              onChange={(e) => handleDirectInputChange(e.target.value)}
              className="w-full h-13 px-4 pr-14 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#18181b] text-xl font-geometric font-semibold tabular-nums text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-zinc-400 pointer-events-none">
              ml
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, (m) => (m === ".00" ? ".0" : m))} L of{" "}
              {(TARGET_ML / 1000).toFixed(1)} L daily goal
            </span>
            <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
              {pct}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-zinc-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Customizable Vessel Tap Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {editingSizes ? "Set your vessel sizes (ml)" : "Quick Add by Vessel"}
          </span>
          <button
            type="button"
            onClick={() => setEditingSizes((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-200/75 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300/70 dark:hover:bg-white/15 transition active:scale-95 cursor-pointer"
          >
            {editingSizes ? (
              <>
                <Check className="w-3 h-3" />
                <span>Done</span>
              </>
            ) : (
              <>
                <Pencil className="w-3 h-3" />
                <span>Customize Sizes</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {DEFAULT_WATER_VESSELS.map((c) => {
            const ContainerIcon = c.Icon;
            const customMl = vesselSizes[c.id] || c.defaultMl;

            if (editingSizes) {
              return (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-zinc-300 dark:border-white/25 bg-white dark:bg-[#141414] space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
                      <ContainerIcon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate">
                      {c.name}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={30}
                      max={5000}
                      step={25}
                      aria-label={`${c.name} size in ml`}
                      defaultValue={customMl}
                      onBlur={(e) => handleUpdateVesselSize(c.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          (e.currentTarget as HTMLInputElement).blur();
                        }
                      }}
                      className="w-full h-9 px-3 pr-9 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.05] text-xs font-mono font-semibold text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-400 pointer-events-none">
                      ml
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => addAmount(customMl)}
                className="group relative p-4 rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-zinc-400 dark:hover:border-white/30 text-left transition active:scale-95 cursor-pointer shadow-2xs flex flex-col justify-between min-h-[104px]"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ContainerIcon className="w-5 h-5" />
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                    +{customMl} ml
                  </span>
                </div>

                <div className="pt-3">
                  <span className="block text-sm font-semibold text-zinc-950 dark:text-white leading-tight">
                    {c.name}
                  </span>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                    Tap to add {customMl} ml
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional 1-Tap Urine Hydration Check */}
      {onChangeUrineColor && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {isId
                ? "Cek Hidrasi Warna Urin (Opsional)"
                : "Hydration Check · Urine Color (Optional)"}
            </span>
            {urineColor && (
              <button
                type="button"
                onClick={() => onChangeUrineColor(null)}
                className="text-[11px] font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                {isId ? "Hapus" : "Clear"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {URINE_COLOR_OPTIONS.map((opt) => {
              const active = urineColor === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeUrineColor(active ? null : opt.id)}
                  className={`p-3 rounded-2xl border text-left transition active:scale-95 cursor-pointer flex flex-col justify-between gap-2 ${
                    active
                      ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : "border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-zinc-300 dark:hover:border-white/25"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 rounded-full border border-black/15 shrink-0"
                    style={{ backgroundColor: opt.swatchHex }}
                  />
                  <div className="min-w-0">
                    <span
                      className={`block text-xs font-semibold truncate ${
                        active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"
                      }`}
                    >
                      {isId ? opt.labelId : opt.labelEn}
                    </span>
                    <span
                      className={`block text-[10px] truncate mt-0.5 ${
                        active
                          ? "text-white/75 dark:text-zinc-950/75"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {isId ? opt.hintId : opt.hintEn}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
