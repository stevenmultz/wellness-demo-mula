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
      <div
        style={{ minHeight: "100dvh" }}
        className="relative z-10 w-full flex-1 flex flex-col justify-center gap-8 pt-[calc(5.25rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        <div className="space-y-6 max-w-lg">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-px bg-zinc-400" />
              <span className="text-[11px] font-mono font-medium uppercase tracking-[0.14em] text-zinc-500">
                {t.myPlan.eyebrow}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 leading-[1.08]">
              {t.myPlan.helloPrefix}, {firstName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-sm">
              {totalCount > 0
                ? t.myPlan.heroSubtitleActive
                : t.myPlan.heroSubtitleEmpty}
            </p>
          </div>

          <div className="w-10 h-px bg-zinc-300" />

          {totalCount > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectFilter("all")}
                className="group p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-400 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition shadow-2xs"
              >
                <div>
                  <span className="text-sm font-geometric font-semibold text-zinc-950 block">
                    {t.myPlan.filterAll}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {totalCount} {totalCount === 1 ? "plan" : "plans"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("ongoing")}
                className="group p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-400 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition shadow-2xs"
              >
                <div>
                  <span className="text-sm font-geometric font-semibold text-zinc-950 block">
                    {t.myPlan.filterOngoing}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {ongoingCount} {ongoingCount === 1 ? "plan" : "plans"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("upcoming")}
                className="group p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-400 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition shadow-2xs"
              >
                <div>
                  <span className="text-sm font-geometric font-semibold text-zinc-950 block">
                    {t.myPlan.filterUpcoming}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {upcomingCount} {upcomingCount === 1 ? "plan" : "plans"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelectFilter("completed")}
                className="group p-4 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-400 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition shadow-2xs"
              >
                <div>
                  <span className="text-sm font-geometric font-semibold text-zinc-950 block">
                    {t.myPlan.filterCompleted}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
                    {completedCount} {completedCount === 1 ? "plan" : "plans"}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-950 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <button
                type="button"
                onClick={onExplore}
                className="group px-5 py-3 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xs sm:text-sm font-geometric font-semibold inline-flex items-center gap-2 shadow-sm active:scale-95 transition"
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
