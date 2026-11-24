"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { extractNutritionFromMealNotes } from "@/wellness/utils/nutrition";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  FillDropletIcon,
  FillDumbbellIcon,
  FillFlameIcon,
  FillMoonIcon,
  FillScaleIcon,
  FillTargetIcon,
  FillUtensilsIcon,
} from "../sharedFillIcons";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  movementNames,
  splitActivities,
  type PlanDay,
} from "./myPlanUtils";

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
      <div className="flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
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
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2.5px] rounded-md border border-[var(--semantic-green-border)] bg-[var(--semantic-green)] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
        <ArrowUp className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2.5px] rounded-md border border-[var(--semantic-red-border)] bg-[var(--semantic-red)] text-[10px] font-mono font-semibold text-white leading-[1.25] mb-[2px]">
        <ArrowDown className="w-2.5 h-2.5 stroke-[2.5] text-white shrink-0" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2.5px] rounded-md border border-zinc-300 dark:border-white/15 bg-white/70 dark:bg-white/[0.06] text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 leading-[1.25] mb-[2px]">
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

// ─── FiftyBarMeter (50 segments by default; configurable for compact cards) ──
export function FiftyBarMeter({
  percent,
  segments = 50,
}: {
  percent: number;
  segments?: number;
}) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const count = Math.max(8, Math.round(segments));
  const filledBars = Math.round((safePercent / 100) * count);
  return (
    <div
      className="flex items-center justify-between py-1"
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${safePercent}%`}
    >
      {Array.from({ length: count }, (_, i) => i + 1).map((bar) => (
        <div
          key={bar}
          className={`${count <= 28 ? "w-[2px]" : "w-[1.5px]"} h-5 rounded-full transition-all ${
            bar <= filledBars
              ? "bg-zinc-950 dark:bg-white"
              : "bg-zinc-300 dark:bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Unified Metric Card Wrapper ─────────────────────────────────────────────
function FlippableMetricCard({
  title,
  label,
  icon,
  valueSlot,
  infoContent: _infoContent,
  frontClassName = "space-y-3",
  children,
}: {
  title: string;
  label?: ReactNode;
  icon: ReactNode;
  valueSlot: ReactNode;
  infoContent?: ReactNode;
  frontClassName?: string;
  children?: ReactNode;
}) {
  void _infoContent;

  return (
    <div
      className={`w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 ${frontClassName}`}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 min-w-0" title={title}>
          <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
            {icon}
          </span>
          <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
            {label ?? title}
          </span>
        </div>

        {valueSlot}
      </div>

      {children}
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
    <FlippableMetricCard
      title="Weight"
      icon={<FillScaleIcon />}
      frontClassName="space-y-0"
      valueSlot={
        <MetricValueDisplay
          value={latestWeight > 0 ? latestWeight.toFixed(1) : "—"}
          unit={latestWeight > 0 ? "kg" : undefined}
          delta={weeklyDeltaKg}
          deltaUnit=" kg"
        />
      }
      infoContent={
        <p>
          From your latest body weight log. Delta = latest weight minus your log 7 days
          ago.
        </p>
      }
    />
  );
}

// ─── 2. Program Commitment Widget (50/50 Card, Overall Holistic Score) ───────
function ProgramCommitmentWidget({
  pct,
  deltaPct = 0,
}: {
  pct: number;
  deltaPct?: number;
}) {
  return (
    <FlippableMetricCard
      title="Program Commitment"
      label={
        <>
          <span className="hidden sm:inline">Program </span>Commitment
        </>
      }
      icon={<FillTargetIcon />}
      frontClassName="space-y-0"
      valueSlot={
        <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
      }
      infoContent={
        <p>
          Daily avg: 35% Activity, 30% Meal, 20% Sleep, 15% Water (or 15% Custom Tasks
          when assigned).
        </p>
      }
    />
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
    const status = getTrainingDayStatus(d, currentDayNumber);

    if (status === "future") {
      return "-";
    }

    if (d.dayType === "TRAINING_DAY") {
      const acts = movementNames(d);
      if (acts.length > 0) {
        const checks = checkedList(d, undefined);
        const done = d.userProgress?.isCompleted
          ? acts.length
          : acts.filter((name) =>
              checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))
            ).length;
        return `${done}/${acts.length} Training`;
      }
      const done = status === "full" || status === "partial" ? 1 : 0;
      return `${done}/1 Training`;
    }

    if (d.dayType === "REST_DAY") {
      const acts = splitActivities(d.restInstructions);
      if (acts.length > 0) {
        const checks = checkedList(d, undefined);
        const done = d.userProgress?.isCompleted
          ? acts.length
          : acts.filter((name) =>
              checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))
            ).length;
        return `${done}/${acts.length} Rest`;
      }
      const done =
        d.userProgress?.isCompleted ||
        (d.userProgress?.workoutNotes && d.userProgress.workoutNotes !== "SKIPPED")
          ? 1
          : 0;
      return `${done}/1 Rest`;
    }

    // CONNECT_DAY / MEETUP_DAY
    const done =
      d.userProgress?.isCompleted ||
      (d.userProgress?.eventFeedback && d.userProgress.eventFeedback !== "SKIPPED")
        ? 1
        : 0;
    return `${done}/1 Connect`;
  };

  return (
    <FlippableMetricCard
      title="Training"
      icon={<FillDumbbellIcon />}
      frontClassName="space-y-3.5"
      valueSlot={
        <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
      }
      infoContent={
        <>
          <p>
            Calculated as completed training days ÷ elapsed training days (Rest &amp;
            Connect days excluded). Delta compares against prior training days.
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#18181b] dark:bg-white" />
              Done
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#52525b] dark:bg-zinc-300" />
              Partial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#a1a1aa] dark:bg-zinc-500" />
              Rest
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#d4d4d8] dark:bg-zinc-700" />
              Skipped
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#fcfcfb] dark:bg-zinc-800/80 border border-zinc-300/70 dark:border-white/15" />
              Upcoming
            </span>
          </div>
        </>
      }
    >

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
    </FlippableMetricCard>
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
  const baselineY = (svgH - padY).toFixed(1);
  const flatBaselineD = `M ${padX.toFixed(1)} ${baselineY} L ${(svgW - padX).toFixed(1)} ${baselineY}`;

  const selectedPoint = points.find((pt) => pt.day === selectedDayNum) || null;
  const avgHours = avgMins > 0 ? Math.floor(avgMins / 60) : 0;
  const avgRemMins = avgMins > 0 ? Math.round(avgMins % 60) : 0;

  return (
    <FlippableMetricCard
      title="Sleep Average"
      icon={<FillMoonIcon />}
      frontClassName="space-y-3.5"
      valueSlot={
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex items-baseline gap-1.5">
            <span className="inline-flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
                {avgHours}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                hour
              </span>
            </span>
            <span className="inline-flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
                {avgRemMins}
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 leading-normal">
                min
              </span>
            </span>
          </div>
          <MetricDeltaBadge delta={deltaMins} unit=" min" />
        </div>
      }
      infoContent={
        <p>
          Calculated as total sleep minutes ÷ logged sleep days (from Bedtime to Wake Time
          in Sleep Log). Dashed line = 7.5h target; delta = latest night vs. prior average.
        </p>
      }
    >

      {/* Body: Line Chart (Always shown — renders clean straight flat line when no data yet) */}
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

            {validSleeps.length === 0 ? (
              <path
                d={flatBaselineD}
                fill="none"
                className="stroke-zinc-900/40 dark:stroke-white/40 transition-all duration-300"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <>
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
              </>
            )}
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
    </FlippableMetricCard>
  );
}

