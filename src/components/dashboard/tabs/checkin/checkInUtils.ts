import {
  Angry,
  Droplets,
  Dumbbell,
  Frown,
  Heart,
  Laugh,
  Meh,
  Moon,
  Smile,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { extractWaterMl } from "@/wellness/utils/nutrition";
import { computeSafeSleepMinutes } from "@/wellness/utils/wellness-metrics";
import {
  isMealLogged,
  isMovementChecked,
  isSleepLogged,
} from "@/wellness/utils/day-completion";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { PlanDay } from "../MyPlanTab";

export type SaveResult = Promise<void | boolean>;

export interface DailyCheckInProps {
  day: PlanDay;
  pastDays: PlanDay[];
  allProgramDays?: PlanDay[];
  communityLink?: string | null;
  coachName?: string | null;
  onOpenCommunity?: () => void;
  programTitle?: string;
  programVenueAddress?: string | null;
  locked: boolean;
  isAnytime?: boolean;
  activities: string[];
  checks: string[];
  initialDone: [boolean, boolean, boolean, boolean];
  onToggleCheck: (task: string, dayId: string, isRepUpdate?: boolean) => Promise<void> | void;
  onSyncChecklist?: (tasks: string[], dayId: string) => Promise<boolean>;
  onSelectWorkout: (workout: string, dayId: string, resetChecklist?: boolean) => SaveResult;
  onOpenVideo: (dayId: string) => SaveResult;
  onSaveSleep: (
    bedtime: string,
    wakeTime: string,
    minutes: number,
    dayId: string,
    sleepFeeling?: string
  ) => SaveResult;
  onSaveAttendance: (notes: string, dayId: string) => SaveResult;
  onSaveWorkoutNotes: (
    notes: string,
    dayId: string,
    extra?: { selectedWorkout?: string; checklistCompleted?: string[] }
  ) => SaveResult;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => SaveResult;
  onSaveWater: (waterMl: number, dayId: string) => SaveResult;
  onSaveSteps?: (stepsCount: number, dayId: string) => SaveResult;
  onAddExtraWorkout?: (payload: {
    logDate: string;
    activityType: "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom";
    title: string;
    durationMinutes: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
    programDayId?: string | null;
  }) => SaveResult;
  onUpdateExtraWorkout?: (payload: {
    id: string;
    logDate: string;
    title?: string;
    durationMinutes?: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
    programDayId?: string | null;
  }) => SaveResult;
  onDeleteExtraWorkout?: (
    id: string,
    logDate: string,
    programDayId?: string | null
  ) => SaveResult;
  overlappingTrainingCount?: number;
  onSaveReflection?: (reflection: string, happiness: number, dayId: string) => SaveResult;
  onCompleteDay: (dayId: string) => SaveResult;
  onCustomTaskSubmitted?: (
    dayId: string,
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>,
    dayCompleted?: boolean
  ) => void;
  widgetIndex?: 0 | 1 | 2;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
  selectedDayId?: string;
  onSelectDayId?: (dayId: string) => void;
  onBackToTodayHub?: () => void;
}

export function getTasksForDay(dayType: string) {
  const isRest = dayType === "REST_DAY";
  const isConnect = dayType !== "TRAINING_DAY" && dayType !== "REST_DAY";

  return [
    {
      title: "Sleep Log",
      description: "Bedtime, wake time & recovery",
      Icon: Moon,
      image: "/test.webp",
    },
    isRest
      ? {
          title: "Rest Activity",
          description: "Recovery guidelines & body check-in",
          Icon: Heart,
          image: "/coach2.webp",
        }
      : isConnect
        ? {
            title: "Connect",
            description: "Community session takeaways & attendance",
            Icon: Users,
            image: "/coach.webp",
          }
        : {
            title: "Online Training",
            description: "Daily workout & exercise checklist",
            Icon: Dumbbell,
            image: "/image.webp",
          },
    {
      title: "Meal Control",
      description: "Daily meal plan adherence & calories",
      Icon: Utensils,
      image: "/pic.webp",
    },
    {
      title: "Water Intake",
      description: "Daily hydration log (resets daily)",
      Icon: Droplets,
      image: "/pic.webp",
    },
  ] as const;
}

export const FACES = [
  { score: 1, Icon: Angry, label: "Very Low" },
  { score: 2, Icon: Frown, label: "Low" },
  { score: 3, Icon: Meh, label: "Neutral" },
  { score: 4, Icon: Smile, label: "Good" },
  { score: 5, Icon: Laugh, label: "Great" },
] as const;

export const BEDTIME_PRESETS = ["21:30", "22:00", "22:30", "23:00", "23:30", "00:00"];
export const WAKETIME_PRESETS = ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00"];

export const SLEEP_FEELINGS = [
  {
    label: "Segar & Enak (Fresh & Ready)",
    desc: "Bangun bugar, segar, dan berenergi penuh untuk aktivitas hari ini.",
  },
  {
    label: "Cukup Baik (Good & Rested)",
    desc: "Tidur nyenyak, merasa pulih dan tenang memulai hari.",
  },
  {
    label: "Biasa Saja (Okay / Normal)",
    desc: "Kondisi tubuh netral atau butuh sedikit waktu untuk fokus.",
  },
  {
    label: "Lelah / Kurang Tidur (Tired)",
    desc: "Tidur kurang nyenyak, tubuh terasa letih atau mengantuk.",
  },
  {
    label: "Sakit (Sick / Unwell)",
    desc: "Merasa demam, flu, nyeri badan, atau sakit; butuh istirahat pemulihan.",
  },
];

export const MEAL_FEELINGS = [
  { label: "Energized & Light", desc: "Clean steady fuel with comfortable digestion." },
  { label: "Satisfied & Balanced", desc: "Nourished, content, and evenly satiated." },
  { label: "Slightly Bloated", desc: "Mild digestive fullness or heaviness after eating." },
  { label: "Still Hungry", desc: "Lower satiety or lingering appetite between meals." },
  { label: "Sluggish / Heavy", desc: "Post-meal energy dip or lethargic heaviness." },
];

export const REST_FEELINGS = [
  { label: "Restored & Loose", desc: "Muscles feel light, supple, and recovering well." },
  { label: "Relaxed & Calm", desc: "Nervous system feels settled and deeply grounded." },
  { label: "Mild Soreness", desc: "Healthy training recovery feedback; keeping it gentle." },
  { label: "Still Tight", desc: "Noticeable stiffness remaining in joints or muscles." },
  { label: "Deeply Fatigued", desc: "Body needs extra hydration, warmth, and early rest." },
];

export const TRAINING_FEELINGS = [
  { label: "Energized", desc: "High vitality, powerful and moved with ease." },
  { label: "Accomplished", desc: "Challenging workout, pushed through with solid technique." },
  { label: "Balanced", desc: "Steady pace, good body control and regulated breath." },
  { label: "Fatigued", desc: "Challenging effort, muscles feeling worked and tired." },
  { label: "Strained", desc: "Felt physical tension or stiffness; prioritized safety." },
];

export const areaCls =
  "w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 text-base sm:text-sm leading-relaxed text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-950 dark:focus:border-white transition disabled:opacity-50 resize-none";

export const TIME_24H_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const REFLECTION_DECLINED = "Prefer not to answer.";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad2(i));
export const MINUTES_60 = Array.from({ length: 60 }, (_, i) => pad2(i));

