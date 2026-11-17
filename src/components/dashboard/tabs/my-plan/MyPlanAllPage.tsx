"use client";

import { ArrowRight, CheckCircle2, Clock, Flame } from "lucide-react";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { formatDateWib } from "../shared";
import { formatDayTypeLabel, formatStartsIn, type MyPlanIndexItem } from "./myPlanUtils";
import { MyPlanPageEmpty, MyPlanPageShell, PlanCardMedia } from "./MyPlanPageShell";
import type { MyPlanFilter } from "./MyPlanIntro";

/**
 * Dedicated "All My Plans" overview page grouping On Going, Upcoming, and Done cohorts.
 */
export function MyPlanAllPage({
  plans,
  onSelectPlan,
  onOpenSection,
  onExplore,
}: {
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onOpenSection?: (section: Exclude<MyPlanFilter, "all">) => void;
  onExplore: () => void;
}) {
  const { locale, t } = useLocale();
  const ongoing = plans.filter((p) => !p.isUpcoming && !p.isCompleted);
  const upcoming = plans.filter((p) => p.isUpcoming && !p.isCompleted);
  const done = plans.filter((p) => !!p.isCompleted);

  const sections: Array<{
    key: Exclude<MyPlanFilter, "all">;
    heading: string;
    items: MyPlanIndexItem[];
    statusIcon: JSX.Element;
  }> = [
    {
      key: "ongoing",
      heading: t.myPlan.filterOngoing,
      items: ongoing,
      statusIcon: <Flame className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-200" />,
    },
    {
      key: "upcoming",
      heading: t.myPlan.filterUpcoming,
      items: upcoming,
      statusIcon: <Clock className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-200" />,
    },
    {
      key: "completed",
      heading: t.myPlan.filterCompleted,
      items: done,
      statusIcon: <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-200" />,
    },
  ];

  return (
    <MyPlanPageShell
      eyebrow={t.myPlan.eyebrow}
      title={t.myPlan.headingAll}
      subtitle={t.myPlan.allPageSub}
      count={plans.length}
    >
      {plans.length === 0 ? (
        <MyPlanPageEmpty
          title={t.myPlan.emptyAllTitle}
          description={t.myPlan.emptyAllDesc}
          onExplore={onExplore}
        />
      ) : (
        <div className="space-y-8">
          {/* Quick stage counters linking to each dedicated page */}
          <div className="grid grid-cols-3 gap-2.5">
            {sections.map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => onOpenSection?.(sec.key)}
                className="rounded-2xl bg-white dark:bg-[#141414] border border-zinc-200/80 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 p-3.5 text-left transition active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-1 text-zinc-500 dark:text-zinc-400">
                  {sec.statusIcon}
                  <ArrowRight className="w-3 h-3 opacity-60" />
                </div>
                <p className="mt-2 text-lg sm:text-xl font-mono font-semibold tabular-nums text-zinc-950 dark:text-white leading-none">
                  {sec.items.length}
                </p>
                <p className="mt-1 text-[11px] font-geometric font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {sec.heading}
                </p>
              </button>
            ))}
          </div>

          {/* Grouped plan cards */}
          {sections
            .filter((sec) => sec.items.length > 0)
            .map((sec) => (
              <section key={sec.key} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-2">
                    {sec.statusIcon}
                    <h2 className="text-sm font-geometric font-semibold text-zinc-950 dark:text-white">
                      {sec.heading}
                    </h2>
                    <span className="text-xs font-mono text-zinc-400 tabular-nums">
                      ({sec.items.length})
                    </span>
                  </div>
                  {onOpenSection && (
                    <button
                      type="button"
                      onClick={() => onOpenSection(sec.key)}
                      className="text-[11px] font-geometric font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1 transition"
                    >
                      <span>{t.common.view}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {sec.items.map((p) => {
                    const total = p.totalDays || p.dayCount || 0;
                    const badgeText = p.isCompleted
                      ? t.myPlan.filterCompleted
                      : p.isUpcoming
                        ? formatStartsIn(p.startDate, locale).headline
                        : `${t.myPlan.dayLabel} ${p.currentDayNumber || 1} ${t.myPlan.ofLabel} ${total || 1}`;
                    const subText = p.isCompleted
                      ? `${t.myPlan.endedOnLabel} ${formatDateWib(p.endDate)}`
                      : p.isUpcoming
                        ? `${t.myPlan.startsOnLabel} ${formatDateWib(p.startDate)}`
                        : formatDayTypeLabel(p.todayDayType, locale) || p.dailyCommitment || "";

                    return (
                      <li key={p.programId}>
                        <button
                          type="button"
                          onClick={() => onSelectPlan(p.programId)}
                          className="group w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-zinc-200/90 dark:border-white/15 hover:border-zinc-400 dark:hover:border-white/30 shadow-xs transition flex flex-col"
                        >
                          <PlanCardMedia
                            coverImage={p.coverImage}
                            title={p.title}
                            topLeftBadge={
                              <span className="px-2.5 py-0.5 rounded-full bg-white text-zinc-950 text-[10px] font-semibold shadow-sm">
                                {badgeText}
                              </span>
                            }
                            topRightBadge={
                              p.dailyCommitment ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white">
                                  {p.dailyCommitment}
                                </span>
                              ) : null
                            }
                          />
                          <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white line-clamp-1">
                                {p.title}
                              </h3>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                {p.organizationName ? `${p.organizationName} • ` : ""}
                                Coach {p.coachName || BRAND.facultyFallback}
                              </p>
                            </div>
                            <div className="pt-2.5 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                                {subText}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-900 dark:text-white shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>
      )}
    </MyPlanPageShell>
  );
}
