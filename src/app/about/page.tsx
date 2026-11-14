import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import {
  Clock,
  ShieldCheck,
  MapPin,
  Layers,
  Users,
  Dumbbell,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const {
    sessionUser,
    programs,
    coaches,
    categories,
    audiences,
    equipments,
    commitments,
  } = await getPublicSanctuaryData();

  const distinctVenues = Array.from(
    new Set(
      programs
        .map((p) => p.venueAddress)
        .filter((v): v is string => Boolean(v && v.trim().length > 0))
    )
  );

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      <PublicMobileBackdrop />

      <div className="relative z-10 max-w-5xl w-full mx-auto px-5 sm:px-10 py-5 sm:py-8 flex-1 flex flex-col justify-between space-y-6 sm:space-y-10">
        {/* TOP: LOGO + BORDERLESS THEME ICON */}
        <PublicTopBrand />

        <div className="space-y-6 sm:space-y-10 my-auto">
          {/* HERO SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 block">
                About BMS Sanctuary • Jakarta Selatan &amp; Online
              </span>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
                Consistency over intensity. Structured daily longevity cohorts.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                BMS Sanctuary is a structured movement, anti-inflammatory
                nutrition, and sleep restoration platform. Each cohort combines
                daily guided video modules unlocked at 00:00 WIB, meal
                compliance tracking, Dear Diary reflection, and live community
                sessions in Senopati or online.
              </p>

              {/* Real Database Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05]">
                  <span className="text-base sm:text-xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    {programs.length} Cohorts
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                    Published Programs
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05]">
                  <span className="text-base sm:text-xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    {coaches.length} Coaches
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                    Specialist Faculty
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05]">
                  <span className="text-base sm:text-xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    {categories.length} Pillars
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                    Master Categories
                  </span>
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05]">
                  <span className="text-base sm:text-xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    00:00 WIB
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400">
                    Daily Module Unlock
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-5 relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-zinc-950">
              <Image
                src="/pic.webp"
                alt="BMS Sanctuary Philosophy"
                fill
                priority
                className="object-cover object-center grayscale contrast-[1.08] brightness-[0.85]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 block">
                  Sanctuary Architecture
                </span>
                <p className="text-xs font-geometric font-light text-zinc-100 leading-snug">
                  Synchronized daily movement, whole-food nourishment, and sleep
                  telemetry.
                </p>
              </div>
            </div>
          </section>

          {/* CORE PLATFORM PILLARS */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <Clock className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  00:00 WIB Daily Protocol
                </h2>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Each cohort day unlocks automatically at midnight WIB with
                guided workout videos, a 3-step movement checklist, meal
                compliance tracking, Dear Diary reflection, and sleep logging.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  Capped Cohort Accountability
                </h2>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Cohorts are strictly capped (3 to 35 seats per batch) with live
                leaderboard scoring, baseline health profile tracking (weight,
                waist, sleep, mood), and direct specialist oversight.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
                <MapPin className="w-4 h-4 shrink-0" />
                <h2 className="text-sm sm:text-base font-semibold">
                  Online, On-Site &amp; Hybrid
                </h2>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Join 100% online or attend in-person Connection Days at{" "}
                {distinctVenues[0] ||
                  "The Sanctuary Wellness Pavilion, Senopati, Jakarta Selatan"}{" "}
                with virtual live-stream fallback.
              </p>
            </div>
          </section>

          {/* REAL DATABASE DIRECTORIES (CATEGORIES, AUDIENCES, EQUIPMENT & COMMITMENT) */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                <Layers className="w-3.5 h-3.5" />
                <span>Master Categories</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[11px] font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span>Target Audiences</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {audiences.map((aud) => (
                  <span
                    key={aud}
                    className="px-2.5 py-1 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[11px] font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {aud}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-400">
                <Dumbbell className="w-3.5 h-3.5" />
                <span>Equipment &amp; Daily Time</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...equipments, ...commitments].map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 rounded-full bg-zinc-900/10 dark:bg-white/10 text-[11px] font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* BACK TO SIGN IN & NEXT PAGE BUTTONS */}
          <PublicPageActions
            sessionUser={sessionUser}
            nextHref="/curriculum"
            nextLabel="Next: Curriculum"
          />
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
