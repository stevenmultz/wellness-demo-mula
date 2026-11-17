"use client";

import { useRef, useState } from "react";
import { Clock, Compass } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { BRAND } from "@/wellness/brand";
import { EmptyState } from "../shared";
import {
  formatDayTypeLabel,
  formatStartsIn,
  type MyPlanIndexItem,
} from "./myPlanUtils";

export function MyPlanIndex({
  userName,
  plans,
  completedCount,
  planFilter: controlledFilter,
  onChangePlanFilter,
  onSelectPlan,
  onExplore,
  onViewHistory,
}: {
  userName: string;
  plans: MyPlanIndexItem[];
  completedCount: number;
  planFilter?: "all" | "ongoing" | "upcoming";
  onChangePlanFilter?: (next: "all" | "ongoing" | "upcoming") => void;
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
  onViewHistory: () => void;
}) {
  const firstName = (userName || "Member").trim().split(/\s+/)[0] || "Member";
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [internalFilter, setInternalFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const planFilter = controlledFilter ?? internalFilter;
  const setPlanFilter = (
    updater:
      | "all"
      | "ongoing"
      | "upcoming"
      | ((prev: "all" | "ongoing" | "upcoming") => "all" | "ongoing" | "upcoming")
  ) => {
    const next = typeof updater === "function" ? updater(planFilter) : updater;
    setInternalFilter(next);
    onChangePlanFilter?.(next);
  };

  const ongoingPlans = plans.filter((p) => !p.isUpcoming);
  const upcomingPlans = plans.filter((p) => p.isUpcoming);
  const visiblePlans =
    planFilter === "ongoing"
      ? ongoingPlans
      : planFilter === "upcoming"
        ? upcomingPlans
        : plans;

  const safeSlide = Math.min(activeSlide, Math.max(0, visiblePlans.length - 1));

  const handleTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0) return;
    const nextIdx = Math.round(el.scrollLeft / el.clientWidth);
    if (nextIdx !== activeSlide && nextIdx >= 0 && nextIdx < visiblePlans.length) {
      setActiveSlide(nextIdx);
    }
  };

  const scrollToSlide = (idx: number) => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
    setActiveSlide(idx);
  };

  const handleFilterSelect = (next: "all" | "ongoing" | "upcoming") => {
    setPlanFilter((prev) => (next !== "all" && prev === next ? "all" : next));
    setActiveSlide(0);
    if (trackRef.current) {
      trackRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  };

  const filterHeadingLabel =
    planFilter === "ongoing"
      ? "On Going Plans"
      : planFilter === "upcoming"
        ? "Upcoming Plans"
        : "All My Plans";

  const filterOptions: Array<{
    key: "all" | "ongoing" | "upcoming";
    label: string;
    count: number;
  }> = [
    { key: "all", label: "All My Plan", count: plans.length },
    { key: "ongoing", label: "On Going", count: ongoingPlans.length },
    { key: "upcoming", label: "Upcoming", count: upcomingPlans.length },
  ];

  return (
    <div className="min-h-[calc(100svh-13rem)] flex flex-col justify-between max-w-md mx-auto pt-6 pb-2 gap-10">
      <section className="space-y-5 px-0.5">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-px bg-zinc-400 dark:bg-white/40" />
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              My Plan
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.08]">
            Hello, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm">
            {plans.length > 0
              ? "Here are the active plans you're currently enrolled in. Select a plan below to open today's session."
              : "You have no active plans right now. Explore available plans to get started."}
          </p>
        </div>

        {plans.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.map(({ key, label, count }) => {
              const isSelected = planFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFilterSelect(key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition active:scale-95 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums leading-none ${
                      isSelected
                        ? "bg-white/20 text-white dark:bg-zinc-950/15 dark:text-zinc-950"
                        : "bg-black/10 text-zinc-700 dark:bg-white/15 dark:text-zinc-200"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {plans.length > 0 ? (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-3 px-0.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {filterHeadingLabel}
            </span>

            {visiblePlans.length > 1 && (
              <div
                className="flex items-center gap-1.5"
                role="tablist"
                aria-label="Active plans switcher"
              >
                {visiblePlans.map((pl, idx) => {
                  const isCurrent = idx === safeSlide;
                  return (
                    <button
                      key={pl.programId}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Plan ${idx + 1}: ${pl.title}`}
                      onClick={() => scrollToSlide(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        isCurrent
                          ? "w-5 bg-zinc-950 dark:bg-white"
                          : "w-1.5 bg-zinc-300 dark:bg-white/25 hover:bg-zinc-400 dark:hover:bg-white/45"
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {visiblePlans.length > 0 ? (
            <div
              ref={trackRef}
              onScroll={handleTrackScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-0.5 px-0.5"
              style={{ scrollbarWidth: "none" }}
            >
              {visiblePlans.map((p) => {
                const total = p.totalDays || p.dayCount || 0;
                const startsIn = p.isUpcoming ? formatStartsIn(p.startDate) : null;
                const todayTypeLabel = !p.isUpcoming
                  ? formatDayTypeLabel(p.todayDayType)
                  : null;
                const pendingTasks = !p.isUpcoming ? p.pendingTasksCount ?? 0 : 0;
                const dayStatusLabel = startsIn
                  ? startsIn.headline
                  : `Day ${p.currentDayNumber || 1} of ${total || p.currentDayNumber || 1}${
                      todayTypeLabel ? ` · ${todayTypeLabel}` : ""
                    }`;

                return (
                  <div key={p.programId} className="w-full shrink-0 snap-center px-0.5">
                    <button
                      type="button"
                      onClick={() => onSelectPlan(p.programId)}
                      className="group w-full text-left transition active:scale-[0.995]"
                    >
                      <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-900">
                        {p.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BrandLogo size="sm" tone="light" className="opacity-70" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/15" />

                        <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between gap-2">
                          <span className="px-3 py-1 rounded-full bg-white text-zinc-950 text-[11px] font-semibold shadow-sm">
                            {dayStatusLabel}
                          </span>
                          {p.dailyCommitment && (
                            <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-medium text-white inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{p.dailyCommitment}</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <h2 className="text-base sm:text-lg font-geometric font-medium text-white leading-snug line-clamp-1">
                              {p.title}
                            </h2>
                            <p className="text-xs text-white/80 truncate">
                              {p.organizationName ? `${p.organizationName} • ` : ""}
                              Coach {p.coachName || BRAND.facultyFallback}
                            </p>
                          </div>

                          {pendingTasks > 0 && (
                            <span className="shrink-0 px-2.5 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-semibold tabular-nums shadow-sm">
                              {pendingTasks} Task{pendingTasks === 1 ? "" : "s"} Left
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl bg-[#ececea] dark:bg-[#1f1f1f] px-5 py-10 text-center space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xs mx-auto">
                {planFilter === "upcoming"
                  ? "You haven\u2019t got any upcoming plans yet. Start exploring available programs to schedule your next cohort."
                  : "You haven\u2019t got any ongoing plans right now. Explore available programs or check your upcoming plans."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onExplore}
                  className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium inline-flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" /> Explore Plans
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlanFilter("all");
                    setActiveSlide(0);
                  }}
                  className="px-4 py-1.5 rounded-full border border-zinc-300 dark:border-white/20 text-zinc-800 dark:text-zinc-200 text-[11px] font-medium"
                >
                  All My Plan
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        <EmptyState
          title="No plans yet"
          description="You haven\u2019t got any plans yet. Start your wellness journey by exploring available programs or checking your completed history."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onExplore}
                className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" /> Explore Plans
              </button>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-[11px] font-medium uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
                >
                  View History
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
