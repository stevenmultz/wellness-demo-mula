import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { ExtraWorkoutDTO } from "@/wellness/services/daily-log";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { extractWaterMl } from "@/wellness/utils/nutrition";
import { computeSafeSleepMinutes } from "@/wellness/utils/wellness-metrics";
import {
  isMealLogged,
  isMovementChecked as isMovementCheckedCore,
  isSleepLogged,
} from "@/wellness/utils/day-completion";

export interface PlanDay {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  unlockDate: string;
  wibDateKey?: string;
  isCalendarUnlocked: boolean;
  isPast2359: boolean;
  videoUrl: string | null;
  videoChecklist: string[];
  workoutOptions?: string[];
  mealRecommendation: string | null;
  meetupLink: string | null;
  mapLink?: string | null;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  eventTitle?: string | null;
  eventDetails?: string | null;
  restInstructions: string | null;
  sleepRecommendation?: string | null;
  eventHost?: string | null;
  coachName?: string | null;
  customTasks?: ProgramDayCustomTaskDTO[];
  /** Cross-program global training aggregation for this calendar date (e.g. 2/2 or 3/3) */
  globalTrainingScheduled?: number;
  globalTrainingCompleted?: number;
  userProgress?: {
    videoWatched: boolean;
    isCompleted: boolean;
    checklistCompleted: string | null;
    selectedWorkout?: string | null;
    eventFeedback?: string | null;
    mealCompliance?: string | null;
    mealNotes?: string | null;
    dailyReflection?: string | null;
    happinessRate?: number | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    sleepDurationMinutes?: number | null;
    assessmentResponse?: string | null;
    workoutNotes?: string | null;
    waterMl?: number;
    stepsCount?: number;
    stepsBurnedKcal?: number;
    caloriesKcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    mealQualityMode?: string | null;
    extraWorkouts?: ExtraWorkoutDTO[];
    mealSyncedFromDailyLog?: boolean;
  } | null;
}

export interface PlanOption {
  programId: string;
  title: string;
}

export type PlanTaskId = "sleep" | "activity" | "meal" | "water";

export interface MyPlanIndexItem {
  programId: string;
  title: string;
  batchNumber?: number | null;
  coachName: string;
  organizationName?: string | null;
  organizationLogo?: string | null;
  coverImage?: string | null;
  introVideoUrl?: string | null;
  dayCount: number;
  startDate: Date | string | null;
  endDate: Date | string | null;
  locationType?: string;
  city?: string | null;
  dailyCommitment?: string | null;
  isUpcoming: boolean;
  isCompleted?: boolean;
  completedDays: number;
  totalDays: number;
  currentDayNumber: number;
  todayDayType?: string | null;
  pendingTasksCount?: number;
}

export interface PlanProgramInfo {
  id?: string;
  title: string;
  batchNumber?: number | null;
  coachName: string;
  coachTitle?: string | null;
  organizationName?: string | null;
  organizationLogo?: string | null;
  category?: string | null;
  difficultyLevel?: string | null;
  description?: string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  equipment?: string | null;
  durationDays?: number;
  coverImage: string | null;
  introVideoUrl?: string | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  communityLink: string | null;
  scientificReferences?: Array<{ title: string; url?: string }> | null;
  totalDays: number;
  isUpcoming?: boolean;
  isCompleted?: boolean;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  programGuidelines?: string[];
  dailyCommitment?: string | null;
}

export interface PlanStats {
  completed: number;
  skipped: number;
  remaining: number;
  segments: ("done" | "today" | "skipped" | "upcoming")[];
}

