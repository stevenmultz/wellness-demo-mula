import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicPageShell,
  PublicPageActions,
} from "@/components/home/PublicNavbar";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const { curriculumSample } = await getPublicSanctuaryData();

  return (
    <PublicPageShell>
      {/* HERO */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
          Curriculum
        </span>
        <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-tight">
          Three daily disciplines.
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Every module unlocks at 00:00 WIB with structured checkpoints for
          movement, nourishment, and evening recovery before 23:59 WIB.
        </p>
      </section>

      {/* THREE PILLARS WITH NEGATIVE SPACE */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 py-6 border-y border-zinc-200/80 dark:border-white/10">
        <div className="space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            01 / Movement • 07:00 WIB
          </span>
          <h2 className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white">
            Guided Mobility
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {curriculumSample.videoChecklist.join(" • ")}
          </p>
        </div>

        <div className="space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            02 / Fuel • 12:30 WIB
          </span>
          <h2 className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white">
            Whole Food Log
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Daily whole-food meal guidance with one-tap compliance tracking and
            nutritional notes.
          </p>
        </div>

        <div className="space-y-2.5">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            03 / Recovery • 20:30 WIB
          </span>
          <h2 className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white">
            Sleep &amp; Dear Diary
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {curriculumSample.sleepRecommendation}. Log daily reflection and
            bedtime hours.
          </p>
        </div>
      </section>

      {/* MODULE RHYTHM */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            Rest Days
          </span>
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {curriculumSample.restInstructions}
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
            Connection Days
          </span>
          <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {curriculumSample.connectionVenue} &bull;{" "}
            {curriculumSample.connectionSchedule}
          </p>
        </div>
      </section>

      <PublicPageActions nextHref="/programs" nextLabel="Programs" />
    </PublicPageShell>
  );
}
