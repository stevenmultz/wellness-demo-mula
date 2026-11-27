"use client";

import { useState } from "react";
import { wellnessUserSubmitDayProgress as rawWellnessUserSubmitDayProgress } from "@/wellness/actions/program";
import {
  wellnessAddExtraWorkout as rawWellnessAddExtraWorkout,
  wellnessDeleteExtraWorkout as rawWellnessDeleteExtraWorkout,
  wellnessSaveDailyMeal as rawWellnessSaveDailyMeal,
  wellnessSaveDailySleep as rawWellnessSaveDailySleep,
  wellnessSaveDailySteps as rawWellnessSaveDailySteps,
  wellnessSaveDailyWater as rawWellnessSaveDailyWater,
  wellnessUpdateExtraWorkout as rawWellnessUpdateExtraWorkout,
} from "@/wellness/actions/daily-log";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import {
  extractNutritionFromMealNotes,
  extractWaterMl,
  mergeMealNotesPayload,
} from "@/wellness/utils/nutrition";
import { formatWibDateKey } from "@/wellness/utils/timezone";
import {
  computeStepsBurnedKcal,
  mapMealQualityToProgramCompliance,
  mapProgramComplianceToMealQuality,
} from "@/wellness/utils/wellness-metrics";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { ActionNotice, DailyLogDTO, ExtraWorkoutDTO, ProgramDayItem, ProgramItem } from "./types";

function isDeploymentSkewError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || "").toLowerCase();
  return (
    msg.includes("failed to find server action") ||
    msg.includes("chunkloaderror") ||
    msg.includes("dynamically imported module")
  );
}

async function safeInvokeAction<
  TArgs extends unknown[],
  TRes extends { success: boolean; message?: string }
>(
  fn: (...args: TArgs) => Promise<TRes>,
  fallbackMessage: string,
  ...args: TArgs
): Promise<TRes> {
  try {
    return await fn(...args);
  } catch (err) {
    if (isDeploymentSkewError(err)) {
      if (typeof window !== "undefined") {
        window.setTimeout(() => window.location.reload(), 1200);
      }
      return {
        success: false,
        message: "App was just updated — refreshing to sync the latest version...",
      } as TRes;
    }
    return {
      success: false,
      message: fallbackMessage,
    } as TRes;
  }
}

const wellnessUserSubmitDayProgress = (
  payload: Parameters<typeof rawWellnessUserSubmitDayProgress>[0]
) =>
  safeInvokeAction(
    rawWellnessUserSubmitDayProgress,
    "Network error while saving progress. Please check your connection and try again.",
    payload
  );

const wellnessSaveDailySleep = (payload: Parameters<typeof rawWellnessSaveDailySleep>[0]) =>
  safeInvokeAction(
    rawWellnessSaveDailySleep,
    "Network error while saving sleep. Please check your connection and try again.",
    payload
  );

const wellnessSaveDailyWater = (payload: Parameters<typeof rawWellnessSaveDailyWater>[0]) =>
  safeInvokeAction(
    rawWellnessSaveDailyWater,
    "Network error while saving water intake. Please check your connection and try again.",
    payload
  );

const wellnessSaveDailySteps = (payload: Parameters<typeof rawWellnessSaveDailySteps>[0]) =>
  safeInvokeAction(
    rawWellnessSaveDailySteps,
    "Network error while saving steps. Please check your connection and try again.",
    payload
  );

const wellnessSaveDailyMeal = (payload: Parameters<typeof rawWellnessSaveDailyMeal>[0]) =>
  safeInvokeAction(
    rawWellnessSaveDailyMeal,
    "Network error while saving meal log. Please check your connection and try again.",
    payload
  );

const wellnessAddExtraWorkout = (payload: Parameters<typeof rawWellnessAddExtraWorkout>[0]) =>
  safeInvokeAction(
    rawWellnessAddExtraWorkout,
    "Network error while saving workout. Please check your connection and try again.",
    payload
  );

const wellnessUpdateExtraWorkout = (payload: Parameters<typeof rawWellnessUpdateExtraWorkout>[0]) =>
  safeInvokeAction(
    rawWellnessUpdateExtraWorkout,
    "Network error while updating workout. Please check your connection and try again.",
    payload
  );

const wellnessDeleteExtraWorkout = (payload: Parameters<typeof rawWellnessDeleteExtraWorkout>[0]) =>
  safeInvokeAction(
    rawWellnessDeleteExtraWorkout,
    "Network error while removing workout. Please check your connection and try again.",
    payload
  );

interface UseDashboardProgressParams {
  currentProgram: ProgramItem | null;
  calendarDay: ProgramDayItem | null;
  initialDailyLogs?: DailyLogDTO[];
  setActionNotice: (next: ActionNotice | null, autoDismissMs?: number) => void;
  onRefresh: () => void;
}

