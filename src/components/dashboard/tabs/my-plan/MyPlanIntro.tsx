"use client";

import { ArrowRight, Compass } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";

export type MyPlanFilter = "all" | "ongoing" | "upcoming" | "completed";

export function MyPlanIntro({
  userName,
  totalCount,
  ongoingCount,
  upcomingCount,
  completedCount,
  onSelectFilter,
  onExplore,
}: {
  userName: string;
  totalCount: number;
  ongoingCount: number;
  upcomingCount: number;
  completedCount: number;
  onSelectFilter: (filter: MyPlanFilter) => void;
  onExplore: () => void;
}) {
  const { t } = useLocale();
  const firstName = (userName || "Member").trim().split(/\s+/)[0] || "Member";

  return (
    <div className="relative flex-1 flex flex-col">
      {/* True Full-Viewport Background Image */}
      <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/test.webp"
          alt=""
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />
      </div>

      <div
        style={{ minHeight: "100dvh" }}
        className="relative z-10 w-full flex-1 flex flex-col justify-end gap-8 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="space-y-6 max-w-md">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-px bg-white/50" />
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
                {t.myPlan.eyebrow}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-white leading-[1.08] drop-shadow-xs">
              {t.myPlan.helloPrefix}, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
              {totalCount > 0
                ? t.myPlan.heroSubtitleActive
                : t.myPlan.heroSubtitleEmpty}
            </p>
          </div>

          <div className="w-10 h-px bg-white/30" />

          {totalCount > 0 ? (
            <div className="flex flex-col items-start gap-2.5">
              <button
                type="button"
                onClick={() => onSelectFilter("all")}
                className="group py-1 text-white hover:text-white/85 text-sm sm:text-base font-geometric font-medium inline-flex items-center gap-2.5 active:scale-95 transition drop-shadow-xs"
              >
                <span>{t.myPlan.filterAll}</span>
                <span className="text-xs font-mono text-white/60 tabular-nums">
                  ({totalCount})
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("ongoing")}
                className="group py-1 text-white/85 hover:text-white text-xs sm:text-sm font-geometric font-normal inline-flex items-center gap-2 active:scale-95 transition drop-shadow-xs"
              >
                <span>{t.myPlan.filterOngoing}</span>
                <span className="text-[11px] font-mono text-white/55 tabular-nums">
                  ({ongoingCount})
                </span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("upcoming")}
                className="group py-1 text-white/85 hover:text-white text-xs sm:text-sm font-geometric font-normal inline-flex items-center gap-2 active:scale-95 transition drop-shadow-xs"
              >
                <span>{t.myPlan.filterUpcoming}</span>
                <span className="text-[11px] font-mono text-white/55 tabular-nums">
                  ({upcomingCount})
                </span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("completed")}
                className="group py-1 text-white/85 hover:text-white text-xs sm:text-sm font-geometric font-normal inline-flex items-center gap-2 active:scale-95 transition drop-shadow-xs"
              >
                <span>{t.myPlan.filterCompleted}</span>
                <span className="text-[11px] font-mono text-white/55 tabular-nums">
                  ({completedCount})
                </span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={onExplore}
                className="group px-5 py-2.5 rounded-full bg-white text-zinc-950 hover:bg-white/90 text-xs sm:text-sm font-geometric font-semibold inline-flex items-center gap-2 shadow-sm active:scale-95 transition"
              >
                <Compass className="w-4 h-4" />
                <span>{t.myPlan.explorePlans}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
