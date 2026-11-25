"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Calendar,
  Check,
  Compass,
  Droplets,
  Flame,
  Footprints,
  Loader2,
  Lock,
  Moon,
  Plus,
  Scale,
  Sparkles,
  Trash2,
  TrendingUp,
  Utensils,
} from "lucide-react";
import type { DailyLogDTO } from "@/wellness/services/daily-log";
import type { TrackingAccessStatusDTO } from "@/wellness/services/tracking-entitlement";
import type { TrackingPassPlanDTO } from "@/wellness/actions/tracking-pass";
import {
  computeDailyCaloriesSummary,
  computeExtraWorkoutKcal,
  computePersonalizedCalorieTarget,
  computeSafeSleepMinutes,
  computeStepsBurnedKcal,
  type ExtraWorkoutPreset,
} from "@/wellness/utils/wellness-metrics";
import { addWibDays, formatDateOnlyKey, parseWibDateKey } from "@/wellness/utils/timezone";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import type { BodyMetricPoint } from "../BodyProgressWidget";
import type { MyPlanIndexItem } from "./myPlanUtils";

type ExtraWorkoutActivityType = ExtraWorkoutPreset["id"];

const ACTIVITY_TYPES: ReadonlyArray<{ id: ExtraWorkoutActivityType; label: string }> = [
  { id: "run", label: "Run / Jog" },
  { id: "strength", label: "Strength" },
  { id: "hiit", label: "HIIT" },
  { id: "cycling", label: "Cycling" },
  { id: "swim", label: "Swim" },
  { id: "mobility", label: "Mobility" },
  { id: "custom", label: "Custom" },
];

