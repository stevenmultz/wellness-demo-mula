"use client";

import { useState } from "react";
import { wellnessUserSubmitDayProgress } from "@/wellness/actions/program";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { ActionNotice, ProgramDayItem, ProgramItem } from "./types";

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
        return JSON.parse(day.userProgress.checklistCompleted);
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

  const computeAutoComplete = (targetDay: ProgramDayItem, updatedChecklist: string[]) => {
    const videoDone =
      targetDay.dayType !== "TRAINING_DAY" || !targetDay.videoUrl
        ? true
        : getVideoWatched(targetDay);
    const restItems = (targetDay.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);
    const allTasksDone =
      targetDay.dayType === "REST_DAY"
        ? restItems.length === 0 || restItems.every((name) => updatedChecklist.includes(name))
        : areActiveWorkoutMovementsCompleted(targetDay, updatedChecklist);
    return videoDone && allTasksDone;
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

  const handleSaveSleep = async (
    bedtime: string,
    wakeTime: string,
    sleepDurationMinutes: number,
    dayId?: string,
    sleepFeeling?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
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

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      bedtime,
      wakeTime,
      sleepDurationMinutes,
      ...(formattedAssessment !== undefined ? { assessmentResponse: formattedAssessment } : {}),
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save sleep log." }, 4000);
      return false;
    }
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
    setDayWorkouts((prev) => ({ ...prev, [targetDay.id]: workout }));
    const nextChecklist = resetChecklist ? [] : getCheckedItems(targetDay);
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
      setActionNotice(
        { type: "error", text: res.message || "Failed to select workout." },
        4000
      );
      return false;
    }
    return true;
  };

  const handleSaveWorkoutNotes = async (notes: string, dayId?: string): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    setDayWorkoutNotes((prev) => ({ ...prev, [targetDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      workoutNotes: notes,
    });

    if (!res.success) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to save workout notes." },
        4000
      );
      return false;
    }
    setActionNotice({ type: "success", text: "Training notes saved successfully." }, 3000);
    return true;
  };

  const handleSaveEventFeedback = async (
    feedbackText: string,
    dayId?: string
  ): Promise<boolean> => {
    const targetDay = resolveTargetDay(dayId);
    if (!targetDay) return false;
    setDayEventFeedback((prev) => ({ ...prev, [targetDay.id]: feedbackText }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      eventFeedback: feedbackText,
    });

    if (!res.success) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to save event feedback." },
        4000
      );
      return false;
    }
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
    setDayMealCompliance((prev) => ({ ...prev, [targetDay.id]: compliance }));
    setDayMealNotes((prev) => ({ ...prev, [targetDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      mealCompliance: compliance,
      mealNotes: notes,
    });

    if (!res.success) {
      setActionNotice(
        { type: "error", text: res.message || "Failed to save nutrition notes." },
        4000
      );
      return false;
    }
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

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
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
