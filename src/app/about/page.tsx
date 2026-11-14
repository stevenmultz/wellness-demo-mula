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
  Clock,
  ShieldCheck,
  MapPin,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

const BRAND_PARTNERS = [
  { name: "AESOP", category: "Botanical Partner" },
  { name: "ALO", category: "Movement Gear" },
  { name: "OURA", category: "Recovery Science" },
  { name: "EQUINOX", category: "Studio Partner" },
  { name: "EREWHON", category: "Nutrition Curation" },
  { name: "KINFOLK", category: "Editorial" },
];

export default async function AboutPage() {
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
          {/* HERO SECTION */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-400 dark:text-zinc-500 block">
                About BMS Sanctuary • South Jakarta
              </span>
              <h1 className="text-3xl sm:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.12]">
                Consistency over intensity. Discipline in quiet ease.
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                BMS is a minimalist longevity and movement sanctuary anchored in
                Senopati, South Jakarta. We do not train for exhaustion—we
                architect private 35-member cohorts that synchronize daily
                functional mobility, anti-inflammatory whole-food nourishment,
                and circadian sleep restoration.
              </p>

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-6 pt-4">
                <div>
                  <span className="text-2xl sm:text-3xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    35 Max
                  </span>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Cohort Member Cap
                  </span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    00:00 WIB
                  </span>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Synchronized Unlock
                  </span>
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-geometric font-semibold text-zinc-950 dark:text-white block">
                    3 Pillars
                  </span>
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                    Move • Fuel • Rest
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-5 relative aspect-[4/5] w-full rounded-3xl overflow-hidden bg-zinc-950">
              <Image
                src="/pic.webp"
                alt="BMS Sanctuary Philosophy"
                fill
                priority
                className="object-cover object-center grayscale contrast-[1.08] brightness-[0.85]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300 block">
                  BMS Manifesto
                </span>
                <p className="text-sm font-geometric font-light text-zinc-100 leading-snug">
                  &ldquo;Architectural longevity built through small, non-negotiable daily rituals.&rdquo;
                </p>
              </div>
            </div>
          </section>

          {/* CORE PRINCIPLES */}
          <section className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500 block">
                How the Sanctuary Operates
              </span>
              <h2 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                Engineered for Long-Term Vitality
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
                <Clock className="w-5 h-5 text-zinc-950 dark:text-white" />
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Synchronized 00:00 WIB Protocol
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Every cohort day unlocks automatically at midnight WIB with
                  guided movement videos, whole-food meal compliance checklists,
                  Dear Diary reflection, and sleep duration tracking inside your
                  Member Dashboard.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
                <ShieldCheck className="w-5 h-5 text-zinc-950 dark:text-white" />
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Intimate 35-Member Cohorts
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Each cohort is strictly capped at 35 participants to preserve
                  direct specialist feedback, intimate community circles, and
                  high daily completion accountability.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-3">
                <MapPin className="w-5 h-5 text-zinc-950 dark:text-white" />
                <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                  Senopati Studio &amp; Hybrid Access
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Combine daily digital protocols with curated in-person
                  Connection &amp; Meetup Days at our Senopati sanctuary—with
                  full online streaming fallback whenever you travel.
                </p>
              </div>
            </div>
          </section>

          {/* CULTURAL PARTNERS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated Ecosystem &amp; Cultural Alignment</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {BRAND_PARTNERS.map((partner) => (
                <div
                  key={partner.name}
                  className="p-4 rounded-2xl bg-zinc-200/45 dark:bg-white/[0.04] space-y-0.5"
                >
                  <span className="text-xs font-mono font-semibold tracking-widest text-zinc-950 dark:text-white block">
                    {partner.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block">
                    {partner.category}
                  </span>
                </div>
              ))}
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
              href="/curriculum"
              className="h-12 px-7 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
            >
              <span>Explore Curriculum</span>
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
