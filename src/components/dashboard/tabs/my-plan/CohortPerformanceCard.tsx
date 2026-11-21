"use client";

import { Dumbbell, Moon, Smile, Utensils } from "lucide-react";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  type PlanDay,
} from "./myPlanUtils";

// ─── Sleep Bar Chart ──────────────────────────────────────────────────────────
function SleepBarChart({ days }: { days: PlanDay[] }) {
  const MAX_BARS = 30;
  const sorted = [...days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(-MAX_BARS);

  const sleepData = sorted.map((d) => ({
    day: d.dayNumber,
    mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
  }));

  // Target = 450 min (7h30m), chart ceiling = 600 min (10h)
  const CEILING = 600;
  const TARGET = 450;

  const hasAny = sleepData.some((s) => s.mins > 0);
  const avgMins =
    sleepData.filter((s) => s.mins > 0).length > 0
      ? Math.round(
          sleepData.filter((s) => s.mins > 0).reduce((acc, s) => acc + s.mins, 0) /
            sleepData.filter((s) => s.mins > 0).length
        )
      : 0;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
          <Moon className="w-3.5 h-3.5 text-zinc-400" />
          <span>Sleep Average</span>
          {avgMins > 0 && (
            <span className="text-zinc-400 font-normal">&middot; {formatSleepHours(avgMins)} avg</span>
          )}
        </span>
      </div>

      {/* Bar chart */}
      <div className="w-full rounded-xl bg-[#ececea] dark:bg-white/[0.04] p-3 space-y-2">
        {!hasAny ? (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-3">
            No sleep data yet
          </p>
        ) : (
          <>
            {/* Bars */}
            <div className="relative">
              {/* Target line at 7h30m */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-zinc-400/50 dark:border-white/20 pointer-events-none"
                style={{ bottom: `${(TARGET / CEILING) * 56}px` }}
              />
              <div className="flex items-end gap-[2px] h-14">
                {sleepData.map((s) => {
                  const heightPct = s.mins > 0 ? Math.min(1, s.mins / CEILING) : 0;
                  const isGood = s.mins >= TARGET;
                  return (
                    <div
                      key={s.day}
                      className="flex-1 flex flex-col justify-end"
                      title={s.mins > 0 ? `Day ${s.day}: ${formatSleepHours(s.mins)}` : `Day ${s.day}: —`}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          s.mins === 0
                            ? "bg-zinc-200 dark:bg-white/10"
                            : isGood
                            ? "bg-zinc-800 dark:bg-white"
                            : "bg-zinc-400 dark:bg-white/50"
                        }`}
                        style={{ height: s.mins === 0 ? "3px" : `${heightPct * 56}px` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels — show first, mid, last */}
            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500 px-0.5">
              <span>D{sleepData[0]?.day}</span>
              {sleepData.length > 2 && (
                <span>D{sleepData[Math.floor(sleepData.length / 2)]?.day}</span>
              )}
              <span>D{sleepData[sleepData.length - 1]?.day}</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 pt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-sm bg-zinc-800 dark:bg-white inline-block" />
                ≥ 7h30m
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-sm bg-zinc-400 dark:bg-white/50 inline-block" />
                &lt; 7h30m
              </span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 ml-auto">
                <span className="border-t border-dashed border-zinc-400/70 w-4 inline-block" />
                target
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Meal Compliance Bar ──────────────────────────────────────────────────────
function MealComplianceBar({ pct }: { pct: number }) {
  const color =
    pct >= 80
      ? "bg-zinc-800 dark:bg-white"
      : pct >= 50
      ? "bg-zinc-500 dark:bg-white/70"
      : "bg-zinc-300 dark:bg-white/30";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5 text-zinc-400" />
          <span>Meal Control</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>
      <div className="w-full rounded-xl bg-[#ececea] dark:bg-white/[0.04] p-3 space-y-2">
        <div className="w-full h-3 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
          <span>0%</span>
          <span className={pct >= 80 ? "text-zinc-800 dark:text-white font-semibold" : ""}>
            {pct >= 80 ? "On track 🎯" : pct >= 50 ? "Improving" : "Needs attention"}
          </span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

// ─── TwentyBarMeter (for training & mood) ────────────────────────────────────
function TwentyBarMeter({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filledBars = Math.round((safePercent / 100) * 50);
  return (
    <div
      className="flex items-center justify-between py-0.5"
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${safePercent}%`}
    >
      {Array.from({ length: 50 }, (_, i) => i + 1).map((bar) => (
        <div
          key={bar}
          className={`w-[1.5px] h-4 sm:h-5 rounded-full transition-all ${
            bar <= filledBars
              ? "bg-zinc-950 dark:bg-white"
              : "bg-zinc-200 dark:bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

function BarMetricRow({
  icon,
  label,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>
      <TwentyBarMeter percent={pct} />
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

  // ── Meal % ──────────────────────────────────────────────────────────────────
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

  // ── Training % ──────────────────────────────────────────────────────────────
  const trainingDays = sorted.filter((d) => d.dayType === "TRAINING_DAY");
  const trainingTotal = trainingDays.length;
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

  // ── Mood % ──────────────────────────────────────────────────────────────────
  const moodTotal = sorted.length;
  const moodPoints = sorted.reduce((acc, d) => {
    const p = d.userProgress;
    const isSkipped =
      p?.dailyReflection === "SKIPPED" ||
      p?.dailyReflection === "Skipped reflection journal today.";
    if (isSkipped) return acc;
    if (typeof p?.happinessRate === "number" && p.happinessRate > 0) {
      return acc + Math.min(5, p.happinessRate) / 5;
    }
    return d.isPast2359 ? acc : acc + 1;
  }, 0);
  const moodPct =
    moodTotal > 0 ? Math.max(0, Math.round((moodPoints / moodTotal) * 100)) : 100;

  return (
    <section className="w-full space-y-5">
      {/* 1. Sleep — bar chart per day */}
      <SleepBarChart days={sorted} />

      <div className="border-t border-zinc-200/80 dark:border-white/10" />

      {/* 2. Meal control — large progress bar */}
      <MealComplianceBar pct={mealPct} />

      <div className="border-t border-zinc-200/80 dark:border-white/10" />

      {/* 3. Training & Mood — bar meter */}
      <div className="rounded-xl bg-[#ececea] dark:bg-white/[0.04] p-4 space-y-4">
        <BarMetricRow
          icon={<Dumbbell className="w-3.5 h-3.5 text-zinc-400" />}
          label="Training"
          pct={trainingPct}
        />
        <div className="border-t border-zinc-100 dark:border-white/10" />
        <BarMetricRow
          icon={<Smile className="w-3.5 h-3.5 text-zinc-400" />}
          label="Energy & Mood"
          pct={moodPct}
        />
      </div>
    </section>
  );
}
