"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Angry,
  ArrowLeft,
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
  Moon,
  Play,
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
import { safeHttpUrl } from "./shared";

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
  onToggleCheck: (task: string, dayId: string) => Promise<void> | void;
  onSelectWorkout: (workout: string, dayId: string, resetChecklist?: boolean) => SaveResult;
  onOpenVideo: (dayId: string) => SaveResult;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string) => SaveResult;
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

const areaCls =
  "w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition disabled:opacity-50 resize-none";
const primaryBtn =
  "h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";

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
  if (mins >= 420 && mins <= 540) {
    return {
      label: "Optimal Recovery (7–9h)",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    };
  }
  if (mins >= 360) {
    return {
      label: "Moderate Rest",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    };
  }
  return {
    label: "Sleep Deficit (<6h)",
    cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40",
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
}

function readMealDraft(
  compliance: string | null | undefined,
  notes: string | null | undefined,
  recommended: string[]
): MealDraft {
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as { mode?: string; checkedMeals?: string[] };
      if (parsed && parsed.mode === "similar") {
        return { checkedMeals: [], specialOption: "similar" };
      }
      if (parsed && parsed.mode === "off_track") {
        return { checkedMeals: [], specialOption: "off_track" };
      }
      if (parsed && Array.isArray(parsed.checkedMeals)) {
        return { checkedMeals: parsed.checkedMeals, specialOption: null };
      }
    } catch {
      /* plain text fallback */
    }
  }
  if (compliance === "SIMILAR") return { checkedMeals: [], specialOption: "similar" };
  if (compliance === "OFF_TRACK") return { checkedMeals: [], specialOption: "off_track" };
  if (compliance === "FULL") return { checkedMeals: [...recommended], specialOption: null };
  return { checkedMeals: [], specialOption: null };
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
  const [bed, setBed] = useState(progress?.bedtime || "");
  const [wake, setWake] = useState(progress?.wakeTime || "");
  const [workout, setWorkout] = useState(progress?.selectedWorkout || "");
  const [trainingEntered, setTrainingEntered] = useState(false);
  const [pendingSwitchWorkout, setPendingSwitchWorkout] = useState<string | null>(null);
  const [notes, setNotes] = useState(progress?.workoutNotes || progress?.eventFeedback || "");
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
      "Meal 1: Nutrient-dense breakfast with clean protein",
      "Meal 2: Balanced lunch with greens & complex carbohydrates",
      "Meal 3: Light evening dinner for restorative recovery",
    ];
  }, [day.mealRecommendation]);

  const [mealDraft, setMealDraft] = useState<MealDraft>(() =>
    readMealDraft(progress?.mealCompliance, progress?.mealNotes, recommendedMeals)
  );
  const [skipJournal, setSkipJournal] = useState(
    () => progress?.dailyReflection === "Skipped reflection journal today."
  );
  const [review, setReview] = useState(
    progress?.dailyReflection === "Skipped reflection journal today." ? "" : progress?.dailyReflection || ""
  );
  const [score, setScore] = useState(progress?.happinessRate ? Math.min(5, progress.happinessRate) : 0);
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

  const isSleepValid = Boolean(bed && wake);
  const isTrainingValid = isConnect
    ? notes.trim().length > 0
    : isRest
      ? movements.length === 0 || movements.every(isChecked)
      : hasMultipleOptions
        ? Boolean(activeWorkout) && (movements.length === 0 || movements.every(isChecked))
        : movements.length === 0 || movements.every(isChecked);
  const isMealValid = mealDraft.checkedMeals.length > 0 || mealDraft.specialOption !== null;
  const isReflectionValid = (skipJournal || review.trim().length >= 3) && score > 0;

  const valid = [isSleepValid, isTrainingValid, isMealValid, isReflectionValid];

  const getValidationError = (currentStep: number): string | null => {
    if (currentStep === 0) {
      if (!bed && !wake) return "Please enter both bedtime and wake time.";
      if (!bed) return "Please enter your bedtime.";
      if (!wake) return "Please enter your wake time.";
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
    if (currentStep === 2) {
      if (mealDraft.checkedMeals.length === 0 && !mealDraft.specialOption) {
        return "Please check at least one meal or select a meal option.";
      }
      return null;
    }
    if (currentStep === 3) {
      if (!score) return "Please select your daily mood & energy rating.";
      if (!skipJournal && review.trim().length < 3) {
        return "Please select a journal reflection or write a brief note.";
      }
      return null;
    }
    return null;
  };

  const persist = async () => {
    if (step === 0) return (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake), day.id)) !== false;
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
      if (mealDraft.specialOption === "similar") {
        return (
          (await props.onSaveMeal(
            "SIMILAR",
            JSON.stringify({ v: 2, mode: "similar", checkedMeals: [] }),
            day.id
          )) !== false
        );
      }
      if (mealDraft.specialOption === "off_track") {
        return (
          (await props.onSaveMeal(
            "OFF_TRACK",
            JSON.stringify({ v: 2, mode: "off_track", checkedMeals: [] }),
            day.id
          )) !== false
        );
      }
      const allDone = mealDraft.checkedMeals.length === recommendedMeals.length;
      return (
        (await props.onSaveMeal(
          allDone ? "FULL" : "PARTIAL",
          JSON.stringify({ v: 2, mode: "checklist", checkedMeals: mealDraft.checkedMeals }),
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

  const toggle = async (name: string) => {
    const scoped = activeWorkout ? `[${activeWorkout}] ${name}` : name;
    setLocalChecks((prev) =>
      isChecked(name)
        ? prev.filter((c) => !c.toLowerCase().includes(name.toLowerCase()))
        : [...prev, scoped]
    );
    await props.onToggleCheck(scoped, day.id);
  };

  const totalSleepMins = bed && wake ? sleepMinutes(bed, wake) : 0;
  const sleepQuality = totalSleepMins > 0 ? sleepQualityLabel(totalSleepMins) : null;

  return (
    <div key={step} className="space-y-4">
      {/* ===================================================================== */}
      {/* STEP 0: SLEEP PROTOCOL                                                */}
      {/* ===================================================================== */}
      {step === 0 && (
        <div className="space-y-4 py-1">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {day.sleepRecommendation || "Target 7 to 8 hours of restorative circadian sleep."}
          </p>

          <div className="space-y-3">
            {/* Bedtime Input & Quick Preset Chips */}
            <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor="input-bedtime" className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                    Bedtime
                  </label>
                  <span className="text-xs text-zinc-400 block mt-0.5">Time you went to sleep</span>
                </div>
                <input
                  id="input-bedtime"
                  type="time"
                  value={bed}
                  disabled={locked}
                  onChange={(e) => setBed(e.target.value)}
                  placeholder="Enter bedtime"
                  aria-label="Enter bedtime"
                  className="w-32 h-10 px-3 rounded-xl bg-white dark:bg-[#181818] border border-zinc-200 dark:border-white/15 text-sm font-mono font-semibold text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition text-center shrink-0 shadow-2xs"
                />
              </div>

              {/* Quick Tap Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 mr-1">Presets:</span>
                {BEDTIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={locked}
                    onClick={() => setBed(t)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-mono font-medium transition active:scale-95 shrink-0 ${
                      bed === t
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-white dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Wake Time Input & Quick Preset Chips */}
            <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <label htmlFor="input-waketime" className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                    Wake Time
                  </label>
                  <span className="text-xs text-zinc-400 block mt-0.5">Time you woke up</span>
                </div>
                <input
                  id="input-waketime"
                  type="time"
                  value={wake}
                  disabled={locked}
                  onChange={(e) => setWake(e.target.value)}
                  placeholder="Enter wake time"
                  aria-label="Enter wake time"
                  className="w-32 h-10 px-3 rounded-xl bg-white dark:bg-[#181818] border border-zinc-200 dark:border-white/15 text-sm font-mono font-semibold text-zinc-950 dark:text-white outline-none focus:border-zinc-950 dark:focus:border-white transition text-center shrink-0 shadow-2xs"
                />
              </div>

              {/* Quick Tap Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 mr-1">Presets:</span>
                {WAKETIME_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={locked}
                    onClick={() => setWake(t)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-mono font-medium transition active:scale-95 shrink-0 ${
                      wake === t
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-white dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {totalSleepMins > 0 && (
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">Recorded Rest</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  {formatDuration(totalSleepMins)}
                  {sleepQuality ? ` · ${sleepQuality.label.split(" (")[0]}` : ""}
                </span>
              </div>
            )}
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
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-200/70 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setTrainingEntered(false)}
                    className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5 active:scale-95 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Option</span>
                  </button>
                  <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-white truncate">
                    {activeWorkout || "Training Session"}
                  </span>
                </div>
              )}

              {/* 1. LARGE VIDEO THUMBNAIL ON TOP WITH LINK BUTTON */}
              {activeVideo && (
                <div className="space-y-2.5">
                  <div className="relative w-full aspect-video sm:h-56 rounded-2xl overflow-hidden bg-zinc-950 shadow-sm border border-zinc-200/50 dark:border-white/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-center justify-center">
                      <a
                        href={activeVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => props.onOpenVideo(day.id)}
                        className="w-12 h-12 rounded-full bg-white/95 text-zinc-950 flex items-center justify-center shadow-lg active:scale-95 hover:scale-110 transition-transform"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </a>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-xs font-semibold truncate drop-shadow-sm">{activeVideo.title}</p>
                      <p className="text-[11px] text-white/80">Guided training movement cues</p>
                    </div>
                  </div>

                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => props.onOpenVideo(day.id)}
                    className="w-full h-10 px-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-xs font-semibold text-zinc-900 dark:text-white flex items-center justify-center gap-2 transition active:scale-[0.99]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Video Session</span>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  </a>
                </div>
              )}

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

              {/* 3. CHECKLIST (SPACIOUS, NO CRAMPED TEXT) */}
              {movements.length > 0 && (
                <div className="divide-y divide-zinc-100 dark:divide-white/5 border-t border-b border-zinc-100 dark:border-white/10">
                  {movements.map((name) => {
                    const checked = isChecked(name);
                    const moveObj = selectedGroup?.movements.find((m) => m.name === name);
                    const targetLabel = moveObj?.target;
                    return (
                      <label
                        key={name}
                        className="flex items-center justify-between gap-3 py-3 px-1 cursor-pointer transition select-none hover:bg-zinc-50/50 dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={checked}
                            onChange={() => toggle(name)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-white/20 text-zinc-950 focus:ring-zinc-950 shrink-0 accent-zinc-950 dark:accent-white"
                          />
                          <span
                            className={`text-xs sm:text-sm leading-relaxed transition ${
                              checked
                                ? "line-through text-zinc-400 dark:text-zinc-500"
                                : "font-medium text-zinc-900 dark:text-white"
                            }`}
                          >
                            {name}
                          </span>
                        </div>
                        {targetLabel && (
                          <span className="text-[11px] font-mono text-zinc-500 shrink-0 bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                            {targetLabel}
                          </span>
                        )}
                      </label>
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
                      <span className="flex h-24 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition">
                        {photos[type] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photos[type]} alt="" className="w-full h-full object-cover" />
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
                  <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
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
      {/* STEP 1B: REST & RECOVERY DAY                                          */}
      {/* ===================================================================== */}
      {step === 1 && isRest && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 space-y-1.5">
            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
              Active Recovery Protocol
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Focus on parasympathetic down-regulation, tissue hydration, and light mobility.
            </p>
          </div>

          {restLines.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Rest &amp; Mobility Checklist
              </span>
              <ul className="space-y-2">
                {restLines.map((line, idx) => {
                  const checked = isChecked(line);
                  return (
                    <li key={idx}>
                      <label
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                          checked
                            ? "border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5"
                            : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={locked}
                          checked={checked}
                          onChange={() => toggle(line)}
                          className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5"
                        />
                        <span
                          className={`text-xs leading-relaxed ${
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
      {/* STEP 1C: COMMUNITY / MEETUP DAY                                       */}
      {/* ===================================================================== */}
      {step === 1 && isConnect && (
        <div className="space-y-4">
          {/* SESSION INFO CARD */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                {day.meetupLink ? "Online Zoom Session" : day.onsiteVenue ? "Onsite Gathering" : "Community Session"}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {day.onsiteSchedule || "Live Session"}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                {day.eventTitle || "Community Connect & Discussion"}
              </h3>
              {day.eventDetails && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  {day.eventDetails}
                </p>
              )}
            </div>

            {/* If Online: Zoom Meeting Link */}
            {day.meetupLink && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-white/10 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold block">
                  Online Meeting Link:
                </span>
                <a
                  href={day.meetupLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 px-4 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 active:scale-98 transition shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Zoom Meeting</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* If Onsite: Address, Schedule, Host & Map */}
            {day.onsiteVenue && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-white/10 space-y-2.5 text-xs">
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

                {day.mapLink && (
                  <a
                    href={day.mapLink}
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
                          ? "fill-amber-400 text-amber-400"
                          : "text-zinc-300 dark:text-zinc-600"
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
      {/* STEP 2: NUTRITION & MEAL (UNIFIED TAP CHECKLIST, NO KEYBOARD)         */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
              Today&apos;s Recommended Meals &amp; Options
            </span>
            <ul className="space-y-2">
              {recommendedMeals.map((mealLine, idx) => {
                const checked = mealDraft.checkedMeals.includes(mealLine);
                return (
                  <li key={idx}>
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                        checked
                          ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/10"
                          : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300"
                      }`}
                    >
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
                              checkedMeals: nextChecked,
                              specialOption: null,
                            };
                          });
                        }}
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                          Meal {idx + 1}
                        </span>
                        <p
                          className={`text-xs mt-0.5 leading-relaxed ${
                            checked
                              ? "font-semibold text-zinc-950 dark:text-white"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {mealLine}
                        </p>
                      </div>
                    </label>
                  </li>
                );
              })}

              {/* UNIFIED CHECKLIST OPTION 1: SIMILAR MEALS */}
              <li>
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                    mealDraft.specialOption === "similar"
                      ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/10"
                      : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={mealDraft.specialOption === "similar"}
                    onChange={() => {
                      setMealDraft((prev) => ({
                        checkedMeals: [],
                        specialOption: prev.specialOption === "similar" ? null : "similar",
                      }));
                    }}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs leading-relaxed ${
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

              {/* UNIFIED CHECKLIST OPTION 2: OFF TRACK */}
              <li>
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                    mealDraft.specialOption === "off_track"
                      ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/10"
                      : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={mealDraft.specialOption === "off_track"}
                    onChange={() => {
                      setMealDraft((prev) => ({
                        checkedMeals: [],
                        specialOption: prev.specialOption === "off_track" ? null : "off_track",
                      }));
                    }}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs leading-relaxed ${
                        mealDraft.specialOption === "off_track"
                          ? "font-semibold text-zinc-950 dark:text-white"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Did not follow meal recommendations
                    </p>
                  </div>
                </label>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: DAILY REFLECTION (WITH PREFER NOT TO WRITE OPTION & CHIPS)     */}
      {/* ===================================================================== */}
      {step === 3 && (
        <div className="space-y-4">
          {day.dailyAssessment && (
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                Today&apos;s Focus Prompt
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {day.dailyAssessment}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
              Daily Energy &amp; Mood Rating
            </span>
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
                    className={`py-2.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
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

          {/* Option: Prefer not to write journal today */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/60 dark:bg-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={locked}
              checked={skipJournal}
              onChange={(e) => {
                setSkipJournal(e.target.checked);
                if (e.target.checked && !score) setScore(3);
              }}
              className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
            />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              I prefer not to write a journal today
            </span>
          </label>

          {!skipJournal ? (
            <div className="space-y-2.5">
              <div>
                <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                  Daily Journal
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Select a reflection mood option or customize your personal entry
                </p>
              </div>

              {/* 5 JOURNAL OPTIONS (NO ICONS, 5 DIFFERENT MOODS) */}
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
                      className={`w-full p-3 rounded-xl border text-left transition select-none ${
                        active
                          ? "border-zinc-950 dark:border-white bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/5 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300"
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
                  rows={2}
                  maxLength={2000}
                  placeholder="Or customize / type your personal thoughts here..."
                  className={areaCls}
                />
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-white/5 text-xs text-zinc-500 font-mono">
              Reflection journal entry skipped for today.
            </div>
          )}
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

  // Center the active/selected day in the horizontal number strip
  useEffect(() => {
    const container = stripRef.current;
    const btn = buttonRefs.current[selectedDay.id];
    if (!container || !btn) return;
    const targetLeft = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
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
      {/* Daily Task Card Header (Stacked Title & Reset Timer + Info Button) */}
      <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Daily Tasks</h2>
            <button
              type="button"
              onClick={() => setShowDailyTasksInfo((prev) => !prev)}
              aria-label="Daily tasks info"
              className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
            {resetCountdown}
          </p>
        </div>
      </div>

      {showDailyTasksInfo && (
        <div className="p-4 bg-zinc-50 dark:bg-white/5 border-b border-zinc-100 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 animate-in fade-in duration-200">
          <p className="font-semibold text-zinc-950 dark:text-white">About Daily Tasks &amp; Reset Schedule:</p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li><strong className="text-zinc-900 dark:text-white">Task Cadence:</strong> Complete each day&apos;s routine: sleep tracking, training workout, nutrition logging, and daily reflection.</li>
            <li><strong className="text-zinc-900 dark:text-white">Daily Reset:</strong> Active tasks reset every night at 00:00 WIB (UTC+7). Complete all submissions before the 23:59 WIB daily cutoff.</li>
            <li><strong className="text-zinc-900 dark:text-white">Skipping Tasks:</strong> If you cannot finish a task today, select &quot;Skip&quot; to clear your queue and update your pending task count.</li>
            <li><strong className="text-zinc-900 dark:text-white">Day Navigation:</strong> Tap any unlocked day in the date selector below to view previous submissions or future curriculum days.</li>
          </ul>
        </div>
      )}

      {/* Horizontal Side-by-Side Day Selector (10 Nov Training · 11 Nov Rest ...) */}
      <div className="px-3.5 py-3 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02]">
        <div
          ref={stripRef}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {programDays.map((d) => {
            const isActiveSelected = d.id === selectedDay.id;
            const isTodayItem = d.id === day.id;
            const isPastItem = !isTodayItem && (d.isPast2359 || d.dayNumber < day.dayNumber);
            const isDoneItem = !!d.userProgress?.isCompleted;
            const isFutureItem = !isTodayItem && !isPastItem && !isDoneItem && (!d.isCalendarUnlocked || d.dayNumber > day.dayNumber);
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
                className={`shrink-0 h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-mono font-semibold transition active:scale-95 focus:outline-none ${
                  isActiveSelected
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm ring-2 ring-zinc-950/15 dark:ring-white/20"
                    : isTodayItem
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white border-2 border-zinc-950 dark:border-white"
                      : isDoneItem
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                        : isPastItem
                          ? "bg-white dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/10"
                          : "bg-zinc-100/80 dark:bg-white/[0.03] text-zinc-400 dark:text-zinc-500 border border-zinc-200/60 dark:border-white/5"
                }`}
              >
                <span>{dateStr}</span>
                <span className="text-[10px] uppercase tracking-wider opacity-85">{dayTypeWord}</span>
                {isFutureItem && <Lock className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
              </button>
            );
          })}
        </div>
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
                    <span className="font-mono text-zinc-400 font-normal mr-1.5">0{index + 1}.</span>
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
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Today&apos;s Routine Completed</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
        ) : allDone ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>All daily tasks submitted for today</span>
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Done</span>
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
            className="dark fixed inset-0 z-[80] bg-[#0e0e0e] text-zinc-100 flex flex-col overflow-y-auto"
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

              {/* Title and metadata overlying the image banner with generous breathing room */}
              <div className="absolute inset-x-0 bottom-14 sm:bottom-16 px-6 sm:px-8 z-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/75 font-semibold">
                    Day {selectedDay.dayNumber}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full ${
                      selectedDone[step]
                        ? "bg-emerald-500/80 text-white"
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

                <p className="text-xs text-white/70 font-normal line-clamp-2">
                  {currentTask.description}
                </p>
              </div>
            </div>

            {/* SECTION UNDERNEATH WITH CURVED BORDER (LEKUKAN DI IMAGE) */}
            <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200/80 dark:border-white/10 bg-[#f6f6f4] dark:bg-[#0e0e0e] shadow-xl pt-6 px-5 sm:px-6 pb-24 space-y-4 max-w-xl mx-auto w-full flex-1">
              {/* Bordered Task Content Section */}
              <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-4 shadow-sm">
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
              </section>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
