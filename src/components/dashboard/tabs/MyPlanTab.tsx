"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Dumbbell,
  ExternalLink,
  Heart,
  Info,
  MapPin,
  Moon,
  Shield,
  Smile,
  Sparkles,
  Target,
  Users,
  Utensils,
  Video,
  X,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { DailyCheckIn } from "./DailyCheckIn";
import { EmptyState, FloatingHeader, InfoPopupModal, safeHttpUrl } from "./shared";

export interface PlanDay {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  unlockDate: string;
  isCalendarUnlocked: boolean;
  isPast2359: boolean;
  videoUrl: string | null;
  videoChecklist: string[];
  workoutOptions?: string[];
  mealRecommendation: string | null;
  meetupLink: string | null;
  mapLink?: string | null;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  eventTitle?: string | null;
  eventDetails?: string | null;
  restInstructions: string | null;
  sleepRecommendation?: string | null;
  dailyAssessment?: string | null;
  eventHost?: string | null;
  coachName?: string | null;
  userProgress?: {
    videoWatched: boolean;
    isCompleted: boolean;
    checklistCompleted: string | null;
    selectedWorkout?: string | null;
    eventFeedback?: string | null;
    mealCompliance?: string | null;
    mealNotes?: string | null;
    dailyReflection?: string | null;
    happinessRate?: number | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    assessmentResponse?: string | null;
    photoBeforeUrl?: string | null;
    photoAfterUrl?: string | null;
    workoutNotes?: string | null;
  } | null;
}

export interface PlanOption {
  programId: string;
  title: string;
}

export type PlanTaskId = "sleep" | "activity" | "meal" | "reflection";

export function MyPlanHeader({
  visible,
  overlay = false,
  mode = "detail",
  plans,
  selectedProgramId,
  onSelect: _onSelect,
  onBackToIndex,
  onExplore,
}: {
  visible: boolean;
  overlay?: boolean;
  mode?: "index" | "detail";
  plans: PlanOption[];
  selectedProgramId: string;
  onSelect: (programId: string) => void;
  onBackToIndex?: () => void;
  onExplore: () => void;
}) {
  void _onSelect;
  const { theme, toggleTheme } = useTheme();
  const current = plans.find((p) => p.programId === selectedProgramId) || plans[0] || null;

  return (
    <FloatingHeader visible={visible} transparent={overlay}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle visual theme"
        title={theme === "dark" ? "Switch to Pearl Light theme" : "Switch to Obsidian Dark theme"}
        className={`select-none flex items-center gap-1 active:scale-95 transition hover:opacity-75 focus:outline-none ${
          overlay ? "text-white drop-shadow-xs" : "text-zinc-950 dark:text-white"
        }`}
      >
        <span className="font-light text-lg leading-none">+</span>
        <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
      </button>

      <div className="relative min-w-0">
        {mode === "index" ? (
          plans.length > 0 ? (
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {plans.length} Active {plans.length === 1 ? "Plan" : "Plans"}
            </span>
          ) : (
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 active:scale-95 transition bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Plan</span>
            </button>
          )
        ) : !current ? (
          <button
            type="button"
            onClick={onExplore}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 active:scale-95 transition ${
              overlay
                ? "bg-white text-zinc-950 shadow-sm"
                : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Plan</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onBackToIndex?.()}
            title="Back to My Plan list"
            className={`max-w-[210px] sm:max-w-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition active:scale-95 ${
              overlay
                ? "bg-black/40 hover:bg-black/55 backdrop-blur-md border border-white/25 text-white shadow-xs"
                : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-white"
            }`}
          >
            <ArrowLeft
              className={`w-3.5 h-3.5 shrink-0 ${overlay ? "text-white/80" : "text-zinc-500"}`}
            />
            <span className="truncate font-semibold uppercase tracking-wide">{current.title}</span>
          </button>
        )}
      </div>
    </FloatingHeader>
  );
}

export interface MyPlanIndexItem {
  programId: string;
  title: string;
  coachName: string;
  coverImage?: string | null;
  dayCount: number;
  startDate: Date | string;
  endDate: Date | string;
  locationType?: string;
  city?: string | null;
  isUpcoming: boolean;
  completedDays: number;
  totalDays: number;
  currentDayNumber: number;
}

