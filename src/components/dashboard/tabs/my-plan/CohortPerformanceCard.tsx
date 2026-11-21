"use client";

import { useState } from "react";
import { Dumbbell, Moon, Utensils } from "lucide-react";
import {
  calcSleepMins,
  checkedList,
  formatShortDayDate,
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

// ─── 1. Sleep Widget (Line Chart Interactive) ─────────────────────────────────
function SleepWidget({ days }: { days: PlanDay[] }) {
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

          {/* X-axis labels */}
          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500 px-1">
            <span>Day {sleepData[0]?.day}</span>
            {sleepData.length > 2 && (
              <span>Day {sleepData[Math.floor(sleepData.length / 2)]?.day}</span>
            )}
            <span>Day {sleepData[sleepData.length - 1]?.day}</span>
          </div>

          {/* Detail card on clicking dot (Monochrome English) */}
          {selectedPoint && (
            <div className="rounded-xl bg-white/90 dark:bg-white/[0.08] p-2.5 sm:p-3 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Day {selectedPoint.day}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    · {formatShortDayDate(selectedPoint.unlockDate, selectedPoint.day)}
                  </span>
                </div>
                {selectedPoint.bedtime && selectedPoint.wakeTime ? (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {selectedPoint.bedtime} – {selectedPoint.wakeTime}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Recorded sleep duration
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-mono font-bold text-zinc-950 dark:text-white">
                  {selectedPoint.mins > 0
                    ? formatSleepHours(selectedPoint.mins)
                    : "0h"}
                </span>
                <span className="block text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                  {selectedPoint.mins >= TARGET
                    ? "Target achieved (≥ 7h 30m)"
                    : "Below target (< 7h 30m)"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. Training Widget (GitLab-Style Activity Heatmap 7 Columns) ─────────────
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
}: {
  days: PlanDay[];
  pct: number;
  currentDayNumber?: number;
}) {
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const sortedDays = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
  const selectedDay =
    sortedDays.find((d) => d.dayNumber === selectedDayNum) || null;
  const selectedStatus = selectedDay
    ? getTrainingDayStatus(selectedDay, currentDayNumber)
    : null;

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

      {/* 7-Column Grid (Sun to Sat) */}
      <div className="space-y-2 pt-1">
        {/* Column Headers: Sun Mon Tue Wed Thu Fri Sat */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono text-zinc-400 dark:text-zinc-500 text-center">
          {dayHeaders.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        {/* 7-Column Boxes: 3 Tones (Tone 1 Full, Tone 2 Partial, Tone 3 Dim Upcoming/Skip, Rest X) */}
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

            return (
              <button
                key={d.dayNumber}
                type="button"
                onClick={() =>
                  setSelectedDayNum((prev) =>
                    prev === d.dayNumber ? null : d.dayNumber
                  )
                }
                title={`Day ${d.dayNumber}: ${
                  status === "full"
                    ? "Completed"
                    : status === "partial"
                    ? "Partial"
                    : status === "rest"
                    ? "Rest Day"
                    : status === "future"
                    ? "Upcoming"
                    : "Skipped"
                }`}
                className={`aspect-square rounded-md sm:rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-zinc-950 dark:ring-white ring-offset-1 ring-offset-[#ececea] dark:ring-offset-zinc-900 "
                    : ""
                }${
                  status === "full"
                    ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-2xs"
                    : status === "partial"
                    ? "bg-zinc-400 dark:bg-white/50 text-white dark:text-zinc-900"
                    : status === "rest"
                    ? "bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10"
                    : "bg-zinc-200/70 dark:bg-white/[0.08] border border-zinc-300/40 dark:border-white/5"
                }`}
              >
                {status === "rest" && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-full h-full p-1.5 text-zinc-500 dark:text-zinc-400"
                  >
                    <line x1="19" y1="5" x2="5" y2="19" />
                    <line x1="5" y1="5" x2="19" y2="19" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail card on clicking box (Monochrome English - only appears when clicked) */}
        {selectedDay && (
          <div className="rounded-xl bg-white/90 dark:bg-white/[0.08] p-2.5 sm:p-3 border border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                  Day {selectedDay.dayNumber}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  · {formatShortDayDate(selectedDay.unlockDate, selectedDay.dayNumber)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {selectedStatus === "full"
                  ? "Workout completed"
                  : selectedStatus === "partial"
                  ? "Partially completed"
                  : selectedStatus === "rest"
                  ? "Rest day"
                  : selectedStatus === "future"
                  ? "Upcoming session"
                  : "Workout skipped"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-semibold text-zinc-950 dark:text-white uppercase">
                {selectedStatus === "full"
                  ? "Completed"
                  : selectedStatus === "partial"
                  ? "Partial"
                  : selectedStatus === "rest"
                  ? "Rest"
                  : selectedStatus === "future"
                  ? "Upcoming"
                  : "Skipped"}
              </span>
            </div>
          </div>
        )}
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
  currentDayNumber,
  onSwitchWidget: _onSwitchWidget,
}: {
  days: PlanDay[];
  currentDayNumber: number;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _onSwitchWidget;
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  // ── Training Stats ──────────────────────────────────────────────────────────
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
      {/* 1. Sleep (Interactive Line Chart) */}
      <SleepWidget days={sorted} />

      {/* 2. Training (14-Column Heatmap Grid) */}
      <TrainingWidget
        days={sorted}
        pct={trainingPct}
        currentDayNumber={currentDayNumber}
      />

      {/* 3. Meal Control (50 Garis + Status) */}
      <MealControlWidget pct={mealPct} />
    </section>
  );
}
