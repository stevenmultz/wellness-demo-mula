import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicPageShell,
  PublicPageActions,
} from "@/components/home/PublicNavbar";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const { programs, coaches, categories, audiences, commitments } =
    await getPublicSanctuaryData();

  const distinctVenues = Array.from(
    new Set(
      programs
        .map((p) => p.venueAddress)
        .filter((v): v is string => Boolean(v && v.trim().length > 0))
    )
  );

  return (
    <PublicPageShell>
      {/* HERO */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
          About BMS Sanctuary
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-tight">
          Consistency over intensity.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          BMS Sanctuary is a daily movement, whole-food nutrition, and sleep
          restoration platform. Cohorts unlock at 00:00 WIB and pair guided
          digital tracking with live sessions in{" "}
          {distinctVenues[0] || "Senopati, Jakarta Selatan"}.
        </p>
      </section>

      {/* METRICS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 py-6 border-y border-zinc-200/80 dark:border-white/10">
        <div className="space-y-1">
          <span className="text-xl sm:text-2xl font-geometric font-medium text-zinc-950 dark:text-white block">
            {programs.length}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Programs
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xl sm:text-2xl font-geometric font-medium text-zinc-950 dark:text-white block">
            {coaches.length}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Coaches
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xl sm:text-2xl font-geometric font-medium text-zinc-950 dark:text-white block">
            {categories.length}
          </span>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Disciplines
          </span>
        </div>
        <div className="space-y-1">
          <span className="text-xl sm:text-2xl font-geometric font-medium text-zinc-950 dark:text-white block">
            00:00 WIB
          </span>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            Daily Unlock
          </span>
        </div>
      </section>

      {/* FOCUS AREAS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            Categories
          </span>
          <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {categories.join(" • ")}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            Designed For
          </span>
          <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {audiences.join(" • ")}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            Daily Commitment
          </span>
          <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
            {commitments.join(" • ")}
          </p>
        </div>
      </section>

      <PublicPageActions nextHref="/curriculum" nextLabel="Curriculum" />
    </PublicPageShell>
  );
}
