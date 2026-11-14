"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AuthGatewayCard, AuthModal, AuthTabMode } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { wellnessSignOut } from "@/wellness/actions/auth";
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
  Info,
  Compass,
  Users,
  ShieldCheck,
  MapPin,
  Clock,
  LogOut,
  User as UserIcon,
  Layers,
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

type ShowcaseSection =
  | "overview"
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
  { name: "AESOP", category: "Botanical Partner" },
  { name: "ALO", category: "Movement Gear" },
  { name: "OURA", category: "Recovery Science" },
  { name: "EQUINOX", category: "Studio Partner" },
  { name: "EREWHON", category: "Nutrition Curation" },
  { name: "KINFOLK", category: "Editorial" },
];

export function LandingClient({
  sessionUser,
  programs,
  coaches,
}: LandingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeSection, setActiveSection] = useState<ShowcaseSection>("overview");
  const [authTab, setAuthTab] = useState<AuthTabMode>("signin");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProgramTitle, setSelectedProgramTitle] = useState<string | null>(null);
  const [deletedNotice, setDeletedNotice] = useState(false);
  const [activeCohortIdx, setActiveCohortIdx] = useState(0);
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

  const focusAuthGateway = (
    tab: AuthTabMode = "signin",
    programTitle: string | null = null
  ) => {
    setAuthTab(tab);
    if (programTitle) {
      setSelectedProgramTitle(programTitle);
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      const el = document.getElementById("auth-gateway-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setAuthModalOpen(true);
      }
    }
  };

  const handleProgramAction = (programId: string, programTitle: string) => {
    if (sessionUser) {
      router.push(`/dashboard?enroll=${programId}`);
    } else {
      focusAuthGateway("signup", programTitle);
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

  const navItems: Array<{
    key: ShowcaseSection;
    label: string;
    Icon: typeof Compass;
    badge?: string;
  }> = [
    { key: "overview", label: "Gateway", Icon: Compass },
    { key: "about", label: "About", Icon: Info },
    { key: "curriculum", label: "Curriculum", Icon: Layers },
    {
      key: "programs",
      label: "Programs",
      Icon: Activity,
      badge: displayCohorts.length > 0 ? String(displayCohorts.length) : undefined,
    },
    { key: "coaches", label: "Specialists", Icon: Users },
    { key: "concierge", label: "Concierge", Icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-clip bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200">
      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-2xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 py-3 px-4 text-xs flex items-center justify-between shadow-xl font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
            <span>Your account has been permanently deleted.</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setDeletedNotice(false)}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 1. SEAMLESS TOP HEADER (MEMBER DASHBOARD STYLE)                       */}
      {/* ===================================================================== */}
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className="sticky top-0 z-40 w-full bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-white/10"
      >
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveSection("overview")}
            className="flex items-center gap-2 group shrink-0 text-left"
            title="BMS Sanctuary Gateway"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-mono text-sm font-medium leading-none">
              +
            </div>
            <div className="flex items-center gap-2">
              <span className="font-geometric font-semibold text-xs tracking-[0.28em] text-zinc-950 dark:text-white uppercase">
                BMS
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 border-l border-zinc-300 dark:border-white/15 pl-2">
                Longevity Sanctuary
              </span>
            </div>
          </button>

          {/* Desktop Quick Section Switcher Buttons */}
          <nav
            aria-label="Public Sanctuary Sections"
            className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-zinc-200/60 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10"
          >
            {navItems.map(({ key, label, badge }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveSection(key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1.5 ${
                  activeSection === key
                    ? "bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                <span>{label}</span>
                {badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                      activeSection === key
                        ? "bg-zinc-900 text-white dark:bg-zinc-950 dark:text-white"
                        : "bg-zinc-300/70 text-zinc-700 dark:bg-white/10 dark:text-zinc-300"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {sessionUser ? (
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold tracking-wide inline-flex items-center gap-1.5 transition hover:opacity-90"
              >
                <span>Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => focusAuthGateway("signin")}
                className="lg:hidden px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold tracking-wide transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Section Pill Bar */}
        <div className="md:hidden px-4 pb-2.5 flex items-center gap-1.5 overflow-x-auto">
          {navItems.map(({ key, label, Icon, badge }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition inline-flex items-center gap-1.5 border ${
                activeSection === key
                  ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                  : "bg-white dark:bg-[#121215] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
              {badge && (
                <span className="text-[10px] font-mono opacity-75">({badge})</span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. X.COM-STYLE SPLIT SCREEN MAIN GATEWAY                              */}
      {/* ===================================================================== */}
      <main className="flex-1 flex items-center py-6 sm:py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start lg:items-center">
          {/* ================================================================= */}
          {/* LEFT COLUMN (7 COLS): BRAND & INTERACTIVE SANCTUARY EXPLORER      */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 w-full space-y-4">
            {/* VIEW 1: OVERVIEW GATEWAY (DEFAULT) */}
            {activeSection === "overview" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm">
                {/* Ambient Hero Visual Card (Matches MyPlanTab Hero Card Style) */}
                <div className="relative min-h-[300px] sm:min-h-[340px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden bg-zinc-950 text-white">
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster="/pic.webp"
                      className="w-full h-full object-cover object-center scale-105 opacity-45 grayscale contrast-125"
                    >
                      <source src="/video.mp4" type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/35" />
                  </div>

                  {/* Top Row Badges */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-200">
                        00:00 WIB Daily Protocol
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                      Senopati • Online
                    </span>
                  </div>

                  {/* Center / Bottom Brand Statement */}
                  <div className="relative z-10 space-y-3 pt-8">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-light text-3xl sm:text-4xl text-white leading-none">
                        +
                      </span>
                      <span className="font-geometric font-semibold text-lg sm:text-xl tracking-[0.32em] text-white uppercase">
                        BMS SANCTUARY
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-white leading-[1.18] max-w-xl">
                      Precision Movement.{" "}
                      <span className="font-normal text-zinc-300">
                        Engineered Longevity.
                      </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-lg leading-relaxed">
                      Private 35-member athletic cohorts combining dawn mobility sequences, anti-inflammatory whole-food nutrition, and circadian sleep restoration.
                    </p>
                  </div>
                </div>

                {/* Bottom Quick Navigation & Metrics Strip (Member Dashboard Style) */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* 3 Monochrome Metric Tiles */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Cohort Size
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white mt-0.5 block">
                        35 Members
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Daily Unlock
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white mt-0.5 block">
                        00:00 WIB
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Active Cohorts
                      </span>
                      <span className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white mt-0.5 block">
                        {displayCohorts.length} Programs
                      </span>
                    </div>
                  </div>

                  {/* Interactive Directory Buttons (Explore About, Curriculum, Programs, Specialists) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-semibold block">
                      Explore Sanctuary Directory
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSection("about")}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-left transition group"
                      >
                        <Info className="w-4 h-4 text-zinc-900 dark:text-white mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                          About BMS
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Philosophy &rarr;
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection("curriculum")}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-left transition group"
                      >
                        <Layers className="w-4 h-4 text-zinc-900 dark:text-white mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                          Curriculum
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          3 Disciplines &rarr;
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection("programs")}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-left transition group"
                      >
                        <Activity className="w-4 h-4 text-zinc-900 dark:text-white mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                          Programs
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {displayCohorts.length} Cohorts &rarr;
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection("coaches")}
                        className="p-3 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-left transition group"
                      >
                        <Users className="w-4 h-4 text-zinc-900 dark:text-white mb-1.5" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                          Specialists
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          Faculty &rarr;
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: ABOUT BMS & PHILOSOPHY */}
            {activeSection === "about" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 font-semibold block">
                      About BMS Sanctuary
                    </span>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white mt-0.5">
                      Consistency Over Intensity
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("overview")}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                  >
                    &larr; Gateway
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 space-y-2">
                  <Quote className="w-4 h-4 text-zinc-400" />
                  <blockquote className="text-base sm:text-lg font-geometric font-light text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    &ldquo;We do not train for exhaustion. We architect daily movement, clean fuel, and circadian recovery for decades of structural vitality.&rdquo;
                  </blockquote>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">
                    BMS Manifesto • South Jakarta
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-white">
                      <Clock className="w-4 h-4" />
                      <span>Synchronized 00:00 WIB Unlock</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Every cohort day unlocks at midnight WIB with structured video checklists, meal compliance logs, and sleep duration tracking inside your member dashboard.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-white">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Intimate 35-Member Cohorts</span>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Each batch is strictly capped to preserve specialist attention, private community circles, and high completion accountability.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-white/10 space-y-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
                    Curated Ecosystem &amp; Cultural Partners
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {BRAND_PARTNERS.map((p) => (
                      <span
                        key={p.name}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 text-[10px] font-mono font-semibold tracking-wider text-zinc-700 dark:text-zinc-300"
                      >
                        {p.name} <span className="text-zinc-400 font-normal">• {p.category}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: CURRICULUM (THREE DAILY DISCIPLINES) */}
            {activeSection === "curriculum" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Curriculum Architecture
                    </span>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white mt-0.5">
                      Three Daily Disciplines
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("overview")}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                  >
                    &larr; Gateway
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                          01 / MOVEMENT • 07:00 WIB
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                        Functional Spine &amp; Joint Longevity
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        25-minute guided Pilates and functional mobility sequences designed to decompress posture, stabilize core mechanics, and build resilient joint range.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
                        02 / FUEL • 12:30 WIB
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                        Anti-Inflammatory Whole Food Fuel
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Zero-dietary-fatigue nutrition protocols crafted for steady glycemic energy, gut microbiome balance, and effortless daily compliance logging.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
                        03 / RECOVERY • 20:30 WIB
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                        Circadian Restoration &amp; Dear Diary
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Evening parasympathetic down-regulation, gratitude reflection in Dear Diary, and bedtime/wake-time sleep architecture tracking.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: CURATED ACTIVE PROGRAMS */}
            {activeSection === "programs" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Curated Cohorts
                    </span>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white mt-0.5">
                      Active Programs ({displayCohorts.length})
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevCohort}
                      aria-label="Previous program"
                      className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextCohort}
                      aria-label="Next program"
                      className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-white/10 transition active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {displayCohorts.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl">
                    No published cohorts are currently open. Check back soon.
                  </div>
                ) : (
                  <>
                    {/* Featured Carousel Card */}
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-950">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${activeCohortIdx * 100}%)`,
                        }}
                      >
                        {displayCohorts.map((prog, idx) => {
                          const startDate = formatDate(prog.startDate);
                          const publicBadge: PublicProgramBadge =
                            resolvePublicBadge({
                              status: prog.status,
                              registrationOpenDate: prog.registrationOpenDate,
                              registrationDeadline: prog.registrationDeadline,
                              startDate: prog.startDate,
                              endDate: prog.endDate,
                              maxQuota: prog.maxQuota,
                              enrolledCount: prog.enrolledCount,
                            }) || "Open Registration";

                          const isEnrollable =
                            publicBadge === "Open Registration";

                          const attendanceLabel =
                            prog.locationType === "ONLINE"
                              ? "Online"
                              : prog.locationType === "ONSITE"
                                ? `On-Site • ${prog.city || "Jakarta"}`
                                : `Hybrid • ${prog.city || "Jakarta"}`;

                          const cohortImages = [
                            "/test.webp",
                            "/pic.webp",
                            "/image.webp",
                            "/coach.webp",
                            "/coach2.webp",
                          ];
                          const cohortImage =
                            prog.coverImage && prog.coverImage.trim().length > 0
                              ? prog.coverImage
                              : cohortImages[idx % cohortImages.length];

                          return (
                            <div
                              key={prog.id}
                              className="w-full shrink-0 min-w-full"
                            >
                              <div className="relative min-h-[300px] sm:min-h-[330px] p-5 sm:p-7 flex flex-col justify-between overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                  <Image
                                    src={cohortImage}
                                    alt={prog.title}
                                    fill
                                    priority={idx === 0}
                                    className="object-cover object-center brightness-[0.5] contrast-[1.08] grayscale"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/35" />
                                </div>

                                {/* Top Badges */}
                                <div className="relative z-10 flex flex-wrap items-center gap-2 font-mono">
                                  <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">
                                    {prog.trainingDays ||
                                      prog.durationDays ||
                                      3}{" "}
                                    Days
                                  </span>
                                  <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-zinc-200 uppercase tracking-wider">
                                    {attendanceLabel}
                                  </span>
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      isEnrollable
                                        ? "bg-white text-zinc-950"
                                        : "bg-white/15 text-zinc-200 border border-white/20"
                                    }`}
                                  >
                                    {publicBadge}
                                  </span>
                                </div>

                                {/* Middle Title & Meta */}
                                <div className="relative z-10 max-w-xl space-y-2 py-4">
                                  <div className="text-[11px] font-mono text-zinc-300 flex flex-wrap items-center gap-2">
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
                                        <span>{prog.category}</span>
                                      </>
                                    )}
                                  </div>

                                  <h3 className="text-xl sm:text-2xl font-geometric font-light tracking-tight text-white leading-snug">
                                    {prog.title}
                                  </h3>

                                  {prog.recommendedFor && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px] text-zinc-200">
                                      <Sparkles className="w-3 h-3 text-white shrink-0" />
                                      <span>For: {prog.recommendedFor}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Action Bar */}
                                <div className="relative z-10 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 font-mono">
                                  <div className="text-[11px] text-zinc-300">
                                    Rp {prog.price.toLocaleString("id-ID")}{" "}
                                    &bull; {prog.maxQuota} Cap
                                  </div>

                                  {sessionUser && prog.isUserEnrolled ? (
                                    <button
                                      type="button"
                                      onClick={() => router.push("/dashboard")}
                                      className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition"
                                    >
                                      <span>Open in Dashboard</span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : isEnrollable ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleProgramAction(prog.id, prog.title)
                                      }
                                      className="px-4 py-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition active:scale-95"
                                    >
                                      <span>
                                        {sessionUser
                                          ? "Enroll Cohort"
                                          : "Select & Sign Up"}
                                      </span>
                                      <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-zinc-400">
                                      {publicBadge}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Selector Pills for All Programs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                      {displayCohorts.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setActiveCohortIdx(i)}
                          className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-medium border transition ${
                            activeCohortIdx === i
                              ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                              : "bg-zinc-50 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                          }`}
                        >
                          {i + 1}. {p.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VIEW 5: SPECIALIST FACULTY */}
            {activeSection === "coaches" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Specialist Faculty
                    </span>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white mt-0.5">
                      Guided by Specialists
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("overview")}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                  >
                    &larr; Gateway
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {displayCoaches.map((coach, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-2xl overflow-hidden min-h-[260px] p-4 flex flex-col justify-between group border border-zinc-200 dark:border-white/10 bg-zinc-950"
                    >
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <Image
                          src={coach.image}
                          alt={coach.name}
                          fill
                          className="object-cover object-top brightness-[0.7] grayscale group-hover:scale-105 transition-transform duration-500 ease-out"
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
            )}

            {/* VIEW 6: PRIVATE CONCIERGE & STUDIO */}
            {activeSection === "concierge" && (
              <div className="rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-5 sm:p-7 shadow-sm space-y-5 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Private Concierge
                    </span>
                    <h2 className="text-xl sm:text-2xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white mt-0.5">
                      Studio &amp; Direct Assistance
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection("overview")}
                    className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/10 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                  >
                    &larr; Gateway
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950 dark:text-white">
                      <MapPin className="w-4 h-4" />
                      <span>Sanctuary Studio</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Senopati, South Jakarta • Private On-Site &amp; Hybrid Sessions by Cohort Registration.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950 dark:text-white">
                      <Clock className="w-4 h-4" />
                      <span>Concierge Hours</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Monday – Sunday, 06:00 – 21:00 WIB for cohort onboarding, QRIS verification, and schedule support.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <a
                    href="https://wa.me/6281290002026?text=Hello%20Sanctuary,%20I%20would%20like%20to%20inquire%20about%20the%20upcoming%20cohort."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-2 transition hover:opacity-90"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Concierge</span>
                  </a>

                  <a
                    href="mailto:concierge@bms.id?subject=Cohort%20Inquiry"
                    className="h-10 px-5 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs font-semibold inline-flex items-center gap-2 transition hover:bg-zinc-50 dark:hover:bg-white/10"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Concierge</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* RIGHT COLUMN (5 COLS): X.COM-STYLE DIRECT LOGIN / SIGNUP GATEWAY  */}
          {/* ================================================================= */}
          <div id="auth-gateway-panel" className="lg:col-span-5 w-full">
            {!sessionUser ? (
              <AuthGatewayCard
                initialTab={authTab}
                activeTabOverride={authTab}
                onTabChange={(next) => setAuthTab(next)}
                contextProgramTitle={selectedProgramTitle}
              />
            ) : (
              /* Authenticated Member Gateway Card (Matches Member Dashboard Profile Card) */
              <div className="w-full rounded-3xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-white/10 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                        Active Session
                      </span>
                      <h2 className="text-base font-semibold text-zinc-950 dark:text-white truncate">
                        {sessionUser.fullName}
                      </h2>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-white/10 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    {sessionUser.role}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/10 text-xs space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Signed in as
                  </span>
                  <p className="font-mono text-zinc-800 dark:text-zinc-200 truncate">
                    {sessionUser.email}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Link
                    href="/dashboard"
                    className="w-full h-11 rounded-xl bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition"
                  >
                    <span>Continue to Member Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {sessionUser.role === "SUPERADMIN" && (
                    <Link
                      href="/admin"
                      className="w-full h-10 rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-white/10 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <span>Open Superadmin Console</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleLogout}
                    className="w-full h-10 rounded-xl border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* 3. X.COM-STYLE MINIMAL DIRECTORY FOOTER BAR                           */}
      {/* ===================================================================== */}
      <footer className="py-4 px-4 sm:px-8 border-t border-zinc-200/80 dark:border-white/10 bg-white/60 dark:bg-[#121215]/60 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Gateway
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("about")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("curriculum")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Curriculum
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("programs")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Programs
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("coaches")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Specialists
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("concierge")}
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Concierge
            </button>
            <a
              href="https://wa.me/6281290002026"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              WhatsApp
            </a>
            <a
              href="mailto:concierge@bms.id"
              className="hover:text-zinc-950 dark:hover:text-white transition"
            >
              Email
            </a>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
            <span>+ BMS Sanctuary</span>
            <span>•</span>
            <span>© 2026 Minimalist Longevity</span>
          </div>
        </div>
      </footer>

      {/* Fallback AuthModal for mobile deep triggers */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
        contextProgramTitle={selectedProgramTitle}
      />
    </div>
  );
}
