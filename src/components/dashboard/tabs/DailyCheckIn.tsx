"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Moon,
  Pencil,
  Smile,
  Utensils,
  Dumbbell,
} from "lucide-react";
import type { PlanDay } from "./MyPlanTab";

type SaveResult = Promise<void | boolean>;

export interface DailyCheckInProps {
  day: PlanDay;
  locked: boolean;
  activities: string[];
  checks: string[];
  initialDone: [boolean, boolean, boolean, boolean];
  onToggleCheck: (task: string) => Promise<void> | void;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number) => SaveResult;
  onSaveAttendance: (notes: string) => SaveResult;
  onSaveWorkoutNotes: (notes: string) => SaveResult;
  onUploadPhoto: (type: "before" | "after", url: string) => SaveResult;
  onSaveMeal: (compliance: string, notes: string) => SaveResult;
  onSaveReflection: (reflection: string, happiness: number) => SaveResult;
}

const STEPS = [
  { title: "Sleep Schedule", description: "Log when you went to bed and when you woke up.", Icon: Moon },
  { title: "Training & Progress Photos", description: "Tell us what you trained and add your progress photos.", Icon: Dumbbell },
  { title: "Food & Nutrition", description: "Record what you ate today.", Icon: Utensils },
  { title: "Daily Review", description: "Reflect on your day in a few words.", Icon: Smile },
] as const;

const glassCls =
  "relative overflow-hidden rounded-[28px] bg-gradient-to-br from-white/80 via-white/50 to-zinc-200/60 dark:from-white/10 dark:via-white/5 dark:to-white/[0.02] backdrop-blur-xl border border-white/70 dark:border-white/15 shadow-lg shadow-zinc-900/5 p-5 sm:p-6 space-y-5";

function Blobs() {
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 w-60 h-60 rounded-full bg-zinc-400/25 dark:bg-white/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-12 w-64 h-64 rounded-full bg-zinc-900/10 dark:bg-white/5 blur-3xl" />
    </>
  );
}

const fieldCls =
  "w-full px-3.5 py-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-500 disabled:opacity-50";
const primaryBtn =
  "px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-40 inline-flex items-center justify-center gap-2 active:scale-95 transition";
const ghostBtn =
  "px-4 py-2.5 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-95 transition";

/* ---------- helpers ---------- */

function sleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

function formatDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function parseMeals(text: string | null | undefined): string[] {
  const out: string[] = [];
  if (!text) return out;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^(breakfast|lunch|dinner|snacks?)\b[:\-\s]*(.*)$/i);
    const body = (heading ? heading[2] : line).replace(/^[\s\-*–—\d.)]+/, "").trim();
    if (body) out.push(heading ? `${heading[1][0].toUpperCase()}${heading[1].slice(1).toLowerCase()}: ${body}` : body);
  }
  return out;
}

interface MealDraft {
  followed: boolean | null;
  checked: string[];
  actual: string;
}

function readMealDraft(compliance: string | null | undefined, notes: string | null | undefined): MealDraft {
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as Partial<MealDraft> & { v?: number };
      if (parsed && parsed.v === 1) {
        return {
          followed: typeof parsed.followed === "boolean" ? parsed.followed : compliance === "FULL" ? true : compliance ? false : null,
          checked: Array.isArray(parsed.checked) ? parsed.checked.filter((x) => typeof x === "string") : [],
          actual: typeof parsed.actual === "string" ? parsed.actual : "",
        };
      }
    } catch {
      /* plain text notes */
    }
  }
  if (compliance === "FULL") return { followed: true, checked: [], actual: "" };
  if (compliance) return { followed: false, checked: [], actual: notes || "" };
  return { followed: null, checked: [], actual: notes || "" };
}

interface AttendDraft {
  attended: "yes" | "no" | null;
  learned: string;
  reason: string;
}

