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
  eyebrow,
  rightLabel,
  title,
  subtitle,
  quote,
}: {
  eyebrow: string;
  rightLabel?: string;
  title: string;
  subtitle?: string | null;
  quote?: string | null;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {eyebrow}
        </span>
        {rightLabel && (
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
            {rightLabel}
          </span>
        )}
      </div>
      <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.15]">
        {title}
      </h1>
      {quote && (
        <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 border-l-2 border-zinc-300 dark:border-white/25 pl-3 leading-relaxed">
          {quote}
        </p>
      )}
      {subtitle && (
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
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
        <StepHeader
          eyebrow={`Day ${dayNumber} · Sleep Log`}
          title="What time did you wake up today?"
        />
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
        <StepHeader
          eyebrow={wake ? `Woke up at ${wake}` : `Day ${dayNumber} · Sleep Log`}
          title="What time did you go to sleep last night?"
        />
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
              Total Sleep
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
      <StepHeader
        eyebrow={`${bed} → ${wake} · ${formatDuration(totalSleepMins)}`}
        title="How do you feel after waking up?"
        subtitle="Select the condition that best describes your morning energy."
      />
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
  if (currentSubStep === "meal_count") {
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader
          eyebrow={`Day ${dayNumber} · Meal Notes`}
          title="How was your meal today?"
        />
        <textarea
          value={mealDraft.mealFeeling}
          onChange={(e) => {
            clearError();
            setMealDraft((prev) => ({ ...prev, mealFeeling: e.target.value }));
          }}
          rows={5}
          maxLength={1000}
          placeholder="e.g. Had rice and grilled chicken for lunch, light dinner around 7pm..."
          className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-base sm:text-sm leading-relaxed text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-950 dark:focus:border-white transition resize-none"
        />
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
          eyebrow={`Meal ${slotIndex + 1} of ${totalMeals} · Daily Plan Check`}
          title={`Did Meal ${slotIndex + 1} follow today's meal plan?`}
          subtitle={cleanDefaultRec ? `Suggested: ${cleanDefaultRec}` : null}
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

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader
        eyebrow={`${mealDraft.mealsCount} ${mealDraft.mealsCount === 1 ? "Meal" : "Meals"} Logged`}
        title="How do you feel after your meals?"
        subtitle="Note your post-meal digestion and sustained energy state."
      />
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
