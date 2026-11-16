"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, Minus, Ruler } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";

export interface BodyMetricPoint {
  id: string;
  programId?: string | null;
  programDayId?: string | null;
  source: string;
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  bodyFatPct?: number | null;
  restingHr?: number | null;
  notes?: string | null;
  recordedAt: string;
}

function buildMetricDelta(
  points: BodyMetricPoint[],
  accessor: (p: BodyMetricPoint) => number | null | undefined
) {
  const valid = points
    .map((p) => ({ val: accessor(p), date: p.recordedAt }))
    .filter((item): item is { val: number; date: string } => typeof item.val === "number" && Number.isFinite(item.val));

  if (valid.length === 0) return null;
  const first = valid[0].val;
  const latest = valid[valid.length - 1].val;
  const delta = Number((latest - first).toFixed(1));
  return { first, latest, delta, series: valid };
}

function MiniSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 180;
  const height = 42;
  const pad = 4;

  const points = values
    .map((v, idx) => {
      const x = pad + (idx / (values.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-11 overflow-visible"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-zinc-900 dark:text-white"
      />
    </svg>
  );
}

export function BodyProgressWidget({
  logs,
  programId,
}: {
  logs: BodyMetricPoint[];
  programId?: string;
}) {
  const { locale, t } = useLocale();

  const scopedLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    if (!programId) return logs;
    const progSpecific = logs.filter((l) => l.programId === programId);
    return progSpecific.length > 0 ? progSpecific : logs;
  }, [logs, programId]);

  const weight = useMemo(() => buildMetricDelta(scopedLogs, (p) => p.weightKg), [scopedLogs]);
  const waist = useMemo(() => buildMetricDelta(scopedLogs, (p) => p.waistCm), [scopedLogs]);
  const bodyFat = useMemo(() => buildMetricDelta(scopedLogs, (p) => p.bodyFatPct), [scopedLogs]);

  if (!weight && !waist && !bodyFat) {
    return (
      <div className="rounded-3xl p-5 bg-white/80 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <Ruler className="w-3.5 h-3.5" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
            {t.dashboard.progressTrendTitle}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t.dashboard.noMetricsYet}
        </p>
      </div>
    );
  }

  const cards = [
    weight && {
      key: "weight",
      label: locale === "id" ? "Berat Badan" : "Weight",
      unit: "kg",
      data: weight,
    },
    waist && {
      key: "waist",
      label: locale === "id" ? "Lingkar Pinggang" : "Waist",
      unit: "cm",
      data: waist,
    },
    bodyFat && {
      key: "bodyFat",
      label: locale === "id" ? "Lemak Tubuh" : "Body Fat",
      unit: "%",
      data: bodyFat,
    },
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    unit: string;
    data: NonNullable<ReturnType<typeof buildMetricDelta>>;
  }>;

  return (
    <div className="rounded-3xl p-5 bg-white/85 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
            {t.dashboard.progressTrendTitle}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {scopedLogs.length} {locale === "id" ? "catatan" : "logs"}
        </span>
      </div>

      {weight && weight.series.length >= 2 && (
        <div className="pt-1">
          <MiniSparkline values={weight.series.map((s) => s.val)} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ key, label, unit, data }) => {
          const DeltaIcon =
            data.delta < 0 ? TrendingDown : data.delta > 0 ? TrendingUp : Minus;
          return (
            <div
              key={key}
              className="rounded-2xl p-3.5 bg-zinc-50/90 dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/[0.07] space-y-1.5"
            >
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                {label}
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-geometric font-semibold text-zinc-950 dark:text-white tabular-nums">
                  {data.latest}{" "}
                  <span className="text-xs font-normal text-zinc-500">{unit}</span>
                </span>
                {data.series.length >= 2 && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold ${
                      data.delta < 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : data.delta > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-zinc-500"
                    }`}
                  >
                    <DeltaIcon className="w-3 h-3" />
                    {data.delta > 0 ? `+${data.delta}` : data.delta} {unit}
                  </span>
                )}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>
                  {t.dashboard.baselineLabel}: {data.first} {unit}
                </span>
                <span>
                  {t.dashboard.latestLabel}: {data.latest} {unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
