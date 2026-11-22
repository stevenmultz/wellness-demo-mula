"use client";

import { ChevronDown } from "lucide-react";
import {
  BEDTIME_PRESETS,
  HOURS_24,
  MEAL_FEELINGS,
  MINUTES_60,
  SLEEP_FEELINGS,
  TIME_24H_RE,
  WAKETIME_PRESETS,
  formatDuration,
  pad2,
  sleepQualityLabel,
  stripMealLabelPrefix,
  type MealDraft,
  type MealSlotEntry,
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
  items: ReadonlyArray<{ label: string; desc: string }>;
  selected: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {items.map((item) => {
        const active = selected === item.label;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onSelect(item.label)}
            className={`w-full p-4 rounded-2xl border text-left transition select-none ${
              active
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"
              }`}
            >
              {item.label}
            </p>
            <p
              className={`text-xs mt-0.5 ${
                active
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {item.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
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
  const validMatch = TIME_24H_RE.exec(value);
  const hourStr = validMatch ? validMatch[1] : "";
  const minStr = validMatch ? validMatch[2] : "";

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
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
          Quick Presets
        </span>
        <div className="grid grid-cols-3 gap-2.5">
          {presets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`h-11 rounded-xl text-xs sm:text-sm font-medium tabular-nums transition active:scale-95 ${
                value === t
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "bg-white dark:bg-[#141414] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/15 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              {t}
            </button>
          ))}
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
    </div>
  );
}