export type SubStepId =
  | "wake"
  | "bed"
  | "sleep_mood"
  | "training_option"
  | "training_video"
  | "training_movements"
  | "training_mood"
  | "rest_checklist"
  | "rest_mood"
  | "connect_attendance"
  | "connect_rating"
  | "meal_count"
  | "meal_entry_1"
  | "meal_off_1"
  | "meal_entry_2"
  | "meal_off_2"
  | "meal_entry_3"
  | "meal_off_3"
  | "meal_nutrition"
  | "meal_mood"
  | "water_intake"
  | "reflection_journal"
  | "reflection_mood";

export interface MealSlotEntry {
  status: "followed" | "similar" | "off_track";
  mealItem?: string;
  calories?: number | null;
  carbsG?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
}

export function computeMealTotals(
  entries: MealSlotEntry[],
  mealsCount: number,
  dailyTargetKcal?: number | null
): { calories: number; carbsG: number; proteinG: number; fatG: number } {
  const count = Math.max(1, Math.min(6, mealsCount || 1));
  const targetKcal =
    typeof dailyTargetKcal === "number" && Number.isFinite(dailyTargetKcal) && dailyTargetKcal > 0
      ? Math.round(dailyTargetKcal)
      : 1925;
  // Balanced 40% Carbs / 30% Protein / 30% Fat macro distribution aligned mathematically to targetKcal
  const dailyCarbsG = dailyTargetKcal ? Math.round((targetKcal * 0.4) / 4) : 195;
  const dailyProteinG = dailyTargetKcal ? Math.round((targetKcal * 0.3) / 4) : 140;
  const dailyFatG = dailyTargetKcal ? Math.round((targetKcal * 0.3) / 9) : 65;

  const recCalPerMeal = Math.round(targetKcal / count);
  const recCarbsPerMeal = Math.round(dailyCarbsG / count);
  const recProteinPerMeal = Math.round(dailyProteinG / count);
  const recFatPerMeal = Math.round(dailyFatG / count);

  let totalCal = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;

  for (let i = 0; i < count; i++) {
    const e = entries[i];
    if (!e) continue;
    if (e.status === "followed" || e.status === "similar") {
      totalCal += recCalPerMeal;
      totalCarbs += recCarbsPerMeal;
      totalProtein += recProteinPerMeal;
      totalFat += recFatPerMeal;
    } else if (e.status === "off_track") {
      const c = typeof e.carbsG === "number" && e.carbsG > 0 ? e.carbsG : 0;
      const p = typeof e.proteinG === "number" && e.proteinG > 0 ? e.proteinG : 0;
      const f = typeof e.fatG === "number" && e.fatG > 0 ? e.fatG : 0;
      const cal =
        typeof e.calories === "number" && e.calories > 0
          ? e.calories
          : c > 0 || p > 0 || f > 0
            ? Math.round(c * 4 + p * 4 + f * 9)
            : 0;
      totalCal += cal;
      if (c > 0 || p > 0 || f > 0) {
        totalCarbs += c;
        totalProtein += p;
        totalFat += f;
      } else if (cal > 0) {
        totalCarbs += Math.round((cal * 0.48) / 4);
        totalProtein += Math.round((cal * 0.2) / 4);
        totalFat += Math.round((cal * 0.32) / 9);
      }
    }
  }

  return {
    calories: totalCal,
    carbsG: totalCarbs,
    proteinG: totalProtein,
    fatG: totalFat,
  };
}

