"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { formatDateWib } from "../shared";
import { type MyPlanIndexItem } from "./myPlanUtils";
import { MyPlanPageEmpty, MyPlanPageShell, PlanCardMedia } from "./MyPlanPageShell";

/**
 * Dedicated "Done" plans page focused on finished cohorts and reviewable progress history.
 */
export function MyPlanDonePage({
  plans,
  onSelectPlan,
  onExplore,
}: {
  plans: MyPlanIndexItem[];
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
}) {
  const { t } = useLocale();
  const donePlans = plans.filter((p) => !!p.isCompleted);

  return (
    <MyPlanPageShell
      eyebrow={t.myPlan.eyebrow}
      title={t.myPlan.headingCompleted}
      subtitle={t.myPlan.donePageSub}
      count={donePlans.length}
    >
      {donePlans.length === 0 ? (
        <MyPlanPageEmpty
          title={t.myPlan.headingCompleted}
          description={t.myPlan.emptyCompleted}
          onExplore={onExplore}
        />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {donePlans.map((p) => {
            const total = Math.max(1, p.totalDays || p.dayCount || 1);
            const pct = Math.min(100, Math.round((p.completedDays / total) * 100));

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
                      <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-semibold shadow-sm inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{t.myPlan.filterCompleted}</span>
                      </span>
                    }
                    topRightBadge={
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white">
                        {p.completedDays}/{total}
                      </span>
                    }
                  />

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-1">
                      {p.organizationName && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                          {p.organizationName}
                        </span>
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
                          className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] font-mono text-zinc-400">
                        {t.myPlan.endedOnLabel} {formatDateWib(p.endDate)}
                      </span>
                      <span className="inline-flex items-center gap-1 font-geometric font-semibold text-zinc-950 dark:text-white">
                        <span>{t.myPlan.reviewCompletedPlan}</span>
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