export function MealStepView({
  currentSubStep,
  dayNumber,
  recommendedMeals,
  mealDraft,
  setMealDraft,
  clearError,
}: {
  currentSubStep: SubStepId;
  dayNumber: number;
  recommendedMeals: string[];
  mealDraft: MealDraft;
  setMealDraft: React.Dispatch<React.SetStateAction<MealDraft>>;
  clearError: () => void;
}) {
  void dayNumber;
  if (currentSubStep === "meal_count") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="How many meals did you eat today?" />
        <div className="grid grid-cols-3 gap-3 pt-1">
          {([1, 2, 3] as const).map((count) => {
            const active = mealDraft.mealsCount === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => {
                  clearError();
                  setMealDraft((prev) => ({
                    ...prev,
                    mealsCount: count,
                    mealEntries: prev.mealEntries.slice(0, count),
                  }));
                }}
                className={`py-5 px-2 rounded-2xl border text-center transition active:scale-95 ${
                  active
                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                }`}
              >
                <span className="block text-2xl font-geometric font-medium tabular-nums leading-none">
                  {count}
                </span>
                <span
                  className={`block text-xs font-medium mt-2 ${
                    active
                      ? "text-white/80 dark:text-zinc-950/80"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {count === 1 ? "Meal" : "Meals"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (
    currentSubStep === "meal_entry_1" ||
    currentSubStep === "meal_entry_2" ||
    currentSubStep === "meal_entry_3"
  ) {
    const slotIndex =
      currentSubStep === "meal_entry_1" ? 0 : currentSubStep === "meal_entry_2" ? 1 : 2;
    const entry = mealDraft.mealEntries[slotIndex];
    const totalMeals = mealDraft.mealsCount || 1;
    const defaultRec =
      recommendedMeals[Math.min(slotIndex, recommendedMeals.length - 1)] ||
      recommendedMeals[0];
    const cleanDefaultRec = stripMealLabelPrefix(defaultRec) || defaultRec;

    const setSlotEntry = (next: MealSlotEntry) => {
      clearError();
      setMealDraft((prev) => {
        const nextEntries = [...prev.mealEntries];
        nextEntries[slotIndex] = next;
        const activeSlice = nextEntries.slice(0, prev.mealsCount || 1);
        const checkedMeals = Array.from(
          new Set(
            activeSlice
              .filter((e) => e?.status === "followed" && e.mealItem)
              .map((e) => e.mealItem!)
          )
        );
        const allSimilar =
          activeSlice.length > 0 && activeSlice.every((e) => e?.status === "similar");
        const allOff =
          activeSlice.length > 0 && activeSlice.every((e) => e?.status === "off_track");
        return {
          ...prev,
          mealEntries: nextEntries,
          checkedMeals,
          specialOption: allSimilar ? "similar" : allOff ? "off_track" : null,
        };
      });
    };

    return (
      <div className="space-y-6 min-w-0">
        <StepHeader
          title={`Did Meal ${slotIndex + 1} follow your plan?`}
          subtitle={cleanDefaultRec ? `Recommended: ${cleanDefaultRec}` : null}
        />

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() =>
              setSlotEntry({ status: "followed", mealItem: entry?.mealItem || defaultRec })
            }
            className={`w-full p-4 rounded-2xl border text-left transition select-none ${
              entry?.status === "followed"
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                entry?.status === "followed"
                  ? "text-white dark:text-zinc-950"
                  : "text-zinc-950 dark:text-white"
              }`}
            >
              Followed Recommended Meal
            </p>
            <p
              className={`text-xs mt-0.5 ${
                entry?.status === "followed"
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Ate in line with today&apos;s meal plan guideline.
            </p>
          </button>

          {entry?.status === "followed" && recommendedMeals.length > 1 && (
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/[0.03] space-y-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                Matched Menu Option
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {recommendedMeals.map((mealLine, idx) => {
                  const selected = (entry.mealItem || defaultRec) === mealLine;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSlotEntry({ status: "followed", mealItem: mealLine })}
                      className={`w-full px-3 py-2 rounded-xl border text-left text-xs transition ${
                        selected
                          ? "border-zinc-950 dark:border-white bg-white dark:bg-white/10 font-semibold text-zinc-950 dark:text-white"
                          : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                      }`}
                    >
                      <span className="font-mono uppercase text-[10px] mr-1.5 opacity-70">
                        #{idx + 1}
                      </span>
                      {stripMealLabelPrefix(mealLine) || mealLine}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setSlotEntry({ status: "similar" })}
            className={`w-full p-4 rounded-2xl border text-left transition select-none ${
              entry?.status === "similar"
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                entry?.status === "similar"
                  ? "text-white dark:text-zinc-950"
                  : "text-zinc-950 dark:text-white"
              }`}
            >
              Similar Portion &amp; Clean Nutrition
            </p>
            <p
              className={`text-xs mt-0.5 ${
                entry?.status === "similar"
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Different dish with balanced macros and portion size.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSlotEntry({ status: "off_track" })}
            className={`w-full p-4 rounded-2xl border text-left transition select-none ${
              entry?.status === "off_track"
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                entry?.status === "off_track"
                  ? "text-white dark:text-zinc-950"
                  : "text-zinc-950 dark:text-white"
              }`}
            >
              Off Plan
            </p>
            <p
              className={`text-xs mt-0.5 ${
                entry?.status === "off_track"
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Did not follow recommended meal guidelines for Meal {slotIndex + 1}.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (currentSubStep === "meal_nutrition") {
    const waterPresets = [1500, 2000, 2500, 3000];
    const updateMacro = (
      field: "calories" | "carbsG" | "proteinG" | "fatG" | "waterMl",
      raw: string
    ) => {
      clearError();
      const num = raw.trim() === "" ? null : Math.max(0, Math.round(Number(raw)));
      setMealDraft((prev) => {
        const next = {
          ...prev,
          [field]: Number.isFinite(num as number) ? num : null,
        };
        if (field === "carbsG" || field === "proteinG" || field === "fatG") {
          const c = next.carbsG || 0;
          const p = next.proteinG || 0;
          const f = next.fatG || 0;
          if (c > 0 || p > 0 || f > 0) {
            next.calories = Math.round(c * 4 + p * 4 + f * 9);
          }
        }
        return next;
      });
    };

    const inputCls =
      "w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-sm font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition";

    return (
      <div className="space-y-5 min-w-0">
        <StepHeader title="What were your macros & water intake today?" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Carbs (g)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1500}
              placeholder="e.g. 200"
              value={mealDraft.carbsG ?? ""}
              onChange={(e) => updateMacro("carbsG", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Protein (g)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              placeholder="e.g. 140"
              value={mealDraft.proteinG ?? ""}
              onChange={(e) => updateMacro("proteinG", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Fat (g)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={500}
              placeholder="e.g. 60"
              value={mealDraft.fatG ?? ""}
              onChange={(e) => updateMacro("fatG", e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Calories (kcal)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              placeholder="e.g. 1900"
              value={mealDraft.calories ?? ""}
              onChange={(e) => updateMacro("calories", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Water Intake (ml)
            </label>
            {mealDraft.waterMl ? (
              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
                {(mealDraft.waterMl / 1000).toFixed(1)} L
              </span>
            ) : null}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            step={100}
            placeholder="e.g. 2200"
            value={mealDraft.waterMl ?? ""}
            onChange={(e) => updateMacro("waterMl", e.target.value)}
            className={inputCls}
          />
          <div className="grid grid-cols-4 gap-2 pt-1">
            {waterPresets.map((ml) => {
              const active = mealDraft.waterMl === ml;
              return (
                <button
                  key={ml}
                  type="button"
                  onClick={() => updateMacro("waterMl", String(ml))}
                  className={`py-2 px-2 rounded-xl border text-xs font-mono transition ${
                    active
                      ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                      : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                  }`}
                >
                  {(ml / 1000).toFixed(1)}L
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader title="How do you feel after today's meals?" />
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
