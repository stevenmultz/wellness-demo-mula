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
  Laugh,
  Loader2,
  Lock,
  MapPin,
  Meh,
  Moon,
  Play,
  Smile,
  Sparkles,
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
      if (isConnect && !notes.trim()) return "Please enter session notes or key takeaways.";
      if (hasMultipleOptions && !activeWorkout) return "Please select a training routine first.";
      if (movements.length > 0 && !movements.every(isChecked)) {
        return `Please complete all exercises (${movements.length - checkedCount} remaining).`;
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
        return "Please write a brief reflection or check 'Prefer not to write today'.";
      }
      return null;
    }
    return null;
  };

  const persist = async () => {
    if (step === 0) return (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake), day.id)) !== false;
    if (step === 1) {
      if (isConnect) return (await props.onSaveAttendance(notes.trim(), day.id)) !== false;
      if (activeWorkout) {
        const picked = await props.onSelectWorkout(activeWorkout, day.id, false);
        if (picked === false) return false;
      }
      if (notes.trim() !== (progress?.workoutNotes || "").trim()) {
        return (await props.onSaveWorkoutNotes(notes.trim(), day.id)) !== false;
      }
      return true;
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
    if (file.size > 15 * 1024 * 1024) {
      setError("Photo must be under 15 MB.");
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

              <div className="grid grid-cols-1 gap-2.5">
                {groups.map((g, idx) => {
                  const isSelected = activeWorkout === g.optionName;
                  const previewNames = g.movements.slice(0, 3).map((m) => m.name);

                  return (
                    <button
                      key={g.optionName}
                      type="button"
                      onClick={() => handleClickWorkoutOption(g.optionName)}
                      className={`group rounded-2xl border p-4 text-left transition active:scale-[0.99] flex items-center justify-between gap-3 ${
                        isSelected
                          ? "border-zinc-950 dark:border-white bg-white dark:bg-[#181818] ring-1 ring-zinc-950/10 dark:ring-white/15 shadow-xs"
                          : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] hover:border-zinc-400 dark:hover:border-white/25"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                            Option {String.fromCharCode(65 + idx)}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            • {g.movements.length} movements
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                          {g.optionName}
                        </p>

                        {previewNames.length > 0 && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {previewNames.join(" · ")}
                            {g.movements.length > 3 ? ` +${g.movements.length - 3} more` : ""}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 h-8 px-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1 shadow-sm">
                        <span>{isSelected ? "Continue" : "Select"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
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

              {/* Guided Video */}
              {activeVideo && (
                <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">Guided Video</span>
                    <a
                      href={activeVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => props.onOpenVideo(day.id)}
                      className="text-[11px] font-mono text-zinc-500 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1"
                    >
                      <span>Watch Session</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <a
                    href={activeVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => props.onOpenVideo(day.id)}
                    className="group flex items-center gap-3 p-2 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-white/5 hover:border-zinc-400 transition"
                  >
                    <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={extractVideoThumbnail(activeVideo.url, "/coach.webp")}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="w-6 h-6 rounded-full bg-white/90 text-zinc-950 flex items-center justify-center shadow">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold truncate text-zinc-900 dark:text-white">
                        {activeVideo.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5">
                        Follow coach movements &amp; posture cues
                      </span>
                    </div>
                  </a>
                </div>
              )}

              {/* Movement Checklist */}
              {movements.length > 0 && (
                <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Movement Checklist
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                      {checkedCount} / {movements.length} Completed
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all"
                      style={{ width: `${movements.length > 0 ? Math.round((checkedCount / movements.length) * 100) : 0}%` }}
                    />
                  </div>

                  <ul className="space-y-2">
                    {movements.map((name) => {
                      const checked = isChecked(name);
                      const moveObj = selectedGroup?.movements.find((m) => m.name === name);
                      const targetLabel = moveObj?.target;
                      return (
                        <li key={name}>
                          <label
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                              checked
                                ? "border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5"
                                : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] hover:border-zinc-300"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                disabled={locked}
                                checked={checked}
                                onChange={() => toggle(name)}
                                className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0"
                              />
                              <span
                                className={`text-xs sm:text-sm ${
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
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Photos & Notes */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#181818] p-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
                  Photos &amp; Sensation Feedback
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {(["before", "after"] as const).map((type) => (
                    <label key={type} className="block text-[11px] text-zinc-500 cursor-pointer">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">
                        {type === "before" ? "Before Session" : "After Session"}
                      </span>
                      <span className="mt-1 flex h-20 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition">
                        {photos[type] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photos[type]} alt="" className="w-full h-full object-cover" />
                        ) : photoBusy === type ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400">
                            <Camera className="w-3.5 h-3.5" /> Upload
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

                {/* Quick Feedback Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Quick Tags:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {WORKOUT_QUICK_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          setNotes((prev) => (prev ? `${prev} · ${tag}` : tag));
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 transition active:scale-95 border border-zinc-200/60 dark:border-white/10"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {notes && (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                    <span className="truncate">{notes}</span>
                    <button
                      type="button"
                      onClick={() => setNotes("")}
                      className="text-[10px] text-zinc-400 hover:text-red-500 font-mono ml-2 shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                )}
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
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 space-y-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
              Community Session
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {day.eventTitle || "Connect with peers and review longevity habits together."}
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Session Notes &amp; Takeaways
            </span>
            <textarea
              value={notes}
              disabled={locked}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Enter session takeaways..."
              className={areaCls}
            />
          </label>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: NUTRITION & MEAL (CHECKLIST + ALTERNATIVE OPTIONS, NO TYPING)  */}
      {/* ===================================================================== */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-950 dark:text-white block">
              Today&apos;s Recommended Meals
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
            </ul>
          </div>

          <div className="space-y-2 pt-1 border-t border-zinc-100 dark:border-white/10">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
              Alternative Options
            </span>

            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setMealDraft((prev) => ({
                  checkedMeals: [],
                  specialOption: prev.specialOption === "similar" ? null : "similar",
                }));
              }}
              className={`w-full p-3.5 rounded-xl border text-left text-xs transition flex items-center justify-between gap-3 ${
                mealDraft.specialOption === "similar"
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white shadow-xs"
                  : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
              }`}
            >
              <span>Ate similar food portion &amp; nutrition as recommended</span>
              {mealDraft.specialOption === "similar" && (
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
            </button>

            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setMealDraft((prev) => ({
                  checkedMeals: [],
                  specialOption: prev.specialOption === "off_track" ? null : "off_track",
                }));
              }}
              className={`w-full p-3.5 rounded-xl border text-left text-xs transition flex items-center justify-between gap-3 ${
                mealDraft.specialOption === "off_track"
                  ? "border-zinc-950 dark:border-white bg-zinc-50 dark:bg-white/10 font-semibold text-zinc-950 dark:text-white shadow-xs"
                  : "border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
              }`}
            >
              <span>Did not follow meal recommendations</span>
              {mealDraft.specialOption === "off_track" && (
                <Check className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </button>
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
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Daily Journal
              </span>

              {/* Quick Tag Presets for Journal */}
              <div className="flex flex-wrap gap-1.5">
                {REFLECTION_QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setReview((prev) => (prev ? `${prev} ${tag}` : tag));
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/15 text-zinc-700 dark:text-zinc-300 transition active:scale-95 border border-zinc-200/60 dark:border-white/10"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                value={review}
                disabled={locked}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Enter daily reflection..."
                className={areaCls}
              />
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
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">
                Skip This Task?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Are you sure you want to skip today&apos;s {currentTaskInfo.title}? You can reopen and complete it anytime before daily reset.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSkipConfirmOpen(false)}
                className="h-9 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSkipConfirmOpen(false);
                  onFinish();
                }}
                className="h-9 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition active:scale-95"
              >
                Yes, Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRMATION MODAL */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
  const sleepDone = !!p?.bedtime && !!p?.wakeTime;
  const activityDone =
    d.dayType === "TRAINING_DAY"
      ? !!p?.videoWatched ||
        !!p?.isCompleted ||
        (acts.length > 0 && acts.every((name) => chks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : d.dayType === "REST_DAY"
        ? acts.length > 0
          ? acts.every((name) => chks.includes(name))
          : !!p?.isCompleted
        : !!p?.eventFeedback || !!p?.isCompleted;
  return [sleepDone, activityDone, !!p?.mealCompliance, !!p?.dailyReflection];
}

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone } = props;
  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone(initialDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const [selectedDayId, setSelectedDayId] = useState<string>(day.id);
  useEffect(() => {
    setSelectedDayId(day.id);
  }, [day.id]);

  const [resetCountdown, setResetCountdown] = useState<string>(() => getWibResetCountdown());
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
      {/* Daily Task Card Header */}
      <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Daily Tasks</h2>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            • {resetCountdown}
          </span>
        </div>
      </div>

      {/* Horizontal Side-by-Side Day Selector (10 Nov Training · 11 Nov Rest ...) */}
      <div className="px-3.5 py-3 border-b border-zinc-100 dark:border-white/10 bg-zinc-50/60 dark:bg-white/[0.02]">
        <div
          ref={stripRef}
          onTouchStart={(e) => e.stopPropagation()}
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
                {isTodayItem && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActiveSelected ? "bg-white dark:bg-zinc-950" : "bg-zinc-950 dark:bg-white"
                    }`}
                  />
                )}
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
          <div onScroll={handleTaskDetailScroll} className="dark fixed inset-0 z-[80] bg-[#0e0e0e] text-zinc-100 flex flex-col overflow-y-auto">
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