export interface MealDraft {
  checkedMeals: string[];
  specialOption: "similar" | "off_track" | null;
  mealsCount: 0 | 1 | 2 | 3;
  mealEntries: MealSlotEntry[];
  mealFeeling: string;
  calories?: number | null;
  carbsG?: number | null;
  proteinG?: number | null;
  fatG?: number | null;
  waterMl?: number | null;
}

export function stripLeadingFeeling(raw?: string | null): string {
  if (!raw || raw === "SKIPPED") return "";
  if (raw.startsWith("Feeling:")) {
    const parts = raw.split("·");
    return parts.slice(1).join("·").trim();
  }
  return raw;
}

export function stripMealLabelPrefix(line: string): string {
  return line.replace(/^meal\s*\d+\s*:\s*/i, "").trim();
}

export function sleepMinutes(bed: string, wake: string): number {
  return computeSafeSleepMinutes(bed, wake);
}

export function formatDuration(mins: number): string {
  if (!mins) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function sleepQualityLabel(mins: number): { label: string; cls: string } {
  if (mins >= 450 && mins <= 540) {
    return {
      label: "Optimal Recovery (7.5–9h)",
      cls: "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/15",
    };
  }
  if (mins >= 360) {
    return {
      label: "Moderate Rest",
      cls: "bg-zinc-100/70 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10",
    };
  }
  return {
    label: "Sleep Deficit (<6h)",
    cls: "bg-zinc-100/50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10",
  };
}

export function parseLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|·/)
    .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
    .filter((line) => line.length > 1);
}

function buildEntriesFromLegacy(
  count: 0 | 1 | 2 | 3,
  checked: string[],
  specialOption: "similar" | "off_track" | null,
  recommended: string[]
): MealSlotEntry[] {
  const n =
    count > 0 ? count : checked.length > 0 ? (Math.min(3, checked.length) as 1 | 2 | 3) : 0;
  if (n === 0) return [];
  if (specialOption) {
    return Array.from({ length: n }, () => ({ status: specialOption }));
  }
  return Array.from({ length: n }, (_, idx) => {
    const matched = checked[idx];
    if (matched) return { status: "followed", mealItem: matched };
    if (recommended[idx] && checked.includes(recommended[idx])) {
      return { status: "followed", mealItem: recommended[idx] };
    }
    return { status: "off_track" };
  });
}

