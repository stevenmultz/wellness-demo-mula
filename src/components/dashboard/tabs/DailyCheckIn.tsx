"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Angry,
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  ExternalLink,
  Frown,
  Heart,
  Info,
  Laugh,
  Loader2,
  Lock,
  MapPin,
  Meh,
  Minus,
  Moon,
  Play,
  Plus,
  Smile,
  Sparkles,
  Star,
  Users,
  Utensils,
} from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import { parseDayVideoLinks, parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { PlanDay } from "./MyPlanTab";
import { InfoPopupModal, safeHttpUrl } from "./shared";

type SaveResult = Promise<void | boolean>;

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
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string, sleepFeeling?: string) => SaveResult;
  onSaveAttendance: (notes: string, dayId: string) => SaveResult;
  onSaveWorkoutNotes: (notes: string, dayId: string) => SaveResult;
  onUploadPhoto: (type: "before" | "after", url: string, dayId: string) => SaveResult;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => SaveResult;
  onSaveReflection: (reflection: string, happiness: number, dayId: string) => SaveResult;
  onCompleteDay: (dayId: string) => SaveResult;
  widgetIndex?: 0 | 1 | 2;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}

function getTasksForDay(dayType: string) {
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

const FACES = [
  { score: 1, Icon: Angry, label: "Very Low" },
  { score: 2, Icon: Frown, label: "Low" },
  { score: 3, Icon: Meh, label: "Neutral" },
  { score: 4, Icon: Smile, label: "Good" },
  { score: 5, Icon: Laugh, label: "Great" },
] as const;

const BEDTIME_PRESETS = ["21:30", "22:00", "22:30", "23:00", "23:30", "00:00"];
const WAKETIME_PRESETS = ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00"];
const WORKOUT_QUICK_TAGS = [
  "Felt Strong 💪",
  "High Energy ⚡",
  "Completed Routine ✨",
  "Needed Extra Rest ⏸️",
  "Joint Stiffness ⚠️",
];
const REFLECTION_QUICK_TAGS = [
  "Felt productive today ✨",
  "High energy & clear focus ⚡",
  "Grateful for today's progress 🌱",
  "Ready for deep rest tonight 🌙",
];

const SLEEP_FEELINGS = [
  { label: "Refreshed & Alert", desc: "Woke up clear-headed with high morning readiness." },
  { label: "Rested & Steady", desc: "Solid restorative rest and balanced morning energy." },
  { label: "Still Groggy", desc: "Mild sleep inertia or sluggish getting started." },
  { label: "Light & Restless", desc: "Interrupted or lighter sleep cycles overnight." },
  { label: "Exhausted", desc: "Unrefreshing sleep; prioritizing gentle recovery today." },
];

const MEAL_FEELINGS = [
  { label: "Energized & Light", desc: "Clean steady fuel with comfortable digestion." },
  { label: "Satisfied & Balanced", desc: "Nourished, content, and evenly satiated." },
  { label: "Slightly Bloated", desc: "Mild digestive fullness or heaviness after eating." },
  { label: "Still Hungry", desc: "Lower satiety or lingering appetite between meals." },
  { label: "Sluggish / Heavy", desc: "Post-meal energy dip or lethargic heaviness." },
];

const REST_FEELINGS = [
  { label: "Restored & Loose", desc: "Muscles feel light, supple, and recovering well." },
  { label: "Relaxed & Calm", desc: "Nervous system feels settled and deeply grounded." },
  { label: "Mild Soreness", desc: "Healthy training recovery feedback; keeping it gentle." },
  { label: "Still Tight", desc: "Noticeable stiffness remaining in joints or muscles." },
  { label: "Deeply Fatigued", desc: "Body needs extra hydration, warmth, and early rest." },
];

const areaCls =
  "w-full px-4 py-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/15 text-base sm:text-sm leading-relaxed text-zinc-950 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-950 dark:focus:border-white transition disabled:opacity-50 resize-none";
const primaryBtn =
  "h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";

const TIME_24H_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => pad2(i));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => pad2(i));

/**
 * Simple, responsive 24-hour HH:MM selector using native dropdowns + quick presets.
 * Zero internal WebKit input[type="time"] chrome, eliminating mobile overwidth bugs.
 */
