"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Angry,
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
  Sun,
  Users,
  Utensils,
  Video,
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

const areaCls =
  "w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition disabled:opacity-50 resize-none";
const primaryBtn =
  "h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";

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

interface MealDraft {
  checkedMeals: string[];
  specialOption: "similar" | "off_track" | null;
  mealsCount: 0 | 1 | 2 | 3;
  mealFeeling: string;
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
        mealFeeling?: string;
      };
      const mealsCount =
        parsed?.mealsCount === 1 || parsed?.mealsCount === 2 || parsed?.mealsCount === 3
          ? parsed.mealsCount
          : 0;
      const mealFeeling = typeof parsed?.mealFeeling === "string" ? parsed.mealFeeling : "";
      if (parsed && parsed.mode === "similar") {
        return { checkedMeals: [], specialOption: "similar", mealsCount, mealFeeling };
      }
      if (parsed && parsed.mode === "off_track") {
        return { checkedMeals: [], specialOption: "off_track", mealsCount, mealFeeling };
      }
      if (parsed && Array.isArray(parsed.checkedMeals)) {
        return { checkedMeals: parsed.checkedMeals, specialOption: null, mealsCount, mealFeeling };
      }
    } catch {
      /* plain text fallback */
    }
  }
  if (compliance === "SIMILAR") return { checkedMeals: [], specialOption: "similar", mealsCount: 0, mealFeeling: "" };
  if (compliance === "OFF_TRACK") return { checkedMeals: [], specialOption: "off_track", mealsCount: 0, mealFeeling: "" };
  if (compliance === "FULL") return { checkedMeals: [...recommended], specialOption: null, mealsCount: 0, mealFeeling: "" };
  return { checkedMeals: [], specialOption: null, mealsCount: 0, mealFeeling: "" };
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

