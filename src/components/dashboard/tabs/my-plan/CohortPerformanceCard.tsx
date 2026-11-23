"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Dumbbell, Moon, Scale, Target, Utensils } from "lucide-react";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  movementNames,
  splitActivities,
  type PlanDay,
} from "./myPlanUtils";

// ─── MetricDeltaBadge (Up = Emerald Border Box + White Text, Down = Ruby Border Box + White Text) ─
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
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[#2A7B60] bg-[#1F6E54] dark:border-[#4D9E7B] dark:bg-[#1F6E54] text-[10px] font-mono font-semibold text-white leading-none">
        <ArrowUp className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-[#B03244] bg-[#9E2A3A] dark:border-[#C95B6B] dark:bg-[#9E2A3A] text-[10px] font-mono font-semibold text-white leading-none">
        <ArrowDown className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-zinc-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 leading-none">
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

  const byDayMap = new Map<number, number>();

  bodyMetricLogs.forEach((log, idx) => {
    if (typeof log.weightKg === "number" && log.weightKg > 20 && log.weightKg < 300) {
      if (!programId || !log.programId || log.programId === programId) {
        const matchedDay = days.find((d) => d.id === log.programDayId);
        const dayIndex = matchedDay ? matchedDay.dayNumber : -(bodyMetricLogs.length - idx);
        byDayMap.set(dayIndex, Number(log.weightKg.toFixed(1)));
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
          byDayMap.set(d.dayNumber, Number(numW.toFixed(1)));
        }
      }
    }
    if (typeof localByDay[d.id] === "number" && localByDay[d.id] > 20) {
      byDayMap.set(d.dayNumber, Number(localByDay[d.id].toFixed(1)));
    }
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
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-zinc-200/50 dark:border-white/5">
      <div className="flex items-center gap-2 min-w-0">
        <Scale className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
          Weight
        </span>
      </div>

      <div className="space-y-2 pt-0.5">
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

        <div className="flex flex-wrap items-center gap-1.5">
          <MetricDeltaBadge delta={weeklyDeltaKg} unit=" kg" />
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-none">
            this week
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Program Commitment Widget (Side-by-Side Right Card, Overall Holistic Score) ─
function ProgramCommitmentWidget({
  pct,
  deltaPct = 0,
}: {
  pct: number;
  deltaPct?: number;
}) {
  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-zinc-200/50 dark:border-white/5">
      <div className="flex items-center gap-2 min-w-0" title="Program Commitment">
        <Target className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
        <span className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
          <span className="hidden sm:inline">Program </span>Commitment
        </span>
      </div>

      <div className="space-y-2 pt-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
            {pct}
          </span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            %
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <MetricDeltaBadge delta={deltaPct} unit="%" />
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 leading-none">
            vs yesterday
          </span>
        </div>
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
  const isFuture =
    Boolean(
      currentDayNumber &&
        currentDayNumber > 0 &&
        d.dayNumber > currentDayNumber
    ) ||
    (!d.isCalendarUnlocked && !d.isPast2359);

  if (d.dayType !== "TRAINING_DAY") {
    return isFuture ? "future" : "rest";
  }

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
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Training
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {pct}%
          </span>
          <MetricDeltaBadge delta={deltaPct} />
        </div>
      </div>

      {/* 7-Column Grid (Sun to Sat) */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono text-zinc-400 dark:text-zinc-500 text-center">
          {dayHeaders.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {/* 5 Distinct Grey Variants (None matching widget bg #ececea):
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
            className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3.5 py-2.5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition mt-1"
          >
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              {formatMetricDate(
                selectedDay.unlockDate,
                selectedDay.dayNumber,
                currentDayNumber
              )}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white">
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
  const carbsPct = totalMacroG > 0 ? Math.round((carbsG / totalMacroG) * 100) : 0;
  const proteinPct = totalMacroG > 0 ? Math.round((proteinG / totalMacroG) * 100) : 0;
  const fatPct = totalMacroG > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 0;

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
    .filter((d) => d.dayNumber <= todayDayNum)
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
  }

  // ── 2. Training Stats (Option A: Elapsed TRAINING_DAYs only; Rest & Connect excluded) ──
  const isTrainingDayDone = (d: PlanDay) => {
    const p = d.userProgress;
    if (!p) return false;
    if (p.selectedWorkout === "SKIPPED" || p.workoutNotes === "SKIPPED") {
      return false;
    }
    return Boolean(
      p.isCompleted ||
        p.videoWatched ||
        (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
        (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
        checkedList(d, undefined).length > 0
    );
  };

  const elapsedTrainingDays = sorted.filter(
    (d) => d.dayType === "TRAINING_DAY" && d.dayNumber <= todayDayNum
  );
  const completedElapsedTrainingCount =
    elapsedTrainingDays.filter(isTrainingDayDone).length;
  const trainingPct =
    elapsedTrainingDays.length > 0
      ? Math.round(
          (completedElapsedTrainingCount / elapsedTrainingDays.length) * 100
        )
      : 0;

  let trainingDelta = 0;
  if (elapsedTrainingDays.length >= 2) {
    const prevSlice = elapsedTrainingDays.slice(0, -1);
    const prevDone = prevSlice.filter(isTrainingDayDone).length;
    const prevPct = Math.round((prevDone / prevSlice.length) * 100);
    trainingDelta = trainingPct - prevPct;
  }

  // ── 3. Meal Stats (Option A: Elapsed Days up to todayDayNum) ────────────────
  const getDayMealScore = (d: PlanDay): number => {
    const mc = d.userProgress?.mealCompliance;
    if (mc === "FULL" || mc === "YES" || mc === "SIMILAR") return 1;
    if (mc === "PARTIAL") return 0.5;
    return 0;
  };

  const elapsedMealDays = sorted.filter((d) => d.dayNumber <= todayDayNum);
  const earnedMealScore = elapsedMealDays.reduce(
    (acc, d) => acc + getDayMealScore(d),
    0
  );
  const mealPct =
    elapsedMealDays.length > 0
      ? Math.round((earnedMealScore / elapsedMealDays.length) * 100)
      : 0;

  let mealDelta = 0;
  if (elapsedMealDays.length >= 2) {
    const prevMealSlice = elapsedMealDays.slice(0, -1);
    const prevMealEarned = prevMealSlice.reduce(
      (acc, d) => acc + getDayMealScore(d),
      0
    );
    const prevMealPct = Math.round(
      (prevMealEarned / prevMealSlice.length) * 100
    );
    mealDelta = mealPct - prevMealPct;
  }

  // ── 4. Program Commitment (Option A: Elapsed Days up to todayDayNum) ──────
  // Holistic composite: Training, Nutrition/Meal, Sleep Target, and Daily Tasks/Reflection
  const computeDayCommitment = (d: PlanDay): number => {
    const p = d.userProgress;

    // A. Activity / Training score (0..1)
    let activityScore = 0;
    if (d.dayType === "TRAINING_DAY") {
      activityScore = isTrainingDayDone(d) ? 1 : 0;
    } else if (d.dayType === "REST_DAY") {
      const hasChecked = checkedList(d, undefined).length > 0;
      const sMins = calcSleepMins(p?.bedtime, p?.wakeTime);
      const hasReflection = Boolean(p?.dailyReflection || p?.happinessRate);
      if (p?.isCompleted || hasChecked || hasReflection || sMins > 0) {
        activityScore = 1;
      } else {
        activityScore = 0.5;
      }
    } else {
      // CONNECT_DAY
      if (p?.isCompleted || checkedList(d, undefined).length > 0) {
        activityScore = 1;
      } else {
        activityScore = 0;
      }
    }

    // B. Meal compliance score (0..1)
    const mealScore = getDayMealScore(d);

    // C. Sleep score based on average/healthy target (7h = 420 mins) (0..1)
    let sleepScore = 0;
    const sMins = calcSleepMins(p?.bedtime, p?.wakeTime);
    if (sMins >= 420) {
      sleepScore = 1;
    } else if (sMins >= 360) {
      sleepScore = 0.85;
    } else if (sMins > 0) {
      sleepScore = 0.6;
    } else {
      sleepScore = 0;
    }

    // D. Daily Reflection & Custom Tasks score (0..1)
    const reflectionScore = p?.dailyReflection || p?.happinessRate ? 1 : 0;
    const cTasks = d.customTasks || [];
    let customRatio = 1;
    if (cTasks.length > 0) {
      const completedCustom = cTasks.filter((ct) => Boolean(ct.submission)).length;
      customRatio = completedCustom / cTasks.length;
    }
    const tasksScore = cTasks.length > 0 ? reflectionScore * 0.5 + customRatio * 0.5 : reflectionScore;

    // Composite: 30% Training/Activity, 30% Meal, 25% Sleep, 15% Tasks/Reflection
    return (
      activityScore * 0.3 +
      mealScore * 0.3 +
      sleepScore * 0.25 +
      tasksScore * 0.15
    );
  };

  const elapsedCommitmentDays = sorted.filter((d) => d.dayNumber <= todayDayNum);
  const earnedCommitmentSum = elapsedCommitmentDays.reduce(
    (acc, d) => acc + computeDayCommitment(d),
    0
  );
  const commitmentPct =
    elapsedCommitmentDays.length > 0
      ? Math.round((earnedCommitmentSum / elapsedCommitmentDays.length) * 100)
      : 0;

  let commitmentDelta = 0;
  if (elapsedCommitmentDays.length >= 2) {
    const prevSlice = elapsedCommitmentDays.slice(0, -1);
    const prevEarnedSum = prevSlice.reduce(
      (acc, d) => acc + computeDayCommitment(d),
      0
    );
    const prevCommitmentPct = Math.round(
      (prevEarnedSum / prevSlice.length) * 100
    );
    commitmentDelta = commitmentPct - prevCommitmentPct;
  }

  return (
    <section className="w-full space-y-4">
      {/* 1. Weight & Program Commitment Side-by-Side */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WeightSummaryWidget
          days={sorted}
          bodyMetricLogs={bodyMetricLogs}
          programId={programId}
          currentDayNumber={currentDayNumber}
        />
        <ProgramCommitmentWidget
          pct={commitmentPct}
          deltaPct={commitmentDelta}
        />
      </div>

      {/* 2. Training (7-Column Heatmap Grid - 5 Monochrome Grey Variants) */}
      <TrainingWidget
        days={sorted}
        pct={trainingPct}
        currentDayNumber={currentDayNumber}
        deltaPct={trainingDelta}
      />

      {/* 3. Sleep Average (Interactive Line Chart + Delta in Minutes) */}
      <SleepWidget
        days={sorted}
        deltaMins={sleepDeltaMins}
        currentDayNumber={currentDayNumber}
      />

      {/* 4. Meal Control (50-Segment Bar + Editorial Calories/Water & Circular Macro Chart) */}
      <MealControlWidget
        days={sorted}
        pct={mealPct}
        deltaPct={mealDelta}
        currentDayNumber={currentDayNumber}
      />
    </section>
  );
}
