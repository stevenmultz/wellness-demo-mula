"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Angry,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  ExternalLink,
  Frown,
  Laugh,
  Loader2,
  Lock,
  Meh,
  Moon,
  Smile,
  Sparkles,
  Utensils,
} from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import { parseDayVideoLinks, parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { PlanDay } from "./MyPlanTab";

type SaveResult = Promise<void | boolean>;

export interface DailyCheckInProps {
  day: PlanDay;
  pastDays: PlanDay[];
  allProgramDays?: PlanDay[];
  locked: boolean;
  activities: string[];
  checks: string[];
  initialDone: [boolean, boolean, boolean, boolean];
  onToggleCheck: (task: string, dayId: string) => Promise<void> | void;
  onSelectWorkout: (workout: string, dayId: string) => SaveResult;
  onOpenVideo: (dayId: string) => SaveResult;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string) => SaveResult;
  onSaveAttendance: (notes: string, dayId: string) => SaveResult;
  onSaveWorkoutNotes: (notes: string, dayId: string) => SaveResult;
  onUploadPhoto: (type: "before" | "after", url: string, dayId: string) => SaveResult;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => SaveResult;
  onSaveReflection: (reflection: string, happiness: number, dayId: string) => SaveResult;
  onCompleteDay: (dayId: string) => SaveResult;
}

const TASKS = [
  {
    category: "SLEEP",
    title: "Sleep Protocol",
    description: "Record your bedtime, wake time, and sleep duration.",
  },
  {
    category: "TRAINING",
    title: "Movement & Routine",
    description: "Select your training variation and complete your daily checklist.",
  },
  {
    category: "MEAL",
    title: "Nutrition & Meal",
    description: "Log your dietary compliance and meal protocol.",
  },
  {
    category: "REFLECTION",
    title: "Daily Reflection",
    description: "Evaluate your daily fulfillment and energy index.",
  },
] as const;

const FACES = [
  { score: 1, Icon: Angry, label: "Very unsatisfied" },
  { score: 2, Icon: Frown, label: "Unsatisfied" },
  { score: 3, Icon: Meh, label: "Neutral" },
  { score: 4, Icon: Smile, label: "Satisfied" },
  { score: 5, Icon: Laugh, label: "Very satisfied" },
] as const;

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

function parseMeals(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
    .filter((line) => line.length > 1);
}

interface MealDraft {
  followed: boolean | null;
  actual: string;
}

