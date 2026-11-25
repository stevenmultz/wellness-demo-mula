"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, BarChart3, Info } from "lucide-react";
import { extractNutritionFromMealNotes } from "@/wellness/utils/nutrition";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { getWibDayOfWeek } from "@/wellness/utils/timezone";
import {
  COMMITMENT_WEIGHTS_NO_CUSTOM,
  COMMITMENT_WEIGHTS_WITH_CUSTOM,
  STEPS_AVG_MIN,
  STEPS_GOOD_MIN,
  STEPS_TARGET_DAILY,
  WATER_BOTTLE_ML,
  WATER_TARGET_ML,
  computeDailyCaloriesSummary,
  computeDayCommitmentScore,
  computeMacroCalorieSplit,
  computePersonalizedCalorieTarget,
  rateNetCalories,
  ratePercentageScore,
  rateSleepMinutes,
  rateStepsCount,
  rateWaterMl,
  rateWeeklyWeightChangeKg,
  type MetricRating,
} from "@/wellness/utils/wellness-metrics";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { InfoPopupModal } from "../shared";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import {
  FillDropletIcon,
  FillDumbbellIcon,
  FillFlameIcon,
  FillFootprintsIcon,
  FillMoonIcon,
  FillScaleIcon,
  FillTargetIcon,
  FillUtensilsIcon,
} from "../sharedFillIcons";
import {
  calcSleepMins,
  checkedList,
  formatSleepHours,
  isMovementChecked,
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
  neutralDelta = false,
}: {
  value: string;
  unit?: string;
  delta?: number;
  deltaUnit?: string;
  showDelta?: boolean;
  neutralDelta?: boolean;
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
        <MetricDeltaBadge delta={delta} unit={deltaUnit} neutral={neutralDelta} />
      )}
    </div>
  );
}

// ─── MetricDeltaBadge (Small label-sized indicator, bottom-aligned next to value) ─
function MetricDeltaBadge({
  delta,
  unit = "%",
  neutral = false,
}: {
  delta: number;
  unit?: string;
  neutral?: boolean;
}) {
  const absVal = Math.abs(delta);
  const label = `${absVal}${unit}`;

  if (neutral) {
    return (
      <span className="semantic-badge-box inline-flex items-center gap-0.5 px-1.5 py-[2.5px] rounded-md border border-zinc-300 dark:border-white/15 bg-white/75 dark:bg-white/[0.06] text-[10px] font-mono font-semibold text-zinc-700 dark:text-zinc-200 leading-[1.25] mb-[2px]">
        {delta > 0 && <ArrowUp className="w-2.5 h-2.5 stroke-[2.5] shrink-0" />}
        {delta < 0 && <ArrowDown className="w-2.5 h-2.5 stroke-[2.5] shrink-0" />}
        <span>{delta === 0 ? `0${unit}` : label}</span>
      </span>
    );
  }

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

// ─── Unified Metric Card Wrapper with Top-Right 90° Bookmark Indicator ───────
function FlippableMetricCard({
  title,
  label,
  periodLabel,
  icon,
  valueSlot,
  status,
  infoContent: _infoContent,
  frontClassName = "space-y-3",
  children,
}: {
  title: string;
  label?: ReactNode;
  periodLabel?: string;
  icon: ReactNode;
  valueSlot: ReactNode;
  status?: MetricRating;
  infoContent?: ReactNode;
  frontClassName?: string;
  children?: ReactNode;
}) {
  void _infoContent;

  const badgeLabel =
    status === "good" ? "GOOD" : status === "avg" ? "AVG" : status === "bad" ? "BAD" : null;
  const badgeColorCls =
    status === "good"
      ? "bg-[var(--semantic-green)] text-white"
      : status === "avg"
        ? "bg-[var(--semantic-yellow)] text-white"
        : "bg-[var(--semantic-red)] text-white";

  return (
    <div className="relative overflow-hidden w-full h-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5">
      {badgeLabel && (
        <div
          aria-label={`Status: ${badgeLabel}`}
          title={`Status: ${badgeLabel}`}
          className={`semantic-badge-box absolute top-0 right-2.5 sm:right-3 w-5 sm:w-[22px] h-11 sm:h-12 flex items-center justify-center shadow-xs select-none pointer-events-none ${badgeColorCls}`}
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
          }}
        >
          <span
            className="text-[8px] sm:text-[9px] font-mono font-bold tracking-[0.12em] uppercase leading-none pb-1.5"
            style={{ writingMode: "vertical-rl" }}
          >
            {badgeLabel}
          </span>
        </div>
      )}

      <div className={frontClassName}>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 min-w-0 pr-7" title={title}>
            <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
              {icon}
            </span>
            <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
              {label ?? title}
            </span>
            {periodLabel && (
              <span className="text-[10px] font-mono font-normal text-zinc-400 dark:text-zinc-500 shrink-0 leading-none">
                {periodLabel}
              </span>
            )}
          </div>

          {valueSlot}
        </div>

        {children}
      </div>
    </div>
  );
}

// ─── 1. Body Weight Widget (Global Timestamp-Sorted, Neutral Monochrome Delta) ─
interface TimestampedWeightPoint {
  recordedMs: number;
  weightKg: number;
}