function getDayDateKey(day: ProgramDayItem): string {
  if (day.wibDateKey) return day.wibDateKey;
  if (day.unlockDate) return formatWibDateKey(day.unlockDate);
  return formatWibDateKey(new Date());
}

export function useDashboardProgress({
  currentProgram,
  calendarDay,
  initialDailyLogs = [],
  setActionNotice,
  onRefresh,
}: UseDashboardProgressParams) {
  // Global universal biomarkers keyed strictly by WIB calendar date ("YYYY-MM-DD")
  // so switching between overlapping programs immediately reflects live updates!
  const [dailyLogsByDate, setDailyLogsByDate] = useState<Record<string, DailyLogDTO>>(() => {
    const map: Record<string, DailyLogDTO> = {};
    for (const log of initialDailyLogs) {
      map[log.logDate] = log;
    }
    return map;
  });

  const [dayChecklists, setDayChecklists] = useState<Record<string, string[]>>({});
  const [dayVideoWatched, setDayVideoWatched] = useState<Record<string, boolean>>({});
  const [dayAssessments, setDayAssessments] = useState<Record<string, string>>({});
  const [dayWorkouts, setDayWorkouts] = useState<Record<string, string>>({});
  const [dayMealCompliance, setDayMealCompliance] = useState<Record<string, string>>({});
  const [dayMealNotes, setDayMealNotes] = useState<Record<string, string>>({});
  const [dayWorkoutNotes, setDayWorkoutNotes] = useState<Record<string, string>>({});
  const [dayEventFeedback, setDayEventFeedback] = useState<Record<string, string>>({});
  const [dayReflections, setDayReflections] = useState<Record<string, string>>({});
  const [dayHappiness, setDayHappiness] = useState<Record<string, number>>({});
  const [dayBedtimes, setDayBedtimes] = useState<Record<string, string>>({});
  const [dayWakeTimes, setDayWakeTimes] = useState<Record<string, string>>({});
  const [dayCompletedOverride, setDayCompletedOverride] = useState<Record<string, boolean>>({});
  const [customSubmissionsByTaskId, setCustomSubmissionsByTaskId] = useState<
    Record<string, NonNullable<ProgramDayCustomTaskDTO["submission"]>>
  >({});

  const resolveTargetDay = (dayId?: string) =>
    dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;

  const ensureDateLog = (dateKey: string): DailyLogDTO =>
    dailyLogsByDate[dateKey] ?? {
      id: "",
      logDate: dateKey,
      bedtime: null,
      wakeTime: null,
      sleepDurationMinutes: null,
      sleepFeeling: null,
      waterMl: 0,
      stepsCount: 0,
      stepsBurnedKcal: 0,
      mealsCount: null,
      caloriesKcal: 0,
      carbsG: 0,
      proteinG: 0,
      fatG: 0,
      mealQualityMode: null,
      mealFeeling: null,
      mealEntriesJson: null,
      extraWorkouts: [],
    };

  const overlayDay = (day: ProgramDayItem): ProgramDayItem => {
    const dateKey = getDayDateKey(day);
    const gLog = dailyLogsByDate[dateKey];
    const inheritedComp = mapMealQualityToProgramCompliance(gLog?.mealQualityMode);
    const resolvedCompliance =
      dayMealCompliance[day.id] ?? day.userProgress?.mealCompliance ?? inheritedComp ?? null;
    const resolvedWaterMl =
      gLog !== undefined
        ? gLog.waterMl
        : day.userProgress?.waterMl ?? extractWaterMl(dayMealNotes[day.id] ?? day.userProgress?.mealNotes);
    const resolvedSteps =
      gLog !== undefined ? gLog.stepsCount : day.userProgress?.stepsCount ?? 0;
    const resolvedStepsBurned =
      gLog !== undefined
        ? gLog.stepsBurnedKcal
        : day.userProgress?.stepsBurnedKcal ?? computeStepsBurnedKcal(resolvedSteps);
    const resolvedExtraWorkouts: ExtraWorkoutDTO[] =
      gLog !== undefined ? gLog.extraWorkouts : day.userProgress?.extraWorkouts ?? [];

    return {
      ...day,
      wibDateKey: dateKey,
      customTasks: (day.customTasks || []).map((ct) => ({
        ...ct,
        submission: customSubmissionsByTaskId[ct.id] ?? ct.submission ?? null,
      })),
      userProgress: {
        ...(day.userProgress || {
          id: "",
          videoWatched: false,
          isCompleted: false,
          checklistCompleted: null,
        }),
        isCompleted: dayCompletedOverride[day.id] ?? !!day.userProgress?.isCompleted,
        videoWatched: dayVideoWatched[day.id] ?? !!day.userProgress?.videoWatched,
        checklistCompleted:
          dayChecklists[day.id] !== undefined
            ? JSON.stringify(dayChecklists[day.id])
            : day.userProgress?.checklistCompleted || null,
        eventFeedback: dayEventFeedback[day.id] ?? day.userProgress?.eventFeedback,
        mealCompliance: resolvedCompliance,
        mealNotes:
          dayMealNotes[day.id] !== undefined
            ? dayMealNotes[day.id]
            : day.userProgress?.mealNotes,
        dailyReflection:
          dayReflections[day.id] !== undefined
            ? dayReflections[day.id]
            : day.userProgress?.dailyReflection,
        happinessRate: dayHappiness[day.id] ?? day.userProgress?.happinessRate,
        bedtime: gLog?.bedtime ?? dayBedtimes[day.id] ?? day.userProgress?.bedtime,
        wakeTime: gLog?.wakeTime ?? dayWakeTimes[day.id] ?? day.userProgress?.wakeTime,
        sleepDurationMinutes:
          gLog?.sleepDurationMinutes ?? day.userProgress?.sleepDurationMinutes,
        workoutNotes: dayWorkoutNotes[day.id] ?? day.userProgress?.workoutNotes,
        selectedWorkout: dayWorkouts[day.id] ?? day.userProgress?.selectedWorkout,
        assessmentResponse:
          (gLog?.sleepFeeling ? `Sleep Feeling: ${gLog.sleepFeeling}` : undefined) ??
          dayAssessments[day.id] ??
          day.userProgress?.assessmentResponse,
        waterMl: resolvedWaterMl,
        stepsCount: resolvedSteps,
        stepsBurnedKcal: resolvedStepsBurned,
        caloriesKcal:
          gLog && (gLog.mealQualityMode != null || gLog.caloriesKcal > 0)
            ? gLog.caloriesKcal
            : day.userProgress?.caloriesKcal ??
              extractNutritionFromMealNotes(dayMealNotes[day.id] ?? day.userProgress?.mealNotes).calories,
        carbsG:
          gLog && (gLog.mealQualityMode != null || gLog.carbsG > 0)
            ? gLog.carbsG
            : day.userProgress?.carbsG ??
              extractNutritionFromMealNotes(dayMealNotes[day.id] ?? day.userProgress?.mealNotes).carbsG,
        proteinG:
          gLog && (gLog.mealQualityMode != null || gLog.proteinG > 0)
            ? gLog.proteinG
            : day.userProgress?.proteinG ??
              extractNutritionFromMealNotes(dayMealNotes[day.id] ?? day.userProgress?.mealNotes).proteinG,
        fatG:
          gLog && (gLog.mealQualityMode != null || gLog.fatG > 0)
            ? gLog.fatG
            : day.userProgress?.fatG ??
              extractNutritionFromMealNotes(dayMealNotes[day.id] ?? day.userProgress?.mealNotes).fatG,
        mealQualityMode: gLog?.mealQualityMode ?? day.userProgress?.mealQualityMode ?? null,
        extraWorkouts: resolvedExtraWorkouts,
        mealSyncedFromDailyLog: Boolean(
          !dayMealCompliance[day.id] && !day.userProgress?.mealCompliance && inheritedComp
        ),
      },
    };
  };

  const getCheckedItems = (day: ProgramDayItem): string[] => {
    if (dayChecklists[day.id] !== undefined) {
      return dayChecklists[day.id];
    }
    if (day.userProgress?.checklistCompleted) {
      try {
        const parsed = JSON.parse(day.userProgress.checklistCompleted);
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getVideoWatched = (day: ProgramDayItem): boolean => {
    if (dayVideoWatched[day.id] !== undefined) {
      return dayVideoWatched[day.id];
    }
    return !!day.userProgress?.videoWatched || !!day.userProgress?.isCompleted;
  };

  const areActiveWorkoutMovementsCompleted = (
    day: ProgramDayItem,
    checkedList: string[]
  ): boolean => {
    if (
      day.dayType !== "TRAINING_DAY" ||
      !day.videoChecklist ||
      day.videoChecklist.length === 0
    ) {
      return true;
    }
    const groups = parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
    const selectedOpt =
      dayWorkouts[day.id] ||
      day.userProgress?.selectedWorkout ||
      groups[0]?.optionName ||
      "Workout";
    const activeGroup =
      groups.find(
        (g) => g.optionName.trim().toLowerCase() === selectedOpt.trim().toLowerCase()
      ) || groups[0];
    if (!activeGroup || activeGroup.movements.length === 0) return true;

    const checkedKeys = new Set(
      checkedList.map((item) =>
        (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
      )
    );

    return activeGroup.movements.every((m) => {
      const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
      const plainKey = m.name.trim().toLowerCase();
      return checkedKeys.has(scopedKey) || checkedKeys.has(plainKey);
    });
  };

  const computeAutoComplete = (
    targetDay: ProgramDayItem,
    updatedChecklist: string[],
    overrides?: {
      bedtime?: string;
      wakeTime?: string;
      workoutNotes?: string;
      eventFeedback?: string;
      mealCompliance?: string;
      mealNotes?: string;
      dailyReflection?: string;
      videoWatched?: boolean;
    }
  ) => {
    const dateKey = getDayDateKey(targetDay);
    const gLog = dailyLogsByDate[dateKey];

    const bed = overrides?.bedtime ?? gLog?.bedtime ?? dayBedtimes[targetDay.id] ?? targetDay.userProgress?.bedtime;
    const wake = overrides?.wakeTime ?? gLog?.wakeTime ?? dayWakeTimes[targetDay.id] ?? targetDay.userProgress?.wakeTime;
    const sleepDone = Boolean(bed && wake && bed !== "SKIPPED" && wake !== "SKIPPED");

    const mealComp =
      overrides?.mealCompliance ??
      dayMealCompliance[targetDay.id] ??
      targetDay.userProgress?.mealCompliance ??
      mapMealQualityToProgramCompliance(gLog?.mealQualityMode);
    const mealDone = Boolean(mealComp && mealComp !== "SKIPPED");

    const mNotes =
      overrides?.mealNotes ??
      dayMealNotes[targetDay.id] ??
      targetDay.userProgress?.mealNotes;
    const effectiveWaterMl =
      gLog !== undefined
        ? gLog.waterMl
        : targetDay.userProgress?.waterMl ?? extractWaterMl(mNotes);
    const waterDone = effectiveWaterMl > 0;
    const stepsDone = (gLog?.stepsCount ?? targetDay.userProgress?.stepsCount ?? 0) > 0;

    const wNotes =
      overrides?.workoutNotes ??
      dayWorkoutNotes[targetDay.id] ??
      targetDay.userProgress?.workoutNotes;
    const evFb =
      overrides?.eventFeedback ??
      dayEventFeedback[targetDay.id] ??
      targetDay.userProgress?.eventFeedback;
    const vidWatched = overrides?.videoWatched ?? getVideoWatched(targetDay);

    const videoDone =
      targetDay.dayType !== "TRAINING_DAY" || !targetDay.videoUrl
        ? true
        : vidWatched;
    const restItems = (targetDay.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);

    const activityDone =
      targetDay.dayType === "TRAINING_DAY"
        ? videoDone &&
          areActiveWorkoutMovementsCompleted(targetDay, updatedChecklist) &&
          Boolean(
            (wNotes && wNotes !== "SKIPPED") ||
              updatedChecklist.length > 0 ||
              vidWatched
          )
        : targetDay.dayType === "REST_DAY"
          ? (restItems.length === 0 || restItems.every((name) => updatedChecklist.includes(name))) &&
            Boolean((wNotes && wNotes !== "SKIPPED") || updatedChecklist.length > 0)
          : Boolean(evFb && evFb !== "SKIPPED");

    // All 5 core tasks (Sleep, Activity, Meal Control, Water Intake, Daily Steps) + custom tasks
    const allCustomDone = (targetDay.customTasks || []).every((ct) =>
      Boolean(customSubmissionsByTaskId[ct.id] ?? ct.submission)
    );

    return sleepDone && activityDone && mealDone && waterDone && stepsDone && allCustomDone;
  };

  const syncCompletedFromServer = (dayId: string, data: unknown) => {
    const serverCompleted =
      data && typeof data === "object" && "isCompleted" in data
        ? Boolean((data as { isCompleted?: unknown }).isCompleted)
        : undefined;
    if (serverCompleted !== undefined) {
      setDayCompletedOverride((prev) => ({ ...prev, [dayId]: serverCompleted }));
    }
  };

  const applyServerCompletions = (completions?: Record<string, boolean>) => {
    if (!completions || Object.keys(completions).length === 0) return;
    setDayCompletedOverride((prev) => ({ ...prev, ...completions }));
  };

  // Send only workout/checklist fields on checklist changes so we never overwrite cross-plan meal/sleep state
  const submitChecklistSnapshot = async (
    targetDay: ProgramDayItem,
    updated: string[],
    isCompleted: boolean
  ) =>
    wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      videoWatched: getVideoWatched(targetDay),
      checklistCompleted: updated,
      isCompleted,
      selectedWorkout:
        dayWorkouts[targetDay.id] || targetDay.userProgress?.selectedWorkout || undefined,
    });

  const handleOpenVideo = async (dayId?: string): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay || getVideoWatched(targetDay)) return true;
    setDayVideoWatched((prev) => ({ ...prev, [targetDay.id]: true }));
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      videoWatched: true,
      checklistCompleted: getCheckedItems(targetDay),
      isCompleted: !!targetDay.userProgress?.isCompleted,
    });
    if (!res.success) {
      setDayVideoWatched((prev) => ({ ...prev, [targetDay.id]: false }));
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    return true;
  };

  const handleSyncChecklist = async (updated: string[], dayId?: string): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const existing = getCheckedItems(targetDay);
    setDayChecklists((prev) => ({ ...prev, [targetDay.id]: updated }));

    const autoComplete = computeAutoComplete(targetDay, updated);
    const res = await submitChecklistSnapshot(
      targetDay,
      updated,
      autoComplete || !!targetDay.userProgress?.isCompleted
    );

    if (!res.success) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: existing }));
      setActionNotice(
        { type: "error", text: res.message || "Failed to save checklist progress." },
        4000
      );
      return false;
    }

    syncCompletedFromServer(targetDay.id, res.data);
    if (autoComplete) {
      setActionNotice(
        { type: "success", text: `Day ${targetDay.dayNumber} checklist completed.` },
        3500
      );
    }
    return true;
  };

  const handleToggleChecklist = async (
    task: string,
    dayId?: string,
    isRepUpdate = false
  ) => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return;
    const existing = getCheckedItems(targetDay);
    const getBaseKey = (item: string) =>
      (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase();
    const targetBase = getBaseKey(task);
    const alreadyExists = existing.some((t) => getBaseKey(t) === targetBase);

    const updated = isRepUpdate
      ? alreadyExists
        ? existing.map((t) => (getBaseKey(t) === targetBase ? task : t))
        : [...existing, task]
      : alreadyExists
        ? existing.filter((t) => getBaseKey(t) !== targetBase)
        : [...existing, task];

    setDayChecklists((prev) => ({ ...prev, [targetDay.id]: updated }));

    const autoComplete = computeAutoComplete(targetDay, updated);
    const res = await submitChecklistSnapshot(targetDay, updated, autoComplete);

    if (!res.success) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: existing }));
      setActionNotice(
        { type: "error", text: res.message || "Failed to update checklist item." },
        4000
      );
      return;
    }

    syncCompletedFromServer(targetDay.id, res.data);
    if (autoComplete) {
      setActionNotice(
        { type: "success", text: `Day ${targetDay.dayNumber} checklist completed.` },
        3500
      );
    }
  };

  const handleSaveSleep = async (
    bedtime: string,
    wakeTime: string,
    sleepDurationMinutes: number,
    dayId?: string,
    sleepFeeling?: string,
    explicitDateKey?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? resolveTargetDay(dayId) : null;
    const dateKey = explicitDateKey || (targetDay ? getDayDateKey(targetDay) : formatWibDateKey(new Date()));
    const prevLog = dailyLogsByDate[dateKey];

    setDailyLogsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...ensureDateLog(dateKey),
        ...(prev[dateKey] || {}),
        bedtime,
        wakeTime,
        sleepDurationMinutes,
        sleepFeeling: sleepFeeling ?? prev[dateKey]?.sleepFeeling ?? null,
      },
    }));

    const res = await wellnessSaveDailySleep({
      logDate: dateKey,
      bedtime,
      wakeTime,
      sleepFeeling: sleepFeeling ?? null,
      programDayId: targetDay?.id ?? null,
    });

    if (!res.success || !res.data) {
      setDailyLogsByDate((prev) => {
        const next = { ...prev };
        if (prevLog) next[dateKey] = prevLog;
        else delete next[dateKey];
        return next;
      });
      setActionNotice({ type: "error", text: res.message || "Failed to save sleep log." }, 4000);
      return false;
    }

    setDailyLogsByDate((prev) => ({ ...prev, [dateKey]: res.data!.dailyLog }));
    applyServerCompletions(res.data.completionsByDayId);
    setActionNotice({ type: "success", text: "Sleep log saved & synced." }, 3000);
    return true;
  };

  const handleSelectWorkout = async (
    workout: string,
    dayId?: string,
    resetChecklist?: boolean
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevWorkout = dayWorkouts[targetDay.id];
    const prevChecklist = getCheckedItems(targetDay);
    setDayWorkouts((prev) => ({ ...prev, [targetDay.id]: workout }));
    const nextChecklist = resetChecklist ? [] : prevChecklist;
    if (resetChecklist) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: [] }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: nextChecklist,
      videoWatched: getVideoWatched(targetDay),
      selectedWorkout: workout,
    });

    if (!res.success) {
      setDayWorkouts((prev) => {
        const next = { ...prev };
        if (prevWorkout === undefined) delete next[targetDay.id];
        else next[targetDay.id] = prevWorkout;
        return next;
      });
      if (resetChecklist) {
        setDayChecklists((prev) => ({ ...prev, [targetDay.id]: prevChecklist }));
      }
      setActionNotice(
        { type: "error", text: res.message || "Failed to select workout." },
        4000
      );
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    return true;
  };

  const handleSaveWorkoutNotes = async (
    notes: string,
    dayId?: string,
    extra?: { selectedWorkout?: string; checklistCompleted?: string[]; videoWatched?: boolean }
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevNotes = dayWorkoutNotes[targetDay.id];
    const prevWorkout = dayWorkouts[targetDay.id];
    const prevChecklist = getCheckedItems(targetDay);
    const prevVideoWatched = dayVideoWatched[targetDay.id];
    const nextChecklist = extra?.checklistCompleted ?? prevChecklist;
    const nextVideoWatched = extra?.videoWatched ?? getVideoWatched(targetDay);

    setDayWorkoutNotes((prev) => ({ ...prev, [targetDay.id]: notes }));
    if (extra?.selectedWorkout) {
      setDayWorkouts((prev) => ({ ...prev, [targetDay.id]: extra.selectedWorkout! }));
    }
    if (extra?.checklistCompleted) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: extra.checklistCompleted! }));
    }
    if (extra?.videoWatched !== undefined) {
      setDayVideoWatched((prev) => ({ ...prev, [targetDay.id]: extra.videoWatched! }));
    }

    const autoComplete = computeAutoComplete(targetDay, nextChecklist, {
      workoutNotes: notes,
      videoWatched: nextVideoWatched,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete,
      checklistCompleted: nextChecklist,
      videoWatched: nextVideoWatched,
      ...(extra?.selectedWorkout ? { selectedWorkout: extra.selectedWorkout } : {}),
      workoutNotes: notes,
    });

    if (!res.success) {
      setDayWorkoutNotes((prev) => {
        const next = { ...prev };
        if (prevNotes === undefined) delete next[targetDay.id];
        else next[targetDay.id] = prevNotes;
        return next;
      });
      if (extra?.selectedWorkout) {
        setDayWorkouts((prev) => {
          const next = { ...prev };
          if (prevWorkout === undefined) delete next[targetDay.id];
          else next[targetDay.id] = prevWorkout;
          return next;
        });
      }
      if (extra?.checklistCompleted) {
        setDayChecklists((prev) => ({ ...prev, [targetDay.id]: prevChecklist }));
      }
      if (extra?.videoWatched !== undefined) {
        setDayVideoWatched((prev) => {
          const next = { ...prev };
          if (prevVideoWatched === undefined) delete next[targetDay.id];
          else next[targetDay.id] = prevVideoWatched;
          return next;
        });
      }
      setActionNotice(
        { type: "error", text: res.message || "Failed to save workout notes." },
        4000
      );
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    setActionNotice({ type: "success", text: "Training notes saved successfully." }, 3000);
    return true;
  };

  const handleSaveEventFeedback = async (
    feedbackText: string,
    dayId?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevFeedback = dayEventFeedback[targetDay.id];
    setDayEventFeedback((prev) => ({ ...prev, [targetDay.id]: feedbackText }));

    const autoComplete = computeAutoComplete(targetDay, getCheckedItems(targetDay), {
      eventFeedback: feedbackText,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      eventFeedback: feedbackText,
    });

    if (!res.success) {
      setDayEventFeedback((prev) => {
        const next = { ...prev };
        if (prevFeedback === undefined) delete next[targetDay.id];
        else next[targetDay.id] = prevFeedback;
        return next;
      });
      setActionNotice(
        { type: "error", text: res.message || "Failed to save event feedback." },
        4000
      );
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    onRefresh();
    return true;
  };

  const handleSaveMeal = async (
    compliance: string,
    notes: string,
    dayId?: string,
    explicitDateKey?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? resolveTargetDay(dayId) : null;
    const dateKey =
      explicitDateKey || (targetDay ? getDayDateKey(targetDay) : formatWibDateKey(new Date()));
    const prevLog = dailyLogsByDate[dateKey];
    const prevCompliance = targetDay ? dayMealCompliance[targetDay.id] : undefined;
    const prevMealNotes = targetDay ? dayMealNotes[targetDay.id] : undefined;

    const existingNotes = targetDay
      ? prevMealNotes !== undefined
        ? prevMealNotes
        : targetDay.userProgress?.mealNotes
      : null;
    const mergedNotes = mergeMealNotesPayload(existingNotes, notes) ?? notes;
    const nutr = extractNutritionFromMealNotes(mergedNotes);

    let parsedMealsCount = 1;
    let parsedMealFeeling: string | null = null;
    let parsedEntries: Array<{
      status: "followed" | "similar" | "off_track" | "self_logged";
      mealItem?: string;
      calories?: number | null;
      carbsG?: number | null;
      proteinG?: number | null;
      fatG?: number | null;
    }> = [];
    try {
      const obj = JSON.parse(mergedNotes) as {
        mealsCount?: number;
        mealFeeling?: string;
        mealEntries?: typeof parsedEntries;
      };
      if (typeof obj?.mealsCount === "number" && obj.mealsCount >= 1 && obj.mealsCount <= 6) {
        parsedMealsCount = Math.round(obj.mealsCount);
      }
      if (typeof obj?.mealFeeling === "string" && obj.mealFeeling.trim()) {
        parsedMealFeeling = obj.mealFeeling.trim();
      }
      if (Array.isArray(obj?.mealEntries)) {
        parsedEntries = obj.mealEntries.slice(0, 6);
      }
    } catch {
      // plain text fallback
    }

    const qualityMode =
      compliance === "SELF_LOGGED"
        ? "SELF_LOGGED"
        : mapProgramComplianceToMealQuality(compliance) ?? "SELF_LOGGED";

    if (targetDay) {
      setDayMealCompliance((prev) => ({ ...prev, [targetDay.id]: compliance }));
      setDayMealNotes((prev) => ({ ...prev, [targetDay.id]: mergedNotes }));
    }
    setDailyLogsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...ensureDateLog(dateKey),
        ...(prev[dateKey] || {}),
        mealsCount: parsedMealsCount,
        caloriesKcal: nutr.calories,
        carbsG: nutr.carbsG,
        proteinG: nutr.proteinG,
        fatG: nutr.fatG,
        mealQualityMode: qualityMode,
        mealFeeling: parsedMealFeeling,
        mealEntriesJson: parsedEntries,
      },
    }));

    const validProgComp = ["FULL", "SIMILAR", "PARTIAL", "OFF_TRACK", "SKIPPED"].includes(
      compliance
    )
      ? (compliance as "FULL" | "SIMILAR" | "PARTIAL" | "OFF_TRACK" | "SKIPPED")
      : null;

    const res = await wellnessSaveDailyMeal({
      logDate: dateKey,
      mealsCount: parsedMealsCount,
      caloriesKcal: nutr.calories,
      carbsG: nutr.carbsG,
      proteinG: nutr.proteinG,
      fatG: nutr.fatG,
      mealQualityMode: qualityMode,
      mealFeeling: parsedMealFeeling,
      mealEntries: parsedEntries,
      programDayId: targetDay?.id ?? null,
      programMealCompliance: targetDay ? validProgComp : null,
      legacyMealNotesJson: targetDay ? mergedNotes : null,
    });

    if (!res.success || !res.data) {
      if (targetDay) {
        setDayMealCompliance((prev) => {
          const next = { ...prev };
          if (prevCompliance === undefined) delete next[targetDay.id];
          else next[targetDay.id] = prevCompliance;
          return next;
        });
        setDayMealNotes((prev) => {
          const next = { ...prev };
          if (prevMealNotes === undefined) delete next[targetDay.id];
          else next[targetDay.id] = prevMealNotes;
          return next;
        });
      }
      setDailyLogsByDate((prev) => {
        const next = { ...prev };
        if (prevLog) next[dateKey] = prevLog;
        else delete next[dateKey];
        return next;
      });
      setActionNotice(
        { type: "error", text: res.message || "Failed to save meal control log." },
        4000
      );
      return false;
    }

    setDailyLogsByDate((prev) => ({ ...prev, [dateKey]: res.data!.dailyLog }));
    applyServerCompletions(res.data.completionsByDayId);
    setActionNotice({ type: "success", text: "Meal log saved & synced." }, 3000);
    return true;
  };

  const handleSaveWater = async (
    waterMl: number,
    dayId?: string,
    explicitDateKey?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? resolveTargetDay(dayId) : null;
    const dateKey =
      explicitDateKey || (targetDay ? getDayDateKey(targetDay) : formatWibDateKey(new Date()));
    const prevLog = dailyLogsByDate[dateKey];
    const safeWater = Math.max(0, Math.min(15000, Math.round(waterMl)));

    setDailyLogsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...ensureDateLog(dateKey),
        ...(prev[dateKey] || {}),
        waterMl: safeWater,
      },
    }));

    const res = await wellnessSaveDailyWater({
      logDate: dateKey,
      waterMl: safeWater,
      programDayId: targetDay?.id ?? null,
    });

    if (!res.success || !res.data) {
      setDailyLogsByDate((prev) => {
        const next = { ...prev };
        if (prevLog) next[dateKey] = prevLog;
        else delete next[dateKey];
        return next;
      });
      setActionNotice(
        { type: "error", text: res.message || "Failed to save water intake." },
        4000
      );
      return false;
    }

    setDailyLogsByDate((prev) => ({ ...prev, [dateKey]: res.data!.dailyLog }));
    applyServerCompletions(res.data.completionsByDayId);
    setActionNotice(
      {
        type: "success",
        text: `Water intake saved (${(safeWater / 1000).toFixed(1)} L).`,
      },
      3000
    );
    return true;
  };

  const handleSaveSteps = async (
    stepsCount: number,
    dayId?: string,
    explicitDateKey?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? resolveTargetDay(dayId) : null;
    const dateKey =
      explicitDateKey || (targetDay ? getDayDateKey(targetDay) : formatWibDateKey(new Date()));
    const prevLog = dailyLogsByDate[dateKey];
    const safeSteps = Math.max(0, Math.min(100000, Math.round(stepsCount)));

    setDailyLogsByDate((prev) => ({
      ...prev,
      [dateKey]: {
        ...ensureDateLog(dateKey),
        ...(prev[dateKey] || {}),
        stepsCount: safeSteps,
        stepsBurnedKcal: computeStepsBurnedKcal(safeSteps),
      },
    }));

    const res = await wellnessSaveDailySteps({
      logDate: dateKey,
      stepsCount: safeSteps,
      programDayId: targetDay?.id ?? null,
    });

    if (!res.success || !res.data) {
      setDailyLogsByDate((prev) => {
        const next = { ...prev };
        if (prevLog) next[dateKey] = prevLog;
        else delete next[dateKey];
        return next;
      });
      setActionNotice(
        { type: "error", text: res.message || "Failed to save daily steps." },
        4000
      );
      return false;
    }

    setDailyLogsByDate((prev) => ({ ...prev, [dateKey]: res.data!.dailyLog }));
    applyServerCompletions(res.data.completionsByDayId);
    setActionNotice(
      { type: "success", text: `Daily steps saved (${safeSteps.toLocaleString()} steps).` },
      3000
    );
    return true;
  };

  const handleAddExtraWorkout = async (payload: {
    logDate: string;
    activityType: "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom";
    title: string;
    durationMinutes: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
    programDayId?: string | null;
  }): Promise<boolean> => {
    const res = await wellnessAddExtraWorkout(payload);
    if (!res.success || !res.data) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to log extra training." },
        4000
      );
      return false;
    }
    setDailyLogsByDate((prev) => ({ ...prev, [payload.logDate]: res.data!.dailyLog }));
    setActionNotice({ type: "success", text: "Extra training logged." }, 3000);
    return true;
  };

  const handleUpdateExtraWorkout = async (payload: {
    id: string;
    logDate: string;
    title?: string;
    durationMinutes?: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
    programDayId?: string | null;
  }): Promise<boolean> => {
    const res = await wellnessUpdateExtraWorkout(payload);
    if (!res.success || !res.data) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to update extra training." },
        4000
      );
      return false;
    }
    setDailyLogsByDate((prev) => ({ ...prev, [payload.logDate]: res.data!.dailyLog }));
    setActionNotice({ type: "success", text: "Extra training updated." }, 3000);
    return true;
  };

  const handleDeleteExtraWorkout = async (
    id: string,
    logDate: string,
    programDayId?: string | null
  ): Promise<boolean> => {
    const res = await wellnessDeleteExtraWorkout({ id, programDayId: programDayId ?? null });
    if (!res.success || !res.data) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to remove extra training." },
        4000
      );
      return false;
    }
    setDailyLogsByDate((prev) => ({ ...prev, [logDate]: res.data!.dailyLog }));
    setActionNotice({ type: "success", text: "Extra training removed." }, 2500);
    return true;
  };

  const handleSaveReflection = async (
    reflection: string,
    happinessRate: number,
    dayId?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    setDayReflections((prev) => ({ ...prev, [targetDay.id]: reflection }));
    setDayHappiness((prev) => ({ ...prev, [targetDay.id]: happinessRate }));

    const autoComplete = computeAutoComplete(targetDay, getCheckedItems(targetDay), {
      dailyReflection: reflection,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete || !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      dailyReflection: reflection,
      happinessRate,
    });

    if (!res.success) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to save Dear Diary reflection." },
        4000
      );
      return false;
    }
    setActionNotice({ type: "success", text: "Daily reflection saved." }, 3000);
    return true;
  };

  const handleCompleteProgramDay = async (dayId: string): Promise<boolean> => {
    const target = currentProgram?.days.find((d) => d.id === dayId);
    if (!target) return false;
    const res = await wellnessUserSubmitDayProgress({
      programDayId: target.id,
      isCompleted: true,
      checklistCompleted: getCheckedItems(target),
      videoWatched: getVideoWatched(target),
    });
    if (!res.success) {
      setActionNotice(
        { type: "error", text: res.message || "Could not complete the day." },
        4000
      );
      return false;
    }
    setActionNotice({ type: "success", text: `Day ${target.dayNumber} completed.` }, 3000);
    onRefresh();
    return true;
  };

  return {
    dailyLogsByDate,
    dayChecklists,
    overlayDay,
    setDayCompletedOverride,
    setCustomSubmissionsByTaskId,
    handleOpenVideo,
    handleSyncChecklist,
    handleToggleChecklist,
    handleSaveSleep,
    handleSelectWorkout,
    handleSaveWorkoutNotes,
    handleSaveEventFeedback,
    handleSaveMeal,
    handleSaveWater,
    handleSaveSteps,
    handleAddExtraWorkout,
    handleUpdateExtraWorkout,
    handleDeleteExtraWorkout,
    handleSaveReflection,
    handleCompleteProgramDay,
  };
}