function readMealDraft(compliance: string | null | undefined, notes: string | null | undefined): MealDraft {
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as { v?: number; followed?: boolean; actual?: string };
      if (parsed && parsed.v === 1) {
        return {
          followed: typeof parsed.followed === "boolean" ? parsed.followed : compliance === "FULL" ? true : compliance ? false : null,
          actual: typeof parsed.actual === "string" ? parsed.actual : "",
        };
      }
    } catch {
      /* plain text */
    }
  }
  if (compliance === "FULL") return { followed: true, actual: "" };
  if (compliance) return { followed: false, actual: notes || "" };
  return { followed: null, actual: "" };
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
  const [notes, setNotes] = useState(progress?.workoutNotes || "");
  const [photos, setPhotos] = useState({ before: progress?.photoBeforeUrl || "", after: progress?.photoAfterUrl || "" });
  const [photoBusy, setPhotoBusy] = useState<"before" | "after" | null>(null);
  const [meal, setMeal] = useState<MealDraft>(() => readMealDraft(progress?.mealCompliance, progress?.mealNotes));
  const [review, setReview] = useState(progress?.dailyReflection || "");
  const [score, setScore] = useState(progress?.happinessRate ? Math.min(5, progress.happinessRate) : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localChecks, setLocalChecks] = useState(checks);

  useEffect(() => {
    setLocalChecks(checks);
  }, [checks]);

  const isTraining = day.dayType === "TRAINING_DAY";
  const isConnect = day.dayType !== "TRAINING_DAY" && day.dayType !== "REST_DAY";
  const recommended = useMemo(() => parseMeals(day.mealRecommendation), [day.mealRecommendation]);
  const videos = useMemo(() => parseDayVideoLinks(day.videoUrl), [day.videoUrl]);
  const groups = useMemo(() => {
    if (!isTraining) return [];
    return parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  }, [isTraining, day.workoutOptions, day.videoChecklist]);

  const activeWorkout = workout || groups[0]?.optionName || "";
  const groupMoves = groups.find((g) => g.optionName === activeWorkout)?.movements.map((m) => m.name) || [];
  const movements = groupMoves.length > 0 ? groupMoves : activities;

  // Dynamic video mapped to selected option
  const activeOptionIdx = Math.max(0, groups.findIndex((g) => g.optionName === activeWorkout));
  const activeVideo = useMemo(() => {
    if (videos[activeOptionIdx]) return videos[activeOptionIdx];
    if (videos[0]) {
      return {
        title: `${activeWorkout || "Movement"} • Guided Protocol`,
        url: videos[0].url,
      };
    }
    return null;
  }, [videos, activeOptionIdx, activeWorkout]);

  const isChecked = (name: string) =>
    localChecks.some((c) => {
      const key = (c.includes("=") ? c.split("=")[0] : c).trim().toLowerCase();
      return key === name.trim().toLowerCase() || key.includes(name.trim().toLowerCase());
    });

  const valid = [
    !!bed && !!wake,
    isConnect
      ? notes.trim().length > 0
      : movements.length === 0
        ? notes.trim().length > 0 || true
        : movements.every(isChecked),
    meal.followed === true || (meal.followed === false && meal.actual.trim().length > 1),
    review.trim().length >= 3 && score > 0,
  ];

  const persist = async () => {
    if (step === 0) return (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake), day.id)) !== false;
    if (step === 1) {
      if (isConnect) return (await props.onSaveAttendance(notes.trim(), day.id)) !== false;
      if (activeWorkout) {
        const picked = await props.onSelectWorkout(activeWorkout, day.id);
        if (picked === false) return false;
      }
      if (notes.trim() !== (progress?.workoutNotes || "").trim()) {
        return (await props.onSaveWorkoutNotes(notes.trim(), day.id)) !== false;
      }
      return true;
    }
    if (step === 2) {
      return (
        (await props.onSaveMeal(
          meal.followed ? "FULL" : "OFF_TRACK",
          JSON.stringify({ v: 1, followed: meal.followed, actual: meal.followed ? "" : meal.actual.trim() }),
          day.id
        )) !== false
      );
    }
    return (await props.onSaveReflection(review.trim(), score, day.id)) !== false;
  };

  const handleSave = async () => {
    if (locked || busy || !valid[step]) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await persist();
      if (!ok) {
        setError("Could not save. Please try again.");
        return;
      }
      onFinish();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
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
    setLocalChecks((prev) => (isChecked(name) ? prev.filter((c) => !c.toLowerCase().includes(name.toLowerCase())) : [...prev, scoped]));
    await props.onToggleCheck(scoped, day.id);
  };

  return (
    <div key={step} className="space-y-4">
      {/* STEP 0: SLEEP */}
      {step === 0 && (
        <div className="space-y-4 max-w-sm mx-auto w-full">
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200/60 dark:border-white/10">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Bedtime</span>
                <span className="text-[11px] text-zinc-500">Target: Wind down before 22:30 WIB</span>
              </div>
              <input
                type="time"
                value={bed}
                disabled={locked}
                onChange={(e) => setBed(e.target.value)}
                className="w-36 h-10 px-3 rounded-xl bg-white dark:bg-[#141414] border border-zinc-300 dark:border-white/20 text-sm font-mono font-semibold text-zinc-900 dark:text-white text-center outline-none focus:border-zinc-900 dark:focus:border-white transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-white block">Wake Time</span>
                <span className="text-[11px] text-zinc-500">Morning circadian reset</span>
              </div>
              <input
                type="time"
                value={wake}
                disabled={locked}
                onChange={(e) => setWake(e.target.value)}
                className="w-36 h-10 px-3 rounded-xl bg-white dark:bg-[#141414] border border-zinc-300 dark:border-white/20 text-sm font-mono font-semibold text-zinc-900 dark:text-white text-center outline-none focus:border-zinc-900 dark:focus:border-white transition"
              />
            </div>
          </div>

          {bed && wake && (
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 dark:text-zinc-400">Total Sleep Duration</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {formatDuration(sleepMinutes(bed, wake))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: TRAINING / ROUTINE */}
      {step === 1 && !isConnect && (
        <div className="space-y-4">
          {/* 1. SELECT TRAINING ROUTINE FIRST */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Select Today&apos;s Training Routine:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {groups.map((g) => {
                  const isSelected = activeWorkout === g.optionName;
                  return (
                    <button
                      key={g.optionName}
                      type="button"
                      disabled={locked}
                      onClick={() => setWorkout(g.optionName)}
                      className={`p-3 rounded-xl border text-left transition active:scale-98 flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm"
                          : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate">{g.optionName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-mono opacity-70">
                        {g.movements.length} Movements Checklist
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. DYNAMIC YOUTUBE VIDEO ACCORDING TO CHOICE */}
          {isTraining && activeVideo && (
            <a
              href={activeVideo.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => props.onOpenVideo(day.id)}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-zinc-50 dark:bg-white/5 hover:border-zinc-400 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={extractVideoThumbnail(activeVideo.url, "/coach.jpg")} alt="" className="w-24 h-16 object-cover rounded-lg bg-zinc-200 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold truncate text-zinc-900 dark:text-white">
                  {activeVideo.title}
                </span>
                <span className="text-[11px] font-mono text-zinc-500 inline-flex items-center gap-1 mt-0.5">
                  Watch on YouTube <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          )}

          {/* 3. CHECKLIST ACCORDING TO CHOICE */}
          {movements.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Movement Checklist ({movements.filter(isChecked).length}/{movements.length}):
              </span>
              <ul className="divide-y divide-zinc-100 dark:divide-white/10 border border-zinc-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#141414] overflow-hidden">
                {movements.map((name) => {
                  const checked = isChecked(name);
                  const moveObj = groups.find((g) => g.optionName === activeWorkout)?.movements.find((m) => m.name === name);
                  const targetLabel = moveObj?.target;
                  return (
                    <li key={name}>
                      <label className="flex items-center justify-between gap-3 px-3.5 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition select-none">
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            disabled={locked}
                            checked={checked}
                            onChange={() => toggle(name)}
                            className="w-4 h-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 shrink-0"
                          />
                          <span className={`text-sm ${checked ? "line-through text-zinc-400 dark:text-zinc-500" : "font-medium text-zinc-900 dark:text-white"}`}>
                            {name}
                          </span>
                        </div>
                        {targetLabel && (
                          <span className="text-[11px] font-mono text-zinc-400 shrink-0 bg-zinc-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
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

          {/* 4. PHOTO CHECK-IN (OPTIONAL) */}
          {isTraining && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Photo Check-in (Optional):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["before", "after"] as const).map((type) => (
                  <label key={type} className="block text-[11px] text-zinc-500">
                    {type === "before" ? "Before Session" : "After Session"}
                    <span className="mt-1 flex h-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-white/10 transition">
                      {photos[type] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photos[type]} alt="" className="w-full h-full object-cover" />
                      ) : photoBusy === type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs font-mono text-zinc-400">+ Upload</span>
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
          )}
        </div>
      )}

      {/* STEP 1: CONNECT DAY */}
      {step === 1 && isConnect && (
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {day.eventTitle || day.title}
          </span>
          <textarea
            value={notes}
            disabled={locked}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Enter your attendance notes or session reflection..."
            className={areaCls}
          />
        </label>
      )}

      {/* STEP 2: MEAL */}
      {step === 2 && (
        <div className="space-y-3.5">
          {recommended.length > 0 && (
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-xs space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Nutrition Protocol:</p>
              {recommended.map((line) => (
                <p key={line} className="text-zinc-700 dark:text-zinc-300">{line}</p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={locked}
              aria-pressed={meal.followed === true}
              onClick={() => setMeal({ followed: true, actual: "" })}
              className={`h-11 rounded-xl text-xs font-semibold border transition ${
                meal.followed === true ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950" : "border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5"
              }`}
            >
              Follow Protocol
            </button>
            <button
              type="button"
              disabled={locked}
              aria-pressed={meal.followed === false}
              onClick={() => setMeal((d) => ({ ...d, followed: false }))}
              className={`h-11 rounded-xl text-xs font-semibold border transition ${
                meal.followed === false ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950" : "border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5"
              }`}
            >
              Custom Meal
            </button>
          </div>
          {meal.followed === false && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Custom Meal Notes</span>
              <textarea
                value={meal.actual}
                disabled={locked}
                onChange={(e) => setMeal((d) => ({ ...d, actual: e.target.value }))}
                rows={3}
                placeholder="Enter your meal notes and nutrition details..."
                className={areaCls}
              />
            </label>
          )}
        </div>
      )}

      {/* STEP 3: REFLECTION */}
      {step === 3 && (
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Daily Reflection</span>
            <textarea
              value={review}
              disabled={locked}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Enter your daily reflection, physical sensation, and thoughts..."
              className={areaCls}
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Daily Fulfillment & Energy Index</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Satisfaction Rating">
              {FACES.map(({ score: n, Icon, label }) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={score === n}
                  aria-label={label}
                  disabled={locked}
                  onClick={() => setScore(n)}
                  className={`w-10 h-10 rounded-full border inline-flex items-center justify-center transition active:scale-95 ${
                    score === n
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm"
                      : "border-zinc-200 dark:border-white/15 text-zinc-500 hover:border-zinc-400"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600 font-mono">
          {error}
        </p>
      )}

      {/* SAVE & SKIP ACTION BUTTONS ONLY */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-white/10 gap-2">
        <button
          type="button"
          disabled={locked || busy}
          onClick={onFinish}
          className="h-10 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95 transition"
        >
          Skip
        </button>

        <button
          type="button"
          disabled={locked || busy || !valid[step] || photoBusy !== null}
          onClick={handleSave}
          className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 active:scale-95 transition disabled:opacity-40 shadow-sm"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save</span>
        </button>
      </div>
    </div>
  );
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

function getDayStatus(d: PlanDay, isToday: boolean) {
  if (d.userProgress?.isCompleted) {
    return {
      label: "Done",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
      icon: Check,
    };
  }
  const hasSomeLogs = !!(
    d.userProgress?.bedtime ||
    d.userProgress?.selectedWorkout ||
    d.userProgress?.checklistCompleted ||
    d.userProgress?.mealCompliance ||
    d.userProgress?.dailyReflection ||
    d.userProgress?.photoBeforeUrl
  );
  if (isToday) {
    return {
      label: "Today",
      cls: "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white",
      icon: Clock,
    };
  }
  if (hasSomeLogs) {
    return {
      label: "Logged",
      cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
      icon: Clock,
    };
  }
  if (d.isPast2359) {
    return {
      label: "Skipped",
      cls: "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-white/5 dark:text-zinc-500 dark:border-white/10",
      icon: null,
    };
  }
  return {
    label: "Locked",
    cls: "bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-white/5 dark:text-zinc-500 dark:border-white/10",
    icon: Lock,
  };
}

function DayHistoryItem({
  day,
  isToday,
  isExpanded,
  onToggle,
  onOpenTodayTask,
}: {
  day: PlanDay;
  isToday: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenTodayTask?: () => void;
}) {
  const p = day.userProgress;
  const status = getDayStatus(day, isToday);
  const StatusIcon = status.icon;
  const dateLabel = formatDayDate(day.unlockDate, day.dayNumber);

  const groups = useMemo(
    () => parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist),
    [day.workoutOptions, day.videoChecklist]
  );
  const selectedWorkoutName = p?.selectedWorkout || groups[0]?.optionName;
  const activeGroup = groups.find((g) => g.optionName === selectedWorkoutName) || groups[0];
  const movements = activeGroup?.movements || [];

  const checkedMovements = useMemo(() => {
    if (!p?.checklistCompleted) return [];
    try {
      const arr = JSON.parse(p.checklistCompleted);
      return Array.isArray(arr) ? (arr.filter((x) => typeof x === "string") as string[]) : [];
    } catch {
      return [];
    }
  }, [p?.checklistCompleted]);

  const durationMins = p?.bedtime && p?.wakeTime ? sleepMinutes(p.bedtime, p.wakeTime) : 0;
  const faceInfo = p?.happinessRate ? FACES.find((f) => f.score === p.happinessRate) : null;
  const FaceIcon = faceInfo?.Icon;

  const hasLoggedData = !!(
    p?.bedtime ||
    p?.selectedWorkout ||
    checkedMovements.length > 0 ||
    p?.mealCompliance ||
    p?.dailyReflection ||
    p?.photoBeforeUrl ||
    p?.photoAfterUrl ||
    p?.workoutNotes
  );

  return (
    <div
      className={`rounded-xl border transition overflow-hidden ${
        isToday
          ? "border-zinc-950 dark:border-white bg-white dark:bg-[#141414] shadow-sm"
          : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#141414]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3.5 py-3 flex items-center justify-between gap-2.5 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-mono font-bold text-zinc-950 dark:text-white shrink-0">
            D{String(day.dayNumber).padStart(2, "0")}
          </span>
          <span className="text-xs text-zinc-500 shrink-0 font-medium">{dateLabel}</span>
          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-500 dark:text-zinc-400 shrink-0">
            {day.dayType === "REST_DAY"
              ? "Rest"
              : day.dayType === "CONNECT_DAY" || day.dayType === "MEETUP_DAY"
                ? "Connect"
                : "Train"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${status.cls}`}
          >
            {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
            <span>{status.label}</span>
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* COMPACT CLEAN EXPANDED VIEW */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-100 dark:border-white/5 space-y-2 bg-zinc-50/50 dark:bg-white/[0.02] text-xs">
          {hasLoggedData ? (
            <div className="space-y-1.5">
              {p?.bedtime && p?.wakeTime && (
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 font-mono text-[11px] uppercase">Sleep</span>
                  <span className="font-medium">
                    {p.bedtime} – {p.wakeTime} ({formatDuration(durationMins)})
                  </span>
                </div>
              )}

              {day.dayType === "TRAINING_DAY" && (selectedWorkoutName || checkedMovements.length > 0) && (
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 font-mono text-[11px] uppercase">Routine</span>
                  <span className="font-medium text-right truncate max-w-[200px]">
                    {selectedWorkoutName || "Training"}
                    {movements.length > 0 && ` (${movements.filter((m) => checkedMovements.includes(m.name)).length}/${movements.length})`}
                  </span>
                </div>
              )}

              {(p?.photoBeforeUrl || p?.photoAfterUrl) && (
                <div className="flex gap-2 pt-1">
                  {p.photoBeforeUrl && (
                    <a href={p.photoBeforeUrl} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photoBeforeUrl} alt="" className="w-full h-full object-cover" />
                    </a>
                  )}
                  {p.photoAfterUrl && (
                    <a href={p.photoAfterUrl} target="_blank" rel="noopener noreferrer" className="block w-14 h-14 rounded-lg overflow-hidden border border-zinc-200 dark:border-white/10 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photoAfterUrl} alt="" className="w-full h-full object-cover" />
                    </a>
                  )}
                </div>
              )}

              {p?.workoutNotes && (
                <div className="text-zinc-600 dark:text-zinc-400 italic bg-white dark:bg-white/5 p-2 rounded-lg border border-zinc-200/50 dark:border-white/5">
                  &ldquo;{p.workoutNotes}&rdquo;
                </div>
              )}

              {p?.mealCompliance && (
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 font-mono text-[11px] uppercase">Meal</span>
                  <span className="font-medium">
                    {p.mealCompliance === "YES" ? "Followed Protocol" : "Custom Meal"}
                    {p.mealNotes ? ` (${p.mealNotes})` : ""}
                  </span>
                </div>
              )}

              {(faceInfo || p?.dailyReflection) && (
                <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 font-mono text-[11px] uppercase">Reflection</span>
                  <span className="font-medium inline-flex items-center gap-1">
                    {FaceIcon && <FaceIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />}
                    <span>{p?.dailyReflection || faceInfo?.label || "—"}</span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-400 text-[11px] italic">No activity recorded for this day.</p>
          )}

          {isToday && !day.userProgress?.isCompleted && onOpenTodayTask && (
            <button
              type="button"
              onClick={onOpenTodayTask}
              className="w-full mt-2 h-8 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <span>Continue Today&apos;s Task</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone } = props;
  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone(initialDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(day.id);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const programDays = useMemo(() => {
    const list =
      props.allProgramDays && props.allProgramDays.length > 0
        ? props.allProgramDays
        : props.pastDays && props.pastDays.length > 0
          ? props.pastDays
          : [day];
    return [...list].sort((a, b) => a.dayNumber - b.dayNumber);
  }, [props.allProgramDays, props.pastDays, day]);

  const totalCompleted = programDays.filter((d) => d.userProgress?.isCompleted).length;

  const openDetail = (index: number) => {
    setStep(index);
    setDetailOpen(true);
  };

  const markDone = (index: number) => {
    setDone((prev) => prev.map((item, i) => (i === index ? true : item)));
  };

  const currentTask = TASKS[step];
  const allDone = done.every(Boolean);

  const handleFinishTask = () => {
    markDone(step);
    setDetailOpen(false);
  };

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden">
      {/* Daily Task Card Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Daily Tasks</h2>
          <p className="mt-0.5 text-[11px] font-mono text-zinc-500">Daily Reset: 00:00 WIB (UTC+7)</p>
        </div>
        <button
          type="button"
          aria-label="View Program Calendar and History"
          onClick={() => {
            setExpandedDayId(day.id);
            setHistoryOpen(true);
          }}
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 inline-flex items-center justify-center shrink-0 hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
        >
          <CalendarDays className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
        </button>
      </div>

      {/* Task List (Non-sequential: any task can be clicked in any order) */}
      <ol className="divide-y divide-zinc-100 dark:divide-white/10">
        {TASKS.map((t, index) => {
          const isDone = done[index];
          return (
            <li
              key={t.title}
              className={`px-4 py-3.5 flex items-center gap-3 transition ${isDone ? "bg-zinc-50/50 dark:bg-white/[0.02]" : ""}`}
            >
              <span
                className={`w-6 h-6 rounded-full border text-[11px] font-semibold inline-flex items-center justify-center shrink-0 ${
                  isDone
                    ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                    : "border-zinc-300 text-zinc-400"
                }`}
                aria-hidden
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{t.description}</p>
              </div>

              {/* Edit button when already done, Do Task button when not done */}
              {isDone ? (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => openDetail(index)}
                  className="h-8 px-3.5 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition inline-flex items-center gap-1 shrink-0"
                >
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => openDetail(index)}
                  className={primaryBtn}
                >
                  Do Task
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* BOTTOM ACTION: SUBMIT TODAY */}
      <div className="p-3.5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
        {day.userProgress?.isCompleted ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Today&apos;s Routine Completed & Locked</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={locked || completing}
            onClick={() => setConfirmSubmitOpen(true)}
            className="w-full h-11 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 transition active:scale-98 shadow-md disabled:opacity-40"
          >
            {completing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Submit Today</span>
          </button>
        )}
      </div>

      {/* TASK DETAIL FULL-SCREEN MODAL */}
      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] flex flex-col">
            <div className="max-w-lg mx-auto w-full flex-1 overflow-y-auto px-4 pt-4 pb-12 space-y-4">
              {/* TOP HEADER: Back button on the LEFT (NO INDEX NUMBER, NO TOP-RIGHT LABEL) */}
              <div className="flex items-center justify-start">
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="h-9 px-3.5 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>

              {/* TASK CARD */}
              <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{currentTask.title}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{currentTask.description}</p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 shrink-0">
                    {done[step] ? "Completed" : "Active"}
                  </span>
                </div>

                <TaskForm
                  key={`${day.id}-${step}`}
                  day={day}
                  locked={locked}
                  activities={activities}
                  checks={checks}
                  step={step}
                  onFinish={handleFinishTask}
                  props={props}
                />
              </section>
            </div>
          </div>,
          document.body
        )}

      {/* CONFIRMATION SUBMIT & LOCK DIALOG */}
      {confirmSubmitOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 p-5 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Submit & Lock Today&apos;s Routine?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Please ensure all daily activities are complete. Once submitted, today&apos;s journal will be permanently locked and archived.
                </p>
              </div>

              {/* Task Completion Checklist Status */}
              <div className="space-y-2 p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs font-mono">
                {TASKS.map((t, i) => (
                  <div key={t.title} className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">{t.title}</span>
                    {done[i] ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[11px]">Not Logged</span>
                    )}
                  </div>
                ))}
              </div>

              {!allDone && (
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <p>Note: Some tasks have not been completed yet. You can still submit if you wish to conclude today.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={completing}
                  className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={completing}
                  onClick={async () => {
                    setCompleting(true);
                    try {
                      const ok = (await props.onCompleteDay(day.id)) !== false;
                      if (ok) {
                        setConfirmSubmitOpen(false);
                        setDetailOpen(false);
                      }
                    } finally {
                      setCompleting(false);
                    }
                  }}
                  className="px-5 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition active:scale-98 shadow-md"
                >
                  {completing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit & Lock</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* PROGRAM HISTORY & CALENDAR FULL-SCREEN MODAL */}
      {historyOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] flex flex-col">
            <div className="max-w-lg mx-auto w-full flex-1 overflow-y-auto px-4 pt-4 pb-12 space-y-3">
              {/* CLEAN COMPACT TOP HEADER */}
              <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                    Schedule & History
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 bg-zinc-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                    {totalCompleted}/{programDays.length} Done
                  </span>
                </div>
              </div>

              {/* CALENDAR DAYS LIST */}
              <div className="space-y-1.5 pt-1">
                {programDays.map((d) => (
                  <DayHistoryItem
                    key={d.id}
                    day={d}
                    isToday={d.id === day.id}
                    isExpanded={expandedDayId === d.id}
                    onToggle={() =>
                      setExpandedDayId((prev) => (prev === d.id ? null : d.id))
                    }
                    onOpenTodayTask={() => {
                      setHistoryOpen(false);
                      openDetail(0);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