function WeightSummaryWidget({
  days,
  bodyMetricLogs = [],
}: {
  days: PlanDay[];
  bodyMetricLogs?: BodyMetricPoint[];
  programId?: string;
  currentDayNumber?: number;
}) {
  const byDayBucket = new Map<string, TimestampedWeightPoint>();

  // Include ALL global body weight logs across programs & self-logs sorted by real timestamp
  for (const log of bodyMetricLogs) {
    if (typeof log.weightKg === "number" && log.weightKg > 20 && log.weightKg < 300) {
      const ts = new Date(log.recordedAt).getTime();
      if (!Number.isFinite(ts)) continue;
      const dayKey = new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 10);
      const prev = byDayBucket.get(dayKey);
      if (!prev || ts >= prev.recordedMs) {
        byDayBucket.set(dayKey, {
          recordedMs: ts,
          weightKg: Number(log.weightKg.toFixed(1)),
        });
      }
    }
  }

  for (const d of days) {
    for (const ct of d.customTasks || []) {
      const vals = ct.submission?.values;
      if (vals && typeof vals === "object") {
        const rawW =
          (vals as Record<string, unknown>).weightKg ??
          (vals as Record<string, unknown>).weight;
        const numW = Number(rawW);
        if (Number.isFinite(numW) && numW > 20 && numW < 300) {
          const ts = ct.submission?.submittedAt
            ? new Date(ct.submission.submittedAt).getTime()
            : d.unlockDate
              ? new Date(d.unlockDate).getTime()
              : Date.now();
          if (!Number.isFinite(ts)) continue;
          const dayKey = new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 10);
          const prev = byDayBucket.get(dayKey);
          if (!prev || ts >= prev.recordedMs) {
            byDayBucket.set(dayKey, {
              recordedMs: ts,
              weightKg: Number(numW.toFixed(1)),
            });
          }
        }
      }
    }
  }

  const sortedPoints = Array.from(byDayBucket.values()).sort(
    (a, b) => a.recordedMs - b.recordedMs
  );

  const latestPoint =
    sortedPoints.length > 0 ? sortedPoints[sortedPoints.length - 1] : null;
  const latestWeight = latestPoint ? latestPoint.weightKg : 0;

  // Find closest reference log ~30 days prior (monthly weight change)
  const DAY_MS = 24 * 60 * 60 * 1000;
  let monthlyDeltaKg: number | null = null;
  let weeklyEquivDeltaKg: number | null = null;
  if (latestPoint && sortedPoints.length >= 2) {
    const targetMs = latestPoint.recordedMs - 30 * DAY_MS;
    const priorPoints = sortedPoints.slice(0, -1);
    let referencePoint = priorPoints[0];
    let bestDist = Math.abs(referencePoint.recordedMs - targetMs);
    for (const pt of priorPoints) {
      const dist = Math.abs(pt.recordedMs - targetMs);
      if (dist < bestDist) {
        bestDist = dist;
        referencePoint = pt;
      }
    }
    monthlyDeltaKg = Number((latestWeight - referencePoint.weightKg).toFixed(1));
    const elapsedWeeks = Math.max(
      1,
      (latestPoint.recordedMs - referencePoint.recordedMs) / (7 * DAY_MS)
    );
    weeklyEquivDeltaKg = Number((monthlyDeltaKg / elapsedWeeks).toFixed(2));
  }

  const weightStatus = rateWeeklyWeightChangeKg(weeklyEquivDeltaKg, sortedPoints.length);

  return (
    <FlippableMetricCard
      title="Weight"
      periodLabel="/ mo"
      icon={<FillScaleIcon />}
      status={weightStatus}
      frontClassName="space-y-0"
      valueSlot={
        <MetricValueDisplay
          value={latestWeight > 0 ? latestWeight.toFixed(1) : "—"}
          unit={latestWeight > 0 ? "kg" : undefined}
          delta={monthlyDeltaKg ?? undefined}
          deltaUnit=" kg"
          showDelta={monthlyDeltaKg !== null}
          neutralDelta
        />
      }
    />
  );
}

// ─── 2. Program Commitment Widget (50/50 Card, Overall Holistic Score) ───────
function ProgramCommitmentWidget({
  pct,
  deltaPct = 0,
  hasData = true,
}: {
  pct: number;
  deltaPct?: number;
  hasData?: boolean;
}) {
  const commitmentStatus = ratePercentageScore(pct, hasData);

  return (
    <FlippableMetricCard
      title="Program Commitment"
      label={
        <>
          <span className="hidden sm:inline">Program </span>Commitment
        </>
      }
      icon={<FillTargetIcon />}
      status={commitmentStatus}
      frontClassName="space-y-0"
      valueSlot={
        <MetricValueDisplay
          value={hasData ? String(pct) : "—"}
          unit={hasData ? "%" : undefined}
          delta={deltaPct}
          deltaUnit="%"
          showDelta={hasData}
        />
      }
    />
  );
}

// ─── 3. Training Ratio & Widget (Decoupled from Sleep/Water; WIB Weekday Safe) ─
type TrainingStatus = "full" | "partial" | "rest" | "skipped" | "pending" | "future";

function resolveActiveWorkoutOptionName(d: PlanDay): string | null {
  const groups = parseWorkoutOptionGroups(d.workoutOptions, d.videoChecklist);
  return d.userProgress?.selectedWorkout || groups[0]?.optionName || null;
}