// ─── 4. Meal Control Widget (Adherence Bar + Carbs/Protein/Fat Donut Chart) ──
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
  const todayNutr = extractNutritionFromMealNotes(todayDay?.userProgress?.mealNotes);

  const displayCarbsG = todayNutr.carbsG;
  const displayProteinG = todayNutr.proteinG;
  const displayFatG = todayNutr.fatG;

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
    <FlippableMetricCard
      title="Meal Control"
      icon={<FillUtensilsIcon />}
      frontClassName="space-y-4"
      valueSlot={
        <MetricValueDisplay value={String(pct)} unit="%" delta={deltaPct} deltaUnit="%" />
      }
      infoContent={
        <p>
          Average Meal Control score across elapsed days (Full/Similar = 100%, Partial =
          50%, Skipped = 0%). Donut chart shows today&apos;s Carbs, Protein, and Fat ratio
          in grams.
        </p>
      }
    >

      {/* 50-segment bar */}
      <div className="pt-0.5">
        <FiftyBarMeter percent={pct} />
      </div>

      {/* Carbs / Protein / Fat Donut Chart */}
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
    </FlippableMetricCard>
  );
}

// ─── Monochrome Rice Bowl Icon (400 kcal per bowl, proportional fill) ────────
function MonochromeRiceBowl({
  fillRatio,
  bowlIndex,
  bowlKcal,
}: {
  fillRatio: number;
  bowlIndex: number;
  bowlKcal: number;
}) {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(1, fillRatio));
  const shapeTop = 4.6;
  const shapeBottom = 23;
  const shapeHeight = shapeBottom - shapeTop;
  const fillH = clamped * shapeHeight;
  const fillY = shapeBottom - fillH;
  const filledKcal = Math.round(clamped * bowlKcal);

  const riceMoundPath = "M5.2 11.1C5.9 7.2 8.7 4.6 12 4.6s6.1 2.6 6.8 6.5H5.2Z";
  const bowlBodyPath =
    "M2.6 12.6h18.8a.8.8 0 0 1 .8.8c0 3.85-2.6 6.85-6.35 7.6v1a1 1 0 0 1-1 1H9.15a1 1 0 0 1-1-1v-1C4.4 20.25 1.8 17.25 1.8 13.4a.8.8 0 0 1 .8-.8Z";

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 sm:w-7 sm:h-7 shrink-0"
      role="img"
      aria-label={`Bowl ${bowlIndex + 1}: ${filledKcal}/${bowlKcal} kcal`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={riceMoundPath} />
          <path d={bowlBodyPath} />
        </clipPath>
      </defs>

      {/* Empty Rice Bowl Silhouette */}
      <path
        d={riceMoundPath}
        fill="currentColor"
        className="text-zinc-300/80 dark:text-white/15"
      />
      <path
        d={bowlBodyPath}
        fill="currentColor"
        className="text-zinc-300/80 dark:text-white/15"
      />

      {/* Monochrome Fill (rises from bottom based on today's calorie intake) */}
      {fillH > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="0"
            y={fillY}
            width="24"
            height={fillH + 1}
            fill="currentColor"
            className="text-zinc-950 dark:text-white transition-all duration-300"
          />
        </g>
      )}
    </svg>
  );
}

