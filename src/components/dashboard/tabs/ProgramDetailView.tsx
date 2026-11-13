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
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
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
  hideHeaderAction,
  onClose,
  onOpenPlan,
  onEnroll,
}: {
  program: DetailProgram;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  hideHeaderAction?: boolean;
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

  const liveSessions = program.days.filter(
    (d) =>
      d.dayType === "MEETUP_DAY" ||
      d.dayType === "CONNECTION_DAY" ||
      Boolean(d.onsiteVenue) ||
      Boolean(d.onsiteSchedule) ||
      Boolean(d.meetupLink) ||
      Boolean(d.eventTitle)
  );

  const equipmentList = splitLines(program.equipment || "Movement Mat, Hydration Flask");
  const baseTime = new Date(program.startDate).getTime();

  let action: React.ReactNode = null;
  if (enrolled) {
    action = (
      <button
        type="button"
        onClick={onOpenPlan}
        className="px-5 py-2.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-semibold tracking-wide active:scale-95 transition shadow-sm"
      >
        Open Plan
      </button>
    );
  } else if (enrollmentStatus === "PENDING" || badge === "Open Registration") {
    action = (
      <button
        type="button"
        onClick={onEnroll}
        className="px-5 py-2.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-semibold tracking-wide active:scale-95 transition shadow-sm"
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
        className="px-5 py-2.5 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
      >
        Join Waitlist
      </a>
    );
  } else {
    action = <span className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Closed</span>;
  }

  type SectionKey = "overview" | "coach" | "timeline" | "sessions" | "meals" | "equipment" | "blueprint" | "terms";
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    overview: true,
    coach: true,
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
      coach: nextVal,
      timeline: nextVal,
      sessions: nextVal,
      meals: nextVal,
      equipment: nextVal,
      blueprint: nextVal,
      terms: nextVal,
    });
  };

  const conciergeUrl =
    community ||
    `https://wa.me/6281290002026?text=${encodeURIComponent(
      `Hello Concierge, I would like to inquire about program: ${program.title}`
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
    <div onScroll={handleScroll} className="fixed inset-0 z-[60] bg-[#f3f2ed] dark:bg-[#0e0e0e] overflow-y-auto">
      {/* ================================================================= */}
      {/* FLOATING HEADER: BACK BUTTON + TEXT-ONLY RIGHT BUTTON (NO ICON)   */}
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
          className="pointer-events-auto h-8 px-3.5 rounded-[2px] bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide inline-flex items-center gap-1.5 shadow-md active:scale-95 transition hover:bg-black/80"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {!hideHeaderAction && (
          <a
            href={conciergeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto h-8 px-4 rounded-[2px] bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide active:scale-95 transition hover:bg-black/80 inline-flex items-center justify-center shadow-md"
          >
            <span>{community ? "Community" : "Concierge"}</span>
          </a>
        )}
      </header>

      <div className="max-w-2xl mx-auto pb-32">
        {/* ================================================================= */}
        {/* HERO BANNER IMAGE (CLEAN, AIRY OVERLAY WITH NEGATIVE SPACE)       */}
        {/* ================================================================= */}
        <div className="relative h-76 sm:h-88 w-full overflow-hidden bg-zinc-950 shrink-0">
          {program.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt={program.title} className="w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/image.webp" alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

          {/* Clean title & metadata banner: Status, Title, Coach, Commitment */}
          <div className="absolute inset-x-0 bottom-12 sm:bottom-14 px-6 sm:px-8 z-0 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-white/80">
              <span className="px-3 py-1 rounded-[2px] bg-white text-zinc-950 text-[10px] font-bold shadow-sm">
                {enrolled ? "Enrolled" : badge}
              </span>
            </div>

            <h1 className="font-editorial text-3xl sm:text-4xl tracking-tight text-white leading-[1.05] drop-shadow-md">
              {program.title}
            </h1>

            <p className="text-xs text-white/85 font-medium flex items-center gap-2 flex-wrap">
              <span>Coach <strong className="text-white font-semibold">{program.coachName}</strong></span>
              <span className="text-white/40">•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/70" />
                <span>{program.dailyCommitment || "20–30 mins/day"} Commitment</span>
              </span>
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ARCHITECTURAL SHEET CONTAINER                                     */}
        {/* ================================================================= */}
        <div className="relative -mt-6 sm:-mt-8 z-10 rounded-t-[2px] border-t-2 border-zinc-900 dark:border-white/25 bg-[#f3f2ed] dark:bg-[#09090b] shadow-xl pt-6 px-4 sm:px-6 pb-28 space-y-4">
          {/* Header Action: Curriculum Overview & Expand / Collapse */}
          <div className="flex items-center justify-between px-1 pb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-600 dark:text-zinc-400">
              Program Curriculum
            </span>
            <button
              type="button"
              onClick={toggleAll}
              className="h-7 px-3 rounded-[2px] border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#121215] text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition inline-flex items-center gap-1 shadow-2xs"
            >
              <span>{allExpanded ? "Collapse All" : "Expand All"}</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* 1. OVERVIEW & SPECIFICATIONS                                      */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("overview")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 1
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Program Overview
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.overview ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.overview && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100 dark:border-white/5">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                  {program.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 pt-3 border-t border-zinc-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Intensity</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                      {difficultyLabel(program.difficultyLevel)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Commitment</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                      {program.dailyCommitment || "20–30 mins/day"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Format</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                      {formatLabel(program.locationType)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Location</span>
                    <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                      {program.city || (program.locationType === "ONLINE" ? "Global Access" : "Jakarta")}
                    </span>
                  </div>
                </div>

                {program.locationType !== "ONLINE" && program.venueAddress && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-white/5 text-xs">
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Venue Address</span>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">{program.venueAddress}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 2. COACH & FACULTY PROFILE                                        */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("coach")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 2
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Lead Coach &amp; Mentorship
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.coach ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.coach && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100 dark:border-white/5">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      program.coachName.toLowerCase().includes("marcus") || program.coachName.toLowerCase().includes("vance")
                        ? "/coach2.webp"
                        : program.coachName.toLowerCase().includes("elena")
                          ? "/coach3.webp"
                          : "/coach.webp"
                    }
                    alt={program.coachName}
                    className="w-16 h-16 rounded-[2px] object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-xs"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                        Coach {program.coachName}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold">
                        Verified Lead Guide
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium">
                      {program.coachTitle || "Master Movement & Longevity Specialist"}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                      Designs and guides daily somatic training protocols, posture alignment, and neuromuscular conditioning. Reviews participant form and monitors cohort progression.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Cohort Support &amp; Form Feedback
                  </span>
                  <a
                    href={`https://wa.me/6281290002026?text=${encodeURIComponent(
                      `Hello Concierge, I have a question for Coach ${program.coachName} regarding program: ${program.title}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-zinc-900 dark:text-white hover:underline inline-flex items-center gap-1"
                  >
                    <span>Ask Coach via Concierge</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 3. TIMELINE, DATES & CURRICULUM                                   */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("timeline")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 3
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Timeline & Schedule
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.timeline ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.timeline && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100 dark:border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Registration Period</span>
                    <p className="font-semibold text-zinc-900 dark:text-white mt-0.5">
                      {program.registrationOpenDate ? formatDateWib(program.registrationOpenDate) : "Open"} – {formatDateWib(program.registrationDeadline)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase text-zinc-400 block">Program Dates</span>
                    <p className="font-semibold text-zinc-900 dark:text-white mt-0.5">
                      {formatDateWib(program.startDate)} – {formatDateWib(program.endDate)} ({totalDays} Days)
                    </p>
                  </div>
                </div>

                {/* Clean Curriculum Stats */}
                <div className="pt-3 border-t border-zinc-100 dark:border-white/5">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block mb-2 font-semibold">
                    Curriculum Structure
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="py-2.5 px-2 rounded-[2px] bg-zinc-50 dark:bg-white/5">
                      <span className="text-base font-bold text-zinc-950 dark:text-white block">{trainingDaysCount}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-400">Training Days</span>
                    </div>
                    <div className="py-2.5 px-2 rounded-[2px] bg-zinc-50 dark:bg-white/5">
                      <span className="text-base font-bold text-zinc-950 dark:text-white block">{connectDaysCount}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-400">Connect Days</span>
                    </div>
                    <div className="py-2.5 px-2 rounded-[2px] bg-zinc-50 dark:bg-white/5">
                      <span className="text-base font-bold text-zinc-950 dark:text-white block">{restDaysCount}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-400">Rest Days</span>
                    </div>
                  </div>
                </div>

                {/* Target Audience */}
                <div className="pt-3 border-t border-zinc-100 dark:border-white/5 text-xs">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 block">Target Audience</span>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                    {program.audience || program.recommendedFor || "All Levels · Mindful Movement & Longevity"}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 3. SESSIONS: KAPAN SAJA, DIMANA, TANGGAL BERAPA                   */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("sessions")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Video className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 4
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Meetups & Live Sessions
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.sessions ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.sessions && (
              <div className="px-5 pb-5 pt-1 space-y-3 border-t border-zinc-100 dark:border-white/5">
                {liveSessions.length > 0 ? (
                  <div className="space-y-3">
                    {liveSessions.map((session) => {
                      const sessionDate = new Date(baseTime + (session.dayNumber - 1) * 86400000);
                      const meetUrl = safeHttpUrl(session.meetupLink);
                      const mapUrl = safeHttpUrl(session.mapLink);

                      return (
                        <article
                          key={session.dayNumber}
                          className="rounded-[2px] border border-zinc-200/80 dark:border-white/10 p-4 space-y-2 bg-zinc-50/40 dark:bg-white/[0.02]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                                  Day {session.dayNumber}
                                </span>
                                <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                                  {formatDateWib(sessionDate)}
                                </span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white mt-1">
                                {session.eventTitle || session.title || "Live Cohort Session"}
                              </h3>
                            </div>

                            {session.onsiteSchedule && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 shrink-0">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                <span>{session.onsiteSchedule}</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 pt-1">
                            <p className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{session.onsiteVenue || (program.locationType === "ONLINE" ? "Zoom Room" : program.city ? `Studio ${program.city}` : "Online Room")}</span>
                            </p>
                            {session.eventHost && (
                              <p className="flex items-center gap-1.5 text-zinc-500">
                                <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Host: {session.eventHost}</span>
                              </p>
                            )}
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-2">
                            {enrolled && meetUrl ? (
                              <a
                                href={meetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-3 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold inline-flex items-center gap-1 active:scale-95 transition"
                              >
                                <Video className="w-3 h-3" />
                                <span>Join Session</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-400 inline-flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Meeting link unlocks upon enrollment</span>
                              </span>
                            )}

                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-7 px-2.5 rounded-[2px] border border-zinc-200 dark:border-white/15 text-[11px] text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 active:scale-95 transition"
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
                  <p className="text-xs text-zinc-500 leading-relaxed py-1">
                    Continuous asynchronous coaching, daily check-ins, and direct feedback are provided throughout the {totalDays} days in the private cohort.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 4. NUTRITION PROTOCOL                                             */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("meals")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Utensils className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 5
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Nutrition Protocol
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.meals ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.meals && (
              <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-zinc-100 dark:border-white/5">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {program.days.map((day) => {
                    const dayDate = new Date(baseTime + (day.dayNumber - 1) * 86400000);
                    const mealLines = splitLines(day.mealRecommendation);

                    return (
                      <article
                        key={day.dayNumber}
                        className="p-3 rounded-[2px] border border-zinc-200/70 dark:border-white/10 bg-zinc-50/40 dark:bg-white/[0.02] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                            Day {day.dayNumber} · {formatDateWib(dayDate)}
                          </span>
                          <span className="text-[10px] font-mono uppercase text-zinc-400">
                            {dayLabel(day.dayType)}
                          </span>
                        </div>

                        {mealLines.length > 1 ? (
                          <ul className="space-y-1 pt-1 text-zinc-700 dark:text-zinc-300">
                            {mealLines.map((line, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                                <span className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        ) : day.mealRecommendation && day.mealRecommendation.trim() ? (
                          <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed pt-0.5">
                            {day.mealRecommendation}
                          </p>
                        ) : (
                          <p className="text-zinc-500 pt-0.5">
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
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("equipment")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 6
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Required Gear & Equipment
                  </h2>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 shrink-0 ${
                  openSections.equipment ? "rotate-180" : ""
                }`}
              />
            </button>

            {openSections.equipment && (
              <div className="px-5 pb-5 pt-1 space-y-3 border-t border-zinc-100 dark:border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {equipmentList.map((item, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 px-3 rounded-[2px] bg-zinc-50/50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 flex items-center gap-2 text-zinc-800 dark:text-zinc-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 6. METHODOLOGY & SCIENTIFIC BLUEPRINT                             */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("blueprint")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 7
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Methodology & Blueprint
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
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100 dark:border-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Target State
                    </span>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1">
                      {program.targetState || "Establish deep somatic stability, circadian alignment, and elevated metabolic stamina."}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Methodology
                    </span>
                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mt-1">
                      {program.methodology || "Micro-dosed resistance stimulus coupled with restorative parasympathetic nervous system protocols."}
                    </p>
                  </div>
                </div>

                {program.expectedBenefits && program.expectedBenefits.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-white/5 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Expected Outcomes
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {program.expectedBenefits.map((benefit, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300"
                        >
                          <Check className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {program.programGuidelines && program.programGuidelines.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-white/5 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Program Guidelines
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

                {program.scientificReferences && program.scientificReferences.length > 0 && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-white/5 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                      Scientific References
                    </span>
                    <ul className="space-y-1.5 text-xs">
                      {program.scientificReferences.map((ref, idx) => {
                        const url = safeHttpUrl(ref.url);
                        return (
                          <li
                            key={idx}
                            className="text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-2 py-1"
                          >
                            <span className="truncate">{ref.title}</span>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono text-zinc-900 dark:text-white shrink-0 inline-flex items-center gap-1 underline"
                              >
                                Read <ExternalLink className="w-3 h-3" />
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
          {/* 7. TERMS & CONDITIONS                                             */}
          {/* ================================================================= */}
          <section className="rounded-[2px] border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#121215] overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => toggleSection("terms")}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[2px] bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Module 8
                  </span>
                  <h2 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                    Terms & Guidelines
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
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-100 dark:border-white/5">
                {/* Community Access Card */}
                <div className="py-3 px-3.5 rounded-[2px] bg-zinc-50/70 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-[2px] bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                        Cohort Community
                      </span>
                      <span className="text-[11px] text-zinc-500 block truncate">
                        {enrolled && community ? "Direct access to coach chat" : "Unlocked upon enrollment"}
                      </span>
                    </div>
                  </div>
                  {enrolled && community ? (
                    <a
                      href={community}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 px-3 rounded-[2px] bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold inline-flex items-center gap-1 shrink-0 active:scale-95 transition"
                    >
                      <span>Join</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-zinc-200/70 dark:bg-white/10 text-zinc-500 inline-flex items-center gap-1 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> Members
                    </span>
                  )}
                </div>

                {/* Terms List */}
                <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white pb-1">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Cohort Guidelines</span>
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
                    <ul className="space-y-1 pl-4 list-disc">
                      {program.termsList.map((term, idx) => (
                        <li key={idx}>{term}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1 pl-4 list-disc text-zinc-500">
                      <li>Daily task logs reset automatically at 00:00 WIB (UTC+7).</li>
                      <li>Consult a physician prior to commencing high-intensity physical routines.</li>
                      <li>Cohort registrations are non-transferable once the start date commences.</li>
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* FLOATING STICKY BOTTOM DOCK WIDGET */}
      <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-[61] px-4 pointer-events-none">
        <div className="max-w-xl mx-auto rounded-[2px] border border-zinc-200/80 dark:border-white/15 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-2xl shadow-2xl p-3.5 sm:px-5 flex items-center justify-between gap-3 pointer-events-auto">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              {enrolled ? "Active Member" : badge} · {seatsLeft} slots left
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white">
                {program.price > 0 ? formatIdr(program.price) : "Free"}
              </p>
              {discountPct > 0 && !enrolled && (
                <span className="text-xs text-zinc-400 line-through">{formatIdr(actualPrice)}</span>
              )}
            </div>
          </div>
          <div className="shrink-0">{action}</div>
        </div>
      </div>
    </div>
  );
}
