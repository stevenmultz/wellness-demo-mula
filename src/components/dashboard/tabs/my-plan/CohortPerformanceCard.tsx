"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Dumbbell, Moon, Scale, Utensils } from "lucide-react";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  movementNames,
  splitActivities,
  type PlanDay,
} from "./myPlanUtils";

// ─── MetricDeltaBadge (Up = Emerald Border Box, Down = Ruby Border Box, Monochrome Text) ─
function MetricDeltaBadge({
  delta,
  unit = "%",
}: {
  delta: number;
  unit?: string;
}) {
  const absVal = Math.abs(delta);
  const label = `${absVal}${unit}`;

  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[#2A7B60] bg-[#EBF3F0]/80 dark:border-[#4D9E7B] dark:bg-[#1F6E54]/20 text-[10px] font-mono font-semibold text-zinc-950 dark:text-zinc-100 leading-none">
        <ArrowUp className="w-2.5 h-2.5 stroke-[2.25] shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[#B03244] bg-[#F7ECEE]/80 dark:border-[#C95B6B] dark:bg-[#9E2A3A]/20 text-[10px] font-mono font-semibold text-zinc-950 dark:text-zinc-100 leading-none">
        <ArrowDown className="w-2.5 h-2.5 stroke-[2.25] shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-zinc-300 dark:border-white/15 bg-white/50 dark:bg-white/[0.02] text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 leading-none">
      <span>0{unit}</span>
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

// ─── 1. Body Weight Widget (Side-by-Side Left Card, Editorial Urbanist + Weekly Change) ─
interface DatedWeightPoint {
  dayIndex: number;
  weightKg: number;
}

function WeightSummaryWidget({
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
  const [localByDay, setLocalByDay] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadLocal = () => {
      try {
        const saved = localStorage.getItem("zera_weight_by_day_v1");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            setLocalByDay(parsed);
          }
        }
      } catch {
        // ignore storage error
      }
    };
    loadLocal();
    window.addEventListener("zera:weight-updated", loadLocal);
    return () => window.removeEventListener("zera:weight-updated", loadLocal);
  }, []);

  const points: DatedWeightPoint[] = [];

  bodyMetricLogs.forEach((log, idx) => {
    if (typeof log.weightKg === "number" && log.weightKg > 20 && log.weightKg < 300) {
      if (!programId || !log.programId || log.programId === programId) {
        const matchedDay = days.find((d) => d.id === log.programDayId);
        points.push({
          dayIndex: matchedDay ? matchedDay.dayNumber : idx + 1,
          weightKg: Number(log.weightKg.toFixed(1)),
        });
      }
    }
  });

  for (const d of days) {
    for (const ct of d.customTasks || []) {
      const vals = ct.submission?.values;
      if (vals && typeof vals === "object") {
        const rawW =
          (vals as Record<string, unknown>).weightKg ??
          (vals as Record<string, unknown>).weight;
        const numW = Number(rawW);
        if (Number.isFinite(numW) && numW > 20 && numW < 300) {
          points.push({
            dayIndex: d.dayNumber,
            weightKg: Number(numW.toFixed(1)),
          });
        }
      }
    }
    if (typeof localByDay[d.id] === "number" && localByDay[d.id] > 20) {
      points.push({
        dayIndex: d.dayNumber,
        weightKg: Number(localByDay[d.id].toFixed(1)),
      });
    }
  }

  const byDayMap = new Map<number, number>();
  for (const pt of points) {
    byDayMap.set(pt.dayIndex, pt.weightKg);
  }
  const sortedPoints: DatedWeightPoint[] = Array.from(byDayMap.entries())
    .map(([dayIndex, weightKg]) => ({ dayIndex, weightKg }))
    .sort((a, b) => a.dayIndex - b.dayIndex);

  const latestPoint =
    sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;
  const latestWeight = latestPoint ? latestPoint.weightKg : 0;

  let weeklyDeltaKg = 0;
  if (latestPoint && sortedPoints.length >= 2) {
    const targetDayIndex = (currentDayNumber || latestPoint.dayIndex) - 7;
    let referencePoint = sortedPoints[0];
    for (const pt of sortedPoints.slice(0, -1)) {
      if (pt.dayIndex <= targetDayIndex) {
        referencePoint = pt;
      }
    }
    weeklyDeltaKg = Number((latestWeight - referencePoint.weightKg).toFixed(1));
  }

  return (
    <div className="h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Scale className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate">
            Weight
          </span>
        </div>
        <MetricDeltaBadge delta={weeklyDeltaKg} unit=" kg" />
      </div>

      <div className="space-y-1 my-auto py-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
            {latestWeight > 0 ? latestWeight.toFixed(1) : "—"}
          </span>
          {latestWeight > 0 && (
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              kg
            </span>
          )}
        </div>
        <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Per week change
        </span>
      </div>
    </div>
  );
}

