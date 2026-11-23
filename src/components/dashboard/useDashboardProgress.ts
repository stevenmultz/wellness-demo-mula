"use client";

import { useState } from "react";
import { wellnessUserSubmitDayProgress as rawWellnessUserSubmitDayProgress } from "@/wellness/actions/program";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { ActionNotice, ProgramDayItem, ProgramItem } from "./types";

async function wellnessUserSubmitDayProgress(
  payload: Parameters<typeof rawWellnessUserSubmitDayProgress>[0]
): ReturnType<typeof rawWellnessUserSubmitDayProgress> {
  try {
    return await rawWellnessUserSubmitDayProgress(payload);
  } catch {
    return {
      success: false,
      message: "Network error while saving progress. Please check your connection and try again.",
    };
  }
}

interface UseDashboardProgressParams {
  currentProgram: ProgramItem | null;
  calendarDay: ProgramDayItem | null;
  setActionNotice: (next: ActionNotice | null, autoDismissMs?: number) => void;
  onRefresh: () => void;
}

export function useDashboardProgress({
  currentProgram,
  calendarDay,
  setActionNotice,
  onRefresh,
}: UseDashboardProgressParams) {
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

  const overlayDay = (day: ProgramDayItem): ProgramDayItem => ({
    ...day,
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
      mealCompliance: dayMealCompliance[day.id] ?? day.userProgress?.mealCompliance,
      mealNotes:
        dayMealNotes[day.id] !== undefined
          ? dayMealNotes[day.id]
          : day.userProgress?.mealNotes,
      dailyReflection:
        dayReflections[day.id] !== undefined
          ? dayReflections[day.id]
          : day.userProgress?.dailyReflection,
      happinessRate: dayHappiness[day.id] ?? day.userProgress?.happinessRate,
      bedtime: dayBedtimes[day.id] ?? day.userProgress?.bedtime,
      wakeTime: dayWakeTimes[day.id] ?? day.userProgress?.wakeTime,
      workoutNotes: dayWorkoutNotes[day.id] ?? day.userProgress?.workoutNotes,
      selectedWorkout: dayWorkouts[day.id] ?? day.userProgress?.selectedWorkout,
      assessmentResponse: dayAssessments[day.id] ?? day.userProgress?.assessmentResponse,
    },
  });

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
      dailyReflection?: string;
      videoWatched?: boolean;
    }
  ) => {
    const bed = overrides?.bedtime ?? dayBedtimes[targetDay.id] ?? targetDay.userProgress?.bedtime;
    const wake = overrides?.wakeTime ?? dayWakeTimes[targetDay.id] ?? targetDay.userProgress?.wakeTime;
    const sleepDone = Boolean(bed && wake && bed !== "SKIPPED" && wake !== "SKIPPED");

    const mealComp =
      overrides?.mealCompliance ??
      dayMealCompliance[targetDay.id] ??
      targetDay.userProgress?.mealCompliance;
    const mealDone = Boolean(mealComp && mealComp !== "SKIPPED");

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

    // All custom tasks on the day are required (no optional custom tasks; Daily Reflection removed)
    const allCustomDone = (targetDay.customTasks || []).every((ct) =>
      Boolean(customSubmissionsByTaskId[ct.id] ?? ct.submission)
    );

    return sleepDone && activityDone && mealDone && allCustomDone;
  };

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
      mealCompliance:
        dayMealCompliance[targetDay.id] ||
        targetDay.userProgress?.mealCompliance ||
        undefined,
      mealNotes:
        dayMealNotes[targetDay.id] !== undefined
          ? dayMealNotes[targetDay.id]
          : targetDay.userProgress?.mealNotes || undefined,
      dailyReflection:
        dayReflections[targetDay.id] !== undefined
          ? dayReflections[targetDay.id]
          : targetDay.userProgress?.dailyReflection || undefined,
      happinessRate:
        dayHappiness[targetDay.id] || targetDay.userProgress?.happinessRate || undefined,
      bedtime: dayBedtimes[targetDay.id] || targetDay.userProgress?.bedtime || undefined,
      wakeTime: dayWakeTimes[targetDay.id] || targetDay.userProgress?.wakeTime || undefined,
      assessmentResponse:
        dayAssessments[targetDay.id] !== undefined
          ? dayAssessments[targetDay.id]
          : targetDay.userProgress?.assessmentResponse || "",
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

    if (autoComplete) {
      setActionNotice(
        { type: "success", text: `Day ${targetDay.dayNumber} checklist completed.` },
        3500
      );
    }
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

  const handleSaveSleep = async (
    bedtime: string,
    wakeTime: string,
    sleepDurationMinutes: number,
    dayId?: string,
    sleepFeeling?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevBed = dayBedtimes[targetDay.id];
    const prevWake = dayWakeTimes[targetDay.id];
    const prevAssess = dayAssessments[targetDay.id];
    const formattedAssessment =
      bedtime === "SKIPPED"
        ? ""
        : sleepFeeling
          ? `Sleep Feeling: ${sleepFeeling}`
          : undefined;
    setDayBedtimes((prev) => ({ ...prev, [targetDay.id]: bedtime }));
    setDayWakeTimes((prev) => ({ ...prev, [targetDay.id]: wakeTime }));
    if (formattedAssessment !== undefined) {
      setDayAssessments((prev) => ({ ...prev, [targetDay.id]: formattedAssessment }));
    }

    const autoComplete = computeAutoComplete(targetDay, getCheckedItems(targetDay), {
      bedtime,
      wakeTime,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      bedtime,
      wakeTime,
      sleepDurationMinutes,
      ...(formattedAssessment !== undefined ? { assessmentResponse: formattedAssessment } : {}),
    });

    if (!res.success) {
      setDayBedtimes((prev) => {
        const next = { ...prev };
        if (prevBed === undefined) delete next[targetDay.id];
        else next[targetDay.id] = prevBed;
        return next;
      });
      setDayWakeTimes((prev) => {
        const next = { ...prev };
        if (prevWake === undefined) delete next[targetDay.id];
        else next[targetDay.id] = prevWake;
        return next;
      });
      if (formattedAssessment !== undefined) {
        setDayAssessments((prev) => {
          const next = { ...prev };
          if (prevAssess === undefined) delete next[targetDay.id];
          else next[targetDay.id] = prevAssess;
          return next;
        });
      }
      setActionNotice({ type: "error", text: res.message || "Failed to save sleep log." }, 4000);
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    setActionNotice({ type: "success", text: "Sleep log saved successfully." }, 3000);
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
    extra?: { selectedWorkout?: string; checklistCompleted?: string[] }
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevNotes = dayWorkoutNotes[targetDay.id];
    const prevWorkout = dayWorkouts[targetDay.id];
    const prevChecklist = getCheckedItems(targetDay);
    const nextChecklist = extra?.checklistCompleted ?? prevChecklist;

    setDayWorkoutNotes((prev) => ({ ...prev, [targetDay.id]: notes }));
    if (extra?.selectedWorkout) {
      setDayWorkouts((prev) => ({ ...prev, [targetDay.id]: extra.selectedWorkout! }));
    }
    if (extra?.checklistCompleted) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: extra.checklistCompleted! }));
    }

    const autoComplete = computeAutoComplete(targetDay, nextChecklist, {
      workoutNotes: notes,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete,
      checklistCompleted: nextChecklist,
      videoWatched: getVideoWatched(targetDay),
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
    dayId?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    const prevCompliance = dayMealCompliance[targetDay.id];
    const prevMealNotes = dayMealNotes[targetDay.id];
    setDayMealCompliance((prev) => ({ ...prev, [targetDay.id]: compliance }));
    setDayMealNotes((prev) => ({ ...prev, [targetDay.id]: notes }));

    const autoComplete = computeAutoComplete(targetDay, getCheckedItems(targetDay), {
      mealCompliance: compliance,
    });
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: autoComplete,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      mealCompliance: compliance,
      mealNotes: notes,
    });

    if (!res.success) {
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
      setActionNotice(
        { type: "error", text: res.message || "Failed to save nutrition notes." },
        4000
      );
      return false;
    }
    syncCompletedFromServer(targetDay.id, res.data);
    setActionNotice({ type: "success", text: "Nutrition notes saved successfully." }, 3000);
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
    handleSaveReflection,
    handleCompleteProgramDay,
  };
}
