import {
  Angry,
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
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { PlanDay } from "../MyPlanTab";

export type SaveResult = Promise<void | boolean>;

export interface DailyCheckInProps {
  day: PlanDay;
  pastDays: PlanDay[];
  allProgramDays?: PlanDay[];
  communityLink?: string | null;
  programTitle?: string;
  locked: boolean;
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
  onSaveWorkoutNotes: (notes: string, dayId: string) => SaveResult;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => SaveResult;
  onSaveReflection: (reflection: string, happiness: number, dayId: string) => SaveResult;
  onCompleteDay: (dayId: string) => SaveResult;
  onCustomTaskSubmitted?: (
    dayId: string,
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>
  ) => void;
  widgetIndex?: 0 | 1 | 2;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}

export function getTasksForDay(dayType: string) {
  const isRest = dayType === "REST_DAY";
  const isConnect = dayType !== "TRAINING_DAY" && dayType !== "REST_DAY";

  return [
    {
      title: "Sleep Protocol",
      description: "Bedtime, wake time & recovery score",
      Icon: Moon,
      image: "/test.webp",
    },
    isRest
      ? {
          title: "Rest & Recovery",
          description: "Active recovery guidelines & body check-in",
          Icon: Heart,
          image: "/coach2.webp",
        }
      : isConnect
        ? {
            title: "Community Connect",
            description: "Session takeaways & attendance feedback",
            Icon: Users,
            image: "/coach.webp",
          }
        : {
            title: "Movement Routine",
            description: "Session checklist & guided video",
            Icon: Dumbbell,
            image: "/image.webp",
          },
    {
      title: "Nutrition & Meal",
      description: "Meal adherence & hydration guidelines",
      Icon: Utensils,
      image: "/pic.webp",
    },
    {
      title: "Daily Reflection",
      description: "Energy rating & mindset journal",
      Icon: Sparkles,
      image: "/coach3.webp",
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
  { label: "Refreshed & Alert", desc: "Woke up clear-headed with high morning readiness." },
  { label: "Rested & Steady", desc: "Solid restorative rest and balanced morning energy." },
  { label: "Still Groggy", desc: "Mild sleep inertia or sluggish getting started." },
  { label: "Light & Restless", desc: "Interrupted or lighter sleep cycles overnight." },
  { label: "Exhausted", desc: "Unrefreshing sleep; prioritizing gentle recovery today." },
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
  | "meal_entry_2"
  | "meal_entry_3"
  | "meal_mood"
  | "reflection_journal"
  | "reflection_mood";

export interface MealSlotEntry {
  status: "followed" | "similar" | "off_track";
  mealItem?: string;
}

export interface MealDraft {
  checkedMeals: string[];
  specialOption: "similar" | "off_track" | null;
  mealsCount: 0 | 1 | 2 | 3;
  mealEntries: MealSlotEntry[];
  mealFeeling: string;
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
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
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
      };
      const mealsCount =
        parsed?.mealsCount === 1 || parsed?.mealsCount === 2 || parsed?.mealsCount === 3
          ? parsed.mealsCount
          : 0;
      const mealFeeling = typeof parsed?.mealFeeling === "string" ? parsed.mealFeeling : "";
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
        };
      }
      if (parsed && parsed.mode === "similar") {
        return {
          checkedMeals: [],
          specialOption: "similar",
          mealsCount,
          mealEntries: buildEntriesFromLegacy(mealsCount, [], "similar", recommended),
          mealFeeling,
        };
      }
      if (parsed && parsed.mode === "off_track") {
        return {
          checkedMeals: [],
          specialOption: "off_track",
          mealsCount,
          mealEntries: buildEntriesFromLegacy(mealsCount, [], "off_track", recommended),
          mealFeeling,
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
  const sleepDone =
    !!p?.bedtime &&
    !!p?.wakeTime &&
    p.bedtime !== "SKIPPED" &&
    p.wakeTime !== "SKIPPED";
  const activityDone =
    d.dayType === "TRAINING_DAY"
      ? !!p?.videoWatched ||
        !!p?.isCompleted ||
        (!!p?.workoutNotes && p.workoutNotes !== "SKIPPED") ||
        !!p?.selectedWorkout ||
        (acts.length > 0 &&
          acts.every((name) =>
            chks.some((c) => c.toLowerCase().includes(name.toLowerCase()))
          ))
      : d.dayType === "REST_DAY"
        ? acts.length > 0
          ? acts.every((name) => chks.includes(name))
          : !!p?.isCompleted
        : (!!p?.eventFeedback && p.eventFeedback !== "SKIPPED") || !!p?.isCompleted;
  return [
    sleepDone,
    activityDone,
    !!p?.mealCompliance && p.mealCompliance !== "SKIPPED",
    !!p?.dailyReflection && p.dailyReflection !== "SKIPPED",
  ];
}
