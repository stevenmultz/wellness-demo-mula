"use client";

import { useState } from "react";
import { ChevronDown, Coffee, GlassWater, Plus, RotateCcw } from "lucide-react";
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

      {(sleepFeeling.toLowerCase().includes("sakit") ||
        sleepFeeling.toLowerCase().includes("sick")) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 text-xs leading-relaxed space-y-1.5 animate-in fade-in duration-200">
          <p className="font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
            <span>💡 Rekomendasi Pemulihan (Rest &amp; Recovery)</span>
          </p>
          <p className="text-zinc-700 dark:text-zinc-300">
            Kesehatan dan pemulihan tubuh Anda adalah prioritas utama. Jika hari ini sedang sakit, sangat disarankan untuk beristirahat penuh (Rest Mode), perbanyak hidrasi air hangat, dan lewati aktivitas berat hari ini agar imunitas tubuh cepat pulih.
          </p>
        </div>
      )}
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
  if (currentSubStep === "meal_count") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader title="How many meals did you eat today?" />
        {mealSyncedFromDailyLog && (
          <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-800 dark:text-emerald-300">
            Synced from today&apos;s daily log — confirm or adjust adherence for this program.
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {([1, 2, 3] as const).map((count) => {
            const active = mealDraft.mealsCount === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => {
                  clearError();
                  setMealDraft((prev) => {
                    const nextEntries = prev.mealEntries.slice(0, count);
                    const totals = computeMealTotals(nextEntries, count);
                    return {
                      ...prev,
                      mealsCount: count,
                      mealEntries: nextEntries,
                      ...totals,
                    };
                  });
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
    const isFollowedOrSimilar =
      entry?.status === "followed" || entry?.status === "similar";
    const defaultRec =
      recommendedMeals[Math.min(slotIndex, recommendedMeals.length - 1)] ||
      recommendedMeals[0];
    const cleanDefaultRec = stripMealLabelPrefix(defaultRec) || defaultRec;

    const setSlotEntry = (next: MealSlotEntry) => {
      clearError();
      setMealDraft((prev) => {
        const nextEntries = [...prev.mealEntries];
        nextEntries[slotIndex] = next;
        const count = prev.mealsCount || 1;
        const activeSlice = nextEntries.slice(0, count);
        const checkedMeals = Array.from(
          new Set(
            activeSlice
              .filter(
                (e) =>
                  (e?.status === "followed" || e?.status === "similar") && e.mealItem
              )
              .map((e) => e.mealItem!)
          )
        );
        const allOff =
          activeSlice.length > 0 && activeSlice.every((e) => e?.status === "off_track");
        const totals = computeMealTotals(nextEntries, count);
        return {
          ...prev,
          mealEntries: nextEntries,
          checkedMeals,
          specialOption: allOff ? "off_track" : null,
          ...totals,
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
              setSlotEntry({
                status: "followed",
                mealItem: entry?.mealItem || defaultRec,
              })
            }
            className={`w-full p-4 rounded-2xl border text-left transition select-none ${
              isFollowedOrSimilar
                ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                isFollowedOrSimilar
                  ? "text-white dark:text-zinc-950"
                  : "text-zinc-950 dark:text-white"
              }`}
            >
              Followed Plan / Similar
            </p>
            <p
              className={`text-xs mt-0.5 ${
                isFollowedOrSimilar
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Ate recommended menu or a similar clean, balanced meal portion.
            </p>
          </button>

          {isFollowedOrSimilar && recommendedMeals.length > 1 && (
            <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/[0.03] space-y-2">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
                Matched Menu Option
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {recommendedMeals.map((mealLine, idx) => {
                  const selected = (entry?.mealItem || defaultRec) === mealLine;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>
                        setSlotEntry({ status: "followed", mealItem: mealLine })
                      }
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
            onClick={() =>
              setSlotEntry({
                status: "off_track",
                calories: entry?.calories ?? null,
                carbsG: entry?.carbsG ?? null,
                proteinG: entry?.proteinG ?? null,
                fatG: entry?.fatG ?? null,
              })
            }
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
              Ate outside today&apos;s plan — input Meal {slotIndex + 1} macros on the next step.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (
    currentSubStep === "meal_off_1" ||
    currentSubStep === "meal_off_2" ||
    currentSubStep === "meal_off_3"
  ) {
    const slotIndex =
      currentSubStep === "meal_off_1" ? 0 : currentSubStep === "meal_off_2" ? 1 : 2;
    const entry = mealDraft.mealEntries[slotIndex] || { status: "off_track" as const };

    const updateOffPlanMacro = (
      field: "calories" | "carbsG" | "proteinG" | "fatG",
      raw: string
    ) => {
      clearError();
      const num = raw.trim() === "" ? null : Math.max(0, Math.round(Number(raw)));
      setMealDraft((prev) => {
        const nextEntries = [...prev.mealEntries];
        const prevSlot = nextEntries[slotIndex] || { status: "off_track" as const };
        const nextSlot: MealSlotEntry = {
          ...prevSlot,
          status: "off_track",
          [field]: Number.isFinite(num as number) ? num : null,
        };
        if (field === "carbsG" || field === "proteinG" || field === "fatG") {
          const c = nextSlot.carbsG || 0;
          const p = nextSlot.proteinG || 0;
          const f = nextSlot.fatG || 0;
          if (c > 0 || p > 0 || f > 0) {
            nextSlot.calories = Math.round(c * 4 + p * 4 + f * 9);
          }
        }
        nextEntries[slotIndex] = nextSlot;
        const count = prev.mealsCount || 1;
        const totals = computeMealTotals(nextEntries, count);
        return {
          ...prev,
          mealEntries: nextEntries,
          ...totals,
        };
      });
    };

    const inputCls =
      "w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-sm font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white transition";

    return (
      <div className="space-y-5 min-w-0">
        <StepHeader
          title={`What was the nutrition total for Meal ${slotIndex + 1} (Off Plan)?`}
          subtitle="Enter macros or total calories for this off-plan meal."
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Carbs (g)
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              placeholder="e.g. 95"
              value={entry.carbsG ?? ""}
              onChange={(e) => updateOffPlanMacro("carbsG", e.target.value)}
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
              max={500}
              placeholder="e.g. 30"
              value={entry.proteinG ?? ""}
              onChange={(e) => updateOffPlanMacro("proteinG", e.target.value)}
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
              max={300}
              placeholder="e.g. 35"
              value={entry.fatG ?? ""}
              onChange={(e) => updateOffPlanMacro("fatG", e.target.value)}
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
              max={5000}
              placeholder="e.g. 815"
              value={entry.calories ?? ""}
              onChange={(e) => updateOffPlanMacro("calories", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>
    );
  }

  const totals = computeMealTotals(mealDraft.mealEntries, mealDraft.mealsCount || 1);

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader title="How do you feel after today's meals?" />

      {/* Daily Calculated Nutrition Summary from Meals 1..N (Pure Intake — Water tracked separately) */}
      {totals.calories > 0 && (
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400 block">
            Today&apos;s Calculated Intake ({mealDraft.mealsCount || 1}{" "}
            {(mealDraft.mealsCount || 1) === 1 ? "Meal" : "Meals"})
          </span>
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div>
              <span className="text-zinc-500 block text-[10px]">Calories</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {totals.calories} kcal
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Carbs</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {totals.carbsG}g
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Protein</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {totals.proteinG}g
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Fat</span>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {totals.fatG}g
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

const WATER_CONTAINERS = [
  {
    id: "glass",
    name: "Gelas",
    enName: "Glass",
    ml: 250,
    Icon: GlassWater,
  },
  {
    id: "mug",
    name: "Cangkir",
    enName: "Cup / Mug",
    ml: 350,
    Icon: Coffee,
  },
  {
    id: "bottle",
    name: "Botol",
    enName: "Bottle",
    ml: 500,
    Icon: BottleIcon,
  },
  {
    id: "tumbler",
    name: "Tumbler",
    enName: "Tumbler",
    ml: 750,
    Icon: TumblerIcon,
  },
] as const;

export function WaterStepView({
  waterMl,
  onChangeWaterMl,
}: {
  waterMl: number;
  onChangeWaterMl: (next: number) => void;
}) {
  const TARGET_ML = 2500;
  const pct = Math.min(100, Math.round((Math.max(0, waterMl) / TARGET_ML) * 100));
  const [showCustom, setShowCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");

  const addAmount = (delta: number) => {
    onChangeWaterMl(Math.max(0, Math.min(15000, (waterMl || 0) + delta)));
  };

  const handleReset = () => {
    onChangeWaterMl(0);
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customInput, 10);
    if (!Number.isNaN(val) && val > 0) {
      addAmount(val);
      setCustomInput("");
      setShowCustom(false);
    }
  };

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader
        title="Berapa banyak air yang Anda minum hari ini?"
        subtitle="Tap ikon wadah minum untuk langsung menambahkan catatan hidrasi harian Anda."
      />

      {/* Progress & Live Total Card */}
      <div className="p-5 rounded-2xl bg-white/85 dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
              {(waterMl / 1000).toFixed(2).replace(/\.?0+$/, (m) => (m === ".00" ? ".0" : m))}
            </span>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              / {(TARGET_ML / 1000).toFixed(1)} L
            </span>
          </div>

          <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">
            {waterMl.toLocaleString()} ml ({pct}%)
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-zinc-200/80 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Action Buttons Toolbar: Reset & Custom Add */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200/60 dark:border-white/10">
          <button
            type="button"
            disabled={waterMl <= 0}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 disabled:hover:text-zinc-600 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Water</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustom((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showCustom ? "Tutup Custom" : "Tambah Custom (ml)"}</span>
          </button>
        </div>

        {/* Optional Custom Input Panel */}
        {showCustom && (
          <div className="pt-2 flex items-center gap-2 animate-in fade-in duration-150">
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={5000}
              step={50}
              placeholder="Jumlah ml (mis. 200)"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomSubmit();
                }
              }}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#18181b] text-xs font-mono text-zinc-950 dark:text-white placeholder:text-zinc-400 outline-none focus:border-zinc-950 dark:focus:border-white"
            />
            <button
              type="button"
              disabled={!customInput || parseInt(customInput, 10) <= 0}
              onClick={handleCustomSubmit}
              className="px-4 py-2.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
            >
              Tambah
            </button>
          </div>
        )}
      </div>

      {/* 4 Quick Container Tap Cards */}
      <div className="space-y-2.5">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block">
          Pilih Wadah (Tap untuk menambah)
        </span>

        <div className="grid grid-cols-2 gap-3">
          {WATER_CONTAINERS.map((c) => {
            const ContainerIcon = c.Icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => addAmount(c.ml)}
                className="group relative p-4 rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] hover:border-zinc-400 dark:hover:border-white/30 text-left transition active:scale-95 cursor-pointer shadow-2xs flex flex-col justify-between min-h-[108px]"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ContainerIcon className="w-5 h-5" />
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                    +{c.ml} ml
                  </span>
                </div>

                <div className="pt-3">
                  <span className="block text-sm font-semibold text-zinc-950 dark:text-white leading-tight">
                    {c.name}
                  </span>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal mt-0.5">
                    {c.enName} · Tap +{c.ml} ml
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
