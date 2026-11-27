import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { ExtraWorkoutDTO } from "@/wellness/services/daily-log";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { extractWaterMl } from "@/wellness/utils/nutrition";
import {
  WATER_GOOD_MIN_ML,
  WATER_TARGET_ML as GLOBAL_WATER_TARGET_ML,
  computeSafeSleepMinutes,
} from "@/wellness/utils/wellness-metrics";
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
    urineColor?: string | null;
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
  category?: string | null;
  city?: string | null;
  dailyCommitment?: string | null;
  isUpcoming: boolean;
  isCompleted?: boolean;
  completedDays: number;
  totalDays: number;
  currentDayNumber: number;
  todayDayType?: string | null;
  todayCoreTaskDone?: boolean;
  tomorrowDayType?: string | null;
  pendingTasksCount?: number;
  todayTotalTasksCount?: number;
  todayCompletedTasksCount?: number;
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

export type BodyHabitAction =
  | "sleep"
  | "water"
  | "meal"
  | "steps"
  | "training"
  | "program"
  | "info"
  | "none";

export type BodySignalKind = "intro" | "task" | "reassurance";

export interface BodySignal {
  id: string;
  kind?: BodySignalKind;
  action: BodyHabitAction;
  tone: "attention" | "positive" | "neutral";
  message: string;
  detail?: string;
  programId?: string;
}

const SLEEP_TARGET_MINS = 420; // 7h
const WATER_TARGET_ML = GLOBAL_WATER_TARGET_ML;
const STEPS_TARGET = 7000;