export function computeTrainingDayRatio(d: PlanDay): number {
  if (typeof d.globalTrainingScheduled === "number") {
    if (d.globalTrainingScheduled <= 0) return 0;
    const completed = Math.max(
      0,
      Math.min(d.globalTrainingScheduled, d.globalTrainingCompleted ?? 0)
    );
    return completed / d.globalTrainingScheduled;
  }
  if (d.dayType !== "TRAINING_DAY") return 0;
  const p = d.userProgress;
  if (!p) return 0;
  if (p.selectedWorkout === "SKIPPED" || p.workoutNotes === "SKIPPED") return 0;

  const acts = movementNames(d);
  const checks = checkedList(d, undefined);
  const activeOptionName = resolveActiveWorkoutOptionName(d);

  if (acts.length > 0) {
    const matchedCount = acts.filter((name) =>
      isMovementChecked(checks, activeOptionName, name)
    ).length;
    if (matchedCount >= acts.length) return 1;
    if (p.isCompleted) return 1;
    if (matchedCount > 0) return matchedCount / acts.length;
    // Opening video alone gives modest partial progress (0.25), never fake 100%
    if (p.videoWatched || (p.selectedWorkout && p.selectedWorkout !== "SKIPPED")) {
      return 0.25;
    }
    return 0;
  }

  if (p.isCompleted || (p.workoutNotes && p.workoutNotes !== "SKIPPED")) return 1;
  if (p.videoWatched || (p.selectedWorkout && p.selectedWorkout !== "SKIPPED")) return 0.5;
  return 0;
}

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

  const ratio = computeTrainingDayRatio(d);
  if (ratio >= 1) return "full";
  if (ratio > 0) return "partial";
  if (isFuture) return "future";
  // No Morning Penalty: active today before 23:59 WIB cutoff is pending, never skipped
  if (currentDayNumber && d.dayNumber === currentDayNumber && !d.isPast2359) {
    return "pending";
  }
  return "skipped";
}

