"use client";

import {
  CheckCircle2,
  Dumbbell,
  Moon,
  Target,
  Utensils,
  XCircle,
} from "lucide-react";
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

// ─── 1. Sleep Widget ─────────────────────────────────────────────────────────
function SleepWidget({ days }: { days: PlanDay[] }) {
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

  const validSleeps = sleepData.filter((s) => s.mins > 0);
  const avgMins =
    validSleeps.length > 0
      ? Math.round(validSleeps.reduce((acc, s) => acc + s.mins, 0) / validSleeps.length)
      : 0;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-transparent dark:border-white/5">
      {/* Sleep header inside card */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Sleep Average
          </span>
        </div>
        {avgMins > 0 ? (
          <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white">
            {formatSleepHours(avgMins)} avg
          </span>
        ) : (
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
            —
          </span>
        )}
      </div>

      {/* Daily Sleep Bar chart */}
      {validSleeps.length === 0 ? (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center py-4">
          No sleep data recorded yet
        </p>
      ) : (
        <div className="space-y-2 pt-1">
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
                          ? "bg-zinc-300 dark:bg-white/10"
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

          {/* X-axis labels */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500 px-0.5">
            <span>D{sleepData[0]?.day}</span>
            {sleepData.length > 2 && (
              <span>D{sleepData[Math.floor(sleepData.length / 2)]?.day}</span>
            )}
            <span>D{sleepData[sleepData.length - 1]?.day}</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 pt-1">
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
              target (7h30m)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Training Widget ──────────────────────────────────────────────────────
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
  const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const skippedPct = total > 0 ? Math.round((skipped / total) * 100) : 0;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-4 border border-transparent dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-zinc-900/5 dark:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-white leading-tight">
              Training Performance
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Workout sessions adherence
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base sm:text-lg font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
            {pct}%
          </span>
          <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {pct >= 80 ? "High Consistency" : pct >= 50 ? "Steady Progress" : "Keep Pushing"}
          </span>
        </div>
      </div>

      {/* Visual adherence ratio bar */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-zinc-300/80 dark:bg-white/10 overflow-hidden flex gap-0.5 p-0.5">
            {completedPct > 0 && (
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completedPct}%` }}
                title={`Completed: ${completed} (${completedPct}%)`}
              />
            )}
            {skippedPct > 0 && (
              <div
                className="h-full rounded-full bg-rose-400/80 dark:bg-rose-400/60 transition-all duration-500"
                style={{ width: `${skippedPct}%` }}
                title={`Skipped: ${skipped} (${skippedPct}%)`}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 px-0.5">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Completed ({completedPct}%)
            </span>
            {skipped > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80 inline-block" />
                Skipped ({skippedPct}%)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3 stat cards: Completed, Skipped, Total */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Completed */}
        <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
              {completed}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">sessions</span>
          </div>
        </div>

        {/* Skipped */}
        <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 dark:text-zinc-500">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Skipped</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
              {skipped}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">missed</span>
          </div>
        </div>

        {/* Total */}
        <div className="rounded-xl bg-white/80 dark:bg-white/[0.05] p-3 border border-zinc-200/60 dark:border-white/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Total</span>
            <Target className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-950 dark:text-white tabular-nums">
              {total}
            </span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">workouts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Meal Control Widget ──────────────────────────────────────────────────
function MealControlWidget({ pct }: { pct: number }) {
  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3 border border-transparent dark:border-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-950 dark:text-white">
            Meal Control
          </span>
        </div>
        <span className="text-xs font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>

      <div className="pt-1">
        <FiftyBarMeter percent={pct} />
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
      {/* 1. Grafik sleep */}
      <SleepWidget days={sorted} />

      {/* 2. Training (Completed, Skipped, Total) */}
      <TrainingWidget
        completed={trainingCompleted}
        skipped={trainingMissed}
        total={trainingTotal}
        pct={trainingPct}
      />

      {/* 3. Meal control (bar 50 garis) */}
      <MealControlWidget pct={mealPct} />
    </section>
  );
}
