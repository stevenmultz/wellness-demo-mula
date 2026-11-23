"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { extractNutritionFromMealNotes } from "@/wellness/utils/nutrition";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  movementNames,
  splitActivities,
  type PlanDay,
} from "./myPlanUtils";

// ─── Solid Fill Metric Icons (16×16 geometric silhouettes) ─────────────────────
function FillScaleIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 3a5.5 5.5 0 0 0-5.18 3.66c-.18.5.18 1.04.71 1.04h8.94c.53 0 .89-.54.71-1.04A5.5 5.5 0 0 0 12 6Zm.75 2.25a.75.75 0 0 0-1.5 0v1.95a.75.75 0 0 0 1.5 0V8.25Z"
      />
    </svg>
  );
}

function FillTargetIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
      />
    </svg>
  );
}

function FillDumbbellIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M3 9a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 3 15H2.5A1.5 1.5 0 0 1 1 13.5v-3A1.5 1.5 0 0 1 2.5 9H3Zm3.5-3A1.5 1.5 0 0 1 8 7.5v9A1.5 1.5 0 0 1 6.5 18h-1A1.5 1.5 0 0 1 4 16.5v-9A1.5 1.5 0 0 1 5.5 6h1Zm12 0A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 17.5 6h1Zm3 3A1.5 1.5 0 0 1 23 10.5v3a1.5 1.5 0 0 1-1.5 1.5H21a1.5 1.5 0 0 1-1.5-1.5v-3A1.5 1.5 0 0 1 21 9h.5ZM9 10.5h6v3H9v-3Z" />
    </svg>
  );
}

function FillMoonIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M21 14.2A8.5 8.5 0 0 1 9.8 3a.75.75 0 0 0-.96-.96A9.75 9.75 0 1 0 21.96 15.16a.75.75 0 0 0-.96-.96Z" />
    </svg>
  );
}

function FillUtensilsIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M7.5 2a.75.75 0 0 1 .75.75V7.5h1.25V2.75a.75.75 0 0 1 1.5 0V7.5a3.75 3.75 0 0 1-2.5 3.54V21a1 1 0 1 1-2 0V11.04A3.75 3.75 0 0 1 4 7.5V2.75a.75.75 0 0 1 1.5 0V7.5h1.25V2.75A.75.75 0 0 1 7.5 2Zm9.75 0a.75.75 0 0 1 .75.75V21a1 1 0 1 1-2 0v-6.25h-1.25A1.75 1.75 0 0 1 13 13V7.25C13 4.35 14.88 2 17.25 2Z" />
    </svg>
  );
}

function FillFlameIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.92 2.24a.75.75 0 0 0-1.27.39c-.35 2.02-1.49 3.63-3.16 5.14C6.64 9.45 5 11.46 5 14.5a7 7 0 1 0 14 0c0-3.19-1.56-6.28-3.8-8.33a.75.75 0 0 0-1.24.44c-.14.85-.46 1.63-.95 2.26-.06-2.29-.44-4.7-1.09-6.63Z" />
    </svg>
  );
}

function FillDropletIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.64 2.42a.85.85 0 0 0-1.28 0C8.82 5.42 5 10.35 5 14.5a7 7 0 0 0 14 0c0-4.15-3.82-9.08-6.36-12.08Z" />
    </svg>
  );
}

// ─── Unified Small Label + Solid Fill Icon Header ────────────────────────────
function MetricLabelHeader({
  icon,
  children,
  title,
}: {
  icon: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={title}>
      <span className="text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center">
        {icon}
      </span>
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate leading-none">
        {children}
      </span>
    </div>
  );
}

// ─── Unified Primary Value + Bottom-Aligned Side-by-Side Delta Badge ─────────
function MetricValueDisplay({
  value,
  unit,
  delta,
  deltaUnit = "%",
  showDelta = true,
}: {
  value: string;
  unit?: string;
  delta?: number;
  deltaUnit?: string;
  showDelta?: boolean;
}) {
  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex items-baseline gap-1 leading-none">
        <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-none">
            {unit}
          </span>
        )}
      </div>
      {showDelta && delta !== undefined && (
        <MetricDeltaBadge delta={delta} unit={deltaUnit} />
      )}
    </div>
  );
}

