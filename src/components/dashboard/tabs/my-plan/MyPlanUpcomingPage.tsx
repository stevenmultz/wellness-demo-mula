"use client";

import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { formatDateWib } from "../shared";
import { formatStartsIn, type MyPlanIndexItem } from "./myPlanUtils";
import { MyPlanPageEmpty, MyPlanPageShell, PlanCardMedia } from "./MyPlanPageShell";

/**
 * Dedicated "Upcoming" plans page focused on cohort countdowns and pre-Day-1 preparation.
 */
export function MyPlanUpcomingPage({
  plans,
  onSelectPlan,
  onExplore,
}: {
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
}) {
  const { locale, t } = useLocale();
  const upcomingPlans = plans.filter((p) => p.isUpcoming && !p.isCompleted);

  return (
    <MyPlanPageShell
      eyebrow={t.myPlan.eyebrow}
      title={t.myPlan.headingUpcoming}
      subtitle={t.myPlan.upcomingPageSub}
      count={upcomingPlans.length}
    >
      {upcomingPlans.length === 0 ? (
        <MyPlanPageEmpty
          title={t.myPlan.headingUpcoming}
          description={t.myPlan.emptyUpcoming}
          onExplore={onExplore}
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {upcomingPlans.map((p) => {
            const startsIn = formatStartsIn(p.startDate, locale);
            const total = p.totalDays || p.dayCount || 0;
            const locLabel =
              p.locationType === "ONLINE"
                ? "Online"
                : p.locationType === "HYBRID"
                  ? "Hybrid"
                  : null;

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
                        {startsIn.headline}
                      </span>
                    }
                    topRightBadge={
                      total > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white">
                          {total} {t.explore.daysUnit}
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

                    <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {t.myPlan.startsOnLabel} {formatDateWib(p.startDate)}
                        </span>
                      </div>
                      {(locLabel || p.city) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>
                            {[locLabel, p.city].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] font-mono text-zinc-400 truncate">
                        {startsIn.dateLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 font-geometric font-semibold text-zinc-950 dark:text-white">
                        <span>{t.myPlan.viewPrepGuide}</span>
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
