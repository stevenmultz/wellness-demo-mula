"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Angry,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Frown,
  Laugh,
  ListTodo,
  Loader2,
  Meh,
  Smile,
} from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import { parseDayVideoLinks, parseWorkoutOptionGroups } from "@/wellness/utils/json";
import type { PlanDay } from "./MyPlanTab";

type SaveResult = Promise<void | boolean>;

export interface DailyCheckInProps {
  day: PlanDay;
  pastDays: PlanDay[];
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
  { title: "Sleep", description: "Fill in your sleep schedule and sleep quality." },
  { title: "Daily Routine", description: "Complete your daily training and routine." },
  { title: "Meal", description: "Fill in your daily meal and nutrition information." },
  { title: "Reflection", description: "Complete your daily reflection." },
] as const;

const FACES = [
  { score: 1, Icon: Angry, label: "Very unsatisfied" },
  { score: 2, Icon: Frown, label: "Unsatisfied" },
  { score: 3, Icon: Meh, label: "Neutral" },
  { score: 4, Icon: Smile, label: "Satisfied" },
  { score: 5, Icon: Laugh, label: "Very satisfied" },
] as const;

const fieldCls =
  "w-full h-10 px-3 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white disabled:opacity-50";
const areaCls =
  "w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/15 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white disabled:opacity-50 resize-none";
const primaryBtn =
  "h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5";
