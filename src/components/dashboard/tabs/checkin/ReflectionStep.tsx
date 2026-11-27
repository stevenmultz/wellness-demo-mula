"use client";

import { ArrowLeft, Check, Clock, ExternalLink, MapPin, Video } from "lucide-react";
import type { PlanDay } from "../MyPlanTab";
import { HeaderBackButton, safeHttpUrl } from "../shared";
import {
  FACES,
  REFLECTION_DECLINED,
  areaCls,
  formatDuration,
  type MealDraft,
  type SubStepId,
} from "./checkInUtils";
import { StepHeader } from "./SleepMealSteps";

export function ReflectionStepView({
  currentSubStep,
  dayNumber,
  review,
  score,
  onChangeReview,
  onSelectScore,
  onSubmitShortcut,
}: {
  currentSubStep: SubStepId;
  dayNumber: number;
  review: string;
  score: number;
  onChangeReview: (next: string) => void;
  onSelectScore: (score: number) => void;
  onSubmitShortcut: () => void;
}) {
  if (currentSubStep === "reflection_journal") {
    const preferNotAnswer = review === REFLECTION_DECLINED;
    return (
      <div className="space-y-6 min-w-0">
        <StepHeader
          title="What is on your mind today?"
        />

        <textarea
          value={preferNotAnswer ? "" : review}
          onChange={(e) => onChangeReview(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onSubmitShortcut();
            }
          }}
          rows={5}
          maxLength={2000}
          placeholder="Write your journal, vent, or share any thoughts from today..."
          className={areaCls}
        />

        <button
          type="button"
          onClick={() => onChangeReview(preferNotAnswer ? "" : REFLECTION_DECLINED)}
          className={`w-full p-4 rounded-2xl border text-left transition select-none flex items-center justify-between gap-3 ${
            preferNotAnswer
              ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
              : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
          }`}
        >
          <div className="min-w-0">
            <p
              className={`text-sm font-semibold ${
                preferNotAnswer
                  ? "text-white dark:text-zinc-950"
                  : "text-zinc-950 dark:text-white"
              }`}
            >
              Prefer not to answer
            </p>
            <p
              className={`text-xs mt-0.5 leading-relaxed ${
                preferNotAnswer
                  ? "text-white/80 dark:text-zinc-950/80"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Keep today&apos;s journal private and continue to your mood rating.
            </p>
          </div>
          {preferNotAnswer && <Check className="w-4 h-4 shrink-0" />}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <StepHeader
        title="How was your mood & energy today?"
      />
      <div
        className="grid grid-cols-5 gap-2 sm:gap-2.5 pt-1 min-w-0"
        role="radiogroup"
        aria-label="Satisfaction Rating"
      >
        {FACES.map(({ score: n, Icon, label }) => {
          const active = score === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => onSelectScore(n)}
              className={`min-w-0 py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                active
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm"
                  : "border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={1.75} />
              <span className="text-[11px] font-medium truncate max-w-full">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LockedTaskSummaryView({
  day,
  step,
  taskTitle,
  isTaskDone,
  isPast,
  isTraining,
  isRest,
  isConnect,
  wake,
  bed,
  totalSleepMins,
  sleepFeeling,
  activeWorkout,
  checkedCount,
  movementsCount,
  trainingFeeling,
  connectAttendance,
  connectRating,
  mealDraft,
  waterMl = 0,
  urineColor,
  recommendedMealsCount,
  review,
  score,
  onClose,
}: {
  day: PlanDay;
  step: number;
  taskTitle: string;
  isTaskDone: boolean;
  isPast: boolean;
  isTraining: boolean;
  isRest: boolean;
  isConnect: boolean;
  wake: string;
  bed: string;
  totalSleepMins: number;
  sleepFeeling: string;
  activeWorkout: string;
  checkedCount: number;
  movementsCount: number;
  trainingFeeling: string;
  connectAttendance: "attend" | "cannot_attend" | null;
  connectRating: number;
  mealDraft: MealDraft;
  waterMl?: number;
  urineColor?: string | null;
  recommendedMealsCount: number;
  review: string;
  score: number;
  onClose: () => void;
}) {
  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
          <HeaderBackButton onClick={onClose} />
          <span
            className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
              isTaskDone
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            {isTaskDone ? "Completed" : isPast ? "Skipped" : "Locked"}
          </span>
        </div>
      </header>

      <div
        className="w-full max-w-xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-5 sm:pt-7 space-y-6"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="space-y-6">
          <StepHeader eyebrow={`Day ${day.dayNumber} · History Record`} title={taskTitle} />

          {!isTaskDone && isPast ? (
            <div className="py-10 px-5 rounded-2xl border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-center space-y-2">
              <Clock className="w-5 h-5 mx-auto text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Task Marked as Skipped
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                No entry was recorded before the 23:59 WIB daily cutoff.
              </p>
            </div>
          ) : (
            <dl className="divide-y divide-zinc-200 dark:divide-white/10 border-t border-b border-zinc-200 dark:border-white/10 text-sm">
              {step === 0 && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Wake Time
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {wake || "—"}
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Bedtime
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {bed || "—"}
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Total Sleep
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {totalSleepMins > 0 ? formatDuration(totalSleepMins) : "—"}
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Morning Feeling
                    </dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">
                      {sleepFeeling || "—"}
                    </dd>
                  </div>
                </>
              )}

              {step === 1 && isTraining && (
                <>
                  {activeWorkout && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Focus
                      </dt>
                      <dd className="font-semibold text-zinc-950 dark:text-white text-right">
                        {activeWorkout}
                      </dd>
                    </div>
                  )}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Movements
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {checkedCount} / {movementsCount || checkedCount} Done
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Post-Session Mood
                    </dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">
                      {trainingFeeling || "—"}
                    </dd>
                  </div>
                </>
              )}

              {step === 1 && isRest && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Recovery Items
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {checkedCount} / {movementsCount} Checked
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Body Condition
                    </dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">
                      {trainingFeeling || "—"}
                    </dd>
                  </div>
                </>
              )}

              {step === 1 && isConnect && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Attendance
                    </dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white text-right">
                      {connectAttendance === "attend"
                        ? "Attended"
                        : connectAttendance === "cannot_attend"
                          ? "Could Not Attend"
                          : "—"}
                    </dd>
                  </div>
                  {connectRating > 0 && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Experience
                      </dt>
                      <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                        {connectRating} / 5 Stars
                      </dd>
                    </div>
                  )}
                  {(safeHttpUrl(day.meetupLink) || safeHttpUrl(day.mapLink)) && (
                    <div className="py-4 flex flex-wrap items-center justify-between gap-3">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Session Links
                      </dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        {safeHttpUrl(day.meetupLink) && (
                          <a
                            href={safeHttpUrl(day.meetupLink)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Meeting Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {safeHttpUrl(day.mapLink) && (
                          <a
                            href={safeHttpUrl(day.mapLink)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-8 px-3 rounded-full border border-zinc-200 dark:border-white/15 text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Maps</span>
                          </a>
                        )}
                      </dd>
                    </div>
                  )}
                  {day.eventDetails?.trim() && (
                    <div className="py-4 space-y-1.5">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Session Rundown
                      </dt>
                      <dd className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                        {day.eventDetails.trim()}
                      </dd>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Meals Eaten
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {mealDraft.mealsCount > 0
                        ? `${mealDraft.mealsCount} ${mealDraft.mealsCount === 1 ? "Time" : "Times"}`
                        : "—"}
                    </dd>
                  </div>
                  {mealDraft.mealEntries.length > 0 ? (
                    mealDraft.mealEntries.map((entry, idx) => (
                      <div key={idx} className="py-4 flex items-start justify-between gap-4">
                        <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 shrink-0">
                          Meal {idx + 1}
                        </dt>
                        <dd className="font-medium text-zinc-950 dark:text-white text-right text-xs sm:text-sm">
                          {entry.mealItem
                            ? entry.mealItem
                            : entry.status === "followed"
                              ? "Followed Plan"
                              : entry.status === "similar"
                                ? "Similar Nutrition"
                                : "Off Plan"}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Meal Plan Status
                      </dt>
                      <dd className="font-semibold text-zinc-950 dark:text-white text-right">
                        {mealDraft.specialOption === "similar"
                          ? "Similar Portion & Nutrition"
                          : mealDraft.specialOption === "off_track"
                            ? "Off Plan"
                            : `${mealDraft.checkedMeals.length} / ${recommendedMealsCount} Recommended`}
                      </dd>
                    </div>
                  )}
                  {(mealDraft.calories || mealDraft.carbsG || mealDraft.proteinG || mealDraft.fatG) && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Calories &amp; Macros
                      </dt>
                      <dd className="font-mono font-semibold text-zinc-950 dark:text-white text-right text-xs">
                        {mealDraft.calories ? `${mealDraft.calories} kcal` : "—"} · C:{" "}
                        {mealDraft.carbsG ?? 0}g / P: {mealDraft.proteinG ?? 0}g / F:{" "}
                        {mealDraft.fatG ?? 0}g
                      </dd>
                    </div>
                  )}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Digestion &amp; Satiety
                    </dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">
                      {mealDraft.mealFeeling || "—"}
                    </dd>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Water Intake
                    </dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white text-right">
                      {waterMl > 0
                        ? `${(waterMl / 1000).toFixed(1)} L (${waterMl.toLocaleString()} ml)`
                        : mealDraft.waterMl && mealDraft.waterMl > 0
                          ? `${(mealDraft.waterMl / 1000).toFixed(1)} L (${mealDraft.waterMl.toLocaleString()} ml)`
                          : "—"}
                    </dd>
                  </div>
                  {urineColor && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Hydration Check
                      </dt>
                      <dd className="font-medium text-zinc-950 dark:text-white text-right">
                        {urineColor === "clear"
                          ? "Pale / Clear (Well Hydrated)"
                          : urineColor === "normal"
                            ? "Light Yellow (Normal)"
                            : "Dark Amber (Need More Water)"}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white hover:opacity-75 inline-flex items-center gap-1.5 active:scale-95 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Program Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
