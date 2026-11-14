import Link from "next/link";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicPageShell,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import {
  resolvePublicBadge,
  PublicProgramBadge,
} from "@/wellness/utils/timeline";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const { sessionUser, programs } = await getPublicSanctuaryData();
  const recentPrograms = programs.slice(0, 5);

  return (
    <PublicPageShell>
      {/* HERO */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
          Programs
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-tight">
          Recent Programs
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Up to 5 recent published cohorts with schedule format, duration, and
          current registration status.
        </p>
      </section>

      {/* MINIMAL LIST (MAX 5) */}
      {recentPrograms.length === 0 ? (
        <section className="py-10 border-y border-zinc-200/80 dark:border-white/10">
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
            No published programs available right now.
          </p>
        </section>
      ) : (
        <section className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
          {recentPrograms.map((prog) => {
            const publicBadge: PublicProgramBadge =
              resolvePublicBadge({
                status: prog.status,
                registrationOpenDate: prog.registrationOpenDate,
                registrationDeadline: prog.registrationDeadline,
                startDate: prog.startDate,
                endDate: prog.endDate,
                maxQuota: prog.maxQuota,
                enrolledCount: prog.enrolledCount,
              }) || "Open Registration";

            const isEnrollable = publicBadge === "Open Registration";
            const attendanceLabel =
              prog.locationType === "ONLINE"
                ? "Online"
                : prog.locationType === "ONSITE"
                  ? prog.city || "On-Site"
                  : `Hybrid • ${prog.city || "Jakarta"}`;

            return (
              <article
                key={prog.id}
                className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    <span className="text-zinc-950 dark:text-white font-semibold">
                      {publicBadge}
                    </span>
                    <span>•</span>
                    <span>{prog.durationDays} Days</span>
                    <span>•</span>
                    <span>{attendanceLabel}</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white leading-snug">
                    {prog.title}
                  </h2>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {prog.coachName || "BMS Coach"} &bull; Rp{" "}
                    {prog.price.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="shrink-0">
                  {sessionUser && prog.isUserEnrolled ? (
                    <Link
                      href="/dashboard"
                      className="text-xs font-medium text-zinc-950 dark:text-white inline-flex items-center gap-1 hover:underline underline-offset-4"
                    >
                      <span>Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : isEnrollable ? (
                    <Link
                      href={
                        sessionUser
                          ? `/dashboard?enroll=${prog.id}`
                          : `/?auth=signup&program=${encodeURIComponent(prog.title)}`
                      }
                      className="text-xs font-medium text-zinc-950 dark:text-white inline-flex items-center gap-1 hover:underline underline-offset-4"
                    >
                      <span>{sessionUser ? "Enroll" : "Join"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                      {publicBadge}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <PublicPageActions nextHref="/coaches" nextLabel="Coaches" />
    </PublicPageShell>
  );
}