function readAttend(raw: string | null | undefined): AttendDraft {
  if (!raw) return { attended: null, learned: "", reason: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<AttendDraft> & { v?: number };
    if (parsed && parsed.v === 1) {
      return {
        attended: parsed.attended === "yes" || parsed.attended === "no" ? parsed.attended : null,
        learned: parsed.learned || "",
        reason: parsed.reason || "",
      };
    }
  } catch {
    /* legacy free text */
  }
  return { attended: "yes", learned: raw, reason: "" };
}

function compressImageFile(file: File, maxDim = 960, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      if (!raw) return reject(new Error("Empty image data."));
      const img = new window.Image();
      img.onerror = () => reject(new Error("Unsupported image. Please choose a JPG, PNG or WebP photo."));
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

function PhotoSlot({
  label,
  url,
  busy,
  disabled,
  onPick,
}: {
  label: string;
  url: string | null | undefined;
  busy: boolean;
  disabled: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label
      className={`relative block aspect-[3/4] rounded-2xl overflow-hidden border-2 border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-white/5 ${
        disabled ? "opacity-60" : "cursor-pointer hover:border-zinc-500 dark:hover:border-white/40"
      } transition`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${label} photo`} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
          <ImagePlus className="w-6 h-6" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">Add photo</span>
        </span>
      )}
      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
      {url && !busy && (
        <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center">
          <Camera className="w-4 h-4" />
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        disabled={disabled || busy}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onPick(file);
        }}
      />
    </label>
  );
}

/* ---------- widget ---------- */

export function DailyCheckIn(props: DailyCheckInProps) {
  const { day, locked, activities, checks, initialDone } = props;
  const progress = day.userProgress;

  const [done, setDone] = useState<boolean[]>([...initialDone]);
  const initialKey = initialDone.join(",");
  useEffect(() => {
    setDone((prev) => prev.map((v, i) => v || initialDone[i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  const firstOpen = done.findIndex((d) => !d);
  const [step, setStep] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // drafts (kept while navigating between steps)
  const [bed, setBed] = useState(progress?.bedtime || "");
  const [wake, setWake] = useState(progress?.wakeTime || "");
  const [notes, setNotes] = useState(progress?.workoutNotes || "");
  const [attend, setAttend] = useState<AttendDraft>(() => readAttend(progress?.eventFeedback));
  const [photos, setPhotos] = useState<{ before: string | null; after: string | null }>({
    before: progress?.photoBeforeUrl || null,
    after: progress?.photoAfterUrl || null,
  });
  const [photoBusy, setPhotoBusy] = useState<"before" | "after" | null>(null);
  const [meal, setMeal] = useState<MealDraft>(() => readMealDraft(progress?.mealCompliance, progress?.mealNotes));
  const [review, setReview] = useState(progress?.dailyReflection || "");
  const [score, setScore] = useState(progress?.happinessRate || 0);

  const isTraining = day.dayType === "TRAINING_DAY";
  const isRest = day.dayType === "REST_DAY";
  const isConnect = !isTraining && !isRest;
  const recommended = useMemo(() => parseMeals(day.mealRecommendation), [day.mealRecommendation]);

  const isChecked = (name: string) => checks.some((c) => c === name || c.toLowerCase().includes(name.toLowerCase()));
  const anyActivityChecked = activities.some(isChecked);

  const valid: boolean[] = [
    !!bed && !!wake,
    isConnect
      ? attend.attended === "yes"
        ? attend.learned.trim().length > 0
        : attend.attended === "no"
      : anyActivityChecked || notes.trim().length > 0,
    meal.followed === true
      ? meal.checked.length > 0 || meal.actual.trim().length > 0 || recommended.length === 0
      : meal.followed === false && meal.actual.trim().length > 1,
    review.trim().length >= 3 && score > 0,
  ];

  const allDone = done.every(Boolean);
  const showSummary = allDone && !editing;
  const canGo = (target: number) => !locked && done.slice(0, target).every(Boolean);

  const go = (target: number) => {
    setDir(target >= step ? "fwd" : "back");
    setError(null);
    setStep(target);
  };

  const persist = async (): Promise<boolean> => {
    if (step === 0) {
      return (await props.onSaveSleep(bed, wake, sleepMinutes(bed, wake))) !== false;
    }
    if (step === 1) {
      if (isConnect) {
        return (await props.onSaveAttendance(JSON.stringify({ v: 1, ...attend, feedback: "" }))) !== false;
      }
      if (notes.trim() !== (progress?.workoutNotes || "").trim()) {
        return (await props.onSaveWorkoutNotes(notes.trim())) !== false;
      }
      return true;
    }
    if (step === 2) {
      return (
        (await props.onSaveMeal(
          meal.followed ? "FULL" : "OFF_TRACK",
          JSON.stringify({ v: 1, followed: meal.followed, checked: meal.checked, actual: meal.actual.trim() })
        )) !== false
      );
    }
    return (await props.onSaveReflection(review.trim(), score)) !== false;
  };

  const next = async () => {
    if (locked || busy || !valid[step]) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await persist();
      if (!ok) {
        setError("We could not save this step. Please try again.");
        return;
      }
      setDone((prev) => prev.map((v, i) => (i === step ? true : v)));
      if (editing) {
        setEditing(false);
      } else if (step < STEPS.length - 1) {
        go(step + 1);
      }
    } catch {
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (type: "before" | "after", file: File) => {
    setError(null);
    if (file.size > 15 * 1024 * 1024) {
      setError("That photo is too large. Please choose one under 15 MB.");
      return;
    }
    setPhotoBusy(type);
    try {
      const dataUrl = await compressImageFile(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, type }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success || !json.url) throw new Error(json?.message || "Upload failed.");
      const ok = (await props.onUploadPhoto(type, json.url)) !== false;
      if (!ok) throw new Error("Could not save the photo.");
      setPhotos((p) => ({ ...p, [type]: json.url as string }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    } finally {
      setPhotoBusy(null);
    }
  };

  /* ---------- completion state ---------- */
  if (showSummary) {
    const summaries = [
      bed && wake ? `${bed} → ${wake} · ${formatDuration(sleepMinutes(bed, wake))}` : "—",
      isConnect
        ? attend.attended === "yes"
          ? "Attended the session"
          : "Did not attend"
        : [
            activities.filter(isChecked).length ? `${activities.filter(isChecked).length} activities done` : null,
            photos.before || photos.after ? "Photos added" : null,
            notes.trim() ? "Notes added" : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—",
      meal.followed ? "Followed the meal plan" : "Logged own meals",
      score ? `Mood ${score}/10 · ${review.trim().slice(0, 48)}${review.trim().length > 48 ? "…" : ""}` : "—",
    ];
    return (
      <section className={glassCls}>
        <Blobs />
        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-lg font-medium text-zinc-950 dark:text-white">Check-in complete</h3>
            <p className="text-xs text-zinc-500">All 4 tasks for Day {day.dayNumber} are submitted. See you tomorrow.</p>
          </div>
        </div>
        <ul className="relative divide-y divide-zinc-900/10 dark:divide-white/10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="py-3 flex items-center gap-3">
              <s.Icon className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider text-zinc-500">{s.title}</p>
                <p className="text-sm text-zinc-950 dark:text-white truncate">{summaries[i]}</p>
              </div>
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setEditing(true);
                  go(i);
                }}
                className="shrink-0 p-2 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 disabled:opacity-30"
                aria-label={`Edit ${s.title}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {locked && <p className="text-xs text-zinc-500">Submission is closed for this day, so answers are read-only.</p>}
      </section>
    );
  }

  const meta = STEPS[step];
  const lastStep = step === STEPS.length - 1;

  return (
    <section className={glassCls}>
      <Blobs />
      <style>{`
        @keyframes ci-in-fwd { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: none; } }
        @keyframes ci-in-back { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: none; } }
        .ci-fwd { animation: ci-in-fwd .28s ease-out both; }
        .ci-back { animation: ci-in-back .28s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .ci-fwd, .ci-back { animation: none; } }
      `}</style>

      {/* step indicator */}
      <div className="relative space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Daily check-in</p>
          <p className="text-[11px] font-semibold text-zinc-500 tabular-nums">
            {step + 1} of {STEPS.length}
            {editing ? " · editing" : ""}
          </p>
        </div>
        <ol className="flex gap-1.5" aria-label="Check-in steps">
          {STEPS.map((s, i) => {
            const reachable = canGo(i) && !editing;
            return (
              <li key={s.title} className="flex-1">
                <button
                  type="button"
                  disabled={!reachable && i !== step}
                  onClick={() => reachable && go(i)}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  aria-current={i === step ? "step" : undefined}
                  className={`block w-full h-1.5 rounded-full transition-colors ${
                    i === step ? "bg-zinc-950 dark:bg-white" : done[i] ? "bg-zinc-500" : "bg-zinc-200 dark:bg-white/15"
                  }`}
                />
              </li>
            );
          })}
        </ol>
        <p className="text-[11px] text-zinc-500">
          {editing ? "Update your answer, then save." : `${STEPS.length - step - 1} step${STEPS.length - step - 1 === 1 ? "" : "s"} left after this one`}
        </p>
      </div>

      <div key={`${step}-${editing}`} className={`relative ${dir === "fwd" ? "ci-fwd" : "ci-back"} space-y-5`}>
        <div>
          <h3 className="text-xl font-medium text-zinc-950 dark:text-white flex items-center gap-2">
            <meta.Icon className="w-5 h-5 text-zinc-500" /> {meta.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">{meta.description}</p>
        </div>

        {locked && (
          <p className="text-xs rounded-xl bg-zinc-100 dark:bg-white/10 px-3 py-2 text-zinc-600 dark:text-zinc-300">
            {!day.isCalendarUnlocked ? "This day is not open yet." : "Submission is closed for this day."}
          </p>
        )}

        {step === 0 && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Bedtime
              <input type="time" value={bed} disabled={locked} onChange={(e) => setBed(e.target.value)} className={`${fieldCls} mt-1.5`} />
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Wake-up time
              <input type="time" value={wake} disabled={locked} onChange={(e) => setWake(e.target.value)} className={`${fieldCls} mt-1.5`} />
            </label>
            {bed && wake && (
              <p className="col-span-2 text-sm text-zinc-600 dark:text-zinc-300">
                Total sleep: <span className="font-semibold text-zinc-950 dark:text-white">{formatDuration(sleepMinutes(bed, wake))}</span>
              </p>
            )}
          </div>
        )}

        {step === 1 && !isConnect && (
          <div className="space-y-5">
            {activities.length > 0 && (
              <ul className="space-y-2">
                {activities.map((name) => (
                  <li key={name}>
                    <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 px-3.5 py-3 text-sm">
                      <input type="checkbox" disabled={locked} checked={isChecked(name)} onChange={() => props.onToggleCheck(name)} />
                      <span>{name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {activities.length > 0 ? "Anything else you did? (optional)" : "What training did you complete?"}
              <textarea
                value={notes}
                disabled={locked}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. 30 min strength, 5 km walk"
                className={`${fieldCls} mt-1.5`}
              />
            </label>
            {isTraining && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Progress photos (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <PhotoSlot label="Before" url={photos.before} busy={photoBusy === "before"} disabled={locked} onPick={(f) => pickPhoto("before", f)} />
                  <PhotoSlot label="After" url={photos.after} busy={photoBusy === "after"} disabled={locked} onPick={(f) => pickPhoto("after", f)} />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && isConnect && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4 space-y-1">
              <p className="text-base font-medium text-zinc-950 dark:text-white">{day.eventTitle || day.title}</p>
              {day.onsiteSchedule && <p className="text-xs text-zinc-500">{day.onsiteSchedule}</p>}
              {day.eventDetails && <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{day.eventDetails}</p>}
            </div>
            <fieldset className="flex gap-2">
              <legend className="sr-only">Did you attend today&apos;s session?</legend>
              {(["yes", "no"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={locked}
                  aria-pressed={attend.attended === opt}
                  onClick={() => setAttend((d) => ({ ...d, attended: opt }))}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition ${
                    attend.attended === opt
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {opt === "yes" ? "I attended" : "I could not attend"}
                </button>
              ))}
            </fieldset>
            {attend.attended === "yes" && (
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                What did you learn?
                <textarea value={attend.learned} disabled={locked} onChange={(e) => setAttend((d) => ({ ...d, learned: e.target.value }))} rows={3} className={`${fieldCls} mt-1.5`} />
              </label>
            )}
            {attend.attended === "no" && (
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Reason (optional)
                <textarea value={attend.reason} disabled={locked} onChange={(e) => setAttend((d) => ({ ...d, reason: e.target.value }))} rows={3} className={`${fieldCls} mt-1.5`} />
              </label>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {recommended.length > 0 && (
              <div className="rounded-2xl bg-zinc-50 dark:bg-white/5 px-4 py-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">Coach recommendation</p>
                {recommended.map((m) => (
                  <p key={m} className="text-sm text-zinc-800 dark:text-zinc-200">{m}</p>
                ))}
              </div>
            )}
            <fieldset className="flex gap-2">
              <legend className="sr-only">Did you follow the meal recommendation?</legend>
              {([true, false] as const).map((opt) => (
                <button
                  key={String(opt)}
                  type="button"
                  disabled={locked}
                  aria-pressed={meal.followed === opt}
                  onClick={() => setMeal((d) => ({ ...d, followed: opt }))}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border transition ${
                    meal.followed === opt
                      ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950"
                      : "border-zinc-200 dark:border-white/15 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {opt ? "I followed the plan" : "I ate something else"}
                </button>
              ))}
            </fieldset>
            {meal.followed === true && recommended.length > 0 && (
              <ul className="space-y-2">
                {recommended.map((m) => (
                  <li key={m}>
                    <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 px-3.5 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={meal.checked.includes(m)}
                        onChange={() =>
                          setMeal((d) => ({ ...d, checked: d.checked.includes(m) ? d.checked.filter((x) => x !== m) : [...d.checked, m] }))
                        }
                      />
                      <span>{m}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {meal.followed !== null && (
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {meal.followed ? "Extra notes (optional)" : "What did you eat today?"}
                <textarea
                  value={meal.actual}
                  disabled={locked}
                  onChange={(e) => setMeal((d) => ({ ...d, actual: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                  placeholder="Breakfast, lunch, dinner, snacks…"
                  className={`${fieldCls} mt-1.5`}
                />
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              How was your day?
              <textarea
                value={review}
                disabled={locked}
                onChange={(e) => setReview(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="A few honest words about today"
                className={`${fieldCls} mt-1.5`}
              />
            </label>
            <div>
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">How happy are you today?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={locked}
                    aria-pressed={score === n}
                    onClick={() => setScore(n)}
                    className={`w-9 h-9 rounded-full text-sm font-semibold transition ${
                      score === n ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 scale-110" : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          {editing ? (
            <button type="button" onClick={() => setEditing(false)} className={ghostBtn}>
              Cancel
            </button>
          ) : (
            <button type="button" disabled={step === 0 || busy} onClick={() => go(step - 1)} className={ghostBtn}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
          <button type="button" disabled={locked || busy || !valid[step] || photoBusy !== null} onClick={next} className={primaryBtn}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {editing ? (
              <>
                Save <Check className="w-3.5 h-3.5" />
              </>
            ) : lastStep ? (
              <>
                Submit <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Next <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
