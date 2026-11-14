import Link from "next/link";
import Image from "next/image";
import { getWellnessSession } from "@/wellness/security/session";
import {
  PublicTopBrand,
  PublicBottomNavbar,
} from "@/components/home/PublicNavbar";
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  Flame,
  Moon,
  CheckCircle2,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

const DAILY_DISCIPLINES = [
  {
    number: "01",
    pillar: "MOVEMENT",
    time: "07:00 WIB",
    title: "Functional Spine & Joint Longevity",
    Icon: Activity,
    summary:
      "25-minute guided Pilates and functional mobility sequences unlocked at dawn to decompress posture, stabilize deep core mechanics, and cultivate resilient joint control.",
    highlights: [
      "Full HD guided video stream with automatic progress tracking",
      "Thoracic decompression, hip mobility, and scapular stability",
      "Zero high-impact joint strain—engineered for daily consistency",
    ],
  },
  {
    number: "02",
    pillar: "FUEL",
    time: "12:30 WIB",
    title: "Anti-Inflammatory Whole Food Nourishment",
    Icon: Flame,
    summary:
      "Curated whole-food nutrition protocols designed to eliminate glycemic crashes, reduce systemic inflammation, and support gut microbiome balance without calorie-counting fatigue.",
    highlights: [
      "Daily curated Breakfast, Lunch, and Dinner whole-food menus",
      "One-tap meal compliance logging inside your Member Dashboard",
      "Optional photo journal and ingredient notes per meal",
    ],
  },
  {
    number: "03",
    pillar: "RECOVERY",
    time: "20:30 WIB",
    title: "Circadian Restoration & Dear Diary",
    Icon: Moon,
    summary:
      "Evening parasympathetic down-regulation combining breathwork, personal reflection in Dear Diary, and sleep architecture logging for deep overnight cellular repair.",
    highlights: [
      "Guided evening wind-down & nervous system decompression",
      "Dear Diary reflection journal with mood and photo memories",
      "Bedtime and wake-time sleep duration tracking",
    ],
  },
];

export default async function CurriculumPage() {
  const sessionUser = await getWellnessSession();

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      {/* Mobile Full-Screen Image Background */}
      <div className="fixed inset-0 z-0 lg:hidden pointer-events-none">
        <Image
          src="/pic.webp"
          alt=""
          fill
          priority
          className="object-cover object-center grayscale contrast-[1.08]"
        />
        <div className="absolute inset-0 bg-[#f6f6f4]/88 dark:bg-[#0e0e0e]/88 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 max-w-5xl w-full mx-auto px-6 sm:px-10 py-6 sm:py-8 flex-1 flex flex-col justify-between space-y-12 sm:space-y-16">
        {/* TOP: LOGO + TEXT THEME TOGGLE */}
        <PublicTopBrand />

        <div className="space-y-12 sm:space-y-16">
          {/* HEADER */}
          <section className="space-y-4 max-w-3xl">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500 block">
              Curriculum Architecture • 24-Hour Circadian Rhythm
            </span>
            <h1 className="text-3xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
              Three Daily Disciplines
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Every BMS cohort follows a synchronized daily rhythm. Rather than
              overwhelming your schedule, each day is structured around three
              precise checkpoints across morning movement, midday nourishment,
              and evening restoration.
            </p>
          </section>

          {/* THREE PILLARS DETAIL */}
          <section className="space-y-6">
            {DAILY_DISCIPLINES.map((item) => {
              const Icon = item.Icon;
              return (
                <div
                  key={item.number}
                  className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                >
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 font-semibold">
                        {item.number} / {item.pillar} • {item.time}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white">
                      {item.title}
                    </h2>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {item.summary}
                    </p>
                    <ul className="space-y-2">
                      {item.highlights.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </section>

          {/* TRAINING DAYS VS CONNECTION DAYS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                Digital Protocol
              </span>
              <h3 className="text-lg sm:text-xl font-geometric font-medium text-zinc-950 dark:text-white">
                Training Days (Self-Paced Daily Unlock)
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Unlocks every midnight at 00:00 WIB. Complete your movement
                video, check off your three clean meals, log your sleep hours,
                and write your Dear Diary entry to earn daily consistency points
                on the cohort leaderboard.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                <Users className="w-3.5 h-3.5" />
                <span>Sanctuary Gathering</span>
              </div>
              <h3 className="text-lg sm:text-xl font-geometric font-medium text-zinc-950 dark:text-white">
                Connection &amp; Meetup Days
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Scheduled live studio sessions in Senopati (or interactive live
                stream for remote members) where specialists refine your form,
                answer nutrition questions, and connect the 35-member cohort.
              </p>
            </div>
          </section>

          {/* SINGLE BACK TO SIGN IN CTA */}
          <section className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="h-12 px-7 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>
                {sessionUser ? "Return to Account" : "Back to Sign In"}
              </span>
            </Link>

            <Link
              href="/programs"
              className="h-12 px-7 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
            >
              <span>View Active Programs</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>
    </div>
  );
}
