"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Droplets,
  Flame,
  Footprints,
  Loader2,
  Lock,
  Moon,
  Scale,
  TrendingUp,
  X,
} from "lucide-react";
import { wellnessGetGrowthAnalytics } from "@/wellness/actions/daily-log";
import type { GrowthAnalyticsPayload, GrowthSeriesPoint } from "@/wellness/services/daily-log";
import type { TrackingAccessStatusDTO } from "@/wellness/services/tracking-entitlement";
import { useLocale } from "@/wellness/i18n/LocaleContext";

type GrowthRange = "30d" | "90d" | "1y";

function formatSleepHrs(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function MiniBarChart({
  points,
  valueOf,
  maxFallback,
  goalLine,
  barColor,
}: {
  points: GrowthSeriesPoint[];
  valueOf: (p: GrowthSeriesPoint) => number;
  maxFallback: number;
  goalLine?: number;
  barColor: string;
}) {
  if (points.length === 0) {
    return (
      <div className="h-24 rounded-xl bg-zinc-100/70 dark:bg-white/[0.03] flex items-center justify-center text-[11px] font-mono text-zinc-400">
        No data yet
      </div>
    );
  }

  const values = points.map(valueOf);
  const maxVal = Math.max(maxFallback, goalLine || 0, ...values, 1);
  const goalPct = goalLine ? Math.min(100, Math.round((goalLine / maxVal) * 100)) : null;

  return (
    <div className="space-y-1.5">
      <div className="relative h-24 rounded-xl bg-zinc-100/70 dark:bg-white/[0.03] px-2 pt-3 pb-1.5 flex items-end gap-[3px] overflow-hidden">
        {goalPct !== null && (
          <div
            style={{ bottom: `${Math.max(8, Math.min(92, goalPct))}%` }}
            className="absolute inset-x-0 border-t border-dashed border-zinc-400/50 dark:border-white/20 pointer-events-none"
          />
        )}
        {points.map((pt) => {
          const val = valueOf(pt);
          const heightPct = val > 0 ? Math.max(8, Math.round((val / maxVal) * 100)) : 3;
          return (
            <div
              key={pt.bucketKey}
              title={`${pt.label}: ${val.toLocaleString()}`}
              className="flex-1 min-w-[3px] h-full flex items-end"
            >
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-t-sm transition-all ${
                  val > 0 ? barColor : "bg-zinc-200 dark:bg-white/10"
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span>{points[0]?.label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)]?.label}</span>}
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function WeightSparkline({ series }: { series: Array<{ date: string; weightKg: number }> }) {
  if (series.length === 0) {
    return (
      <div className="h-24 rounded-xl bg-zinc-100/70 dark:bg-white/[0.03] flex items-center justify-center text-[11px] font-mono text-zinc-400">
        No weight logs in this window
      </div>
    );
  }
  const weights = series.map((s) => s.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const span = Math.max(1, maxW - minW);

  const coords = series.map((pt, idx) => {
    const x = series.length === 1 ? 50 : (idx / (series.length - 1)) * 96 + 2;
    const y = 84 - ((pt.weightKg - minW) / span) * 68;
    return { x, y, ...pt };
  });

  const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div className="space-y-1.5">
      <div className="h-24 rounded-xl bg-zinc-100/70 dark:bg-white/[0.03] p-2">
        <svg viewBox="0 0 100 92" preserveAspectRatio="none" className="w-full h-full">
          {coords.length >= 2 && (
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polyline}
              className="text-zinc-900 dark:text-white"
            />
          )}
          {coords.map((c, idx) => (
            <circle
              key={`${c.date}-${idx}`}
              cx={c.x}
              cy={c.y}
              r={coords.length === 1 ? 3.5 : 2.3}
              className="fill-zinc-900 dark:fill-white"
            >
              <title>{`${c.date}: ${c.weightKg} kg`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span>{series[0]?.date}</span>
        <span>
          {minW.toFixed(1)} – {maxW.toFixed(1)} kg
        </span>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function GrowthAnalyticsView({
  isOpen,
  onClose,
  trackingAccess,
  onOpenRenewal,
}: {
  isOpen: boolean;
  onClose: () => void;
  trackingAccess?: TrackingAccessStatusDTO | null;
  onOpenRenewal?: () => void;
}) {
  const { locale } = useLocale();
  const isId = locale === "id";
  const [range, setRange] = useState<GrowthRange>("30d");
  const [cache, setCache] = useState<Partial<Record<GrowthRange, GrowthAnalyticsPayload>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (cache[range]) return;
    let active = true;
    setLoading(true);
    setError(null);
    void wellnessGetGrowthAnalytics({ range })
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          setCache((prev) => ({ ...prev, [range]: res.data! }));
        } else {
          setError(res.message || "Unable to load analytics.");
        }
      })
      .catch(() => {
        if (active) setError("Network error while loading growth analytics.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, range, cache]);

  if (!isOpen || typeof document === "undefined") return null;

  const data = cache[range] ?? null;
  const isExpiredArchive = trackingAccess?.mode === "EXPIRED_ARCHIVE";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isId ? "Analitik Pertumbuhan 1 Tahun" : "1-Year Growth Analytics"}
      className="fixed inset-0 z-[95] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
    >
      {/* Sticky Header */}
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="sticky top-0 z-10 bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md border-b border-zinc-200/70 dark:border-white/10"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <h2 className="text-sm sm:text-base font-geometric font-semibold tracking-tight truncate">
              {isId ? "Analitik Pertumbuhan" : "Longitudinal Growth Analytics"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close growth analytics"
            className="w-9 h-9 rounded-xl bg-zinc-200/70 dark:bg-white/10 hover:bg-zinc-300/70 dark:hover:bg-white/15 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div
        className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-5"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Read-Only Archive Notice if expired */}
        {isExpiredArchive && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                {isId
                  ? "Mode Arsip (Read-Only) — Riwayat 1 tahunmu tetap aman dan bisa dilihat kapan saja."
                  : "Read-Only Archive Mode — Your 1-year history remains safely viewable anytime."}
              </span>
            </div>
            {onOpenRenewal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRenewal();
                }}
                className="px-3.5 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold cursor-pointer active:scale-95 transition"
              >
                {isId ? "Aktifkan Lagi" : "Renew Access"}
              </button>
            )}
          </div>
        )}

        {/* Range Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-200/70 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10">
          {(
            [
              { id: "30d", label: isId ? "30 Hari" : "30 Days" },
              { id: "90d", label: isId ? "90 Hari" : "90 Days" },
              { id: "1y", label: isId ? "1 Tahun" : "1 Year" },
            ] as const
          ).map((tab) => {
            const active = range === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRange(tab.id)}
                className={`h-9 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  active
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && !data && (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{isId ? "Memuat riwayat progres..." : "Loading growth metrics..."}</span>
          </div>
        )}

        {error && !data && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Top Streak & Consistency Ribbon */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  {isId ? "Hari Tercatat" : "Logged Days"}
                </span>
                <p className="text-xl sm:text-2xl font-geometric font-semibold mt-1 tabular-nums">
                  {data.totalLoggedDays}
                  <span className="text-xs font-mono text-zinc-400 font-normal">
                    /{data.periodDays}
                  </span>
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  {isId ? "Streak Aktif" : "Active Streak"}
                </span>
                <p className="text-xl sm:text-2xl font-geometric font-semibold mt-1 tabular-nums">
                  {data.currentStreakDays}
                  <span className="text-xs font-mono text-zinc-400 font-normal ml-1">
                    {isId ? "hr" : "d"}
                  </span>
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
                  {isId ? "Streak Terbaik" : "Best Streak"}
                </span>
                <p className="text-xl sm:text-2xl font-geometric font-semibold mt-1 tabular-nums">
                  {data.longestStreakDays}
                  <span className="text-xs font-mono text-zinc-400 font-normal ml-1">
                    {isId ? "hr" : "d"}
                  </span>
                </p>
              </div>
            </div>

            {/* 2-Column Precision Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Sleep */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-semibold">
                      {isId ? "Konsistensi Tidur" : "Sleep Consistency"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {data.summary.sleepGoodRatePct}% ≥ 7h
                  </span>
                </div>
                <p className="text-2xl font-geometric font-semibold tabular-nums">
                  {formatSleepHrs(data.summary.avgSleepMins)}
                  <span className="text-xs font-mono text-zinc-400 font-normal ml-1.5">
                    {isId ? "rata-rata" : "avg"}
                  </span>
                </p>
                <MiniBarChart
                  points={data.series}
                  valueOf={(p) => p.avgSleepMins}
                  maxFallback={540}
                  goalLine={420}
                  barColor="bg-indigo-500/80 dark:bg-indigo-400/80"
                />
              </div>

              {/* 2. Daily Steps */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold">
                      {isId ? "Langkah Harian" : "Daily Steps"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {data.summary.stepsGoalRatePct}% ≥ 8k
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-geometric font-semibold tabular-nums">
                    {data.summary.avgSteps > 0 ? data.summary.avgSteps.toLocaleString() : "—"}
                    <span className="text-xs font-mono text-zinc-400 font-normal ml-1">
                      / {isId ? "hari" : "day"}
                    </span>
                  </p>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {data.summary.totalSteps.toLocaleString()} total
                  </span>
                </div>
                <MiniBarChart
                  points={data.series}
                  valueOf={(p) => p.avgSteps}
                  maxFallback={10000}
                  goalLine={8000}
                  barColor="bg-emerald-500/80 dark:bg-emerald-400/80"
                />
              </div>

              {/* 3. Water */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    <span className="text-xs font-semibold">
                      {isId ? "Hidrasi Harian" : "Hydration"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {data.summary.waterGoalRatePct}% ≥ 2.0L
                  </span>
                </div>
                <p className="text-2xl font-geometric font-semibold tabular-nums">
                  {data.summary.avgWaterMl > 0
                    ? `${(data.summary.avgWaterMl / 1000).toFixed(2)} L`
                    : "—"}
                  <span className="text-xs font-mono text-zinc-400 font-normal ml-1.5">
                    {isId ? "rata-rata" : "avg"}
                  </span>
                </p>
                <MiniBarChart
                  points={data.series}
                  valueOf={(p) => p.avgWaterMl}
                  maxFallback={3000}
                  goalLine={2500}
                  barColor="bg-sky-500/80 dark:bg-sky-400/80"
                />
              </div>

              {/* 4. Net Calories & 4/4/9 Macro Split */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold">
                      {isId ? "Kalori Bersih & Makro" : "Net Calories & Macros"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Target {data.calorieTargetKcal} kcal
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-geometric font-semibold tabular-nums">
                    {data.summary.avgNetKcal > 0
                      ? data.summary.avgNetKcal.toLocaleString()
                      : "—"}
                    <span className="text-xs font-mono text-zinc-400 font-normal ml-1">
                      net kcal
                    </span>
                  </p>
                  {data.summary.avgFoodKcal > 0 && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      {data.summary.avgFoodKcal.toLocaleString()} in
                    </span>
                  )}
                </div>

                {/* 4/4/9 Caloric Macro Split Bar */}
                {data.summary.macroSplit.carbsPct +
                  data.summary.macroSplit.proteinPct +
                  data.summary.macroSplit.fatPct >
                0 ? (
                  <div className="space-y-1.5">
                    <div className="h-2.5 rounded-full overflow-hidden flex bg-zinc-200 dark:bg-white/10">
                      <div
                        style={{ width: `${data.summary.macroSplit.carbsPct}%` }}
                        className="bg-amber-400"
                      />
                      <div
                        style={{ width: `${data.summary.macroSplit.proteinPct}%` }}
                        className="bg-emerald-500"
                      />
                      <div
                        style={{ width: `${data.summary.macroSplit.fatPct}%` }}
                        className="bg-rose-400"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                      <span>C {data.summary.macroSplit.carbsPct}%</span>
                      <span>P {data.summary.macroSplit.proteinPct}%</span>
                      <span>F {data.summary.macroSplit.fatPct}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-zinc-400">
                    {isId ? "Belum ada log nutrisi" : "No meal macro logs yet"}
                  </p>
                )}

                <MiniBarChart
                  points={data.series}
                  valueOf={(p) => Math.max(0, p.avgNetKcal)}
                  maxFallback={Math.max(2200, data.calorieTargetKcal)}
                  goalLine={data.calorieTargetKcal}
                  barColor="bg-amber-500/80 dark:bg-amber-400/80"
                />
              </div>

              {/* 5. Weight Trajectory */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span className="text-xs font-semibold">
                      {isId ? "Tren Berat Badan" : "Weight Trajectory"}
                    </span>
                  </div>
                  {data.summary.weightDeltaKg !== null && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {data.summary.weightDeltaKg > 0 ? "+" : ""}
                      {data.summary.weightDeltaKg} kg
                    </span>
                  )}
                </div>
                <p className="text-2xl font-geometric font-semibold tabular-nums">
                  {data.summary.latestWeightKg !== null
                    ? `${data.summary.latestWeightKg} kg`
                    : "—"}
                </p>
                <WeightSparkline series={data.weightSeries} />
              </div>

              {/* 6. More Training */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-500" />
                    <span className="text-xs font-semibold">
                      {isId ? "Latihan Tambahan" : "More Training"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {data.summary.totalExtraWorkouts}{" "}
                    {isId ? "sesi" : data.summary.totalExtraWorkouts === 1 ? "session" : "sessions"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xl font-geometric font-semibold tabular-nums">
                    {data.summary.totalExtraWorkoutMins > 0
                      ? `${data.summary.totalExtraWorkoutMins} min`
                      : "—"}
                  </p>
                  {data.summary.totalExtraWorkoutKcal > 0 && (
                    <span className="text-[11px] font-mono text-zinc-400">
                      ~{data.summary.totalExtraWorkoutKcal.toLocaleString()} kcal
                    </span>
                  )}
                </div>
                <MiniBarChart
                  points={data.series}
                  valueOf={(p) => p.extraWorkoutMins}
                  maxFallback={60}
                  barColor="bg-violet-500/80 dark:bg-violet-400/80"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