export function MyPlanIndex({
  userName,
  plans,
  completedCount,
  onSelectPlan,
  onExplore,
  onViewHistory,
}: {
  userName: string;
  plans: MyPlanIndexItem[];
  completedCount: number;
  onSelectPlan: (programId: string) => void;
  onExplore: () => void;
  onViewHistory: () => void;
}) {
  const firstName = (userName || "Member").trim().split(/\s+/)[0] || "Member";
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const safeSlide = Math.min(activeSlide, Math.max(0, plans.length - 1));

  const scrollToSlide = (idx: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(plans.length - 1, idx));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setActiveSlide(clamped);
  };

  const handleTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth <= 0) return;
    const nextIdx = Math.round(el.scrollLeft / el.clientWidth);
    if (nextIdx !== activeSlide && nextIdx >= 0 && nextIdx < plans.length) {
      setActiveSlide(nextIdx);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto pt-1">
      {/* Compact Greeting Header */}
      <section className="space-y-1.5 px-0.5">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 block">
          My Plan
        </span>
        <h1 className="text-lg sm:text-xl font-geometric font-medium tracking-tight text-zinc-950 dark:text-white leading-snug">
          Hello, {firstName}
        </h1>
        <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {plans.length > 0
            ? `You have ${plans.length} active ${plans.length === 1 ? "plan" : "plans"} in progress. Select a plan below to continue.`
            : "You have no active plans right now. Explore available programs to start a cohort."}
        </p>
      </section>

      {/* Active Enrolled Plans — Horizontal 1-Plan-Per-Page */}
      {plans.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 px-0.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
              Active Cohorts
            </span>

            {plans.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono tabular-nums text-zinc-400 mr-1">
                  {String(safeSlide + 1).padStart(2, "0")} / {String(plans.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => scrollToSlide(safeSlide - 1)}
                  disabled={safeSlide === 0}
                  aria-label="Previous plan"
                  className="w-7 h-7 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] flex items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:opacity-35 transition hover:border-zinc-400 dark:hover:border-white/30 active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSlide(safeSlide + 1)}
                  disabled={safeSlide >= plans.length - 1}
                  aria-label="Next plan"
                  className="w-7 h-7 rounded-full border border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] flex items-center justify-center text-zinc-700 dark:text-zinc-200 disabled:opacity-35 transition hover:border-zinc-400 dark:hover:border-white/30 active:scale-95"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                01 / 01
              </span>
            )}
          </div>

          <div
            ref={trackRef}
            onScroll={handleTrackScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar -mx-0.5 px-0.5"
            style={{ scrollbarWidth: "none" }}
          >
            {plans.map((p) => {
              const total = p.totalDays || p.dayCount || 0;
              const pct = total > 0 ? Math.min(100, Math.round((p.completedDays / total) * 100)) : 0;
              const locationLabel =
                p.locationType === "ONLINE"
                  ? "Online"
                  : p.locationType === "ONSITE"
                    ? p.city || "On-Site"
                    : p.city
                      ? `Hybrid • ${p.city}`
                      : p.locationType || "Online Studio";
              const startsIn = p.isUpcoming ? formatStartsIn(p.startDate) : null;

              return (
                <div key={p.programId} className="w-full shrink-0 snap-center px-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectPlan(p.programId)}
                    className="group w-full text-left rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden hover:border-zinc-300 dark:hover:border-white/25 transition active:scale-[0.995] flex flex-col"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                      {p.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverImage}
                          alt={p.title}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-mono tracking-[0.25em] text-zinc-400">
                          + BMS
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between gap-2 text-[9px] font-mono uppercase tracking-[0.15em] text-white/95">
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                          {startsIn
                            ? startsIn.headline
                            : p.currentDayNumber > 0
                              ? `Day ${p.currentDayNumber} of ${total || p.currentDayNumber}`
                              : `${total} Days`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20">
                          {locationLabel}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h2 className="text-sm font-geometric font-medium text-zinc-950 dark:text-white leading-snug line-clamp-1">
                          {p.title}
                        </h2>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Coach {p.coachName || "BMS Faculty"}
                        </p>
                      </div>

                      {!p.isUpcoming && total > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                            <span>Progress</span>
                            <span className="tabular-nums">{p.completedDays} / {total} days</span>
                          </div>
                          <div className="h-1 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2.5 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-[11px] font-geometric font-medium text-zinc-800 dark:text-zinc-200">
                        <span>Open Plan</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {plans.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {plans.map((p, idx) => (
                <button
                  key={p.programId}
                  type="button"
                  onClick={() => scrollToSlide(idx)}
                  aria-label={`Show plan ${idx + 1}`}
                  className={`h-1 rounded-full transition-all ${
                    idx === safeSlide
                      ? "w-5 bg-zinc-950 dark:bg-white"
                      : "w-1.5 bg-zinc-300 dark:bg-white/20 hover:bg-zinc-400"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <EmptyState
          title="No active plans"
          description="Explore available programs to start a cohort or review your completed journeys in History."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onExplore}
                className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-medium uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" /> Explore Plan
              </button>
              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={onViewHistory}
                  className="px-4 py-2 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-[11px] font-medium uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
                >
                  View History
                </button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

export interface PlanProgramInfo {
  title: string;
  coachName: string;
  coachTitle?: string | null;
  category?: string | null;
  difficultyLevel?: string | null;
  description?: string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  equipment?: string | null;
  durationDays?: number;
  coverImage: string | null;
  startDate: string | Date;
  endDate: string | Date;
  communityLink: string | null;
  scientificReferences?: Array<{ title: string; url?: string }> | null;
  totalDays: number;
  isUpcoming?: boolean;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  programGuidelines?: string[];
  recommendedFor?: string | null;
  audience?: string | null;
  dailyCommitment?: string | null;
}

function formatIntensityBadge(level?: string | null): string {
  const v = (level || "").trim().toUpperCase();
  if (v.includes("VERY") && v.includes("HIGH")) return "Very High Intensity";
  if (v === "ADVANCED" || v === "HIGH") return "High Intensity";
  if (v === "INTERMEDIATE" || v === "MODERATE") return "Moderate Intensity";
  if (v === "BEGINNER" || v === "LOW") return "Low Intensity";
  if (v) return `${level} Intensity`;
  return "Moderate Intensity";
}

function formatStartsIn(startDate: string | Date): { headline: string; dateLabel: string } {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dateLabel = start.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (diffDays <= 0) {
    return { headline: "Starts Today", dateLabel };
  } else if (diffDays === 1) {
    return { headline: "Starts Tomorrow", dateLabel };
  } else {
    return { headline: `Starts in ${diffDays} Days`, dateLabel };
  }
}

const fieldCls =
  "w-full px-3.5 py-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-500";

function splitActivities(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\n|•|·/)
    .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
    .filter((line) => line.length > 1 && line.length < 160);
}

function movementNames(day: PlanDay): string[] {
  const hasAdminList = (day.workoutOptions && day.workoutOptions.length > 0) || day.videoChecklist.length > 0;
  if (!hasAdminList) return [];
  const groups = parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
  const selected = day.userProgress?.selectedWorkout || groups[0]?.optionName;
  const group = groups.find((g) => g.optionName === selected) || groups[0];
  const names = (group?.movements || []).map((m) => m.name.trim()).filter(Boolean);
  if (names.length > 0) return names;
  return (day.videoChecklist || []).map((item) => item.split("=")[0].trim()).filter(Boolean);
}


function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 rounded-full bg-zinc-100 dark:bg-white/10 overflow-hidden">
      <div className="h-full rounded-full bg-zinc-950 dark:bg-white transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function checkedList(day: PlanDay, override: string[] | undefined): string[] {
  if (override) return override;
  if (!day.userProgress?.checklistCompleted) return [];
  try {
    const parsed = JSON.parse(day.userProgress.checklistCompleted);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export interface PlanStats {
  completed: number;
  skipped: number;
  remaining: number;
  segments: ("done" | "today" | "skipped" | "upcoming")[];
}

export function MyPlanOverview({
  program,
  plan,
  day,
  checklist,
  historyDays,
  allProgramDays,
  onExplore,
  onViewHistory,
  onOpenDetails,
  onToggleCheck,
  onSyncChecklist,
  onSelectWorkout,
  onOpenVideo,
  onSaveSleep,
  onSaveMeal,
  onSaveReflection,
  onSaveAttendance,
  onSaveWorkoutNotes,
  onUploadPhoto,
  onCompleteDay,
}: {
  program: PlanProgramInfo | null;
  plan: ProgramDailyPlan | null;
  day: PlanDay | null;
  stats: PlanStats;
  checklist: string[] | undefined;
  onExplore: () => void;
  onViewHistory?: () => void;
  onOpenDetails: () => void;
  historyDays: PlanDay[];
  allProgramDays?: PlanDay[];
  onToggleCheck: (task: string, dayId: string, isRepUpdate?: boolean) => Promise<void> | void;
  onSyncChecklist?: (tasks: string[], dayId: string) => Promise<boolean>;
  onSelectWorkout: (workout: string, dayId: string, resetChecklist?: boolean) => Promise<void | boolean>;
  onOpenVideo: (dayId: string) => Promise<void | boolean>;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string, sleepFeeling?: string) => Promise<void | boolean>;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => Promise<void | boolean>;
  onSaveReflection: (reflection: string, happiness: number, dayId: string) => Promise<void | boolean>;
  onSaveAttendance: (notes: string, dayId: string) => Promise<void | boolean>;
  onSaveWorkoutNotes: (notes: string, dayId: string) => Promise<void | boolean>;
  onUploadPhoto: (type: "before" | "after", url: string, dayId: string) => Promise<void | boolean>;
  onCompleteDay: (dayId: string) => Promise<void | boolean>;
}) {
  const progress = day?.userProgress;
  const checks = day ? checkedList(day, checklist) : [];
  const activities =
    day?.dayType === "REST_DAY"
      ? splitActivities(day.restInstructions)
      : day?.dayType === "TRAINING_DAY"
        ? movementNames(day)
        : [];
  const sleepDone =
    !!progress?.bedtime &&
    !!progress?.wakeTime &&
    progress.bedtime !== "SKIPPED" &&
    progress.wakeTime !== "SKIPPED";
  const activityDone =
    day?.dayType === "TRAINING_DAY"
      ? !!progress?.isCompleted ||
        (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED") ||
        (activities.length > 0 && activities.every((name) => checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : day?.dayType === "REST_DAY"
        ? activities.length > 0
          ? activities.every((name) => checks.includes(name)) || (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED")
          : !!progress?.isCompleted || (!!progress?.workoutNotes && progress.workoutNotes !== "SKIPPED")
        : !!progress?.isCompleted || (!!progress?.eventFeedback && progress.eventFeedback !== "SKIPPED");
  const initialDone: [boolean, boolean, boolean, boolean] = [
    sleepDone,
    activityDone,
    !!progress?.mealCompliance && progress.mealCompliance !== "SKIPPED",
    !!progress?.dailyReflection && progress.dailyReflection !== "SKIPPED",
  ];
  const pendingTasksCount = day ? initialDone.filter((done) => !done).length : 0;

  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  const locked = !day || !day.isCalendarUnlocked || day.isPast2359;
  const community = safeHttpUrl(program?.communityLink);
  const fullProgramDays = allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays;

  const [widgetIndex, setWidgetIndex] = useState<0 | 1 | 2>(1);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleWidgetTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleWidgetTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    // Only switch tabs on clear, deliberate horizontal swipes (not vertical scrolling)
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      if (deltaX < -80) {
        setWidgetIndex((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else if (deltaX > 80) {
        setWidgetIndex((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }
  };

  const showSubtabs = !!program && !program.isUpcoming;

  return (
    <div>
      <section className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden bg-zinc-900">
        <div
          className={`relative w-full flex flex-col justify-between ${
            showSubtabs
              ? "min-h-[380px] sm:min-h-[430px]"
              : "min-h-[310px] sm:min-h-[350px]"
          }`}
        >
          {program?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-zinc-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/80" />

          <div
            style={{ paddingTop: "calc(5.25rem + env(safe-area-inset-top))" }}
            className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8"
          >
            {program && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold tracking-wider text-white inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-300" />
                  <span>{program.dailyCommitment || "15–20 Mins / Day"}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold uppercase tracking-wider text-white">
                  {formatIntensityBadge(program.difficultyLevel)}
                </span>
              </div>
            )}
          </div>

          <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 pb-12 pt-14 space-y-5 text-white">
            <div>
              <h2 className="text-xl sm:text-2xl font-medium tracking-tight leading-tight truncate">
                {program?.title || "No active program"}
              </h2>
              {program && (
                <p className="mt-1 text-xs text-white/80 truncate">{program.coachName || "—"}</p>
              )}
            </div>

            {showSubtabs && (
              <div
                role="tablist"
                aria-label="Plan sections"
                className="rounded-xl p-1 bg-black/45 backdrop-blur-md border border-white/15 grid grid-cols-3 gap-1"
              >
                {(
                  [
                    { index: 0, label: "Guides", count: 0 },
                    { index: 1, label: "Tasks", count: pendingTasksCount },
                    { index: 2, label: "Metrics", count: 0 },
                  ] as const
                ).map(({ index, label, count }) => {
                  const active = widgetIndex === index;
                  return (
                    <button
                      key={label}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setWidgetIndex(index)}
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                        active
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{label}</span>
                      {count > 0 && (
                        <span
                          className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                            active
                              ? "bg-zinc-950/15 text-zinc-950 font-bold"
                              : "bg-white/20 text-white font-semibold"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="relative left-1/2 -translate-x-1/2 w-screen -mt-6 z-20 rounded-t-[32px] bg-[#f6f6f4] dark:bg-[#0e0e0e] pt-7 pb-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-5">
          {!program ? (
            <EmptyState
              title="No active program"
              description="You do not have an active cohort right now. Explore available plans or view your completed programs in History."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onExplore}
                    className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2"
                  >
                    <Compass className="w-3.5 h-3.5" /> Explore Plan
                  </button>
                  {onViewHistory && (
                    <button
                      type="button"
                      onClick={onViewHistory}
                      className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-white/15 bg-white dark:bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200"
                    >
                      View History
                    </button>
                  )}
                </div>
              }
            />
          ) : program.isUpcoming ? (
            (() => {
              const startsInInfo = formatStartsIn(program.startDate);
              return (
                <>
                  <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 shadow-xs">
                    <div className="space-y-1">
                      <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                        {startsInInfo.headline}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Program begins on <span className="font-medium text-zinc-800 dark:text-zinc-200">{startsInInfo.dateLabel}</span>
                      </p>
                    </div>
                  </section>

                  <ProgramPreparationWidgets
                    program={program}
                    days={allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays}
                    currentDayId={day?.id}
                  />

                  <ProgramCommunityWidget
                    programTitle={program?.title}
                    communityLink={program?.communityLink}
                  />

                  <ProgramReportEntryWidget
                    programTitle={program?.title}
                    communityLink={program?.communityLink}
                  />

                  <ProgramReferencesWidget references={program.scientificReferences} />
                </>
              );
            })()
          ) : (
            <>
              <div
                onTouchStart={handleWidgetTouchStart}
                onTouchEnd={handleWidgetTouchEnd}
                className="transition-all duration-200"
              >
                <div className={widgetIndex === 0 ? "block" : "hidden"}>
                  <ProgramPreparationWidgets
                    program={program}
                    days={fullProgramDays}
                    currentDayId={day?.id}
                    onSwitchWidget={setWidgetIndex}
                  />
                </div>

                <div className={widgetIndex === 1 ? "block" : "hidden"}>
                  {day ? (
                    <DailyCheckIn
                      key={day.id}
                      day={day}
                      pastDays={historyDays}
                      allProgramDays={allProgramDays}
                      communityLink={program.communityLink}
                      programTitle={program.title}
                      locked={locked}
                      activities={activities}
                      checks={checks}
                      initialDone={initialDone}
                      onToggleCheck={onToggleCheck}
                      onSyncChecklist={onSyncChecklist}
                      onSelectWorkout={onSelectWorkout}
                      onOpenVideo={onOpenVideo}
                      onSaveSleep={onSaveSleep}
                      onSaveAttendance={onSaveAttendance}
                      onSaveWorkoutNotes={onSaveWorkoutNotes}
                      onUploadPhoto={onUploadPhoto}
                      onSaveMeal={onSaveMeal}
                      onSaveReflection={onSaveReflection}
                      onCompleteDay={onCompleteDay}
                      widgetIndex={widgetIndex}
                      onSwitchWidget={setWidgetIndex}
                    />
                  ) : (
                    <EmptyState title="No tasks today" description="There is no open session for today." />
                  )}
                </div>

                <div className={widgetIndex === 2 ? "block" : "hidden"}>
                  <CohortPerformanceCard
                    days={fullProgramDays}
                    currentDayNumber={currentDayNumber}
                    onSwitchWidget={setWidgetIndex}
                  />
                </div>
              </div>

              <ProgramCommunityWidget
                programTitle={program?.title}
                communityLink={program?.communityLink}
              />

              <ProgramReportEntryWidget
                programTitle={program?.title}
                communityLink={program?.communityLink}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function calcSleepMins(bed?: string | null, wake?: string | null): number {
  if (!bed || !wake) return 0;
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

function formatSleepHours(mins: number): string {
  if (!mins || mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function TwentyBarMeter({ percent }: { percent: number }) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const filledBars = Math.round((safePercent / 100) * 50);
  return (
    <div
      className="flex items-center justify-between py-0.5"
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${safePercent}%`}
    >
      {Array.from({ length: 50 }, (_, i) => i + 1).map((bar) => (
        <div
          key={bar}
          className={`w-[1.5px] h-4 sm:h-5 rounded-full transition-all ${
            bar <= filledBars
              ? "bg-zinc-950 dark:bg-white"
              : "bg-zinc-200 dark:bg-white/15"
          }`}
        />
      ))}
    </div>
  );
}

function CohortPerformanceCard({
  days,
  currentDayNumber: _currentDayNumber,
  onSwitchWidget,
}: {
  days: PlanDay[];
  currentDayNumber: number;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _currentDayNumber;
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  // 1. Sleep Average (0–100%, 100% = Optimal >= 7h 30m nightly average)
  const loggedSleeps = sorted
    .map((d) => calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime))
    .filter((mins) => mins > 0);

  const avgSleepMins =
    loggedSleeps.length > 0
      ? Math.round(loggedSleeps.reduce((acc, m) => acc + m, 0) / loggedSleeps.length)
      : 0;

  const sleepPct =
    avgSleepMins === 0
      ? 0
      : Math.min(100, Math.round((avgSleepMins / 450) * 100));

  // 2. Training (starts at 100%, deducts proportionally per skipped/missed training day)
  const trainingDays = sorted.filter((d) => d.dayType === "TRAINING_DAY");
  const trainingTotal = trainingDays.length;
  const trainingMissed = trainingDays.filter((d) => {
    const p = d.userProgress;
    const isCompleted = Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
    const explicitlySkipped = Boolean(
      p && (p.selectedWorkout === "SKIPPED" || p.workoutNotes === "SKIPPED")
    );
    return explicitlySkipped || (d.isPast2359 && !isCompleted);
  }).length;
  const trainingPct =
    trainingTotal > 0
      ? Math.max(0, Math.round(((trainingTotal - trainingMissed) / trainingTotal) * 100))
      : 100;

  // 3. Meal (starts at 100%, deducts proportionally when skipped, off-track, partial, or missed past 23:59)
  const mealTotal = sorted.length;
  const mealPenalty = sorted.reduce((acc, d) => {
    const mc = d.userProgress?.mealCompliance;
    if (mc === "SKIPPED" || mc === "OFF_TRACK") return acc + 1;
    if (mc === "PARTIAL") return acc + 0.5;
    if (mc === "FULL" || mc === "YES" || mc === "SIMILAR") return acc;
    return d.isPast2359 ? acc + 1 : acc;
  }, 0);
  const mealPct =
    mealTotal > 0
      ? Math.max(0, Math.round(((mealTotal - mealPenalty) / mealTotal) * 100))
      : 100;

  // 4. Energy & Mood (starts at 100%, reflects logged mood ratings 1-5 and deducts when skipped/missed)
  const moodTotal = sorted.length;
  const moodPoints = sorted.reduce((acc, d) => {
    const p = d.userProgress;
    const isSkipped =
      p?.dailyReflection === "SKIPPED" ||
      p?.dailyReflection === "Skipped reflection journal today.";
    if (isSkipped) return acc;
    if (typeof p?.happinessRate === "number" && p.happinessRate > 0) {
      return acc + Math.min(5, p.happinessRate) / 5;
    }
    return d.isPast2359 ? acc : acc + 1;
  }, 0);
  const moodPct =
    moodTotal > 0 ? Math.max(0, Math.round((moodPoints / moodTotal) * 100)) : 100;

  // 5. Program Consistency (starts at 100%, deducts proportionally per skipped/missed day)
  const consistencyTotal = sorted.length;
  const consistencyMissed = sorted.filter((d) => {
    const p = d.userProgress;
    const hasSleep = Boolean(
      p?.bedtime && p?.wakeTime && p.bedtime !== "SKIPPED" && p.wakeTime !== "SKIPPED"
    );
    const hasWorkout = Boolean(
      p &&
        (p.isCompleted ||
          p.videoWatched ||
          (p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          (p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          (p.eventFeedback && p.eventFeedback !== "SKIPPED") ||
          checkedList(d, undefined).length > 0)
    );
    const hasMeal = Boolean(p?.mealCompliance && p.mealCompliance !== "SKIPPED");
    const hasReflection = Boolean(
      p?.dailyReflection &&
        p.dailyReflection !== "SKIPPED" &&
        p.dailyReflection !== "Skipped reflection journal today."
    );
    const hasAnyActivity = hasSleep || hasWorkout || hasMeal || hasReflection;
    if (hasAnyActivity) return false;
    const hasExplicitSkip = Boolean(
      p &&
        (p.bedtime === "SKIPPED" ||
          p.wakeTime === "SKIPPED" ||
          p.selectedWorkout === "SKIPPED" ||
          p.workoutNotes === "SKIPPED" ||
          p.eventFeedback === "SKIPPED" ||
          p.mealCompliance === "SKIPPED" ||
          p.dailyReflection === "SKIPPED" ||
          p.dailyReflection === "Skipped reflection journal today.")
    );
    return hasExplicitSkip || d.isPast2359;
  }).length;
  const consistencyPct =
    consistencyTotal > 0
      ? Math.max(0, Math.round(((consistencyTotal - consistencyMissed) / consistencyTotal) * 100))
      : 100;

  const [showMetricsInfo, setShowMetricsInfo] = useState(false);

  return (
    <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Performance Metrics</h2>
          <button
            type="button"
            onClick={() => setShowMetricsInfo(true)}
            aria-label="Metrics calculation info"
            className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <InfoPopupModal
        open={showMetricsInfo}
        title="Performance Metrics"
        subtitle="0–100% telemetry across 20 segments"
        onClose={() => setShowMetricsInfo(false)}
      >
        <p className="font-semibold text-zinc-950 dark:text-white">How Metrics Are Calculated:</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
          <li><strong className="text-zinc-900 dark:text-white">Sleep Average:</strong> Percentage based on nightly sleep duration. Reaches 100% at an optimal average of &ge; 7h 30m.</li>
          <li><strong className="text-zinc-900 dark:text-white">Training:</strong> Starts at 100% and decreases proportionally for each skipped or missed training day.</li>
          <li><strong className="text-zinc-900 dark:text-white">Meal:</strong> Starts at 100% and decreases proportionally when meals are marked partial, off-track, or skipped.</li>
          <li><strong className="text-zinc-900 dark:text-white">Energy &amp; Mood:</strong> Starts at 100% and adjusts proportionally with your daily mood ratings and missed reflections.</li>
          <li><strong className="text-zinc-900 dark:text-white">Program Consistency:</strong> Starts at 100% and decreases proportionally for each skipped or inactive past program day.</li>
        </ul>
      </InfoPopupModal>

      <div className="p-5 space-y-4">
        {/* 1. SLEEP AVERAGE */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sleep Average</span>
              {avgSleepMins > 0 && (
                <span className="text-zinc-400 font-normal">
                  &middot; {formatSleepHours(avgSleepMins)}
                </span>
              )}
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {sleepPct}%
            </span>
          </div>
          <TwentyBarMeter percent={sleepPct} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 2. TRAINING */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
              <span>Training</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {trainingPct}%
            </span>
          </div>
          <TwentyBarMeter percent={trainingPct} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 3. MEAL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-zinc-400" />
              <span>Meal</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {mealPct}%
            </span>
          </div>
          <TwentyBarMeter percent={mealPct} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 4. ENERGY & MOOD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-zinc-400" />
              <span>Energy &amp; Mood</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {moodPct}%
            </span>
          </div>
          <TwentyBarMeter percent={moodPct} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 5. PROGRAM CONSISTENCY */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-zinc-400" />
              <span>Program Consistency</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {consistencyPct}%
            </span>
          </div>
          <TwentyBarMeter percent={consistencyPct} />
        </div>
      </div>
    </section>
  );
}

function formatShortDayDate(unlockDate: string | undefined, dayNumber: number): string {
  if (!unlockDate) return `Day ${dayNumber}`;
  const d = new Date(unlockDate);
  if (isNaN(d.getTime())) return `Day ${dayNumber}`;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(d);
}

function ProgramReferencesWidget({
  references,
}: {
  references?: Array<{ title: string; url?: string }> | null;
}) {
  const validRefs = (references || []).filter((r) => r && r.title && r.title.trim().length > 0);
  if (validRefs.length === 0) return null;

  return (
    <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-950 dark:text-white">
          <BookOpen className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>References</span>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          {validRefs.length} {validRefs.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-white/5">
        {validRefs.map((ref, idx) => {
          const url = safeHttpUrl(ref.url);
          return (
            <li key={idx} className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-start gap-2">
                <span className="text-[10px] font-mono text-zinc-400 mt-0.5 shrink-0">
                  {idx + 1}.
                </span>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug">
                  {ref.title}
                </p>
              </div>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 h-7 px-3 rounded-full border border-zinc-300 dark:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/10 text-[11px] font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1 transition"
                >
                  <span>Open</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ProgramCommunityWidget({
  programTitle,
  communityLink,
}: {
  programTitle?: string;
  communityLink?: string | null;
}) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const communityUrl = safeHttpUrl(communityLink);
  const fallbackConcierge = `https://wa.me/6281290002026?text=${encodeURIComponent(
    `Hello Concierge, I would like to join the community group for: ${programTitle || "Program"}`
  )}`;
  const destinationUrl = communityUrl || fallbackConcierge;

  const handleConfirmProceed = () => {
    setShowDisclaimer(false);
    if (typeof window !== "undefined") {
      window.open(destinationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                Open Community
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {programTitle
                  ? `Private ${programTitle} group chat & peer support`
                  : "Private cohort group chat & peer support"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDisclaimer(true)}
            className="shrink-0 h-9 px-4 rounded-full border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
          >
            {communityUrl ? "Open" : "Join Group"}
          </button>
        </div>
      </section>

      {/* External Community Disclaimer Modal */}
      {showDisclaimer && typeof document !== "undefined" && createPortal(
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-950 dark:text-white flex items-center justify-center mx-auto shadow-2xs">
              <Shield className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Third-Party Community Notice
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                You are about to navigate to an external messaging service (such as WhatsApp or Telegram).
              </p>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/10 text-left text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Please note that interactions, discussions, and activities occurring outside the BMS Wellness platform take place independently and are not the responsibility or liability of BMS Wellness.
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmProceed}
                className="w-full h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold active:scale-[0.98] transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Continue to Community</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowDisclaimer(false)}
                className="w-full h-9 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function ProgramReportEntryWidget({
  programTitle,
  communityLink,
}: {
  programTitle?: string;
  communityLink?: string | null;
}) {
  const [showReportPage, setShowReportPage] = useState(false);

  return (
    <>
      <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-white truncate">
                Program Support &amp; Options
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                Report an issue, coach feedback, or request withdrawal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowReportPage(true)}
            className="shrink-0 h-9 px-4 rounded-full border border-zinc-300 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-white/10 active:scale-95 transition"
          >
            Report
          </button>
        </div>
      </section>

      {showReportPage && (
        <ProgramReportPageView
          programTitle={programTitle}
          communityLink={communityLink}
          onClose={() => setShowReportPage(false)}
        />
      )}
    </>
  );
}

function ProgramReportPageView({
  programTitle,
  communityLink: _communityLink,
  onClose,
}: {
  programTitle?: string;
  communityLink?: string | null;
  onClose: () => void;
}) {
  void _communityLink;
  const [activeTab, setActiveTab] = useState<"issue" | "quit">("issue");
  const [issueType, setIssueType] = useState<string>("Coach / Guidance Concern");
  const [quitReason, setQuitReason] = useState<string>("Schedule / Time Conflict");
  const [note, setNote] = useState("");
  const [submittedDone, setSubmittedDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const issueOptions = [
    "Coach / Guidance Concern",
    "App Bug / Broken Code",
    "Video or Content Glitch",
    "Curriculum or Exercise Difficulty",
    "Audio or Sound Playback Error",
    "Payment / Access Inquiries",
    "Other Program Issue",
  ];

  const quitOptions = [
    "Schedule / Time Conflict",
    "Injury or Medical Reason",
    "Curriculum Intensity Not a Good Fit",
    "Switching to Another Program",
    "Personal / Other Reason",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      try {
        const key = activeTab === "quit" ? "wellness_quit_requests" : "wellness_reported_issues";
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.push({
          id: `${activeTab}_${Date.now()}`,
          programTitle: programTitle || "Cohort Program",
          type: activeTab === "quit" ? quitReason : issueType,
          note: note.trim(),
          submittedAt: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // Safe fallback
      }
      setIsSubmitting(false);
      setSubmittedDone(true);
      setNote("");
    }, 350);
  };

  return typeof document !== "undefined"
    ? createPortal(
        <div
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[85] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto animate-in fade-in duration-150"
        >
          <header
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            className="sticky top-0 z-10 bg-white/90 dark:bg-[#141414]/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-white/10"
          >
            <div className="max-w-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-full border border-zinc-200 dark:border-white/15 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5 active:scale-95 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="min-w-0 text-right">
                <p className="text-xs font-semibold text-zinc-950 dark:text-white truncate">
                  Program Support &amp; Options
                </p>
                <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                  {programTitle || "Cohort Assistance Desk"}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
            {submittedDone ? (
              <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-6 sm:p-8 text-center space-y-5 shadow-xs mt-4">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-950 dark:text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                    {activeTab === "quit" ? "Withdrawal Under Review" : "Report Under Investigation"}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto">
                    {activeTab === "quit"
                      ? "Your withdrawal request has been received. Our concierge support will review your curriculum status and reach out to you within 24 hours to assist you."
                      : "Thank you for bringing this to our attention. Our team has logged your report and is reviewing the issue."}
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={() => setSubmittedDone(false)}
                    className="h-10 px-5 rounded-full border border-zinc-300 dark:border-white/15 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                  >
                    Submit Another
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-6 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold active:scale-[0.98] transition"
                  >
                    Back to My Plan
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">
                    How can we help you?
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Submit a technical or curriculum report, or request a withdrawal from {programTitle || "this program"}.
                  </p>
                </div>

                <div className="p-1 rounded-xl bg-zinc-200/70 dark:bg-white/5 grid grid-cols-2 gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("issue")}
                    className={`py-2 px-3 rounded-lg transition ${
                      activeTab === "issue"
                        ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Report an Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("quit")}
                    className={`py-2 px-3 rounded-lg transition ${
                      activeTab === "quit"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                    }`}
                  >
                    Quit Program
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      {activeTab === "quit" ? "Reason for Withdrawing" : "Issue Category"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(activeTab === "quit" ? quitOptions : issueOptions).map((opt) => {
                        const isSelected = activeTab === "quit" ? quitReason === opt : issueType === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => (activeTab === "quit" ? setQuitReason(opt) : setIssueType(opt))}
                            className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition border ${
                              isSelected
                                ? activeTab === "quit"
                                  ? "bg-red-600 text-white border-transparent shadow-xs"
                                  : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xs"
                                : "bg-white dark:bg-[#141414] border-zinc-200/80 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      {activeTab === "quit" ? "Additional Context (Optional)" : "Details / Description"}
                    </label>
                    <textarea
                      rows={4}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        activeTab === "quit"
                          ? "Let us know how we can assist or why you need to leave..."
                          : "Describe the issue clearly (e.g., coach concern, broken video player, or exercise guidance)..."
                      }
                      className="w-full text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-3.5 text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-white resize-none"
                      required={activeTab === "issue"}
                    />
                  </div>

                  {activeTab === "quit" && (
                    <div className="border-l-2 border-zinc-300 dark:border-white/25 pl-3.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-white">Need a temporary pause instead?</p>
                      <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                        You can pause your schedule and resume when your routine clears up without losing your logged history.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (activeTab === "issue" && !note.trim())}
                    className={`w-full h-11 rounded-2xl text-xs font-semibold disabled:opacity-40 transition active:scale-[0.99] shadow-xs flex items-center justify-center gap-2 ${
                      activeTab === "quit"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90"
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <span>{activeTab === "quit" ? "Submit Withdrawal Request" : "Submit Report"}</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>,
        document.body
      )
    : null;
}

function ProgramPreparationWidgets({
  program,
  days,
  currentDayId,
  onSwitchWidget: _onSwitchWidget,
}: {
  program: PlanProgramInfo;
  days: PlanDay[];
  currentDayId?: string;
  onSwitchWidget?: (index: 0 | 1 | 2) => void;
}) {
  void _onSwitchWidget;
  const [activePage, setActivePage] = useState<"meal" | "meetup" | "overview" | "rules" | "coach" | null>(null);
  const [showGuidesInfo, setShowGuidesInfo] = useState(false);
  const [prepHeaderVisible, setPrepHeaderVisible] = useState(true);
  const prepScrollYRef = useRef(0);

  const handlePrepScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    if (currentScrollY > prepScrollYRef.current && currentScrollY > 40) {
      setPrepHeaderVisible(false);
    } else {
      setPrepHeaderVisible(true);
    }
    prepScrollYRef.current = currentScrollY;
  };
  const sortedDays = useMemo(() => [...days].sort((a, b) => a.dayNumber - b.dayNumber), [days]);
  const currentDay = useMemo(() => sortedDays.find((d) => d.id === currentDayId), [sortedDays, currentDayId]);
  const totalDaysCount = sortedDays.length || program.totalDays || 0;

  useEffect(() => {
    if (!activePage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activePage]);

  // Only sessions with an actual live call, meetup, or scheduled event
  const meetupDays = useMemo(
    () =>
      sortedDays.filter(
        (d) =>
          d.dayType === "CONNECT_DAY" ||
          d.dayType === "MEETUP_DAY" ||
          d.dayType === "CONNECTION_DAY" ||
          !!(d.meetupLink && d.meetupLink.trim()) ||
          !!(d.onsiteVenue && d.onsiteVenue.trim()) ||
          !!(d.onsiteSchedule && d.onsiteSchedule.trim()) ||
          !!(d.eventTitle && d.eventTitle.trim())
      ),
    [sortedDays]
  );

  // All program days from Day 1 to end for the Meal Guide
  const mealDays = sortedDays;

  // Clean equipment checklist items
  const equipmentItems = useMemo(() => {
    const rawEquipment = program.equipment || "Movement Mat";
    return rawEquipment
      .split(/\n|,|•|·|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, [program.equipment]);

  const validReferences = useMemo(
    () => (program.scientificReferences || []).filter((r) => r && r.title && r.title.trim().length > 0),
    [program.scientificReferences]
  );

  const cardsContent = (
    <>
      {/* CARD 1: MEAL GUIDE */}
      <button
        type="button"
        onClick={() => setActivePage("meal")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pic.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <Utensils className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            {totalDaysCount} days
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Meal Guide</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Daily nutrition</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 2: MEETUPS & LIVE */}
      <button
        type="button"
        onClick={() => setActivePage("meetup")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coach.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            {meetupDays.length} {meetupDays.length === 1 ? "session" : "sessions"}
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Meetups &amp; Live</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Zoom &amp; calls</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 3: OVERVIEW (OBJECTIVES, EQUIPMENT & REFERENCES) */}
      <button
        type="button"
        onClick={() => setActivePage("overview")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coach3.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            {program.durationDays || totalDaysCount} days focus
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Overview</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Blueprint, gear &amp; studies</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 4: RULES & GUIDELINES */}
      <button
        type="button"
        onClick={() => setActivePage("rules")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coach2.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            Code &amp; policy
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Rules</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Guidelines &amp; conduct</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 5: COACHES */}
      <button
        type="button"
        onClick={() => setActivePage("coach")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/coach.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            Guide team
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Coaches</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Faculty &amp; mentors</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>
    </>
  );

  return (
    <>
      <section className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">Program Guides</h2>
            <button
              type="button"
              onClick={() => setShowGuidesInfo(true)}
              aria-label="Program guides overview"
              className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <InfoPopupModal
          open={showGuidesInfo}
          title="Program Guides"
          subtitle="Meals, sessions, overview, rules & coaches"
          onClose={() => setShowGuidesInfo(false)}
        >
          <p className="font-semibold text-zinc-950 dark:text-white">What Program Guides Cover:</p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li><strong className="text-zinc-900 dark:text-white">Meal Guide:</strong> Daily nutrition principles, hydration targets, and dietary guidance for each program day.</li>
            <li><strong className="text-zinc-900 dark:text-white">Meetups &amp; Live:</strong> Scheduled Zoom clinics, live coaching sessions, and community meetups.</li>
            <li><strong className="text-zinc-900 dark:text-white">Overview:</strong> Program logistics, methodology, outcomes, required gear, and scientific references.</li>
            <li><strong className="text-zinc-900 dark:text-white">Rules:</strong> Practical guidelines, daily logging cutoffs, and cohort safety standards.</li>
            <li><strong className="text-zinc-900 dark:text-white">Coaches:</strong> Dedicated faculty and clinical specialists guiding this cohort.</li>
          </ul>
        </InfoPopupModal>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {cardsContent}
        </div>
      </section>

      {/* DEDICATED FULL-SCREEN VIEWS FOLLOWING ACTIVE LIGHT / DARK THEME */}
      {activePage &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onScroll={handlePrepScroll}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto"
          >
            {/* FLOATING HEADER: BACK BUTTON + COMMUNITY/CONCIERGE BUTTON */}
            <header
              style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
              className={`fixed left-1/2 -translate-x-1/2 z-[90] w-[94%] max-w-xl flex items-center justify-between pointer-events-none transition-all duration-300 ${
                prepHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-20 opacity-0"
              }`}
            >
              <button
                type="button"
                onClick={() => setActivePage(null)}
                className="pointer-events-auto h-8 px-3.5 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide inline-flex items-center gap-1.5 shadow-md active:scale-95 transition hover:bg-black/80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <a
                href={
                  safeHttpUrl(program.communityLink) ||
                  `https://wa.me/6281290002026?text=${encodeURIComponent(
                    `Hello Concierge, I would like to inquire about ${
                      activePage === "meal"
                        ? "Meals"
                        : activePage === "meetup"
                          ? "Sessions"
                          : activePage === "overview"
                            ? "Program Overview"
                            : activePage === "rules"
                              ? "Rules & Guidelines"
                              : "Coaches"
                    } in program: ${program.title}`
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto h-8 px-4 rounded-full bg-black/60 dark:bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-medium tracking-wide active:scale-95 transition hover:bg-black/80 inline-flex items-center justify-center shadow-md"
              >
                <span>{program.communityLink ? "Community" : "Concierge"}</span>
              </a>
            </header>

            {/* TOP BANNER IMAGE */}
            <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-zinc-950 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  activePage === "meal"
                    ? "/pic.webp"
                    : activePage === "meetup"
                      ? "/coach.webp"
                      : activePage === "overview"
                        ? "/coach3.webp"
                        : activePage === "coach"
                          ? "/coach.webp"
                          : "/coach2.webp"
                }
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

              <div className="absolute inset-x-0 bottom-14 sm:bottom-16 z-0">
                <div className="max-w-2xl mx-auto w-full px-6 sm:px-10 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/75 block">
                    {activePage === "meal"
                      ? "Nutrition"
                      : activePage === "meetup"
                        ? "Schedule"
                        : activePage === "overview"
                          ? "Curriculum"
                          : activePage === "rules"
                            ? "Policy"
                            : "Faculty"}
                  </span>

                  <h1 className="text-2xl sm:text-4xl font-geometric font-light tracking-tight text-white leading-tight drop-shadow-md">
                    {activePage === "meal"
                      ? "Meals"
                      : activePage === "meetup"
                        ? "Sessions"
                        : activePage === "overview"
                          ? "Overview"
                          : activePage === "rules"
                            ? "Rules & Guidelines"
                            : "Coaches"}
                  </h1>

                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-xl">
                    {activePage === "meal"
                      ? "Daily whole-food nutrition principles and circadian hydration guidance for every cohort day."
                      : activePage === "meetup"
                        ? "Interactive live sessions, movement clinics, and cohort gatherings."
                        : activePage === "overview"
                          ? "Program logistics, methodology, adaptation targets, required gear, and scientific references."
                          : activePage === "rules"
                            ? "Practical guidelines, daily logging cadence, and safety standards for enrolled members."
                            : "Certified longevity practitioners, movement specialists, and dedicated cohort mentors."}
                  </p>
                </div>
              </div>
            </div>

            {/* CURVED SHEET CONTAINER WITH CLEAN PUBLIC-STYLE EDITORIAL TEXT */}
            <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] shadow-2xl pt-10 sm:pt-12 px-6 sm:px-10 pb-32 max-w-2xl mx-auto w-full flex-1">
              {/* 1. MEAL GUIDE */}
              {activePage === "meal" && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                      <span>Daily Nutrition</span>
                      <span>{mealDays.length} {mealDays.length === 1 ? "Day" : "Days"}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                      Meal Schedule
                    </h2>
                  </div>

                  <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                    {mealDays.map((d) => {
                      const isToday = d.id === currentDayId;
                      const isPast = !isToday && (d.isPast2359 || (currentDay ? d.dayNumber < currentDay.dayNumber : false));
                      const rawLines = splitActivities(d.mealRecommendation).map((l) =>
                        l.replace(/^meal\s*\d+\s*:\s*/i, "").trim()
                      );
                      const compliance = d.userProgress?.mealCompliance;
                      const complianceLabel =
                        compliance === "FULL" || compliance === "YES"
                          ? "Followed"
                          : compliance === "PARTIAL"
                            ? "Partial"
                            : compliance === "SIMILAR"
                              ? "Similar"
                              : compliance === "OFF_TRACK"
                                ? "Off Track"
                                : compliance === "SKIPPED"
                                  ? "Skipped"
                                  : null;
                      const mealNotes = d.userProgress?.mealNotes?.trim();

                      return (
                        <div
                          key={d.id}
                          className={`py-6 space-y-3 transition ${
                            isToday ? "border-l-2 border-zinc-950 dark:border-white pl-4" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                              <span
                                className={`font-semibold ${
                                  isToday
                                    ? "text-zinc-950 dark:text-white"
                                    : isPast
                                      ? "text-zinc-500 dark:text-zinc-400"
                                      : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                Day {d.dayNumber}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                              <span className="text-zinc-500 dark:text-zinc-400">
                                {formatShortDayDate(d.unlockDate, d.dayNumber)}
                              </span>
                              {isToday && (
                                <span className="px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold">
                                  Today
                                </span>
                              )}
                            </div>

                            {complianceLabel && (
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                                {complianceLabel}
                              </span>
                            )}
                          </div>

                          {d.title && (
                            <h3
                              className={`text-sm sm:text-base font-geometric font-medium leading-snug ${
                                isPast ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-950 dark:text-white"
                              }`}
                            >
                              {d.title}
                            </h3>
                          )}

                          {rawLines.length > 0 ? (
                            <ul className="space-y-2.5 pt-0.5">
                              {rawLines.map((line, idx) => (
                                <li
                                  key={idx}
                                  className={`text-xs sm:text-sm flex items-start gap-3 leading-relaxed ${
                                    isPast ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-600 dark:text-zinc-300"
                                  }`}
                                >
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1 shrink-0">
                                    {String(idx + 1).padStart(2, "0")}
                                  </span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                              Balanced whole-food nutrition and circadian recovery hydration.
                            </p>
                          )}

                          {mealNotes && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-1">
                              Note: {mealNotes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MEETUPS & LIVE SESSIONS */}
              {activePage === "meetup" && (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                      <span>Live Cohort Schedule</span>
                      <span>{meetupDays.length} {meetupDays.length === 1 ? "Session" : "Sessions"}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                      Upcoming &amp; Past Meetups
                    </h2>
                  </div>

                  {meetupDays.length > 0 ? (
                    <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                      {meetupDays.map((d) => {
                        const meetUrl = safeHttpUrl(d.meetupLink);
                        const mapUrl = safeHttpUrl(d.mapLink);
                        const isToday = d.id === currentDayId;
                        const isPast = !isToday && (d.isPast2359 || (currentDay ? d.dayNumber < currentDay.dayNumber : false));
                        const hostName = d.eventHost || d.coachName || program.coachName;

                        return (
                          <div
                            key={d.id}
                            className={`py-6 space-y-3 ${
                              isToday ? "border-l-2 border-zinc-950 dark:border-white pl-4" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                                  <span className="font-semibold text-zinc-950 dark:text-white">
                                    Day {d.dayNumber}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                                  <span className="text-zinc-500 dark:text-zinc-400">
                                    {formatShortDayDate(d.unlockDate, d.dayNumber)}
                                  </span>
                                  {isToday && (
                                    <span className="px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold">
                                      Today
                                    </span>
                                  )}
                                  {isPast && (
                                    <span className="text-zinc-400 dark:text-zinc-500">
                                      &bull; Concluded
                                    </span>
                                  )}
                                </div>
                                <h3
                                  className={`text-base sm:text-lg font-geometric font-medium leading-snug ${
                                    isPast ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-950 dark:text-white"
                                  }`}
                                >
                                  {d.eventTitle || d.title || "Live Coaching Session"}
                                </h3>
                                {hostName && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Hosted by {hostName}
                                  </p>
                                )}
                              </div>
                              {d.onsiteSchedule && (
                                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1.5 shrink-0 pt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span>{d.onsiteSchedule}</span>
                                </span>
                              )}
                            </div>

                            {d.eventDetails && (
                              <p
                                className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                                  isPast ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-600 dark:text-zinc-300"
                                }`}
                              >
                                {d.eventDetails}
                              </p>
                            )}

                            {(d.onsiteVenue || program.venueAddress) && (
                              <div className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{d.onsiteVenue || program.venueAddress}</span>
                              </div>
                            )}

                            {(meetUrl || mapUrl) && (
                              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                {meetUrl && (
                                  <a
                                    href={meetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`h-8 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 active:scale-95 transition ${
                                      isPast
                                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10"
                                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                    }`}
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>{isPast ? "Session Archive" : "Join Live Meeting"}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {mapUrl && (
                                  <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-4 rounded-full border border-zinc-200 dark:border-white/20 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-50 dark:hover:bg-white/5"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Directions</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 border-y border-zinc-200/80 dark:border-white/10 text-center text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                      No live sessions scheduled for this program.
                    </div>
                  )}
                </div>
              )}

              {/* 3. OVERVIEW (MERGED: OBJECTIVES + EQUIPMENT + REFERENCES) */}
              {activePage === "overview" && (
                <div className="space-y-12">
                  {/* Logistics */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                        Logistics
                      </span>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Audience &amp; Commitment
                      </h2>
                    </div>
                    <dl className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm">
                      <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Target Audience</dt>
                        <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                          {program.recommendedFor || program.audience || "All Levels • Mindful Longevity"}
                        </dd>
                      </div>
                      <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Daily Commitment</dt>
                        <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                          {program.dailyCommitment || "20–30 mins/day"}
                        </dd>
                      </div>
                      <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Intensity Level</dt>
                        <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                          {formatIntensityBadge(program.difficultyLevel)}
                        </dd>
                      </div>
                      <div className="py-3.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                        <dt className="text-zinc-500 dark:text-zinc-400 text-[11px] font-mono uppercase tracking-wider">Delivery &amp; Location</dt>
                        <dd className="font-medium text-zinc-950 dark:text-white sm:text-right">
                          {program.locationType || "Online Studio"}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {/* Methodology & Target State */}
                  <section className="space-y-6">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                        Blueprint
                      </span>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Methodology &amp; Target State
                      </h2>
                    </div>

                    <div className="space-y-5 border-t border-zinc-200/80 dark:border-white/10 pt-5">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                          Core Focus
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                          {program.methodology || program.description || "Evidence-based somatic training combined with structured recovery routines and circadian alignment."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 block">
                          Target Physical &amp; Mental State
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {program.targetState || "Optimal physical vitality, enhanced postural stability, regulated nervous system tone, and restored metabolic recovery."}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Expected Outcomes */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                        Outcomes
                      </span>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Expected Benefits
                      </h2>
                    </div>
                    <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                      {(program.expectedBenefits && program.expectedBenefits.length > 0
                        ? program.expectedBenefits
                        : [
                            "Sustained all-day physical energy and enhanced mental focus without mid-day crashes.",
                            "Noticeable improvement in deep sleep duration and nighttime recovery scores.",
                            "Enhanced joint mobility, core stability, and functional movement mechanics.",
                            "Sustainable whole-food nutrition habits and reduced systemic metabolic strain.",
                          ]
                      ).map((benefit, i) => (
                        <li key={i} className="py-4 flex items-start gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          <Check className="w-4 h-4 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Required Gear (Merged Equipment) */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        <span>Equipment</span>
                        <span>{equipmentItems.length} {equipmentItems.length === 1 ? "Item" : "Items"}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Required Gear
                      </h2>
                    </div>
                    <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                      {equipmentItems.map((item, idx) => (
                        <li key={idx} className="py-4 flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-zinc-950 dark:text-white shrink-0" />
                          <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Scientific References (Merged References) */}
                  <section className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
                        <span>Literature</span>
                        <span>{validReferences.length} {validReferences.length === 1 ? "Source" : "Sources"}</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Scientific References
                      </h2>
                    </div>

                    {validReferences.length > 0 ? (
                      <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                        {validReferences.map((ref, idx) => {
                          const url = safeHttpUrl(ref.url);
                          return (
                            <div
                              key={idx}
                              className="py-4 flex items-start justify-between gap-4"
                            >
                              <div className="min-w-0 space-y-1">
                                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                                  Source {String(idx + 1).padStart(2, "0")}
                                </span>
                                <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                  {ref.title}
                                </p>
                              </div>
                              {url && (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-xs font-medium text-zinc-950 dark:text-white inline-flex items-center gap-1 hover:underline underline-offset-4 pt-1"
                                >
                                  <span>Study</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="py-6 border-y border-zinc-200/80 dark:border-white/10 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                        No clinical references cited for this program.
                      </p>
                    )}
                  </section>
                </div>
              )}

              {/* 4. RULES & PRACTICAL GUIDELINES */}
              {activePage === "rules" && (
                <div className="space-y-12">
                  {program.programGuidelines && program.programGuidelines.length > 0 && (
                    <section className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                          Preparation
                        </span>
                        <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                          Practical Guidelines
                        </h2>
                      </div>
                      <ul className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                        {program.programGuidelines.map((g, i) => (
                          <li key={i} className="py-4 flex items-start gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1 shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                        Policy
                      </span>
                      <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                        Program Code of Conduct
                      </h2>
                    </div>
                    <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                      {[
                        {
                          title: "Daily Cadence & 23:59 WIB Cutoff",
                          desc: "Curriculum tasks unlock at 00:00 WIB and must be logged before 23:59 WIB. Daily consistency anchors neural adaptation. Missed tasks can be marked as skipped without penalizing your habit profile.",
                        },
                        {
                          title: "Medical Safety & Intuitive Pacing",
                          desc: "Listen to biofeedback. Movement drills should never cause sharp pain. Stop immediately and contact your physician if feeling faint or discomfort.",
                        },
                        {
                          title: "Cohort Privacy & Respectful Space",
                          desc: "Everything shared within the cohort (photos, journals, questions) is strictly confidential. Mutual respect and encouragement are mandatory.",
                        },
                        {
                          title: "Data Integrity & Truthful Logging",
                          desc: "Log sleep hours, training reps, and meals accurately. Authentic tracking empowers personalized AI adjustments and honest self-discovery.",
                        },
                        {
                          title: "Rest Days & Nervous System Restoration",
                          desc: "Rest days are as vital as training days. Respect recovery protocols to allow neuromuscular integration and avoid chronic sympathetic overload.",
                        },
                      ].map((rule, idx) => (
                        <div key={idx} className="py-5 sm:py-6 space-y-2">
                          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 block">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <h3 className="font-geometric font-medium text-zinc-950 dark:text-white text-sm sm:text-base">
                            {rule.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            {rule.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* 5. COACHES & MENTORS (KEEPING AVATAR IMAGES INTACT) */}
              {activePage === "coach" && (
                <div className="space-y-8">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400 block">
                      Dedicated Faculty
                    </span>
                    <h2 className="text-lg sm:text-xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                      Program Coaches
                    </h2>
                  </div>

                  <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                    {/* Coach 1: Lead Program Coach */}
                    <div className="py-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach.webp"
                        alt={program.coachName || "Lead Coach"}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-geometric font-medium text-zinc-950 dark:text-white">
                            {program.coachName || "Coach Julian Thorne"}
                          </h3>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                            Lead Guide
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {program.coachTitle || "Master Longevity & Movement Specialist"}
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                          Specializes in biomechanics, mobility progression, and neuromuscular longevity conditioning. Designed the daily training curriculum for this cohort.
                        </p>
                      </div>
                    </div>

                    {/* Coach 2: Clinical Nutritionist */}
                    <div className="py-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach2.webp"
                        alt="Nutrition Specialist"
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-geometric font-medium text-zinc-950 dark:text-white">
                            Dr. Marcus Vance, ND
                          </h3>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                            Nutrition
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Integrative Nutritionist &amp; Metabolic Health Researcher
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                          Oversees dietary recommendations, circadian fasting windows, and cellular anti-inflammatory nutrition protocols for optimal recovery.
                        </p>
                      </div>
                    </div>

                    {/* Coach 3: Nervous System & Sleep Specialist */}
                    <div className="py-6 flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach3.webp"
                        alt="Sleep & Recovery Guide"
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-geometric font-medium text-zinc-950 dark:text-white">
                            Elena Rostova, MSc
                          </h3>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                            Recovery
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Circadian Somatics &amp; Autonomic Nervous System Coach
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                          Guides breathwork sessions, parasympathetic wind-down routines, and daily sleep hygiene protocols.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
