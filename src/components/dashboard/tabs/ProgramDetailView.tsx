"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Dumbbell,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  MapPin,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import { resolvePublicBadge } from "@/wellness/utils/timeline";
import type { ProgramTermChapter } from "@/wellness/utils/json";
import { formatDateWib, formatIdr, safeHttpUrl } from "./shared";

export interface DetailDay {
  dayNumber: number;
  title: string;
  dayType: string;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  meetupLink: string | null;
  mapLink?: string | null;
  eventTitle?: string | null;
  eventHost?: string | null;
  eventDetails?: string | null;
  videoUrl: string | null;
  mealRecommendation: string | null;
  unlockDate?: string;
}

export interface DetailProgram {
  id: string;
  title: string;
  slug?: string;
  description: string;
  coverImage?: string | null;
  recommendedFor?: string;
  audience?: string | null;
  equipment?: string | null;
  coachName: string;
  coachTitle?: string | null;
  category?: string;
  difficultyLevel?: string;
  dailyCommitment?: string | null;
  durationDays?: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  maxQuota: number;
  enrolledCount: number;
  locationType?: string;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean;
  communityLink: string | null;
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string;
  status?: string;
  dayCount: number;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  scientificReferences?: Array<{ title: string; url?: string }>;
  programGuidelines?: string[];
  termsType?: string | null;
  customTerms?: string | null;
  termsList?: string[];
  termsChapters?: ProgramTermChapter[];
  days: DetailDay[];
}

function difficultyLabel(level?: string) {
  const value = (level || "").toUpperCase();
  if (value.includes("HIGH") || value === "HIGH_INTENSITY") return "High Intensity";
  if (value === "ADVANCED") return "Advanced";
  if (value === "INTERMEDIATE") return "Intermediate";
  if (value === "MODERATE") return "Moderate";
  if (value === "BEGINNER") return "Beginner";
  return level || "All Levels";
}

function formatLabel(type?: string) {
  if (type === "HYBRID") return "Hybrid (Onsite + Online)";
  if (type === "ONSITE") return "Onsite (In-Person)";
  return "Online (Remote)";
}

function dayLabel(type: string) {
  if (type === "REST_DAY") return "Rest";
  if (type === "TRAINING_DAY") return "Training";
  return "Connect";
}

function splitLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|•|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProgramDetailView({
  program,
  enrollmentStatus,
  onClose,
  onOpenPlan,
  onEnroll,
}: {
  program: DetailProgram;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  onClose: () => void;
  onOpenPlan: () => void;
  onEnroll: () => void;
}) {
  const badge =
    resolvePublicBadge({
      status: program.status,
      registrationOpenDate: program.registrationOpenDate,
      registrationDeadline: program.registrationDeadline,
      startDate: program.startDate,
      endDate: program.endDate,
      maxQuota: program.maxQuota,
      enrolledCount: program.enrolledCount,
    }) || "Open Registration";

  const totalDays = program.durationDays || program.dayCount || program.days.length;
  const trainingDaysCount = program.days.filter((d) => d.dayType === "TRAINING_DAY").length;
  const restDaysCount = program.days.filter((d) => d.dayType === "REST_DAY").length;
  const connectDaysCount = program.days.filter((d) => d.dayType !== "TRAINING_DAY" && d.dayType !== "REST_DAY").length;

  const community = safeHttpUrl(program.communityLink);
  const enrolled = enrollmentStatus === "ACTIVE";
  const actualPrice = program.actualPrice && program.actualPrice > program.price ? program.actualPrice : program.price;
  const discountPct =
    program.discountPercentage && program.discountPercentage > 0
      ? program.discountPercentage
      : actualPrice > program.price && actualPrice > 0
        ? Math.round(((actualPrice - program.price) / actualPrice) * 100)
        : 0;
  const seatsLeft = Math.max(0, program.maxQuota - (program.enrolledCount || 0));

  // Sessions: meetups, live Zoom calls, or scheduled workshops
  const liveSessions = program.days.filter(
    (d) =>
      d.dayType === "MEETUP_DAY" ||
      d.dayType === "CONNECTION_DAY" ||
      Boolean(d.onsiteVenue) ||
      Boolean(d.onsiteSchedule) ||
      Boolean(d.meetupLink) ||
      Boolean(d.eventTitle)
  );

  // Equipment list parsed
  const equipmentList = splitLines(program.equipment || "Movement Mat, Hydration Flask");

  // Calculate actual date for each day
  const baseTime = new Date(program.startDate).getTime();

  let action: React.ReactNode = null;
  if (enrolled) {
    action = (
      <button
        type="button"
        onClick={onOpenPlan}
        className="px-6 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider active:scale-95 transition"
      >
        Open My Plan
      </button>
    );
  } else if (enrollmentStatus === "PENDING" || badge === "Open Registration") {
    action = (
      <button
        type="button"
        onClick={onEnroll}
        className="px-6 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider active:scale-95 transition"
      >
        {enrollmentStatus === "PENDING" ? "Complete Payment" : program.price > 0 ? "Enroll Now" : "Join Program"}
      </button>
    );
  } else if (badge === "Coming Soon") {
    action = (
      <a
        href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Hello Concierge, I would like to join the waitlist for: ${program.title}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
      >
        Join Waitlist
      </a>
    );
  } else {
    action = <span className="text-xs font-mono uppercase tracking-wider text-white/70">Registration Closed</span>;
  }

  type SectionKey = "overview" | "timeline" | "sessions" | "meals" | "equipment" | "blueprint" | "terms";
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    timeline: true,
    sessions: false,
    meals: false,
    equipment: false,
    blueprint: false,
    terms: false,
  });

  const allExpanded = Object.values(openSections).every(Boolean);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const nextVal = !allExpanded;
    setOpenSections({
      overview: nextVal,
      timeline: nextVal,
      sessions: nextVal,
      meals: nextVal,
      equipment: nextVal,
      blueprint: nextVal,
      terms: nextVal,
    });
  };

  const askUrl =
    community ||
    `https://wa.me/6281290002026?text=${encodeURIComponent(
      `Halo Coach, saya ingin bertanya tentang program: ${program.title}`
    )}`;

  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > lastScrollYRef.current && currentScrollY > 40) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    lastScrollYRef.current = currentScrollY;
  };

  return (
    <div onScroll={handleScroll} className="fixed inset-0 z-[60] bg-[#f6f6f4] dark:bg-[#0e0e0e] overflow-y-auto">
      {/* ================================================================= */}
      {/* FLOATING HEADER: BACK BUTTON + ASK BUTTON (HIDES ON SCROLL-DOWN)  */}
      {/* ================================================================= */}
      <header
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        className={`fixed left-1/2 -translate-x-1/2 z-[70] w-[94%] max-w-2xl flex items-center justify-between pointer-events-none transition-all duration-300 ${
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto h-9 px-4 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition hover:bg-black/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <a
          href={askUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto h-9 px-3.5 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition hover:bg-black/80"
        >
          <MessageCircleQuestion className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ask</span>
        </a>
      </header>

      <div className="max-w-2xl mx-auto pb-32">
        {/* ================================================================= */}
        {/* HERO BANNER IMAGE (TITLE & METADATA OVERLAY)                      */}
        {/* ================================================================= */}
        <div className="relative h-80 sm:h-96 w-full overflow-hidden bg-zinc-900 shrink-0">
          {program.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt={program.title} className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/image.webp" alt="" className="w-full h-full object-cover" />
          )}
          {/* Subtle multi-layer gradient ensuring crisp contrast for white text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

          {/* Title and metadata overlying the image banner */}
          <div className="absolute inset-x-0 bottom-12 sm:bottom-14 px-5 sm:px-7 z-0 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-zinc-950 font-bold shadow-sm">
                {enrolled ? "Enrolled Member" : badge}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                {difficultyLabel(program.difficultyLevel)}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                {program.locationType === "ONLINE" ? "Online" : program.locationType === "HYBRID" ? "Hybrid" : "Onsite"}
              </span>
              {program.city && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                  {program.city}
                </span>
              )}
              {program.category && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20">
                  {program.category}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md">
              {program.title}
            </h1>

            <p className="text-xs text-white/80 font-medium drop-shadow-sm flex items-center gap-2 flex-wrap">
              <span>Coach <strong className="text-white font-semibold">{program.coachName}</strong>{program.coachTitle ? ` · ${program.coachTitle}` : ""}</span>
              <span className="text-white/40">•</span>
              <span>{totalDays} Days Program</span>
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SECTION UNDERNEATH WITH CURVED BORDER (LEKUKAN DI IMAGE)         */}
        {/* ================================================================= */}
        <div className="relative -mt-10 sm:-mt-12 z-10 rounded-t-[36px] sm:rounded-t-[40px] border-t-2 border-x border-zinc-200 dark:border-white/15 bg-[#f6f6f4] dark:bg-[#0e0e0e] shadow-xl pt-5 sm:pt-6 px-4 sm:px-6 space-y-4">
          {/* Header Action: Modules Overview & Expand / Collapse All */}
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
                Program Curriculum & Modules
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                7 Modules
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="h-7 px-3 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition inline-flex items-center gap-1 shadow-2xs"
            >
              <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
            </button>
          </div>
          {/* ================================================================= */}
          {/* 1. OVERVIEW & SPECIFICATIONS                                      */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("overview")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 1
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Program Overview & Directory
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!openSections.overview && (
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline truncate max-w-[140px]">
                    {difficultyLabel(program.difficultyLevel)} · {program.category || "Longevity"}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    openSections.overview ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {openSections.overview && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/5">

            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {program.description}
            </p>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs pt-1">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">Intensity</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">
                  {difficultyLabel(program.difficultyLevel)}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">Categories</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white truncate">
                  {program.category || "Longevity"}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5 col-span-2 sm:col-span-1">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">Coach</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white truncate">
                  {program.coachName}
                  {program.coachTitle ? <span className="text-zinc-400 font-normal"> · {program.coachTitle}</span> : null}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">Location Type</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">
                  {formatLabel(program.locationType)}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">City / Region</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">
                  {program.city || (program.locationType === "ONLINE" ? "Global Access" : "Jakarta")}
                </dd>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-0.5 col-span-2 sm:col-span-1">
                <dt className="text-[10px] font-mono uppercase text-zinc-400">Daily Commitment</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">
                  {program.dailyCommitment || "20 – 30 Mins / Day"}
                </dd>
              </div>
            </dl>

            {program.locationType !== "ONLINE" && program.venueAddress && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 text-xs space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Studio Venue Address</span>
                <p className="font-medium text-zinc-900 dark:text-white">{program.venueAddress}</p>
              </div>
            )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 2. TIMELINE, SCHEDULE & CURRICULUM BREAKDOWN                     */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("timeline")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 2
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Timeline, Dates & Curriculum
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!openSections.timeline && (
                  <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline truncate max-w-[140px]">
                    {totalDays} Days · {trainingDaysCount} Training
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    openSections.timeline ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {openSections.timeline && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Registration Period</span>
                <p className="font-semibold text-zinc-900 dark:text-white text-xs sm:text-sm">
                  {program.registrationOpenDate ? formatDateWib(program.registrationOpenDate) : "Open"} – {formatDateWib(program.registrationDeadline)}
                </p>
                <span className="text-[11px] text-zinc-500 block">Cutoff at 23:59 WIB</span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Cohort Schedule & Duration</span>
                <p className="font-semibold text-zinc-900 dark:text-white text-xs sm:text-sm">
                  {formatDateWib(program.startDate)} – {formatDateWib(program.endDate)}
                </p>
                <span className="text-[11px] text-zinc-500 block">{totalDays} Consecutive Days</span>
              </div>
            </div>

            {/* Curriculum Breakdown: Training - Connect - Rest */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold">
                  Curriculum Breakdown
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  Total {totalDays} Days
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-[#1c1c1c] border border-zinc-200/60 dark:border-white/10">
                  <span className="text-base font-bold text-zinc-950 dark:text-white block">{trainingDaysCount}</span>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Training Days</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#1c1c1c] border border-zinc-200/60 dark:border-white/10">
                  <span className="text-base font-bold text-zinc-950 dark:text-white block">{connectDaysCount}</span>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Connect Days</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#1c1c1c] border border-zinc-200/60 dark:border-white/10">
                  <span className="text-base font-bold text-zinc-950 dark:text-white block">{restDaysCount}</span>
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Rest Days</span>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold block">Target Audience</span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                {program.audience || program.recommendedFor || "All Levels • Mindful Movement & Longevity"}
              </p>
            </div>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 3. SESSIONS: KAPAN SAJA, DIMANA, TANGGAL BERAPA                   */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("sessions")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 3
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Meetups & Live Sessions
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                  {liveSessions.length} {liveSessions.length === 1 ? "Session" : "Sessions"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    openSections.sessions ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {openSections.sessions && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-3 border-t border-zinc-100 dark:border-white/5">

            {liveSessions.length > 0 ? (
              <div className="space-y-3">
                {liveSessions.map((session) => {
                  const sessionDate = new Date(baseTime + (session.dayNumber - 1) * 86400000);
                  const meetUrl = safeHttpUrl(session.meetupLink);
                  const mapUrl = safeHttpUrl(session.mapLink);

                  return (
                    <article
                      key={session.dayNumber}
                      className="rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                              Day {session.dayNumber}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                              {formatDateWib(sessionDate)}
                            </span>
                          </div>
                          <h3 className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white mt-1">
                            {session.eventTitle || session.title || "Live Cohort Interactive Session"}
                          </h3>
                        </div>

                        {session.onsiteSchedule && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span>{session.onsiteSchedule}</span>
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 pt-1 border-t border-zinc-200/50 dark:border-white/5">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>
                            <strong className="text-zinc-800 dark:text-zinc-200 font-medium">Location: </strong>
                            {session.onsiteVenue || (program.locationType === "ONLINE" ? "Zoom Livestream Room" : program.city ? `Studio ${program.city}` : "Online Room")}
                          </span>
                        </p>
                        {session.eventHost && (
                          <p className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>
                              <strong className="text-zinc-800 dark:text-zinc-200 font-medium">Host: </strong>
                              {session.eventHost}
                            </span>
                          </p>
                        )}
                        {session.eventDetails && (
                          <p className="text-[11px] text-zinc-500 pt-0.5">
                            {session.eventDetails}
                          </p>
                        )}
                      </div>

                      {/* Session Action: Join Zoom or View Map */}
                      <div className="pt-2 flex items-center justify-between gap-2">
                        {enrolled && meetUrl ? (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 px-3 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold inline-flex items-center gap-1 active:scale-95 transition"
                          >
                            <Video className="w-3 h-3" />
                            <span>Join Live Session</span>
                            <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Meeting link unlocked upon enrollment</span>
                          </span>
                        )}

                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 px-2.5 rounded-full border border-zinc-200 dark:border-white/15 text-[11px] text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 active:scale-95 transition"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Map</span>
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 text-xs text-zinc-500 space-y-1">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Continuous Remote Touchpoints
                </p>
                <p>
                  Daily interactive check-ins, asynchronous feedback, and guidance are conducted through the cohort private community channel throughout the {totalDays} days.
                </p>
              </div>
            )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 4. MEAL RECOMMENDATIONS (DAY 1 TO END)                            */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("meals")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 4
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Nutrition Protocol (Day 1 – {totalDays})
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                  {program.days.length} Days
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    openSections.meals ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {openSections.meals && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-2.5 border-t border-zinc-100 dark:border-white/5">

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {program.days.map((day) => {
                const dayDate = new Date(baseTime + (day.dayNumber - 1) * 86400000);
                const mealLines = splitLines(day.mealRecommendation);

                return (
                  <article
                    key={day.dayNumber}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                          Day {day.dayNumber}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDateWib(dayDate)}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase text-zinc-400">
                        {dayLabel(day.dayType)}
                      </span>
                    </div>

                    {mealLines.length > 1 ? (
                      <ul className="space-y-1 pt-0.5">
                        {mealLines.map((line, idx) => (
                          <li key={idx} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : day.mealRecommendation && day.mealRecommendation.trim() ? (
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line pt-0.5">
                        {day.mealRecommendation}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Whole-food nutritional fuel, high-protein breakfast, and circadian hydration (3L daily).
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 5. REQUIRED EQUIPMENT                                             */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("equipment")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 5
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Required Equipment & Gear
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                  {equipmentList.length} Items
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    openSections.equipment ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {openSections.equipment && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/5">

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {equipmentList.map((item, idx) => (
                <li
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 6. TARGET STATE, METHODOLOGY & SCIENTIFIC BLUEPRINT               */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("blueprint")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 6
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Methodology & Scientific Blueprint
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.blueprint ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.blueprint && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Target State
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {program.targetState || "Establish deep somatic stability, circadian alignment, and elevated metabolic stamina."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Methodology
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {program.methodology || "Micro-dosed resistance stimulus coupled with restorative parasympathetic nervous system protocols."}
                </p>
              </div>
            </div>

            {/* Expected Benefits */}
            {program.expectedBenefits && program.expectedBenefits.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Expected Physiological & Mental Benefits
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {program.expectedBenefits.map((benefit, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 flex items-start gap-2 text-zinc-700 dark:text-zinc-300"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Program Guidelines */}
            {program.programGuidelines && program.programGuidelines.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Program Daily Guidelines
                </span>
                <ol className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {program.programGuidelines.map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-[10px] text-zinc-400 mt-0.5">{idx + 1}.</span>
                      <span>{guide}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Scientific References */}
            {program.scientificReferences && program.scientificReferences.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Scientific References & Clinical Studies
                </span>
                <ul className="space-y-1.5">
                  {program.scientificReferences.map((ref, idx) => {
                    const url = safeHttpUrl(ref.url);
                    return (
                      <li
                        key={idx}
                        className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5"
                      >
                        <span className="truncate">{ref.title}</span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-zinc-900 dark:text-white shrink-0 inline-flex items-center gap-1 underline"
                          >
                            Read Study <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 7. TERMS & CONDITIONS AND COMMUNITY WAIVER                        */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("terms")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 7
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Terms, Conditions & Cohort Waiver
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.terms ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.terms && (
              <div className="px-4 pb-5 sm:px-5 sm:pb-5 pt-0 space-y-4 border-t border-zinc-100 dark:border-white/5">

            {/* Community Access Card */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Private Cohort Community
                  </span>
                  <span className="text-[11px] text-zinc-500 block truncate">
                    {enrolled && community
                      ? "Direct access to cohort chat & coach announcements"
                      : "Private channel unlocked upon enrollment"}
                  </span>
                </div>
              </div>
              {enrolled && community ? (
                <a
                  href={community}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1 shrink-0 active:scale-95 transition"
                >
                  <span>Join Chat</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-200/70 dark:bg-white/10 text-zinc-500 inline-flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3" /> Members Only
                </span>
              )}
            </div>

            {/* Terms List */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] p-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white pb-1 border-b border-zinc-200/60 dark:border-white/10">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Program Terms & Conditions</span>
              </div>
              {program.termsChapters && program.termsChapters.length > 0 ? (
                program.termsChapters.map((ch, idx) => (
                  <div key={idx} className="space-y-1 pt-1">
                    <p className="font-semibold text-zinc-900 dark:text-white">{ch.chapter}</p>
                    <ul className="space-y-1 pl-4 list-disc">
                      {ch.clauses.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : program.termsList && program.termsList.length > 0 ? (
                <ul className="space-y-1.5 pl-4 list-disc pt-1">
                  {program.termsList.map((term, idx) => (
                    <li key={idx}>{term}</li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1.5 pl-4 list-disc pt-1">
                  <li>Daily check-in logs reset automatically at 00:00 WIB (UTC+7).</li>
                  <li>Participants must consult a physician prior to commencing high-intensity physical routines.</li>
                  <li>Cohort access and tuition are non-transferable once the cohort start date commences.</li>
                </ul>
              )}
            </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 z-[61] border-t border-zinc-200/60 dark:border-white/10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-white/60">
              {enrolled ? "Active Member" : badge} · {seatsLeft} slots left
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-base font-bold text-zinc-950 dark:text-white">
                {program.price > 0 ? formatIdr(program.price) : "Free"}
              </p>
              {discountPct > 0 && !enrolled && (
                <span className="text-xs text-zinc-400 line-through">{formatIdr(actualPrice)}</span>
              )}
            </div>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