function formatSleepLabel(mins: number | null | undefined): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatWibDateHuman(dateKey: string, isId: boolean): string {
  const dt = parseWibDateKey(dateKey);
  if (!dt) return dateKey;
  return new Intl.DateTimeFormat(isId ? "id-ID" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(dt);
}

export function MaintenanceWellnessView({
  trackingAccess,
  todayDateKey,
  dailyLogsByDate,
  bodyMetricLogs,
  trackingPassPlans,
  completedPrograms,
  userGender,
  userAge,
  checkoutLoadingPlanId,
  onSaveSleep,
  onSaveWater,
  onSaveSteps,
  onSaveMeal,
  onAddExtraWorkout,
  onDeleteExtraWorkout,
  onLogSelfBodyWeight,
  onOpenGrowthAnalytics,
  onOpenExplore,
  onSelectTrackingPass,
  onOpenPastProgram,
}: {
  trackingAccess: TrackingAccessStatusDTO;
  todayDateKey: string;
  dailyLogsByDate: Record<string, DailyLogDTO>;
  bodyMetricLogs: BodyMetricPoint[];
  trackingPassPlans: TrackingPassPlanDTO[];
  completedPrograms: MyPlanIndexItem[];
  userGender?: string | null;
  userAge?: number | null;
  checkoutLoadingPlanId?: string | null;
  onSaveSleep: (
    bedtime: string,
    wakeTime: string,
    minutes: number,
    dayId?: string,
    sleepFeeling?: string,
    explicitDateKey?: string
  ) => Promise<boolean>;
  onSaveWater: (
    waterMl: number,
    dayId?: string,
    explicitDateKey?: string
  ) => Promise<boolean>;
  onSaveSteps: (
    stepsCount: number,
    dayId?: string,
    explicitDateKey?: string
  ) => Promise<boolean>;
  onSaveMeal: (
    compliance: string,
    notes: string,
    dayId?: string,
    explicitDateKey?: string
  ) => Promise<boolean>;
  onAddExtraWorkout: (payload: {
    logDate: string;
    activityType: ExtraWorkoutActivityType;
    title: string;
    durationMinutes: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
  }) => Promise<boolean>;
  onDeleteExtraWorkout: (id: string, logDate: string) => Promise<boolean>;
  onLogSelfBodyWeight: (weightKg: number, waistCm?: number | null) => Promise<boolean>;
  onOpenGrowthAnalytics: () => void;
  onOpenExplore: () => void;
  onSelectTrackingPass: (planId: string) => void;
  onOpenPastProgram?: (programId: string) => void;
}) {
  const { locale } = useLocale();
  const isId = locale === "id";
  const canWrite = trackingAccess.canWriteDailyLogs;
  const isExpired = trackingAccess.mode === "EXPIRED_ARCHIVE";

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayDateKey);
  const recentDateKeys = useMemo(() => {
    const base = parseWibDateKey(todayDateKey);
    if (!base) return [todayDateKey];
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      keys.push(formatDateOnlyKey(addWibDays(base, -i)));
    }
    return keys;
  }, [todayDateKey]);

  const editableDateKeys = useMemo(
    () => new Set(recentDateKeys.slice(0, 2)),
    [recentDateKeys]
  );
  const isSelectedDateEditable = canWrite && editableDateKeys.has(selectedDateKey);

  const currentLog = dailyLogsByDate[selectedDateKey] ?? null;

  // Editors visibility
  const [openEditor, setOpenEditor] = useState<
    null | "sleep" | "water" | "steps" | "meal" | "workout" | "weight"
  >(null);
  const [saving, setSaving] = useState(false);

  // Sleep draft
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:00");
  const [sleepFeeling, setSleepFeeling] = useState("Fresh & Energized");

  // Water draft
  const [waterDraftMl, setWaterDraftMl] = useState(2000);

  // Steps draft
  const [stepsDraft, setStepsDraft] = useState(8000);

  // Self-Guided Meal draft
  const [mealsCount, setMealsCount] = useState(3);
  const [carbsG, setCarbsG] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [fatG, setFatG] = useState("");
  const [caloriesManual, setCaloriesManual] = useState("");
  const [mealFeeling, setMealFeeling] = useState("Satisfied & Energized");

  // Extra workout draft
  const [woType, setWoType] = useState<ExtraWorkoutActivityType>("run");
  const [woTitle, setWoTitle] = useState("Morning Run");
  const [woMins, setWoMins] = useState("30");
  const [woCustomKcal, setWoCustomKcal] = useState("");
  const [woExcludeNet, setWoExcludeNet] = useState(false);

  // Self Weight draft
  const [weightInput, setWeightInput] = useState("");
  const [waistInput, setWaistInput] = useState("");

  const latestWeight = useMemo(() => {
    const sorted = [...bodyMetricLogs]
      .filter((m) => typeof m.weightKg === "number" && m.weightKg > 20)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return sorted[0]?.weightKg ?? null;
  }, [bodyMetricLogs]);

  const latestHeight = useMemo(() => {
    const sorted = [...bodyMetricLogs]
      .filter((m) => typeof m.heightCm === "number" && m.heightCm > 100)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
    return sorted[0]?.heightCm ?? null;
  }, [bodyMetricLogs]);

  const calorieTarget = useMemo(
    () =>
      computePersonalizedCalorieTarget({
        gender: userGender,
        age: userAge,
        weightKg: latestWeight,
        heightCm: latestHeight,
      }),
    [userGender, userAge, latestWeight, latestHeight]
  );

  const calSummary = useMemo(
    () =>
      computeDailyCaloriesSummary({
        foodKcal: currentLog?.caloriesKcal ?? 0,
        stepsCount: currentLog?.stepsCount ?? 0,
        stepsBurnedKcal: currentLog?.stepsBurnedKcal ?? 0,
        extraWorkouts: currentLog?.extraWorkouts ?? [],
      }),
    [currentLog]
  );

  const openPanel = (panel: "sleep" | "water" | "steps" | "meal" | "workout" | "weight") => {
    // Weight is always logged for today; daily logs (sleep/water/steps/meal/workout) only editable for Today & Yesterday (H-1)
    if (!canWrite) return;
    if (panel !== "weight" && !isSelectedDateEditable) return;
    if (openEditor === panel) {
      setOpenEditor(null);
      return;
    }
    if (panel === "sleep") {
      setBedtime(currentLog?.bedtime || "22:30");
      setWakeTime(currentLog?.wakeTime || "06:00");
      setSleepFeeling(currentLog?.sleepFeeling || "Fresh & Energized");
    } else if (panel === "water") {
      setWaterDraftMl(currentLog?.waterMl || 0);
    } else if (panel === "steps") {
      setStepsDraft(currentLog?.stepsCount || 0);
    } else if (panel === "meal") {
      setMealsCount(currentLog?.mealsCount || 3);
      setCarbsG(currentLog?.carbsG ? String(currentLog.carbsG) : "");
      setProteinG(currentLog?.proteinG ? String(currentLog.proteinG) : "");
      setFatG(currentLog?.fatG ? String(currentLog.fatG) : "");
      setCaloriesManual(currentLog?.caloriesKcal ? String(currentLog.caloriesKcal) : "");
      setMealFeeling(currentLog?.mealFeeling || "Satisfied & Energized");
    } else if (panel === "weight") {
      setWeightInput(latestWeight ? String(latestWeight) : "");
      setWaistInput("");
    }
    setOpenEditor(panel);
  };

  const handleSleepSubmit = async () => {
    const mins = computeSafeSleepMinutes(bedtime, wakeTime);
    if (mins <= 0) return;
    setSaving(true);
    try {
      const ok = await onSaveSleep(bedtime, wakeTime, mins, undefined, sleepFeeling, selectedDateKey);
      if (ok) setOpenEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const handleWaterSubmit = async (ml: number) => {
    setSaving(true);
    try {
      const ok = await onSaveWater(Math.max(0, Math.min(15000, ml)), undefined, selectedDateKey);
      if (ok) setOpenEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const handleStepsSubmit = async (steps: number) => {
    setSaving(true);
    try {
      const ok = await onSaveSteps(Math.max(0, Math.min(100000, steps)), undefined, selectedDateKey);
      if (ok) setOpenEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const handleMealSubmit = async () => {
    const c = Math.max(0, Math.round(Number(carbsG) || 0));
    const p = Math.max(0, Math.round(Number(proteinG) || 0));
    const f = Math.max(0, Math.round(Number(fatG) || 0));
    const macroKcal = Math.round(c * 4 + p * 4 + f * 9);
    const manualKcal = Math.max(0, Math.round(Number(caloriesManual) || 0));
    const finalKcal = manualKcal > 0 ? manualKcal : macroKcal;
    if (finalKcal <= 0 && c <= 0 && p <= 0 && f <= 0) {
      return;
    }

    const payload = JSON.stringify({
      mealsCount: Math.max(1, Math.min(6, Math.round(mealsCount || 3))),
      mealFeeling,
      calories: finalKcal,
      carbsG: c,
      proteinG: p,
      fatG: f,
      mealEntries: [
        {
          status: "self_logged",
          calories: finalKcal,
          carbsG: c,
          proteinG: p,
          fatG: f,
        },
      ],
    });
    setSaving(true);
    try {
      const ok = await onSaveMeal("SELF_LOGGED", payload, undefined, selectedDateKey);
      if (ok) setOpenEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const handleWorkoutSubmit = async () => {
    const mins = Math.max(1, Math.min(360, Math.round(Number(woMins) || 30)));
    const customKcalNum = woCustomKcal.trim()
      ? Math.min(3500, Math.round(Number(woCustomKcal)))
      : null;
    setSaving(true);
    try {
      const ok = await onAddExtraWorkout({
        logDate: selectedDateKey,
        activityType: woType,
        title: woTitle.trim() || "Extra Workout",
        durationMinutes: mins,
        customKcal: customKcalNum && customKcalNum > 0 ? customKcalNum : null,
        excludeFromNetBurn: woExcludeNet,
      });
      if (ok) {
        setWoCustomKcal("");
        setWoExcludeNet(false);
        setOpenEditor(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleWeightSubmit = async () => {
    const w = Number(weightInput);
    if (!Number.isFinite(w) || w < 20 || w > 300) return;
    const waist = waistInput.trim() ? Number(waistInput) : null;
    setSaving(true);
    try {
      const ok = await onLogSelfBodyWeight(
        w,
        waist && Number.isFinite(waist) && waist >= 40 && waist <= 200 ? waist : null
      );
      if (ok) setOpenEditor(null);
    } finally {
      setSaving(false);
    }
  };

  const primaryPassPlan = trackingPassPlans[0] ?? null;
  const expiryLabel = trackingAccess.trackingAccessUntil
    ? new Intl.DateTimeFormat(isId ? "id-ID" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(new Date(trackingAccess.trackingAccessUntil))
    : null;

  return (
    <div className="w-full space-y-5 pb-16">
      {/* 1. Status Hero Banner */}
      <section className="rounded-3xl p-5 sm:p-6 bg-zinc-950 text-white dark:bg-zinc-900 border border-zinc-800 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white/90">
              {isExpired ? (
                <>
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>{isId ? "Arsip Read-Only" : "Read-Only Archive"}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>
                    {isId
                      ? `Tracking Aktif · Sisa ${trackingAccess.daysRemaining} hari`
                      : `Active Tracking · ${trackingAccess.daysRemaining} days left`}
                  </span>
                </>
              )}
            </span>
            <h1 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight pt-1">
              {isExpired
                ? isId
                  ? "Masa Tracking Telah Berakhir"
                  : "Your Tracking Window Ended"
                : isId
                  ? "Daily Wellness Tracker"
                  : "Daily Wellness Tracker"}
            </h1>
            <p className="text-xs text-white/70 leading-relaxed max-w-lg">
              {isExpired
                ? isId
                  ? "Semua data 1 tahun & program selesai tetap bisa dilihat kapan saja. Perpanjang akses untuk mulai mencatat harian lagi."
                  : "Your 1-year growth data & past cohorts remain viewable anytime. Renew below to resume daily logging."
                : expiryLabel
                  ? isId
                    ? `Akses aktif hingga ${expiryLabel}. Catat tidur, air, langkah, nutrisi, dan latihan mandiri untuk menjaga konsistensimu.`
                    : `Access active until ${expiryLabel}. Log sleep, hydration, steps, nutrition, and workouts to maintain your momentum.`
                  : isId
                    ? "Catat tidur, hidrasi, langkah, nutrisi, dan latihan harianmu di satu tempat."
                    : "Track your daily sleep, hydration, steps, nutrition, and extra workouts in one place."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onOpenGrowthAnalytics}
            className="px-4 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isId ? "Analitik 1 Tahun" : "1-Year Growth Analytics"}</span>
          </button>
          <button
            type="button"
            onClick={onOpenExplore}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isId ? "Lihat Program Coach" : "Explore Coach Programs"}</span>
          </button>
        </div>
      </section>

      {/* 2. Renewal 2-Option Decoy Pricing Card (Prominent when Expired) */}
      {isExpired && (
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 px-1">
            {isId ? "Pilih Cara Melanjutkan" : "Choose How to Continue"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Option 1: Guided Coach Program (BEST VALUE) */}
            <div className="p-5 rounded-3xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200 shadow-md flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 dark:bg-emerald-600/15 dark:text-emerald-700 text-[10px] font-mono font-semibold uppercase tracking-wider">
                    BEST VALUE
                  </span>
                  <span className="text-xs font-mono opacity-80">14D + 2 Mo App</span>
                </div>
                <h3 className="text-base font-geometric font-semibold leading-snug">
                  {isId
                    ? "Program Guided Coach + Bonus 2 Bulan App"
                    : "Guided Coach Program + 2 Months Bonus App"}
                </h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  {isId
                    ? "Ikut program terstruktur bersama Coach (video latihan, meal plan, komunitas) + otomatis dapat 60 hari tracking maintenance."
                    : "Join a structured Coach cohort (video workouts, meal guide, community) + automatically unlock 60 bonus maintenance days."}
                </p>
              </div>
              <div className="space-y-3 pt-2 border-t border-white/15 dark:border-zinc-950/15">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-[11px] opacity-75">{isId ? "Mulai dari" : "Starting at"}</span>
                  <span className="text-lg font-bold">Rp 500.000</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenExplore}
                  className="w-full py-2.5 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <span>{isId ? "Pilih Program Coach" : "Browse Coach Programs"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Option 2: Standalone 6-Month Tracking Pass */}
            {primaryPassPlan && (
              <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono font-semibold uppercase tracking-wider">
                      {isId ? "MANDIRI" : "INDEPENDENT"}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">
                      {primaryPassPlan.durationDays} {isId ? "Hari" : "Days"}
                    </span>
                  </div>
                  <h3 className="text-base font-geometric font-semibold text-zinc-950 dark:text-white leading-snug">
                    {primaryPassPlan.name}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {primaryPassPlan.description ||
                      (isId
                        ? "Akses penuh kalkulator kalori, makro, tidur, langkah, air, latihan mandiri & analitik 1 tahun tanpa program coach."
                        : "Full independent access to calorie/macro tracker, sleep, water, steps, extra workouts & 1-year analytics.")}
                  </p>
                </div>
                <div className="space-y-3 pt-2 border-t border-zinc-200/70 dark:border-white/10">
                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-[11px] text-zinc-500">
                      ~Rp {Math.round(primaryPassPlan.price / Math.max(1, primaryPassPlan.durationDays / 30)).toLocaleString("id-ID")}/bln
                    </span>
                    <span className="text-lg font-bold text-zinc-950 dark:text-white">
                      Rp {primaryPassPlan.price.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={checkoutLoadingPlanId === primaryPassPlan.id}
                    onClick={() => onSelectTrackingPass(primaryPassPlan.id)}
                    className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoadingPlanId === primaryPassPlan.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    <span>{isId ? "Aktifkan Tracking Pass" : "Activate Tracking Pass"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Active Daily Biomarkers Hub (When canWrite is true) */}
      {canWrite && (
        <section className="space-y-4">
          {/* Last 7 Days Date Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0 mr-1" />
            {recentDateKeys.map((dk) => {
              const active = dk === selectedDateKey;
              const editable = editableDateKeys.has(dk);
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => {
                    setSelectedDateKey(dk);
                    setOpenEditor(null);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-mono whitespace-nowrap transition cursor-pointer inline-flex items-center gap-1 ${
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                      : editable
                        ? "bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 text-zinc-600 dark:text-zinc-300"
                        : "bg-zinc-100/70 dark:bg-white/[0.04] border border-zinc-200/50 dark:border-white/5 text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {!editable && <Lock className="w-2.5 h-2.5 opacity-70" />}
                  <span>
                    {dk === todayDateKey ? (isId ? "Hari Ini" : "Today") : formatWibDateHuman(dk, isId)}
                  </span>
                </button>
              );
            })}
          </div>

          {!isSelectedDateEditable && (
            <div className="px-3.5 py-2 rounded-2xl bg-zinc-100/90 dark:bg-white/[0.05] border border-zinc-200/70 dark:border-white/10 flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isId
                  ? "Mode baca arsip — Anda hanya dapat mengedit log Hari Ini & Kemarin (H-1)."
                  : "Read-only archive date — editing is limited to Today & Yesterday (H-1)."}
              </span>
            </div>
          )}

          {/* Net Calories & Target Strip */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  {isId ? "Kalori Bersih" : "Net Calories"}
                </p>
                <p className="text-base font-geometric font-semibold tabular-nums">
                  {calSummary.hasFoodLogged
                    ? `${calSummary.netKcal.toLocaleString()} kcal`
                    : "—"}
                  <span className="text-xs font-mono font-normal text-zinc-400 ml-1.5">
                    / {calorieTarget.targetKcal} target
                  </span>
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-3">
              <span>In: {calSummary.foodKcal}</span>
              <span>Burn: -{calSummary.totalBurnKcal}</span>
            </div>
          </div>

          {/* 2x3 Biomarker Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Sleep Tile */}
            <button
              type="button"
              onClick={() => openPanel("sleep")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "sleep"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Moon className="w-4 h-4 text-indigo-500" />
                {currentLog?.sleepDurationMinutes ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Tidur" : "Sleep"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {formatSleepLabel(currentLog?.sleepDurationMinutes)}
              </p>
            </button>

            {/* Water Tile */}
            <button
              type="button"
              onClick={() => openPanel("water")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "water"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Droplets className="w-4 h-4 text-sky-500" />
                {(currentLog?.waterMl || 0) >= 2500 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Air Minum" : "Water"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {currentLog?.waterMl ? `${(currentLog.waterMl / 1000).toFixed(2)} L` : "0.0 L"}
              </p>
            </button>

            {/* Steps Tile */}
            <button
              type="button"
              onClick={() => openPanel("steps")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "steps"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Footprints className="w-4 h-4 text-emerald-500" />
                {(currentLog?.stepsCount || 0) >= 8000 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Langkah" : "Daily Steps"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {(currentLog?.stepsCount || 0).toLocaleString()}
              </p>
            </button>

            {/* Meal / Nutrition Tile */}
            <button
              type="button"
              onClick={() => openPanel("meal")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "meal"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Utensils className="w-4 h-4 text-amber-500" />
                {(currentLog?.caloriesKcal || 0) > 0 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : null}
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Nutrisi" : "Nutrition"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {currentLog?.caloriesKcal ? `${currentLog.caloriesKcal} kcal` : "—"}
              </p>
            </button>

            {/* Extra Workout Tile */}
            <button
              type="button"
              onClick={() => openPanel("workout")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "workout"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-4 h-4 text-violet-500" />
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Latihan" : "Workouts"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {(currentLog?.extraWorkouts?.length || 0)}{" "}
                <span className="text-xs font-mono text-zinc-400 font-normal">
                  {isId ? "sesi" : "sessions"}
                </span>
              </p>
            </button>

            {/* Body Weight Tile */}
            <button
              type="button"
              onClick={() => openPanel("weight")}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                openEditor === "weight"
                  ? "border-zinc-950 dark:border-white bg-white dark:bg-[#1a1a1a] shadow-sm"
                  : "border-zinc-200/80 dark:border-white/10 bg-white dark:bg-[#161616]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Scale className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <Plus className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-[11px] text-zinc-500">{isId ? "Berat Badan" : "Weight"}</p>
              <p className="text-base font-geometric font-semibold mt-0.5 tabular-nums">
                {latestWeight ? `${latestWeight} kg` : "—"}
              </p>
            </button>
          </div>

          {/* Inline Active Editor Drawer */}
          {openEditor === "sleep" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <h3 className="text-sm font-semibold">{isId ? "Catat Waktu Tidur" : "Log Sleep"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">{isId ? "Jam Tidur" : "Bedtime"}</span>
                  <input
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">{isId ? "Jam Bangun" : "Wake Time"}</span>
                  <input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
              </div>
              <p className="text-xs font-mono text-zinc-500">
                {isId ? "Durasi" : "Duration"}:{" "}
                <strong className="text-zinc-900 dark:text-white">
                  {formatSleepLabel(computeSafeSleepMinutes(bedtime, wakeTime))}
                </strong>
              </p>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSleepSubmit()}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Simpan Tidur" : "Save Sleep"}
              </button>
            </div>
          )}

          {openEditor === "water" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{isId ? "Catat Air Minum" : "Log Hydration"}</h3>
                <span className="text-sm font-mono font-bold">
                  {(waterDraftMl / 1000).toFixed(2)} L / 2.5 L
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[250, 500, 750, -250].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setWaterDraftMl((v) => Math.max(0, Math.min(15000, v + delta)))}
                    className="py-2 rounded-xl border border-zinc-200 dark:border-white/15 text-xs font-mono font-semibold hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    {delta > 0 ? `+${delta}ml` : `${delta}ml`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleWaterSubmit(waterDraftMl)}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Simpan Air Minum" : "Save Hydration"}
              </button>
            </div>
          )}

          {openEditor === "steps" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{isId ? "Catat Langkah Harian" : "Log Daily Steps"}</h3>
                <span className="text-xs font-mono text-zinc-500">
                  ~{computeStepsBurnedKcal(stepsDraft)} kcal
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={100000}
                value={stepsDraft}
                onChange={(e) => setStepsDraft(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
              />
              <div className="grid grid-cols-3 gap-2">
                {[1000, 2500, 5000].map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setStepsDraft((s) => Math.min(100000, s + inc))}
                    className="py-2 rounded-xl border border-zinc-200 dark:border-white/15 text-xs font-mono font-semibold hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer"
                  >
                    +{inc.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleStepsSubmit(stepsDraft)}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Simpan Langkah" : "Save Steps"}
              </button>
            </div>
          )}

          {openEditor === "meal" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">
                  {isId ? "Catat Nutrisi Mandiri" : "Self-Guided Nutrition Log"}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-mono text-zinc-500 mr-1">
                    {isId ? "Makan:" : "Meals:"}
                  </span>
                  {[1, 2, 3, 4, 5, 6].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setMealsCount(cnt)}
                      className={`w-6 h-6 rounded-full text-[11px] font-mono font-semibold transition cursor-pointer ${
                        mealsCount === cnt
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">Carbs (g)</span>
                  <input
                    type="number"
                    min={0}
                    max={1500}
                    placeholder="180"
                    value={carbsG}
                    onChange={(e) => setCarbsG(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">Protein (g)</span>
                  <input
                    type="number"
                    min={0}
                    max={600}
                    placeholder="110"
                    value={proteinG}
                    onChange={(e) => setProteinG(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">Fat (g)</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    placeholder="55"
                    value={fatG}
                    onChange={(e) => setFatG(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">Calories (kcal)</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    placeholder={String(
                      Math.round(
                        (Number(carbsG) || 0) * 4 +
                          (Number(proteinG) || 0) * 4 +
                          (Number(fatG) || 0) * 9
                      ) || 1650
                    )}
                    value={caloriesManual}
                    onChange={(e) => setCaloriesManual(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={
                  saving ||
                  ((Number(carbsG) || 0) <= 0 &&
                    (Number(proteinG) || 0) <= 0 &&
                    (Number(fatG) || 0) <= 0 &&
                    (Number(caloriesManual) || 0) <= 0)
                }
                onClick={() => void handleMealSubmit()}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Simpan Nutrisi" : "Save Nutrition"}
              </button>
            </div>
          )}

          {openEditor === "workout" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <h3 className="text-sm font-semibold">
                {isId ? "Latihan Tambahan / Mandiri" : "Log Extra Training"}
              </h3>

              {/* Existing workouts for selectedDateKey */}
              {(currentLog?.extraWorkouts?.length || 0) > 0 && (
                <div className="space-y-2">
                  {currentLog!.extraWorkouts.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-100/70 dark:bg-white/[0.04] text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{w.title}</p>
                        <p className="text-[11px] font-mono text-zinc-500">
                          {w.durationMinutes} min · {w.estimatedKcal} kcal
                          {w.excludeFromNetBurn ? " (excluded from net)" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDeleteExtraWorkout(w.id, selectedDateKey)}
                        aria-label="Remove workout"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setWoType(t.id);
                      setWoTitle(t.label);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium cursor-pointer ${
                      woType === t.id
                        ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        : "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">{isId ? "Durasi (menit)" : "Duration (min)"}</span>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={woMins}
                    onChange={(e) => setWoMins(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">
                    {isId ? "Kalori (opsional)" : "Smartwatch kcal (opt)"}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={3500}
                    placeholder={String(computeExtraWorkoutKcal(woType, Number(woMins) || 30, null))}
                    value={woCustomKcal}
                    onChange={(e) => setWoCustomKcal(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={woExcludeNet}
                  onChange={(e) => setWoExcludeNet(e.target.checked)}
                  className="rounded accent-zinc-900 dark:accent-white"
                />
                <span>
                  {isId
                    ? "Sudah terhitung di Steps (jangan kurangi Net Calories dua kali)"
                    : "Already counted in Steps (avoid double-counting burn)"}
                </span>
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleWorkoutSubmit()}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Tambah Latihan" : "Add Workout"}
              </button>
            </div>
          )}

          {openEditor === "weight" && (
            <div className="p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 space-y-4">
              <h3 className="text-sm font-semibold">
                {isId ? "Catat Berat & Lingkar Pinggang" : "Log Body Weight"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">{isId ? "Berat (kg)" : "Weight (kg)"}</span>
                  <input
                    type="number"
                    step="0.1"
                    min={20}
                    max={300}
                    placeholder="65.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-zinc-500 block">
                    {isId ? "Pinggang cm (opsional)" : "Waist cm (opt)"}
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min={40}
                    max={200}
                    placeholder="78"
                    value={waistInput}
                    onChange={(e) => setWaistInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/15 bg-transparent font-mono text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={saving || !weightInput}
                onClick={() => void handleWeightSubmit()}
                className="w-full py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : isId ? "Simpan Pengukuran" : "Save Measurement"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4. Past Completed Programs Archive */}
      {completedPrograms.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-500 px-1">
            {isId ? "Arsip Program Selesai" : "Completed Programs"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completedPrograms.map((p) => (
              <button
                key={p.programId}
                type="button"
                onClick={() => onOpenPastProgram?.(p.programId)}
                className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 text-left flex items-center justify-between gap-3 hover:border-zinc-400 dark:hover:border-white/25 transition cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-geometric font-semibold truncate">{p.title}</p>
                  <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                    {p.completedDays}/{p.totalDays} {isId ? "hari selesai" : "days completed"} · {p.coachName}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