export function readMealDraft(
  compliance: string | null | undefined,
  notes: string | null | undefined,
  recommended: string[]
): MealDraft {
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as {
        mode?: string;
        checkedMeals?: string[];
        mealsCount?: number;
        mealEntries?: MealSlotEntry[];
        mealFeeling?: string;
        calories?: number | null;
        carbsG?: number | null;
        proteinG?: number | null;
        fatG?: number | null;
        waterMl?: number | null;
      };
      const mealsCount =
        parsed?.mealsCount === 1 || parsed?.mealsCount === 2 || parsed?.mealsCount === 3
          ? parsed.mealsCount
          : 0;
      const mealFeeling = typeof parsed?.mealFeeling === "string" ? parsed.mealFeeling : "";
      const macros = {
        calories: typeof parsed?.calories === "number" ? parsed.calories : null,
        carbsG: typeof parsed?.carbsG === "number" ? parsed.carbsG : null,
        proteinG: typeof parsed?.proteinG === "number" ? parsed.proteinG : null,
        fatG: typeof parsed?.fatG === "number" ? parsed.fatG : null,
        waterMl: typeof parsed?.waterMl === "number" ? parsed.waterMl : null,
      };
      if (parsed && Array.isArray(parsed.mealEntries) && parsed.mealEntries.length > 0) {
        const sanitized = parsed.mealEntries
          .filter(
            (e): e is MealSlotEntry =>
              !!e &&
              (e.status === "followed" || e.status === "similar" || e.status === "off_track")
          )
          .slice(0, 3);
        const checkedMeals = Array.from(
          new Set(
            sanitized
              .filter((e) => e.status === "followed" && e.mealItem)
              .map((e) => e.mealItem!)
          )
        );
        const allSimilar =
          sanitized.length > 0 && sanitized.every((e) => e.status === "similar");
        const allOff =
          sanitized.length > 0 && sanitized.every((e) => e.status === "off_track");
        return {
          checkedMeals,
          specialOption: allSimilar ? "similar" : allOff ? "off_track" : null,
          mealsCount:
            mealsCount || (Math.min(3, Math.max(1, sanitized.length)) as 1 | 2 | 3),
          mealEntries: sanitized,
          mealFeeling,
          ...macros,
        };
      }
      if (parsed && parsed.mode === "similar") {
        return {
          checkedMeals: [],
          specialOption: "similar",
          mealsCount,
          mealEntries: buildEntriesFromLegacy(mealsCount, [], "similar", recommended),
          mealFeeling,
          ...macros,
        };
      }
      if (parsed && parsed.mode === "off_track") {
        return {
          checkedMeals: [],
          specialOption: "off_track",
          mealsCount,
          mealEntries: buildEntriesFromLegacy(mealsCount, [], "off_track", recommended),
          mealFeeling,
          ...macros,
        };
      }
      if (parsed && Array.isArray(parsed.checkedMeals)) {
        return {
          checkedMeals: parsed.checkedMeals,
          specialOption: null,
          mealsCount,
          mealEntries: buildEntriesFromLegacy(
            mealsCount,
            parsed.checkedMeals,
            null,
            recommended
          ),
          mealFeeling,
          ...macros,
        };
      }
    } catch {
      /* plain text fallback */
    }
  }
  if (compliance === "SIMILAR") {
    return {
      checkedMeals: [],
      specialOption: "similar",
      mealsCount: 0,
      mealEntries: [],
      mealFeeling: "",
    };
  }
  if (compliance === "OFF_TRACK") {
    return {
      checkedMeals: [],
      specialOption: "off_track",
      mealsCount: 0,
      mealEntries: [],
      mealFeeling: "",
    };
  }
  if (compliance === "FULL") {
    return {
      checkedMeals: [...recommended],
      specialOption: null,
      mealsCount: 0,
      mealEntries: [],
      mealFeeling: "",
    };
  }
  return {
    checkedMeals: [],
    specialOption: null,
    mealsCount: 0,
    mealEntries: [],
    mealFeeling: "",
  };
}