// ─── 2. Training Widget (Side-by-Side Right Card, 7-Column 5-Grey Heatmap) ───
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

  // Compact 7 columns: S M T W T F S on mobile, Sun..Sat on sm+
  const dayHeaders = [
    { short: "S", full: "Sun" },
    { short: "M", full: "Mon" },
    { short: "T", full: "Tue" },
    { short: "W", full: "Wed" },
    { short: "T", full: "Thu" },
    { short: "F", full: "Fri" },
    { short: "S", full: "Sat" },
  ];
  const firstDay = sortedDays[0];
  const firstDate = firstDay?.unlockDate ? new Date(firstDay.unlockDate) : null;
  const startDayOfWeek =
    firstDate && !isNaN(firstDate.getTime()) ? firstDate.getDay() : 0;
  const totalSlots = Math.max(
    7,
    Math.ceil((startDayOfWeek + sortedDays.length) / 7) * 7
  );

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

    const totalCount = sortedDays.length || 7;
    const completedUpToDay = sortedDays.filter((item) => {
      if (item.dayNumber > d.dayNumber) return false;
      const st = getTrainingDayStatus(item, currentDayNumber);
      return st === "full" || st === "partial" || st === "rest";
    }).length;
    return `${completedUpToDay}/${totalCount}`;
  };

  return (
    <div className="h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 flex flex-col justify-between gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Dumbbell className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate">
            Training
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] sm:text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {pct}%
          </span>
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* 7-Column Grid (Sun to Sat) */}
      <div className="space-y-1.5 my-auto">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-mono text-zinc-400 dark:text-zinc-500 text-center">
          {dayHeaders.map((day, idx) => (
            <span key={idx}>
              <span className="sm:hidden">{day.short}</span>
              <span className="hidden sm:inline">{day.full}</span>
            </span>
          ))}
        </div>

        {/* 5 Distinct Grey Variants (None matching widget bg #ececea):
            1. More Light Grey (#fcfcfb) -> Future / Upcoming
            2. Light Grey (#d4d4d8)      -> Skipped
            3. Grey (#a1a1aa)            -> Rest Day
            4. Dark Grey (#52525b)       -> Partial Workout
            5. More Dark Grey (#18181b)  -> Full Workout
        */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
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
                  className="aspect-square rounded-[4px] sm:rounded-md bg-transparent"
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
                className={`aspect-square rounded-[4px] sm:rounded-md flex items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? "ring-1.5 ring-zinc-950 dark:ring-white ring-offset-1 ring-offset-[#ececea] dark:ring-offset-zinc-900 "
                    : ""
                }${
                  isToday && !isSelected
                    ? "outline outline-1 outline-zinc-900/50 dark:outline-white/50 "
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

        {/* Clean separated detail bar on click — click to dismiss */}
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDayNum(null)}
            title="Click to dismiss"
            className="w-full rounded-lg bg-white/90 dark:bg-white/[0.08] px-2.5 py-1.5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-1.5 text-[10px] font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition mt-1"
          >
            <span className="font-medium text-zinc-600 dark:text-zinc-300 truncate">
              {formatMetricDate(
                selectedDay.unlockDate,
                selectedDay.dayNumber,
                currentDayNumber
              )}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white shrink-0">
              {getDayCompletionFraction(selectedDay)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 3. Sleep Widget (Line Chart Interactive, Delta in Minutes) ──────────────
function SleepWidget({
  days,
  deltaMins = 0,
  currentDayNumber,
}: {
  days: PlanDay[];
  deltaMins?: number;
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
        <div className="flex items-center gap-2">
          {avgMins > 0 ? (
            <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
              {formatSleepHours(avgMins)} avg
            </span>
          ) : (
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              —
            </span>
          )}
          <MetricDeltaBadge delta={deltaMins} unit=" min" />
        </div>
      </div>

      {/* Body: Line Chart */}
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

              <line
                x1={padX}
                y1={targetY}
                x2={svgW - padX}
                y2={targetY}
                className="stroke-zinc-400/60 dark:stroke-white/20"
                strokeWidth="1"
                strokeDasharray="4 3"
              />

              {areaD && <path d={areaD} fill="url(#sleepAreaGrad)" />}

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

          {/* Clean separated detail bar on click — click to dismiss */}
          {selectedPoint && (
            <button
              type="button"
              onClick={() => setSelectedDayNum(null)}
              title="Click to dismiss"
              className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3.5 py-2.5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition"
            >
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {formatMetricDate(
                  selectedPoint.unlockDate,
                  selectedPoint.day,
                  currentDayNumber
                )}
              </span>
              <span className="h-3.5 w-px bg-zinc-200 dark:bg-white/15 shrink-0" />
              <span className="text-zinc-900 dark:text-white">
                {selectedPoint.bedtime || "22:00"} – {selectedPoint.wakeTime || "06:30"}
              </span>
              <span className="h-3.5 w-px bg-zinc-200 dark:bg-white/15 shrink-0" />
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white">
                {selectedPoint.mins > 0 ? formatSleepHours(selectedPoint.mins) : "0h"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 4. Meal Control Widget (Editorial Urbanist Calories/Water + Circular Macro Chart) ─
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
  currentDayNumber,
}: {
  days: PlanDay[];
  pct: number;
  deltaPct?: number;
  currentDayNumber?: number;
}) {
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;
  const todayDay = days.find((d) => d.dayNumber === todayDayNum);
  const todayNutr = todayDay ? extractDayNutrition(todayDay) : null;

  const nutritionDays = days.map(extractDayNutrition).filter((n) => n.hasData);
  const activeNutr =
    todayNutr && todayNutr.hasData
      ? todayNutr
      : nutritionDays.length > 0
      ? nutritionDays[nutritionDays.length - 1]
      : { calories: 0, carbsG: 0, proteinG: 0, fatG: 0, waterMl: 0, hasData: false };

  const calories = activeNutr.calories;
  const carbsG = activeNutr.carbsG;
  const proteinG = activeNutr.proteinG;
  const fatG = activeNutr.fatG;
  const waterMl = activeNutr.waterMl;

  const totalMacroG = carbsG + proteinG + fatG;
  const carbsPct = totalMacroG > 0 ? Math.round((carbsG / totalMacroG) * 100) : 45;
  const proteinPct = totalMacroG > 0 ? Math.round((proteinG / totalMacroG) * 100) : 35;
  const fatPct = totalMacroG > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 20;

  // Circular Donut Chart geometry
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const carbsLen = (carbsPct / 100) * circumference;
  const proteinLen = (proteinPct / 100) * circumference;
  const fatLen = (fatPct / 100) * circumference;

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
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {pct}%
          </span>
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* 50-segment bar */}
      <div className="pt-0.5">
        <FiftyBarMeter percent={pct} />
      </div>

      {/* Editorial Urbanist Calories & Water — Directly inside card without sub-boxes or icons */}
      <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-zinc-300/60 dark:border-white/10">
        <div className="space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Calories
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
              {calories > 0 ? calories.toLocaleString() : "—"}
            </span>
            {calories > 0 && (
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                kcal
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Water
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
              {waterMl > 0 ? (waterMl / 1000).toFixed(1) : "—"}
            </span>
            {waterMl > 0 && (
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                L
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Circular Diagram (Donut Chart) for Carbs, Protein, Fat — No nested box */}
      <div className="flex items-center gap-5 pt-3.5 border-t border-zinc-300/60 dark:border-white/10">
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg
            viewBox="0 0 88 88"
            className="w-20 h-20 -rotate-90 overflow-visible"
            role="img"
            aria-label={`Carbs ${carbsPct}%, Protein ${proteinPct}%, Fat ${fatPct}%`}
          >
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              strokeWidth="10"
              className="stroke-zinc-300/50 dark:stroke-white/10"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="#71717a"
              strokeWidth="10"
              strokeDasharray={`${carbsLen} ${circumference}`}
              strokeDashoffset={0}
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="#18181b"
              strokeWidth="10"
              strokeDasharray={`${proteinLen} ${circumference}`}
              strokeDashoffset={-carbsLen}
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              fill="none"
              stroke="#b4b4bb"
              strokeWidth="10"
              strokeDasharray={`${fatLen} ${circumference}`}
              strokeDashoffset={-(carbsLen + proteinLen)}
            />
          </svg>
        </div>

        {/* Macro Percentages & Grams Legend */}
        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#71717a] shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                Carbs
              </span>
            </div>
            <div className="font-mono">
              <span className="font-semibold text-zinc-950 dark:text-white">
                {carbsPct}%
              </span>
              {carbsG > 0 && (
                <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                  ({carbsG}g)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18181b] dark:bg-white shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                Protein
              </span>
            </div>
            <div className="font-mono">
              <span className="font-semibold text-zinc-950 dark:text-white">
                {proteinPct}%
              </span>
              {proteinG > 0 && (
                <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                  ({proteinG}g)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b4b4bb] shrink-0" />
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                Fat
              </span>
            </div>
            <div className="font-mono">
              <span className="font-semibold text-zinc-950 dark:text-white">
                {fatPct}%
              </span>
              {fatG > 0 && (
                <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                  ({fatG}g)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
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

  // ── 1. Sleep Stats & Delta in Minutes from Previous Average ─────────────────
  const validSleeps = sorted
    .map((d) => ({
      dayNumber: d.dayNumber,
      mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
    }))
    .filter((s) => s.mins > 0);

  let sleepDeltaMins = 0;
  if (validSleeps.length >= 2) {
    const latestMins = validSleeps[validSleeps.length - 1].mins;
    const prevSlice = validSleeps.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, s) => acc + s.mins, 0) / prevSlice.length;
    sleepDeltaMins = Math.round(latestMins - prevAvg);
  } else if (validSleeps.length === 1) {
    sleepDeltaMins = Math.round(validSleeps[0].mins - 450);
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
        mealDelta =
          mealPct - prevMealPct ||
          -Math.max(1, Math.round(oneMealDayWeight * latestPenalty));
      } else {
        mealDelta = oneMealDayWeight;
      }
    }
  }

  return (
    <section className="w-full space-y-4">
      {/* 1. First Row: Weight & Training Side-by-Side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
        <WeightSummaryWidget
          days={sorted}
          bodyMetricLogs={bodyMetricLogs}
          programId={programId}
          currentDayNumber={currentDayNumber}
        />

        <TrainingWidget
          days={sorted}
          pct={trainingPct}
          currentDayNumber={currentDayNumber}
          deltaPct={trainingDelta}
        />
      </div>

      {/* 2. Sleep Average (Interactive Line Chart + Delta in Minutes) */}
      <SleepWidget
        days={sorted}
        deltaMins={sleepDeltaMins}
        currentDayNumber={currentDayNumber}
      />

      {/* 3. Meal Control (50-Segment Bar + Editorial Calories/Water & Circular Macro Chart) */}
      <MealControlWidget
        days={sorted}
        pct={mealPct}
        deltaPct={mealDelta}
        currentDayNumber={currentDayNumber}
      />
    </section>
  );
}
