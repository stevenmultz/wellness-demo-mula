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
  Calendar,
  User,
  Users,
  Sparkles,
  Clock,
  Dumbbell,
  CheckCircle2,
  Quote,
  MessageCircle,
  Mail,
  MapPin,
  Moon,
  Coffee,
  ChevronLeft,
  ChevronRight,
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
}

const COACH_PROFILES = [
  {
    name: "Marcus Vance",
    role: "Movement & Mobility Lead",
    specialty: "Functional Movement & Spine Longevity",
    bio: "Spinal decompression and joint resilience engineered for high-performing professionals.",
    image: "/coach.jpg",
  },
  {
    name: "Elena Rostova",
    role: "Nutrition & Longevity Director",
    specialty: "Anti-Inflammatory Protocols",
    bio: "Metabolic energy stabilization through clean whole food curation without dietary fatigue.",
    image: "/coach2.jpg",
  },
  {
    name: "Julian Thorne",
    role: "Breathwork & Recovery Lead",
    specialty: "Parasympathetic Recovery & Deep Sleep",
    bio: "Breath regulation protocols that guide intense schedules into deep restorative rest.",
    image: "/coach3.jpg",
  },
];

const BRAND_PARTNERS = [
  { name: "AESOP", category: "Botanical Partner" },
  { name: "ALO SANCTUARY", category: "Movement Gear" },
  { name: "OURA", category: "Recovery Science" },
  { name: "EQUINOX", category: "Studio Partner" },
  { name: "EREWHON", category: "Nutrition Curation" },
  { name: "KINFOLK", category: "Editorial Feature" },
];

