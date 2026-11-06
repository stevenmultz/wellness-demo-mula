"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Angry,
  ArrowLeft,
  Check,
  ExternalLink,
  Frown,
  History,
  Laugh,
  Loader2,
  Meh,
  Pencil,
  Smile,
  X,
} from "lucide-react";
import { extractVideoThumbnail } from "@/wellness/integrations/video-provider";
import { parseDayVideoLinks, parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { formatDateWib } from "./shared";
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
}

const STEP_TITLES = ["Sleep Tracking", "Daily Training", "Meal Recommendation", "Daily Reflection"] as const;

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

function answersOf(day: PlanDay, activities: string[], checks: string[]) {
  const progress = day.userProgress;
  const bed = progress?.bedtime || "";
  const wake = progress?.wakeTime || "";
  const meal = readMealDraft(progress?.mealCompliance, progress?.mealNotes);
  const checked = activities.filter((name) =>
    checks.some((c) => c === name || c.toLowerCase().includes(name.toLowerCase()))
  );
  return [
    { label: "Sleep Duration", value: bed && wake ? formatDuration(sleepMinutes(bed, wake)) : "—" },
    {
      label: "Training Status",
      value: progress?.isCompleted || progress?.videoWatched || checked.length ? "Completed" : "—",
    },
    { label: "Meal", value: meal.followed === true ? "Followed" : meal.followed === false ? meal.actual || "Own meal" : "—" },
    {
      label: "Satisfaction",
      value: progress?.happinessRate ? `${Math.min(5, progress.happinessRate)}/5` : "—",
    },
  ];
}

function TaskForm({
  day,
  locked,
  activities,
  checks,
  step,
  onAdvance,
  onBack,
  onCloseEdit,
  props,
}: {
  day: PlanDay;
  locked: boolean;
  activities: string[];
  checks: string[];
  step: number;
  onAdvance: () => void;
  onBack: () => void;
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
    <div key={step} className="task-shift space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-white">{STEP_TITLES[step]}</h3>
        <span className="text-[11px] tabular-nums text-zinc-400">{step + 1}/4</span>
      </div>

      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
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

      <div className="flex items-center justify-between">
        {onCloseEdit ? (
          <button type="button" onClick={onCloseEdit} className={ghostBtn}>
            Cancel
          </button>
        ) : (
          <button type="button" disabled={step === 0 || busy} onClick={onBack} className={ghostBtn}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        )}
        <button type="button" disabled={locked || busy || !valid[step] || photoBusy !== null} onClick={next} className={primaryBtn}>
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {onCloseEdit ? "Save" : step === 3 ? "Complete" : "Save"}
          {!busy && <Check className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone, pastDays } = props;
  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone((prev) => prev.map((v, i) => v || initialDone[i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const firstOpen = done.findIndex((d) => !d);
  const [step, setStep] = useState(firstOpen === -1 ? 3 : firstOpen);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ day: PlanDay; step: number } | null>(null);

  const allDone = done.every(Boolean);
  const behind = STEP_TITLES.map((title, i) => ({ title, i })).filter((s) => s.i > step && !allDone);

  const advance = () => {
    setDone((prev) => prev.map((v, i) => (i === step ? true : v)));
    setStep((current) => Math.min(3, current + 1));
  };

  const summary = answersOf(day, activities, checks);

  return (
    <section className="space-y-3">
      <style>{`
        @keyframes task-shift { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .task-shift { animation: task-shift .28s ease both; }
        @media (prefers-reduced-motion: reduce) { .task-shift { animation: none; } }
      `}</style>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Daily Task</h2>
        <button type="button" onClick={() => setHistoryOpen(true)} className={ghostBtn}>
          <History className="w-3.5 h-3.5" /> History
        </button>
      </div>

      <div className="relative" style={{ paddingBottom: behind.length ? 28 : 0 }}>
        {behind.map((item, index) => (
          <div
            key={item.title}
            aria-hidden
            className="absolute inset-x-0 h-11 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-900 pointer-events-none"
            style={{ bottom: index * 8, zIndex: behind.length - index, transform: `scale(${1 - (behind.length - index) * 0.015})` }}
          >
            <span className="absolute left-4 bottom-2 text-[11px] text-zinc-400">{item.title}</span>
          </div>
        ))}

        <div className="relative z-10 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4">
          {allDone ? (
            <div className="space-y-3 task-shift">
              <p className="text-sm font-medium">Daily task completed</p>
              <dl className="divide-y divide-zinc-100 dark:divide-white/10">
                {summary.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <dt className="text-zinc-500">{row.label}</dt>
                    <dd className="font-medium text-right truncate">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <TaskForm
              key={`${day.id}-${step}`}
              day={day}
              locked={locked}
              activities={activities}
              checks={checks}
              step={step}
              onAdvance={advance}
              onBack={() => setStep((current) => Math.max(0, current - 1))}
              props={props}
            />
          )}
        </div>
      </div>

      {historyOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
            <button type="button" aria-label="Close history" className="absolute inset-0 bg-black/40" onClick={() => { setHistoryOpen(false); setEdit(null); setDetailId(null); }} />
            <div className="relative w-full sm:max-w-md max-h-[86vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200 dark:border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{edit ? STEP_TITLES[edit.step] : "History"}</h3>
                <button type="button" aria-label="Close" onClick={() => { setHistoryOpen(false); setEdit(null); }} className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 inline-flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {edit ? (
                <TaskForm
                  day={edit.day}
                  locked={false}
                  activities={activitiesFor(edit.day)}
                  checks={checksFor(edit.day)}
                  step={edit.step}
                  onAdvance={() => setEdit(null)}
                  onBack={() => setEdit(null)}
                  onCloseEdit={() => setEdit(null)}
                  props={props}
                />
              ) : pastDays.length === 0 ? (
                <p className="text-sm text-zinc-500 py-6 text-center">No saved daily tasks yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                  {pastDays.map((past) => {
                    const open = detailId === past.id;
                    const rows = answersOf(past, activitiesFor(past), checksFor(past));
                    return (
                      <li key={past.id} className="py-2.5">
                        <button type="button" onClick={() => setDetailId(open ? null : past.id)} className="w-full flex items-center justify-between text-left">
                          <span className="text-sm">Day {past.dayNumber}</span>
                          <span className="text-[11px] text-zinc-500">{formatDateWib(past.unlockDate)}</span>
                        </button>
                        {open && (
                          <dl className="mt-2 space-y-1.5">
                            {rows.map((row, i) => (
                              <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                                <dt className="text-zinc-500">{row.label}</dt>
                                <dd className="flex items-center gap-2 font-medium">
                                  <span className="truncate max-w-[140px]">{row.value}</span>
                                  <button type="button" aria-label={`Edit ${row.label}`} onClick={() => setEdit({ day: past, step: i })} className="text-zinc-400">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </dd>
                              </div>
                            ))}
                            {past.userProgress?.dailyReflection && (
                              <p className="text-xs text-zinc-500 pt-1">{past.userProgress.dailyReflection}</p>
                            )}
                          </dl>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

function activitiesFor(day: PlanDay): string[] {
  if (day.dayType === "REST_DAY") {
    return (day.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);
  }
  if (day.dayType !== "TRAINING_DAY") return [];
  const groups = parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  const selected = day.userProgress?.selectedWorkout || groups[0]?.optionName;
  const group = groups.find((g) => g.optionName === selected) || groups[0];
  return (group?.movements || []).map((m) => m.name);
}

function checksFor(day: PlanDay): string[] {
  if (!day.userProgress?.checklistCompleted) return [];
  try {
    const parsed = JSON.parse(day.userProgress.checklistCompleted);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