// ─── MetricDeltaBadge (Small label-sized indicator, bottom-aligned next to value) ─
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
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md border border-[#2A7B60] bg-[#1F6E54] dark:border-[#4D9E7B] dark:bg-[#1F6E54] text-[10px] font-mono font-semibold text-white leading-none mb-[1px]">
        <ArrowUp className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md border border-[#B03244] bg-[#9E2A3A] dark:border-[#C95B6B] dark:bg-[#9E2A3A] text-[10px] font-mono font-semibold text-white leading-none mb-[1px]">
        <ArrowDown className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md border border-zinc-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 leading-none mb-[1px]">
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
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-2.5 border border-zinc-200/50 dark:border-white/5">
      <MetricLabelHeader icon={<FillScaleIcon />}>Weight</MetricLabelHeader>

      <MetricValueDisplay
        value={latestWeight > 0 ? latestWeight.toFixed(1) : "—"}
        unit={latestWeight > 0 ? "kg" : undefined}
        delta={weeklyDeltaKg}
        deltaUnit=" kg"
      />
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
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-2.5 border border-zinc-200/50 dark:border-white/5">
      <MetricLabelHeader icon={<FillTargetIcon />} title="Program Commitment">
        <span className="hidden sm:inline">Program </span>Commitment
      </MetricLabelHeader>

      <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
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
      {/* Header + Unified Large Value & Bottom-Aligned Delta */}
      <div className="space-y-2">
        <MetricLabelHeader icon={<FillDumbbellIcon />}>Training</MetricLabelHeader>
        <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
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
      {/* Header + Unified Large Value & Bottom-Aligned Delta */}
      <div className="space-y-2">
        <MetricLabelHeader icon={<FillMoonIcon />}>Sleep Average</MetricLabelHeader>
        <MetricValueDisplay
          value={avgMins > 0 ? formatSleepHours(avgMins) : "—"}
          delta={deltaMins}
          deltaUnit=" min"
        />
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

// ─── 4. Meal Control Widget (Pure Qualitative Dietary Adherence) ──────────────
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
  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const onPlanDays = elapsedDays.filter((d) => {
    const mc = d.userProgress?.mealCompliance;
    return mc === "FULL" || mc === "YES" || mc === "SIMILAR";
  }).length;
  const partialDays = elapsedDays.filter(
    (d) => d.userProgress?.mealCompliance === "PARTIAL"
  ).length;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-3.5 border border-zinc-200/50 dark:border-white/5">
      {/* Header + Unified Large Value & Bottom-Aligned Delta */}
      <div className="space-y-2">
        <MetricLabelHeader icon={<FillUtensilsIcon />}>Meal Control</MetricLabelHeader>
        <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
      </div>

      {/* 50-segment bar */}
      <div className="pt-0.5">
        <FiftyBarMeter percent={pct} />
      </div>

      {/* Adherence summary (pure meal control, decoupled from calories & water) */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5">
        <span>
          {onPlanDays}/{elapsedDays.length} {elapsedDays.length === 1 ? "day" : "days"} on plan
        </span>
        {partialDays > 0 && <span>{partialDays} partial</span>}
      </div>
    </div>
  );
}

// ─── 5. Calories & Macros Widget (Daily Reset for Today + Program Average) ───
function CaloriesWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const [macroScope, setMacroScope] = useState<"today" | "avg">("today");
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todayNutr = extractNutritionFromMealNotes(todayDay?.userProgress?.mealNotes);

  const loggedCalorieDays = elapsedDays
    .map((d) => ({
      dayNumber: d.dayNumber,
      ...extractNutritionFromMealNotes(d.userProgress?.mealNotes),
    }))
    .filter((n) => n.hasMealData && n.calories > 0);

  const avgCalories =
    loggedCalorieDays.length > 0
      ? Math.round(
          loggedCalorieDays.reduce((acc, n) => acc + n.calories, 0) /
            loggedCalorieDays.length
        )
      : 0;
  const avgCarbsG =
    loggedCalorieDays.length > 0
      ? Math.round(
          loggedCalorieDays.reduce((acc, n) => acc + n.carbsG, 0) /
            loggedCalorieDays.length
        )
      : 0;
  const avgProteinG =
    loggedCalorieDays.length > 0
      ? Math.round(
          loggedCalorieDays.reduce((acc, n) => acc + n.proteinG, 0) /
            loggedCalorieDays.length
        )
      : 0;
  const avgFatG =
    loggedCalorieDays.length > 0
      ? Math.round(
          loggedCalorieDays.reduce((acc, n) => acc + n.fatG, 0) /
            loggedCalorieDays.length
        )
      : 0;

  let caloriesDelta = 0;
  if (loggedCalorieDays.length >= 2) {
    const latestCal = loggedCalorieDays[loggedCalorieDays.length - 1].calories;
    const prevSlice = loggedCalorieDays.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, n) => acc + n.calories, 0) / prevSlice.length;
    caloriesDelta = Math.round(latestCal - prevAvg);
  }

  const displayCarbsG = macroScope === "today" ? todayNutr.carbsG : avgCarbsG;
  const displayProteinG = macroScope === "today" ? todayNutr.proteinG : avgProteinG;
  const displayFatG = macroScope === "today" ? todayNutr.fatG : avgFatG;

  const totalMacroG = displayCarbsG + displayProteinG + displayFatG;
  const carbsPct = totalMacroG > 0 ? Math.round((displayCarbsG / totalMacroG) * 100) : 0;
  const proteinPct =
    totalMacroG > 0 ? Math.round((displayProteinG / totalMacroG) * 100) : 0;
  const fatPct = totalMacroG > 0 ? Math.max(0, 100 - carbsPct - proteinPct) : 0;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const carbsLen = (carbsPct / 100) * circumference;
  const proteinLen = (proteinPct / 100) * circumference;
  const fatLen = (fatPct / 100) * circumference;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-4 border border-zinc-200/50 dark:border-white/5">
      {/* Small Label + Fill Icon Header */}
      <MetricLabelHeader icon={<FillFlameIcon />}>Calories</MetricLabelHeader>

      {/* Today (Resets Daily, Pure Food Intake) vs Program Average */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Today Intake
          </span>
          <MetricValueDisplay
            value={todayNutr.calories > 0 ? todayNutr.calories.toLocaleString() : "0"}
            unit="kcal"
            showDelta={false}
          />
          <span className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            Resets daily · Intake only
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Program Avg
          </span>
          <MetricValueDisplay
            value={avgCalories > 0 ? avgCalories.toLocaleString() : "—"}
            unit={avgCalories > 0 ? "kcal" : undefined}
            delta={caloriesDelta}
            deltaUnit=" kcal"
          />
          <span className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {loggedCalorieDays.length}{" "}
            {loggedCalorieDays.length === 1 ? "day" : "days"} logged
          </span>
        </div>
      </div>

      {/* Macro Breakdown with Today / Program Avg toggle */}
      <div className="space-y-3 pt-3.5 border-t border-zinc-300/60 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Macros ({macroScope === "today" ? "Today" : "Program Avg"})
          </span>
          <div className="inline-flex items-center rounded-lg bg-zinc-200/80 dark:bg-white/10 p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setMacroScope("today")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                macroScope === "today"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-semibold shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setMacroScope("avg")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                macroScope === "avg"
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white font-semibold shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              }`}
            >
              Avg
            </button>
          </div>
        </div>

        <div className="flex items-center gap-5">
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
                {displayCarbsG > 0 && (
                  <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                    ({displayCarbsG}g)
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
                {displayProteinG > 0 && (
                  <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                    ({displayProteinG}g)
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
                {displayFatG > 0 && (
                  <span className="text-zinc-500 dark:text-zinc-400 ml-1.5">
                    ({displayFatG}g)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Water / Hydration Widget (Daily Reset + Program History & Average) ───
function HydrationWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const DAILY_TARGET_ML = 2500;
  const CONSISTENCY_THRESHOLD_ML = 2000;

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todayWaterMl = extractNutritionFromMealNotes(
    todayDay?.userProgress?.mealNotes
  ).waterMl;

  const waterSeries = elapsedDays.map((d) => ({
    dayNumber: d.dayNumber,
    unlockDate: d.unlockDate,
    waterMl: extractNutritionFromMealNotes(d.userProgress?.mealNotes).waterMl,
  }));

  const loggedWaterDays = waterSeries.filter((w) => w.waterMl > 0);
  const avgWaterMl =
    loggedWaterDays.length > 0
      ? Math.round(
          loggedWaterDays.reduce((acc, w) => acc + w.waterMl, 0) /
            loggedWaterDays.length
        )
      : 0;
  const goalHitDays = waterSeries.filter(
    (w) => w.waterMl >= CONSISTENCY_THRESHOLD_ML
  ).length;

  let waterDeltaMl = 0;
  if (loggedWaterDays.length >= 2) {
    const latestMl = loggedWaterDays[loggedWaterDays.length - 1].waterMl;
    const prevSlice = loggedWaterDays.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, w) => acc + w.waterMl, 0) / prevSlice.length;
    waterDeltaMl = Math.round(latestMl - prevAvg);
  }

  const todayHydrationPct = Math.min(
    100,
    Math.round((todayWaterMl / DAILY_TARGET_ML) * 100)
  );
  const recentBars = waterSeries.slice(-14);
  const selectedBar =
    recentBars.find((b) => b.dayNumber === selectedDayNum) || null;

  return (
    <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 space-y-4 border border-zinc-200/50 dark:border-white/5">
      {/* Small Label + Fill Icon Header */}
      <MetricLabelHeader icon={<FillDropletIcon />}>Water</MetricLabelHeader>

      {/* Today (Resets Daily) vs Program Avg */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Today
          </span>
          <MetricValueDisplay
            value={(todayWaterMl / 1000).toFixed(1)}
            unit="L"
            showDelta={false}
          />
          <span className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            Target 2.5 L · Resets daily
          </span>
        </div>

        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Program Avg
          </span>
          <MetricValueDisplay
            value={avgWaterMl > 0 ? (avgWaterMl / 1000).toFixed(1) : "—"}
            unit={avgWaterMl > 0 ? "L" : undefined}
            delta={waterDeltaMl}
            deltaUnit=" ml"
          />
          <span className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            {goalHitDays}/{elapsedDays.length}{" "}
            {elapsedDays.length === 1 ? "day" : "days"} ≥ 2.0 L
          </span>
        </div>
      </div>

      {/* Today's Hydration Progress Meter */}
      <div className="pt-0.5">
        <FiftyBarMeter percent={todayHydrationPct} />
      </div>

      {/* Recent Daily Hydration Bars (Interactive History) */}
      {recentBars.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-zinc-300/60 dark:border-white/10">
          <div className="flex items-end gap-1.5 h-12">
            {recentBars.map((b) => {
              const heightPct =
                b.waterMl > 0
                  ? Math.max(16, Math.min(100, Math.round((b.waterMl / 3000) * 100)))
                  : 10;
              const isSelected = selectedDayNum === b.dayNumber;
              const hitGoal = b.waterMl >= CONSISTENCY_THRESHOLD_ML;

              return (
                <button
                  key={b.dayNumber}
                  type="button"
                  onClick={() =>
                    setSelectedDayNum((prev) =>
                      prev === b.dayNumber ? null : b.dayNumber
                    )
                  }
                  aria-label={`Day ${b.dayNumber}: ${(b.waterMl / 1000).toFixed(1)} L`}
                  className="flex-1 h-full flex items-end justify-center cursor-pointer group"
                >
                  <span
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-sm transition-all ${
                      isSelected
                        ? "ring-2 ring-zinc-950 dark:ring-white ring-offset-1 ring-offset-[#ececea] dark:ring-offset-zinc-900 "
                        : ""
                    }${
                      hitGoal
                        ? "bg-zinc-950 dark:bg-white"
                        : b.waterMl > 0
                        ? "bg-zinc-500 dark:bg-zinc-400"
                        : "bg-zinc-300/70 dark:bg-white/15"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {selectedBar && (
            <button
              type="button"
              onClick={() => setSelectedDayNum(null)}
              title="Click to dismiss"
              className="w-full rounded-xl bg-white/90 dark:bg-white/[0.08] px-3.5 py-2.5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-2 text-xs font-mono text-zinc-900 dark:text-white animate-in fade-in duration-150 cursor-pointer hover:bg-white dark:hover:bg-white/15 transition"
            >
              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                {formatMetricDate(
                  selectedBar.unlockDate,
                  selectedBar.dayNumber,
                  currentDayNumber
                )}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white">
                {selectedBar.waterMl > 0
                  ? `${(selectedBar.waterMl / 1000).toFixed(1)} L (${selectedBar.waterMl.toLocaleString()} ml)`
                  : "0.0 L"}
              </span>
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
  // Holistic composite across ALL mandatory tasks: Activity/Training, Meal, Sleep Target, and Custom Tasks
  // (Daily Reflection removed; no free partial credit on empty Rest Days)
  const computeDayCommitment = (d: PlanDay): number => {
    const p = d.userProgress;

    // A. Activity / Training score (0..1)
    let activityScore = 0;
    if (d.dayType === "TRAINING_DAY") {
      activityScore = isTrainingDayDone(d) ? 1 : 0;
    } else if (d.dayType === "REST_DAY") {
      const hasChecked = checkedList(d, undefined).length > 0;
      const hasNotes = Boolean(p?.workoutNotes && p.workoutNotes !== "SKIPPED");
      activityScore = p?.isCompleted || hasChecked || hasNotes ? 1 : 0;
    } else {
      // CONNECT_DAY
      const hasFeedback = Boolean(p?.eventFeedback && p.eventFeedback !== "SKIPPED");
      activityScore = p?.isCompleted || hasFeedback || checkedList(d, undefined).length > 0 ? 1 : 0;
    }

    // B. Meal compliance score (0..1)
    const mealScore = getDayMealScore(d);

    // C. Sleep score based on average/healthy target (7h = 420 mins) (0..1)
    let sleepScore = 0;
    const isSleepSkipped = p?.bedtime === "SKIPPED" || p?.wakeTime === "SKIPPED";
    const sMins = isSleepSkipped ? 0 : calcSleepMins(p?.bedtime, p?.wakeTime);
    if (sMins >= 420) {
      sleepScore = 1;
    } else if (sMins >= 360) {
      sleepScore = 0.85;
    } else if (sMins > 0) {
      sleepScore = 0.6;
    } else {
      sleepScore = 0;
    }

    // D. Hydration / Water intake score (2.0L = 100%, 1.5L = 85%, >0 = 60%)
    const wMl = extractNutritionFromMealNotes(p?.mealNotes).waterMl;
    const waterScore =
      wMl >= 2000 ? 1 : wMl >= 1500 ? 0.85 : wMl > 0 ? 0.6 : 0;

    // E. All Custom Tasks on the day are mandatory (when present)
    const cTasks = d.customTasks || [];
    if (cTasks.length > 0) {
      const completedCustom = cTasks.filter((ct) => Boolean(ct.submission)).length;
      const customRatio = completedCustom / cTasks.length;
      // Composite with custom tasks: 30% Activity, 25% Meal, 20% Sleep, 10% Water, 15% Custom Tasks
      return (
        activityScore * 0.3 +
        mealScore * 0.25 +
        sleepScore * 0.2 +
        waterScore * 0.1 +
        customRatio * 0.15
      );
    }

    // Composite on days without custom tasks: 35% Activity, 30% Meal, 20% Sleep, 15% Water (max = 100%)
    return (
      activityScore * 0.35 +
      mealScore * 0.3 +
      sleepScore * 0.2 +
      waterScore * 0.15
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

      {/* 4. Meal Control (Pure Dietary Adherence) */}
      <MealControlWidget
        days={sorted}
        pct={mealPct}
        deltaPct={mealDelta}
        currentDayNumber={currentDayNumber}
      />

      {/* 5. Calories & Macros (Daily Reset for Today + Program Average; Intake Only) */}
      <CaloriesWidget days={sorted} currentDayNumber={currentDayNumber} />

      {/* 6. Water / Hydration (Daily Reset for Today + Program Average & History) */}
      <HydrationWidget days={sorted} currentDayNumber={currentDayNumber} />
    </section>
  );
}
