"use client";

import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Dumbbell,
  ExternalLink,
  FileText,
  Layers,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
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
  eventTitle?: string | null;
  videoUrl: string | null;
  mealRecommendation: string | null;
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
  if (value === "HIGH_INTENSITY") return "High Intensity";
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
        className="px-6 py-2.5 rounded-full bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider"
      >
        Join Waitlist
      </a>
    );
  } else {
    action = <span className="text-xs font-mono uppercase tracking-wider text-white/70">Registration Closed</span>;
  }

  return (
    <div className="fixed inset-0 z-[60] bg-[#f6f6f4] dark:bg-[#0e0e0e] overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-28">
        {/* ================================================================= */}
        {/* 1. GENERAL INFORMATION (HERO BANNER & OVERVIEW)                   */}
        {/* ================================================================= */}
        <div className="relative aspect-[16/10] sm:aspect-[21/9] bg-zinc-900 overflow-hidden">
          {program.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt={program.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 h-9 px-3.5 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 text-white space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-white text-zinc-950">
                {enrolled ? "Enrolled Member" : badge}
              </span>
              {program.category && (
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                  {program.category}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                {difficultyLabel(program.difficultyLevel)}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                {totalDays} Days
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug">
              {program.title}
            </h1>
            <p className="text-xs text-white/80">
              Led by <strong className="text-white">{program.coachName}</strong>
              {program.coachTitle ? ` · ${program.coachTitle}` : ""}
            </p>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4">
          {/* SECTION 1 CARD: GENERAL INFORMATION & SYNOPSIS */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>01 · General Information</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {program.description}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-white/10 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Difficulty Level</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {difficultyLabel(program.difficultyLevel)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Cohort Status</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {enrolled ? "Active Access" : badge}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Curriculum Structure</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {trainingDaysCount} Train · {restDaysCount} Rest · {connectDaysCount} Connect
                </span>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* 2. SCIENTIFIC BASIS & BLUEPRINT                                   */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>02 · Scientific Basis & Program Blueprint</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {program.targetState && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Target State & Outcome
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {program.targetState}
                  </p>
                </div>
              )}

              {program.methodology && (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                    Core Methodology
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {program.methodology}
                  </p>
                </div>
              )}
            </div>

            {program.expectedBenefits && program.expectedBenefits.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Expected Physiological & Mental Benefits
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {program.expectedBenefits.map((benefit, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/5 flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {program.programGuidelines && program.programGuidelines.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Program Daily Guidelines
                </span>
                <ul className="space-y-1.5">
                  {program.programGuidelines.map((guide, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="font-mono text-[10px] text-zinc-400 mt-0.5">{idx + 1}.</span>
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {program.scientificReferences && program.scientificReferences.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                  Clinical & Scientific References
                </span>
                <ul className="space-y-1.5">
                  {program.scientificReferences.map((ref, idx) => {
                    const url = safeHttpUrl(ref.url);
                    return (
                      <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-white/5">
                        <span className="truncate">{ref.title}</span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-mono text-zinc-900 dark:text-white shrink-0 inline-flex items-center gap-1 underline"
                          >
                            Source <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          {/* ================================================================= */}
          {/* 3. CLASSIFICATION & MASTER DIRECTORY                              */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>03 · Classification & Directory</span>
            </div>

            <dl className="divide-y divide-zinc-100 dark:divide-white/10 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Category</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.category || "Longevity & Movement"}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Lead Coach</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.coachName}
                  {program.coachTitle ? <span className="text-zinc-400 font-normal"> · {program.coachTitle}</span> : null}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Target Audience</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.audience || program.recommendedFor || "All Levels"}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Required Equipment</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.equipment || "No Equipment / Movement Mat"}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Daily Commitment</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.dailyCommitment || "20 – 30 Mins / Day"}
                </dd>
              </div>
            </dl>
          </section>

          {/* ================================================================= */}
          {/* 4. COHORT SCHEDULE, TIMELINE & DAILY CURRICULUM                   */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>04 · Schedule, Duration & Daily Curriculum</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Program Duration</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {totalDays} Consecutive Days
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Registration Deadline</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {formatDateWib(program.registrationDeadline)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Cohort Starts</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {formatDateWib(program.startDate)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Cohort Ends</span>
                <span className="font-semibold text-zinc-900 dark:text-white mt-0.5 block">
                  {formatDateWib(program.endDate)}
                </span>
              </div>
            </div>

            {program.days.length > 0 && (
              <details className="group rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] overflow-hidden">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3.5 py-3 text-xs font-semibold text-zinc-900 dark:text-white select-none">
                  <span className="inline-flex items-center gap-2">
                    <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                    <span>View Complete {program.days.length}-Day Curriculum</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-200/60 dark:border-white/10 max-h-80 overflow-y-auto">
                  <ol className="divide-y divide-zinc-200/50 dark:divide-white/5 text-xs">
                    {program.days.map((day) => (
                      <li key={day.dayNumber} className="py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-zinc-400 w-8 shrink-0">
                            D{String(day.dayNumber).padStart(2, "0")}
                          </span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {day.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-200/60 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 shrink-0">
                          {dayLabel(day.dayType)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            )}
          </section>

          {/* ================================================================= */}
          {/* 5. ATTENDANCE MODE & LOCATION                                     */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <MapPin className="w-3.5 h-3.5" />
              <span>05 · Attendance Mode & Location</span>
            </div>

            <dl className="divide-y divide-zinc-100 dark:divide-white/10 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Attendance Format</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {formatLabel(program.locationType)}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">City / Region</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                  {program.city || (program.locationType === "ONLINE" ? "Anywhere (Digital Access)" : "Jakarta")}
                </dd>
              </div>
              {program.locationType !== "ONLINE" && (
                <div className="py-2.5 flex items-start justify-between gap-4">
                  <dt className="text-zinc-500 shrink-0">Venue Address</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {program.venueAddress || "Studio address shared with enrolled members"}
                  </dd>
                </div>
              )}
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-500">Virtual Livestream Fallback</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white text-right inline-flex items-center gap-1">
                  <Video className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{program.virtualFallbackAvailable !== false ? "Available via Zoom/Meet" : "In-Person Only"}</span>
                </dd>
              </div>
            </dl>
          </section>

          {/* ================================================================= */}
          {/* 6. PRICING & PARTICIPANT QUOTA                                    */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <Tag className="w-3.5 h-3.5" />
              <span>06 · Pricing & Participant Quota</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Program Tuition</span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-base font-bold text-zinc-950 dark:text-white">
                    {program.price > 0 ? formatIdr(program.price) : "Free"}
                  </span>
                  {discountPct > 0 && (
                    <span className="text-xs text-zinc-400 line-through">
                      {formatIdr(actualPrice)}
                    </span>
                  )}
                </div>
                {discountPct > 0 && (
                  <span className="inline-block text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    Save {discountPct}% Discount
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-zinc-400">Cohort Capacity</span>
                  <span className="text-[10px] font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                    {seatsLeft} / {program.maxQuota} left
                  </span>
                </div>
                <span className="text-base font-bold text-zinc-950 dark:text-white block">
                  Max {program.maxQuota} Members
                </span>
                <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-950 dark:bg-white"
                    style={{
                      width: `${Math.min(100, Math.round(((program.enrolledCount || 0) / Math.max(1, program.maxQuota)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ================================================================= */}
          {/* 7. COMMUNITY CHANNEL & TERMS & CONDITIONS                         */}
          {/* ================================================================= */}
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>07 · Community & Terms & Conditions</span>
            </div>

            {/* Community Access Box */}
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
                      ? "Direct access to your cohort group channel"
                      : "Exclusive group channel unlocked upon active enrollment"}
                  </span>
                </div>
              </div>
              {enrolled && community ? (
                <a
                  href={community}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                >
                  <span>Join Group</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-200/70 dark:bg-white/10 text-zinc-500 inline-flex items-center gap-1 shrink-0">
                  <Lock className="w-3 h-3" /> Members Only
                </span>
              )}
            </div>

            {/* Terms & Conditions */}
            <details className="group rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-3.5 py-3 text-xs font-semibold text-zinc-900 dark:text-white select-none">
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Program Terms, Waiver & Participation Rules</span>
                </span>
                <ChevronDown className="w-4 h-4 text-zinc-400 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-200/60 dark:border-white/10 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                {program.termsChapters && program.termsChapters.length > 0 ? (
                  program.termsChapters.map((ch, idx) => (
                    <div key={idx} className="space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-white">{ch.chapter}</p>
                      <ul className="space-y-1 pl-3 list-disc">
                        {ch.clauses.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : program.termsList && program.termsList.length > 0 ? (
                  <ul className="space-y-1.5 pl-4 list-disc">
                    {program.termsList.map((term, idx) => (
                      <li key={idx}>{term}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-1.5 pl-4 list-disc">
                    <li>Daily check-ins reset automatically at 00:00 WIB (UTC+7).</li>
                    <li>Participants must consult a physician prior to beginning high-intensity physical protocols.</li>
                    <li>Cohort tuition is non-transferable once the cohort start date has commenced.</li>
                  </ul>
                )}
              </div>
            </details>
          </section>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 inset-x-0 z-[61] border-t border-white/10 bg-zinc-950 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/60">
              {enrolled ? "Active Cohort Member" : badge}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold">
                {program.price > 0 ? formatIdr(program.price) : "Free"}
              </p>
              {discountPct > 0 && !enrolled && (
                <span className="text-xs text-white/40 line-through">{formatIdr(actualPrice)}</span>
              )}
            </div>
          </div>
          {action}
        </div>
      </div>
    </div>
  );
}