function TaskForm({
  day,
  locked,
  activities,
  checks,
  step,
  onFinish,
  props,
}: {
  day: PlanDay;
  locked: boolean;
  activities: string[];
  checks: string[];
  step: number;
  onFinish: () => void;
  props: DailyCheckInProps;
}) {
  const progress = day.userProgress;
  const wasSleepSkipped = progress?.bedtime === "SKIPPED" || progress?.wakeTime === "SKIPPED";
  const wasMealSkipped = progress?.mealCompliance === "SKIPPED";
  const wasReflectionSkipped = progress?.dailyReflection === "SKIPPED";
  const [bed, setBed] = useState(progress?.bedtime === "SKIPPED" ? "" : progress?.bedtime || "");
  const [wake, setWake] = useState(progress?.wakeTime === "SKIPPED" ? "" : progress?.wakeTime || "");
  const [sleepFeeling, setSleepFeeling] = useState<string>(() => {
    const raw = progress?.assessmentResponse || "";
    const match = raw.match(/Sleep Feeling:\s*(.+)/i);
    return match ? match[1].trim() : "";
  });
  const [workout, setWorkout] = useState(progress?.selectedWorkout === "SKIPPED" ? "" : progress?.selectedWorkout || "");
  const [editingRep, setEditingRep] = useState<{ name: string; value: string } | null>(null);
  const [trainingEntered, setTrainingEntered] = useState(
    Boolean(progress?.selectedWorkout && progress.selectedWorkout !== "SKIPPED")
  );
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
    if (fb === "SKIPPED") return null;
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
  const [skipJournal, setSkipJournal] = useState(
    () => progress?.dailyReflection === "Skipped reflection journal today."
  );
  const [review, setReview] = useState(
    progress?.dailyReflection === "Skipped reflection journal today." || progress?.dailyReflection === "SKIPPED"
      ? ""
      : progress?.dailyReflection || ""
  );
  const [score, setScore] = useState(
    progress?.dailyReflection === "SKIPPED" ? 0 : progress?.happinessRate ? Math.min(5, progress.happinessRate) : 0
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipConfirmOpen, setSkipConfirmOpen] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [localChecks, setLocalChecks] = useState(checks);

  useEffect(() => {
    setLocalChecks(checks);
  }, [checks]);

  const tasks = useMemo(() => getTasksForDay(day.dayType), [day.dayType]);
  const currentTaskInfo = tasks[step] || tasks[0];

  const isTraining = day.dayType === "TRAINING_DAY";
  const isRest = day.dayType === "REST_DAY";
  const isConnect = !isTraining && !isRest;

  const restLines = useMemo(() => parseLines(day.restInstructions), [day.restInstructions]);
  const videos = useMemo(() => parseDayVideoLinks(day.videoUrl), [day.videoUrl]);
  const groups = useMemo(() => {
    if (!isTraining) return [];
    return parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  }, [isTraining, day.workoutOptions, day.videoChecklist]);

  // Require explicit choice when multiple training groups exist
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

  // Dynamic video mapped to selected option
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

  const handleClickWorkoutOption = async (optionName: string) => {
    if (locked) {
      if (!workout) setWorkout(optionName);
      setTrainingEntered(true);
      return;
    }
    if (optionName === workout) {
      setTrainingEntered(true);
      return;
    }
    if (workout && checkedCount > 0) {
      setPendingSwitchWorkout(optionName);
      return;
    }
    setWorkout(optionName);
    setLocalChecks([]);
    setTrainingEntered(true);
    await props.onSelectWorkout(optionName, day.id, true);
  };

  const confirmSwitchWorkout = async () => {
    if (!pendingSwitchWorkout) return;
    const nextOpt = pendingSwitchWorkout;
    setPendingSwitchWorkout(null);
    setWorkout(nextOpt);
    setLocalChecks([]);
    setTrainingEntered(true);
    await props.onSelectWorkout(nextOpt, day.id, true);
  };

  const isSleepValid = Boolean(bed && wake && sleepFeeling);
  const isTrainingValid = isConnect
    ? notes.trim().length > 0
    : isRest
      ? movements.length === 0 || movements.every(isChecked)
      : hasMultipleOptions
        ? Boolean(activeWorkout) && (movements.length === 0 || movements.every(isChecked))
        : movements.length === 0 || movements.every(isChecked);
  const isMealValid =
    (mealDraft.checkedMeals.length > 0 || mealDraft.specialOption !== null) &&
    mealDraft.mealsCount > 0 &&
    Boolean(mealDraft.mealFeeling);
  const isReflectionValid = (skipJournal || review.trim().length >= 3) && score > 0;

  const valid = [isSleepValid, isTrainingValid, isMealValid, isReflectionValid];

  const getValidationError = (currentStep: number): string | null => {
    if (currentStep === 0) {
      if (!bed && !wake) return "Please enter both bedtime and wake time.";
      if (!bed) return "Please enter your bedtime.";
      if (!wake) return "Please enter your wake time.";
      if (!sleepFeeling) return "Please select how you feel after waking up.";
      return null;
    }
    if (currentStep === 1) {
      if (isConnect) {
        if (!connectAttendance) return "Please indicate whether you will attend this session.";
        if (connectAttendance === "attend" && connectRating === 0) {
          return "Please rate your experience from 1 to 5 stars.";
        }
        return null;
      }
      if (isTraining) {
        if (hasMultipleOptions && !activeWorkout) return "Please select a training routine first.";
        if (movements.length > 0 && !movements.every(isChecked)) {
          return `Please complete all exercises (${movements.length - checkedCount} remaining).`;
        }
        if (!photos.before && !photos.after) {
          return "Please upload at least one progress photo (Before or After session).";
        }
        if (!trainingFeeling) {
          return "Please select how you feel after completing the training.";
        }
        return null;
      }
      if (movements.length > 0 && !movements.every(isChecked)) {
        return `Please complete all recovery items (${movements.length - checkedCount} remaining).`;
      }
      return null;
    }
    if (currentStep === 2) {
      if (mealDraft.checkedMeals.length === 0 && !mealDraft.specialOption) {
        return "Please check at least one meal or select an alternative option.";
      }
      if (!mealDraft.mealsCount) {
        return "Please select how many meals you ate today (1, 2, or 3).";
      }
      if (!mealDraft.mealFeeling) {
        return "Please select how you feel after your meals.";
      }
      return null;
    }
    if (currentStep === 3) {
      if (!skipJournal && review.trim().length < 3) {
        return "Please select a journal reflection or write a brief note.";
      }
      if (!score) return "Please select your daily energy & mood rating.";
      return null;
    }
    return null;
  };

  const persist = async () => {
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
      if (activeWorkout) {
        await props.onSelectWorkout(activeWorkout, day.id, false);
      }
      // Always save workout notes so training progress is recorded and persisted to database
      const finalNotes = trainingFeeling ? `Feeling: ${trainingFeeling} · ${notes}`.trim() : notes.trim() || (activeWorkout ? `Completed: ${activeWorkout}` : "Completed training session");
      return (await props.onSaveWorkoutNotes(finalNotes, day.id)) !== false;
    }
    if (step === 2) {
      const mealPayload = {
        v: 3,
        mode:
          mealDraft.specialOption === "similar"
            ? "similar"
            : mealDraft.specialOption === "off_track"
              ? "off_track"
              : "checklist",
        checkedMeals: mealDraft.checkedMeals,
        mealsCount: mealDraft.mealsCount,
        mealFeeling: mealDraft.mealFeeling,
      };
      if (mealDraft.specialOption === "similar") {
        return (await props.onSaveMeal("SIMILAR", JSON.stringify(mealPayload), day.id)) !== false;
      }
      if (mealDraft.specialOption === "off_track") {
        return (await props.onSaveMeal("OFF_TRACK", JSON.stringify(mealPayload), day.id)) !== false;
      }
      const allDone = mealDraft.checkedMeals.length === recommendedMeals.length;
      return (
        (await props.onSaveMeal(
          allDone ? "FULL" : "PARTIAL",
          JSON.stringify(mealPayload),
          day.id
        )) !== false
      );
    }
    const savedReview = skipJournal ? "Skipped reflection journal today." : review.trim();
    return (await props.onSaveReflection(savedReview, score || 3, day.id)) !== false;
  };

  const handleSave = async () => {
    if (locked || busy) return;
    const err = getValidationError(step);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await persist();
      if (!ok) {
        setError("Could not submit entry. Please try again.");
        return;
      }
      onFinish();
    } catch {
      setError("Could not submit entry. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSkipClick = () => {
    setError(null);
    setSkipConfirmOpen(true);
  };

  const handleSkipTask = async () => {
    if (locked || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (step === 0) {
        await props.onSaveSleep("SKIPPED", "SKIPPED", 0, day.id);
      } else if (step === 1) {
        if (isConnect) {
          await props.onSaveAttendance("SKIPPED", day.id);
        } else {
          if (hasMultipleOptions) {
            await props.onSelectWorkout("SKIPPED", day.id, true);
          }
          await props.onSaveWorkoutNotes("SKIPPED", day.id);
        }
      } else if (step === 2) {
        await props.onSaveMeal(
          "SKIPPED",
          JSON.stringify({ v: 2, mode: "skipped", checkedMeals: [] }),
          day.id
        );
      } else if (step === 3) {
        await props.onSaveReflection("SKIPPED", 3, day.id);
      }
      setSkipConfirmOpen(false);
      onFinish();
    } catch {
      setError("Failed to skip task. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitClick = () => {
    const err = getValidationError(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitConfirmOpen(true);
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
    const parts = entry.split("=");
    const parsed = parseInt(parts[1], 10);
    return isNaN(parsed) ? defaultTarget : parsed;
  };

  const updateMovementReps = async (name: string, reps: number) => {
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
            const stripped = lowerRaw.slice(expectedPrefix.length).trim();
            match = stripped === cleanTarget;
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

    if (!found) {
      updated.push(newEntry);
    }

    setLocalChecks(updated);
    await props.onToggleCheck(newEntry, day.id, true);
  };

  const toggle = async (name: string, defaultReps?: number) => {
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
    await props.onToggleCheck(alreadyChecked ? scoped : scopedWithReps, day.id);
  };

  const totalSleepMins = bed && wake ? sleepMinutes(bed, wake) : 0;
  const sleepQuality = totalSleepMins > 0 ? sleepQualityLabel(totalSleepMins) : null;

  return (
    <div key={step} className="space-y-4">
      {/* ===================================================================== */}
      {/* STEP 0: SLEEP PROTOCOL (FLAT SHEET SECTIONS, NO NESTED BOXES)         */}
      {/* ===================================================================== */}
      {step === 0 && (
        <div className="space-y-6">
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-l-2 border-zinc-300 dark:border-white/25 pl-3.5">
            {day.sleepRecommendation || "Target 7.5 to 9 hours of restorative circadian sleep."}
          </p>

          {wasSleepSkipped && !bed && !wake && (
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Previously skipped — select real sleep times below if you want to record today&apos;s rest.
            </p>
          )}

          <div className="divide-y divide-zinc-200/90 dark:divide-white/10">
            {/* Bedtime Row & Presets */}
            <div className="py-5 first:pt-1 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor="input-bedtime" className="text-xs font-semibold text-zinc-950 dark:text-white block">
                    Bedtime
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">Time you went to sleep</span>
                </div>
                <input
                  id="input-bedtime"
                  type="time"
                  value={bed}
                  disabled={locked}
                  onChange={(e) => setBed(e.target.value)}
                  aria-label="Enter bedtime"
                  className="w-36 h-10 px-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm font-mono font-semibold text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition text-center shrink-0"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {BEDTIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={locked}
                    onClick={() => setBed(t)}
                    className={`h-8 sm:h-9 px-2 rounded-lg text-xs font-mono font-medium transition active:scale-95 text-center ${
                      bed === t
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                        : "bg-zinc-100/80 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Wake Time Row & Presets */}
            <div className="py-5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor="input-waketime" className="text-xs font-semibold text-zinc-950 dark:text-white block">
                    Wake Time
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5">Time you woke up</span>
                </div>
                <input
                  id="input-waketime"
                  type="time"
                  value={wake}
                  disabled={locked}
                  onChange={(e) => setWake(e.target.value)}
                  aria-label="Enter wake time"
                  className="w-36 h-10 px-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm font-mono font-semibold text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition text-center shrink-0"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {WAKETIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={locked}
                    onClick={() => setWake(t)}
                    className={`h-8 sm:h-9 px-2 rounded-lg text-xs font-mono font-medium transition active:scale-95 text-center ${
                      wake === t
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                        : "bg-zinc-100/80 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Recorded Summary Row */}
            {totalSleepMins > 0 && (
              <div className="py-5 flex items-center justify-between gap-3 text-xs">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Recorded Rest</span>
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

            {/* Post-Sleep Mood Check (Always Bottom) */}
            <div className="py-5 space-y-3">
              <div>
                <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                  How do you feel after waking up?
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                  Select the morning condition that best describes your rest
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {SLEEP_FEELINGS.map((item) => {
                  const active = sleepFeeling === item.label;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={locked}
                      onClick={() => setSleepFeeling(item.label)}
                      className={`w-full p-3.5 rounded-xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1A: TRAINING DAY (SCREEN 1: CHOOSE -> SCREEN 2: ROUTINE)         */}
      {/* ===================================================================== */}
      {step === 1 && isTraining && (
        <div className="space-y-4">
          {groups.length > 0 && !trainingEntered ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-200/60 dark:border-white/10">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                  Training Options
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {groups.length} {groups.length === 1 ? "Option" : "Options"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      onClick={() => handleClickWorkoutOption(g.optionName)}
                      className={`relative w-full h-36 rounded-2xl overflow-hidden text-left transition active:scale-[0.98] group ${
                        isSelected
                          ? "ring-2 ring-zinc-950 dark:ring-white shadow-md"
                          : "ring-1 ring-zinc-900/10 dark:ring-white/15 hover:ring-zinc-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl}
                        alt={g.optionName}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

                      <div className="relative z-10 h-full p-4 flex items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-white tracking-tight leading-snug drop-shadow-sm truncate">
                            {g.optionName}
                          </p>
                          <p className="text-xs font-medium text-white/80 mt-1 drop-shadow-xs">
                            {g.movements.length} {g.movements.length === 1 ? "Assessment" : "Assessments"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition ${
                            isSelected
                              ? "bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 font-bold"
                              : "bg-white/20 hover:bg-white text-white hover:text-zinc-950 backdrop-blur-md"
                          }`}
                        >
                          <span>{isSelected ? "Selected" : "Select"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* SCREEN 2: WORKOUT DETAIL & CHECKLIST */
            <div className="space-y-4">
              {groups.length > 0 && (
                <div className="flex items-center justify-between gap-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setTrainingEntered(false)}
                    aria-label="Back to options"
                    className="h-8 px-3 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5 text-xs font-medium active:scale-95 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>All Options</span>
                  </button>
                  {activeWorkout && (
                    <span className="text-xs font-semibold text-zinc-950 dark:text-white truncate">
                      {activeWorkout}
                    </span>
                  )}
                </div>
              )}

              {/* 1. LARGE VIDEO THUMBNAIL ON TOP WITH LINK BUTTON */}
              {activeVideo && (() => {
                const safeVideoUrl = safeHttpUrl(activeVideo.url);
                return (
                <div className="space-y-2.5">
                  <div className="relative w-full aspect-video sm:h-56 rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200/50 dark:border-white/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {safeVideoUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center">
                        <a
                          href={safeVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => props.onOpenVideo(day.id)}
                          className="w-12 h-12 rounded-full bg-white/95 text-zinc-950 flex items-center justify-center shadow-lg active:scale-95 hover:scale-110 transition-transform"
                        >
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </a>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-semibold truncate drop-shadow-sm">{activeVideo.title}</p>
                      <p className="text-[11px] text-white/80">Guided training movement cues</p>
                    </div>
                  </div>

                  {safeVideoUrl && (
                    <a
                      href={safeVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => props.onOpenVideo(day.id)}
                      className="w-full h-10 px-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-2 transition active:scale-[0.99]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Video Session</span>
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </a>
                  )}
                </div>
                );
              })()}

              {/* 2. PROGRESS BAR DIRECTLY UNDERNEATH */}
              {movements.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      Movement Checklist
                    </span>
                    <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {checkedCount} / {movements.length} Completed ({movements.length > 0 ? Math.round((checkedCount / movements.length) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-300"
                      style={{ width: `${movements.length > 0 ? Math.round((checkedCount / movements.length) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 3. CHECKLIST (SPACIOUS, ALWAYS-INTERACTIVE REP STEPPER & TARGET COMPARISON) */}
              {movements.length > 0 && (
                <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                  {movements.map((name) => {
                    const checked = isChecked(name);
                    const moveObj = selectedGroup?.movements.find((m) => m.name === name);
                    const targetLabel = moveObj?.target;
                    const targetReps = parseTargetReps(targetLabel);
                    const currentReps = getMovementReps(name, targetReps);
                    const isEditing = editingRep?.name === name;

                    return (
                      <div
                        key={name}
                        className="py-3.5 px-1 transition hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <label className="flex items-start gap-3 min-w-0 cursor-pointer select-none flex-1">
                            <input
                              type="checkbox"
                              disabled={locked}
                              checked={checked}
                              onChange={() => toggle(name, currentReps)}
                              className="w-4 h-4 mt-0.5 rounded border-zinc-300 dark:border-white/20 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                            />
                            <div className="min-w-0">
                              <span
                                className={`text-xs sm:text-sm leading-relaxed block transition ${
                                  checked
                                    ? "line-through text-zinc-400 dark:text-zinc-500"
                                    : "font-medium text-zinc-900 dark:text-white"
                                }`}
                              >
                                {name}
                              </span>
                              {targetLabel && (
                                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block mt-0.5">
                                  Target: {targetLabel}
                                </span>
                              )}
                            </div>
                          </label>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              disabled={locked || currentReps <= 1}
                              onClick={() => {
                                setEditingRep(null);
                                void updateMovementReps(name, Math.max(1, currentReps - 1));
                              }}
                              aria-label={`Decrease reps for ${name}`}
                              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200/80 dark:border-white/10"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              inputMode="numeric"
                              disabled={locked}
                              aria-label={`Reps for ${name}`}
                              value={isEditing ? editingRep.value : String(currentReps)}
                              onFocus={() => setEditingRep({ name, value: String(currentReps) })}
                              onChange={(e) => setEditingRep({ name, value: e.target.value })}
                              onBlur={() => {
                                const parsed = parseInt(editingRep?.value || "", 10);
                                setEditingRep(null);
                                if (!isNaN(parsed) && parsed >= 1) {
                                  void updateMovementReps(name, parsed);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  (e.currentTarget as HTMLInputElement).blur();
                                }
                              }}
                              className="w-12 h-8 text-center text-xs font-mono font-semibold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-white/5 border border-zinc-200/90 dark:border-white/15 rounded-lg outline-none focus:border-zinc-950 dark:focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              disabled={locked || currentReps >= 999}
                              onClick={() => {
                                setEditingRep(null);
                                void updateMovementReps(name, Math.min(999, currentReps + 1));
                              }}
                              aria-label={`Increase reps for ${name}`}
                              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 active:scale-95 border border-zinc-200/80 dark:border-white/10"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {checked && targetLabel && (
                          <div className="mt-2 ml-7 flex items-center gap-2">
                            {currentReps === targetReps ? (
                              <span className="text-[10px] font-mono font-semibold text-zinc-950 dark:text-white bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-2 py-0.5 rounded-full">
                                Target Met ({targetReps} reps)
                              </span>
                            ) : currentReps < targetReps ? (
                              <span className="text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 px-2 py-0.5 rounded-full">
                                {currentReps} of {targetReps} reps completed (Target: {targetLabel})
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-semibold text-zinc-950 dark:text-white bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 px-2 py-0.5 rounded-full">
                                Exceeded target by +{currentReps - targetReps} reps
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. UPLOAD PHOTO (MAX 5 MB) */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                    Progress Photos
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Max 5 MB each (Required)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(["before", "after"] as const).map((type) => (
                    <label key={type} className="block text-[11px] text-zinc-500 cursor-pointer">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        {type === "before" ? "Before Session" : "After Session"}
                      </span>
                      <span className="relative flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition">
                        {photos[type] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photos[type]} alt="" className="w-full h-full object-cover" />
                            {!locked && (
                              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-medium">
                                Change
                              </span>
                            )}
                          </>
                        ) : photoBusy === type ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                            <Camera className="w-4 h-4" /> Upload Photo
                          </span>
                        )}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={locked || photoBusy !== null}
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) pickPhoto(type, file);
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* 5. FEELING AFTER TRAINING (5 MOOD CHOICES) */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-white/10">
                <div>
                  <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                    Feeling After Training
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Select how your body feels after completing this session (Required)</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Energized", desc: "High vitality, powerful and moved with ease" },
                    { label: "Accomplished", desc: "Challenging workout, pushed through with solid technique" },
                    { label: "Balanced", desc: "Steady pace, good body control and regulated breath" },
                    { label: "Fatigued", desc: "Challenging effort, muscles feeling worked and tired" },
                    { label: "Strained", desc: "Felt physical tension or stiffness, prioritized safety" },
                  ].map((item) => {
                    const active = trainingFeeling === item.label;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        disabled={locked}
                        onClick={() => setTrainingFeeling(item.label)}
                        className={`w-full p-3 rounded-xl border text-left transition select-none ${
                          active
                            ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                            : "border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <p className={`text-xs font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                          {item.label}
                        </p>
                        <p className={`text-[11px] mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VALIDATION MODAL FOR SWITCHING WORKOUT VARIATION */}
          {pendingSwitchWorkout && (
            <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Change Training Variation?
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Switching from <strong className="text-zinc-800 dark:text-zinc-200">{workout}</strong> to{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200">{pendingSwitchWorkout}</strong> will reset and clear the{" "}
                      <strong>{checkedCount}</strong> checked movement(s) in your current checklist.
                    </p>
                  </div>
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
                    onClick={confirmSwitchWorkout}
                    className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold transition active:scale-95"
                  >
                    Switch &amp; Enter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1B: REST & RECOVERY DAY (FLAT SHEET ROWS)                        */}
      {/* ===================================================================== */}
      {step === 1 && isRest && (
        <div className="space-y-5">
          <div className="border-l-2 border-zinc-300 dark:border-white/25 pl-3.5 space-y-1">
            <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
              Active Recovery Protocol
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Focus on parasympathetic down-regulation, tissue hydration, and light mobility.
            </p>
          </div>

          {restLines.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                Rest &amp; Mobility Checklist
              </span>
              <ul className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                {restLines.map((line, idx) => {
                  const checked = isChecked(line);
                  return (
                    <li key={idx}>
                      <label className="flex items-start gap-3 py-3.5 px-1 cursor-pointer transition select-none hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={checked}
                          onChange={() => toggle(line)}
                          className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5 accent-zinc-950 dark:accent-white"
                        />
                        <span
                          className={`text-xs sm:text-sm leading-relaxed ${
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1C: COMMUNITY / MEETUP DAY (FLAT SHEET SECTIONS)                 */}
      {/* ===================================================================== */}
      {step === 1 && isConnect && (
        <div className="space-y-5">
          {/* SESSION OVERVIEW SECTION */}
          <div className="pb-5 border-b border-zinc-100 dark:border-white/10 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                {day.meetupLink ? "Online Zoom Session" : day.onsiteVenue ? "Onsite Gathering" : "Community Session"}
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {day.onsiteSchedule || "Live Session"}
              </span>
            </div>

            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                {day.eventTitle || "Community Connect & Discussion"}
              </h3>
              {day.eventDetails && (
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {day.eventDetails}
                </p>
              )}
            </div>

            {/* If Online: Zoom Meeting Link */}
            {safeHttpUrl(day.meetupLink) && (
              <div className="pt-1 space-y-1.5">
                <a
                  href={safeHttpUrl(day.meetupLink)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Zoom Meeting</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* If Onsite: Address, Schedule, Host & Map */}
            {day.onsiteVenue && (
              <div className="pt-2 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Venue &amp; Location
                  </span>
                  <p className="font-semibold text-zinc-900 dark:text-white mt-0.5">
                    {day.onsiteVenue}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Date &amp; Time
                    </span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {day.onsiteSchedule || "Check cohort calendar"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Meet With (Host)
                    </span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {day.eventHost || day.coachName || "Coach & Community Lead"}
                    </p>
                  </div>
                </div>

                {safeHttpUrl(day.mapLink) && (
                  <a
                    href={safeHttpUrl(day.mapLink)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-white hover:underline pt-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Open Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ATTENDANCE SELECTION (ATTEND OR NOT) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
              Will you attend this session?
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={locked}
                onClick={() => setConnectAttendance("attend")}
                className={`h-11 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 select-none ${
                  connectAttendance === "attend"
                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>I Will Attend</span>
              </button>

              <button
                type="button"
                disabled={locked}
                onClick={() => setConnectAttendance("cannot_attend")}
                className={`h-11 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 select-none ${
                  connectAttendance === "cannot_attend"
                    ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                }`}
              >
                <span>Cannot Attend</span>
              </button>
            </div>
          </div>

          {/* 1-5 STAR RATING (EXPERIENCE) */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
            <div>
              <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                Session Experience Rating
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">Rate your overall takeaway and experience (1 to 5 Stars)</p>
            </div>

            <div className="flex items-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= connectRating;
                return (
                  <button
                    key={star}
                    type="button"
                    disabled={locked}
                    onClick={() => setConnectRating(star)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
                    aria-label={`${star} Stars`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        filled
                          ? "fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white"
                          : "text-zinc-300 dark:text-zinc-700"
                      }`}
                    />
                  </button>
                );
              })}
              {connectRating > 0 && (
                <span className="text-xs font-mono font-semibold ml-2 text-zinc-800 dark:text-zinc-200">
                  {connectRating} of 5 Stars
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: NUTRITION & MEAL (UNIFIED CHECKLIST + MEAL COUNT + POST MOOD) */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="space-y-6">
          {wasMealSkipped && mealDraft.checkedMeals.length === 0 && !mealDraft.specialOption && (
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Previously skipped — check off your meals or select an option below to update today&apos;s log.
            </p>
          )}

          {/* Unified Recommended Meals + Overall Alternatives Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                Today&apos;s Recommended Meals &amp; Status
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {mealDraft.specialOption === "similar"
                  ? "Similar food"
                  : mealDraft.specialOption === "off_track"
                    ? "Off plan"
                    : `${mealDraft.checkedMeals.length} / ${recommendedMeals.length} checked`}
              </span>
            </div>

            <ul className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
              {recommendedMeals.map((mealLine, idx) => {
                const checked = mealDraft.checkedMeals.includes(mealLine);
                const cleanDescription = stripMealLabelPrefix(mealLine);
                return (
                  <li key={idx}>
                    <label className="flex items-start gap-3.5 py-4 px-1 cursor-pointer transition select-none hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={checked}
                        onChange={() => {
                          setMealDraft((prev) => {
                            const nextChecked = prev.checkedMeals.includes(mealLine)
                              ? prev.checkedMeals.filter((m) => m !== mealLine)
                              : [...prev.checkedMeals, mealLine];
                            return {
                              ...prev,
                              checkedMeals: nextChecked,
                              specialOption: null,
                            };
                          });
                        }}
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5 accent-zinc-950 dark:accent-white"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-semibold">
                          Meal {idx + 1}
                        </span>
                        <p
                          className={`text-xs sm:text-sm mt-0.5 leading-relaxed ${
                            checked
                              ? "font-semibold text-zinc-950 dark:text-white"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {cleanDescription || mealLine}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}

              <li>
                <label className="flex items-start gap-3.5 py-4 px-1 cursor-pointer transition select-none hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={mealDraft.specialOption === "similar"}
                    onChange={() => {
                      setMealDraft((prev) => ({
                        ...prev,
                        checkedMeals: [],
                        specialOption: prev.specialOption === "similar" ? null : "similar",
                      }));
                    }}
                    className="w-4 h-4 rounded border-zinc-300 shrink-0 mt-0.5 accent-zinc-950 dark:accent-white"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-semibold">
                      Alternative
                    </span>
                    <p
                      className={`text-xs sm:text-sm mt-0.5 leading-relaxed ${
                        mealDraft.specialOption === "similar"
                          ? "font-semibold text-zinc-950 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Ate similar food portion &amp; nutrition as recommended
                    </p>
                  </div>
                </label>
              </li>

              <li>
                <label className="flex items-start gap-3.5 py-4 px-1 cursor-pointer transition select-none hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={mealDraft.specialOption === "off_track"}
                    onChange={() => {
                      setMealDraft((prev) => ({
                        ...prev,
                        checkedMeals: [],
                        specialOption: prev.specialOption === "off_track" ? null : "off_track",
                      }));
                    }}
                    className="w-4 h-4 rounded border-zinc-300 shrink-0 mt-0.5 accent-zinc-950 dark:accent-white"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-semibold">
                      Off Plan
                    </span>
                    <p
                      className={`text-xs sm:text-sm mt-0.5 leading-relaxed ${
                        mealDraft.specialOption === "off_track"
                          ? "font-semibold text-zinc-950 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Did not follow meal recommendations today
                    </p>
                  </div>
                </label>
              </li>
            </ul>
          </div>

          {/* Number of Meals Eaten Today (1, 2, 3 Times) */}
          <div className="pt-2 space-y-3">
            <div>
              <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                Meals Eaten Today
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                How many full meals did you have today?
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {([1, 2, 3] as const).map((count) => {
                const active = mealDraft.mealsCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      setMealDraft((prev) => ({
                        ...prev,
                        mealsCount: count,
                      }))
                    }
                    className={`py-3 px-2 rounded-xl border text-center transition active:scale-95 ${
                      active
                        ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                        : "border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <span className="block text-base font-mono font-bold tabular-nums leading-none">
                      {count}
                    </span>
                    <span
                      className={`block text-[10px] font-mono uppercase tracking-wider mt-1 ${
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

          {/* Post-Meal Mood Check (Always Bottom) */}
          <div className="pt-4 border-t border-zinc-200/90 dark:border-white/10 space-y-3">
            <div>
              <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                How do you feel after your meals?
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Select the post-meal state that matches your digestion &amp; energy
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {MEAL_FEELINGS.map((item) => {
                const active = mealDraft.mealFeeling === item.label;
                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      setMealDraft((prev) => ({
                        ...prev,
                        mealFeeling: item.label,
                      }))
                    }
                    className={`w-full p-3.5 rounded-xl border text-left transition select-none ${
                      active
                        ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                        : "border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                      {item.label}
                    </p>
                    <p className={`text-[11px] mt-0.5 ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                      {item.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: DAILY REFLECTION (JOURNAL FIRST, MOOD RATING ALWAYS BOTTOM)   */}
      {/* ===================================================================== */}
      {step === 3 && (
        <div className="space-y-6">
          {wasReflectionSkipped && !skipJournal && !review && score === 0 && (
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              Previously skipped — log a brief reflection and select your mood rating below to update today&apos;s entry.
            </p>
          )}

          {day.dailyAssessment && (
            <div className="border-l-2 border-zinc-300 dark:border-white/25 pl-3.5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                Today&apos;s Focus Prompt
              </span>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {day.dailyAssessment}
              </p>
            </div>
          )}

          {/* Option: Prefer not to write journal today */}
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50/60 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={locked}
              checked={skipJournal}
              onChange={(e) => {
                setSkipJournal(e.target.checked);
              }}
              className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 accent-zinc-950 dark:accent-white"
            />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              I prefer not to write a journal today
            </span>
          </label>

          {!skipJournal ? (
            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                  Daily Journal
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Select a reflection prompt or write your personal thoughts below
                </p>
              </div>

              {/* 5 JOURNAL OPTIONS (CLEAN NEGATIVE SPACE) */}
              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    title: "Energized & Motivated",
                    text: "High focus and vitality. Accomplished my daily goals and feel strong momentum.",
                  },
                  {
                    title: "Calm & Centered",
                    text: "Maintained good emotional balance, mental peace, and grounded focus throughout.",
                  },
                  {
                    title: "Steady & Disciplined",
                    text: "Consistent moderate energy. Stayed committed to the routine through steady discipline.",
                  },
                  {
                    title: "Tired but Grateful",
                    text: "Low physical battery by evening. Grateful for progress made, taking time to rest and recharge.",
                  },
                  {
                    title: "Challenged & Stressed",
                    text: "Faced physical fatigue or mental stress today. Prioritizing slow recovery, breathwork, and early sleep.",
                  },
                ].map((item) => {
                  const val = `${item.title}: ${item.text}`;
                  const active = review === val;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      disabled={locked}
                      onClick={() => setReview(val)}
                      className={`w-full p-3.5 rounded-xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/15 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <p className={`text-xs font-semibold ${active ? "text-white dark:text-zinc-950" : "text-zinc-950 dark:text-white"}`}>
                        {item.title}
                      </p>
                      <p className={`text-[11px] mt-0.5 leading-relaxed ${active ? "text-white/80 dark:text-zinc-950/80" : "text-zinc-500 dark:text-zinc-400"}`}>
                        {item.text}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="pt-1">
                <textarea
                  value={review}
                  disabled={locked}
                  onChange={(e) => setReview(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="Or customize / type your personal thoughts here..."
                  className={areaCls}
                />
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/5 text-xs text-zinc-500 font-mono">
              Reflection journal entry skipped for today.
            </div>
          )}

          {/* Daily Mood & Energy Rating (Always Bottom) */}
          <div className="pt-4 border-t border-zinc-200/90 dark:border-white/10 space-y-3">
            <div>
              <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                How is your overall mood &amp; energy today?
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                Rate how you feel overall at the end of today
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Satisfaction Rating">
              {FACES.map(({ score: n, Icon, label }) => {
                const active = score === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={label}
                    disabled={locked}
                    onClick={() => setScore(n)}
                    className={`py-3 px-1 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition active:scale-95 ${
                      active
                        ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm"
                        : "border-zinc-200 dark:border-white/15 bg-zinc-50/60 dark:bg-white/5 text-zinc-500 hover:border-zinc-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                    <span className="text-[10px] font-mono font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}

      {/* SUBMIT & SKIP BUTTONS (HIDDEN ON TRAINING SELECTION SCREEN) */}
      {!(step === 1 && isTraining && groups.length > 0 && !trainingEntered) && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/10 gap-2">
          {locked ? (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-zinc-400 inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>View-only history record</span>
              </span>
              <button
                type="button"
                onClick={onFinish}
                className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={onSkipClick}
                className="h-10 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95 transition"
              >
                Skip
              </button>

              <button
                type="button"
                disabled={busy || photoBusy !== null}
                onClick={onSubmitClick}
                className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 active:scale-95 transition disabled:opacity-40 shadow-sm"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Submit</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* SKIP VALIDATION / CONFIRMATION MODAL */}
      {skipConfirmOpen && (
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Skip This Task?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Skip {currentTaskInfo.title} for today?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSkipConfirmOpen(false)}
                className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSkipTask}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition active:scale-95 inline-flex items-center justify-center gap-1.5"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Skip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      {submitConfirmOpen && (
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Submit Task Entry?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Confirm and submit your entry for {currentTaskInfo.title}.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(false)}
                className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setSubmitConfirmOpen(false);
                  await handleSave();
                }}
                className="h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold transition active:scale-95 inline-flex items-center gap-1.5"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm &amp; Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
  const sleepDone = (!!p?.bedtime && !!p?.wakeTime) || p?.bedtime === "SKIPPED";
  const activityDone =
    d.dayType === "TRAINING_DAY"
      ? !!p?.videoWatched ||
        !!p?.isCompleted ||
        !!p?.workoutNotes ||
        !!p?.selectedWorkout ||
        (acts.length > 0 && acts.every((name) => chks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : d.dayType === "REST_DAY"
        ? acts.length > 0
          ? acts.every((name) => chks.includes(name))
          : !!p?.isCompleted || p?.workoutNotes === "SKIPPED" || p?.checklistCompleted === "SKIPPED"
        : !!p?.eventFeedback || !!p?.isCompleted || p?.eventFeedback === "SKIPPED" || p?.workoutNotes === "SKIPPED";
  return [sleepDone, activityDone, !!p?.mealCompliance, !!p?.dailyReflection];
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
  useEffect(() => {
    setResetCountdown(getWibResetCountdown());
    const interval = setInterval(() => {
      setResetCountdown(getWibResetCountdown());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [detailOpen, setDetailOpen] = useState(false);
  const [taskDetailHeaderVisible, setTaskDetailHeaderVisible] = useState(true);
  const taskDetailScrollYRef = useRef(0);

  const handleTaskDetailScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > taskDetailScrollYRef.current && currentScrollY > 40) {
      setTaskDetailHeaderVisible(false);
    } else {
      setTaskDetailHeaderVisible(true);
    }
    taskDetailScrollYRef.current = currentScrollY;
  };
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
  const CurrentTaskIcon = currentTask.Icon;
  const allDone = done.every(Boolean);

  const handleFinishTask = () => {
    if (isSelectedToday && !locked) {
      markDone(step);
    }
    setDetailOpen(false);
  };

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden">
      {/* Daily Task Header (No Caption Below Title; Info Opens Pop-up) */}
      <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
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
          <li><strong className="text-zinc-900 dark:text-white">Skipping Tasks:</strong> If you cannot finish a task today, tap &quot;Skip&quot; to clear your pending queue cleanly.</li>
          <li><strong className="text-zinc-900 dark:text-white">Day Navigation:</strong> Select any day chip below to review past submissions or preview upcoming unlocked dates.</li>
        </ul>
      </InfoPopupModal>

      {/* Unified Single Day Selector (Side-by-Side Arrows + Clean Stacked Pill Strip) */}
      <div className="px-3 py-3 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] flex items-center gap-2">
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
      <ol className="p-3.5 space-y-2.5">
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

      {/* TASK DETAIL FULL-SCREEN MODAL WITH IMAGE BANNER & CURVED BORDER SECTION */}
      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onScroll={handleTaskDetailScroll}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
          >
            {/* FLOATING HEADER: BACK BUTTON + COMMUNITY/CONCIERGE BUTTON (TEXT ONLY, NO ICON) */}
            <header
              style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              className={`fixed left-1/2 -translate-x-1/2 z-[90] w-[94%] max-w-xl flex items-center justify-between pointer-events-none transition-all duration-300 ${
                taskDetailHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
              }`}
            >
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="pointer-events-auto h-8 px-3.5 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide inline-flex items-center gap-1.5 shadow-md active:scale-95 transition hover:bg-black/80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <a
                href={
                  (props.communityLink ? safeHttpUrl(props.communityLink) : null) ||
                  `https://wa.me/6281290002026?text=${encodeURIComponent(
                    `Hello Coach, I would like to ask about Day ${selectedDay.dayNumber} task - ${currentTask.title}${props.programTitle ? ` (${props.programTitle})` : ""}`
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto h-8 px-4 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide active:scale-95 transition hover:bg-black/80 inline-flex items-center justify-center"
              >
                <span>{props.communityLink ? "Community" : "Concierge"}</span>
              </a>
            </header>

            {/* TOP BANNER IMAGE (SPACIOUS, CLEAN OVERLAY) */}
            <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-zinc-950 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTask.image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

              {/* Title and metadata overlying the image banner, aligned with the sheet content below */}
              <div className="absolute inset-x-0 bottom-14 sm:bottom-16 z-0">
                <div className="max-w-xl mx-auto w-full px-6 sm:px-8 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/75 font-semibold">
                      Day {selectedDay.dayNumber}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full ${
                        selectedDone[step]
                          ? "bg-white text-zinc-950 font-semibold"
                          : isSelectedPast
                            ? "bg-white/20 text-white/80"
                            : "bg-white/25 backdrop-blur-md text-white"
                      }`}
                    >
                      {selectedDone[step] ? "Completed" : isSelectedPast ? "Archived" : "Active"}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
                    {currentTask.title}
                  </h1>

                  <p className="text-xs text-white/75 font-normal line-clamp-2">
                    {currentTask.description}
                  </p>
                </div>
              </div>
            </div>

            {/* SINGLE CLEAN CURVED SHEET (ALIGNED PADDING & CRISP BORDERS) */}
            <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] shadow-xl pt-9 px-6 sm:px-8 pb-28 max-w-xl mx-auto w-full flex-1">
              <TaskForm
                key={`${selectedDay.id}-${step}`}
                day={selectedDay}
                locked={selectedLocked}
                activities={selectedActivities}
                checks={selectedChecks}
                step={step}
                onFinish={handleFinishTask}
                props={props}
              />
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
