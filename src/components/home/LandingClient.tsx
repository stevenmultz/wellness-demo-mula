"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { resolvePublicBadge, PublicProgramBadge } from "@/wellness/utils/timeline";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  Quote,
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Activity,
  Flame,
  Moon,
} from "lucide-react";

interface LandingClientProps {
  sessionUser: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
  programs: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    coverImage?: string | null;
    category?: string | null;
    recommendedFor?: string | null;
    coachName?: string | null;
    coachTitle?: string | null;
    durationDays?: number;
    trainingDays?: number;
    connectionDays?: number;
    actualPrice?: number;
    discountPercentage?: number;
    price: number;
    maxQuota: number;
    enrolledCount: number;
    isUserEnrolled?: boolean;
    locationType?: string | null;
    city?: string | null;
    venueAddress?: string | null;
    virtualFallbackAvailable?: boolean | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    registrationOpenDate?: Date | string | null;
    registrationDeadline?: Date | string | null;
    status?: string | null;
    isPublished?: boolean;
    dayCount: number;
    termsList?: string[];
  }>;
  coaches?: Array<{
    id: string;
    name: string;
    title: string;
  }>;
}

const COACH_PROFILES = [
  {
    name: "Marcus Vance",
    role: "Movement & Mobility Lead",
    specialty: "Functional Movement & Spine Longevity",
    image: "/coach.webp",
  },
  {
    name: "Elena Rostova",
    role: "Nutrition & Longevity Director",
    specialty: "Anti-Inflammatory Protocols",
    image: "/coach2.webp",
  },
  {
    name: "Julian Thorne",
    role: "Breathwork & Recovery Lead",
    specialty: "Parasympathetic Recovery & Sleep",
    image: "/coach3.webp",
  },
];

const COACH_FALLBACK_IMAGES = ["/coach.webp", "/coach2.webp", "/coach3.webp", "/coach.webp"];

const BRAND_PARTNERS = [
  { name: "AESOP", category: "Botanical Partner" },
  { name: "ALO", category: "Movement Gear" },
  { name: "OURA", category: "Recovery Science" },
  { name: "EQUINOX", category: "Studio Partner" },
  { name: "EREWHON", category: "Nutrition Curation" },
  { name: "KINFOLK", category: "Editorial" },
];