export function formatDayTypeLabel(dayType?: string | null, locale: "en" | "id" = "en"): string | null {
  if (!dayType) return null;
  if (dayType === "TRAINING_DAY") return locale === "id" ? "Hari Latihan" : "Training Day";
  if (dayType === "REST_DAY") return locale === "id" ? "Hari Istirahat" : "Rest Day";
  if (dayType === "CONNECT_DAY" || dayType === "MEETUP_DAY" || dayType === "CONNECTION_DAY") {
    return locale === "id" ? "Hari Pertemuan" : "Meetup Day";
  }
  return dayType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatIntensityBadge(level?: string | null, locale: "en" | "id" = "en"): string {
  const v = (level || "").trim().toUpperCase();
  if (v.includes("VERY") && v.includes("HIGH")) {
    return locale === "id" ? "Intensitas Sangat Tinggi" : "Very High Intensity";
  }
  if (v === "ADVANCED" || v === "HIGH") {
    return locale === "id" ? "Intensitas Tinggi" : "High Intensity";
  }
  if (v === "INTERMEDIATE" || v === "MODERATE") {
    return locale === "id" ? "Intensitas Sedang" : "Moderate Intensity";
  }
  if (v === "BEGINNER" || v === "LOW") {
    return locale === "id" ? "Intensitas Rendah" : "Low Intensity";
  }
  if (v) return locale === "id" ? `Intensitas ${level}` : `${level} Intensity`;
  return locale === "id" ? "Intensitas Sedang" : "Moderate Intensity";
}

export function formatStartsIn(
  startDate: string | Date | null | undefined,
  locale: "en" | "id" = "en"
): {
  headline: string;
  dateLabel: string;
} {
  if (!startDate) {
    return {
      headline: locale === "id" ? "Akses Kapan Saja" : "Anytime Access",
      dateLabel: locale === "id" ? "Jadwal Fleksibel" : "Flexible Schedule",
    };
  }
  const WIB_MS = 7 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {
    return {
      headline: locale === "id" ? "Akses Kapan Saja" : "Anytime Access",
      dateLabel: locale === "id" ? "Jadwal Fleksibel" : "Flexible Schedule",
    };
  }
  const startWib = new Date(start.getTime() + WIB_MS);
  const nowWib = new Date(Date.now() + WIB_MS);
  const startDayUtc = Date.UTC(
    startWib.getUTCFullYear(),
    startWib.getUTCMonth(),
    startWib.getUTCDate()
  );
  const nowDayUtc = Date.UTC(
    nowWib.getUTCFullYear(),
    nowWib.getUTCMonth(),
    nowWib.getUTCDate()
  );
  const diffDays = Math.round((startDayUtc - nowDayUtc) / DAY_MS);

  const dateLabel = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(start);

  if (diffDays <= 0) {
    return { headline: locale === "id" ? "Mulai Hari Ini" : "Starts Today", dateLabel };
  }
  if (diffDays === 1) {
    return { headline: locale === "id" ? "Mulai Besok" : "Starts Tomorrow", dateLabel };
  }
  return {
    headline: locale === "id" ? `Mulai ${diffDays} Hari Lagi` : `Starts in ${diffDays} Days`,
    dateLabel,
  };
}

export function splitActivities(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|·/)
    .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
    .filter((line) => line.length > 1 && line.length < 160);
}

export function formatMealNoteSummary(rawNotes: string | null | undefined): string | null {
  const trimmed = rawNotes?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        mode?: string;
        checkedMeals?: unknown;
        mealsCount?: number;
        mealEntries?: Array<{ status?: string; mealItem?: string }>;
        mealFeeling?: string;
      };
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const parts: string[] = [];
        if (Array.isArray(parsed.mealEntries) && parsed.mealEntries.length > 0) {
          const followed = parsed.mealEntries.filter((e) => e?.status === "followed").length;
          const similar = parsed.mealEntries.filter((e) => e?.status === "similar").length;
          const total = parsed.mealEntries.length;
          if (followed > 0) parts.push(`${followed}/${total} meals followed`);
          else if (similar > 0) parts.push(`${similar}/${total} similar meals`);
        } else if (Array.isArray(parsed.checkedMeals) && parsed.checkedMeals.length > 0) {
          const valid = parsed.checkedMeals.filter(
            (x): x is string => typeof x === "string" && x.trim().length > 0
          );
          if (valid.length > 0) {
            parts.push(`${valid.length} ${valid.length === 1 ? "meal" : "meals"} logged`);
          }
        } else if (parsed.mode === "similar") {
          parts.push("Followed similar whole-food meals");
        } else if (parsed.mode === "off_track") {
          parts.push("Off-track nutrition day");
        }
        if (typeof parsed.mealFeeling === "string" && parsed.mealFeeling.trim()) {
          parts.push(`Feeling: ${parsed.mealFeeling.trim()}`);
        }
        return parts.length > 0 ? parts.join(" · ") : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  return trimmed;
}