const ghostBtn =
  "h-9 px-3 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-medium text-zinc-700 dark:text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1";

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
  onAdvance,
  onCloseEdit,
  props,
}: {
  day: PlanDay;
  locked: boolean;
  activities: string[];
  checks: string[];
  step: number;
  onAdvance: () => void;
  onCloseEdit?: () => void;
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
    const hasAdmin = (day.workoutOptions && day.workoutOptions.length > 0) || day.videoChecklist.length > 0;
    return hasAdmin ? parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist) : [];
  }, [isTraining, day.workoutOptions, day.videoChecklist]);
  const activeWorkout = workout || groups[0]?.optionName || "";
  const groupMoves = groups.find((g) => g.optionName === activeWorkout)?.movements.map((m) => m.name) || [];
  const movements = groupMoves.length > 0 ? groupMoves : activities;

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

  const next = async () => {
    if (locked || busy || !valid[step]) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await persist();
      if (!ok) {
        setError("Could not save. Try again.");
        return;
      }
      if (onCloseEdit) onCloseEdit();
      else onAdvance();
    } catch {
      setError("Could not save. Try again.");
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
      {step === 0 && (
        <div className="grid grid-cols-2 gap-3 max-w-[17rem]">
          <label className="block text-[11px] text-zinc-500">
            Bedtime
            <input type="time" value={bed} disabled={locked} onChange={(e) => setBed(e.target.value)} className={`${fieldCls} mt-1`} />
          </label>
          <label className="block text-[11px] text-zinc-500">
            Wake time
            <input type="time" value={wake} disabled={locked} onChange={(e) => setWake(e.target.value)} className={`${fieldCls} mt-1`} />
          </label>
          {bed && wake && (
            <p className="col-span-2 text-sm">
              <span className="text-zinc-500">Sleep Duration</span>
              <span className="float-right font-medium tabular-nums">{formatDuration(sleepMinutes(bed, wake))}</span>
            </p>
          )}
        </div>
      )}

      {step === 1 && !isConnect && (
        <div className="space-y-3">
          {isTraining && videos[0] && (
            <a
              href={videos[0].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => props.onOpenVideo(day.id)}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={extractVideoThumbnail(videos[0].url, "/image.jpg")} alt="" className="w-24 h-16 object-cover bg-zinc-200" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{videos[0].title || day.title}</span>
                <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                  YouTube <ExternalLink className="w-3 h-3" />
                </span>
              </span>
            </a>
          )}
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button
                  key={g.optionName}
                  type="button"
                  disabled={locked}
                  aria-pressed={activeWorkout === g.optionName}
                  onClick={() => setWorkout(g.optionName)}
                  className={`h-8 px-3 rounded-full text-[11px] border ${
                    activeWorkout === g.optionName
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                      : "border-zinc-300 dark:border-white/15"
                  }`}
                >
                  {g.optionName}
                </button>
              ))}
            </div>
          )}
          {movements.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-white/10 border border-zinc-200 dark:border-white/10 rounded-xl">
              {movements.map((name) => (
                <li key={name}>
                  <label className="flex items-center gap-2.5 px-3 py-2 text-sm">
                    <input type="checkbox" disabled={locked} checked={isChecked(name)} onChange={() => toggle(name)} />
                    <span>{name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {isTraining && (
            <div className="grid grid-cols-2 gap-2">
              {(["before", "after"] as const).map((type) => (
                <label key={type} className="block text-[11px] text-zinc-500">
                  {type === "before" ? "Before Exercise" : "After Exercise"}
                  <span className="mt-1 flex h-16 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-white/20 overflow-hidden bg-zinc-50 dark:bg-white/5">
                    {photos[type] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos[type]} alt="" className="w-full h-full object-cover" />
                    ) : photoBusy === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Upload"
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
          )}
        </div>
      )}

      {step === 1 && isConnect && (
        <label className="block text-[11px] text-zinc-500">
          {day.eventTitle || day.title}
          <textarea value={notes} disabled={locked} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${areaCls} mt-1`} />
        </label>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {recommended.length > 0 && (
            <div className="text-sm space-y-1">
              <p className="text-[11px] text-zinc-500">Recommendation</p>
              {recommended.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={locked}
              aria-pressed={meal.followed === true}
              onClick={() => setMeal({ followed: true, actual: "" })}
              className={`h-10 rounded-xl text-xs font-medium border ${
                meal.followed === true ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950" : "border-zinc-300 dark:border-white/15"
              }`}
            >
              Follow Recommendation
            </button>
            <button
              type="button"
              disabled={locked}
              aria-pressed={meal.followed === false}
              onClick={() => setMeal((d) => ({ ...d, followed: false }))}
              className={`h-10 rounded-xl text-xs font-medium border ${
                meal.followed === false ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950" : "border-zinc-300 dark:border-white/15"
              }`}
            >
              Not Following
            </button>
          </div>
          {meal.followed === false && (
            <label className="block text-[11px] text-zinc-500">
              Meal note
              <textarea
                value={meal.actual}
                disabled={locked}
                onChange={(e) => setMeal((d) => ({ ...d, actual: e.target.value }))}
                rows={3}
                className={`${areaCls} mt-1`}
              />
            </label>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <label className="block text-[11px] text-zinc-500">
            Daily Reflection
            <textarea value={review} disabled={locked} onChange={(e) => setReview(e.target.value)} rows={4} maxLength={2000} className={`${areaCls} mt-1`} />
          </label>
          <div>
            <p className="text-[11px] text-zinc-500 mb-1.5">Satisfaction</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Satisfaction">
              {FACES.map(({ score: n, Icon, label }) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={score === n}
                  aria-label={label}
                  disabled={locked}
                  onClick={() => setScore(n)}
                  className={`w-9 h-9 rounded-full border inline-flex items-center justify-center ${
                    score === n ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950" : "border-zinc-200 dark:border-white/15 text-zinc-500"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button type="button" disabled={locked || busy || !valid[step] || photoBusy !== null} onClick={next} className={primaryBtn}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
          {!busy && <Check className="w-3.5 h-3.5" />}
        </button>
      </div>
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

  const firstOpen = done.findIndex((item) => !item);
  const [detailOpen, setDetailOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  const openDetail = (index: number) => {
    setStep(index);
    setDetailOpen(true);
  };

  const markDone = (index: number) => {
    setDone((prev) => prev.map((item, i) => (i === index ? true : item)));
  };

  const task = TASKS[step];
  const completed = done[step];
  const active = !completed && step === firstOpen;
  const taskLocked = locked || (!completed && !active);
  const allDone = done.every(Boolean);

  const finishDay = async () => {
    if (!allDone || completing) return;
    setCompleting(true);
    try {
      const ok = (await props.onCompleteDay(day.id)) !== false;
      if (ok) setDetailOpen(false);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414]">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 border-b border-zinc-100 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Daily Task</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">Daily Reset: 00:00 WIB (UTC+7)</p>
        </div>
        <button
          type="button"
          aria-label="Daily Task Detail"
          onClick={() => openDetail(Math.max(0, firstOpen))}
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 inline-flex items-center justify-center shrink-0"
        >
          <ListTodo className="w-3.5 h-3.5" />
        </button>
      </div>

      <ol className="divide-y divide-zinc-100 dark:divide-white/10">
        {TASKS.map((task, index) => {
          const completed = done[index];
          const active = !completed && index === firstOpen;
          const taskLocked = locked || (!completed && !active);
          return (
            <li
              key={task.title}
              className={`px-3.5 py-3 flex items-center gap-3 ${active ? "bg-zinc-50 dark:bg-white/5" : ""} ${taskLocked && !completed ? "opacity-55" : ""}`}
            >
              <span
                className={`w-6 h-6 rounded-full border text-[11px] font-semibold inline-flex items-center justify-center shrink-0 ${
                  completed
                    ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                    : active
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
                      : "border-zinc-300 text-zinc-400"
                }`}
                aria-hidden
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{task.description}</p>
              </div>
              {completed ? (
                <span className="text-[11px] font-semibold text-zinc-500 shrink-0">Completed</span>
              ) : (
                <button type="button" disabled={taskLocked} onClick={() => openDetail(index)} className={primaryBtn}>
                  Do Task
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] flex flex-col">
            <div className="max-w-lg mx-auto w-full flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold tabular-nums">
                  {step + 1}
                  <span className="text-zinc-400 font-normal"> / {TASKS.length}</span>
                </p>
                <button type="button" onClick={() => setDetailOpen(false)} className={ghostBtn}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </div>
              <section
                className={`rounded-2xl border bg-white dark:bg-[#141414] p-4 space-y-3 ${
                  active ? "border-zinc-950 dark:border-white" : "border-zinc-200 dark:border-white/10"
                } ${taskLocked ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{task.title}</h2>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{task.description}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-500 shrink-0">
                    {completed ? "Completed" : active ? "Active" : "Locked"}
                  </span>
                </div>
                <TaskForm
                  key={`${day.id}-${step}`}
                  day={day}
                  locked={taskLocked}
                  activities={activities}
                  checks={checks}
                  step={step}
                  onAdvance={() => markDone(step)}
                  props={props}
                />
              </section>
            </div>
            <div className="fixed bottom-0 inset-x-0 border-t border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414]">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
                <button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className={ghostBtn}>
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                {step < TASKS.length - 1 ? (
                  <button type="button" disabled={!completed} onClick={() => setStep((current) => Math.min(TASKS.length - 1, current + 1))} className={primaryBtn}>
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button type="button" disabled={!allDone || completing} onClick={finishDay} className={primaryBtn}>
                    {completing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Complete Day
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
