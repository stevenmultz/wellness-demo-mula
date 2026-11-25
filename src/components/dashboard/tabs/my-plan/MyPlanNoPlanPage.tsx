"use client";

import { ArrowRight, Compass, Flame, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import type { TrackingPassPlanDTO } from "@/wellness/actions/tracking-pass";

export function MyPlanNoPlanPage({
  onExplore,
  trackingPassPlans = [],
  onSelectTrackingPass,
  checkoutLoadingPlanId,
}: {
  onExplore: () => void;
  trackingPassPlans?: TrackingPassPlanDTO[];
  onSelectTrackingPass?: (planId: string) => void;
  checkoutLoadingPlanId?: string | null;
}) {
  const { locale } = useLocale();
  const isId = locale === "id";
  const primaryPass = trackingPassPlans[0] ?? null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20 text-center max-w-2xl mx-auto min-h-[calc(100vh-10rem)]">
      {/* Icon badge */}
      <div className="relative mb-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/10 shadow-sm flex items-center justify-center text-zinc-950 dark:text-white">
          <Compass className="w-10 h-10 sm:w-12 sm:h-12 stroke-[1.5]" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-md">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl sm:text-2xl font-geometric font-semibold text-zinc-950 dark:text-white tracking-tight mb-2.5">
        {isId ? "Belum Ada Plan yang Diikuti" : "No Active Plans Yet"}
      </h2>

      {/* Description / Instruction */}
      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-md mb-8">
        {isId
          ? "Kamu belum terdaftar di program kebugaran apapun saat ini. Kunjungi tab Explore untuk menemukan program Coach pilihan (termasuk bonus 2 bulan aplikasi tracking) atau aktifkan Tracking Pass mandiri."
          : "You are not enrolled in any fitness plan yet. Visit the Explore tab to discover curated programs (with 2 months bonus tracking app) or activate an Independent Tracking Pass."}
      </p>

      {/* Primary CTA Button */}
      <button
        type="button"
        onClick={onExplore}
        className="group px-7 py-3 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs sm:text-sm font-geometric font-semibold uppercase tracking-wider inline-flex items-center gap-2.5 shadow-md active:scale-95 transition cursor-pointer"
      >
        <Compass className="w-4 h-4" />
        <span>{isId ? "Jelajahi Plan" : "Explore Plans"}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>

      {/* Optional Standalone Tracking Pass Comparison Option */}
      {primaryPass && onSelectTrackingPass && (
        <div className="w-full max-w-md mt-6 p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/10 text-left flex items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              {isId ? "Atau Tracking Mandiri" : "Or Independent Tracking"}
            </span>
            <p className="text-xs font-geometric font-semibold text-zinc-950 dark:text-white truncate">
              {primaryPass.name} ({primaryPass.durationDays} {isId ? "Hari" : "Days"})
            </p>
            <p className="text-[11px] font-mono text-zinc-500">
              Rp {primaryPass.price.toLocaleString("id-ID")}
            </p>
          </div>
          <button
            type="button"
            disabled={checkoutLoadingPlanId === primaryPass.id}
            onClick={() => onSelectTrackingPass(primaryPass.id)}
            className="shrink-0 px-3.5 py-2 rounded-full border border-zinc-300 dark:border-white/20 text-[11px] font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {checkoutLoadingPlanId === primaryPass.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>{isId ? "Beli Pass" : "Get Pass"}</span>
          </button>
        </div>
      )}

      {/* Value preview highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-10 pt-8 border-t border-zinc-200/70 dark:border-white/10 text-left">
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[11px] font-geometric font-semibold">
              {isId ? "Panduan Harian" : "Daily Guides"}
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {isId
              ? "Protokol terstruktur dari coach profesional"
              : "Structured protocols from expert coaches"}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-[11px] font-geometric font-semibold">
              {isId ? "Check-in Tugas" : "Task Tracking"}
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {isId
              ? "Catat workout, nutrisi, air, langkah & tidur harian"
              : "Log movement, nutrition, hydration, steps & sleep"}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-[11px] font-geometric font-semibold">
              {isId ? "Analitik 1 Tahun" : "1-Year Analytics"}
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {isId
              ? "Pantau konsistensi dan perkembangan tubuh jangka panjang"
              : "Monitor long-term consistency and body progress"}
          </p>
        </div>
      </div>
    </div>
  );
}

