"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { parseDayVideoLinks, parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { PlanDay } from "../MyPlanTab";
import { HeaderBackButton } from "../shared";
import {
  REFLECTION_DECLINED,
  TIME_24H_RE,
  matchesScopedMovement,
  parseLines,
  readMealDraft,
  sleepMinutes,
  sleepQualityLabel,
  stripLeadingFeeling,
  type DailyCheckInProps,
  type MealDraft,
  type SubStepId,
} from "./checkInUtils";
import { MealStepView, SleepStepView } from "./SleepMealSteps";
import { ActivityStepView } from "./ActivitySteps";
import { LockedTaskSummaryView, ReflectionStepView } from "./ReflectionStep";

export function TaskForm({
  day,
  locked,
  isPast,
  taskTitle,
  isTaskDone,
  activities,
  checks,
  step,
  onFinish,
  onClose,
  props,
}: {
  day: PlanDay;
  locked: boolean;
  isPast: boolean;
  taskTitle: string;
  isTaskDone: boolean;
  activities: string[];
  checks: string[];
  step: number;
  onFinish: () => void;
  onClose: () => void;
  props: DailyCheckInProps;
}) {
  const progress = day.userProgress;
  const [bed, setBed] = useState(
    progress?.bedtime === "SKIPPED" ? "" : progress?.bedtime || ""
  );
  const [wake, setWake] = useState(
    progress?.wakeTime === "SKIPPED" ? "" : progress?.wakeTime || ""
  );
  const [sleepFeeling, setSleepFeeling] = useState<string>(() => {
    const raw = progress?.assessmentResponse || "";
    const match = raw.match(/Sleep Feeling:\s*(.+)/i);
    return match ? match[1].trim() : "";
  });

  const [workout, setWorkout] = useState(
    progress?.selectedWorkout === "SKIPPED" ? "" : progress?.selectedWorkout || ""
  );
  const [pendingSwitchWorkout, setPendingSwitchWorkout] = useState<string | null>(null);
  const existingWorkoutNote = useMemo(
    () =>
      stripLeadingFeeling(
        progress?.workoutNotes ||
          (progress?.eventFeedback === "SKIPPED" ? "" : progress?.eventFeedback)
      ),
    [progress?.workoutNotes, progress?.eventFeedback]
  );

  const [trainingFeeling, setTrainingFeeling] = useState<string>(() => {
    const raw = progress?.workoutNotes || "";
    if (raw.includes("Feeling:")) {
      return raw.split("Feeling:")[1]?.split("·")[0]?.trim() || "";
    }
    return "";
  });

  const [connectAttendance, setConnectAttendance] = useState<
    "attend" | "cannot_attend" | null
  >(() => {
    const fb = progress?.eventFeedback || "";
    if (!fb || fb === "SKIPPED") return null;
    if (fb.toLowerCase().includes("cannot attend") || fb.toLowerCase().includes("not attend")) {
      return "cannot_attend";
    }
    if (fb.toLowerCase().includes("attend")) return "attend";
    return null;
  });
  const [connectRating, setConnectRating] = useState<number>(() => {
    const fb = progress?.eventFeedback || "";
    const match = fb.match(/(\d)\s*(?:stars?|\/5)/i);
    return match ? parseInt(match[1], 10) : 0;
  });

  const recommendedMeals = useMemo(() => {
    const parsed = parseLines(day.mealRecommendation);
    if (parsed.length > 0) return parsed;
    return [
      "Nutrient-dense breakfast with clean protein",
      "Balanced lunch with greens & complex carbohydrates",
      "Light evening dinner for restorative recovery",
    ];
  }, [day.mealRecommendation]);

  const [mealDraft, setMealDraft] = useState<MealDraft>(() =>
    readMealDraft(progress?.mealCompliance, progress?.mealNotes, recommendedMeals)
  );
  const [review, setReview] = useState(
    progress?.dailyReflection === "Skipped reflection journal today." ||
      progress?.dailyReflection === "SKIPPED"
      ? ""
      : progress?.dailyReflection || ""
  );
  const [score, setScore] = useState(
    progress?.dailyReflection === "SKIPPED"
      ? 0
      : progress?.happinessRate
        ? Math.min(5, progress.happinessRate)
        : 0
  );

  const [subStepIndex, setSubStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localChecks, setLocalChecks] = useState(checks);
  const checksDirtyRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalChecks(checks);
    checksDirtyRef.current = false;
  }, [checks]);

  const isTraining = day.dayType === "TRAINING_DAY";
  const isRest = day.dayType === "REST_DAY";
  const isConnect = !isTraining && !isRest;

  const restLines = useMemo(() => parseLines(day.restInstructions), [day.restInstructions]);
  const videos = useMemo(() => parseDayVideoLinks(day.videoUrl), [day.videoUrl]);
  const groups = useMemo(() => {
    if (!isTraining) return [];
    return parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  }, [isTraining, day.workoutOptions, day.videoChecklist]);

  const hasMultipleOptions = isTraining && groups.length > 0;
  const activeWorkout = hasMultipleOptions ? workout : "";
  const selectedGroup =
    groups.find((g) => g.optionName === activeWorkout) ||
    (!hasMultipleOptions ? groups[0] : undefined);
  const groupMoves = selectedGroup?.movements.map((m) => m.name) || [];
  const movements = isTraining
    ? hasMultipleOptions
      ? activeWorkout
        ? groupMoves
        : []
      : groupMoves.length > 0
        ? groupMoves
        : activities
    : isRest
      ? activities
      : [];

  const activeOptionIdx = Math.max(
    0,
    groups.findIndex((g) => g.optionName === activeWorkout)
  );
  const activeVideo = useMemo(() => {
    if (!isTraining) return null;
    if (hasMultipleOptions && !activeWorkout) return null;
    if (videos[activeOptionIdx]) return videos[activeOptionIdx];
    if (videos[0]) {
      return {
        title: `${activeWorkout || "Movement"} • Guided Session`,
        url: videos[0].url,
      };
    }
    return null;
  }, [isTraining, hasMultipleOptions, videos, activeOptionIdx, activeWorkout]);

  const subSteps = useMemo<SubStepId[]>(() => {
    if (step === 0) return ["wake", "bed", "sleep_mood"];
    if (step === 1) {
      if (isConnect) {
        return connectAttendance === "cannot_attend"
          ? ["connect_attendance"]
          : ["connect_attendance", "connect_rating"];
      }
      if (isRest) {
        return restLines.length > 0 ? ["rest_checklist", "rest_mood"] : ["rest_mood"];
      }
      const list: SubStepId[] = [];
      if (groups.length > 0) list.push("training_option");
      if (videos.length > 0) list.push("training_video");
      if (movements.length > 0 || groups.length > 0) list.push("training_movements");
      list.push("training_mood");
      return list;
    }
    if (step === 2) {
      const count = mealDraft.mealsCount > 0 ? mealDraft.mealsCount : 1;
      const list: SubStepId[] = ["meal_count", "meal_entry_1"];
      if (count >= 2) list.push("meal_entry_2");
      if (count >= 3) list.push("meal_entry_3");
      list.push("meal_mood");
      return list;
    }
    return ["reflection_journal", "reflection_mood"];
  }, [
    step,
    isConnect,
    isRest,
    connectAttendance,
    restLines.length,
    groups.length,
    videos.length,
    movements.length,
    mealDraft.mealsCount,
  ]);

  const safeSubIndex = Math.min(subStepIndex, Math.max(0, subSteps.length - 1));
  const currentSubStep = subSteps[safeSubIndex];
  const isFirstSubStep = safeSubIndex === 0;
  const isFinalSubStep = safeSubIndex === subSteps.length - 1;

  const isChecked = (name: string) =>
    localChecks.some((c) => matchesScopedMovement(c, activeWorkout, name));

  const checkedCount = movements.filter(isChecked).length;

  const flushChecklist = useCallback(
    async (items: string[]): Promise<boolean> => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      if (!checksDirtyRef.current || locked) return true;
      checksDirtyRef.current = false;
      if (props.onSyncChecklist) {
        return await props.onSyncChecklist(items, day.id);
      }
      return true;
    },
    [day.id, locked, props]
  );

  const scheduleChecklistSync = useCallback(
    (nextItems: string[]) => {
      checksDirtyRef.current = true;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void flushChecklist(nextItems);
      }, 750);
    },
    [flushChecklist]
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleClickWorkoutOption = async (optionName: string) => {
    if (locked) return;
    if (optionName === workout) {
      setError(null);
      return;
    }
    if (workout && checkedCount > 0) {
      setPendingSwitchWorkout(optionName);
      return;
    }
    setWorkout(optionName);
    setLocalChecks([]);
    checksDirtyRef.current = false;
    setError(null);
    await props.onSelectWorkout(optionName, day.id, true);
  };

  const confirmSwitchWorkout = async () => {
    if (!pendingSwitchWorkout) return;
    const nextOpt = pendingSwitchWorkout;
    setPendingSwitchWorkout(null);
    setWorkout(nextOpt);
    setLocalChecks([]);
    checksDirtyRef.current = false;
    setError(null);
    await props.onSelectWorkout(nextOpt, day.id, true);
  };

  const parseTargetReps = (target?: string | null): number => {
    if (!target) return 10;
    const match = target.match(/\d+/);
    return match ? parseInt(match[0], 10) : 10;
  };

  const getMovementReps = (name: string, defaultTarget: number): number => {
    const entry = localChecks.find((c) => matchesScopedMovement(c, activeWorkout, name));
    if (!entry || !entry.includes("=")) return defaultTarget;
    const parsed = parseInt(entry.split("=")[1], 10);
    return isNaN(parsed) ? defaultTarget : parsed;
  };

  const updateMovementReps = (name: string, reps: number) => {
    if (locked) return;
    const safeReps = Math.max(1, Math.min(999, Math.round(reps) || 1));
    const scoped = activeWorkout ? `[${activeWorkout}] ${name}` : name;
    const newEntry = `${scoped}=${safeReps}`;

    let found = false;
    const updated = localChecks.map((c) => {
      if (matchesScopedMovement(c, activeWorkout, name)) {
        found = true;
        return newEntry;
      }
      return c;
    });
    if (!found) updated.push(newEntry);

    setLocalChecks(updated);
    if (props.onSyncChecklist) {
      scheduleChecklistSync(updated);
    } else {
      void props.onToggleCheck(newEntry, day.id, true);
    }
  };

  const toggle = (name: string, defaultReps?: number) => {
    if (locked) return;
    const scoped = activeWorkout ? `[${activeWorkout}] ${name}` : name;
    const scopedWithReps = defaultReps ? `${scoped}=${defaultReps}` : scoped;
    const alreadyChecked = isChecked(name);
    const nextChecks = alreadyChecked
      ? localChecks.filter((c) => !matchesScopedMovement(c, activeWorkout, name))
      : [...localChecks, scopedWithReps];

    setLocalChecks(nextChecks);
    if (props.onSyncChecklist) {
      scheduleChecklistSync(nextChecks);
    } else {
      void props.onToggleCheck(alreadyChecked ? scoped : scopedWithReps, day.id);
    }
  };

  const validateSubStep = (id: SubStepId): string | null => {
    switch (id) {
      case "wake":
        return TIME_24H_RE.test(wake)
          ? null
          : "Please select the time you woke up today (HH:MM).";
      case "bed":
        return TIME_24H_RE.test(bed)
          ? null
          : "Please select the time you went to sleep last night (HH:MM).";
      case "sleep_mood":
        return sleepFeeling ? null : "Please select how you feel after waking up.";
      case "training_option":
        return !hasMultipleOptions || activeWorkout
          ? null
          : "Please select a training focus to continue.";
      case "training_video":
        return null;
      case "training_movements":
        if (movements.length > 0 && !movements.every(isChecked)) {
          return `Please complete all exercises (${movements.length - checkedCount} remaining).`;
        }
        return null;
      case "training_mood":
        return trainingFeeling ? null : "Please select how you feel after training.";
      case "rest_checklist":
        if (movements.length > 0 && !movements.every(isChecked)) {
          return `Please complete all recovery items (${movements.length - checkedCount} remaining).`;
        }
        return null;
      case "rest_mood":
        return trainingFeeling ? null : "Please select how your body feels today.";
      case "connect_attendance":
        return connectAttendance
          ? null
          : "Please indicate whether you will attend this session.";
      case "connect_rating":
        return connectRating > 0
          ? null
          : "Please rate your session experience from 1 to 5 stars.";
      case "meal_count":
        return mealDraft.mealsCount > 0
          ? null
          : "Please select how many meals you ate today (1, 2, or 3).";
      case "meal_entry_1":
        return mealDraft.mealEntries[0]?.status
          ? null
          : "Please indicate whether Meal 1 followed today's meal plan.";
      case "meal_entry_2":
        return mealDraft.mealEntries[1]?.status
          ? null
          : "Please indicate whether Meal 2 followed today's meal plan.";
      case "meal_entry_3":
        return mealDraft.mealEntries[2]?.status
          ? null
          : "Please indicate whether Meal 3 followed today's meal plan.";
      case "meal_mood":
        return mealDraft.mealFeeling
          ? null
          : "Please select how you feel after your meals.";
      case "reflection_journal":
        return review === REFLECTION_DECLINED || review.trim().length >= 3
          ? null
          : 'Please write a brief reflection or select "Prefer not to answer".';
      case "reflection_mood":
        return score > 0 ? null : "Please select your overall mood & energy rating.";
      default:
        return null;
    }
  };

  const persistFinal = async (): Promise<boolean> => {
    await flushChecklist(localChecks);
    if (step === 0) {
      return (
        (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake), day.id, sleepFeeling)) !==
        false
      );
    }
    if (step === 1) {
      if (isConnect) {
        const attendanceFeedback =
          connectAttendance === "attend"
            ? `Attended · Experience: ${connectRating}/5 Stars`
            : "Cannot Attend session";
        return (await props.onSaveAttendance(attendanceFeedback, day.id)) !== false;
      }
      if (isRest) {
        const restNotes = `Feeling: ${trainingFeeling} · Active recovery completed`;
        return (await props.onSaveWorkoutNotes(restNotes, day.id)) !== false;
      }
      if (activeWorkout) {
        await props.onSelectWorkout(activeWorkout, day.id, false);
      }
      const trimmedNote = existingWorkoutNote.trim();
      const finalNotes = trainingFeeling
        ? `Feeling: ${trainingFeeling}${trimmedNote ? ` · ${trimmedNote}` : ""}`
        : trimmedNote ||
          (activeWorkout ? `Completed: ${activeWorkout}` : "Completed training session");
      return (await props.onSaveWorkoutNotes(finalNotes, day.id)) !== false;
    }
    if (step === 2) {
      const mealCount = mealDraft.mealsCount || 1;
      const activeEntries = mealDraft.mealEntries.slice(0, mealCount);
      const checkedMeals = Array.from(
        new Set(
          activeEntries
            .filter((e) => e.status === "followed" && e.mealItem)
            .map((e) => e.mealItem!)
        )
      );
      const allFollowed =
        activeEntries.length === mealCount &&
        activeEntries.every((e) => e.status === "followed");
      const allSimilar =
        activeEntries.length === mealCount &&
        activeEntries.every((e) => e.status === "similar");
      const allOffTrack =
        activeEntries.length === mealCount &&
        activeEntries.every((e) => e.status === "off_track");
      const compliance = allFollowed
        ? "FULL"
        : allSimilar
          ? "SIMILAR"
          : allOffTrack
            ? "OFF_TRACK"
            : "PARTIAL";

      const mealPayload = {
        v: 4,
        mode: compliance.toLowerCase(),
        checkedMeals,
        mealsCount: mealCount,
        mealEntries: activeEntries,
        mealFeeling: mealDraft.mealFeeling,
      };
      return (
        (await props.onSaveMeal(compliance, JSON.stringify(mealPayload), day.id)) !== false
      );
    }
    return (await props.onSaveReflection(review.trim(), score || 3, day.id)) !== false;
  };

  const handlePrimaryAction = async () => {
    if (locked || busy) return;
    const err = validateSubStep(currentSubStep);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (!isFinalSubStep) {
      if (
        currentSubStep === "training_movements" ||
        currentSubStep === "rest_checklist"
      ) {
        const ok = await flushChecklist(localChecks);
        if (!ok) {
          setError("Could not save checklist. Please try again.");
          return;
        }
      }
      setSubStepIndex((idx) => Math.min(subSteps.length - 1, idx + 1));
      return;
    }

    setBusy(true);
    try {
      const ok = await persistFinal();
      if (!ok) {
        setError("Could not save entry. Please try again.");
        return;
      }
      onFinish();
    } catch {
      setError("Could not save entry. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (safeSubIndex > 0) {
      setSubStepIndex((idx) => Math.max(0, idx - 1));
      return;
    }
    void flushChecklist(localChecks);
    onClose();
  };

  const totalSleepMins = bed && wake ? sleepMinutes(bed, wake) : 0;
  const sleepQuality = totalSleepMins > 0 ? sleepQualityLabel(totalSleepMins) : null;

  if (locked) {
    return (
      <LockedTaskSummaryView
        day={day}
        step={step}
        taskTitle={taskTitle}
        isTaskDone={isTaskDone}
        isPast={isPast}
        isTraining={isTraining}
        isRest={isRest}
        isConnect={isConnect}
        wake={wake}
        bed={bed}
        totalSleepMins={totalSleepMins}
        sleepFeeling={sleepFeeling}
        activeWorkout={activeWorkout}
        checkedCount={checkedCount}
        movementsCount={movements.length}
        trainingFeeling={trainingFeeling}
        connectAttendance={connectAttendance}
        connectRating={connectRating}
        mealDraft={mealDraft}
        recommendedMealsCount={recommendedMeals.length}
        review={review}
        score={score}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="sticky top-0 z-10 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
          <HeaderBackButton
            onClick={handleBack}
            ariaLabel={isFirstSubStep ? "Back to dashboard" : "Previous question"}
          />

          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums truncate max-w-[60%]">
            {taskTitle} · {safeSubIndex + 1} / {subSteps.length}
          </span>
        </div>
      </header>

      <div
        className="w-full max-w-xl mx-auto flex-1 flex flex-col px-4 sm:px-6 pt-6 sm:pt-8"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        <div
          className="flex items-center gap-1.5 w-full"
          role="progressbar"
          aria-valuenow={safeSubIndex + 1}
          aria-valuemin={1}
          aria-valuemax={subSteps.length}
          aria-label={`Step ${safeSubIndex + 1} of ${subSteps.length}`}
        >
          {subSteps.map((s, idx) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                idx <= safeSubIndex
                  ? "bg-zinc-950 dark:bg-white"
                  : "bg-zinc-200/80 dark:bg-white/10"
              }`}
            />
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handlePrimaryAction();
          }}
          className="flex-1 flex flex-col justify-between gap-8 pt-6 min-w-0"
        >
          <div className="space-y-6 min-w-0">
            {step === 0 && (
              <SleepStepView
                currentSubStep={currentSubStep}
                dayNumber={day.dayNumber}
                sleepRecommendation={day.sleepRecommendation}
                wake={wake}
                bed={bed}
                sleepFeeling={sleepFeeling}
                totalSleepMins={totalSleepMins}
                sleepQuality={sleepQuality}
                onChangeWake={(next) => {
                  setWake(next);
                  setError(null);
                }}
                onChangeBed={(next) => {
                  setBed(next);
                  setError(null);
                }}
                onChangeSleepFeeling={(label) => {
                  setSleepFeeling(label);
                  setError(null);
                }}
              />
            )}

            {step === 1 && (
              <ActivityStepView
                currentSubStep={currentSubStep}
                day={day}
                groups={groups}
                videos={videos}
                activeWorkout={activeWorkout}
                activeVideo={activeVideo}
                movements={movements}
                selectedGroup={selectedGroup}
                checkedCount={checkedCount}
                isChecked={isChecked}
                parseTargetReps={parseTargetReps}
                getMovementReps={getMovementReps}
                onUpdateMovementReps={updateMovementReps}
                onToggleMovement={toggle}
                onClickWorkoutOption={(opt) => void handleClickWorkoutOption(opt)}
                onOpenVideo={() => void props.onOpenVideo(day.id)}
                trainingFeeling={trainingFeeling}
                onSelectTrainingFeeling={(label) => {
                  setTrainingFeeling(label);
                  setError(null);
                }}
                restLines={restLines}
                connectAttendance={connectAttendance}
                connectRating={connectRating}
                onSelectAttendance={(val) => {
                  setConnectAttendance(val);
                  if (val === "cannot_attend") setConnectRating(0);
                  setError(null);
                }}
                onSelectConnectRating={(star) => {
                  setConnectRating(star);
                  setError(null);
                }}
              />
            )}

            {step === 2 && (
              <MealStepView
                currentSubStep={currentSubStep}
                dayNumber={day.dayNumber}
                recommendedMeals={recommendedMeals}
                mealDraft={mealDraft}
                setMealDraft={setMealDraft}
                clearError={() => setError(null)}
              />
            )}

            {step === 3 && (
              <ReflectionStepView
                currentSubStep={currentSubStep}
                dayNumber={day.dayNumber}
                review={review}
                score={score}
                onChangeReview={(next) => {
                  setReview(next);
                  setError(null);
                }}
                onSelectScore={(n) => {
                  setScore(n);
                  setError(null);
                }}
                onSubmitShortcut={() => void handlePrimaryAction()}
              />
            )}
          </div>

          <div className="space-y-3 pt-2">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-mono">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="group py-1.5 text-sm font-semibold text-zinc-950 dark:text-white hover:opacity-75 inline-flex items-center gap-1.5 active:scale-95 transition disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFinalSubStep ? (
                  <Check className="w-4 h-4" />
                ) : null}
                <span>{isFinalSubStep ? "Save & Finish" : "Continue"}</span>
                {!isFinalSubStep && (
                  <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </button>
            </div>
          </div>
        </form>

        {pendingSwitchWorkout && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                  Change Training Variation?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Switching from{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">{workout}</strong> to{" "}
                  <strong className="text-zinc-800 dark:text-zinc-200">
                    {pendingSwitchWorkout}
                  </strong>{" "}
                  will reset your <strong>{checkedCount}</strong> logged movement(s) in this
                  session.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingSwitchWorkout(null)}
                  className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmSwitchWorkout()}
                  className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold transition active:scale-95"
                >
                  Switch Variation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
