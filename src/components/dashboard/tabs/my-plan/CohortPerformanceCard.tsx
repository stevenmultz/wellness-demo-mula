"use client";

import { useEffect, useState } from "react";
import { Droplets, Dumbbell, Flame, Moon, Plus, Scale, Utensils } from "lucide-react";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  movementNames,
  splitActivities,
  type PlanDay,
} from "./myPlanUtils";

// ─── MetricDeltaBadge ────────────────────────────────────────────────────────
function MetricDeltaBadge({
  delta,
  unit = "%",
  invertColor = false,
}: {
  delta: number;
  unit?: string;
  invertColor?: boolean;
}) {
  if (delta > 0) {
    const isPositiveGood = !invertColor;
    return (
      <span
        className={`text-[11px] font-mono font-semibold ${
          isPositiveGood
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        +{delta}
        {unit}
      </span>
    );
  }
  if (delta < 0) {
    const isNegativeGood = invertColor;
    return (
      <span
        className={`text-[11px] font-mono font-semibold ${
          isNegativeGood
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        {delta}
        {unit}
      </span>
    );
  }
  return (
    <span className="text-[11px] font-mono font-medium text-zinc-400 dark:text-zinc-500">
      ±0{unit}
    </span>
  );
}

// ─── Date Helper: "7 Nov 2026" ───────────────────────────────────────────────
function formatMetricDate(
  unlockDate: string | undefined,
  dayNumber: number,
  currentDayNumber?: number
): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  let targetDate: Date | null = null;

  if (unlockDate) {
    const parsed = new Date(unlockDate);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  if (!targetDate) {
    const baseDay = currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;
    const diffDays = dayNumber - baseDay;
    targetDate = new Date(Date.now() + diffDays * DAY_MS);
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(targetDate);
}

// ─── FiftyBarMeter (50 segments) ─────────────────────────────────────────────
function FiftyBarMeter({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filledBars = Math.round((safePercent / 100) * 50);
  return (
    <div
      className="flex items-center justify-between py-1"
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${safePercent}%`}
    >
      {Array.from({ length: 50 }, (_, i) => i + 1).map((bar) => (
        <div
          key={bar}
          className={`w-[1.5px] h-5 rounded-full transition-all ${
            bar <= filledBars
              ? "bg-zinc-950 dark:bg-white"
              : "bg-zinc-300 dark:bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── 1. Sleep Widget (Line Chart Interactive) ─────────────────────────────────
function SleepWidget({
  days,
  deltaPct = 0,
  currentDayNumber,
}: {
  days: PlanDay[];
  deltaPct?: number;
  currentDayNumber?: number;
}) {
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);

  const MAX_POINTS = 30;
  const sorted = [...days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(-MAX_POINTS);

  const sleepData = sorted.map((d) => ({
    day: d.dayNumber,
    mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
    unlockDate: d.unlockDate,
    bedtime: d.userProgress?.bedtime,
    wakeTime: d.userProgress?.wakeTime,
  }));

  const CEILING = 600; // 10h ceiling
  const TARGET = 450; // 7h 30m target

  const validSleeps = sleepData.filter((s) => s.mins > 0);
  const avgMins =
    validSleeps.length > 0
      ? Math.round(validSleeps.reduce((acc, s) => acc + s.mins, 0) / validSleeps.length)
      : 0;

  // Chart coordinates
  const svgW = 400;
  const svgH = 64;
  const padX = 10;
  const padY = 8;
  const usableW = svgW - padX * 2;
  const usableH = svgH - padY * 2;

  const points = sleepData.map((s, idx) => {
    const x =
      sleepData.length > 1
        ? padX + (idx / (sleepData.length - 1)) * usableW
        : svgW / 2;
    const clampedMins = Math.max(0, Math.min(CEILING, s.mins));
    const y = svgH - padY - (clampedMins / CEILING) * usableH;
    return {
      x,
      y,
      mins: s.mins,
      day: s.day,
      unlockDate: s.unlockDate,
      bedtime: s.bedtime,
      wakeTime: s.wakeTime,
    };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0
      ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${svgH - padY} L ${points[0].x.toFixed(1)} ${svgH - padY} Z`
      : "";

  const targetY = (svgH - padY - (TARGET / CEILING) * usableH).toFixed(1);

  const selectedPoint = points.find((pt) => pt.day === selectedDayNum) || null;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Sleep Average
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {avgMins > 0 ? (
            <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
              {formatSleepHours(avgMins)} avg
            </span>
          ) : (
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              —
            </span>
          )}
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* Body: Line Chart (No Day 1 / Day X labels) */}
      {validSleeps.length === 0 ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-4">
          No sleep data recorded yet
        </p>
      ) : (
        <div className="space-y-2.5 pt-1">
          <div className="w-full h-16">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sleepAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    className="text-zinc-900/15 dark:text-white/20"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Target Line (7h 30m) */}
              <line
                x1={padX}
                y1={targetY}
                x2={svgW - padX}
                y2={targetY}
                className="stroke-zinc-400/60 dark:stroke-white/20"
                strokeWidth="1"
                strokeDasharray="4 3"
              />

              {/* Area fill under curve */}
              {areaD && <path d={areaD} fill="url(#sleepAreaGrad)" />}

              {/* Main Line graph */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  className="stroke-zinc-900 dark:stroke-white transition-all duration-300"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Clickable Data points */}
              {points.map((pt) => {
                if (pt.mins === 0) return null;
                const isGood = pt.mins >= TARGET;
                const isSelected = selectedDayNum === pt.day;

                return (
                  <g
                    key={pt.day}
                    onClick={() =>
                      setSelectedDayNum((prev) => (prev === pt.day ? null : pt.day))
                    }
                    className="cursor-pointer"
                  >
                    {/* Touch target */}
                    <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />

                    {/* Outer ring if selected */}
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={6.5}
                        className="fill-none stroke-2 stroke-zinc-950 dark:stroke-white"
                      />
                    )}

                    {/* Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4 : isGood ? 3 : 2.5}
                      className={
                        isSelected
                          ? "fill-zinc-950 dark:fill-white"
                          : isGood
                          ? "fill-zinc-950 dark:fill-white"
                          : "fill-zinc-400 dark:fill-white/50"
                      }
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Simple 1-line detail on click: "7 Nov 2026 / 22.00 - 06.30 / 8h 30m" — click to dismiss */}
          {selectedPoint && (
            <button
              type="button"
              onClick={() => setSelectedDayNum(null)}
              title="Click to dismiss"
              className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3 py-2 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition"
            >
              {formatMetricDate(
                selectedPoint.unlockDate,
                selectedPoint.day,
                currentDayNumber
              )}{" "}
              / {(selectedPoint.bedtime || "22:00").replace(":", ".")} -{" "}
              {(selectedPoint.wakeTime || "06:30").replace(":", ".")} /{" "}
              {selectedPoint.mins > 0 ? formatSleepHours(selectedPoint.mins) : "0h"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. Training Widget (7-Column Heatmap with 5 Distinct Grey Variants) ──────
type TrainingStatus = "full" | "partial" | "rest" | "skipped" | "future";

function getTrainingDayStatus(
  d: PlanDay,
  currentDayNumber?: number
): TrainingStatus {
  const p = d.userProgress;
  const isCompleted = Boolean(p && p.isCompleted);
  const hasWorkout = Boolean(
    p &&
      (p.videoWatched ||
        (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
        (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
        checkedList(d, undefined).length > 0)
  );

  if (isCompleted) return "full";
  if (hasWorkout) return "partial";
  if (d.dayType === "REST_DAY") return "rest";

  const isFuture =
    Boolean(
      currentDayNumber &&
        currentDayNumber > 0 &&
        d.dayNumber > currentDayNumber
    ) ||
    (!d.isCalendarUnlocked && !d.isPast2359);
  if (isFuture) return "future";

  return "skipped";
}

function TrainingWidget({
  days,
  pct,
  currentDayNumber,
  deltaPct = 0,
}: {
  days: PlanDay[];
  pct: number;
  currentDayNumber?: number;
  deltaPct?: number;
}) {
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const selectedDay =
    sortedDays.find((d) => d.dayNumber === selectedDayNum) || null;

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  // 7 columns: Sun to Sat
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = sortedDays[0];
  const firstDate = firstDay?.unlockDate ? new Date(firstDay.unlockDate) : null;
  const startDayOfWeek =
    firstDate && !isNaN(firstDate.getTime()) ? firstDate.getDay() : 0;
  const totalSlots = Math.max(
    7,
    Math.ceil((startDayOfWeek + sortedDays.length) / 7) * 7
  );

  // Calculate "complete X from Y" for clicked day (e.g. "5/7")
  const getDayCompletionFraction = (d: PlanDay): string => {
    const acts =
      d.dayType === "REST_DAY"
        ? splitActivities(d.restInstructions)
        : movementNames(d);
    if (acts.length > 0) {
      const checks = checkedList(d, undefined);
      const done = d.userProgress?.isCompleted
        ? acts.length
        : acts.filter((name) =>
            checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))
          ).length;
      return `${done}/${acts.length}`;
    }

    // Fallback: completed days up to this day / total days in program (or 7-day week)
    const totalCount = sortedDays.length || 7;
    const completedUpToDay = sortedDays.filter((item) => {
      if (item.dayNumber > d.dayNumber) return false;
      const st = getTrainingDayStatus(item, currentDayNumber);
      return st === "full" || st === "partial" || st === "rest";
    }).length;
    return `${completedUpToDay}/${totalCount}`;
  };

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Training
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {pct}%
          </span>
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* 7-Column Grid (Sun to Sat) */}
      <div className="space-y-2 pt-1">
        {/* Column Headers: Sun Mon Tue Wed Thu Fri Sat */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono text-zinc-400 dark:text-zinc-500 text-center">
          {dayHeaders.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {/* 7-Column Boxes: 5 Distinct Grey Variants (None matching widget bg #ececea):
            1. More Light Grey (#fcfcfb) -> Future / Upcoming
            2. Light Grey (#d4d4d8)      -> Skipped
            3. Grey (#a1a1aa)            -> Rest Day
            4. Dark Grey (#52525b)       -> Partial Workout
            5. More Dark Grey (#18181b)  -> Full Workout
        */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: totalSlots }, (_, i) => {
            const dayIndex = i - startDayOfWeek;
            const d =
              dayIndex >= 0 && dayIndex < sortedDays.length
                ? sortedDays[dayIndex]
                : undefined;

            if (!d) {
              return (
                <div
                  key={`slot-${i}`}
                  className="aspect-square rounded-md sm:rounded-lg bg-transparent"
                />
              );
            }

            const status = getTrainingDayStatus(d, currentDayNumber);
            const isSelected = selectedDayNum === d.dayNumber;
            const isToday = d.dayNumber === todayDayNum;

            return (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() =>
                  setSelectedDayNum((prev) =>
                    prev === d.dayNumber ? null : d.dayNumber
                  )
                }
                aria-label={`Day ${d.dayNumber}`}
                className={`aspect-square rounded-md sm:rounded-lg flex items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? "ring-2 ring-zinc-950 dark:ring-white ring-offset-1 ring-offset-[#ececea] dark:ring-offset-zinc-900 "
                    : ""
                }${
                  isToday && !isSelected
                    ? "outline outline-1.5 outline-zinc-900/50 dark:outline-white/50 "
                    : ""
                }${
                  status === "full"
                    ? "bg-[#18181b] dark:bg-white text-white dark:text-zinc-950"
                    : status === "partial"
                    ? "bg-[#52525b] dark:bg-zinc-300 text-white dark:text-zinc-950"
                    : status === "rest"
                    ? "bg-[#a1a1aa] dark:bg-zinc-500"
                    : status === "skipped"
                    ? "bg-[#d4d4d8] dark:bg-zinc-700"
                    : "bg-[#fcfcfb] dark:bg-zinc-800/60"
                }`}
              />
            );
          })}
        </div>

        {/* Simple 1-line detail on click: "8 Nov 2026 / 5/7" — click to dismiss */}
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDayNum(null)}
            title="Click to dismiss"
            className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3 py-2 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition"
          >
            {formatMetricDate(
              selectedDay.unlockDate,
              selectedDay.dayNumber,
              currentDayNumber
            )}{" "}
            / {getDayCompletionFraction(selectedDay)}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 3. Meal Control Widget (Compliance + Calories, Carbs, Protein, Fat & Water) ─
interface ParsedDayNutrition {
  calories: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  waterMl: number;
  hasData: boolean;
}

function extractDayNutrition(d: PlanDay): ParsedDayNutrition {
  const raw = d.userProgress?.mealNotes;
  const mc = d.userProgress?.mealCompliance;

  let calories = 0;
  let carbsG = 0;
  let proteinG = 0;
  let fatG = 0;
  let waterMl = 0;
  let hasExplicit = false;

  if (raw && raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        calories?: number | null;
        carbsG?: number | null;
        proteinG?: number | null;
        fatG?: number | null;
        waterMl?: number | null;
      };
      if (typeof parsed.calories === "number" && parsed.calories > 0) {
        calories = parsed.calories;
        hasExplicit = true;
      }
      if (typeof parsed.carbsG === "number" && parsed.carbsG > 0) {
        carbsG = parsed.carbsG;
        hasExplicit = true;
      }
      if (typeof parsed.proteinG === "number" && parsed.proteinG > 0) {
        proteinG = parsed.proteinG;
        hasExplicit = true;
      }
      if (typeof parsed.fatG === "number" && parsed.fatG > 0) {
        fatG = parsed.fatG;
        hasExplicit = true;
      }
      if (typeof parsed.waterMl === "number" && parsed.waterMl > 0) {
        waterMl = parsed.waterMl;
        hasExplicit = true;
      }
    } catch {
      // ignore parse error
    }
  }

  if (hasExplicit) {
    if (calories === 0 && (carbsG > 0 || proteinG > 0 || fatG > 0)) {
      calories = Math.round(carbsG * 4 + proteinG * 4 + fatG * 9);
    }
    if (waterMl === 0 && (mc === "FULL" || mc === "SIMILAR" || mc === "PARTIAL")) {
      waterMl = 2000;
    }
    return { calories, carbsG, proteinG, fatG, waterMl, hasData: true };
  }

  // Fallback estimation when meal check-in was completed without manual macro numbers
  if (mc === "FULL" || mc === "YES") {
    return {
      calories: 1950,
      carbsG: 195,
      proteinG: 140,
      fatG: 65,
      waterMl: 2400,
      hasData: true,
    };
  }
  if (mc === "SIMILAR") {
    return {
      calories: 2050,
      carbsG: 215,
      proteinG: 130,
      fatG: 70,
      waterMl: 2100,
      hasData: true,
    };
  }
  if (mc === "PARTIAL") {
    return {
      calories: 2200,
      carbsG: 245,
      proteinG: 110,
      fatG: 78,
      waterMl: 1700,
      hasData: true,
    };
  }
  if (mc === "OFF_TRACK") {
    return {
      calories: 2480,
      carbsG: 290,
      proteinG: 95,
      fatG: 92,
      waterMl: 1400,
      hasData: true,
    };
  }

  return { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, waterMl: 0, hasData: false };
}

function MealControlWidget({
  days,
  pct,
  deltaPct = 0,
}: {
  days: PlanDay[];
  pct: number;
  deltaPct?: number;
}) {
  const nutritionDays = days.map(extractDayNutrition).filter((n) => n.hasData);
  const count = nutritionDays.length;

  const avgCalories =
    count > 0
      ? Math.round(nutritionDays.reduce((a, b) => a + b.calories, 0) / count)
      : 0;
  const avgCarbs =
    count > 0
      ? Math.round(nutritionDays.reduce((a, b) => a + b.carbsG, 0) / count)
      : 0;
  const avgProtein =
    count > 0
      ? Math.round(nutritionDays.reduce((a, b) => a + b.proteinG, 0) / count)
      : 0;
  const avgFat =
    count > 0
      ? Math.round(nutritionDays.reduce((a, b) => a + b.fatG, 0) / count)
      : 0;
  const avgWaterMl =
    count > 0
      ? Math.round(nutritionDays.reduce((a, b) => a + b.waterMl, 0) / count)
      : 0;

  const totalMacroG = avgCarbs + avgProtein + avgFat;
  const carbsPct = totalMacroG > 0 ? Math.round((avgCarbs / totalMacroG) * 100) : 45;
  const proteinPct = totalMacroG > 0 ? Math.round((avgProtein / totalMacroG) * 100) : 35;
  const fatPct = totalMacroG > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 20;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-4 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Meal Control
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {pct}%
          </span>
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* Body: 50-segment bar */}
      <div className="space-y-1.5 pt-0.5">
        <FiftyBarMeter percent={pct} />
      </div>

      {/* Calories & Water Row */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Calories
            </span>
            <span className="text-sm font-mono font-semibold text-zinc-950 dark:text-white">
              {avgCalories > 0 ? `${avgCalories.toLocaleString()} kcal` : "—"}
            </span>
          </div>
          <Flame className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
        </div>

        <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Water
            </span>
            <span className="text-sm font-mono font-semibold text-zinc-950 dark:text-white">
              {avgWaterMl > 0 ? `${(avgWaterMl / 1000).toFixed(1)} L` : "—"}
            </span>
          </div>
          <Droplets className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
        </div>
      </div>

      {/* Macros: Carbs, Protein, Fat */}
      <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/10 space-y-2.5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Carbs
            </span>
            <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-950 dark:text-white">
              {avgCarbs > 0 ? `${avgCarbs}g` : "—"}
            </span>
          </div>
          <div className="border-x border-zinc-200/70 dark:border-white/10">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Protein
            </span>
            <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-950 dark:text-white">
              {avgProtein > 0 ? `${avgProtein}g` : "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Fat
            </span>
            <span className="text-xs sm:text-sm font-mono font-semibold text-zinc-950 dark:text-white">
              {avgFat > 0 ? `${avgFat}g` : "—"}
            </span>
          </div>
        </div>

        {/* Monochrome 3-tone macro distribution bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-200 dark:bg-white/10">
          <div
            style={{ width: `${carbsPct}%` }}
            className="h-full bg-[#71717a] dark:bg-zinc-400 transition-all"
            title={`Carbs ${carbsPct}%`}
          />
          <div
            style={{ width: `${proteinPct}%` }}
            className="h-full bg-[#18181b] dark:bg-white transition-all"
            title={`Protein ${proteinPct}%`}
          />
          <div
            style={{ width: `${fatPct}%` }}
            className="h-full bg-[#d4d4d8] dark:bg-zinc-600 transition-all"
            title={`Fat ${fatPct}%`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 4. Body Weight Widget (Interactive Line Chart + Quick Log) ──────────────
interface WeightEntry {
  dateStr: string;
  weightKg: number;
}

function WeightWidget({
  days,
  bodyMetricLogs = [],
  programId,
  currentDayNumber,
}: {
  days: PlanDay[];
  bodyMetricLogs?: BodyMetricPoint[];
  programId?: string;
  currentDayNumber?: number;
}) {
  const storageKey = `zera_weight_logs_v1:${programId || "default"}`;
  const [localEntries, setLocalEntries] = useState<WeightEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showLogInput, setShowLogInput] = useState(false);
  const [inputWeight, setInputWeight] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLocalEntries(
            parsed.filter(
              (x): x is WeightEntry =>
                x &&
                typeof x.dateStr === "string" &&
                typeof x.weightKg === "number" &&
                x.weightKg > 20 &&
                x.weightKg < 300
            )
          );
        }
      }
    } catch {
      // ignore storage error
    }
  }, [storageKey]);

  // Combine server bodyMetricLogs + customTask measurement submissions + localEntries
  const serverEntries: WeightEntry[] = [];

  for (const log of bodyMetricLogs) {
    if (typeof log.weightKg === "number" && log.weightKg > 0) {
      if (!programId || !log.programId || log.programId === programId) {
        serverEntries.push({
          dateStr: formatMetricDate(log.recordedAt, 1, currentDayNumber),
          weightKg: Number(log.weightKg.toFixed(1)),
        });
      }
    }
  }

  for (const d of days) {
    for (const ct of d.customTasks || []) {
      const vals = ct.submission?.values;
      if (vals && typeof vals === "object") {
        const rawW = (vals as Record<string, unknown>).weightKg ?? (vals as Record<string, unknown>).weight;
        const numW = Number(rawW);
        if (Number.isFinite(numW) && numW > 20 && numW < 300) {
          serverEntries.push({
            dateStr: formatMetricDate(d.unlockDate, d.dayNumber, currentDayNumber),
            weightKg: Number(numW.toFixed(1)),
          });
        }
      }
    }
  }

  // Merge and deduplicate by dateStr
  const mergedMap = new Map<string, number>();
  for (const e of [...serverEntries, ...localEntries]) {
    mergedMap.set(e.dateStr, e.weightKg);
  }
  const weightSeries: WeightEntry[] = Array.from(mergedMap.entries()).map(
    ([dateStr, weightKg]) => ({ dateStr, weightKg })
  );

  const latestWeight =
    weightSeries.length > 0 ? weightSeries[weightSeries.length - 1].weightKg : 0;
  const prevWeight =
    weightSeries.length >= 2
      ? weightSeries[weightSeries.length - 2].weightKg
      : latestWeight;
  const weightDeltaKg =
    weightSeries.length >= 2
      ? Number((latestWeight - prevWeight).toFixed(1))
      : 0;

  const handleSaveLocalWeight = () => {
    const val = Number(inputWeight);
    if (!Number.isFinite(val) || val < 20 || val > 300) return;
    const todayLabel = formatMetricDate(
      undefined,
      currentDayNumber || 1,
      currentDayNumber
    );
    const nextEntry: WeightEntry = {
      dateStr: todayLabel,
      weightKg: Number(val.toFixed(1)),
    };
    const updated = [
      ...localEntries.filter((e) => e.dateStr !== todayLabel),
      nextEntry,
    ];
    setLocalEntries(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
    setInputWeight("");
    setShowLogInput(false);
  };

  // Chart coordinates
  const svgW = 400;
  const svgH = 64;
  const padX = 10;
  const padY = 8;
  const usableW = svgW - padX * 2;
  const usableH = svgH - padY * 2;

  const weights = weightSeries.map((w) => w.weightKg);
  const minW = weights.length > 0 ? Math.min(...weights) - 1 : 50;
  const maxW = weights.length > 0 ? Math.max(...weights) + 1 : 80;
  const spanW = Math.max(1, maxW - minW);

  const points = weightSeries.map((w, idx) => {
    const x =
      weightSeries.length > 1
        ? padX + (idx / (weightSeries.length - 1)) * usableW
        : svgW / 2;
    const y = svgH - padY - ((w.weightKg - minW) / spanW) * usableH;
    return {
      x,
      y,
      idx,
      dateStr: w.dateStr,
      weightKg: w.weightKg,
    };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0
      ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${svgH - padY} L ${points[0].x.toFixed(1)} ${svgH - padY} Z`
      : "";

  const selectedPoint =
    selectedIdx !== null
      ? points.find((pt) => pt.idx === selectedIdx) || null
      : null;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Body Weight
          </span>
        </div>
        <div className="flex items-center gap-2">
          {latestWeight > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
                {latestWeight.toFixed(1)} kg
              </span>
              <MetricDeltaBadge delta={weightDeltaKg} unit="kg" />
            </div>
          ) : (
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              —
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowLogInput((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 dark:bg-white/10 border border-zinc-300/70 dark:border-white/15 text-[10px] font-mono font-medium text-zinc-800 dark:text-zinc-200 hover:bg-white transition cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" />
            Log
          </button>
        </div>
      </div>

      {/* Inline Quick Log Weight */}
      {showLogInput && (
        <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="300"
            placeholder="Weight in kg (e.g. 68.0)"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSaveLocalWeight();
              }
            }}
            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-xs font-mono text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white"
          />
          <button
            type="button"
            onClick={handleSaveLocalWeight}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-xs font-mono font-semibold hover:opacity-90 transition cursor-pointer"
          >
            Save
          </button>
        </div>
      )}

      {/* Body: Line Chart */}
      {weightSeries.length === 0 ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-4">
          No weight logged yet — tap Log to record today&apos;s weight
        </p>
      ) : (
        <div className="space-y-2.5 pt-1">
          <div className="w-full h-16">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${svgW} ${svgH}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    className="text-zinc-900/15 dark:text-white/20"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {areaD && <path d={areaD} fill="url(#weightAreaGrad)" />}

              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  className="stroke-zinc-900 dark:stroke-white transition-all duration-300"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {points.map((pt) => {
                const isSelected = selectedIdx === pt.idx;
                return (
                  <g
                    key={pt.idx}
                    onClick={() =>
                      setSelectedIdx((prev) => (prev === pt.idx ? null : pt.idx))
                    }
                    className="cursor-pointer"
                  >
                    <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
                    {isSelected && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={6.5}
                        className="fill-none stroke-2 stroke-zinc-950 dark:stroke-white"
                      />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4 : 3}
                      className="fill-zinc-950 dark:fill-white"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Simple 1-line detail on click: "8 Nov 2026 / 68.0 kg" — click to dismiss */}
          {selectedPoint && (
            <button
              type="button"
              onClick={() => setSelectedIdx(null)}
              title="Click to dismiss"
              className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3 py-2 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition"
            >
              {selectedPoint.dateStr} / {selectedPoint.weightKg.toFixed(1)} kg
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CohortPerformanceCard({
  days,
  currentDayNumber,
  bodyMetricLogs = [],
  programId,
  onSwitchWidget: _onSwitchWidget,
}: {
  days: PlanDay[];
  currentDayNumber: number;
  bodyMetricLogs?: BodyMetricPoint[];
  programId?: string;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _onSwitchWidget;
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  // ── 1. Sleep Stats & Step-Change Delta from Previous Average ────────────────
  const validSleeps = sorted
    .map((d) => ({
      dayNumber: d.dayNumber,
      mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
    }))
    .filter((s) => s.mins > 0);

  let sleepDelta = 0;
  if (validSleeps.length >= 2) {
    const currentAvg =
      validSleeps.reduce((acc, s) => acc + s.mins, 0) / validSleeps.length;
    const prevSlice = validSleeps.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, s) => acc + s.mins, 0) / prevSlice.length;
    if (prevAvg > 0) {
      sleepDelta = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
      if (sleepDelta === 0 && currentAvg !== prevAvg) {
        sleepDelta = currentAvg > prevAvg ? 1 : -1;
      }
    }
  } else if (validSleeps.length === 1) {
    sleepDelta = Math.round(((validSleeps[0].mins - 450) / 450) * 100);
  }

  // ── 2. Training Stats & Step-Change Delta from Previous Score ───────────────
  const trainingDays = sorted.filter((d) => d.dayType === "TRAINING_DAY");
  const trainingTotal = trainingDays.length;

  const isTrainingDayMissed = (d: PlanDay) => {
    const p = d.userProgress;
    const isCompleted = Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
    const explicitlySkipped = Boolean(
      p && (p.selectedWorkout === "SKIPPED" || p.workoutNotes === "SKIPPED")
    );
    return explicitlySkipped || (d.isPast2359 && !isCompleted);
  };

  const isTrainingDayDone = (d: PlanDay) => {
    const p = d.userProgress;
    return Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
  };

  const trainingMissed = trainingDays.filter(isTrainingDayMissed).length;
  const trainingPct =
    trainingTotal > 0
      ? Math.max(0, Math.round(((trainingTotal - trainingMissed) / trainingTotal) * 100))
      : 100;

  // Calculate delta strictly as change from the previous evaluated training day
  let trainingDelta = 0;
  if (trainingTotal > 0) {
    const evaluatedTrainingDays = trainingDays.filter(
      (d) =>
        d.dayNumber <= todayDayNum &&
        (isTrainingDayDone(d) || isTrainingDayMissed(d))
    );
    if (evaluatedTrainingDays.length > 0) {
      const latestTrainDay =
        evaluatedTrainingDays[evaluatedTrainingDays.length - 1];
      const oneDayWeight = Math.max(1, Math.round(100 / trainingTotal));

      if (isTrainingDayMissed(latestTrainDay)) {
        const prevMissed = Math.max(0, trainingMissed - 1);
        const prevPct = Math.max(
          0,
          Math.round(((trainingTotal - prevMissed) / trainingTotal) * 100)
        );
        trainingDelta = trainingPct - prevPct || -oneDayWeight;
      } else if (isTrainingDayDone(latestTrainDay)) {
        const isFull = Boolean(latestTrainDay.userProgress?.isCompleted);
        trainingDelta = isFull
          ? oneDayWeight
          : Math.max(1, Math.round(oneDayWeight / 2));
      }
    }
  }

  // ── 3. Meal Stats & Step-Change Delta from Previous Score ───────────────────
  const mealTotal = sorted.length;
  const getDayMealPenalty = (d: PlanDay): number => {
    const mc = d.userProgress?.mealCompliance;
    if (mc === "SKIPPED" || mc === "OFF_TRACK") return 1;
    if (mc === "PARTIAL") return 0.5;
    if (mc === "FULL" || mc === "YES" || mc === "SIMILAR") return 0;
    return d.isPast2359 ? 1 : 0;
  };

  const mealPenalty = sorted.reduce((acc, d) => acc + getDayMealPenalty(d), 0);
  const mealPct =
    mealTotal > 0
      ? Math.max(0, Math.round(((mealTotal - mealPenalty) / mealTotal) * 100))
      : 100;

  let mealDelta = 0;
  if (mealTotal > 0) {
    const evaluatedMealDays = sorted.filter(
      (d) =>
        d.dayNumber <= todayDayNum &&
        (Boolean(d.userProgress?.mealCompliance) || d.isPast2359)
    );
    if (evaluatedMealDays.length > 0) {
      const latestMealDay = evaluatedMealDays[evaluatedMealDays.length - 1];
      const latestPenalty = getDayMealPenalty(latestMealDay);
      const oneMealDayWeight = Math.max(1, Math.round(100 / mealTotal));

      if (latestPenalty > 0) {
        const prevPenalty = Math.max(0, mealPenalty - latestPenalty);
        const prevMealPct = Math.max(
          0,
          Math.round(((mealTotal - prevPenalty) / mealTotal) * 100)
        );
        mealDelta = mealPct - prevMealPct || -Math.max(1, Math.round(oneMealDayWeight * latestPenalty));
      } else {
        mealDelta = oneMealDayWeight;
      }
    }
  }

  return (
    <section className="w-full space-y-4">
      {/* 1. Sleep Average (Interactive Line Chart) */}
      <SleepWidget
        days={sorted}
        deltaPct={sleepDelta}
        currentDayNumber={currentDayNumber}
      />

      {/* 2. Training (7-Column Heatmap Grid - 5 Monochrome Grey Variants) */}
      <TrainingWidget
        days={sorted}
        pct={trainingPct}
        currentDayNumber={currentDayNumber}
        deltaPct={trainingDelta}
      />

      {/* 3. Meal Control (50-Segment Bar + Calories, Macros & Water) */}
      <MealControlWidget
        days={sorted}
        pct={mealPct}
        deltaPct={mealDelta}
      />

      {/* 4. Body Weight (Interactive Line Chart + Quick Log) */}
      <WeightWidget
        days={sorted}
        bodyMetricLogs={bodyMetricLogs}
        programId={programId}
        currentDayNumber={currentDayNumber}
      />
    </section>
  );
}