function TrainingWidget({
  days,
  pct,
  currentDayNumber,
  deltaPct = 0,
  hasData = true,
}: {
  days: PlanDay[];
  pct: number;
  currentDayNumber?: number;
  deltaPct?: number;
  hasData?: boolean;
}) {
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const selectedDay =
    sortedDays.find((d) => d.dayNumber === selectedDayNum) || null;

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  // 7 columns: Sun to Sat strictly aligned to WIB (UTC+7)
  const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDay = sortedDays[0];
  const startDayOfWeek = firstDay?.unlockDate ? getWibDayOfWeek(firstDay.unlockDate) : 0;
  const totalSlots = Math.max(
    7,
    Math.ceil((startDayOfWeek + sortedDays.length) / 7) * 7
  );

  const getDayCompletionFraction = (d: PlanDay): string => {
    const status = getTrainingDayStatus(d, currentDayNumber);

    if (status === "future") {
      return "-";
    }

    if (typeof d.globalTrainingScheduled === "number") {
      if (d.globalTrainingScheduled <= 0) return "Rest";
      const completed = Math.max(
        0,
        Math.min(d.globalTrainingScheduled, d.globalTrainingCompleted ?? 0)
      );
      return `${completed}/${d.globalTrainingScheduled} Training`;
    }

    if (d.dayType === "TRAINING_DAY") {
      const acts = movementNames(d);
      if (acts.length > 0) {
        const checks = checkedList(d, undefined);
        const activeOptionName = resolveActiveWorkoutOptionName(d);
        const done = d.userProgress?.isCompleted
          ? acts.length
          : acts.filter((name) =>
              isMovementChecked(checks, activeOptionName, name)
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
          : acts.filter((name) => isMovementChecked(checks, null, name)).length;
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

  const trainingStatus = ratePercentageScore(pct, hasData);

  return (
    <FlippableMetricCard
      title="Training"
      periodLabel="/ mo"
      icon={<FillDumbbellIcon />}
      status={trainingStatus}
      frontClassName="space-y-3.5"
      valueSlot={
        <MetricValueDisplay
          value={hasData ? String(pct) : "—"}
          unit={hasData ? "%" : undefined}
          delta={deltaPct}
          deltaUnit="%"
          showDelta={hasData}
        />
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
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : Number.MAX_SAFE_INTEGER;
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

  const validSleeps = sleepData.filter((s) => s.day <= todayDayNum && s.mins > 0);
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

  // Connect ONLY logged sleep points (prevents fake 0h spikes on unlogged/rest/future days)
  const loggedPoints = points.filter((pt) => pt.mins > 0);
  const pathD = loggedPoints.reduce((acc, pt, idx) => {
    return idx === 0
      ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`
      : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const areaD =
    loggedPoints.length >= 2
      ? `${pathD} L ${loggedPoints[loggedPoints.length - 1].x.toFixed(1)} ${svgH - padY} L ${loggedPoints[0].x.toFixed(1)} ${svgH - padY} Z`
      : "";

  const targetY = (svgH - padY - (TARGET / CEILING) * usableH).toFixed(1);
  const baselineY = (svgH - padY).toFixed(1);
  const flatBaselineD = `M ${padX.toFixed(1)} ${baselineY} L ${(svgW - padX).toFixed(1)} ${baselineY}`;

  const selectedPoint = points.find((pt) => pt.day === selectedDayNum) || null;
  const avgHours = avgMins > 0 ? Math.floor(avgMins / 60) : 0;
  const avgRemMins = avgMins > 0 ? Math.round(avgMins % 60) : 0;

  const sleepStatus = rateSleepMinutes(avgMins);

  return (
    <FlippableMetricCard
      title="Sleep Average"
      periodLabel="/ mo"
      icon={<FillMoonIcon />}
      status={sleepStatus}
      frontClassName="space-y-3.5"
      valueSlot={
        validSleeps.length === 0 ? (
          <div className="flex items-end gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white tabular-nums leading-[1.08]">
              —
            </span>
          </div>
        ) : (
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
            {validSleeps.length >= 2 && (
              <MetricDeltaBadge delta={deltaMins} unit=" min" />
            )}
          </div>
        )
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

// ─── 4. Macros Widget (30-Day Caloric 4/4/9 Carbs / Protein / Fat Donut Chart) ─
function MacrosWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const getDayMacros = (d: PlanDay | undefined) => {
    const p = d?.userProgress;
    if (!p) return { carbsG: 0, proteinG: 0, fatG: 0 };
    if ((p.carbsG ?? 0) > 0 || (p.proteinG ?? 0) > 0 || (p.fatG ?? 0) > 0) {
      return {
        carbsG: p.carbsG ?? 0,
        proteinG: p.proteinG ?? 0,
        fatG: p.fatG ?? 0,
      };
    }
    const legacy = extractNutritionFromMealNotes(p.mealNotes);
    return { carbsG: legacy.carbsG, proteinG: legacy.proteinG, fatG: legacy.fatG };
  };

  // 30-day average macros across logged days (Carbs, Protein, Fat)
  const loggedMacroDays = days
    .filter((d) => d.dayNumber <= todayDayNum)
    .slice(-30)
    .map(getDayMacros)
    .filter((m) => m.carbsG > 0 || m.proteinG > 0 || m.fatG > 0);

  const displayCarbsG =
    loggedMacroDays.length > 0
      ? Math.round(
          loggedMacroDays.reduce((a, m) => a + m.carbsG, 0) / loggedMacroDays.length
        )
      : 0;
  const displayProteinG =
    loggedMacroDays.length > 0
      ? Math.round(
          loggedMacroDays.reduce((a, m) => a + m.proteinG, 0) / loggedMacroDays.length
        )
      : 0;
  const displayFatG =
    loggedMacroDays.length > 0
      ? Math.round(
          loggedMacroDays.reduce((a, m) => a + m.fatG, 0) / loggedMacroDays.length
        )
      : 0;

  // Scientific caloric macro split (Carbs 4 kcal/g, Protein 4 kcal/g, Fat 9 kcal/g; sums strictly to 100%)
  const { carbsPct, proteinPct, fatPct } = computeMacroCalorieSplit(
    displayCarbsG,
    displayProteinG,
    displayFatG
  );

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const carbsLen = (carbsPct / 100) * circumference;
  const proteinLen = (proteinPct / 100) * circumference;
  const fatLen = (fatPct / 100) * circumference;

  return (
    <FlippableMetricCard
      title="Macros"
      periodLabel="/ mo"
      icon={<FillUtensilsIcon />}
      frontClassName="space-y-3"
      valueSlot={null}
    >
      {/* Carbs / Protein / Fat Donut Chart (% of daily calories: 4/4/9) */}
      <div className="flex items-center gap-5 pt-1">
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

// ─── 5. Calories Widget (Personalized Mifflin-St Jeor + Consistent Net Calories) ─
function CaloriesWidget({
  days,
  currentDayNumber,
  calorieTarget,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
  calorieTarget: ReturnType<typeof computePersonalizedCalorieTarget>;
}) {
  const BOWL_COUNT = 5;
  const bowlSizeKcal = Math.max(250, Math.round(calorieTarget.targetKcal / BOWL_COUNT));

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const getDayCalSummary = (d: PlanDay | undefined) => {
    const p = d?.userProgress;
    const foodKcal =
      (p?.caloriesKcal ?? 0) > 0
        ? p!.caloriesKcal!
        : extractNutritionFromMealNotes(p?.mealNotes).calories;
    return computeDailyCaloriesSummary({
      foodKcal,
      stepsCount: p?.stepsCount ?? 0,
      stepsBurnedKcal: p?.stepsBurnedKcal,
      extraWorkouts: p?.extraWorkouts ?? [],
    });
  };

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todaySummary = getDayCalSummary(todayDay);
  const todayNetKcal = todaySummary.netKcal;

  // Apples-to-apples Net Calories delta (anchored strictly to today if food is logged)
  const priorLoggedNet = elapsedDays
    .filter((d) => d.dayNumber < todayDayNum)
    .map(getDayCalSummary)
    .filter((s) => s.hasFoodLogged);

  let caloriesDelta: number | undefined;
  if (todaySummary.hasFoodLogged && priorLoggedNet.length >= 1) {
    const prevAvg =
      priorLoggedNet.reduce((acc, s) => acc + s.netKcal, 0) / priorLoggedNet.length;
    caloriesDelta = Math.round(todayNetKcal - prevAvg);
  }

  const caloriesStatus = rateNetCalories(
    todayNetKcal,
    todaySummary.hasFoodLogged,
    calorieTarget
  );

  return (
    <FlippableMetricCard
      title="Calories"
      periodLabel="/ day"
      icon={<FillFlameIcon />}
      status={caloriesStatus}
      frontClassName="space-y-3"
      valueSlot={
        <MetricValueDisplay
          value={todaySummary.hasFoodLogged ? todayNetKcal.toLocaleString() : "0"}
          unit="kcal"
          delta={caloriesDelta}
          deltaUnit=" kcal"
          showDelta={caloriesDelta !== undefined}
          neutralDelta
        />
      }
    >
      {/* 5 Monochrome Rice Bowls scaled to personalized daily calorie target */}
      <div className="flex items-end justify-between gap-1 pt-1 h-9 sm:h-10">
        {Array.from({ length: BOWL_COUNT }, (_, idx) => {
          const fillRatio = (todayNetKcal - idx * bowlSizeKcal) / bowlSizeKcal;
          return (
            <MonochromeRiceBowl
              key={idx}
              bowlIndex={idx}
              bowlKcal={bowlSizeKcal}
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
  const BOTTLE_SIZE_ML = WATER_BOTTLE_ML;
  const BOTTLE_COUNT = Math.round(WATER_TARGET_ML / WATER_BOTTLE_ML);

  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;

  const getWaterMl = (d: PlanDay | undefined) => {
    if (!d?.userProgress) return 0;
    if (d.userProgress.waterMl !== undefined) return d.userProgress.waterMl;
    return extractNutritionFromMealNotes(d.userProgress.mealNotes).waterMl;
  };

  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todayWaterMl = getWaterMl(todayDay);

  // Anchor delta strictly to today (never display yesterday's stale delta when today is 0L)
  const priorLoggedWater = elapsedDays
    .filter((d) => d.dayNumber < todayDayNum)
    .map(getWaterMl)
    .filter((ml) => ml > 0);

  let waterDeltaMl: number | undefined;
  if (todayWaterMl > 0 && priorLoggedWater.length >= 1) {
    const prevAvg =
      priorLoggedWater.reduce((acc, ml) => acc + ml, 0) / priorLoggedWater.length;
    waterDeltaMl = Math.round(todayWaterMl - prevAvg);
  }

  const waterStatus = rateWaterMl(todayWaterMl, true);

  return (
    <FlippableMetricCard
      title="Water"
      periodLabel="/ day"
      icon={<FillDropletIcon />}
      status={waterStatus}
      frontClassName="space-y-3"
      valueSlot={
        <MetricValueDisplay
          value={(todayWaterMl / 1000).toFixed(2)}
          unit="L"
          delta={waterDeltaMl}
          deltaUnit=" ml"
          showDelta={waterDeltaMl !== undefined}
        />
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

// ─── 7. Daily Steps & More Training 50/50 Row ────────────────────────────────
function DailyStepsMetricWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;
  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);
  const todayDay = elapsedDays.find((d) => d.dayNumber === todayDayNum);
  const todaySteps = todayDay?.userProgress?.stepsCount ?? 0;

  const priorLogged = elapsedDays
    .filter((d) => d.dayNumber < todayDayNum)
    .map((d) => d.userProgress?.stepsCount ?? 0)
    .filter((s) => s > 0);

  let stepsDelta: number | undefined;
  if (todaySteps > 0 && priorLogged.length >= 1) {
    const prevAvg = priorLogged.reduce((acc, s) => acc + s, 0) / priorLogged.length;
    stepsDelta = Math.round(todaySteps - prevAvg);
  }

  const stepsStatus = rateStepsCount(todaySteps, true);

  return (
    <FlippableMetricCard
      title="Steps"
      periodLabel="/ day"
      icon={<FillFootprintsIcon />}
      status={stepsStatus}
      frontClassName="space-y-0"
      valueSlot={
        <MetricValueDisplay
          value={todaySteps.toLocaleString()}
          delta={stepsDelta}
          deltaUnit=""
          showDelta={stepsDelta !== undefined}
        />
      }
    />
  );
}

function MoreTrainingMetricWidget({
  days,
  currentDayNumber,
}: {
  days: PlanDay[];
  currentDayNumber?: number;
}) {
  const todayDayNum =
    currentDayNumber && currentDayNumber > 0 ? currentDayNumber : 1;
  const elapsedDays = days.filter((d) => d.dayNumber <= todayDayNum);

  let totalSessions = 0;
  let totalMins = 0;
  let totalKcal = 0;
  for (const d of elapsedDays) {
    for (const w of d.userProgress?.extraWorkouts ?? []) {
      totalSessions++;
      totalMins += w.durationMinutes;
      totalKcal += w.estimatedKcal;
    }
  }

  // Optional bonus activity: shows GOOD when active, never BAD when 0
  const extraStatus: MetricRating | undefined = totalSessions > 0 ? "good" : undefined;

  return (
    <FlippableMetricCard
      title="More Training"
      icon={<FillFlameIcon />}
      status={extraStatus}
      frontClassName="space-y-3"
      valueSlot={
        <MetricValueDisplay
          value={String(totalMins)}
          unit="min"
          showDelta={false}
        />
      }
    >
      <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 pt-0.5 truncate">
        {totalSessions > 0
          ? `${totalSessions} session${totalSessions > 1 ? "s" : ""} · -${totalKcal} kcal`
          : "Optional bonus sessions"}
      </p>
    </FlippableMetricCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CohortPerformanceCard({
  days,
  globalMonthlyDays,
  currentDayNumber,
  bodyMetricLogs = [],
  programId,
  userGender,
  userAge,
  onOpenGrowthAnalytics,
  onSwitchWidget: _onSwitchWidget,
}: {
  days: PlanDay[];
  globalMonthlyDays?: PlanDay[];
  currentDayNumber: number;
  bodyMetricLogs?: BodyMetricPoint[];
  programId?: string;
  userGender?: string | null;
  userAge?: number | null;
  onOpenGrowthAnalytics?: () => void;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _onSwitchWidget;
  const { locale } = useLocale();
  const isId = locale === "id";
  const [showMetricsInfo, setShowMetricsInfo] = useState(false);
  const useGlobalMonth = Boolean(globalMonthlyDays && globalMonthlyDays.length > 0);
  const sourceDays = useGlobalMonth ? globalMonthlyDays! : days;
  const sorted = [...sourceDays].sort((a, b) => a.dayNumber - b.dayNumber);
  const todayDayNum = useGlobalMonth
    ? sorted[sorted.length - 1]?.dayNumber || 30
    : currentDayNumber && currentDayNumber > 0
      ? currentDayNumber
      : 1;

  // Personalized Mifflin-St Jeor calorie target from chronologically latest weight & height + user profile
  const sortedBodyLogsDesc = [...bodyMetricLogs].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
  const latestWeightLog = sortedBodyLogsDesc.find(
    (l) => typeof l.weightKg === "number" && l.weightKg > 20 && l.weightKg < 300
  );
  const latestHeightLog = sortedBodyLogsDesc.find(
    (l) => typeof l.heightCm === "number" && l.heightCm > 100 && l.heightCm < 240
  );
  const calorieTarget = computePersonalizedCalorieTarget({
    gender: userGender,
    age: userAge,
    weightKg: latestWeightLog?.weightKg ?? null,
    heightCm: latestHeightLog?.heightCm ?? null,
  });

  // ── 1. Sleep Stats & Delta (New Average − Previous Average, matching Training) ─
  const validSleeps = sorted
    .filter((d) => d.dayNumber <= todayDayNum)
    .map((d) => ({
      dayNumber: d.dayNumber,
      mins: calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime),
    }))
    .filter((s) => s.mins > 0);

  let sleepDeltaMins = 0;
  if (validSleeps.length >= 2) {
    const currentAvg =
      validSleeps.reduce((acc, s) => acc + s.mins, 0) / validSleeps.length;
    const prevSlice = validSleeps.slice(0, -1);
    const prevAvg =
      prevSlice.reduce((acc, s) => acc + s.mins, 0) / prevSlice.length;
    sleepDeltaMins = Math.round(currentAvg - prevAvg);
  }

  // ── 2. Training Stats (Continuous ratio; No Morning Penalty on unlogged active today) ──
  const allTrainingUpToToday = sorted.filter(
    (d) => d.dayType === "TRAINING_DAY" && d.dayNumber <= todayDayNum
  );
  const closedTrainingDays = allTrainingUpToToday.filter(
    (d) => d.dayNumber < todayDayNum || d.isPast2359
  );
  const todayTrainingDay = allTrainingUpToToday.find(
    (d) => d.dayNumber === todayDayNum && !d.isPast2359
  );
  const trainingEvalDays =
    todayTrainingDay &&
    (computeTrainingDayRatio(todayTrainingDay) > 0 || closedTrainingDays.length === 0)
      ? [...closedTrainingDays, todayTrainingDay]
      : closedTrainingDays;
  const hasTrainingData =
    trainingEvalDays.length > 0 &&
    (closedTrainingDays.length > 0 || computeTrainingDayRatio(todayTrainingDay!) > 0);

  const computeSliceTrainingPct = (slice: PlanDay[]): number => {
    if (slice.length === 0) return 0;
    const isGlobalSlice = slice.some((d) => typeof d.globalTrainingScheduled === "number");
    if (isGlobalSlice) {
      let totalScheduled = 0;
      let totalCompleted = 0;
      for (const d of slice) {
        const sched = Math.max(0, d.globalTrainingScheduled ?? 0);
        const comp = Math.max(0, Math.min(sched, d.globalTrainingCompleted ?? 0));
        totalScheduled += sched;
        totalCompleted += comp;
      }
      return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    }
    return Math.round(
      (slice.reduce((acc, d) => acc + computeTrainingDayRatio(d), 0) / slice.length) * 100
    );
  };

  const trainingPct = computeSliceTrainingPct(trainingEvalDays);

  let trainingDelta = 0;
  if (trainingEvalDays.length >= 2) {
    const prevSlice = trainingEvalDays.slice(0, -1);
    const prevPct = computeSliceTrainingPct(prevSlice);
    trainingDelta = trainingPct - prevPct;
  }

  // ── 3. Meal Stats (No Morning Penalty on unlogged active today) ─────────────
  const getDayMealScore = (d: PlanDay): number => {
    const mc = d.userProgress?.mealCompliance;
    if (mc === "FULL" || mc === "YES" || mc === "SIMILAR") return 1;
    if (mc === "PARTIAL") return 0.5;
    return 0;
  };
  const hasMealEntry = (d: PlanDay | undefined) =>
    Boolean(d?.userProgress?.mealCompliance && d.userProgress.mealCompliance !== "SKIPPED");

  const closedDays = sorted.filter(
    (d) => d.dayNumber < todayDayNum || (d.dayNumber === todayDayNum && d.isPast2359)
  );
  const activeTodayDay = sorted.find((d) => d.dayNumber === todayDayNum && !d.isPast2359);

  const mealEvalDays =
    activeTodayDay && (hasMealEntry(activeTodayDay) || closedDays.length === 0)
      ? [...closedDays, activeTodayDay]
      : closedDays;
  const hasMealData =
    mealEvalDays.length > 0 && (closedDays.length > 0 || hasMealEntry(activeTodayDay));

  const mealPct =
    mealEvalDays.length > 0
      ? Math.round(
          (mealEvalDays.reduce((acc, d) => acc + getDayMealScore(d), 0) / mealEvalDays.length) *
            100
        )
      : 0;

  let mealDelta = 0;
  if (mealEvalDays.length >= 2) {
    const prevMealSlice = mealEvalDays.slice(0, -1);
    const prevMealPct = Math.round(
      (prevMealSlice.reduce((acc, d) => acc + getDayMealScore(d), 0) /
        prevMealSlice.length) *
        100
    );
    mealDelta = mealPct - prevMealPct;
  }

  // ── 4. Program Commitment (Unified 5-Task Weights; No Morning Penalty) ──────
  const computeDayCommitment = (d: PlanDay): number => {
    const p = d.userProgress;
    let activityRatio = 0;
    if (d.dayType === "TRAINING_DAY") {
      activityRatio = computeTrainingDayRatio(d);
    } else if (d.dayType === "REST_DAY") {
      const hasChecked = checkedList(d, undefined).length > 0;
      const hasNotes = Boolean(p?.workoutNotes && p.workoutNotes !== "SKIPPED");
      activityRatio = p?.isCompleted || hasChecked || hasNotes ? 1 : 0;
    } else {
      const hasFeedback = Boolean(p?.eventFeedback && p.eventFeedback !== "SKIPPED");
      activityRatio =
        p?.isCompleted || hasFeedback || checkedList(d, undefined).length > 0 ? 1 : 0;
    }

    const sleepMins = calcSleepMins(p?.bedtime, p?.wakeTime);
    const waterMl =
      p?.waterMl !== undefined
        ? p.waterMl
        : extractNutritionFromMealNotes(p?.mealNotes).waterMl;
    const stepsCount = p?.stepsCount ?? 0;
    const cTasks = d.customTasks || [];
    const customDoneCount = cTasks.filter((ct) => Boolean(ct.submission)).length;

    return computeDayCommitmentScore({
      activityRatio,
      mealCompliance: p?.mealCompliance,
      sleepMins,
      waterMl,
      stepsCount,
      customTotalCount: cTasks.length,
      customDoneCount,
    });
  };

  const todayHasAnyActivity = (d: PlanDay | undefined) => {
    if (!d) return false;
    return computeDayCommitment(d) > 0;
  };

  const commitmentEvalDays =
    activeTodayDay && (todayHasAnyActivity(activeTodayDay) || closedDays.length === 0)
      ? [...closedDays, activeTodayDay]
      : closedDays;
  const hasCommitmentData =
    commitmentEvalDays.length > 0 &&
    (closedDays.length > 0 || todayHasAnyActivity(activeTodayDay));

  const commitmentPct =
    commitmentEvalDays.length > 0
      ? Math.round(
          (commitmentEvalDays.reduce((acc, d) => acc + computeDayCommitment(d), 0) /
            commitmentEvalDays.length) *
            100
        )
      : 0;

  let commitmentDelta = 0;
  if (commitmentEvalDays.length >= 2) {
    const prevSlice = commitmentEvalDays.slice(0, -1);
    const prevCommitmentPct = Math.round(
      (prevSlice.reduce((acc, d) => acc + computeDayCommitment(d), 0) / prevSlice.length) *
        100
    );
    commitmentDelta = commitmentPct - prevCommitmentPct;
  }

  const wNoC = COMMITMENT_WEIGHTS_NO_CUSTOM;
  const wWithC = COMMITMENT_WEIGHTS_WITH_CUSTOM;

  return (
    <section className="w-full space-y-3 sm:space-y-4">
      {/* Row 1 (50/50): Weight (/mo) & Daily Steps (/day) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <WeightSummaryWidget
          days={sorted}
          bodyMetricLogs={bodyMetricLogs}
          programId={programId}
          currentDayNumber={todayDayNum}
        />
        <DailyStepsMetricWidget days={sorted} currentDayNumber={todayDayNum} />
      </div>

      {/* Row 2 (50/50): Calories (/day) & Water (/day) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <CaloriesWidget
          days={sorted}
          currentDayNumber={todayDayNum}
          calorieTarget={calorieTarget}
        />
        <HydrationWidget days={sorted} currentDayNumber={todayDayNum} />
      </div>

      {/* Row 3: Training (/mo - Global 30-Day Heatmap Grid, WIB Weekday Aligned) */}
      <TrainingWidget
        days={sorted}
        pct={trainingPct}
        currentDayNumber={todayDayNum}
        deltaPct={trainingDelta}
        hasData={hasTrainingData}
      />

      {/* Row 4: Sleep Average (/mo - 30-Day Line Chart + Delta in Minutes) */}
      <SleepWidget
        days={sorted}
        deltaMins={sleepDeltaMins}
        currentDayNumber={todayDayNum}
      />

      {/* Row 5: Macros (/mo - 30-Day Caloric 4/4/9 Carbs / Protein / Fat Donut Chart) */}
      <MacrosWidget
        days={sorted}
        currentDayNumber={todayDayNum}
      />

      {/* Row 7: 1-Year Lifetime Growth Analytics Launcher */}
      {onOpenGrowthAnalytics && (
        <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
                <BarChart3 className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
                {isId ? "Analitik Pertumbuhan 1 Tahun" : "1-Year Growth Analytics"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed truncate">
              {isId
                ? "Pantau tren tidur, langkah, air, kalori & berat badan lintas program (30H / 90H / 1T)."
                : "Track sleep, steps, hydration, calories & weight across all plans (30D / 90D / 1Y)."}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenGrowthAnalytics}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isId ? "Buka Tren" : "View Growth"}</span>
          </button>
        </div>
      )}

      {/* Row 8: Metrics Calculation & GOOD/AVG/BAD Info Widget */}
      <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] p-4 sm:p-5 border border-zinc-200/50 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-zinc-900 dark:text-white shrink-0 flex items-center">
              <Info className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate leading-normal py-[1px]">
              {isId ? "Panduan Kalkulasi Metrics" : "Metrics Calculation Guide"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed truncate">
            {isId
              ? "Lihat rumus setiap widget serta standar kriteria GOOD, AVG, dan BAD."
              : "See how each metric is calculated and what defines GOOD, AVG, and BAD."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowMetricsInfo(true)}
          className="px-3.5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{isId ? "Info Kalkulasi" : "View Info"}</span>
        </button>
      </div>

      <InfoPopupModal
        open={showMetricsInfo}
        title={isId ? "Kalkulasi & Kriteria Metrics" : "Metrics Formulas & Rating Criteria"}
        subtitle={
          isId
            ? "Penjelasan cara hitung setiap indikator dan status GOOD / AVG / BAD"
            : "How each widget is calculated and how GOOD / AVG / BAD badges are assigned"
        }
        onClose={() => setShowMetricsInfo(false)}
      >
        <div className="space-y-3 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-2 pb-1 border-b border-zinc-200/70 dark:border-white/10">
            <span className="semantic-badge-box px-2 py-0.5 rounded-md bg-[var(--semantic-green)] text-white font-mono text-[10px] font-bold">
              GOOD
            </span>
            <span className="semantic-badge-box px-2 py-0.5 rounded-md bg-[var(--semantic-yellow)] text-white font-mono text-[10px] font-bold">
              AVG
            </span>
            <span className="semantic-badge-box px-2 py-0.5 rounded-md bg-[var(--semantic-red)] text-white font-mono text-[10px] font-bold">
              BAD
            </span>
          </div>

          <ul className="space-y-2.5">
            <li>
              <strong className="text-zinc-950 dark:text-white">Weight (/ mo):</strong>{" "}
              {isId
                ? "Menggunakan seluruh catatan berat badan global berdasar tanggal asli. Delta membandingkan terhadap catatan terdekat ~30 hari sebelumnya."
                : "Uses global body weight logs sorted by timestamp. Delta compares to closest log ~30 days prior."}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                GOOD: ≤ 1.0 kg/mgg · AVG: 1.1–1.5 kg/mgg · BAD: &gt; 1.5 kg/mgg (butuh ≥ 2 log)
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Calories (Net):</strong>{" "}
              {isId
                ? `Kalori makanan dikurangi Steps (0.04 kcal/step) & aktivitas ekstra (kecuali yang ditandai sudah termasuk Steps). Target harian Anda: ${calorieTarget.targetKcal.toLocaleString()} kcal ${calorieTarget.isPersonalized ? "(Mifflin-St Jeor personal)" : "(standar)"}.`
                : `Food intake minus Steps (0.04 kcal/step) & extra workouts (excluding sessions already counted in Steps). Your daily target: ${calorieTarget.targetKcal.toLocaleString()} kcal ${calorieTarget.isPersonalized ? "(personalized Mifflin-St Jeor)" : "(baseline)"}.`}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                GOOD: {calorieTarget.goodMinKcal.toLocaleString()}–{calorieTarget.goodMaxKcal.toLocaleString()} kcal · AVG: {calorieTarget.avgLowMinKcal.toLocaleString()}–{(calorieTarget.goodMinKcal - 1).toLocaleString()} / {(calorieTarget.goodMaxKcal + 1).toLocaleString()}–{calorieTarget.avgHighMaxKcal.toLocaleString()}
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Water:</strong>{" "}
              {isId
                ? "Total konsumsi air hari ini (1 botol = 500 ml, target 2.5 L). Tersinkron otomatis lintas program."
                : "Total water logged today (1 bottle = 500 ml, 2.5 L target). Synced across all active plans."}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                GOOD: ≥ 2.0 L · AVG: 1.2–1.9 L · BAD: &lt; 1.2 L
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Steps (/ day):</strong>{" "}
              {isId
                ? `Target langkah harian ${STEPS_TARGET_DAILY.toLocaleString()} langkah (~40 kcal/1.000 langkah).`
                : `Daily goal ${STEPS_TARGET_DAILY.toLocaleString()} steps (~40 kcal/1,000 steps).`}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Steps — GOOD: ≥ {STEPS_GOOD_MIN.toLocaleString()} · AVG: {STEPS_AVG_MIN.toLocaleString()}–{(STEPS_GOOD_MIN - 1).toLocaleString()} · BAD: &lt; {STEPS_AVG_MIN.toLocaleString()}
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Training (/ mo):</strong>{" "}
              {isId
                ? "Gabungan global 30 hari terakhir dari seluruh program aktif Anda. Jika hari itu ada 3 program training dinilai 3/3; jika 1 rest maka 2/2 (hari rest tidak mengurangi skor)."
                : "Global 30-day aggregation across all your enrolled programs. If 3 programs have training that day it scores out of 3/3; if 1 is Rest it scores out of 2/2."}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                GOOD: ≥ 80% · AVG: 50%–79% · BAD: &lt; 50%
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Sleep Average:</strong>{" "}
              {isId
                ? "Rata-rata durasi tidur pada hari yang dicatat (1–18 jam valid). Grafik hanya menyambungkan hari yang tercatat."
                : "Average duration across logged sleep nights (1–18h valid). Line connects logged nights only."}
              <div className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                GOOD: 7–9 jam · AVG: 6–7 / 9–10 jam · BAD: &lt; 6 atau &gt; 10 jam
              </div>
            </li>

            <li>
              <strong className="text-zinc-950 dark:text-white">Macros (/ mo):</strong>{" "}
              {isId
                ? "Rata-rata pembagian makro harian selama 30 hari terakhir. Donut menampilkan % kalori makro (Karbo ×4, Protein ×4, Lemak ×9)."
                : "30-day average daily macro split. Donut displays % of total calories (Carbs ×4, Protein ×4, Fat ×9)."}
            </li>
          </ul>
        </div>
      </InfoPopupModal>
    </section>
  );
}