export function movementNames(day: PlanDay): string[] {
  const hasAdminList =
    (day.workoutOptions && day.workoutOptions.length > 0) || day.videoChecklist.length > 0;
  if (!hasAdminList) return [];
  const groups = parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  const selected = day.userProgress?.selectedWorkout || groups[0]?.optionName;
  const group = groups.find((g) => g.optionName === selected) || groups[0];
  const names = (group?.movements || []).map((m) => m.name.trim()).filter(Boolean);
  if (names.length > 0) return names;
  return (day.videoChecklist || [])
    .map((item) => item.split("=")[0].trim())
    .filter(Boolean);
}

export function checkedList(day: PlanDay, override: string[] | undefined): string[] {
  if (override) return override;
  if (!day.userProgress?.checklistCompleted) return [];
  try {
    const parsed = JSON.parse(day.userProgress.checklistCompleted);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function isMovementChecked(
  checks: string[],
  optionName: string | null | undefined,
  movementName: string
): boolean {
  return isMovementCheckedCore(checks, optionName, movementName);
}

export function evaluateDayTaskState(
  day: PlanDay | null | undefined,
  checklist?: string[]
) {
  const progress = day?.userProgress;
  const checks = day ? checkedList(day, checklist) : [];
  const groups =
    day?.dayType === "TRAINING_DAY"
      ? parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist)
      : [];
  const activeOptionName =
    progress?.selectedWorkout || groups[0]?.optionName || null;
  const activities =
    day?.dayType === "REST_DAY"
      ? splitActivities(day.restInstructions)
      : day?.dayType === "TRAINING_DAY"
        ? movementNames(day)
        : [];
  const sleepDone = isSleepLogged(progress?.bedtime, progress?.wakeTime);
  const activityDone =
    day?.dayType === "TRAINING_DAY"
      ? !!progress?.isCompleted ||
        (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED") ||
        (activities.length > 0 &&
          activities.every((name) => isMovementChecked(checks, activeOptionName, name)))
      : day?.dayType === "REST_DAY"
        ? activities.length > 0
          ? activities.every((name) => isMovementChecked(checks, null, name)) ||
            (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED")
          : !!progress?.isCompleted ||
            (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED")
        : !!progress?.isCompleted ||
          (!!progress?.eventFeedback && progress.eventFeedback !== "SKIPPED");
  const effectiveWaterMl =
    progress?.waterMl !== undefined ? progress.waterMl : extractWaterMl(progress?.mealNotes);
  const waterDone = effectiveWaterMl > 0;
  const stepsDone = Boolean((progress?.stepsCount ?? 0) > 0 || progress?.isCompleted);
  const initialDone: [boolean, boolean, boolean, boolean] = [
    sleepDone,
    activityDone,
    isMealLogged(progress?.mealCompliance),
    waterDone,
  ];
  // All 5 core tasks (Sleep, Activity, Meal, Water, Steps) + all custom tasks are mandatory
  const pendingCustomTasks = (day?.customTasks || []).filter(
    (ct) => !ct.submission
  ).length;
  const pendingSteps = day && !stepsDone ? 1 : 0;
  const pendingTasksCount = day
    ? initialDone.filter((done) => !done).length + pendingSteps + pendingCustomTasks
    : 0;
  return { checks, activities, initialDone, stepsDone, pendingTasksCount };
}

export function calcSleepMins(bed?: string | null, wake?: string | null): number {
  return computeSafeSleepMinutes(bed, wake);
}

export function formatSleepHours(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatShortDayDate(
  unlockDate: string | undefined,
  dayNumber: number
): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = new Date(unlockDate);
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}