export function LandingClient({ sessionUser, programs }: LandingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup" | "forgot">("signup");
  const [deletedNotice, setDeletedNotice] = useState(false);
  const [activeCohortIdx, setActiveCohortIdx] = useState(0);

  const displayCohorts = programs.slice(0, 5);

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
    <div className="min-h-screen flex flex-col relative overflow-x-hidden text-zinc-900 dark:text-zinc-100 selection:bg-zinc-800 selection:text-white font-mono">
      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md glass-panel py-3 px-4 rounded-2xl text-xs font-mono flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-zinc-300" />
            <span>Your account has been deleted.</span>
          </div>
          <button
            onClick={() => setDeletedNotice(false)}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. FLOATING MINIMALIST GLASS NAVIGATION DOCK                          */}
      {/* ===================================================================== */}
      <header
        style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl h-14 px-5 sm:px-6 rounded-full blur-dock flex items-center justify-between transition-all duration-300 border border-zinc-200/70 dark:border-white/15 shadow-xl"
      >
        <Link href="/" className="flex items-center group">
          <span className="font-geometric font-extralight text-sm tracking-[0.34em] text-zinc-900 dark:text-white uppercase">
            BMS
          </span>
        </Link>

        <nav className="flex items-center gap-5 sm:gap-7 text-xs font-mono tracking-wide">
          <a
            href="#about"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
          >
            About
          </a>
          <a
            href="#programs"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
          >
            Programs
          </a>
          <a
            href="#coaches"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition hidden sm:inline"
          >
            Coaches
          </a>
          <a
            href="#contact"
            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
          >
            Contact
          </a>

          <div className="h-3.5 w-px bg-zinc-300 dark:bg-white/15" />

          <ThemeToggle />

          {sessionUser ? (
            <div className="flex items-center gap-2">
              {sessionUser.role === "SUPERADMIN" && (
                <Link
                  href="/admin"
                  className="px-3.5 py-1.5 rounded-full glass-panel-subtle text-[11px] font-mono font-medium text-zinc-900 dark:text-white hover:text-zinc-950 dark:hover:text-white transition"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-full chrome-button text-[11px] font-mono font-medium"
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openAuth("signin")}
                className="px-2.5 py-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition text-[11px] font-mono font-medium"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="px-4 py-1.5 rounded-full chrome-button text-[11px] font-mono font-medium shadow-sm"
              >
                Join
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* ===================================================================== */}
      {/* 2. HERO: REFINED EDITORIAL LUXURY, SAFE FROSTED CONTAINER             */}
      {/* ===================================================================== */}
      <section className="relative w-full min-h-[92vh] pt-36 pb-20 sm:pt-44 sm:pb-28 px-5 sm:px-8 flex items-center justify-center overflow-hidden">
        {/* Full-width Ambient Motion Video & Fallback Poster */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="/pic.jpg"
            className="w-full h-full object-cover scale-105 opacity-65 dark:opacity-45"
          >
            <source src="/video.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Filmic gradient scrim so text is 100% legible in light and dark modes */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto w-full text-center space-y-7 my-auto">
          {/* Polished Chrome Micro Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full chrome-badge font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
            <span className="text-micro text-white/95 tracking-widest">
              Private Cohort Sanctuary • 35 Cap
            </span>
          </div>

          {/* Main Editorial Headline - Thin Geometric */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-geometric font-extralight tracking-tight text-white leading-[1.08] max-w-3xl mx-auto">
            Movement. Nourishment. <br />
            <span className="font-light text-chrome-shine">Quiet Longevity.</span>
          </h1>

          {/* Punchy single subline */}
          <p className="text-xs sm:text-sm text-zinc-300 font-mono font-light max-w-md mx-auto leading-relaxed">
            Synchronized 00:00 morning protocols, clean whole food nourishment, and circadian rest tracking.
          </p>

          {/* Action buttons with Shiny Metal Chrome */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5 font-mono">
            <a
              href="#programs"
              className="px-7 py-3 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-2"
            >
              <span>Explore Programs</span> <ArrowRight className="w-3.5 h-3.5 text-zinc-950 dark:text-zinc-950" />
            </a>
            {!sessionUser ? (
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="px-6 py-3 rounded-full chrome-badge text-xs font-medium tracking-wide transition duration-200 hover:bg-white/20"
              >
                Join Next Batch
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-full chrome-badge text-xs font-medium tracking-wide transition duration-200 hover:bg-white/20 inline-flex items-center gap-2"
              >
                <span>Open Dashboard</span> <ArrowUpRight className="w-3.5 h-3.5 text-zinc-200" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. ABOUT: HIGH NEGATIVE SPACE EDITORIAL STATEMENT                     */}
      {/* ===================================================================== */}
      <section id="about" className="py-28 sm:py-40 px-6 sm:px-10">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <span className="text-micro text-zinc-400 block tracking-[0.28em] font-mono">
            BMS Philosophy
          </span>

          <h2 className="text-3xl sm:text-5xl font-geometric font-extralight tracking-tight text-zinc-900 dark:text-white leading-[1.18]">
            Consistency over intensity. <br />
            <span className="font-light text-zinc-400 dark:text-zinc-500">
              Discipline in quiet ease.
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-mono font-light">
            One focused daily protocol unlocked at dawn alongside 35 verified peers. Simple, repeatable, sustainable.
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. PROGRAMS: HORIZONTAL CURATED COHORT SHOWCASE                       */}
      {/* ===================================================================== */}
      <section id="programs" className="py-20 sm:py-28 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header: Clean Title on Left, ONLY Previous & Next Buttons on Right */}
          <div className="flex items-end justify-between border-b border-zinc-200/60 dark:border-white/10 pb-5">
            <div className="space-y-1">
              <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.28em] font-mono uppercase">
                Curated Cohorts
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-geometric font-light tracking-tight text-zinc-900 dark:text-white">
                Select your cohort journey.
              </h2>
            </div>

            {/* ONLY PREVIOUS AND NEXT BUTTONS */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handlePrevCohort}
                aria-label="Previous cohort"
                className="w-11 h-11 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
              </button>
              <button
                type="button"
                onClick={handleNextCohort}
                aria-label="Next cohort"
                className="w-11 h-11 rounded-full border border-zinc-300 dark:border-white/20 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-sm"
              >
                <ChevronRight className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
              </button>
            </div>
          </div>

          {/* Panoramic Luxury Cohort Card Track */}
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200/80 dark:border-white/15 bg-zinc-950 shadow-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${activeCohortIdx * 100}%)` }}
            >
              {displayCohorts.map((prog, idx) => {
                const startDate = formatDate(prog.startDate);
                const regOpenDate = formatDate(prog.registrationOpenDate);

                // Authoritative Public Badge Resolver (6 Dynamic Badges when status === "PUBLISH")
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

                // Attendance label: strictly "Online", "On-Site", or "Online + Onsite"
                const attendanceLabel =
                  prog.locationType === "ONLINE"
                    ? "Online"
                    : prog.locationType === "ONSITE"
                    ? `On-Site • ${prog.city || "Jakarta"}`
                    : `Online + Onsite • ${prog.city || "Jakarta"}`;

                const cohortImages = ["/test.jpg", "/pic.jpg", "/image.jpg", "/coach.jpg", "/coach2.jpg"];
                const cohortImage =
                  prog.coverImage && prog.coverImage.trim().length > 0
                    ? prog.coverImage
                    : cohortImages[idx % cohortImages.length];

                return (
                  <div key={prog.id} className="w-full shrink-0 min-w-full">
                    <div className="relative min-h-[440px] sm:min-h-[480px] p-7 sm:p-12 md:p-14 flex flex-col justify-between overflow-hidden">
                      {/* Background Image with Deep Cinematic Vignette */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <Image
                          src={cohortImage}
                          alt={prog.title}
                          fill
                          priority={idx === 0}
                          className="object-cover object-center scale-100 transition-transform duration-1000 ease-out brightness-[0.7] contrast-[1.05]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent pointer-events-none" />
                      </div>

                      {/* TOP ROW: STRICTLY THE 3 BADGES */}
                      <div className="relative z-10 flex flex-wrap items-center gap-2.5 font-mono">
                        {/* Badge 1: Training Days */}
                        <span className="px-4 py-1.5 rounded-full chrome-badge text-xs font-mono font-medium text-zinc-200">
                          {prog.trainingDays || prog.durationDays || 3} Training Days
                        </span>

                        {/* Badge 2: Attendance Mode (Online, On-Site, Online + Onsite) */}
                        <span className="px-4 py-1.5 rounded-full chrome-badge text-xs font-mono font-medium text-zinc-200">
                          {attendanceLabel}
                        </span>

                        {/* Badge 3: Dynamic 6-Stage Public Badge */}
                        {publicBadge === "Coming Soon" && (
                          <span className="px-4 py-1.5 rounded-full bg-amber-500/15 border-2 border-amber-400 text-amber-300 font-mono font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 backdrop-blur-md ring-2 ring-amber-400/20">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span>COMING SOON</span>
                          </span>
                        )}
                        {publicBadge === "Open Registration" && (
                          <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-mono font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 backdrop-blur-md ring-2 ring-emerald-400/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>OPEN REGISTRATION</span>
                          </span>
                        )}
                        {publicBadge === "Full" && (
                          <span className="px-4 py-1.5 rounded-full bg-purple-500/20 border-2 border-purple-400 text-purple-300 font-mono font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            <span>FULL (SOLD OUT)</span>
                          </span>
                        )}
                        {publicBadge === "Close Registration" && (
                          <span className="px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 font-mono font-bold text-xs tracking-wider shadow-xl flex items-center gap-2 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-zinc-500" />
                            <span>CLOSE REGISTRATION</span>
                          </span>
                        )}
                        {publicBadge === "On going" && (
                          <span className="px-4 py-1.5 rounded-full bg-blue-500/20 border-2 border-blue-400 text-blue-300 font-mono font-bold text-xs tracking-wider shadow-2xl flex items-center gap-2 backdrop-blur-md">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            <span>ON GOING</span>
                          </span>
                        )}
                        {publicBadge === "End" && (
                          <span className="px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-500 font-mono font-bold text-xs tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-zinc-600" />
                            <span>END</span>
                          </span>
                        )}
                      </div>

                      {/* CENTER / MAIN CONTENT: CLEAN LUXURY TYPOGRAPHY (NO BULKY DESCRIPTIONS) */}
                      <div className="relative z-10 max-w-2xl space-y-4 my-auto py-6">
                        <div className="text-xs text-zinc-300 font-mono tracking-wider flex items-center gap-2 flex-wrap">
                          <span>
                            Lead: {prog.coachName}
                            {prog.coachTitle ? ` (${prog.coachTitle})` : ""}
                          </span>
                          {startDate && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span>Starts {startDate}</span>
                            </>
                          )}
                          {prog.category && (
                            <>
                              <span className="text-zinc-500">•</span>
                              <span className="text-zinc-400">{prog.category}</span>
                            </>
                          )}
                        </div>

                        <h3 className="text-2xl sm:text-4xl md:text-5xl font-geometric font-extralight tracking-tight text-white leading-[1.14]">
                          {prog.title}
                        </h3>

                        {/* RECOMMENDED FOR MESSAGE */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.08] border border-white/15 text-xs font-mono backdrop-blur-md">
                          <Sparkles className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 shrink-0">
                            Recommended For:
                          </span>
                          <span className="text-zinc-100 font-medium">
                            {prog.recommendedFor || "Desk Professionals & Sedentary Workers"}
                          </span>
                        </div>
                      </div>

                      {/* BOTTOM ROW: CLEAN BUTTON WITH PRICE DIRECTLY INSIDE */}
                      <div className="relative z-10 pt-4 flex items-center justify-between gap-4 font-mono">
                        <div className="hidden sm:block text-micro text-zinc-400 font-light">
                          {prog.venueAddress || "BMS Sanctuary • Jakarta"}
                        </div>

                        <div>
                          {sessionUser && prog.isUserEnrolled ? (
                            <button
                              type="button"
                              onClick={() => router.push("/dashboard")}
                              className="px-7 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-mono font-semibold tracking-wide inline-flex items-center gap-3 transition-all duration-200 hover:scale-[1.02] shadow-xl"
                            >
                              <span className="font-bold">Enrolled • Go to Dashboard</span>
                              <ArrowRight className="w-4 h-4 text-zinc-950" />
                            </button>
                          ) : isEnrollable ? (
                            <button
                              type="button"
                              onClick={() => handleProgramAction(prog.id)}
                              className="px-7 py-3.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-mono font-semibold tracking-wide inline-flex items-center gap-3 transition-all duration-200 hover:scale-[1.02] shadow-xl"
                            >
                              <span className="font-bold">Join Now</span>
                              <span className="w-px h-3.5 bg-zinc-950/25" />
                              {prog.actualPrice && prog.actualPrice > prog.price && (
                                <span className="line-through text-zinc-500 text-[11px] font-normal">
                                  Rp {prog.actualPrice.toLocaleString("id-ID")}
                                </span>
                              )}
                              <span className="font-bold">Rp {prog.price.toLocaleString("id-ID")}</span>
                              <ArrowRight className="w-4 h-4 text-zinc-950 ml-0.5" />
                            </button>
                          ) : publicBadge === "Coming Soon" ? (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                disabled
                                className="px-7 py-3.5 rounded-full bg-zinc-900/80 border border-amber-400/30 text-xs font-mono font-semibold tracking-wide inline-flex items-center gap-3 text-amber-300/90 cursor-not-allowed shadow-xl backdrop-blur-md opacity-90"
                              >
                                <span>Coming Soon</span>
                                {prog.price > 0 && (
                                  <>
                                    <span className="w-px h-3.5 bg-zinc-700" />
                                    <span className="text-zinc-300">Rp {prog.price.toLocaleString("id-ID")}</span>
                                  </>
                                )}
                              </button>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {regOpenDate ? `Registration opens ${regOpenDate}` : "Registration date TBA"}
                              </span>
                            </div>
                          ) : publicBadge === "Full" ? (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                disabled
                                className="px-7 py-3.5 rounded-full bg-zinc-900/90 border border-purple-500/40 text-xs font-mono font-semibold tracking-wide inline-flex items-center gap-2 text-purple-300/90 cursor-not-allowed shadow-xl"
                              >
                                <span>Full (Sold Out)</span>
                              </button>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                Quota filled ({prog.enrolledCount}/{prog.maxQuota} seats)
                              </span>
                            </div>
                          ) : publicBadge === "Close Registration" ? (
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                disabled
                                className="px-7 py-3.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono font-semibold tracking-wide text-zinc-400 cursor-not-allowed shadow-xl"
                              >
                                <span>Registration Closed</span>
                              </button>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {startDate ? `Starts ${startDate}` : "Awaiting batch launch"}
                              </span>
                            </div>
                          ) : publicBadge === "On going" ? (
                            <button
                              type="button"
                              disabled
                              className="px-7 py-3.5 rounded-full bg-zinc-900 border border-blue-500/30 text-xs font-mono font-semibold tracking-wide text-blue-300/90 cursor-not-allowed shadow-xl"
                            >
                              <span>Program In Progress</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-7 py-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-semibold tracking-wide text-zinc-500 cursor-not-allowed shadow-xl"
                            >
                              <span>Program Concluded</span>
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
      {/* 6. COACHES & MENTORS: EDITORIAL PORTRAIT GALLERY                      */}
      {/* ===================================================================== */}
      <section id="coaches" className="py-24 sm:py-32 px-6 sm:px-10">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="max-w-xl space-y-2 border-b border-zinc-900/[0.08] dark:border-white/10 pb-6 font-mono">
            <span className="text-micro text-zinc-400 block tracking-[0.28em]">
              Faculty &bull; Mentors
            </span>
            <h2 className="text-2xl sm:text-4xl font-geometric font-extralight tracking-tight text-zinc-900 dark:text-white">
              Guided by specialists.
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 font-mono">
            {COACH_PROFILES.map((coach, idx) => (
              <div
                key={idx}
                className="relative rounded-3xl overflow-hidden min-h-[420px] p-6 sm:p-7 flex flex-col justify-between group shadow-xl border border-white/60 dark:border-white/10"
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Image
                    src={coach.image}
                    alt={coach.name}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-3.5 py-1 rounded-full chrome-badge text-micro text-white">
                    {coach.specialty.split("&")[0].trim()}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                </div>

                <div className="relative z-10 space-y-1 text-white">
                  <h3 className="text-xl font-geometric font-light tracking-tight text-white">
                    {coach.name}
                  </h3>
                  <span className="text-micro text-zinc-300 font-light block">
                    {coach.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. MEMBER STORY / EDITORIAL QUOTE                                     */}
      {/* ===================================================================== */}
      <section className="py-24 sm:py-36 px-6 sm:px-10 border-t border-zinc-900/[0.06] dark:border-white/10 font-mono">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Quote className="w-7 h-7 text-zinc-400 dark:text-zinc-600 mx-auto" />
          <blockquote className="font-geometric text-2xl sm:text-3xl text-zinc-800 dark:text-zinc-200 font-light leading-snug">
            &ldquo;The 00:00 unlock gave me my mornings back. No endless scrolling—just 25 focused minutes, a clean meal guide, and a quiet sense of accomplishment.&rdquo;
          </blockquote>
          <div className="text-micro text-zinc-500 dark:text-zinc-400 font-mono font-medium tracking-[0.2em]">
            Clarissa Wijaya — Creative Director, Cohort 01
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. PARTNERS: QUIET MINIMALIST STRIP                                   */}
      {/* ===================================================================== */}
      <section className="py-14 px-6 sm:px-10 border-t border-zinc-900/[0.06] dark:border-white/10 font-mono">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center">
            <span className="text-micro text-zinc-400 tracking-[0.24em] block">
              Collaborations &amp; Studio Partners
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {BRAND_PARTNERS.map((p, idx) => (
              <div
                key={idx}
                className="glass-panel-subtle rounded-2xl py-3.5 px-3 text-center flex flex-col items-center justify-center gap-0.5 border border-zinc-200/60 dark:border-white/10"
              >
                <span className="text-xs font-semibold tracking-widest uppercase text-zinc-900 dark:text-white">
                  {p.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {p.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 9. CONTACT & CONCIERGE: DIGNIFIED GLASS SANCTUARY                      */}
      {/* ===================================================================== */}
      <section id="contact" className="relative w-full py-28 sm:py-36 overflow-hidden flex items-center justify-center px-6 sm:px-10 font-mono">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src="/pic.jpg"
            alt="Sanctuary Concierge"
            fill
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/65 pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto w-full text-center text-white">
          <div className="glass-panel rounded-3xl p-8 sm:p-12 space-y-5 border border-white/20 shadow-2xl backdrop-blur-2xl">
            <div className="space-y-1.5">
              <span className="text-micro text-zinc-300 tracking-[0.24em] block font-mono">
                Private Concierge
              </span>
              <h2 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight">
                Connect with our team.
              </h2>
              <p className="text-xs text-zinc-300 font-light leading-relaxed font-mono">
                Inquire regarding upcoming cohort placements or studio access in South Jakarta.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-mono">
              <a
                href="https://wa.me/6281290002026?text=Hello%20BMS%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-zinc-950 dark:text-zinc-950" />
                <span>Chat via WhatsApp</span>
              </a>

              <a
                href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                className="px-6 py-3 rounded-full chrome-badge transition text-xs font-medium tracking-wide inline-flex items-center gap-2 hover:bg-white/20"
              >
                <Mail className="w-4 h-4 text-zinc-300" />
                <span>Email Concierge</span>
              </a>
            </div>

            <div className="pt-3 border-t border-white/15 text-micro text-zinc-300 flex items-center justify-center gap-2 font-mono">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Studio: Senopati, South Jakarta • By Appointment</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 10. MINIMAL FOOTER                                                    */}
      {/* ===================================================================== */}
      <footer className="mt-auto py-10 px-6 sm:px-10 border-t border-zinc-900/[0.08] dark:border-white/10 text-zinc-500 text-xs font-mono">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <span className="font-geometric font-extralight text-zinc-900 dark:text-white uppercase tracking-[0.32em] text-xs">
              BMS
            </span>
            <span className="text-zinc-400 font-light">• Minimalist Longevity Sanctuary</span>
          </div>

          <div className="flex items-center gap-5 text-micro">
            {!sessionUser && (
              <>
                <button
                  type="button"
                  onClick={() => openAuth("signin")}
                  className="hover:text-zinc-900 dark:hover:text-white transition"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="hover:text-zinc-900 dark:hover:text-white transition"
                >
                  Join
                </button>
              </>
            )}
            <span className="text-zinc-400">© 2026 BMS Sanctuary</span>
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
