"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Lock,
  MapPin,
  Users,
  Video,
} from "lucide-react";
import { resolvePublicBadge } from "@/wellness/utils/timeline";
import { buildConciergeWhatsAppUrl } from "@/wellness/brand";
import type { ProgramTermChapter } from "@/wellness/utils/json";
import { HeaderBackButton, formatDateWib, formatIdr, safeHttpUrl } from "./shared";

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
  organizationName?: string | null;
  organizationLogo?: string | null;
  organizationVerified?: boolean;
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

function ProgramAccordion({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full py-3.5 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-3 text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition"
      >
        <span className="font-medium text-left truncate">
          {title}
          {typeof count === "number" ? ` (${count})` : ""}
        </span>
        <span className="inline-flex items-center gap-1 shrink-0 text-xs text-zinc-400">
          <span>{open ? "Hide" : "Show"}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {open && <div className="pt-2 pb-3">{children}</div>}
    </div>
  );
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
        className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium tracking-wide active:scale-95 transition shadow-sm"
      >
        Open Plan
      </button>
    );
  } else if (enrollmentStatus === "PENDING" || badge === "Open Registration") {
    action = (
      <button
        type="button"
        onClick={onEnroll}
        className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium tracking-wide active:scale-95 transition shadow-sm"
      >
        {enrollmentStatus === "PENDING" ? "Complete Payment" : program.price > 0 ? "Enroll Now" : "Join Plan"}
      </button>
    );
  } else if (badge === "Coming Soon") {
    action = (
      <a
        href={buildConciergeWhatsAppUrl(`Hello Concierge, I would like to join the waitlist for: ${program.title}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-medium tracking-wide inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition"
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
    buildConciergeWhatsAppUrl(`Hello Concierge, I would like to inquire about plan: ${program.title}`);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [overHero, setOverHero] = useState(true);
  const lastScrollYRef = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    setOverHero(currentScrollY < 220);
    if (currentScrollY > lastScrollYRef.current && currentScrollY > 40) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    lastScrollYRef.current = currentScrollY;
  };

  const view = (
    <div
      onScroll={handleScroll}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
    >
      {/* FLOATING HEADER: CONSISTENT BORDERLESS BACK BUTTON */}
      <header
        style={{ paddingTop: "env(safe-area-inset-top)" }}
        className={`fixed top-0 left-0 right-0 z-[70] w-full pointer-events-none transition-all duration-300 ${
          headerVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
          <HeaderBackButton
            onClick={onClose}
            overlay={overHero}
            className="pointer-events-auto"
          />

          {!hideHeaderAction && (
            <a
              href={conciergeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`pointer-events-auto py-1.5 text-xs sm:text-sm font-medium active:scale-95 transition inline-flex items-center justify-center ${
                overHero
                  ? "text-white hover:text-white/80 drop-shadow-xs"
                  : "text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-white/75"
              }`}
            >
              <span>{community ? "Community" : "Concierge"}</span>
            </a>
          )}
        </div>
      </header>

      {/* TOP HERO BANNER MATCHING GUIDE DETAIL */}
      <div className="relative h-[340px] sm:h-[390px] w-full overflow-hidden bg-zinc-950 shrink-0">
        {program.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.coverImage} alt={program.title} className="w-full h-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/image.webp" alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

        <div className="absolute inset-x-0 bottom-14 sm:bottom-16 z-0">
          <div className="max-w-2xl mx-auto w-full px-6 sm:px-10 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-medium tracking-[0.03em] text-white">
                {enrolled ? "Enrolled" : badge}
              </span>
              {program.organizationName && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-mono uppercase tracking-wider text-white/95">
                  {program.organizationName}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-white leading-tight drop-shadow-md">
              {program.title}
            </h1>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-lg">
              {program.organizationName ? `${program.organizationName} · ` : ""}
              Coach {program.coachName} · {totalDays} days · {program.dailyCommitment || "20–30 mins/day"}
            </p>
          </div>
        </div>
      </div>

      {/* CURVED SHEET CONTAINER MATCHING GUIDE DETAIL */}
      <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] shadow-2xl pt-8 sm:pt-10 px-6 sm:px-10 pb-36 max-w-2xl mx-auto w-full flex-1 space-y-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Plan Overview &amp; Curriculum
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>

        <div className="space-y-4">
          {/* 1. PLAN OVERVIEW */}
          <ProgramAccordion
            title="Plan Overview"
            open={openSections.overview}
            onToggle={() => toggleSection("overview")}
          >
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {program.description}
              </p>

              <dl className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm">
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Intensity</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {difficultyLabel(program.difficultyLevel)}
                  </dd>
                </div>
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Commitment</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.dailyCommitment || "20–30 mins/day"}
                  </dd>
                </div>
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Format</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {formatLabel(program.locationType)}
                  </dd>
                </div>
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Location</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.city || (program.locationType === "ONLINE" ? "Global Access" : "Jakarta")}
                  </dd>
                </div>
                {program.locationType !== "ONLINE" && program.venueAddress && (
                  <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Venue</dt>
                    <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                      {program.venueAddress}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </ProgramAccordion>

          {/* 2. LEAD COACH & MENTORSHIP */}
          <ProgramAccordion
            title="Lead Coach & Mentorship"
            open={openSections.coach}
            onToggle={() => toggleSection("coach")}
          >
            <div className="space-y-4">
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
                  className="w-16 h-16 rounded-2xl object-cover object-top shrink-0 bg-zinc-200 dark:bg-zinc-800"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-sm sm:text-base font-geometric font-medium text-zinc-950 dark:text-white">
                    Coach {program.coachName}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {program.coachTitle || "Master Movement & Longevity Specialist"}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                    Designs and guides daily somatic training protocols, posture alignment, and neuromuscular conditioning.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">Cohort Support &amp; Form Feedback</span>
                <a
                  href={buildConciergeWhatsAppUrl(
                    `Hello Concierge, I have a question for Coach ${program.coachName} regarding plan: ${program.title}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-950 dark:text-white hover:underline inline-flex items-center gap-1"
                >
                  <span>Ask Coach via Concierge</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </ProgramAccordion>

          {/* 3. TIMELINE & SCHEDULE */}
          <ProgramAccordion
            title="Timeline & Schedule"
            open={openSections.timeline}
            onToggle={() => toggleSection("timeline")}
          >
            <div className="space-y-4">
              <dl className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm">
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Registration</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.registrationOpenDate ? formatDateWib(program.registrationOpenDate) : "Open"} – {formatDateWib(program.registrationDeadline)}
                  </dd>
                </div>
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Plan Dates</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {formatDateWib(program.startDate)} – {formatDateWib(program.endDate)} ({totalDays} days)
                  </dd>
                </div>
                <div className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Target Audience</dt>
                  <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                    {program.audience || program.recommendedFor || "All Levels · Mindful Longevity"}
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-3 divide-x divide-zinc-200/80 dark:divide-white/10 text-center py-1">
                <div>
                  <span className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white block">{trainingDaysCount}</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Training</span>
                </div>
                <div>
                  <span className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white block">{connectDaysCount}</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Connect</span>
                </div>
                <div>
                  <span className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white block">{restDaysCount}</span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Rest</span>
                </div>
              </div>
            </div>
          </ProgramAccordion>

          {/* 4. MEETUPS & LIVE SESSIONS */}
          <ProgramAccordion
            title="Meetups & Live Sessions"
            count={liveSessions.length}
            open={openSections.sessions}
            onToggle={() => toggleSection("sessions")}
          >
            {liveSessions.length > 0 ? (
              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10">
                {liveSessions.map((session) => {
                  const sessionDate = new Date(baseTime + (session.dayNumber - 1) * 86400000);
                  const meetUrl = safeHttpUrl(session.meetupLink);
                  const mapUrl = safeHttpUrl(session.mapLink);

                  return (
                    <article key={session.dayNumber} className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono tracking-[0.04em] text-zinc-500 dark:text-zinc-400 block">
                            Day {session.dayNumber} · {formatDateWib(sessionDate)}
                          </span>
                          <h3 className="text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                            {session.eventTitle || session.title || "Live Cohort Session"}
                          </h3>
                        </div>

                        {session.onsiteSchedule && (
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                            {session.onsiteSchedule}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>
                            {session.onsiteVenue ||
                              (program.locationType === "ONLINE"
                                ? "Zoom Room"
                                : program.city
                                  ? `Studio ${program.city}`
                                  : "Online Room")}
                          </span>
                        </p>
                        {session.eventHost && (
                          <p className="text-zinc-500 dark:text-zinc-400">Host: {session.eventHost}</p>
                        )}
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-3">
                        {enrolled && meetUrl ? (
                          <a
                            href={meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-zinc-950 dark:text-white underline inline-flex items-center gap-1"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Session</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Meeting link unlocks after enrollment</span>
                          </span>
                        )}

                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:underline inline-flex items-center gap-1"
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
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Continuous asynchronous coaching, daily check-ins, and direct feedback throughout the {totalDays} days.
              </p>
            )}
          </ProgramAccordion>

          {/* 5. NUTRITION PROTOCOL */}
          <ProgramAccordion
            title="Meal Guide"
            count={program.days.length}
            open={openSections.meals}
            onToggle={() => toggleSection("meals")}
          >
            <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10 max-h-96 overflow-y-auto pr-1">
              {program.days.map((day) => {
                const dayDate = new Date(baseTime + (day.dayNumber - 1) * 86400000);
                const mealLines = splitLines(day.mealRecommendation);

                return (
                  <div key={day.dayNumber} className="py-3.5 space-y-1.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        Day {day.dayNumber} · {formatDateWib(dayDate)}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {dayLabel(day.dayType)}
                      </span>
                    </div>

                    {mealLines.length > 1 ? (
                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {mealLines.map((line, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1 h-1 rounded-full bg-zinc-400 mt-2 shrink-0" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {day.mealRecommendation && day.mealRecommendation.trim()
                          ? day.mealRecommendation
                          : "Whole-food nutritional fuel, high-protein breakfast, and circadian hydration (3L daily)."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ProgramAccordion>

          {/* 6. REQUIRED GEAR & EQUIPMENT */}
          <ProgramAccordion
            title="Required Gear"
            count={equipmentList.length}
            open={openSections.equipment}
            onToggle={() => toggleSection("equipment")}
          >
            <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-b border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm">
              {equipmentList.map((item, idx) => (
                <li key={idx} className="py-3 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200">
                  <Check className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ProgramAccordion>

          {/* 7. METHODOLOGY & OUTCOMES */}
          <ProgramAccordion
            title="Methodology & Blueprint"
            open={openSections.blueprint}
            onToggle={() => toggleSection("blueprint")}
          >
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Target State
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {program.targetState || "Establish deep somatic stability, circadian alignment, and elevated metabolic stamina."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Methodology
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {program.methodology || "Micro-dosed resistance stimulus coupled with restorative parasympathetic protocols."}
                  </p>
                </div>
              </div>

              {program.expectedBenefits && program.expectedBenefits.length > 0 && (
                <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Expected Outcomes
                  </span>
                  <ul className="space-y-2">
                    {program.expectedBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                        <Check className="w-3.5 h-3.5 text-zinc-950 dark:text-white shrink-0 mt-1" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {program.programGuidelines && program.programGuidelines.length > 0 && (
                <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Plan Guidelines
                  </span>
                  <ol className="space-y-1.5 text-zinc-600 dark:text-zinc-300">
                    {program.programGuidelines.map((guide, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-[11px] text-zinc-400 mt-0.5">{idx + 1}.</span>
                        <span>{guide}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {program.scientificReferences && program.scientificReferences.length > 0 && (
                <div className="pt-3 border-t border-zinc-200/80 dark:border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                    Scientific References
                  </span>
                  <ul className="divide-y divide-zinc-200/60 dark:divide-white/10">
                    {program.scientificReferences.map((ref, idx) => {
                      const url = safeHttpUrl(ref.url);
                      return (
                        <li key={idx} className="py-2 text-zinc-600 dark:text-zinc-300 flex items-center justify-between gap-2">
                          <span className="truncate">{ref.title}</span>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-zinc-950 dark:text-white shrink-0 inline-flex items-center gap-1 underline"
                            >
                              <span>Read</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </ProgramAccordion>

          {/* 8. TERMS & COMMUNITY */}
          <ProgramAccordion
            title="Rules & Terms"
            open={openSections.terms}
            onToggle={() => toggleSection("terms")}
          >
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="pb-3 border-b border-zinc-200/80 dark:border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-zinc-950 dark:text-white block">
                      Cohort Community
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate">
                      {enrolled && community ? "Direct access to coach chat" : "Unlocked upon enrollment"}
                    </span>
                  </div>
                </div>
                {enrolled && community ? (
                  <a
                    href={community}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-zinc-950 dark:text-white underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Join</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-zinc-400 inline-flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>Members</span>
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {program.termsChapters && program.termsChapters.length > 0 ? (
                  <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
                    {program.termsChapters.map((ch, idx) => (
                      <div key={idx} className="py-3 space-y-1.5">
                        <p className="font-medium text-zinc-950 dark:text-white">{ch.chapter}</p>
                        <ul className="space-y-1 pl-4 list-disc">
                          {ch.clauses.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : program.termsList && program.termsList.length > 0 ? (
                  <ul className="space-y-1.5 pl-4 list-disc">
                    {program.termsList.map((term, idx) => (
                      <li key={idx}>{term}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-1.5 pl-4 list-disc text-zinc-500 dark:text-zinc-400">
                    <li>Daily task logs reset automatically at 00:00 WIB (UTC+7).</li>
                    <li>Consult a physician prior to commencing high-intensity physical routines.</li>
                    <li>Cohort registrations are non-transferable once the start date commences.</li>
                  </ul>
                )}
              </div>
            </div>
          </ProgramAccordion>
        </div>
      </div>

      {/* FLOATING STICKY BOTTOM DOCK */}
      <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-[61] px-4 pointer-events-none">
        <div className="max-w-xl mx-auto rounded-2xl border border-zinc-200/80 dark:border-white/15 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-2xl shadow-xl p-3.5 sm:px-5 flex items-center justify-between gap-3 pointer-events-auto">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
              {enrolled ? "Active Member" : badge} · {seatsLeft} slots left
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-base sm:text-lg font-geometric font-medium text-zinc-950 dark:text-white">
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

  return typeof document !== "undefined" ? createPortal(view, document.body) : null;
}
