"use client";

import { useState } from "react";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { EmptyState } from "../shared";
import { formatStartsIn, type MyPlanIndexItem } from "./myPlanUtils";
import type { MyPlanFilter } from "./MyPlanIntro";

/**
 * Clean "All My Programs" page styled consistently with Tab 2 Explore catalog.
 */
export function MyPlanAllPage({
  plans,
  onSelectPlan,
  onOpenSection: _onOpenSection,
  onExplore,
}: {
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onOpenSection?: (section: Exclude<MyPlanFilter, "all">) => void;
  onExplore: () => void;
}) {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming" | "completed">("all");

  const ongoing = plans.filter((p) => !p.isUpcoming && !p.isCompleted);
  const upcoming = plans.filter((p) => p.isUpcoming && !p.isCompleted);
  const completed = plans.filter((p) => !!p.isCompleted);

  const filteredPlans =
    filter === "ongoing"
      ? ongoing
      : filter === "upcoming"
      ? upcoming
      : filter === "completed"
      ? completed
      : plans;

  const filterTabs = [
    { id: "all" as const, label: locale === "id" ? "Semua" : "All", count: plans.length },
    { id: "ongoing" as const, label: t.myPlan.filterOngoing, count: ongoing.length },
    { id: "upcoming" as const, label: t.myPlan.filterUpcoming, count: upcoming.length },
    { id: "completed" as const, label: t.myPlan.filterCompleted, count: completed.length },
  ];

  return (
    <div className="w-full space-y-5 pb-16 pt-2">
      {/* Heading */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white leading-tight">
            {locale === "id" ? "Semua Program Saya" : "All My Programs"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {locale === "id"
              ? "Daftar seluruh program yang Anda ikuti"
              : "All enrolled cohorts and active programs"}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {filterTabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`h-8 px-3.5 rounded-full text-xs font-medium transition active:scale-95 cursor-pointer shrink-0 inline-flex items-center gap-1.5 ${
                active
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                  : "bg-white dark:bg-[#141414] text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white border border-zinc-200/80 dark:border-white/10"
              }`}
            >
              <span>{tab.label}</span>
              <span className="opacity-60 text-[11px] font-mono">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Programs Grid — Same Style as Tab 2 Explore */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          title={t.myPlan.emptyAllTitle}
          description={t.myPlan.emptyAllDesc}
          action={
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider"
            >
              {locale === "id" ? "Jelajahi Program" : "Explore Programs"}
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPlans.map((p) => {
            const isOnline = (p.locationType || "ONLINE").toUpperCase() === "ONLINE";
            const total = p.totalDays || p.dayCount || 0;
            const statusLabel = p.isCompleted
              ? t.myPlan.filterCompleted
              : p.isUpcoming
              ? formatStartsIn(p.startDate, locale).headline
              : `Day ${p.currentDayNumber || 1} of ${total || 1}`;

            return (
              <button
                key={p.programId}
                type="button"
                onClick={() => onSelectPlan(p.programId)}
                className="group relative w-full h-[188px] sm:h-[200px] rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 text-left active:scale-[0.98] transition cursor-pointer shadow-xs border border-transparent dark:border-white/5"
              >
                {/* Background Cover Image */}
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImage}
                    alt={p.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

                {/* Top Badges: Format (Online/Hybrid) + Status */}
                <div className="absolute top-3 inset-x-3.5 flex flex-wrap items-center gap-1.5 z-10">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono uppercase bg-white text-zinc-950 shadow-xs">
                    {isOnline ? "Online" : "Hybrid"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium font-mono bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                    {statusLabel}
                  </span>
                </div>

                {/* Bottom Content: Title & Coach Name */}
                <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 flex flex-col justify-end gap-0.5 z-10">
                  <h3 className="text-base sm:text-lg font-geometric font-semibold text-white line-clamp-2 leading-snug drop-shadow-xs">
                    {p.title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-1">
                    Coach {p.coachName || BRAND.facultyFallback}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
