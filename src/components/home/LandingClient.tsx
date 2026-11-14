"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AuthGatewayCard,
  AuthModal,
  AuthTabMode,
} from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { wellnessSignOut } from "@/wellness/actions/auth";
import {
  resolvePublicBadge,
  PublicProgramBadge,
} from "@/wellness/utils/timeline";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  MessageCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  LogOut,
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

type LeftView =
  | "auth"
  | "about"
  | "curriculum"
  | "programs"
  | "coaches"
  | "concierge";

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

const COACH_FALLBACK_IMAGES = [
  "/coach.webp",
  "/coach2.webp",
  "/coach3.webp",
  "/coach.webp",
];

const BRAND_PARTNERS = [
  "AESOP",
  "ALO",
  "OURA",
  "EQUINOX",
  "EREWHON",
  "KINFOLK",
];

export function LandingClient({
  sessionUser,
  programs,
  coaches,
}: LandingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leftView, setLeftView] = useState<LeftView>("auth");
  const [authTab, setAuthTab] = useState<AuthTabMode>("signin");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProgramTitle, setSelectedProgramTitle] = useState<
    string | null
  >(null);
  const [deletedNotice, setDeletedNotice] = useState(false);
  const [activeCohortIdx, setActiveCohortIdx] = useState(0);
  const [activeCoachIdx, setActiveCoachIdx] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

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

  useEffect(() => {
    const authQuery = searchParams.get("auth");
    const isDeleted = searchParams.get("deleted");

    if (
      authQuery === "signin" ||
      authQuery === "signup" ||
      authQuery === "forgot"
    ) {
      setAuthTab(authQuery);
      setLeftView("auth");
    }
    if (isDeleted === "true") {
      setDeletedNotice(true);
    }
  }, [searchParams]);

  const handleNextCohort = () => {
    if (displayCohorts.length === 0) return;
    setActiveCohortIdx((prev) => (prev + 1) % displayCohorts.length);
  };

  const handlePrevCohort = () => {
    if (displayCohorts.length === 0) return;
    setActiveCohortIdx(
      (prev) => (prev - 1 + displayCohorts.length) % displayCohorts.length
    );
  };

  const handleProgramAction = (programId: string, programTitle: string) => {
    if (sessionUser) {
      router.push(`/dashboard?enroll=${programId}`);
    } else {
      setSelectedProgramTitle(programTitle);
      setAuthTab("signup");
      setLeftView("auth");
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await wellnessSignOut();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  const formatDate = (dateVal?: Date | string | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    return isNaN(d.getTime())
      ? null
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Determine the Right-Side Showcase Image dynamically (default /pic.webp, or active program/coach image)
  const cohortImages = [
    "/pic.webp",
    "/test.webp",
    "/image.webp",
    "/coach.webp",
    "/coach2.webp",
  ];
  const currentProgram = displayCohorts[activeCohortIdx] || null;
  const currentCoach = displayCoaches[activeCoachIdx] || displayCoaches[0];

  const rightImageSrc =
    leftView === "programs" && currentProgram
      ? currentProgram.coverImage && currentProgram.coverImage.trim().length > 0
        ? currentProgram.coverImage
        : cohortImages[activeCohortIdx % cohortImages.length]
      : leftView === "coaches" && currentCoach
        ? currentCoach.image
        : "/pic.webp";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200">
      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 py-2.5 px-5 text-xs flex items-center justify-between shadow-xl font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Your account has been deleted.</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setDeletedNotice(false)}
            className="opacity-70 hover:opacity-100 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* LEFT COLUMN: BORDERLESS FORM & INTERACTIVE NAVIGATION               */}
      {/* =================================================================== */}
      <div className="w-full lg:w-[48%] xl:w-[44%] min-h-screen flex flex-col justify-between px-6 sm:px-12 lg:px-14 xl:px-16 py-6 sm:py-8">
        {/* 1. TOP BAR (UNBOXED LOGO & NAVIGATION LINKS) */}
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setLeftView("auth")}
            className="flex items-center gap-1.5 text-left group shrink-0"
            title="BMS Sanctuary"
          >
            <span className="font-mono font-light text-xl text-zinc-950 dark:text-white leading-none">
              +
            </span>
            <span className="font-geometric font-semibold text-xs tracking-[0.28em] text-zinc-950 dark:text-white uppercase">
              BMS
            </span>
          </button>

          <div className="flex items-center gap-4 sm:gap-5 text-xs">
            {(
              [
                { key: "about", label: "About" },
                { key: "curriculum", label: "Curriculum" },
                { key: "programs", label: "Programs" },
                { key: "coaches", label: "Specialists" },
                { key: "concierge", label: "Concierge" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setLeftView(key)}
                className={`hidden sm:inline-block text-xs transition ${
                  leftView === key
                    ? "text-zinc-950 dark:text-white font-semibold"
                    : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}

            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Quick Section Links */}
        <nav
          aria-label="Sanctuary sections"
          className="sm:hidden flex items-center gap-4 overflow-x-auto pt-3 pb-1 text-xs"
        >
          {(
            [
              { key: "auth", label: sessionUser ? "Account" : "Login" },
              { key: "about", label: "About" },
              { key: "curriculum", label: "Curriculum" },
              { key: "programs", label: "Programs" },
              { key: "coaches", label: "Specialists" },
              { key: "concierge", label: "Concierge" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setLeftView(key)}
              className={`shrink-0 transition ${
                leftView === key
                  ? "text-zinc-950 dark:text-white font-semibold underline underline-offset-4"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* 2. CENTER CONTENT AREA (UNBOXED, ZERO BORDERS) */}
        <main className="my-auto py-8 sm:py-10 w-full max-w-md mx-auto lg:mx-0">
          {/* VIEW A: DEFAULT SIGN IN / SIGN UP FORM (OR LOGGED-IN SESSION) */}
          {leftView === "auth" && (
            <div className="animate-in fade-in duration-150">
              {!sessionUser ? (
                <AuthGatewayCard
                  initialTab={authTab}
                  activeTabOverride={authTab}
                  onTabChange={(next) => setAuthTab(next)}
                  contextProgramTitle={selectedProgramTitle}
                />
              ) : (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block">
                      Active Session • {sessionUser.role}
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                      Welcome back, {sessionUser.fullName}
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-mono">
                      {sessionUser.email}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Link
                      href="/dashboard"
                      className="w-full h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    >
                      <span>Enter Member Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {sessionUser.role === "SUPERADMIN" && (
                      <Link
                        href="/admin"
                        className="w-full h-11 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                      >
                        <span>Open Admin Console</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <button
                      type="button"
                      disabled={signingOut}
                      onClick={handleLogout}
                      className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center gap-1.5 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW B: ABOUT BMS (UNBOXED EDITORIAL) */}
          {leftView === "about" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setLeftView("auth")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{sessionUser ? "Back" : "Back to Sign In"}</span>
              </button>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 block">
                  About BMS Sanctuary
                </span>
                <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
                  Consistency over intensity. Discipline in quiet ease.
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                BMS is a minimalist longevity sanctuary in South Jakarta. We architect private 35-member cohorts that synchronize daily movement, clean whole-food nourishment, and circadian recovery.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <span className="text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white block">
                    35 Max
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Member Cap
                  </span>
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white block">
                    00:00
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    WIB Daily Unlock
                  </span>
                </div>
                <div>
                  <span className="text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white block">
                    3 Pillars
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Move • Fuel • Rest
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
                  Cultural Partners
                </span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono font-semibold tracking-widest text-zinc-500 dark:text-zinc-400">
                  {BRAND_PARTNERS.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW C: CURRICULUM (UNBOXED 3 DISCIPLINES) */}
          {leftView === "curriculum" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setLeftView("auth")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{sessionUser ? "Back" : "Back to Sign In"}</span>
              </button>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 block">
                  Curriculum Core
                </span>
                <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                  Three Daily Disciplines
                </h1>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                    01 / MOVEMENT • 07:00 WIB
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                    Functional Spine &amp; Joint Mobility
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    25-minute targeted mobility sequences unlocked at dawn to decompress posture and build resilient joint control.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                    02 / FUEL • 12:30 WIB
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                    Whole Food Nourishment
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Zero-dietary-fatigue whole food menus crafted for sustained metabolic focus and gut balance.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                    03 / RECOVERY • 20:30 WIB
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                    Circadian Restoration
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Down-regulating breathwork, Dear Diary reflection, and sleep duration tracking for deep repair.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW D: ACTIVE PROGRAMS (UNBOXED) */}
          {leftView === "programs" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setLeftView("auth")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{sessionUser ? "Back" : "Back to Sign In"}</span>
                </button>

                {displayCohorts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevCohort}
                      aria-label="Previous program"
                      className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-white/10 flex items-center justify-center hover:opacity-80 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-zinc-500">
                      {activeCohortIdx + 1} / {displayCohorts.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextCohort}
                      aria-label="Next program"
                      className="w-8 h-8 rounded-full bg-zinc-200/60 dark:bg-white/10 flex items-center justify-center hover:opacity-80 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {!currentProgram ? (
                <p className="text-xs text-zinc-500">
                  No active cohorts are currently published.
                </p>
              ) : (
                (() => {
                  const startDate = formatDate(currentProgram.startDate);
                  const publicBadge: PublicProgramBadge =
                    resolvePublicBadge({
                      status: currentProgram.status,
                      registrationOpenDate:
                        currentProgram.registrationOpenDate,
                      registrationDeadline:
                        currentProgram.registrationDeadline,
                      startDate: currentProgram.startDate,
                      endDate: currentProgram.endDate,
                      maxQuota: currentProgram.maxQuota,
                      enrolledCount: currentProgram.enrolledCount,
                    }) || "Open Registration";
                  const isEnrollable = publicBadge === "Open Registration";

                  return (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                          <span className="uppercase font-semibold text-zinc-950 dark:text-white">
                            {publicBadge}
                          </span>
                          <span>•</span>
                          <span>
                            {currentProgram.trainingDays ||
                              currentProgram.durationDays ||
                              3}{" "}
                            Days
                          </span>
                          {startDate && (
                            <>
                              <span>•</span>
                              <span>Starts {startDate}</span>
                            </>
                          )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-snug">
                          {currentProgram.title}
                        </h1>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Guided by Coach {currentProgram.coachName} &bull;{" "}
                          {currentProgram.recommendedFor || "All Levels"}
                        </p>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                        {currentProgram.description}
                      </p>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-lg font-semibold text-zinc-950 dark:text-white">
                            Rp {currentProgram.price.toLocaleString("id-ID")}
                          </span>
                          <span className="text-xs text-zinc-400 block">
                            {currentProgram.maxQuota} Member Cap
                          </span>
                        </div>

                        {sessionUser && currentProgram.isUserEnrolled ? (
                          <button
                            type="button"
                            onClick={() => router.push("/dashboard")}
                            className="h-11 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition"
                          >
                            <span>Dashboard</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : isEnrollable ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleProgramAction(
                                currentProgram.id,
                                currentProgram.title
                              )
                            }
                            className="h-11 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition hover:opacity-90"
                          >
                            <span>
                              {sessionUser ? "Enroll Now" : "Join Cohort"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-xs font-mono text-zinc-400 uppercase">
                            {publicBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* VIEW E: SPECIALIST FACULTY (UNBOXED) */}
          {leftView === "coaches" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setLeftView("auth")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{sessionUser ? "Back" : "Back to Sign In"}</span>
              </button>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 block">
                  Specialist Faculty
                </span>
                <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                  Guided by Specialists
                </h1>
              </div>

              <div className="space-y-4">
                {displayCoaches.map((coach, idx) => {
                  const active = activeCoachIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCoachIdx(idx)}
                      className={`w-full text-left py-2 transition flex items-center justify-between ${
                        active
                          ? "opacity-100"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <div>
                        <h3 className="text-base font-semibold text-zinc-950 dark:text-white">
                          {coach.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {coach.role} &bull; {coach.specialty}
                        </p>
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 transition-transform ${
                          active ? "translate-x-1 text-zinc-950 dark:text-white" : "text-zinc-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW F: CONCIERGE (UNBOXED) */}
          {leftView === "concierge" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={() => setLeftView("auth")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{sessionUser ? "Back" : "Back to Sign In"}</span>
              </button>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400 block">
                  Private Concierge
                </span>
                <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                  Senopati Studio &amp; Support
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Studio: Senopati, South Jakarta • Private On-Site &amp; Hybrid Sessions by Appointment (06:00 – 21:00 WIB).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="https://wa.me/6281290002026?text=Hello%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition hover:opacity-90"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                  className="h-11 px-6 rounded-full bg-zinc-200/70 dark:bg-white/10 text-zinc-950 dark:text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 transition hover:opacity-80"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              </div>
            </div>
          )}
        </main>

        {/* 3. BOTTOM FOOTER LINKS (UNBOXED) */}
        <footer className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => setLeftView("auth")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              {sessionUser ? "Session" : "Sign In"}
            </button>
            <button
              type="button"
              onClick={() => setLeftView("about")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setLeftView("curriculum")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Curriculum
            </button>
            <button
              type="button"
              onClick={() => setLeftView("programs")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Programs ({displayCohorts.length})
            </button>
            <button
              type="button"
              onClick={() => setLeftView("coaches")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Specialists
            </button>
            <button
              type="button"
              onClick={() => setLeftView("concierge")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Concierge
            </button>
          </div>
          <span>© 2026 BMS</span>
        </footer>
      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: FULL-BLEED IMAGE SHOWCASE (ZERO BORDERS / BOXES)      */}
      {/* =================================================================== */}
      <div className="w-full lg:w-[52%] xl:w-[56%] relative min-h-[360px] lg:min-h-screen overflow-hidden bg-zinc-950">
        <Image
          src={rightImageSrc}
          alt="BMS Sanctuary"
          fill
          priority
          unoptimized={/^https?:/i.test(rightImageSrc)}
          className="object-cover object-center grayscale contrast-[1.08] brightness-[0.82] transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Subtle Editorial Caption Overlay on Bottom of Image */}
        <div className="absolute bottom-8 left-8 right-8 z-10 flex items-end justify-between gap-4 text-white pointer-events-none">
          <div className="space-y-1 max-w-md">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-300 block">
              00:00 WIB Synchronized Protocol
            </span>
            <p className="text-lg sm:text-xl font-geometric font-light tracking-tight text-white">
              Precision Movement. Engineered Longevity.
            </p>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300">
            Jakarta • Online
          </span>
        </div>
      </div>

      {/* Fallback AuthModal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
        contextProgramTitle={selectedProgramTitle}
      />
    </div>
  );
}
