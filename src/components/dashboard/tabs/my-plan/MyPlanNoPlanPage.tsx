"use client";

import { ArrowRight, Compass, Flame, ShieldCheck, Sparkles } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";

export function MyPlanNoPlanPage({
  onExplore,
}: {
  onExplore: () => void;
}) {
  const { locale } = useLocale();
  const isId = locale === "id";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24 text-center max-w-lg mx-auto min-h-[calc(100vh-10rem)]">
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
          ? "Kamu belum terdaftar di program atau plan kebugaran apapun saat ini. Kunjungi tab Explore untuk menemukan berbagai program dan plan pilihan kami untuk memulai perjalanan kesehatanmu."
          : "You are not enrolled in any fitness plan yet. Visit the Explore tab to discover curated programs and daily protocols tailored to your goals."}
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

      {/* Value preview highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-12 pt-8 border-t border-zinc-200/70 dark:border-white/10 text-left">
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
              ? "Catat workout, nutrisi, dan tidur harian"
              : "Log movement, nutrition, and recovery"}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <p className="text-[11px] font-geometric font-semibold">
              {isId ? "Metrik & Progres" : "Progress Metrics"}
            </p>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
            {isId
              ? "Pantau konsistensi dan perkembangan tubuh"
              : "Monitor consistency and body progress"}
          </p>
        </div>
      </div>
    </div>
  );
}
