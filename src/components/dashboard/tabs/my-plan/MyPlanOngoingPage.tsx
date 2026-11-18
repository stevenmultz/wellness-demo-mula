"use client";

import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { formatDayTypeLabel, type MyPlanIndexItem } from "./myPlanUtils";
import { MyPlanPageEmpty, MyPlanPageShell, PlanCardMedia } from "./MyPlanPageShell";

/**
 * Dedicated "On Going" plans page focused on active daily sessions and task progress.
 */
export function MyPlanOngoingPage({
  plans,
  onSelectPlan,
  onExplore,
}: {
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
}) {
  const { locale, t } = useLocale();
  const ongoingPlans = plans.filter((p) => !p.isUpcoming && !p.isCompleted);

  return (
    <MyPlanPageShell
      eyebrow={t.myPlan.eyebrow}
      title={t.myPlan.headingOngoing}
      subtitle={t.myPlan.ongoingPageSub}
      count={ongoingPlans.length}
    >
      {ongoingPlans.length === 0 ? (
        <MyPlanPageEmpty
          title={t.myPlan.headingOngoing}
          description={t.myPlan.emptyOngoing}
          onExplore={onExplore}
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ongoingPlans.map((p) => {
            const total = Math.max(1, p.totalDays || p.dayCount || 1);
            const pct = Math.min(100, Math.round((p.completedDays / total) * 100));
            const todayType = formatDayTypeLabel(p.todayDayType, locale);
            const pendingTasks = p.pendingTasksCount ?? 0;

            return (
              <li key={p.programId}>
                <button
                  type="button"
                  onClick={() => onSelectPlan(p.programId)}
                  className="group w-full text-left rounded-2xl overflow-hidden bg-white dark:bg-[#141414] border border-zinc-200/90 dark:border-white/15 hover:border-zinc-400 dark:hover:border-white/30 shadow-xs transition flex flex-col h-full"
                >
                  <PlanCardMedia
                    coverImage={p.coverImage}
                    title={p.title}
                    topLeftBadge={
                      <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-semibold shadow-sm">
                        {t.myPlan.dayLabel} {p.currentDayNumber || 1} {t.myPlan.ofLabel} {total}
                        {todayType ? ` · ${todayType}` : ""}
                      </span>
                    }
                    topRightBadge={
                      p.dailyCommitment ? (
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{p.dailyCommitment}</span>
                        </span>
                      ) : null
                    }
                  />

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      {(p.organizationName || p.batchNumber) && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.organizationName && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                              {p.organizationLogo && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.organizationLogo}
                                  alt={p.organizationName}
                                  className="w-4 h-4 rounded-full object-contain bg-white border border-zinc-200/80 shrink-0"
                                />
                              )}
                              <span>{p.organizationName}</span>
                            </span>
                          )}
                          {p.batchNumber ? (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-[9px] font-mono font-semibold uppercase text-zinc-700 dark:text-zinc-200">
                              Batch {p.batchNumber}
                            </span>
                          ) : null}
                        </div>
                      )}
                      <h2 className="text-base font-semibold text-zinc-950 dark:text-white leading-snug line-clamp-2">
                        {p.title}
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Coach {p.coachName || BRAND.facultyFallback}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        <span>
                          {p.completedDays}/{total} {t.myPlan.daysCompletedSuffix}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                      {pendingTasks > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-semibold tabular-nums">
                          {pendingTasks}{" "}
                          {pendingTasks === 1
                            ? t.myPlan.taskSingular
                            : t.myPlan.taskPlural}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{t.myPlan.allTodayDone}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 font-geometric font-semibold text-zinc-950 dark:text-white">
                        <span>{t.myPlan.openTodaySession}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </MyPlanPageShell>
  );
}