// ─── 5. Calories Widget (Flame Icon Header + 5 Monochrome Rice Bowls = 2000 kcal) ─
function CaloriesWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const BOWL_SIZE_KCAL = 400;
  const BOWL_COUNT = 5;

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todayCalories = extractNutritionFromMealNotes(
    todayDay?.userProgress?.mealNotes
  ).calories;

  const loggedCalorieDays = elapsedDays
    .map((d) => extractNutritionFromMealNotes(d.userProgress?.mealNotes))
    .filter((n) => n.hasMealData && n.calories > 0);

  let caloriesDelta = 0;
  if (loggedCalorieDays.length >= 2) {
    const latestCal = loggedCalorieDays[loggedCalorieDays.length - 1].calories;
    const prevSlice = loggedCalorieDays.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, n) => acc + n.calories, 0) / prevSlice.length;
    caloriesDelta = Math.round(latestCal - prevAvg);
  }

  return (
    <FlippableMetricCard
      title="Calories"
      icon={<FillFlameIcon />}
      frontClassName="space-y-3"
      valueSlot={
        <MetricValueDisplay
          value={todayCalories > 0 ? todayCalories.toLocaleString() : "0"}
          unit="kcal"
          delta={caloriesDelta}
          deltaUnit=" kcal"
        />
      }
      infoContent={
        <p>
          Sum of calories from today&apos;s Meal Control (1 bowl = 400 kcal). Delta =
          today vs. prior logged avg.
        </p>
      }
    >
      {/* 5 Monochrome Rice Bowls (400 kcal each = 2,000 kcal) filled proportionally */}
      <div className="flex items-end justify-between gap-1 pt-1 h-9 sm:h-10">
        {Array.from({ length: BOWL_COUNT }, (_, idx) => {
          const fillRatio = (todayCalories - idx * BOWL_SIZE_KCAL) / BOWL_SIZE_KCAL;
          return (
            <MonochromeRiceBowl
              key={idx}
              bowlIndex={idx}
              bowlKcal={BOWL_SIZE_KCAL}
              fillRatio={fillRatio}
            />
          );
        })}
      </div>
    </FlippableMetricCard>
  );
}

