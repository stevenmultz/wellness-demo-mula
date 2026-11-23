"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import {
  wellnessAdminDeleteProgramDay,
  wellnessAdminSaveProgramDay,
} from "@/wellness/actions/program";
import {
  DEFAULT_WORKOUT_OPTION_GROUPS,
  parseDayVideoLinks,
  parseWorkoutOptionGroups,
  serializeDayVideoLinks,
  serializeWorkoutOptionGroups,
} from "@/wellness/utils/json";
import { normalizeCustomTaskDrafts } from "../AdminCustomTasksBuilder";
import {
  getDefaultNotificationsForType,
  type AdminDayFormState,
  type AdminFeedbackMessage,
  type AdminInitialRoute,
  type AdminProgram,
  type AdminProgramDay,
} from "../adminTypes";

interface UseAdminDayActionsArgs {
  initialRoute?: AdminInitialRoute;
  programs: AdminProgram[];
  setPrograms: Dispatch<SetStateAction<AdminProgram[]>>;
  setFeedback: (fb: AdminFeedbackMessage | null) => void;
}

const DEFAULT_DAY_FORM: AdminDayFormState = {
  title: "",
  dayType: "TRAINING_DAY",
  workoutOptions: ["Workout", "Pilates", "Yoga"],
  workoutGroups: DEFAULT_WORKOUT_OPTION_GROUPS.map((g) => ({
    optionName: g.optionName,
    movements: g.movements.map((m) => ({ ...m })),
  })),
  sleepRecommendation: "Target 8 Hours • Wind down before 22:30 WIB",
  dayNotifications: getDefaultNotificationsForType("TRAINING_DAY"),
  videoUrl: "",
  videoLinks: [
    {
      title: "Primary Workout Session",
      url: "https://www.youtube.com/watch?v=sTANio_2E0Q",
    },
  ],
  videoChecklist: [
    "[Workout] Push-up = 30 reps",
    "[Workout] Sit-up = 50 reps",
    "[Workout] Pull-up = 10 reps",
  ],
  mealRecommendation: "",
  restInstructions: "",
  onsiteVenue: "Jakarta",
  onsiteSchedule: "09:00 – 11:00 WIB",
  meetupLink: "",
  mapLink: "",
  eventTitle: "",
  eventHost: "",
  eventDetails: "",
  customTasks: [],
};