export function LandingClient({ sessionUser, programs, coaches }: LandingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup" | "forgot">("signup");
  const [deletedNotice, setDeletedNotice] = useState(false);
  const [activeCohortIdx, setActiveCohortIdx] = useState(0);

  const displayCohorts = programs.slice(0, 6);

  const displayCoaches =
    coaches && coaches.length > 0
      ? coaches.map((c, idx) => ({
          name: c.name,
          role: c.title || "Specialist Faculty",
          specialty: c.title || "Movement & Protocol",
          image: COACH_FALLBACK_IMAGES[idx % COACH_FALLBACK_IMAGES.length],
        }))
      : COACH_PROFILES;

  const handleNextCohort = () => {
    if (displayCohorts.length === 0) return;
    setActiveCohortIdx((prev) => (prev + 1) % displayCohorts.length);
  };

  const handlePrevCohort = () => {
    if (displayCohorts.length === 0) return;
    setActiveCohortIdx((prev) => (prev - 1 + displayCohorts.length) % displayCohorts.length);
  };

  useEffect(() => {
    const authQuery = searchParams.get("auth");
    const isDeleted = searchParams.get("deleted");

    if (authQuery === "signin" || authQuery === "signup" || authQuery === "forgot") {
      setAuthTab(authQuery);
      setAuthModalOpen(true);
    }
    if (isDeleted === "true") {
      setDeletedNotice(true);
    }
  }, [searchParams]);

  const openAuth = (tab: "signin" | "signup" | "forgot" = "signup") => {
    setAuthTab(tab);
    setAuthModalOpen(true);
  };

  const handleProgramAction = (programId: string) => {
    if (sessionUser) {
      router.push(`/dashboard?enroll=${programId}`);
    } else {
      openAuth("signup");
    }
  };

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-zinc-950 font-sans bg-[#f6f6f4] dark:bg-[#0e0e0e] transition-colors duration-300">
      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm glass-panel py-2.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            <span className="text-xs text-zinc-900 dark:text-zinc-100">Your account has been deleted.</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setDeletedNotice(false)}
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. SEAMLESS FULL-WIDTH TOP NAVIGATION                                 */}
      {/* ===================================================================== */}
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="fixed top-0 left-0 right-0 z-50 w-full bg-[#f6f6f4]/90 dark:bg-[#0e0e0e]/90 border-b border-zinc-200/70 dark:border-white/10 transition-colors duration-300"
      >
        <div className="max-w-5xl mx-auto h-14 px-4 sm:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 group shrink-0" title="Home">
          <span className="font-mono font-light text-xl text-zinc-900 dark:text-white leading-none">
            +
          </span>
          <span className="font-geometric font-semibold text-xs tracking-[0.28em] text-zinc-900 dark:text-white uppercase">
            BMS
          </span>
        </Link>

        <nav aria-label="Primary Navigation" className="flex items-center gap-3 sm:gap-6 text-xs">
          <a
            href="#curriculum"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-xs font-medium hidden sm:inline"
          >
            Curriculum
          </a>
          <a
            href="#programs"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-xs font-medium"
          >
            Programs
          </a>
          <a
            href="#coaches"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-xs font-medium hidden sm:inline"
          >
            Specialists
          </a>
          <a
            href="#contact"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-xs font-medium"
          >
            Contact
          </a>

          <div className="h-3 w-px bg-zinc-200 dark:bg-white/10" />

          <ThemeToggle />

          {sessionUser ? (
            <div className="flex items-center gap-1.5 font-mono">
              {sessionUser.role === "SUPERADMIN" && (
                <Link
                  href="/admin"
                  className="px-2.5 py-1 rounded-full border border-zinc-300 dark:border-white/15 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[10px] font-bold tracking-wider uppercase transition shadow-sm"
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => openAuth("signin")}
                className="px-2 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-[10px] font-semibold uppercase tracking-wider"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="px-3.5 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-wider transition shadow-sm"
              >
                Join
              </button>
            </div>
          )}
        </nav>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. HERO: SLEEK LUXURY SPORT ATHLETIC MINIMALISM                       */}
      {/* ===================================================================== */}
      <section
        style={{ paddingTop: "calc(4.5rem + env(safe-area-inset-top))" }}
        className="relative w-full min-h-screen pb-16 sm:pb-24 px-4 sm:px-8 flex items-center justify-center overflow-hidden bg-neutral-950 text-white"
      >
        {/* Full-width Ambient Motion Video & Fallback Poster */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/pic.webp"
            className="w-full h-full object-cover scale-105 opacity-45"
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Deep Athletic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-neutral-950 pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto w-full text-center space-y-4 my-auto">
          {/* Micro Athletic Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-zinc-300">
              Private Athletic Cohort • 35 Member Cap
            </span>
          </div>

          {/* Main Headline - Compact Luxury Sport Scale (26px - 32px) */}
          <h1 className="text-[26px] sm:text-[32px] font-geometric font-light tracking-tight text-white leading-[1.2] uppercase max-w-xl mx-auto">
            Precision Movement. <br />
            <span className="font-normal text-zinc-300">Engineered Longevity.</span>
          </h1>

          {/* Single clean subline */}
          <p className="text-xs sm:text-[13px] text-zinc-300 font-sans font-normal max-w-md mx-auto leading-relaxed">
            Synchronized 00:00 morning protocols, whole-food nourishment, and circadian recovery tracking.
          </p>

          {/* Crisp Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 font-mono">
            <a
              href="#programs"
              className="px-5 py-2.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-2 shadow-lg transition active:scale-[0.98]"
            >
              <span>Explore Programs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            {!sessionUser ? (
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/20 text-[11px] font-medium tracking-wider uppercase transition backdrop-blur-md"
              >
                Join Next Batch
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/20 text-[11px] font-medium tracking-wider uppercase transition backdrop-blur-md inline-flex items-center gap-2"
              >
                <span>Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. CORE PILLARS: 3 SLEEK CARDS (MOVEMENT, FUEL, RECOVERY)            */}
      {/* ===================================================================== */}
      <section id="curriculum" className="py-14 sm:py-20 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 bg-[#f6f6f4] dark:bg-[#0e0e0e]">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em] font-semibold">
              Curriculum Core
            </span>
            <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white uppercase">
              Three Daily Disciplines
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Pillar 1 */}
            <div className="p-5 rounded-2xl glass-panel flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
                  01 / MOVEMENT
                </span>
                <Activity className="w-4 h-4 text-zinc-900 dark:text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-geometric font-semibold text-zinc-900 dark:text-white">
                  Functional Spine &amp; Joint
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  25-minute targeted mobility sequences unlocked at dawn to decompress sedentary posture.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-2xl glass-panel flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
                  02 / FUEL
                </span>
                <Flame className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-geometric font-semibold text-zinc-900 dark:text-white">
                  Whole Food Fuel
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Zero-dietary-fatigue whole food menus crafted for sustained metabolic focus.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-2xl glass-panel flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-semibold">
                  03 / RECOVERY
                </span>
                <Moon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[15px] font-geometric font-semibold text-zinc-900 dark:text-white">
                  Circadian Restoration
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Down-regulating breathwork and sleep tracking to optimize deep parasympathetic repair.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. CURATED PROGRAMS SHOWCASE                                          */}
      {/* ===================================================================== */}
      <section id="programs" className="py-14 sm:py-20 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 bg-[#f6f6f4] dark:bg-[#0e0e0e]">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/10">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em] font-semibold">
                Curated Cohorts
              </span>
              <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white uppercase">
                Active Programs
              </h2>
            </div>

            {/* Carousel Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevCohort}
                aria-label="Previous program"
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center transition active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              </button>
              <button
                type="button"
                onClick={handleNextCohort}
                aria-label="Next program"
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 flex items-center justify-center transition active:scale-95"
              >
                <ChevronRight className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              </button>
            </div>
          </div>

          {/* Program Card Viewport */}
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/15 bg-zinc-950 shadow-xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeCohortIdx * 100}%)` }}
            >
              {displayCohorts.map((prog, idx) => {
                const startDate = formatDate(prog.startDate);
                const publicBadge: PublicProgramBadge = resolvePublicBadge({
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
                    ? `On-Site • ${prog.city || "Jakarta"}`
                    : `Hybrid • ${prog.city || "Jakarta"}`;

                const cohortImages = ["/test.webp", "/pic.webp", "/image.webp", "/coach.webp", "/coach2.webp"];
                const cohortImage =
                  prog.coverImage && prog.coverImage.trim().length > 0
                    ? prog.coverImage
                    : cohortImages[idx % cohortImages.length];

                return (
                  <div key={prog.id} className="w-full shrink-0 min-w-full">
                    <div className="relative min-h-[340px] sm:min-h-[380px] p-5 sm:p-8 flex flex-col justify-between overflow-hidden">
                      {/* Background Image with Dark Vignette */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <Image
                          src={cohortImage}
                          alt={prog.title}
                          fill
                          priority={idx === 0}
                          className="object-cover object-center brightness-[0.55] contrast-[1.08]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40 pointer-events-none" />
                      </div>

                      {/* Top Badges */}
                      <div className="relative z-10 flex flex-wrap items-center gap-2 font-mono">
                        <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">
                          {prog.trainingDays || prog.durationDays || 3} Training Days
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">
                          {attendanceLabel}
                        </span>

                        {publicBadge === "Open Registration" && (
                          <span className="px-2.5 py-1 rounded-full bg-white text-zinc-950 font-bold text-[10px] tracking-wider flex items-center gap-1.5 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                            <span>OPEN</span>
                          </span>
                        )}
                        {publicBadge === "Coming Soon" && (
                          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-300 font-bold text-[10px] tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            <span>COMING SOON</span>
                          </span>
                        )}
                        {publicBadge === "Full" && (
                          <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 font-bold text-[10px] tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                            <span>FULL</span>
                          </span>
                        )}
                        {publicBadge === "On going" && (
                          <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white font-bold text-[10px] tracking-wider flex items-center gap-1.5 backdrop-blur-md">
                            <span>ON GOING</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="relative z-10 max-w-xl space-y-2 py-4">
                        <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-2">
                          <span>Coach {prog.coachName}</span>
                          {startDate && (
                            <>
                              <span>•</span>
                              <span>Starts {startDate}</span>
                            </>
                          )}
                          {prog.category && (
                            <>
                              <span>•</span>
                              <span className="text-zinc-200">{prog.category}</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-white leading-snug">
                          {prog.title}
                        </h3>

                        {prog.recommendedFor && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.08] border border-white/10 text-[11px] text-zinc-200 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-white shrink-0" />
                            <span>For: {prog.recommendedFor}</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Area */}
                      <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between gap-3 font-mono">
                        <div className="text-[11px] text-zinc-300">
                          35 Member Cap &bull; Private Access
                        </div>

                        <div>
                          {sessionUser && prog.isUserEnrolled ? (
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard")}
                              className="px-5 py-2 rounded-full bg-white text-zinc-950 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 transition hover:bg-zinc-200"
                            >
                              <span>Enrolled • Dashboard</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : isEnrollable ? (
                            <button
                              type="button"
                              onClick={() => handleProgramAction(prog.id)}
                              className="px-5 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 transition active:scale-[0.98] shadow-lg"
                            >
                              <span>Join Now</span>
                              <span>•</span>
                              <span>Rp {prog.price.toLocaleString("id-ID")}</span>
                              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-5 py-2 rounded-full bg-zinc-900 border border-white/10 text-[11px] font-medium text-zinc-400 cursor-not-allowed"
                            >
                              <span>{publicBadge}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. SPECIALISTS / COACHES: COMPACT PORTRAITS                           */}
      {/* ===================================================================== */}
      <section id="coaches" className="py-14 sm:py-20 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 bg-[#f6f6f4] dark:bg-[#0e0e0e]">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="space-y-0.5 border-b border-zinc-200/80 dark:border-white/10 pb-3">
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em] font-semibold">
              Specialist Faculty
            </span>
            <h2 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white uppercase">
              Guided by Specialists
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {displayCoaches.map((coach, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden min-h-[290px] p-4 flex flex-col justify-between group border border-zinc-200 dark:border-white/10 shadow-sm"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Image
                    src={coach.image}
                    alt={coach.name}
                    fill
                    className="object-cover object-top brightness-[0.72] group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-mono text-zinc-100 uppercase tracking-wider font-semibold">
                    {coach.specialty.split("&")[0].trim()}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                <div className="relative z-10 space-y-0.5 text-white">
                  <h3 className="text-base font-geometric font-medium tracking-tight">
                    {coach.name}
                  </h3>
                  <span className="text-[11px] text-zinc-300 block">
                    {coach.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. EDITORIAL STATEMENT                                                */}
      {/* ===================================================================== */}
      <section className="py-14 sm:py-20 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 text-center bg-[#eeeeec]/50 dark:bg-[#141414]">
        <div className="max-w-2xl mx-auto space-y-3.5">
          <Quote className="w-5 h-5 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <blockquote className="font-geometric text-lg sm:text-xl text-zinc-800 dark:text-zinc-200 font-light leading-snug">
            &ldquo;Consistency over intensity. Discipline in quiet ease.&rdquo;
          </blockquote>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
            Philosophy &bull; Jakarta
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. PARTNERS STRIP                                                     */}
      {/* ===================================================================== */}
      <section className="py-8 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 font-mono bg-[#f6f6f4] dark:bg-[#0e0e0e]">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-zinc-500 text-[11px] uppercase tracking-widest font-semibold">
          {BRAND_PARTNERS.map((p, idx) => (
            <span key={idx} className="hover:text-zinc-900 dark:hover:text-zinc-300 transition">
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. CONCIERGE & FOOTER                                                 */}
      {/* ===================================================================== */}
      <footer id="contact" className="py-12 px-4 sm:px-8 border-t border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 text-xs bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.22em] font-semibold block">
                Private Concierge
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300">
                Studio: Senopati, South Jakarta • By Appointment
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <a
                href="https://wa.me/6281290002026?text=Hello%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white text-[11px] font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>

              <a
                href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                className="px-4 py-2 rounded-full border border-zinc-300 hover:bg-zinc-100 text-zinc-800 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/15 dark:text-white text-[11px] font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>Email</span>
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-900 dark:text-white font-light text-xl leading-none">+</span>
              <span className="text-zinc-900 dark:text-white font-semibold text-xs tracking-[0.28em] uppercase font-geometric">BMS</span>
              <span className="text-zinc-400 dark:text-zinc-600">•</span>
              <span className="text-zinc-600 dark:text-zinc-400 font-sans">Minimalist Longevity Sanctuary</span>
            </div>

            <span className="text-zinc-500">© 2026 BMS Sanctuary</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
      />
    </div>
  );
}