// ─── Monochrome Water Bottle Icon (Standard 500 ml bottle, proportional fill) ─
function MonochromeWaterBottle({
  fillRatio,
  bottleIndex,
  bottleMl,
}: {
  fillRatio: number;
  bottleIndex: number;
  bottleMl: number;
}) {
  const clipId = useId();
  const clamped = Math.max(0, Math.min(1, fillRatio));
  const bodyTop = 6.5;
  const bodyBottom = 36.5;
  const bodyHeight = bodyBottom - bodyTop;
  const fillH = clamped * bodyHeight;
  const fillY = bodyBottom - fillH;
  const filledMl = Math.round(clamped * bottleMl);
  const isFull = clamped >= 0.999;

  const bottleBodyPath =
    "M9.2 6.5h5.6v2.2c0 .7.38 1.35.98 1.72l2.14 1.32A2.8 2.8 0 0 1 19.25 14.1v19.4a3 3 0 0 1-3 3h-8.5a3 3 0 0 1-3-3V14.1a2.8 2.8 0 0 1 1.33-2.36l2.14-1.32c.6-.37.98-1.02.98-1.72V6.5Z";

  return (
    <svg
      viewBox="0 0 24 38"
      className="w-5 h-8 sm:w-6 sm:h-9 shrink-0"
      role="img"
      aria-label={`Bottle ${bottleIndex + 1}: ${filledMl}/${bottleMl} ml`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={bottleBodyPath} />
        </clipPath>
      </defs>

      {/* Bottle Cap */}
      <rect
        x="8.2"
        y="1.2"
        width="7.6"
        height="3.6"
        rx="1.2"
        fill="currentColor"
        className={
          isFull
            ? "text-zinc-950 dark:text-white transition-colors duration-300"
            : "text-zinc-400/75 dark:text-white/25 transition-colors duration-300"
        }
      />

      {/* Empty Bottle Silhouette */}
      <path
        d={bottleBodyPath}
        fill="currentColor"
        className="text-zinc-300/80 dark:text-white/15"
      />

      {/* Monochrome Liquid Fill (rises from bottom based on today's intake) */}
      {fillH > 0 && (
        <g clipPath={`url(#${clipId})`}>
          <rect
            x="0"
            y={fillY}
            width="24"
            height={fillH + 1}
            fill="currentColor"
            className="text-zinc-950 dark:text-white transition-all duration-300"
          />
        </g>
      )}
    </svg>
  );
}

// ─── 6. Water / Hydration Widget (5 Standard 500 ml Bottles = 2.5 L Daily) ───
function HydrationWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const BOTTLE_SIZE_ML = 500;
  const BOTTLE_COUNT = 5;

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todayWaterMl = extractNutritionFromMealNotes(
    todayDay?.userProgress?.mealNotes
  ).waterMl;

  const loggedWaterDays = elapsedDays
    .map((d) => extractNutritionFromMealNotes(d.userProgress?.mealNotes).waterMl)
    .filter((ml) => ml > 0);

  let waterDeltaMl = 0;
  if (loggedWaterDays.length >= 2) {
    const latestMl = loggedWaterDays[loggedWaterDays.length - 1];
    const prevSlice = loggedWaterDays.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, ml) => acc + ml, 0) / prevSlice.length;
    waterDeltaMl = Math.round(latestMl - prevAvg);
  }

  return (
    <FlippableMetricCard
      title="Water"
      icon={<FillDropletIcon />}
      frontClassName="space-y-3"
      valueSlot={
        <MetricValueDisplay
          value={(todayWaterMl / 1000).toFixed(1)}
          unit="L"
          delta={waterDeltaMl}
          deltaUnit=" ml"
        />
      }
      infoContent={
        <p>
          Total water logged in today&apos;s Water Intake (1 bottle = 500 ml). Delta =
          today vs. prior logged avg.
        </p>
      }
    >
      {/* Standard 500 ml Water Bottles filled proportionally in monochrome */}
      <div className="flex items-end justify-between gap-1 pt-1 h-9 sm:h-10">
        {Array.from({ length: BOTTLE_COUNT }, (_, idx) => {
          const fillRatio = (todayWaterMl - idx * BOTTLE_SIZE_ML) / BOTTLE_SIZE_ML;
          return (
            <MonochromeWaterBottle
              key={idx}
              bottleIndex={idx}
              bottleMl={BOTTLE_SIZE_ML}
              fillRatio={fillRatio}
            />
          );
        })}
      </div>
    </FlippableMetricCard>
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
    <section className="w-full space-y-3 sm:space-y-4">
      {/* Row 1 (50/50): Weight & Commitment */}
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

      {/* Row 2 (50/50): Calories & Water */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <CaloriesWidget days={sorted} currentDayNumber={currentDayNumber} />
        <HydrationWidget days={sorted} currentDayNumber={currentDayNumber} />
      </div>

      {/* Row 3: Training (7-Column Heatmap Grid - 5 Monochrome Grey Variants) */}
      <TrainingWidget
        days={sorted}
        pct={trainingPct}
        currentDayNumber={currentDayNumber}
        deltaPct={trainingDelta}
      />

      {/* Row 4: Sleep Average (Interactive Line Chart + Delta in Minutes) */}
      <SleepWidget
        days={sorted}
        deltaMins={sleepDeltaMins}
        currentDayNumber={currentDayNumber}
      />

      {/* Row 5: Meal Control (50-Segment Bar + Carbs/Protein/Fat Donut Chart) */}
      <MealControlWidget
        days={sorted}
        pct={mealPct}
        deltaPct={mealDelta}
        currentDayNumber={currentDayNumber}
      />
    </section>
  );
}
