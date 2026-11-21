"use client";

import { Dumbbell, Moon, Utensils } from "lucide-react";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  type PlanDay,
} from "./myPlanUtils";

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

// ─── ThinCircleProgress (Lingkaran tipis) ─────────────────────────────────────
function ThinCircleProgress({
  percent,
  size = 64,
  strokeWidth = 2.5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safePercent / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        className="w-full h-full -rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-zinc-200 dark:text-white/10"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-zinc-900 dark:text-white transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="none"
        />
      </svg>
      <span className="absolute text-xs font-mono font-medium text-zinc-900 dark:text-white">
        {safePercent}%
      </span>
    </div>
  );
}

// ─── 1. Sleep Widget (Grafik Garis / Line Chart) ──────────────────────────────
function SleepWidget({ days }: { days: PlanDay[] }) {
  const MAX_POINTS = 30;
  const sorted = [...days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(-MAX_POINTS);

  const sleepData = sorted.map((d) => ({
    day: d.dayNumber,
    mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
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
    return { x, y, mins: s.mins, day: s.day };
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
        {avgMins > 0 ? (
          <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
            {formatSleepHours(avgMins)} avg
          </span>
        ) : (
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
            —
          </span>
        )}
      </div>

      {/* Body: Line Chart */}
      {validSleeps.length === 0 ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-4">
          No sleep data recorded yet
        </p>
      ) : (
        <div className="space-y-2 pt-1">
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

              {/* Data points */}
              {points.map((pt) => {
                if (pt.mins === 0) return null;
                const isGood = pt.mins >= TARGET;
                return (
                  <circle
                    key={pt.day}
                    cx={pt.x}
                    cy={pt.y}
                    r={isGood ? 3 : 2.5}
                    className={
                      isGood
                        ? "fill-zinc-950 dark:fill-white"
                        : "fill-zinc-400 dark:fill-white/50"
                    }
                  />
                );
              })}
            </svg>
          </div>

          {/* X-axis labels */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500 px-1">
            <span>D{sleepData[0]?.day}</span>
            {sleepData.length > 2 && (
              <span>D{sleepData[Math.floor(sleepData.length / 2)]?.day}</span>
            )}
            <span>D{sleepData[sleepData.length - 1]?.day}</span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5 px-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white inline-block" />
              Daily Sleep Trend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="border-t border-dashed border-zinc-400 dark:border-white/40 w-4 inline-block" />
              Target (7h 30m)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Training Widget (Simple + Bar Lingkaran Tipis) ────────────────────────
function TrainingWidget({
  completed,
  skipped,
  total,
  pct,
}: {
  completed: number;
  skipped: number;
  total: number;
  pct: number;
}) {
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
        <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>

      {/* Body: Thin Circle Progress + Stats */}
      <div className="flex items-center gap-6 pt-1">
        <ThinCircleProgress percent={pct} size={64} strokeWidth={2.5} />

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-zinc-500 dark:text-zinc-400">Completed:</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-white">
              {completed}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
            <span className="text-zinc-500 dark:text-zinc-400">Skipped:</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-white">
              {skipped}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20 shrink-0" />
            <span className="text-zinc-500 dark:text-zinc-400">Total:</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-white">
              {total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Meal Control Widget (50 Garis + Status) ──────────────────────────────
function MealControlWidget({ pct }: { pct: number }) {
  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Meal Control
          </span>
        </div>
        <span className="text-xs font-mono font-medium text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>

      {/* Body: 50-segment bar */}
      <div className="space-y-2 pt-1">
        <FiftyBarMeter percent={pct} />
        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 px-0.5">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CohortPerformanceCard({
  days,
  currentDayNumber: _currentDayNumber,
  onSwitchWidget: _onSwitchWidget,
}: {
  days: PlanDay[];
  currentDayNumber: number;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _currentDayNumber;
  void _onSwitchWidget;
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  // ── Training Stats ──────────────────────────────────────────────────────────
  const trainingDays = sorted.filter((d) => d.dayType === "TRAINING_DAY");
  const trainingTotal = trainingDays.length;

  const trainingCompleted = trainingDays.filter((d) => {
    const p = d.userProgress;
    return Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
  }).length;

  const trainingMissed = trainingDays.filter((d) => {
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
  }).length;

  const trainingPct =
    trainingTotal > 0
      ? Math.max(0, Math.round(((trainingTotal - trainingMissed) / trainingTotal) * 100))
      : 100;

  // ── Meal Stats ──────────────────────────────────────────────────────────────
  const mealTotal = sorted.length;
  const mealPenalty = sorted.reduce((acc, d) => {
    const mc = d.userProgress?.mealCompliance;
    if (mc === "SKIPPED" || mc === "OFF_TRACK") return acc + 1;
    if (mc === "PARTIAL") return acc + 0.5;
    if (mc === "FULL" || mc === "YES" || mc === "SIMILAR") return acc;
    return d.isPast2359 ? acc + 1 : acc;
  }, 0);
  const mealPct =
    mealTotal > 0
      ? Math.max(0, Math.round(((mealTotal - mealPenalty) / mealTotal) * 100))
      : 100;

  return (
    <section className="w-full space-y-4">
      {/* 1. Sleep (Grafik Garis / Line Chart) */}
      <SleepWidget days={sorted} />

      {/* 2. Training (Lingkaran Tipis + Stats) */}
      <TrainingWidget
        completed={trainingCompleted}
        skipped={trainingMissed}
        total={trainingTotal}
        pct={trainingPct}
      />

      {/* 3. Meal Control (50 Garis + Status) */}
      <MealControlWidget pct={mealPct} />
    </section>
  );
}