export function deriveBodySignals(params: {
  day: PlanDay | null | undefined;
  activePrograms: MyPlanIndexItem[];
  isFeatureLocked: boolean;
  isId: boolean;
  totalPendingTasks?: number;
  wibHour?: number;
}): BodySignal[] {
  const { day, activePrograms, isFeatureLocked, isId } = params;

  if (isFeatureLocked) {
    return [
      {
        id: "locked",
        kind: "intro",
        action: "none",
        tone: "neutral",
        message: isId
          ? "Aktifkan tracking dulu, biar kita bisa jalan bareng!"
          : "Unlock tracking so we can team up every day!",
        detail: isId
          ? "Begitu aktif, kita pantau tidur, air, makan, dan langkah bareng."
          : "Once unlocked, we'll track our sleep, water, meals, and steps together.",
      },
    ];
  }

  const progress = day?.userProgress;
  const sleepMins =
    progress?.sleepDurationMinutes && progress.sleepDurationMinutes > 0
      ? progress.sleepDurationMinutes
      : computeSafeSleepMinutes(progress?.bedtime, progress?.wakeTime);
  const sleepLogged = isSleepLogged(progress?.bedtime, progress?.wakeTime);
  const effectiveWaterMl =
    progress?.waterMl !== undefined ? progress.waterMl : extractWaterMl(progress?.mealNotes);
  const mealLogged = isMealLogged(progress?.mealCompliance);
  const mealComplianceUpper = (progress?.mealCompliance || "").toUpperCase();
  const mealOffTrack =
    mealLogged &&
    (mealComplianceUpper.includes("OFF") ||
      mealComplianceUpper.includes("MISSED") ||
      mealComplianceUpper.includes("POOR"));
  const stepsCount = progress?.stepsCount ?? 0;

  const completedCoreHabits =
    (sleepLogged ? 1 : 0) +
    (effectiveWaterMl > 0 ? 1 : 0) +
    (mealLogged ? 1 : 0) +
    (stepsCount > 0 ? 1 : 0);

  const pendingProgram = activePrograms.find(
    (p) => !p.isUpcoming && !p.isCompleted && !p.todayCoreTaskDone
  );

  const habits: Array<{ key: BodyHabitAction; signal: BodySignal }> = [];

  if (!sleepLogged) {
    habits.push({
      key: "sleep",
      signal: {
        id: "sleep-unlogged",
        kind: "task",
        action: "sleep",
        tone: "attention",
        message: isId ? "Kita belum catat tidur semalam." : "We haven't logged our sleep yet.",
        detail: isId
          ? "Tidur 7+ jam menjaga pemulihan dan fokus kita seharian. Yuk catat jam tidur dan bangun semalam sekarang."
          : "7+ hours of rest keeps our recovery and focus sharp all day. Let's log last night's bedtime and wake time.",
      },
    });
  } else if (sleepMins > 0 && sleepMins < SLEEP_TARGET_MINS) {
    const hrs = (sleepMins / 60).toFixed(1).replace(/\.0$/, "");
    const diffMins = SLEEP_TARGET_MINS - sleepMins;
    habits.push({
      key: "sleep",
      signal: {
        id: "sleep-low",
        kind: "task",
        action: "sleep",
        tone: "attention",
        message: isId
          ? `Kita cuma tidur ${hrs} jam semalam.`
          : `We only slept ${hrs}h last night.`,
        detail: isId
          ? `Masih kurang ${diffMins} menit dari target 7 jam. Hari ini kita jaga ritme santai, malam nanti tidur lebih awal ya!`
          : `That's ${diffMins} mins shy of our 7h target. Let's pace ourselves today and wind down earlier tonight!`,
      },
    });
  }

  if (effectiveWaterMl < WATER_GOOD_MIN_ML) {
    const remainingMl = WATER_TARGET_ML - effectiveWaterMl;
    habits.push({
      key: "water",
      signal: {
        id: "water-low",
        kind: "task",
        action: "water",
        tone: "attention",
        message:
          effectiveWaterMl === 0
            ? isId
              ? "Kita belum minum air hari ini!"
              : "We haven't had any water yet!"
            : isId
              ? `Kita kurang ${remainingMl.toLocaleString()} ml menuju target 2.5 L.`
              : `We have ${remainingMl.toLocaleString()} ml left toward 2.5 L.`,
        detail: isId
          ? `Progres hari ini: ${effectiveWaterMl.toLocaleString()} / 2.500 ml. Minum satu gelas sekarang bikin energi kita segar lagi!`
          : `Today's hydration: ${effectiveWaterMl.toLocaleString()} / 2,500 ml. Grabbing a glass right now keeps our energy steady!`,
      },
    });
  }

  if (!mealLogged || mealOffTrack) {
    habits.push({
      key: "meal",
      signal: {
        id: mealOffTrack ? "meal-offtrack" : "meal-unlogged",
        kind: "task",
        action: "meal",
        tone: "attention",
        message: mealOffTrack
          ? isId
            ? "Yuk seimbangkan makan kita berikutnya."
            : "Let's balance our next meal!"
          : isId
            ? "Hari ini kita sudah makan apa?"
            : "What have we eaten today?",
        detail: isId
          ? "Mencatat karbo, protein, dan sayur harian bantu kita jaga nutrisi dan pemulihan tetap konsisten."
          : "Logging our daily carbs, protein, and veggies keeps our fuel and recovery right on track.",
      },
    });
  }

  if (stepsCount < STEPS_TARGET) {
    const remainingSteps = STEPS_TARGET - stepsCount;
    habits.push({
      key: "steps",
      signal: {
        id: "steps-low",
        kind: "task",
        action: "steps",
        tone: "attention",
        message:
          stepsCount === 0
            ? isId
              ? "Langkah kita masih 0 nih, jalan yuk?"
              : "Our steps are at 0 — quick walk?"
            : isId
              ? `Kurang ${remainingSteps.toLocaleString()} langkah lagi!`
              : `We need ${remainingSteps.toLocaleString()} more steps!`,
        detail: isId
          ? `Progres langkah: ${stepsCount.toLocaleString()} / 7.000. Jalan santai 10 menit aja sudah nambah sekitar 1.000 langkah!`
          : `Step count: ${stepsCount.toLocaleString()} / 7,000. Even a brisk 10-minute walk adds ~1,000 steps toward our goal!`,
      },
    });
  }

  if (pendingProgram) {
    const isRest = (pendingProgram.todayDayType || "").toUpperCase() === "REST_DAY";
    habits.push({
      key: "training",
      signal: {
        id: `program-${pendingProgram.programId}`,
        kind: "task",
        action: "training",
        tone: "attention",
        programId: pendingProgram.programId,
        message: isRest
          ? isId
            ? "Waktunya sesi pemulihan kita!"
            : "Time for our recovery session!"
          : isId
            ? "Sesi latihan kita sudah siap!"
            : "Our training session is ready!",
        detail: isId
          ? `Hari ke-${pendingProgram.currentDayNumber} di "${pendingProgram.title}" sudah terbuka buat kita kerjakan hari ini.`
          : `Day ${pendingProgram.currentDayNumber} of "${pendingProgram.title}" is unlocked and ready for us today.`,
      },
    });
  }

  // Time-of-day smart ordering (WIB / UTC+7)
  const wibHour =
    typeof params.wibHour === "number"
      ? params.wibHour
      : Number(
          new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
          }).format(new Date())
        ) || 12;
  const order: BodyHabitAction[] =
    wibHour < 11
      ? ["sleep", "water", "training", "meal", "steps"]
      : wibHour < 17
        ? ["water", "meal", "training", "steps", "sleep"]
        : ["steps", "water", "meal", "training", "sleep"];
  habits.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  const result: BodySignal[] = [];
  const pendingTasks = params.totalPendingTasks ?? 0;
  const topHabit = habits[0]?.signal;

  // 1. Short "we" task count summary (Let's go jumps straight to the top priority pending task)
  if (pendingTasks > 0) {
    const openLabels = habits
      .slice(0, 3)
      .map((h) => h.key)
      .join(", ");
    result.push({
      id: "tasks-left",
      kind: "task",
      action: topHabit?.action ?? "info",
      programId: topHabit?.programId,
      tone: "attention",
      message: isId
        ? `Kita punya ${pendingTasks} task lagi hari ini!`
        : `We have ${pendingTasks} task${pendingTasks > 1 ? "s" : ""} left today!`,
      detail: openLabels
        ? isId
          ? `Masih ada ${openLabels} yang menunggu. Yuk kita mulai cicil dari ${habits[0]?.key ?? "task pertama"} sekarang!`
          : `Still open today: ${openLabels}. Let's start by knocking out ${habits[0]?.key ?? "the first one"} right now!`
        : isId
          ? "Kita selesaikan satu per satu dengan santai hari ini."
          : "Let's clear our remaining tasks one by one at a comfortable pace.",
    });
  }

  // 2. Affirmative Reassurance (also follows Tell me more -> Let's go / Skip)
  result.push({
    id: pendingTasks === 0 ? "reassure-complete" : "reassure-proud",
    kind: "reassurance",
    action: topHabit?.action ?? "info",
    programId: topHabit?.programId,
    tone: "positive",
    message:
      pendingTasks === 0
        ? isId
          ? "Semua task kita beres! Bangga sama kita."
          : "We cleared every task today! Proud of us."
        : completedCoreHabits > 0
          ? isId
            ? `Kita sudah cicil ${completedCoreHabits} kebiasaan hari ini!`
            : `We already knocked out ${completedCoreHabits} habit${completedCoreHabits > 1 ? "s" : ""} today!`
          : isId
            ? "Hadir hari ini aja sudah langkah bagus."
            : "Showing up today already counts.",
    detail:
      pendingTasks === 0
        ? isId
          ? "Konsistensi hari ini bikin tubuh dan pikiran kita makin kuat besok. Saatnya istirahat dengan tenang!"
          : "Today's consistency compounds into stronger energy tomorrow. Take a well-deserved breather!"
        : isId
          ? "Nggak perlu sempurna sekaligus — satu kebiasaan kecil yang kita tuntaskan sekarang sudah berarti besar."
          : "No need for perfection all at once — completing just one small habit right now builds real momentum.",
  });

  // 3. Individual habit & program nudges
  for (const h of habits) result.push(h.signal);

  // 4. Tomorrow's schedule across active programs
  for (const p of activePrograms) {
    const tomorrow = (p.tomorrowDayType || "").toUpperCase();
    if (p.isUpcoming || p.isCompleted || !tomorrow) continue;
    if (tomorrow === "TRAINING_DAY") {
      result.push({
        id: `tomorrow-training-${p.programId}`,
        kind: "task",
        action: "program",
        tone: "neutral",
        programId: p.programId,
        message: isId ? "Besok kita ada jadwal latihan!" : "We have training tomorrow!",
        detail: isId
          ? `Sesi latihan berikutnya di "${p.title}" akan terbuka besok. Yuk intip detail programnya!`
          : `Our next workout in "${p.title}" unlocks tomorrow. Tap Let's go to preview the program!`,
      });
    } else if (tomorrow === "REST_DAY") {
      result.push({
        id: `tomorrow-rest-${p.programId}`,
        kind: "task",
        action: "program",
        tone: "positive",
        programId: p.programId,
        message: isId ? "Besok jadwal istirahat kita." : "Tomorrow is our rest day.",
        detail: isId
          ? `Besok waktunya pemulihan aktif di "${p.title}" supaya otot dan energi kita pulih maksimal.`
          : `Tomorrow is dedicated to active recovery in "${p.title}" so we bounce back stronger.`,
      });
    } else {
      result.push({
        id: `meetup-${p.programId}`,
        kind: "task",
        action: "program",
        tone: "neutral",
        programId: p.programId,
        message: isId ? "Besok kita ada sesi meetup!" : "We have a meetup tomorrow!",
        detail: isId
          ? `Jangan lewatkan sesi kebersamaan "${p.title}" besok. Cek jadwal dan info lengkapnya sekarang!`
          : `Don't miss our "${p.title}" community session tomorrow. Check the schedule and details!`,
      });
    }
  }

  // 5. Active programs count
  const followed = activePrograms.filter((p) => !p.isCompleted).length;
  if (followed > 0) {
    const firstActiveProg = activePrograms.find((p) => !p.isCompleted);
    result.push({
      id: "programs-count",
      kind: "task",
      action: firstActiveProg ? "program" : "info",
      programId: firstActiveProg?.programId,
      tone: "positive",
      message: isId
        ? `Kita lagi jalanin ${followed} program bareng!`
        : `We're in ${followed} program${followed > 1 ? "s" : ""} together!`,
      detail: isId
        ? "Menjaga ritme harian sedikit demi sedikit itu kunci utama progres jangka panjang kita."
        : "Small, steady wins every single day are how we build lasting transformation together.",
    });
  }

  // 6. Second gentle reassurance card in rotation
  result.push({
    id: "reassure-steady",
    kind: "reassurance",
    action: topHabit?.action ?? "info",
    programId: topHabit?.programId,
    tone: "positive",
    message: isId
      ? "Kita jalan sesuai ritme kita sendiri."
      : "We move at our own steady pace.",
    detail: isId
      ? "Kamu nggak sendirian di perjalanan ini. Kapan pun siap, kita lanjutkan satu langkah ringan berikutnya!"
      : "You're never doing this alone. Whenever you're ready, let's take our next easy step together!",
  });

  return result;
}