export function compressImageFile(
  file: File,
  maxDim = 960,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      if (!raw) return reject(new Error("Empty image data."));
      const img = new window.Image();
      img.onerror = () => reject(new Error("Unsupported image."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image."));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

export function matchesScopedMovement(
  entry: string,
  activeWorkout: string,
  movementName: string
): boolean {
  const cleanTarget = movementName.trim().toLowerCase();
  const raw = (entry.includes("=") ? entry.split("=")[0] : entry).trim();
  const lowerRaw = raw.toLowerCase();
  if (activeWorkout) {
    const expectedPrefix = `[${activeWorkout.toLowerCase()}]`;
    if (lowerRaw.startsWith("[")) {
      if (!lowerRaw.startsWith(expectedPrefix)) return false;
      return lowerRaw.slice(expectedPrefix.length).trim() === cleanTarget;
    }
  }
  return lowerRaw === cleanTarget;
}

export function formatDayPillDate(
  unlockDate: string | Date | undefined | null,
  dayNumber: number
): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = typeof unlockDate === "string" ? new Date(unlockDate) : unlockDate;
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

export function formatDayDate(unlockDate: string | undefined, dayNumber: number): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = new Date(unlockDate);
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function getWibResetCountdown(): string {
  const now = new Date();
  const wibFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = wibFormatter.format(now).split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const minsRemaining = Math.max(1, 24 * 60 - (h * 60 + m));
  const remH = Math.floor(minsRemaining / 60);
  const remM = minsRemaining % 60;
  return `Resets in ${remH}h ${String(remM).padStart(2, "0")}m`;
}

export function deriveDayActivities(d: PlanDay): string[] {
  if (d.dayType === "REST_DAY") {
    return parseLines(d.restInstructions);
  }
  if (d.dayType === "TRAINING_DAY") {
    const groups = parseWorkoutOptionGroups(d.workoutOptions, d.videoChecklist);
    const selected = d.userProgress?.selectedWorkout || groups[0]?.optionName;
    const group = groups.find((g) => g.optionName === selected) || groups[0];
    const names = (group?.movements || []).map((m) => m.name.trim()).filter(Boolean);
    if (names.length > 0) return names;
    return (d.videoChecklist || [])
      .map((item) => item.split("=")[0].trim())
      .filter(Boolean);
  }
  return [];
}

export function deriveDayChecks(d: PlanDay): string[] {
  if (!d.userProgress?.checklistCompleted) return [];
  try {
    const parsed = JSON.parse(d.userProgress.checklistCompleted);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function deriveDayDone(
  d: PlanDay,
  acts: string[],
  chks: string[]
): [boolean, boolean, boolean, boolean] {
  const p = d.userProgress;
  const groups =
    d.dayType === "TRAINING_DAY"
      ? parseWorkoutOptionGroups(d.workoutOptions, d.videoChecklist)
      : [];
  const activeOptionName = p?.selectedWorkout || groups[0]?.optionName || null;
  const sleepDone = isSleepLogged(p?.bedtime, p?.wakeTime);
  const activityDone =
    d.dayType === "TRAINING_DAY"
      ? !!p?.videoWatched ||
        !!p?.isCompleted ||
        (!!p?.workoutNotes && p.workoutNotes !== "SKIPPED") ||
        (!!p?.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
        (acts.length > 0 &&
          acts.every((name) => isMovementChecked(chks, activeOptionName, name)))
      : d.dayType === "REST_DAY"
        ? acts.length > 0
          ? acts.every((name) => isMovementChecked(chks, null, name)) ||
            (!!p?.workoutNotes && p.workoutNotes !== "SKIPPED")
          : !!p?.isCompleted || (!!p?.workoutNotes && p.workoutNotes !== "SKIPPED")
        : (!!p?.eventFeedback && p.eventFeedback !== "SKIPPED") || !!p?.isCompleted;
  const effectiveWaterMl =
    p?.waterMl !== undefined ? p.waterMl : extractWaterMl(p?.mealNotes);
  return [
    sleepDone,
    activityDone,
    isMealLogged(p?.mealCompliance),
    effectiveWaterMl > 0,
  ];
}
