"use client";

import { useState, type ReactNode } from "react";
import { Dumbbell, Info, Moon, Smile, Target, Utensils } from "lucide-react";
import { InfoPopupModal } from "../shared";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  type PlanDay,
} from "./myPlanUtils";

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

function MetricRow({
  icon,
  label,
  extra,
  pct,
}: {
  icon: ReactNode;
  label: string;
  extra?: string;
  pct: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
          {extra && <span className="text-zinc-400 font-normal">&middot; {extra}</span>}
        </span>
        <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
          {pct}%
        </span>
      </div>
      <TwentyBarMeter percent={pct} />
    </div>
  );
}

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

  const loggedSleeps = sorted
    .map((d) => calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime))
    .filter((mins) => mins > 0);
  const avgSleepMins =
    loggedSleeps.length > 0
      ? Math.round(loggedSleeps.reduce((acc, m) => acc + m, 0) / loggedSleeps.length)
      : 0;
  const sleepPct =
    avgSleepMins === 0 ? 0 : Math.min(100, Math.round((avgSleepMins / 450) * 100));

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

  const consistencyTotal = sorted.length;
  const consistencyMissed = sorted.filter((d) => {
    const p = d.userProgress;
    const hasSleep = Boolean(
      p?.bedtime && p?.wakeTime && p.bedtime !== "SKIPPED" && p.wakeTime !== "SKIPPED"
    );
    const hasWorkout = Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          (p.eventFeedback && p.eventFeedback !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
    const hasMeal = Boolean(p?.mealCompliance && p.mealCompliance !== "SKIPPED");
    const hasReflection = Boolean(
      p?.dailyReflection &&
        p.dailyReflection !== "SKIPPED" &&
        p.dailyReflection !== "Skipped reflection journal today."
    );
    if (hasSleep || hasWorkout || hasMeal || hasReflection) return false;
    const hasExplicitSkip = Boolean(
      p &&
        (p.bedtime === "SKIPPED" ||
          p.wakeTime === "SKIPPED" ||
          p.selectedWorkout === "SKIPPED" ||
          p.workoutNotes === "SKIPPED" ||
          p.eventFeedback === "SKIPPED" ||
          p.mealCompliance === "SKIPPED" ||
          p.dailyReflection === "SKIPPED" ||
          p.dailyReflection === "Skipped reflection journal today.")
    );
    return hasExplicitSkip || d.isPast2359;
  }).length;
  const consistencyPct =
    consistencyTotal > 0
      ? Math.max(
          0,
          Math.round(((consistencyTotal - consistencyMissed) / consistencyTotal) * 100)
        )
      : 100;

  const [showMetricsInfo, setShowMetricsInfo] = useState(false);

  return (
    <section className="w-full space-y-4">

      <InfoPopupModal
        open={showMetricsInfo}
        title="Performance Metrics"
        subtitle="0–100% telemetry across 20 segments"
        onClose={() => setShowMetricsInfo(false)}
      >
        <p className="font-semibold text-zinc-950 dark:text-white">
          How Metrics Are Calculated:
        </p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-zinc-900 dark:text-white">Sleep Average:</strong>{" "}
            Percentage based on nightly sleep duration. Reaches 100% at an optimal average
            of &ge; 7h 30m.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Training:</strong> Starts at
            100% and decreases proportionally for each skipped or missed training day.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Meal:</strong> Starts at 100%
            and decreases proportionally when meals are marked partial, off-track, or
            skipped.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Energy &amp; Mood:</strong>{" "}
            Starts at 100% and adjusts proportionally with your daily mood ratings and
            missed reflections.
          </li>
          <li>
            <strong className="text-zinc-900 dark:text-white">Program Consistency:</strong>{" "}
            Starts at 100% and decreases proportionally for each skipped or inactive past
            program day.
          </li>
        </ul>
      </InfoPopupModal>

      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-4">
        <MetricRow
          icon={<Moon className="w-3.5 h-3.5 text-zinc-400" />}
          label="Sleep Average"
          extra={avgSleepMins > 0 ? formatSleepHours(avgSleepMins) : undefined}
          pct={sleepPct}
        />
        <div className="border-t border-zinc-100 dark:border-white/10" />
        <MetricRow
          icon={<Dumbbell className="w-3.5 h-3.5 text-zinc-400" />}
          label="Training"
          pct={trainingPct}
        />
        <div className="border-t border-zinc-100 dark:border-white/10" />
        <MetricRow
          icon={<Utensils className="w-3.5 h-3.5 text-zinc-400" />}
          label="Meal"
          pct={mealPct}
        />
        <div className="border-t border-zinc-100 dark:border-white/10" />
        <MetricRow
          icon={<Smile className="w-3.5 h-3.5 text-zinc-400" />}
          label="Energy & Mood"
          pct={moodPct}
        />
        <div className="border-t border-zinc-100 dark:border-white/10" />
        <MetricRow
          icon={<Target className="w-3.5 h-3.5 text-zinc-400" />}
          label="Program Consistency"
          pct={consistencyPct}
        />
      </div>
    </section>
  );
}
