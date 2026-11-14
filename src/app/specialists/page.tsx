import Link from "next/link";
import Image from "next/image";
import { getPublicSanctuaryData } from "@/wellness/public-data";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
  PublicPageActions,
} from "@/components/home/PublicNavbar";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const DEFAULT_COACH_PROFILES = [
  {
    id: "coach-1",
    name: "Coach Sarah Jenkins, CPT",
    title: "Senior Mobility & Pilates Specialist",
    programs: [
      {
        id: "prog-1",
        title: "21-Day Holistic Movement & Spinal Longevity",
        category: "Pilates, Mobility & Longevity",
        durationDays: 21,
        dailyCommitment: "25 - 30 Mins / Day",
        recommendedFor: "Desk Professionals & Sedentary Workers",
      },
    ],
  },
  {
    id: "coach-2",
    name: "Dr. Marcus Vance, ND",
    title: "Director of Longevity Nutrition",
    programs: [
      {
        id: "prog-2",
        title: "14-Day Anti-Inflammatory Nutrition & Gut Reset",
        category: "Nutrition & Gut Health",
        durationDays: 14,
        dailyCommitment: "15 - 20 Mins / Day",
        recommendedFor: "All Levels & Beginners",
      },
    ],
  },
  {
    id: "coach-3",
    name: "Coach Julian Thorne",
    title: "Neuro-Breathwork & Sleep Specialist",
    programs: [
      {
        id: "prog-3",
        title: "Executive Deep Sleep & Parasympathetic Breathwork",
        category: "Breathwork & Sleep",
        durationDays: 7,
        dailyCommitment: "15 - 20 Mins / Day",
        recommendedFor: "Founders & High-Performance Executives",
      },
    ],
  },
  {
    id: "coach-4",
    name: "Coach Elena Rostova",
    title: "Fascial Release & Posture Director",
    programs: [
      {
        id: "prog-4",
        title: "30-Day Hot/Cold Thermogenesis & Cellular Vitality",
        category: "Mobility & Longevity, Strength & Conditioning",
        durationDays: 30,
        dailyCommitment: "45 Mins / Day",
        recommendedFor: "All Levels & Beginners",
      },
    ],
  },
];

const COACH_FALLBACK_IMAGES = [
  "/coach.webp",
  "/coach2.webp",
  "/coach3.webp",
  "/pic.webp",
];

export default async function SpecialistsPage() {
  const { sessionUser, coaches } = await getPublicSanctuaryData();

  const displayCoaches =
    coaches && coaches.length > 0 ? coaches : DEFAULT_COACH_PROFILES;

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
              Specialist Faculty • Master Coaches ({displayCoaches.length})
            </span>
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
              Guided by Specialists
            </h1>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Meet the Master Coaches registered in our Sanctuary directory and
              inspect the active cohorts they personally lead.
            </p>
          </section>

          {/* SPECIALISTS GRID (COMPACT ON MOBILE, HIGH-CONTRAST) */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {displayCoaches.map((coach, idx) => {
              const portraitSrc =
                COACH_FALLBACK_IMAGES[idx % COACH_FALLBACK_IMAGES.length];

              return (
                <article
                  key={coach.id}
                  className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/85 lg:bg-zinc-200/50 dark:bg-zinc-900/85 lg:dark:bg-white/[0.05] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Compact Portrait & Title Row */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-zinc-950 shrink-0">
                        <Image
                          src={portraitSrc}
                          alt={coach.name}
                          fill
                          className="object-cover object-top grayscale contrast-[1.08]"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                          Master Coach #{idx + 1}
                        </span>
                        <h2 className="text-base sm:text-lg font-geometric font-semibold text-zinc-950 dark:text-white truncate">
                          {coach.name}
                        </h2>
                        <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate">
                          {coach.title}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Programs from Database */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                        Assigned Cohorts ({coach.programs.length}):
                      </span>

                      {coach.programs.length === 0 ? (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          Available for upcoming seasonal cohorts &amp; studio
                          sessions.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {coach.programs.map((prog) => (
                            <li
                              key={prog.id}
                              className="p-2.5 sm:p-3 rounded-xl bg-zinc-900/[0.05] dark:bg-white/[0.05] space-y-1"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-semibold text-zinc-950 dark:text-white leading-snug flex items-start gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>{prog.title}</span>
                                </span>
                                <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 shrink-0">
                                  {prog.durationDays}d
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 pl-5">
                                {prog.category}
                                {prog.dailyCommitment
                                  ? ` • ${prog.dailyCommitment}`
                                  : ""}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-end">
                    <Link
                      href="/programs"
                      className="text-xs font-semibold text-zinc-950 dark:text-white hover:underline underline-offset-4 inline-flex items-center gap-1"
                    >
                      <span>View Cohort Details</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>

          {/* BACK TO SIGN IN & NEXT PAGE BUTTONS */}
          <PublicPageActions
            sessionUser={sessionUser}
            nextHref="/concierge"
            nextLabel="Next: Concierge"
          />
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
