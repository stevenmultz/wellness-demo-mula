import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import {
  Activity,
  Flame,
  Moon,
  CheckCircle2,
  Users,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const { sessionUser, curriculumSample } = await getPublicSanctuaryData();

  const mealLines = curriculumSample.mealRecommendation
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      <PublicMobileBackdrop />

      <div className="relative z-10 max-w-5xl w-full mx-auto px-5 sm:px-10 py-5 sm:py-8 flex-1 flex flex-col justify-between space-y-6 sm:space-y-10">
        {/* TOP: LOGO + BORDERLESS THEME ICON */}
        <PublicTopBrand />

        <div className="space-y-6 sm:space-y-10 my-auto">
          {/* HEADER */}
          <section className="space-y-2.5 max-w-3xl">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 block">
              Curriculum Architecture • Synchronized 00:00 WIB Protocol
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
              Three Daily Disciplines &amp; Module Structure
            </h1>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Every cohort day is structured around three scheduled checkpoints
              (07:00, 12:30, and 20:30 WIB) across Movement, Clean Nourishment,
              and Recovery—backed by Training Days, Rest Days, and Live
              Connection Days.
            </p>
          </section>

          {/* THREE DAILY PILLARS (FROM DATABASE CURRICULUM) */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {/* PILLAR 1: MOVEMENT */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400 font-semibold">
                    01 / MOVEMENT • 07:00 WIB
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white">
                  Guided Video &amp; Workout Selection
                </h2>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Watch the daily guided sequence, check off your movement
                  milestones, and upload optional before/after progress photos.
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                    Daily Video Checklist:
                  </span>
                  <ul className="space-y-1">
                    {curriculumSample.videoChecklist.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                  Available Workout Options:
                </span>
                <div className="flex flex-wrap gap-1">
                  {curriculumSample.workoutOptions.map((opt) => (
                    <span
                      key={opt}
                      className="px-2 py-0.5 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[10px] font-medium text-zinc-900 dark:text-zinc-100"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PILLAR 2: FUEL */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400 font-semibold">
                    02 / FUEL • 12:30 WIB
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white">
                  Anti-Inflammatory Whole Food Protocol
                </h2>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Follow the daily whole-food menu and log your compliance level
                  (Full, Partial, or Custom Meal Notes) inside your Member
                  Dashboard.
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                    Sample Daily Menu:
                  </span>
                  <ul className="space-y-1.5">
                    {mealLines.map((line, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[10px] font-mono text-zinc-800 dark:text-zinc-200">
                  Compliance Modes: FULL • PARTIAL • NOTES
                </span>
              </div>
            </div>

            {/* PILLAR 3: RECOVERY */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400 font-semibold">
                    03 / RECOVERY • 20:30 WIB
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white">
                  Sleep Telemetry &amp; Dear Diary
                </h2>

                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  Record your daily reflection in Dear Diary, rate your
                  happiness (1–5), and log your bedtime and wake time before the
                  23:59 WIB daily cutoff.
                </p>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                    Evening Checkpoints:
                  </span>
                  <ul className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                      <span>{curriculumSample.sleepRecommendation}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                      <span>
                        Dear Diary reflection &amp; happiness rating (1–5)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                      <span>
                        Automatic sleep duration calculation (Bedtime &rarr;
                        Wake Time)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[10px] font-mono text-zinc-800 dark:text-zinc-200">
                  Daily Cutoff: 23:59 WIB
                </span>
              </div>
            </div>
          </section>

          {/* REST DAYS & CONNECTION DAYS IN THE DATABASE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rest Day Module (Every 4th Day)</span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                Active Restoration &amp; Cellular Recovery
              </h3>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {curriculumSample.restInstructions}
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span>Connection Day Module (Every 7th Day)</span>
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                Cohort Live Circle &amp; Form Review
              </h3>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {curriculumSample.connectionVenue} &bull;{" "}
                {curriculumSample.connectionSchedule}
              </p>
            </div>
          </section>

          {/* BACK TO SIGN IN & NEXT PAGE BUTTONS */}
          <PublicPageActions
            sessionUser={sessionUser}
            nextHref="/programs"
            nextLabel="Next: Programs"
          />
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