function TimeInputField({
  idPrefix,
  label,
  value,
  presets,
  defaultHour = 6,
  onChange,
}: {
  idPrefix: string;
  label: string;
  value: string;
  presets: readonly string[];
  defaultHour?: number;
  onChange: (next: string) => void;
}) {
  const validMatch = TIME_24H_RE.exec(value);
  const hourStr = validMatch ? validMatch[1] : "";
  const minStr = validMatch ? validMatch[2] : "";

  return (
    <div className="space-y-4 min-w-0">
      <div
        className="w-full h-14 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/15 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-3 focus-within:border-zinc-950 dark:focus-within:border-white transition min-w-0"
        role="group"
        aria-label={label}
      >
        <div className="relative h-full flex items-center justify-center min-w-0">
          <select
            id={`${idPrefix}-hour`}
            aria-label={`${label} hour`}
            value={hourStr}
            onChange={(e) => {
              const nextHour = e.target.value;
              if (!nextHour) {
                onChange("");
                return;
              }
              onChange(`${nextHour}:${minStr || "00"}`);
            }}
            className={`w-full h-full min-w-0 appearance-none bg-transparent border-0 text-center text-xl font-mono font-bold tabular-nums outline-none cursor-pointer pr-4 ${
              hourStr ? "text-zinc-950 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            <option value="" className="bg-white dark:bg-[#141414] text-zinc-500">
              HH
            </option>
            {HOURS_24.map((h) => (
              <option key={h} value={h} className="bg-white dark:bg-[#141414] text-zinc-950 dark:text-white">
                {h}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none absolute right-2" />
        </div>

        <span className="text-xl font-mono font-bold text-zinc-400 dark:text-zinc-500 select-none px-1">
          :
        </span>

        <div className="relative h-full flex items-center justify-center min-w-0">
          <select
            id={`${idPrefix}-minute`}
            aria-label={`${label} minute`}
            value={minStr}
            onChange={(e) => {
              const nextMin = e.target.value;
              if (!nextMin) {
                onChange("");
                return;
              }
              onChange(`${hourStr || pad2(defaultHour)}:${nextMin}`);
            }}
            className={`w-full h-full min-w-0 appearance-none bg-transparent border-0 text-center text-xl font-mono font-bold tabular-nums outline-none cursor-pointer pr-4 ${
              minStr ? "text-zinc-950 dark:text-white" : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            <option value="" className="bg-white dark:bg-[#141414] text-zinc-500">
              MM
            </option>
            {MINUTES_60.map((m) => (
              <option key={m} value={m} className="bg-white dark:bg-[#141414] text-zinc-950 dark:text-white">
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none absolute right-2" />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
          Quick Presets
        </span>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`h-11 rounded-xl text-xs sm:text-sm font-mono font-medium transition active:scale-95 ${
                value === t
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "bg-zinc-50 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/15 hover:border-zinc-300 dark:hover:border-white/25"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function stripLeadingFeeling(raw?: string | null): string {
  if (!raw || raw === "SKIPPED") return "";
  if (raw.startsWith("Feeling:")) {
    const parts = raw.split("·");
    return parts.slice(1).join("·").trim();
  }
  return raw;
}

function stripMealLabelPrefix(line: string): string {
  return line.replace(/^meal\s*\d+\s*:\s*/i, "").trim();
}

function sleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

function formatDuration(mins: number): string {
  if (!mins) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function sleepQualityLabel(mins: number): { label: string; cls: string } {
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

function parseLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|·/)
    .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
    .filter((line) => line.length > 1);
}

interface MealSlotEntry {
  status: "followed" | "similar" | "off_track";
  mealItem?: string;
}

interface MealDraft {
  checkedMeals: string[];
  specialOption: "similar" | "off_track" | null;
  mealsCount: 0 | 1 | 2 | 3;
  mealEntries: MealSlotEntry[];
  mealFeeling: string;
}

function buildEntriesFromLegacy(
  count: 0 | 1 | 2 | 3,
  checked: string[],
  specialOption: "similar" | "off_track" | null,
  recommended: string[]
): MealSlotEntry[] {
  const n = count > 0 ? count : checked.length > 0 ? (Math.min(3, checked.length) as 1 | 2 | 3) : 0;
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

function readMealDraft(
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
              !!e && (e.status === "followed" || e.status === "similar" || e.status === "off_track")
          )
          .slice(0, 3);
        const checkedMeals = Array.from(
          new Set(sanitized.filter((e) => e.status === "followed" && e.mealItem).map((e) => e.mealItem!))
        );
        const allSimilar = sanitized.length > 0 && sanitized.every((e) => e.status === "similar");
        const allOff = sanitized.length > 0 && sanitized.every((e) => e.status === "off_track");
        return {
          checkedMeals,
          specialOption: allSimilar ? "similar" : allOff ? "off_track" : null,
          mealsCount: mealsCount || (Math.min(3, Math.max(1, sanitized.length)) as 1 | 2 | 3),
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
          mealEntries: buildEntriesFromLegacy(mealsCount, parsed.checkedMeals, null, recommended),
          mealFeeling,
        };
      }
    } catch {
      /* plain text fallback */
    }
  }
  if (compliance === "SIMILAR") {
    return { checkedMeals: [], specialOption: "similar", mealsCount: 0, mealEntries: [], mealFeeling: "" };
  }
  if (compliance === "OFF_TRACK") {
    return { checkedMeals: [], specialOption: "off_track", mealsCount: 0, mealEntries: [], mealFeeling: "" };
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
  return { checkedMeals: [], specialOption: null, mealsCount: 0, mealEntries: [], mealFeeling: "" };
}

function compressImageFile(file: File, maxDim = 960, quality = 0.72): Promise<string> {
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

type SubStepId =
  | "wake"
  | "bed"
  | "sleep_mood"
  | "training_option"
  | "training_video"
  | "training_movements"
  | "training_photos"
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

const REFLECTION_DECLINED = "Prefer not to answer.";

const TRAINING_FEELINGS = [
  { label: "Energized", desc: "High vitality, powerful and moved with ease." },
  { label: "Accomplished", desc: "Challenging workout, pushed through with solid technique." },
  { label: "Balanced", desc: "Steady pace, good body control and regulated breath." },
  { label: "Fatigued", desc: "Challenging effort, muscles feeling worked and tired." },
  { label: "Strained", desc: "Felt physical tension or stiffness; prioritized safety." },
];

function TaskForm({
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
  const [bed, setBed] = useState(progress?.bedtime === "SKIPPED" ? "" : progress?.bedtime || "");
  const [wake, setWake] = useState(progress?.wakeTime === "SKIPPED" ? "" : progress?.wakeTime || "");
  const [sleepFeeling, setSleepFeeling] = useState<string>(() => {
    const raw = progress?.assessmentResponse || "";
    const match = raw.match(/Sleep Feeling:\s*(.+)/i);
    return match ? match[1].trim() : "";
  });

  const [workout, setWorkout] = useState(progress?.selectedWorkout === "SKIPPED" ? "" : progress?.selectedWorkout || "");
  const [editingRep, setEditingRep] = useState<{ name: string; value: string } | null>(null);
  const [pendingSwitchWorkout, setPendingSwitchWorkout] = useState<string | null>(null);
  const [notes, setNotes] = useState(() =>
    stripLeadingFeeling(progress?.workoutNotes || (progress?.eventFeedback === "SKIPPED" ? "" : progress?.eventFeedback))
  );
  const [photos, setPhotos] = useState({ before: progress?.photoBeforeUrl || "", after: progress?.photoAfterUrl || "" });
  const [photoBusy, setPhotoBusy] = useState<"before" | "after" | null>(null);

  const [trainingFeeling, setTrainingFeeling] = useState<string>(() => {
    const raw = progress?.workoutNotes || "";
    if (raw.includes("Feeling:")) {
      return raw.split("Feeling:")[1]?.split("·")[0]?.trim() || "";
    }
    return "";
  });

  const [connectAttendance, setConnectAttendance] = useState<"attend" | "cannot_attend" | null>(() => {
    const fb = progress?.eventFeedback || "";
    if (!fb || fb === "SKIPPED") return null;
    if (fb.toLowerCase().includes("cannot attend") || fb.toLowerCase().includes("not attend")) return "cannot_attend";
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
    progress?.dailyReflection === "Skipped reflection journal today." || progress?.dailyReflection === "SKIPPED"
      ? ""
      : progress?.dailyReflection || ""
  );
  const [score, setScore] = useState(
    progress?.dailyReflection === "SKIPPED" ? 0 : progress?.happinessRate ? Math.min(5, progress.happinessRate) : 0
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
  const selectedGroup = groups.find((g) => g.optionName === activeWorkout) || (!hasMultipleOptions ? groups[0] : undefined);
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

  const activeOptionIdx = Math.max(0, groups.findIndex((g) => g.optionName === activeWorkout));
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

  // Build focused one-input-per-screen flow
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
      list.push("training_photos", "training_mood");
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
  }, [step, isConnect, isRest, connectAttendance, restLines.length, groups.length, videos.length, movements.length, mealDraft.mealsCount]);

  const safeSubIndex = Math.min(subStepIndex, Math.max(0, subSteps.length - 1));
  const currentSubStep = subSteps[safeSubIndex];
  const isFirstSubStep = safeSubIndex === 0;
  const isFinalSubStep = safeSubIndex === subSteps.length - 1;

  const isChecked = (name: string) => {
    const cleanTarget = name.trim().toLowerCase();
    return localChecks.some((c) => {
      const raw = (c.includes("=") ? c.split("=")[0] : c).trim();
      if (activeWorkout) {
        const expectedPrefix = `[${activeWorkout.toLowerCase()}]`;
        const lowerRaw = raw.toLowerCase();
        if (lowerRaw.startsWith("[")) {
          if (!lowerRaw.startsWith(expectedPrefix)) return false;
          const stripped = lowerRaw.slice(expectedPrefix.length).trim();
          return stripped === cleanTarget;
        }
      }
      return raw.toLowerCase() === cleanTarget;
    });
  };

  const checkedCount = movements.filter(isChecked).length;

  // Coalesced battery-friendly checklist sync: instant local state + 1 batched server write
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
    const cleanTarget = name.trim().toLowerCase();
    const entry = localChecks.find((c) => {
      const raw = (c.includes("=") ? c.split("=")[0] : c).trim();
      if (activeWorkout) {
        const expectedPrefix = `[${activeWorkout.toLowerCase()}]`;
        const lowerRaw = raw.toLowerCase();
        if (lowerRaw.startsWith("[")) {
          if (!lowerRaw.startsWith(expectedPrefix)) return false;
          const stripped = lowerRaw.slice(expectedPrefix.length).trim();
          return stripped === cleanTarget;
        }
      }
      return raw.toLowerCase() === cleanTarget;
    });
    if (!entry || !entry.includes("=")) return defaultTarget;
    const parsed = parseInt(entry.split("=")[1], 10);
    return isNaN(parsed) ? defaultTarget : parsed;
  };

  const updateMovementReps = (name: string, reps: number) => {
    if (locked) return;
    const safeReps = Math.max(1, Math.min(999, Math.round(reps) || 1));
    const cleanTarget = name.trim().toLowerCase();
    const scoped = activeWorkout ? `[${activeWorkout}] ${name}` : name;
    const newEntry = `${scoped}=${safeReps}`;

    let found = false;
    const updated = localChecks.map((c) => {
      const raw = (c.includes("=") ? c.split("=")[0] : c).trim();
      let match = false;
      if (activeWorkout) {
        const expectedPrefix = `[${activeWorkout.toLowerCase()}]`;
        const lowerRaw = raw.toLowerCase();
        if (lowerRaw.startsWith("[")) {
          if (lowerRaw.startsWith(expectedPrefix)) {
            match = lowerRaw.slice(expectedPrefix.length).trim() === cleanTarget;
          }
        } else {
          match = raw.toLowerCase() === cleanTarget;
        }
      } else {
        match = raw.toLowerCase() === cleanTarget;
      }
      if (match) {
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
    const cleanTarget = name.trim().toLowerCase();
    const scopedWithReps = defaultReps ? `${scoped}=${defaultReps}` : scoped;

    let nextChecks: string[];
    const alreadyChecked = isChecked(name);
    if (alreadyChecked) {
      nextChecks = localChecks.filter((c) => {
        const raw = (c.includes("=") ? c.split("=")[0] : c).trim();
        if (activeWorkout) {
          const expectedPrefix = `[${activeWorkout.toLowerCase()}]`;
          const lowerRaw = raw.toLowerCase();
          if (lowerRaw.startsWith("[")) {
            if (lowerRaw.startsWith(expectedPrefix)) {
              return lowerRaw.slice(expectedPrefix.length).trim() !== cleanTarget;
            }
          }
        }
        return raw.toLowerCase() !== cleanTarget;
      });
    } else {
      nextChecks = [...localChecks, scopedWithReps];
    }
    setLocalChecks(nextChecks);
    if (props.onSyncChecklist) {
      scheduleChecklistSync(nextChecks);
    } else {
      void props.onToggleCheck(alreadyChecked ? scoped : scopedWithReps, day.id);
    }
  };

  const pickPhoto = async (type: "before" | "after", file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo exceeds maximum allowed size of 5 MB.");
      return;
    }
    setPhotoBusy(type);
    setError(null);
    try {
      const dataUrl = await compressImageFile(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, type }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.url) throw new Error(json?.message || "Upload failed.");
      const ok = (await props.onUploadPhoto(type, json.url, day.id)) !== false;
      if (!ok) throw new Error("Could not save the photo.");
      setPhotos((p) => ({ ...p, [type]: json.url as string }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPhotoBusy(null);
    }
  };

  const validateSubStep = (id: SubStepId): string | null => {
    switch (id) {
      case "wake":
        return TIME_24H_RE.test(wake) ? null : "Please select the time you woke up today (HH:MM).";
      case "bed":
        return TIME_24H_RE.test(bed) ? null : "Please select the time you went to sleep last night (HH:MM).";
      case "sleep_mood":
        return sleepFeeling ? null : "Please select how you feel after waking up.";
      case "training_option":
        return !hasMultipleOptions || activeWorkout ? null : "Please select a training focus to continue.";
      case "training_video":
        return null;
      case "training_movements":
        if (movements.length > 0 && !movements.every(isChecked)) {
          return `Please complete all exercises (${movements.length - checkedCount} remaining).`;
        }
        return null;
      case "training_photos":
        return photos.before || photos.after
          ? null
          : "Please upload at least one session photo (Before or After).";
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
        return connectAttendance ? null : "Please indicate whether you will attend this session.";
      case "connect_rating":
        return connectRating > 0 ? null : "Please rate your session experience from 1 to 5 stars.";
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
        return mealDraft.mealFeeling ? null : "Please select how you feel after your meals.";
      case "reflection_journal":
        return review === REFLECTION_DECLINED || review.trim().length >= 3
          ? null
          : "Please write a brief reflection or select \"Prefer not to answer\".";
      case "reflection_mood":
        return score > 0 ? null : "Please select your overall mood & energy rating.";
      default:
        return null;
    }
  };

  const persistFinal = async (): Promise<boolean> => {
    await flushChecklist(localChecks);
    if (step === 0) {
      return (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake), day.id, sleepFeeling)) !== false;
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
      const finalNotes = trainingFeeling
        ? `Feeling: ${trainingFeeling}${notes.trim() ? ` · ${notes.trim()}` : ""}`
        : notes.trim() || (activeWorkout ? `Completed: ${activeWorkout}` : "Completed training session");
      return (await props.onSaveWorkoutNotes(finalNotes, day.id)) !== false;
    }
    if (step === 2) {
      const mealCount = mealDraft.mealsCount || 1;
      const activeEntries = mealDraft.mealEntries.slice(0, mealCount);
      const checkedMeals = Array.from(
        new Set(activeEntries.filter((e) => e.status === "followed" && e.mealItem).map((e) => e.mealItem!))
      );
      const allFollowed = activeEntries.length === mealCount && activeEntries.every((e) => e.status === "followed");
      const allSimilar = activeEntries.length === mealCount && activeEntries.every((e) => e.status === "similar");
      const allOffTrack = activeEntries.length === mealCount && activeEntries.every((e) => e.status === "off_track");
      const compliance = allFollowed ? "FULL" : allSimilar ? "SIMILAR" : allOffTrack ? "OFF_TRACK" : "PARTIAL";

      const mealPayload = {
        v: 4,
        mode: compliance.toLowerCase(),
        checkedMeals,
        mealsCount: mealCount,
        mealEntries: activeEntries,
        mealFeeling: mealDraft.mealFeeling,
      };
      return (await props.onSaveMeal(compliance, JSON.stringify(mealPayload), day.id)) !== false;
    }
    return (await props.onSaveReflection(review.trim(), score || 3, day.id)) !== false;
  };

  const handlePrimaryAction = async () => {
    if (locked || busy || photoBusy !== null) return;
    const err = validateSubStep(currentSubStep);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    if (!isFinalSubStep) {
      if (currentSubStep === "training_movements" || currentSubStep === "rest_checklist") {
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
  const progressPct = Math.round(((safeSubIndex + 1) / Math.max(1, subSteps.length)) * 100);

  // READ-ONLY SINGLE-SCREEN SUMMARY WHEN VIEWING LOCKED OR PAST DAYS
  if (locked) {
    return (
      <div className="h-full w-full overflow-y-auto overscroll-contain bg-white dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100">
        <div
          className="w-full max-w-md mx-auto min-h-full flex flex-col px-5 sm:px-6"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <header className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-xs font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <span
              className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                isTaskDone
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : isPast
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/15"
                    : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/15"
              }`}
            >
              {isTaskDone ? "Completed" : isPast ? "Skipped" : "Locked"}
            </span>
          </header>

          <div className="flex-1 py-6 space-y-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                Day {day.dayNumber} · History Record
              </span>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                {taskTitle}
              </h1>
            </div>

            {!isTaskDone && isPast ? (
              <div className="py-10 px-5 rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-center space-y-2">
                <Clock className="w-5 h-5 mx-auto text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Task Marked as Skipped</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  No entry was recorded before the 23:59 WIB daily cutoff.
                </p>
              </div>
            ) : (
              <dl className="divide-y divide-zinc-200 dark:divide-white/10 border-t border-b border-zinc-200 dark:border-white/10 text-sm">
              {step === 0 && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Wake Time</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">{wake || "—"}</dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Bedtime</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">{bed || "—"}</dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Total Sleep</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {totalSleepMins > 0 ? formatDuration(totalSleepMins) : "—"}
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Morning Feeling</dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">{sleepFeeling || "—"}</dd>
                  </div>
                </>
              )}

              {step === 1 && isTraining && (
                <>
                  {activeWorkout && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Focus</dt>
                      <dd className="font-semibold text-zinc-950 dark:text-white text-right">{activeWorkout}</dd>
                    </div>
                  )}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Movements</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {checkedCount} / {movements.length || checkedCount} Done
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Post-Session Mood</dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">{trainingFeeling || "—"}</dd>
                  </div>
                </>
              )}

              {step === 1 && isRest && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Recovery Items</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {checkedCount} / {movements.length} Checked
                    </dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Body Condition</dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">{trainingFeeling || "—"}</dd>
                  </div>
                </>
              )}

              {step === 1 && isConnect && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Attendance</dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white text-right">
                      {connectAttendance === "attend" ? "Attended" : connectAttendance === "cannot_attend" ? "Could Not Attend" : "—"}
                    </dd>
                  </div>
                  {connectRating > 0 && (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Experience</dt>
                      <dd className="font-mono font-semibold text-zinc-950 dark:text-white">{connectRating} / 5 Stars</dd>
                    </div>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Meals Eaten</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {mealDraft.mealsCount > 0 ? `${mealDraft.mealsCount} ${mealDraft.mealsCount === 1 ? "Time" : "Times"}` : "—"}
                    </dd>
                  </div>
                  {mealDraft.mealEntries.length > 0 ? (
                    mealDraft.mealEntries.map((entry, idx) => (
                      <div key={idx} className="py-4 flex items-center justify-between gap-4">
                        <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Meal {idx + 1}</dt>
                        <dd className="font-medium text-zinc-950 dark:text-white text-right">
                          {entry.status === "followed"
                            ? "Followed Plan"
                            : entry.status === "similar"
                              ? "Similar Nutrition"
                              : "Off Plan"}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <div className="py-4 flex items-center justify-between gap-4">
                      <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Meal Plan Status</dt>
                      <dd className="font-semibold text-zinc-950 dark:text-white text-right">
                        {mealDraft.specialOption === "similar"
                          ? "Similar Portion & Nutrition"
                          : mealDraft.specialOption === "off_track"
                            ? "Off Plan"
                            : `${mealDraft.checkedMeals.length} / ${recommendedMeals.length} Recommended`}
                      </dd>
                    </div>
                  )}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Post-Meal Mood</dt>
                    <dd className="font-medium text-zinc-950 dark:text-white text-right">{mealDraft.mealFeeling || "—"}</dd>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="py-4 space-y-1.5">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Journal Reflection</dt>
                    <dd className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">{review || "—"}</dd>
                  </div>
                  <div className="py-4 flex items-center justify-between gap-4">
                    <dt className="text-xs font-mono uppercase text-zinc-500 dark:text-zinc-400">Mood &amp; Energy</dt>
                    <dd className="font-mono font-semibold text-zinc-950 dark:text-white">
                      {score > 0 ? `${FACES.find((f) => f.score === score)?.label || score} (${score}/5)` : "—"}
                    </dd>
                  </div>
                </>
              )}
              </dl>
            )}
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold active:scale-[0.99] transition shadow-sm"
            >
              Back to Program Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto overscroll-contain bg-white dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100">
      <div
        className="w-full max-w-md mx-auto min-h-full flex flex-col px-5 sm:px-6"
        style={{
          paddingTop: "max(1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.75rem, env(safe-area-inset-bottom))",
        }}
      >
        {/* CLEAN SINGLE-ACTION HEADER + STEP INDICATOR */}
        <header className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBack}
              aria-label={isFirstSubStep ? "Back to dashboard" : "Previous question"}
              className="h-9 px-3.5 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-xs font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-100 dark:hover:bg-white/10"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold truncate max-w-[60%]">
              {taskTitle} · {safeSubIndex + 1} / {subSteps.length}
            </span>
          </div>

          <div className="h-1 w-full rounded-full bg-zinc-200/80 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </header>

      {/* ONE SCREEN, ONE INPUT FORM */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handlePrimaryAction();
        }}
        className="flex-1 flex flex-col justify-between gap-8 pt-4 min-w-0"
      >
        <div className="space-y-6 min-w-0">
          {/* SLEEP 1: WAKE TIME */}
          {currentSubStep === "wake" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Day {day.dayNumber} · Sleep Routine
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  What time did you wake up today?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {day.sleepRecommendation || "Select or enter the exact time you woke up this morning."}
                </p>
              </div>

              <TimeInputField
                idPrefix="wake-time"
                label="Wake time"
                value={wake}
                presets={WAKETIME_PRESETS}
                defaultHour={6}
                onChange={(next) => {
                  setWake(next);
                  setError(null);
                }}
              />
            </div>
          )}

          {/* SLEEP 2: BEDTIME */}
          {currentSubStep === "bed" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Woke up at {wake}
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  What time did you go to sleep last night?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Used to calculate total circadian recovery duration.
                </p>
              </div>

              <TimeInputField
                idPrefix="bed-time"
                label="Bedtime"
                value={bed}
                presets={BEDTIME_PRESETS}
                defaultHour={22}
                onChange={(next) => {
                  setBed(next);
                  setError(null);
                }}
              />

              {totalSleepMins > 0 && (
                <div className="pt-3 border-t border-zinc-200/90 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400 font-medium">Calculated Rest</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-950 dark:text-white">
                      {formatDuration(totalSleepMins)}
                    </span>
                    {sleepQuality && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${sleepQuality.cls}`}>
                        {sleepQuality.label}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SLEEP 3: POST-SLEEP MOOD */}
          {currentSubStep === "sleep_mood" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  {bed} → {wake} · {formatDuration(totalSleepMins)}
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How do you feel after waking up?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Select the condition that best describes your morning energy.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {SLEEP_FEELINGS.map((item) => {
                  const active = sleepFeeling === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setSleepFeeling(item.label);
                        setError(null);
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRAINING 1: WORKOUT OPTION */}
          {currentSubStep === "training_option" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Day {day.dayNumber} · Training Focus
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Choose today&apos;s training option
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Select the variation that fits your readiness level today.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {groups.map((g, idx) => {
                  const isSelected = activeWorkout === g.optionName;
                  const matchVideo =
                    videos.find(
                      (v) => v.title.trim().toLowerCase() === g.optionName.trim().toLowerCase()
                    ) || videos[idx] || videos[0];
                  const thumbUrl = extractVideoThumbnail(matchVideo?.url || day.videoUrl, "/coach.webp");

                  return (
                    <button
                      key={g.optionName}
                      type="button"
                      onClick={() => void handleClickWorkoutOption(g.optionName)}
                      className={`relative w-full h-32 rounded-2xl overflow-hidden text-left transition active:scale-[0.99] group ${
                        isSelected
                          ? "ring-2 ring-zinc-950 dark:ring-white shadow-md"
                          : "ring-1 ring-zinc-900/10 dark:ring-white/15 hover:ring-zinc-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl}
                        alt={g.optionName}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

                      <div className="relative z-10 h-full p-4 flex items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-white tracking-tight leading-snug truncate">
                            {g.optionName}
                          </p>
                          <p className="text-xs font-medium text-white/80 mt-1">
                            {g.movements.length} {g.movements.length === 1 ? "Movement" : "Movements"}
                          </p>
                        </div>
                        {isSelected && (
                          <span
                            aria-hidden="true"
                            className="shrink-0 w-7 h-7 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-sm"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TRAINING 2: GUIDED VIDEO */}
          {currentSubStep === "training_video" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  {activeWorkout || `Day ${day.dayNumber} Training`}
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Watch the guided session
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Review form cues and pacing before logging your movements.
                </p>
              </div>

              {activeVideo && (() => {
                const safeVideoUrl = safeHttpUrl(activeVideo.url);
                return (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200 dark:border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {safeVideoUrl && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center">
                          <a
                            href={safeVideoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => void props.onOpenVideo(day.id)}
                            className="w-14 h-14 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                          >
                            <Play className="w-6 h-6 fill-current ml-0.5" />
                          </a>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-sm font-semibold truncate">{activeVideo.title}</p>
                        <p className="text-xs text-white/80">Guided training movement cues</p>
                      </div>
                    </div>

                    {safeVideoUrl && (
                      <a
                        href={safeVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void props.onOpenVideo(day.id)}
                        className="w-full h-12 px-4 rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-xs font-semibold text-zinc-950 dark:text-white flex items-center justify-center gap-2 transition hover:border-zinc-300 dark:hover:border-white/25"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Open Video Guide</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TRAINING 3: MOVEMENT CHECKLIST & REPS */}
          {currentSubStep === "training_movements" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                    {activeWorkout || "Movement Checklist"}
                  </span>
                  <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {checkedCount} / {movements.length} Done
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Log your completed movements
                </h1>
              </div>

              {movements.length > 0 ? (
                <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                  {movements.map((name) => {
                    const checked = isChecked(name);
                    const moveObj = selectedGroup?.movements.find((m) => m.name === name);
                    const targetLabel = moveObj?.target;
                    const targetReps = parseTargetReps(targetLabel);
                    const currentReps = getMovementReps(name, targetReps);
                    const isEditing = editingRep?.name === name;

                    return (
                      <div key={name} className="py-4 px-1">
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-start gap-3 min-w-0 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(name, currentReps)}
                              className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-white/20 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                            />
                            <div className="min-w-0">
                              <span
                                className={`text-sm leading-relaxed block transition ${
                                  checked
                                    ? "line-through text-zinc-400 dark:text-zinc-500"
                                    : "font-medium text-zinc-900 dark:text-white"
                                }`}
                              >
                                {name}
                              </span>
                              {targetLabel && (
                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block mt-0.5">
                                  Target: {targetLabel}
                                </span>
                              )}
                            </div>
                          </label>

                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={currentReps <= 1}
                              onClick={() => {
                                setEditingRep(null);
                                updateMovementReps(name, Math.max(1, currentReps - 1));
                              }}
                              aria-label={`Decrease reps for ${name}`}
                              className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              inputMode="numeric"
                              aria-label={`Reps for ${name}`}
                              value={isEditing ? editingRep.value : String(currentReps)}
                              onFocus={() => setEditingRep({ name, value: String(currentReps) })}
                              onChange={(e) => setEditingRep({ name, value: e.target.value })}
                              onBlur={() => {
                                const parsed = parseInt(editingRep?.value || "", 10);
                                setEditingRep(null);
                                if (!isNaN(parsed) && parsed >= 1) {
                                  updateMovementReps(name, parsed);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                              }}
                              className="w-12 h-8 text-center text-xs font-mono font-semibold text-zinc-950 dark:text-white bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/15 rounded-lg outline-none focus:border-zinc-950 dark:focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              disabled={currentReps >= 999}
                              onClick={() => {
                                setEditingRep(null);
                                updateMovementReps(name, Math.min(999, currentReps + 1));
                              }}
                              aria-label={`Increase reps for ${name}`}
                              className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200 dark:border-white/15"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  No individual movements configured for this session. Proceed to the next step.
                </p>
              )}
            </div>
          )}

          {/* TRAINING 4: PROGRESS PHOTO */}
          {currentSubStep === "training_photos" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Session Verification
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Upload a progress photo
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Add a before or after session photo (max 5 MB each).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 min-w-0">
                {(["before", "after"] as const).map((type) => (
                  <label key={type} className="block cursor-pointer min-w-0">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mb-2">
                      {type === "before" ? "Before Session" : "After Session"}
                    </span>
                    <span className="relative flex h-40 items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/[0.04] hover:border-zinc-400 dark:hover:border-white/30 transition">
                      {photos[type] ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photos[type]} alt="" className="w-full h-full object-cover" />
                          <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/75 text-white text-[11px] font-medium">
                            Change
                          </span>
                        </>
                      ) : photoBusy === type ? (
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-500 dark:text-zinc-400" />
                      ) : (
                        <span className="inline-flex flex-col items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          <Camera className="w-5 h-5" />
                          <span>Upload</span>
                        </span>
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={photoBusy !== null}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void pickPhoto(type, file);
                      }}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TRAINING 5: POST-TRAINING MOOD */}
          {currentSubStep === "training_mood" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  {activeWorkout || "Post-Session Check"}
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How do you feel after training?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Capture how your body responded to today&apos;s session.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {TRAINING_FEELINGS.map((item) => {
                  const active = trainingFeeling === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setTrainingFeeling(item.label);
                        setError(null);
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* REST 1: RECOVERY CHECKLIST */}
          {currentSubStep === "rest_checklist" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Day {day.dayNumber} · Active Recovery
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Complete your recovery protocol
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Focus on parasympathetic down-regulation, hydration, and light mobility.
                </p>
              </div>

              <ul className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                {restLines.map((line, idx) => {
                  const checked = isChecked(line);
                  return (
                    <li key={idx}>
                      <label className="flex items-start gap-3.5 py-4 px-1 cursor-pointer transition select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(line)}
                          className="w-4 h-4 mt-0.5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                        />
                        <span
                          className={`text-sm leading-relaxed ${
                            checked
                              ? "line-through text-zinc-400 dark:text-zinc-500"
                              : "text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          {line}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* REST 2: POST-REST MOOD */}
          {currentSubStep === "rest_mood" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Day {day.dayNumber} · Recovery Check
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How does your body feel today?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Select how recovered and energized your body feels on this rest day.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {REST_FEELINGS.map((item) => {
                  const active = trainingFeeling === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setTrainingFeeling(item.label);
                        setError(null);
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CONNECT 1: ATTENDANCE & LOGISTICS */}
          {currentSubStep === "connect_attendance" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  {day.onsiteSchedule || "Live Community Session"}
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Will you attend {day.eventTitle || "this session"}?
                </h1>
                {day.eventDetails && (
                  <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {day.eventDetails}
                  </p>
                )}
              </div>

              {(safeHttpUrl(day.meetupLink) || day.onsiteVenue) && (
                <div className="py-4 border-t border-b border-zinc-200/90 dark:border-white/10 space-y-2.5 text-xs">
                  {day.onsiteVenue && (
                    <div className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500 dark:text-zinc-400" />
                      <span>{day.onsiteVenue}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {safeHttpUrl(day.meetupLink) && (
                      <a
                        href={safeHttpUrl(day.meetupLink)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Join Zoom Meeting</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {safeHttpUrl(day.mapLink) && (
                      <a
                        href={safeHttpUrl(day.mapLink)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-4 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-xs font-semibold text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-1.5 hover:border-zinc-300 dark:hover:border-white/25 transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Open Maps</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setConnectAttendance("attend");
                    setError(null);
                  }}
                  className={`h-14 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between ${
                    connectAttendance === "attend"
                      ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                  }`}
                >
                  <span>I Will Attend</span>
                  <Check className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConnectAttendance("cannot_attend");
                    setConnectRating(0);
                    setError(null);
                  }}
                  className={`h-14 px-5 rounded-2xl border text-sm font-semibold transition flex items-center justify-between ${
                    connectAttendance === "cannot_attend"
                      ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                  }`}
                >
                  <span>Cannot Attend</span>
                </button>
              </div>
            </div>
          )}

          {/* CONNECT 2: SESSION RATING */}
          {currentSubStep === "connect_rating" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Session Feedback
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How would you rate today&apos;s session?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Rate your overall takeaway and experience from 1 to 5 stars.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pt-1 min-w-0">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= connectRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setConnectRating(star);
                        setError(null);
                      }}
                      className={`min-w-0 py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                        filled
                          ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/[0.08]"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                      aria-label={`${star} Stars`}
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          filled
                            ? "fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white"
                            : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-mono font-medium ${
                          filled ? "text-zinc-950 dark:text-white font-semibold" : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {star}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MEAL 1: NUMBER OF MEALS EATEN TODAY (1 / 2 / 3) */}
          {currentSubStep === "meal_count" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  Day {day.dayNumber} · Daily Intake Frequency
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How many meals did you eat today?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Select your meal count first — you will review each meal next.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                {([1, 2, 3] as const).map((count) => {
                  const active = mealDraft.mealsCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMealDraft((prev) => ({
                          ...prev,
                          mealsCount: count,
                          mealEntries: prev.mealEntries.slice(0, count),
                        }));
                      }}
                      className={`py-5 px-2 rounded-2xl border text-center transition active:scale-95 ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <span className="block text-2xl font-mono font-bold tabular-nums leading-none">
                        {count}
                      </span>
                      <span
                        className={`block text-[11px] font-mono uppercase tracking-wider mt-2 ${
                          active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {count === 1 ? "Time" : "Times"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MEAL 2..N: PER-MEAL ADHERENCE CHECK (1 INPUT PER MEAL EATEN) */}
          {(currentSubStep === "meal_entry_1" ||
            currentSubStep === "meal_entry_2" ||
            currentSubStep === "meal_entry_3") &&
            (() => {
              const slotIndex =
                currentSubStep === "meal_entry_1" ? 0 : currentSubStep === "meal_entry_2" ? 1 : 2;
              const entry = mealDraft.mealEntries[slotIndex];
              const totalMeals = mealDraft.mealsCount || 1;
              const defaultRec =
                recommendedMeals[Math.min(slotIndex, recommendedMeals.length - 1)] || recommendedMeals[0];
              const cleanDefaultRec = stripMealLabelPrefix(defaultRec) || defaultRec;

              const setSlotEntry = (next: MealSlotEntry) => {
                setError(null);
                setMealDraft((prev) => {
                  const nextEntries = [...prev.mealEntries];
                  nextEntries[slotIndex] = next;
                  const activeSlice = nextEntries.slice(0, prev.mealsCount || 1);
                  const checkedMeals = Array.from(
                    new Set(
                      activeSlice
                        .filter((e) => e?.status === "followed" && e.mealItem)
                        .map((e) => e.mealItem!)
                    )
                  );
                  const allSimilar =
                    activeSlice.length > 0 && activeSlice.every((e) => e?.status === "similar");
                  const allOff =
                    activeSlice.length > 0 && activeSlice.every((e) => e?.status === "off_track");
                  return {
                    ...prev,
                    mealEntries: nextEntries,
                    checkedMeals,
                    specialOption: allSimilar ? "similar" : allOff ? "off_track" : null,
                  };
                });
              };

              return (
                <div className="space-y-5 min-w-0">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Meal {slotIndex + 1} of {totalMeals} · Daily Plan Check
                    </span>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                      Did Meal {slotIndex + 1} follow today&apos;s meal plan?
                    </h1>
                    {cleanDefaultRec && (
                      <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Suggested: {cleanDefaultRec}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSlotEntry({
                          status: "followed",
                          mealItem: entry?.mealItem || defaultRec,
                        })
                      }
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        entry?.status === "followed"
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          entry?.status === "followed"
                            ? "text-white dark:text-zinc-950"
                            : "text-zinc-950 dark:text-white"
                        }`}
                      >
                        Followed Recommended Meal
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          entry?.status === "followed"
                            ? "text-white/80 dark:text-zinc-950/80"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Ate in line with today&apos;s meal plan guideline.
                      </p>
                    </button>

                    {entry?.status === "followed" && recommendedMeals.length > 1 && (
                      <div className="p-3 rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/[0.03] space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                          Matched Menu Option
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {recommendedMeals.map((mealLine, idx) => {
                            const selected = (entry.mealItem || defaultRec) === mealLine;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSlotEntry({ status: "followed", mealItem: mealLine })}
                                className={`w-full px-3 py-2 rounded-xl border text-left text-xs transition ${
                                  selected
                                    ? "border-zinc-950 dark:border-white bg-white dark:bg-white/10 font-semibold text-zinc-950 dark:text-white"
                                    : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                                }`}
                              >
                                <span className="font-mono uppercase text-[10px] mr-1.5 opacity-70">
                                  #{idx + 1}
                                </span>
                                {stripMealLabelPrefix(mealLine) || mealLine}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setSlotEntry({ status: "similar" })}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        entry?.status === "similar"
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          entry?.status === "similar"
                            ? "text-white dark:text-zinc-950"
                            : "text-zinc-950 dark:text-white"
                        }`}
                      >
                        Similar Portion &amp; Clean Nutrition
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          entry?.status === "similar"
                            ? "text-white/80 dark:text-zinc-950/80"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Different dish with balanced macros and portion size.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlotEntry({ status: "off_track" })}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        entry?.status === "off_track"
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${
                          entry?.status === "off_track"
                            ? "text-white dark:text-zinc-950"
                            : "text-zinc-950 dark:text-white"
                        }`}
                      >
                        Off Plan
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          entry?.status === "off_track"
                            ? "text-white/80 dark:text-zinc-950/80"
                            : "text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Did not follow recommended meal guidelines for Meal {slotIndex + 1}.
                      </p>
                    </button>
                  </div>
                </div>
              );
            })()}

          {/* MEAL FINAL: POST-MEAL MOOD (ALWAYS LAST) */}
          {currentSubStep === "meal_mood" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  {mealDraft.mealsCount} {mealDraft.mealsCount === 1 ? "Meal" : "Meals"} Logged
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How do you feel after your meals?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Note your post-meal digestion and sustained energy state.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {MEAL_FEELINGS.map((item) => {
                  const active = mealDraft.mealFeeling === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMealDraft((prev) => ({ ...prev, mealFeeling: item.label }));
                      }}
                      className={`w-full p-4 rounded-2xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <p className={`text-sm font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* REFLECTION 1: DAILY JOURNAL */}
          {currentSubStep === "reflection_journal" && (() => {
            const preferNotAnswer = review === REFLECTION_DECLINED;
            return (
              <div className="space-y-5 min-w-0">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                    Day {day.dayNumber} · Daily Reflection
                  </span>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                    Reflect on your day
                  </h1>
                  {day.dailyAssessment && (
                    <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-200 border-l-2 border-zinc-300 dark:border-white/25 pl-3 leading-relaxed">
                      {day.dailyAssessment}
                    </p>
                  )}
                  <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Write freely in your own words — log today&apos;s journal, vent about anything on your mind, or capture whatever stood out today.
                  </p>
                </div>

                <textarea
                  value={preferNotAnswer ? "" : review}
                  onChange={(e) => {
                    setReview(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void handlePrimaryAction();
                    }
                  }}
                  rows={5}
                  maxLength={2000}
                  placeholder="Write your journal, vent, or share any thoughts from today..."
                  className={areaCls}
                />

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setReview((prev) => (prev === REFLECTION_DECLINED ? "" : REFLECTION_DECLINED));
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition select-none flex items-center justify-between gap-3 ${
                    preferNotAnswer
                      ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-white/25"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${preferNotAnswer ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                      Prefer not to answer
                    </p>
                    <p className={`text-xs mt-0.5 leading-relaxed ${preferNotAnswer ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-600 dark:text-zinc-400"}`}>
                      Keep today&apos;s journal private and continue to your mood rating.
                    </p>
                  </div>
                  {preferNotAnswer && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </div>
            );
          })()}

          {/* REFLECTION 2: DAILY ENERGY & MOOD RATING (ALWAYS LAST) */}
          {currentSubStep === "reflection_mood" && (
            <div className="space-y-5 min-w-0">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                  End of Day Check-In
                </span>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
                  How is your overall mood &amp; energy today?
                </h1>
                <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Select your overall rating to wrap up today&apos;s reflection.
                </p>
              </div>

              <div className="grid grid-cols-5 gap-2 sm:gap-2.5 pt-1 min-w-0" role="radiogroup" aria-label="Satisfaction Rating">
                {FACES.map(({ score: n, Icon, label }) => {
                  const active = score === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={label}
                      onClick={() => {
                        setScore(n);
                        setError(null);
                      }}
                      className={`min-w-0 py-3.5 px-1 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                        active
                          ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-white/25"
                      }`}
                    >
                      <Icon className="w-6 h-6" strokeWidth={1.75} />
                      <span className="text-[11px] font-mono font-medium truncate max-w-full">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-mono">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || photoBusy !== null}
            className="w-full h-12 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.99] transition disabled:opacity-40 shadow-sm"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isFinalSubStep ? (
              <Check className="w-4 h-4" />
            ) : null}
            <span>{isFinalSubStep ? "Save & Finish" : "Continue"}</span>
            {!isFinalSubStep && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </form>

      {/* CONFIRMATION MODAL FOR SWITCHING WORKOUT VARIATION */}
      {pendingSwitchWorkout && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Change Training Variation?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Switching from <strong className="text-zinc-800 dark:text-zinc-200">{workout}</strong> to{" "}
                <strong className="text-zinc-800 dark:text-zinc-200">{pendingSwitchWorkout}</strong> will reset your{" "}
                <strong>{checkedCount}</strong> logged movement(s) in this session.
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

function formatDayPillDate(unlockDate: string | Date | undefined | null, dayNumber: number): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = typeof unlockDate === "string" ? new Date(unlockDate) : unlockDate;
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function formatDayDate(unlockDate: string | undefined, dayNumber: number): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = new Date(unlockDate);
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullDayDate(unlockDate: string | undefined, dayNumber: number): string {
  const baseDate = unlockDate ? new Date(unlockDate) : new Date();
  const validDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(validDate);
  return `${formatted} · Day ${dayNumber}`;
}

function getWibResetCountdown(): string {
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

function deriveDayActivities(d: PlanDay): string[] {
  if (d.dayType === "REST_DAY") {
    return parseLines(d.restInstructions);
  }
  if (d.dayType === "TRAINING_DAY") {
    const groups = parseWorkoutOptionGroups(d.workoutOptions, d.videoChecklist);
    const selected = d.userProgress?.selectedWorkout || groups[0]?.optionName;
    const group = groups.find((g) => g.optionName === selected) || groups[0];
    const names = (group?.movements || []).map((m) => m.name.trim()).filter(Boolean);
    if (names.length > 0) return names;
    return (d.videoChecklist || []).map((item) => item.split("=")[0].trim()).filter(Boolean);
  }
  return [];
}

function deriveDayChecks(d: PlanDay): string[] {
  if (!d.userProgress?.checklistCompleted) return [];
  try {
    const parsed = JSON.parse(d.userProgress.checklistCompleted);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function deriveDayDone(d: PlanDay, acts: string[], chks: string[]): [boolean, boolean, boolean, boolean] {
  const p = d.userProgress;
  // "SKIPPED" is never counted as completed — missed tasks auto-mark Skipped only after 23:59 WIB.
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
        (acts.length > 0 && acts.every((name) => chks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
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

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone } = props;
  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone((prev) => [
      prev[0] || initialDone[0],
      prev[1] || initialDone[1],
      prev[2] || initialDone[2],
      prev[3] || initialDone[3],
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const [selectedDayId, setSelectedDayId] = useState<string>(day.id);
  useEffect(() => {
    setSelectedDayId(day.id);
  }, [day.id]);

  const [resetCountdown, setResetCountdown] = useState<string>(() => getWibResetCountdown());
  const [showDailyTasksInfo, setShowDailyTasksInfo] = useState(false);

  // Battery-efficient reset timer: pauses while backgrounded, syncs on visibilitychange, skips redundant re-renders.
  useEffect(() => {
    const syncCountdown = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      const next = getWibResetCountdown();
      setResetCountdown((prev) => (prev === next ? prev : next));
    };
    syncCountdown();
    const interval = setInterval(syncCountdown, 60000);
    document.addEventListener("visibilitychange", syncCountdown);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", syncCountdown);
    };
  }, []);

  const [detailOpen, setDetailOpen] = useState(false);
  const [step, setStep] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const programDays = useMemo(() => {
    const list =
      props.allProgramDays && props.allProgramDays.length > 0
        ? props.allProgramDays
        : props.pastDays && props.pastDays.length > 0
          ? props.pastDays
          : [day];
    return [...list].sort((a, b) => a.dayNumber - b.dayNumber);
  }, [props.allProgramDays, props.pastDays, day]);

  const selectedDay = useMemo(
    () => programDays.find((d) => d.id === selectedDayId) || day,
    [programDays, selectedDayId, day]
  );

  const isSelectedToday = selectedDay.id === day.id;
  const isSelectedPast = !isSelectedToday && (selectedDay.isPast2359 || selectedDay.dayNumber < day.dayNumber);
  const isSelectedFuture = !isSelectedToday && !isSelectedPast;

  const [showAllDaysGrid, setShowAllDaysGrid] = useState(false);
  const todayDateStr = useMemo(() => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date());
  }, []);

  const currentDayIndex = programDays.findIndex((d) => d.id === selectedDay.id);
  const safeDayIndex = currentDayIndex >= 0 ? currentDayIndex : 0;
  const [viewWeek, setViewWeek] = useState<number>(() => Math.floor(safeDayIndex / 7));

  useEffect(() => {
    if (currentDayIndex >= 0) {
      setViewWeek(Math.floor(currentDayIndex / 7));
    }
  }, [currentDayIndex]);

  const totalWeeks = Math.max(1, Math.ceil(programDays.length / 7));
  const weekDays = useMemo(() => {
    const startIdx = viewWeek * 7;
    return programDays.slice(startIdx, startIdx + 7);
  }, [programDays, viewWeek]);

  // Center the active/selected day in the number strip if present
  useEffect(() => {
    const container = stripRef.current;
    const btn = buttonRefs.current[selectedDay.id];
    if (!container || !btn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const currentScroll = container.scrollLeft;
    const targetScroll =
      currentScroll +
      (btnRect.left - containerRect.left) -
      container.clientWidth / 2 +
      btnRect.width / 2;
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: "smooth" });
  }, [selectedDay.id, programDays.length]);

  const selectedActivities = useMemo(
    () => (isSelectedToday ? activities : deriveDayActivities(selectedDay)),
    [isSelectedToday, activities, selectedDay]
  );

  const selectedChecks = useMemo(
    () => (isSelectedToday ? checks : deriveDayChecks(selectedDay)),
    [isSelectedToday, checks, selectedDay]
  );

  const selectedDone = useMemo(
    () => (isSelectedToday ? done : deriveDayDone(selectedDay, selectedActivities, selectedChecks)),
    [isSelectedToday, done, selectedDay, selectedActivities, selectedChecks]
  );

  const selectedLocked = isSelectedToday ? locked : true;

  const tasks = useMemo(() => getTasksForDay(selectedDay.dayType), [selectedDay.dayType]);

  const totalCompleted = programDays.filter((d) => d.userProgress?.isCompleted).length;

  const openDetail = (index: number) => {
    if (isSelectedFuture) return;
    setStep(index);
    setDetailOpen(true);
  };

  const markDone = (index: number) => {
    if (isSelectedToday) {
      setDone((prev) => prev.map((item, i) => (i === index ? true : item)));
    }
  };

  const currentTask = tasks[step] || tasks[0];
  const allDone = done.every(Boolean);

  const handleFinishTask = () => {
    if (isSelectedToday && !locked) {
      markDone(step);
    }
    setDetailOpen(false);
  };

  return (
    <section className="rounded-3xl border border-white/40 dark:border-white/15 bg-white/95 dark:bg-[#141414]/88 backdrop-blur-xl overflow-hidden shadow-lg">
      {/* Daily Task Header (No Caption Below Title; Info Opens Pop-up) */}
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Daily Tasks</h2>
          <button
            type="button"
            onClick={() => setShowDailyTasksInfo(true)}
            aria-label="Daily tasks info"
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          {resetCountdown}
        </span>
      </div>

      <InfoPopupModal
        open={showDailyTasksInfo}
        title="Daily Tasks & Schedule"
        subtitle={`${todayDateStr} • ${resetCountdown}`}
        onClose={() => setShowDailyTasksInfo(false)}
      >
        <p className="font-semibold text-zinc-950 dark:text-white">About Daily Tasks &amp; Reset Schedule:</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
          <li><strong className="text-zinc-900 dark:text-white">Task Cadence:</strong> Complete each day&apos;s routine: sleep tracking, training workout, nutrition logging, and daily reflection.</li>
          <li><strong className="text-zinc-900 dark:text-white">Daily Reset:</strong> Active tasks reset every night at 00:00 WIB (UTC+7). Complete submissions before the 23:59 WIB cutoff.</li>
          <li><strong className="text-zinc-900 dark:text-white">Automatic Skip Status:</strong> Any task left incomplete at the end of the day automatically becomes Skipped after 23:59 WIB.</li>
          <li><strong className="text-zinc-900 dark:text-white">Day Navigation:</strong> Select any day chip below to review past submissions or preview upcoming unlocked dates.</li>
        </ul>
      </InfoPopupModal>

      {/* Unified Single Day Selector (Side-by-Side Arrows + Clean Stacked Pill Strip) */}
      <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center gap-2.5">
        <button
          type="button"
          disabled={safeDayIndex <= 0}
          onClick={() => {
            if (safeDayIndex > 0) {
              setSelectedDayId(programDays[safeDayIndex - 1].id);
            }
          }}
          aria-label="Previous day"
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-25 active:scale-95 transition shadow-2xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={stripRef}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex-1 overflow-x-auto no-scrollbar py-0.5 px-1 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="inline-flex items-center gap-1.5 min-w-full">
            {programDays.map((d) => {
              const isActiveSelected = d.id === selectedDay.id;
              const isTodayItem = d.id === day.id;
              const isDoneItem = !!d.userProgress?.isCompleted;
              const isPastItem = !isTodayItem && (d.isPast2359 || d.dayNumber < day.dayNumber);
              const dayTypeWord =
                d.dayType === "TRAINING_DAY"
                  ? "Training"
                  : d.dayType === "REST_DAY"
                    ? "Rest"
                    : "Connect";
              const dateStr = formatDayPillDate(d.unlockDate, d.dayNumber);

              return (
                <button
                  key={d.id}
                  ref={(el) => {
                    buttonRefs.current[d.id] = el;
                  }}
                  type="button"
                  onClick={() => setSelectedDayId(d.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-left transition active:scale-95 select-none flex flex-col items-center justify-center min-w-[76px] ${
                    isActiveSelected
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : isTodayItem
                        ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white border border-zinc-950 dark:border-white"
                        : isDoneItem
                          ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/20"
                          : isPastItem
                            ? "bg-white dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/10"
                            : "bg-zinc-100/60 dark:bg-white/[0.03] text-zinc-400 dark:text-zinc-500 border border-transparent opacity-60"
                  }`}
                >
                  <span className="text-[11px] font-semibold leading-tight inline-flex items-center gap-1">
                    <span>{dateStr}</span>
                    {isDoneItem && <Check className="w-2.5 h-2.5 shrink-0" />}
                  </span>
                  <span className="text-[10px] opacity-75 leading-tight mt-0.5 font-medium">
                    {dayTypeWord}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          disabled={safeDayIndex >= programDays.length - 1}
          onClick={() => {
            if (safeDayIndex < programDays.length - 1) {
              setSelectedDayId(programDays[safeDayIndex + 1].id);
            }
          }}
          aria-label="Next day"
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-25 active:scale-95 transition shadow-2xs shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>

      {/* Image-Backed Daily Task Widgets (Sleep Protocol to Daily Reflection) */}
      <ol className="p-4 sm:p-5 space-y-3.5">
        {tasks.map((t, index) => {
          const isDone = selectedDone[index];
          const TaskIcon = t.Icon;
          return (
            <li
              key={t.title}
              onClick={() => {
                if (!isSelectedFuture && (!locked || isSelectedPast || isDone)) {
                  openDetail(index);
                } else if (!isSelectedFuture && !locked) {
                  openDetail(index);
                }
              }}
              className={`group relative overflow-hidden rounded-2xl border p-4 flex items-center justify-between gap-3 transition ${
                isDone
                  ? "border-zinc-300 dark:border-white/20 bg-zinc-50/70 dark:bg-[#181818]"
                  : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300 dark:hover:border-white/20"
              } ${isSelectedFuture ? "opacity-75" : "cursor-pointer active:scale-[0.99]"}`}
            >
              {/* Right-side Motion-Blur Image with Hardware-Accelerated Fade (0 mask-image) */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${
                    isDone
                      ? "from-zinc-50 via-zinc-50/85 to-transparent dark:from-[#181818] dark:via-[#181818]/85"
                      : "from-white via-white/85 to-transparent dark:from-[#141414] dark:via-[#141414]/85"
                  }`}
                />
              </div>

              <div className="relative z-10 flex items-center gap-3.5 min-w-0 flex-1">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                    isDone
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white"
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : <TaskIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    {t.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                    {t.description}
                  </p>
                </div>
              </div>

              <div className="relative z-10 shrink-0">
                {isSelectedFuture ? (
                  <span className="h-8 px-3 rounded-full bg-zinc-100/90 dark:bg-black/50 border border-zinc-200 dark:border-white/10 text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                ) : isSelectedPast ? (
                  <div className="inline-flex items-center gap-2">
                    {!isDone && (
                      <span className="h-6 px-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 inline-flex items-center">
                        Skipped
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(index);
                      }}
                      className="h-8 px-3.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 active:scale-95 transition inline-flex items-center gap-1"
                    >
                      <span>View</span>
                    </button>
                  </div>
                ) : isDone ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(index);
                    }}
                    className="h-8 px-3.5 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 active:scale-95 transition inline-flex items-center gap-1"
                  >
                    <span>{locked ? "View" : "Edit"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetail(index);
                    }}
                    className={primaryBtn}
                  >
                    Do Task
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* BOTTOM ACTION: CONTEXT-AWARE FOR TODAY / PAST / FUTURE */}
      <div className="p-3.5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
        {isSelectedFuture ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Unlocks on {formatDayDate(selectedDay.unlockDate, selectedDay.dayNumber)} at 00:00 WIB</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className="text-[11px] font-semibold text-zinc-900 dark:text-white underline shrink-0"
            >
              Back to Today
            </button>
          </div>
        ) : isSelectedPast ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
            <span className="inline-flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
              <span>Viewing Day {selectedDay.dayNumber} History (Read-Only)</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDayId(day.id)}
              className="text-[11px] font-semibold text-zinc-900 dark:text-white underline shrink-0"
            >
              Back to Today
            </button>
          </div>
        ) : day.userProgress?.isCompleted ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-white">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-950 dark:text-white" />
              <span>Today&apos;s Routine Completed</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
        ) : allDone ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 flex items-center justify-between text-xs font-medium text-zinc-900 dark:text-white">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-zinc-950 dark:text-white" />
              <span>All daily tasks submitted for today</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">Done</span>
          </div>
        ) : null}
      </div>

      {/* SEAMLESS FULL-SCREEN STEP-BY-STEP TASK DETAIL PORTAL */}
      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] h-[100dvh] w-full bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-hidden"
          >
            <TaskForm
              key={`${selectedDay.id}-${step}`}
              day={selectedDay}
              locked={selectedLocked}
              isPast={isSelectedPast}
              taskTitle={currentTask.title}
              isTaskDone={selectedDone[step]}
              activities={selectedActivities}
              checks={selectedChecks}
              step={step}
              onFinish={handleFinishTask}
              onClose={() => setDetailOpen(false)}
              props={props}
            />
          </div>,
          document.body
        )}
    </section>
  );
}
