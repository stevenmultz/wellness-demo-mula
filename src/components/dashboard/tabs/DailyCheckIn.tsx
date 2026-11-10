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
  Lock,
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
  { title: "Sleep", description: "Catat jadwal waktu tidur dan kualitas istirahat Anda." },
  { title: "Daily Routine", description: "Pilih dan selesaikan rangkaian gerakan latihan harian." },
  { title: "Meal", description: "Pencatatan kepatuhan nutrisi dan pola makan hari ini." },
  { title: "Reflection", description: "Evaluasi harian dan tingkat kepuasan ritual fisik & mental." },
] as const;

const FACES = [
  { score: 1, Icon: Angry, label: "Very unsatisfied" },
  { score: 2, Icon: Frown, label: "Unsatisfied" },
  { score: 3, Icon: Meh, label: "Neutral" },
  { score: 4, Icon: Smile, label: "Satisfied" },
  { score: 5, Icon: Laugh, label: "Very satisfied" },
] as const;

const fieldCls =
  "w-full h-11 px-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-sm font-mono text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition disabled:opacity-50";
const areaCls =
  "w-full px-3.5 py-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-white transition disabled:opacity-50 resize-none";
const primaryBtn =
  "h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 active:scale-95 transition shadow-sm";
const ghostBtn =
  "h-9 px-3 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-medium text-zinc-700 dark:text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1 active:scale-95 transition";

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
  onSkip,
  onCloseEdit,
  props,
}: {
  day: PlanDay;
  locked: boolean;
  activities: string[];
  checks: string[];
  step: number;
  onAdvance: () => void;
  onSkip: () => void;
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
    return parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
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
        setError("Tidak dapat menyimpan. Silakan coba lagi.");
        return;
      }
      if (onCloseEdit) onCloseEdit();
      else onAdvance();
    } catch {
      setError("Tidak dapat menyimpan. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (type: "before" | "after", file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError("Ukuran foto maksimal 15 MB.");
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
      if (!res.ok || !json?.success || !json.url) throw new Error(json?.message || "Upload gagal.");
      const ok = (await props.onUploadPhoto(type, json.url, day.id)) !== false;
      if (!ok) throw new Error("Gagal menyimpan foto.");
      setPhotos((p) => ({ ...p, [type]: json.url as string }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
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
      {/* STEP 0: SLEEP (STACKED & CLEAN) */}
      {step === 0 && (
        <div className="space-y-3.5 w-full">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Waktu Tidur (Bedtime)
            </span>
            <input
              type="time"
              value={bed}
              disabled={locked}
              onChange={(e) => setBed(e.target.value)}
              className={fieldCls}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Waktu Bangun (Wake Time)
            </span>
            <input
              type="time"
              value={wake}
              disabled={locked}
              onChange={(e) => setWake(e.target.value)}
              className={fieldCls}
            />
          </label>

          {bed && wake && (
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 dark:text-zinc-400">Total Durasi Tidur</span>
              <span className="font-semibold text-zinc-950 dark:text-white tabular-nums">
                {formatDuration(sleepMinutes(bed, wake))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* STEP 1: DAILY ROUTINE / TRAINING */}
      {step === 1 && !isConnect && (
        <div className="space-y-4">
          {isTraining && videos[0] && (
            <a
              href={videos[0].url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => props.onOpenVideo(day.id)}
              className="flex items-center gap-3 p-2 rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden bg-zinc-50 dark:bg-white/5 hover:border-zinc-400 transition"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={extractVideoThumbnail(videos[0].url, "/coach.jpg")} alt="" className="w-24 h-16 object-cover rounded-lg bg-zinc-200 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-semibold truncate text-zinc-900 dark:text-white">{videos[0].title || day.title}</span>
                <span className="text-[11px] font-mono text-zinc-500 inline-flex items-center gap-1 mt-0.5">
                  Panduan Video <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          )}

          {/* Training Variation Options Selection */}
          {groups.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Pilih Latihan Hari Ini:
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
                        {g.movements.length} Gerakan Checklist
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checklist for Selected Training */}
          {movements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
                  Checklist Gerakan ({movements.filter(isChecked).length}/{movements.length}):
                </span>
              </div>
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

          {/* Photo Check-in */}
          {isTraining && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold block">
                Foto Check-in (Opsional):
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["before", "after"] as const).map((type) => (
                  <label key={type} className="block text-[11px] text-zinc-500">
                    {type === "before" ? "Before Exercise" : "After Exercise"}
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
            placeholder="Tuliskan catatan kehadiran atau feedback sesi komunitas..."
            className={areaCls}
          />
        </label>
      )}

      {/* STEP 2: MEAL */}
      {step === 2 && (
        <div className="space-y-3.5">
          {recommended.length > 0 && (
            <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-xs space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Rekomendasi Menu:</p>
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
              Mengikuti Rekomendasi
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
              Menu Berbeda
            </button>
          </div>
          {meal.followed === false && (
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Catatan Makanan</span>
              <textarea
                value={meal.actual}
                disabled={locked}
                onChange={(e) => setMeal((d) => ({ ...d, actual: e.target.value }))}
                rows={3}
                placeholder="Tuliskan makanan yang Anda konsumsi..."
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
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Evaluasi & Refleksi Harian</span>
            <textarea
              value={review}
              disabled={locked}
              onChange={(e) => setReview(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Bagaimana perasaan, energi, dan kesiapan tubuh Anda hari ini?"
              className={areaCls}
            />
          </label>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Tingkat Kepuasan & Energi Hari Ini</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Tingkat Kepuasan">
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
          onClick={onSkip}
          className="h-10 px-4 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 active:scale-95 transition"
        >
          Skip
        </button>

        <button
          type="button"
          disabled={locked || busy || !valid[step] || photoBusy !== null}
          onClick={next}
          className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 active:scale-95 transition disabled:opacity-40 shadow-sm"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save</span>
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
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

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

  const handleAdvanceStep = () => {
    markDone(step);
    if (step < TASKS.length - 1) {
      setStep((curr) => curr + 1);
    } else {
      setDetailOpen(false);
    }
  };

  const handleSkipStep = () => {
    if (step < TASKS.length - 1) {
      setStep((curr) => curr + 1);
    } else {
      setDetailOpen(false);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden">
      {/* Daily Task Card Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Daily Task</h2>
          <p className="mt-0.5 text-[11px] font-mono text-zinc-500">Daily Reset: 00:00 WIB (UTC+7)</p>
        </div>
        <button
          type="button"
          aria-label="Daily Task Detail"
          onClick={() => openDetail(Math.max(0, firstOpen >= 0 ? firstOpen : 0))}
          className="w-8 h-8 rounded-full border border-zinc-200 dark:border-white/15 inline-flex items-center justify-center shrink-0 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
        >
          <ListTodo className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
        </button>
      </div>

      {/* Task List */}
      <ol className="divide-y divide-zinc-100 dark:divide-white/10">
        {TASKS.map((t, index) => {
          const isDone = done[index];
          const isActive = !isDone && index === firstOpen;
          const isItemLocked = locked || (!isDone && !isActive);
          return (
            <li
              key={t.title}
              className={`px-4 py-3.5 flex items-center gap-3 transition ${isActive ? "bg-zinc-50 dark:bg-white/5" : ""} ${isItemLocked && !isDone ? "opacity-55" : ""}`}
            >
              <span
                className={`w-6 h-6 rounded-full border text-[11px] font-semibold inline-flex items-center justify-center shrink-0 ${
                  isDone
                    ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                    : isActive
                      ? "border-zinc-950 text-zinc-950 dark:border-white dark:text-white"
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
                  className="h-8 px-3 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition inline-flex items-center gap-1 shrink-0"
                >
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isItemLocked}
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

      {/* BOTTOM ACTION: SUBMIT HARI INI */}
      <div className="p-3.5 border-t border-zinc-100 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
        {day.userProgress?.isCompleted ? (
          <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Jurnal Hari Ini Selesai & Terkunci</span>
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
            <span>Submit Hari Ini</span>
          </button>
        )}
      </div>

      {/* TASK DETAIL FULL-SCREEN MODAL */}
      {detailOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] flex flex-col">
            <div className="max-w-lg mx-auto w-full flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-4">
              {/* TOP HEADER: Back button on the LEFT, Task index on the RIGHT */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="h-9 px-3.5 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-100 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <p className="text-xs font-mono font-semibold text-zinc-500 tabular-nums">
                  TASK {step + 1} <span className="font-normal text-zinc-400">/ {TASKS.length}</span>
                </p>
              </div>

              {/* TASK CARD */}
              <section
                className={`rounded-2xl border bg-white dark:bg-[#141414] p-5 space-y-4 shadow-sm ${
                  active ? "border-zinc-950 dark:border-white" : "border-zinc-200 dark:border-white/10"
                } ${taskLocked ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-950 dark:text-white">{task.title}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 shrink-0">
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
                  onAdvance={handleAdvanceStep}
                  onSkip={handleSkipStep}
                  props={props}
                />
              </section>
            </div>

            {/* STICKY BOTTOM NAVIGATION BAR */}
            <div className="fixed bottom-0 inset-x-0 border-t border-zinc-200 dark:border-white/10 bg-white/90 dark:bg-[#141414]/90 backdrop-blur-md">
              <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={step === 0}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className={ghostBtn}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>

                {step < TASKS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.min(TASKS.length - 1, current + 1))}
                    className={ghostBtn}
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDetailOpen(false)}
                    className={ghostBtn}
                  >
                    Close
                  </button>
                )}
              </div>
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
                  Submit & Kunci Task Hari Ini?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Pastikan seluruh task hari ini sudah diisi dengan benar. Setelah disubmit, jurnal hari ini akan terkunci secara permanen.
                </p>
              </div>

              {/* Task Completion Checklist Status */}
              <div className="space-y-2 p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs">
                {TASKS.map((t, i) => (
                  <div key={t.title} className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">{t.title}</span>
                    {done[i] ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-zinc-950 dark:text-white">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Selesai
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-mono text-[11px]">Belum Diisi</span>
                    )}
                  </div>
                ))}
              </div>

              {!allDone && (
                <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-[11px] text-zinc-600 dark:text-zinc-300">
                  <p>Catatan: Masih ada task yang belum diselesaikan. Anda tetap dapat submit jika ingin mengunci hari ini.</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitOpen(false)}
                  disabled={completing}
                  className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  Batal
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
                  <span>Ya, Submit & Kunci</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