export function useAdminDayActions({
  initialRoute,
  programs,
  setPrograms,
  setFeedback,
}: UseAdminDayActionsArgs) {
  const router = useRouter();

  const [selectedDayNum, setSelectedDayNum] = useState<number>(initialRoute?.day || 1);
  const [savingDay, setSavingDay] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [expandedDaySections, setExpandedDaySections] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });
  const [dayForm, setDayForm] = useState<AdminDayFormState>(DEFAULT_DAY_FORM);

  const toggleDaySection = (sec: number) => {
    setExpandedDaySections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const setAllDaySections = (expanded: boolean) => {
    setExpandedDaySections({
      1: expanded,
      2: expanded,
      3: expanded,
      4: expanded,
      5: expanded,
      6: expanded,
    });
  };

  const loadDayIntoForm = (prog: AdminProgram, dayNumber: number) => {
    const existing = prog.days.find((d) => d.dayNumber === dayNumber);

    if (existing) {
      const normalizedType =
        existing.dayType === "REST_DAY"
          ? "REST_DAY"
          : existing.dayType === "CONNECTION_DAY" || existing.dayType === "MEETUP_DAY"
          ? "CONNECTION_DAY"
          : "TRAINING_DAY";

      const parsedVideoLinks = parseDayVideoLinks(existing.videoUrl);
      const parsedWorkoutGroups = parseWorkoutOptionGroups(
        existing.workoutOptions,
        existing.videoChecklist
      );
      const serializedGroups = serializeWorkoutOptionGroups(parsedWorkoutGroups);

      setDayForm({
        title: existing.title,
        dayType: normalizedType,
        workoutOptions: serializedGroups.workoutOptions,
        workoutGroups: parsedWorkoutGroups,
        sleepRecommendation:
          existing.sleepRecommendation || "Target 8 Hours • Wind down before 22:30 WIB",
        dayNotifications:
          existing.dayNotifications && existing.dayNotifications.length > 0
            ? existing.dayNotifications
            : getDefaultNotificationsForType(normalizedType),
        videoUrl: existing.videoUrl || "",
        videoLinks:
          parsedVideoLinks.length > 0
            ? parsedVideoLinks
            : [{ title: "Primary Workout Session", url: "" }],
        videoChecklist: serializedGroups.videoChecklist,
        mealRecommendation:
          existing.mealRecommendation ||
          "High-protein breakfast, balanced lunch with greens, and light dinner before 19:30 WIB.",
        restInstructions: existing.restInstructions || "",
        onsiteVenue: existing.onsiteVenue || prog.city || "Jakarta",
        onsiteSchedule: existing.onsiteSchedule || "09:00 – 11:00 WIB",
        meetupLink: existing.meetupLink || "",
        mapLink: existing.mapLink || "",
        eventTitle: existing.eventTitle || "",
        eventHost: existing.eventHost || "",
        eventDetails: existing.eventDetails || "",
        customTasks: normalizeCustomTaskDrafts(existing.customTasks),
      });
    } else {
      const defaultGroups = DEFAULT_WORKOUT_OPTION_GROUPS.map((g) => ({
        optionName: g.optionName,
        movements: g.movements.map((m) => ({ ...m })),
      }));
      const serializedDefaultGroups = serializeWorkoutOptionGroups(defaultGroups);

      setDayForm({
        title: `${(prog.locationType || "ONLINE") === "ONLINE" ? "Module" : "Day"} ${dayNumber}: Daily Session`,
        dayType: "TRAINING_DAY",
        workoutOptions: serializedDefaultGroups.workoutOptions,
        workoutGroups: defaultGroups,
        sleepRecommendation: "Target 8 Hours • Wind down before 22:30 WIB",
        dayNotifications: getDefaultNotificationsForType("TRAINING_DAY"),
        videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
        videoLinks: [
          {
            title: "Primary Workout Session",
            url: "https://www.youtube.com/watch?v=sTANio_2E0Q",
          },
        ],
        videoChecklist: serializedDefaultGroups.videoChecklist,
        mealRecommendation:
          "High-protein breakfast, balanced lunch with greens, and light dinner before 19:30 WIB.",
        restInstructions: "",
        onsiteVenue: prog.city || "Jakarta",
        onsiteSchedule: "09:00 – 11:00 WIB",
        meetupLink: "",
        mapLink: "",
        eventTitle: "",
        eventHost: "",
        eventDetails: "",
        customTasks: [],
      });
    }
  };

  const handleSelectDay = (prog: AdminProgram, dayNum: number) => {
    setSelectedDayNum(dayNum);
    setFeedback(null);
    setAllDaySections(false);
    loadDayIntoForm(prog, dayNum);
    router.push(`/admin/programs/${prog.id}?tab=schedule&day=${dayNum}`);
  };

  const handleSaveDay = async (prog: AdminProgram, moveNext = false) => {
    setSavingDay(true);
    setFeedback(null);
    setDayError(null);

    try {
      const serializedVideos = serializeDayVideoLinks(dayForm.videoLinks);
      const serializedWorkouts = serializeWorkoutOptionGroups(dayForm.workoutGroups);
      const isConnect =
        dayForm.dayType === "CONNECTION_DAY" || dayForm.dayType === "MEETUP_DAY";

      const res = await wellnessAdminSaveProgramDay({
        programId: prog.id,
        dayNumber: selectedDayNum,
        title: dayForm.title,
        dayType: dayForm.dayType,
        workoutOptions:
          dayForm.dayType === "TRAINING_DAY" ? serializedWorkouts.workoutOptions : [],
        sleepRecommendation: dayForm.sleepRecommendation,
        dayNotifications: dayForm.dayNotifications,
        videoUrl: dayForm.dayType === "TRAINING_DAY" ? serializedVideos : "",
        videoChecklist:
          dayForm.dayType === "TRAINING_DAY" ? serializedWorkouts.videoChecklist : [],
        mealRecommendation: dayForm.mealRecommendation,
        restInstructions:
          dayForm.dayType === "REST_DAY" ? dayForm.restInstructions : "",
        onsiteVenue: isConnect ? dayForm.onsiteVenue : "",
        onsiteSchedule: isConnect ? dayForm.onsiteSchedule : "",
        meetupLink: isConnect ? dayForm.meetupLink : "",
        mapLink: isConnect ? dayForm.mapLink : "",
        eventTitle: isConnect ? dayForm.eventTitle : "",
        eventHost: isConnect ? dayForm.eventHost : "",
        eventDetails: isConnect ? dayForm.eventDetails : "",
        customTasks: dayForm.customTasks.map((ct, idx) => ({
          id: ct.id,
          sortOrder: idx,
          taskType: ct.taskType,
          title: ct.title,
          instructions: ct.instructions,
          isRequired: true,
          fields: ct.fields,
          translations: ct.translations || null,
        })),
      });

      if (res.success && res.data) {
        setDayError(null);
        const savedDay = res.data as AdminProgramDay;
        const updatedPrograms = programs.map((p) => {
          if (p.id !== prog.id) return p;
          const otherDays = p.days.filter((d) => d.dayNumber !== selectedDayNum);
          const nextDays = [...otherDays, savedDay].sort(
            (a, b) => a.dayNumber - b.dayNumber
          );
          const nextDuration =
            (p.locationType || "ONLINE") === "ONLINE"
              ? Math.max(1, ...nextDays.map((d) => d.dayNumber))
              : p.durationDays;
          return {
            ...p,
            days: nextDays,
            dayCount: nextDays.length,
            durationDays: nextDuration,
          };
        });
        setPrograms(updatedPrograms);
        const updatedProg = updatedPrograms.find((p) => p.id === prog.id) || prog;
        const isOnlineProg = (updatedProg.locationType || "ONLINE") === "ONLINE";

        if (moveNext && (isOnlineProg ? selectedDayNum < 90 : selectedDayNum < updatedProg.durationDays)) {
          const nextDay = selectedDayNum + 1;
          setSelectedDayNum(nextDay);
          loadDayIntoForm(updatedProg, nextDay);
          setFeedback({
            type: "success",
            text: `${isOnlineProg ? "Module" : "Day"} ${selectedDayNum} saved. Moved to ${isOnlineProg ? "Module" : "Day"} ${nextDay}.`,
          });
          router.push(`/admin/programs/${prog.id}?tab=schedule&day=${nextDay}`);
        } else {
          setFeedback({
            type: "success",
            text: `${isOnlineProg ? "Module" : "Day"} ${selectedDayNum} saved.`,
          });
          router.refresh();
        }
      } else {
        const errMsg = res.message || "Unable to save day curriculum.";
        setDayError(errMsg);
        setFeedback({ type: "error", text: errMsg });
      }
    } catch {
      const netErr = "Network error while saving day curriculum.";
      setDayError(netErr);
      setFeedback({ type: "error", text: netErr });
    } finally {
      setSavingDay(false);
    }
  };

  const handleClearDay = async (prog: AdminProgram) => {
    setSavingDay(true);
    setFeedback(null);
    try {
      const res = await wellnessAdminDeleteProgramDay(prog.id, selectedDayNum);
      if (res.success) {
        const updatedPrograms = programs.map((p) => {
          if (p.id !== prog.id) return p;
          const nextDays = p.days.filter((d) => d.dayNumber !== selectedDayNum);
          const nextDuration =
            (p.locationType || "ONLINE") === "ONLINE"
              ? Math.max(1, ...(nextDays.length ? nextDays.map((d) => d.dayNumber) : [1]))
              : p.durationDays;
          return {
            ...p,
            days: nextDays,
            dayCount: nextDays.length,
            durationDays: nextDuration,
            isPublished: false,
          };
        });
        setPrograms(updatedPrograms);
        const updatedProg = updatedPrograms.find((p) => p.id === prog.id) || prog;
        loadDayIntoForm(updatedProg, selectedDayNum);
        setFeedback({
          type: "success",
          text: `Day ${selectedDayNum} cleared. Program moved to Draft.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.message || "Failed to clear day." });
      }
    } finally {
      setSavingDay(false);
    }
  };

  return {
    selectedDayNum,
    setSelectedDayNum,
    savingDay,
    dayError,
    expandedDaySections,
    toggleDaySection,
    setAllDaySections,
    dayForm,
    setDayForm,
    loadDayIntoForm,
    handleSelectDay,
    handleSaveDay,
    handleClearDay,
  };
}
