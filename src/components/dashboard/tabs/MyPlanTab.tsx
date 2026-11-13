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
  ChevronDown,
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
import { EmptyState, FloatingHeader, InfoPopupModal, formatDateWib, safeHttpUrl } from "./shared";

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
  plans,
  selectedProgramId,
  onSelect,
  onExplore,
}: {
  visible: boolean;
  plans: PlanOption[];
  selectedProgramId: string;
  onSelect: (programId: string) => void;
  onExplore: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = plans.find((p) => p.programId === selectedProgramId) || plans[0] || null;

  return (
    <FloatingHeader visible={visible}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle visual theme"
        title={theme === "dark" ? "Switch to Pearl Light theme" : "Switch to Obsidian Dark theme"}
        className="select-none flex items-center gap-1 text-zinc-950 dark:text-white active:scale-95 transition hover:opacity-75 focus:outline-none"
      >
        <span className="font-light text-lg leading-none">+</span>
        <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
      </button>

      <div className="relative min-w-0">
        {!current ? (
          <button
            type="button"
            onClick={onExplore}
            className="px-4 py-1.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold tracking-wide uppercase flex items-center gap-1.5 active:scale-95 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore Plan</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="max-w-[210px] sm:max-w-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/15 text-zinc-900 dark:text-white text-xs transition active:scale-95"
            >
              <span className="truncate font-semibold uppercase tracking-wide">{current.title}</span>
              <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <ul
                  role="listbox"
                  className="absolute right-0 top-full mt-2 w-72 max-h-72 overflow-y-auto rounded-2xl bg-white dark:bg-[#0c0c10] border border-zinc-200 dark:border-white/15 p-2 shadow-2xl z-50"
                >
                  <li className="px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
                    My Plans ({plans.length})
                  </li>
                  {plans.map((p) => {
                    const selected = p.programId === current.programId;
                    return (
                      <li key={p.programId} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelect(p.programId);
                            setOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                            selected
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold"
                              : "hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          <span className="truncate uppercase tracking-tight">{p.title}</span>
                          {selected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </FloatingHeader>
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

function scheduleMeta(dayType: string | undefined) {
  if (dayType === "REST_DAY") return { label: "Rest Day" };
  if (dayType === "TRAINING_DAY") return { label: "Training Day" };
  return { label: "Connect Day" };
}

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
  stats,
  checklist,
  historyDays,
  allProgramDays,
  onExplore,
  onViewHistory,
  onOpenDetails,
  onToggleCheck,
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
  const schedule = scheduleMeta(day?.dayType);
  const activities =
    day?.dayType === "REST_DAY"
      ? splitActivities(day.restInstructions)
      : day?.dayType === "TRAINING_DAY"
        ? movementNames(day)
        : [];
  const sleepDone = (!!progress?.bedtime && !!progress?.wakeTime) || progress?.bedtime === "SKIPPED";
  const activityDone =
    day?.dayType === "TRAINING_DAY"
      ? !!progress?.videoWatched ||
        !!progress?.isCompleted ||
        !!progress?.workoutNotes ||
        !!progress?.selectedWorkout ||
        (activities.length > 0 && activities.every((name) => checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : day?.dayType === "REST_DAY"
        ? activities.length > 0
          ? activities.every((name) => checks.includes(name))
          : !!progress?.isCompleted || progress?.workoutNotes === "SKIPPED" || progress?.checklistCompleted === "SKIPPED"
        : !!progress?.eventFeedback || !!progress?.isCompleted || progress?.eventFeedback === "SKIPPED" || progress?.workoutNotes === "SKIPPED";
  const initialDone: [boolean, boolean, boolean, boolean] = [
    sleepDone,
    activityDone,
    !!progress?.mealCompliance,
    !!progress?.dailyReflection,
  ];
  const pendingTasksCount = day ? initialDone.filter((done) => !done).length : 0;

  const totalProgramDays = program?.totalDays || 0;
  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  const locked = !day || !day.isCalendarUnlocked || day.isPast2359;
  const community = safeHttpUrl(program?.communityLink);
  const fullProgramDays = allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays;
  const trainingDaysTotal = fullProgramDays.filter((d) => d.dayType === "TRAINING_DAY").length;
  const restDaysTotal = fullProgramDays.filter((d) => d.dayType === "REST_DAY").length;
  const connectDaysTotal = fullProgramDays.filter(
    (d) => d.dayType !== "TRAINING_DAY" && d.dayType !== "REST_DAY"
  ).length;

  const [widgetIndex, setWidgetIndex] = useState<0 | 1 | 2>(0);
  const [showDayStats, setShowDayStats] = useState(false);
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

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10">
        <div className="relative aspect-[2/1] w-full">
          {program?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-zinc-800" />
          )}
          <div className="absolute inset-0 bg-black/45" />
          {program && (
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold tracking-wider text-white inline-flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-300" />
                <span>{program.dailyCommitment || "15–20 Mins / Day"}</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold uppercase tracking-wider text-white">
                {formatIntensityBadge(program.difficultyLevel)}
              </span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h2 className="text-lg font-medium tracking-tight leading-tight truncate">
              {program?.title || "No active program"}
            </h2>
            {program && (
              <p className="mt-1 text-xs text-white/80 truncate">{program.coachName || "—"}</p>
            )}
          </div>
        </div>
      </section>

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
              <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5">
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
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
            <div className="w-full px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <p className="font-medium tabular-nums text-sm text-zinc-950 dark:text-white">
                  {currentDayNumber > 0 ? `Day ${currentDayNumber}` : "—"}
                  <span className="text-zinc-400 font-normal"> / {totalProgramDays}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowDayStats(true)}
                  aria-label="Program schedule & completion info"
                  className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold tracking-wider text-right text-zinc-700 dark:text-zinc-300">
                {day ? schedule.label.toUpperCase() : "NO OPEN DAY"}
              </p>
            </div>
          </section>

          <InfoPopupModal
            open={showDayStats}
            title="Cohort Progress & Schedule"
            subtitle={program.title}
            onClose={() => setShowDayStats(false)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Program Dates</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900 dark:text-white">
                    {formatDateWib(program.startDate)} – {formatDateWib(program.endDate)}
                  </span>
                </div>
                {fullProgramDays.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500 dark:text-zinc-400">Day Structure</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {trainingDaysTotal} Training · {restDaysTotal} Rest · {connectDaysTotal} Connect
                    </span>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-3 gap-3 pt-3 border-t border-zinc-200/90 dark:border-white/10 text-sm">
                <div>
                  <dt className="text-[11px] text-zinc-500">Completed</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">{stats.completed}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-zinc-500">Skipped</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">{stats.skipped}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-zinc-500">Remaining</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-950 dark:text-white">{stats.remaining}</dd>
                </div>
              </dl>
            </div>
          </InfoPopupModal>

          {/* 3-INDEX NAVIGATION WIDGET (COMPACT BAR) */}
          <section className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-1 shadow-xs">
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setWidgetIndex(0)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                  widgetIndex === 0
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                <span>Tasks</span>
                {pendingTasksCount > 0 && (
                  <span
                    className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                      widgetIndex === 0
                        ? "bg-white/20 text-white dark:bg-zinc-950/20 dark:text-zinc-950 font-bold"
                        : "bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 font-semibold"
                    }`}
                  >
                    {pendingTasksCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setWidgetIndex(1)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center transition active:scale-[0.98] ${
                  widgetIndex === 1
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                Guides
              </button>
              <button
                type="button"
                onClick={() => setWidgetIndex(2)}
                className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center transition active:scale-[0.98] ${
                  widgetIndex === 2
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
                }`}
              >
                Metrics
              </button>
            </div>
          </section>

          <div
            onTouchStart={handleWidgetTouchStart}
            onTouchEnd={handleWidgetTouchEnd}
            className="transition-all duration-200"
          >
            <div className={widgetIndex === 0 ? "block" : "hidden"}>
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

            <div className={widgetIndex === 1 ? "block" : "hidden"}>
              <ProgramPreparationWidgets
                program={program}
                days={fullProgramDays}
                currentDayId={day?.id}
                onSwitchWidget={setWidgetIndex}
              />
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

function FiveBarMeter({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(5, Math.round(score)));
  return (
    <div className="grid grid-cols-5 gap-1.5" aria-label={`Score ${safeScore} out of 5`}>
      {[1, 2, 3, 4, 5].map((level) => (
        <div
          key={level}
          className={`h-2 rounded-sm transition-all ${
            level <= safeScore
              ? "bg-zinc-950 dark:bg-white"
              : "bg-zinc-100 dark:bg-white/10"
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

  // 1. Sleep Average (1–5 Score, 5 = Optimal >= 7h 30m)
  const loggedSleeps = sorted
    .map((d) => calcSleepMins(d.userProgress?.bedtime, d.userProgress?.wakeTime))
    .filter((mins) => mins > 0);

  const avgSleepMins =
    loggedSleeps.length > 0
      ? Math.round(loggedSleeps.reduce((acc, m) => acc + m, 0) / loggedSleeps.length)
      : 0;

  const sleepScore =
    avgSleepMins === 0
      ? 0
      : avgSleepMins >= 450 // >= 7h 30m
        ? 5
        : avgSleepMins >= 405 // 6h 45m - 7h 29m
          ? 4
          : avgSleepMins >= 360 // 6h 00m - 6h 44m
            ? 3
            : avgSleepMins >= 300 // 5h 00m - 5h 59m
              ? 2
              : 1;

  // 2. Training Sessions Completed vs Total Training Days
  const trainingDays = sorted.filter((d) => d.dayType === "TRAINING_DAY");
  const trainingTotal = trainingDays.length;
  const trainingDone = trainingDays.filter((d) => {
    const p = d.userProgress;
    if (!p) return false;
    if (p.isCompleted || p.videoWatched) return true;
    const checks = checkedList(d, undefined);
    return checks.length > 0;
  }).length;
  const trainingScore =
    trainingTotal > 0 ? Math.round((trainingDone / trainingTotal) * 5) : 0;

  // 3. Meal Guide Followed vs Total Program Days
  const mealTotal = sorted.length;
  const mealFollowed = sorted.filter(
    (d) =>
      d.userProgress?.mealCompliance === "FULL" ||
      d.userProgress?.mealCompliance === "YES"
  ).length;
  const mealScore =
    mealTotal > 0 ? Math.round((mealFollowed / mealTotal) * 5) : 0;

  // 4. Energy & Mood Average (1–5 Score from daily reflection)
  const loggedMoods = sorted
    .map((d) => d.userProgress?.happinessRate)
    .filter((rate): rate is number => typeof rate === "number" && rate > 0);
  const avgMood =
    loggedMoods.length > 0
      ? Math.round(loggedMoods.reduce((acc, r) => acc + r, 0) / loggedMoods.length)
      : 0;
  const moodScore = Math.max(0, Math.min(5, avgMood));

  // 5. Program Consistency (Active days with logged habits vs Total Program Days)
  const consistencyTotal = sorted.length;
  const consistencyDone = sorted.filter((d) => {
    const p = d.userProgress;
    if (!p) return false;
    return Boolean(
      p.isCompleted ||
        p.videoWatched ||
        (p.bedtime && p.wakeTime) ||
        p.mealCompliance ||
        p.workoutNotes
    );
  }).length;
  const consistencyScore =
    consistencyTotal > 0 ? Math.round((consistencyDone / consistencyTotal) * 5) : 0;

  const [showMetricsInfo, setShowMetricsInfo] = useState(false);

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
      <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
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
        subtitle="Sleep score, training & meal compliance"
        onClose={() => setShowMetricsInfo(false)}
      >
        <p className="font-semibold text-zinc-950 dark:text-white">How Metrics Are Calculated:</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
          <li><strong className="text-zinc-900 dark:text-white">Sleep Average:</strong> Graded 1–5 score. Optimal score 5 requires an average of ≥ 7h 30m nightly sleep across all logged dates.</li>
          <li><strong className="text-zinc-900 dark:text-white">Training:</strong> Number of completed movement sessions vs total scheduled training days.</li>
          <li><strong className="text-zinc-900 dark:text-white">Meal:</strong> Days you followed the daily nutrition protocol vs total program duration.</li>
          <li><strong className="text-zinc-900 dark:text-white">Energy &amp; Mood:</strong> Average vitality self-rating from 1 (lowest) to 5 (peak energy).</li>
          <li><strong className="text-zinc-900 dark:text-white">Program Consistency:</strong> Percentage of days with active check-in activity recorded.</li>
        </ul>
      </InfoPopupModal>

      <div className="p-4 space-y-3.5">
        {/* 1. SLEEP AVERAGE (1–5 BAR) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sleep Average</span>
              {avgSleepMins > 0 && (
                <span className="text-zinc-400 font-normal">
                  · {formatSleepHours(avgSleepMins)}
                </span>
              )}
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {sleepScore} / 5
            </span>
          </div>
          <FiveBarMeter score={sleepScore} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 2. TRAINING COUNT */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
              <span>Training</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {trainingDone} / {trainingTotal}
            </span>
          </div>
          <FiveBarMeter score={trainingScore} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 3. MEAL COUNT */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-zinc-400" />
              <span>Meal</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {mealFollowed} / {mealTotal}
            </span>
          </div>
          <FiveBarMeter score={mealScore} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 4. ENERGY & MOOD */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-zinc-400" />
              <span>Energy & Mood</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {moodScore > 0 ? `${moodScore} / 5` : "—"}
            </span>
          </div>
          <FiveBarMeter score={moodScore} />
        </div>

        <div className="border-t border-zinc-100 dark:border-white/10" />

        {/* 5. PROGRAM CONSISTENCY */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-zinc-400" />
              <span>Program Consistency</span>
            </span>
            <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white">
              {consistencyDone} / {consistencyTotal} Days
            </span>
          </div>
          <FiveBarMeter score={consistencyScore} />
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
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 sm:p-5 space-y-3">
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
      <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
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
      <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
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
  const [activePage, setActivePage] = useState<"meal" | "meetup" | "equipment" | "objective" | "reference" | "terms" | "coach" | null>(null);
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
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Meetups & Live</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Zoom & calls</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 3: EQUIPMENT */}
      <button
        type="button"
        onClick={() => setActivePage("equipment")}
        className="group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 text-left flex flex-col justify-between min-h-[110px] transition active:scale-[0.99] hover:border-zinc-300 dark:hover:border-white/20 shadow-sm"
      >
        <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/image.webp"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-15 dark:opacity-25 transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white dark:from-[#141414] to-transparent" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
            {equipmentItems.length} {equipmentItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Equipment</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Required gear</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 4: OBJECTIVES & BLUEPRINT */}
      <button
        type="button"
        onClick={() => setActivePage("objective")}
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
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Objectives</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Blueprint & benefits</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 5: CLINICAL REFERENCES */}
      <button
        type="button"
        onClick={() => setActivePage("reference")}
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
            {validReferences.length} {validReferences.length === 1 ? "source" : "sources"}
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">References</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Clinical journals</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 6: TERMS & RULES */}
      <button
        type="button"
        onClick={() => setActivePage("terms")}
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
            Code & Policy
          </span>
        </div>

        <div className="relative z-10 pt-3 flex items-end justify-between w-full">
          <div>
            <p className="text-xs font-semibold text-zinc-950 dark:text-white">Terms &amp; Rules</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Code of conduct & guidelines</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
        </div>
      </button>

      {/* CARD 7: COACHES */}
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
      <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-xs">
        <div className="px-4 py-3.5 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3">
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
          subtitle="Meal protocol, meetups, gear, blueprint, rules & coaches"
          onClose={() => setShowGuidesInfo(false)}
        >
          <p className="font-semibold text-zinc-950 dark:text-white">What Program Guides Cover:</p>
          <ul className="space-y-1.5 text-[11px] leading-relaxed list-disc list-inside text-zinc-600 dark:text-zinc-400">
            <li><strong className="text-zinc-900 dark:text-white">Meals:</strong> Daily nutrition principles, hydration targets, and dietary guidance for each program day.</li>
            <li><strong className="text-zinc-900 dark:text-white">Sessions:</strong> Scheduled Zoom clinics, live coaching sessions, and community meetups.</li>
            <li><strong className="text-zinc-900 dark:text-white">Equipment:</strong> Required mats, weights, bands, or recovery tools needed for training.</li>
            <li><strong className="text-zinc-900 dark:text-white">Objectives:</strong> Target physiological adaptations, phase breakdown, and cohort goals.</li>
            <li><strong className="text-zinc-900 dark:text-white">References:</strong> Peer-reviewed scientific literature supporting this curriculum.</li>
            <li><strong className="text-zinc-900 dark:text-white">Terms &amp; Rules:</strong> Code of conduct, daily logging cutoffs, and safety guidelines.</li>
            <li><strong className="text-zinc-900 dark:text-white">Coaches:</strong> Dedicated faculty and clinical specialists guiding this cohort.</li>
          </ul>
        </InfoPopupModal>

        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            {/* FLOATING HEADER: BACK BUTTON + COMMUNITY/CONCIERGE BUTTON (TEXT ONLY, NO ICON) */}
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
                          : activePage === "equipment"
                            ? "Equipment"
                            : activePage === "objective"
                              ? "Objectives"
                              : activePage === "coach"
                                ? "Coaches"
                                : activePage === "terms"
                                  ? "Terms & Rules"
                                  : "References"
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

            {/* TOP BANNER IMAGE (SPACIOUS, CLEAN OVERLAY) */}
            <div className="relative h-72 sm:h-80 w-full overflow-hidden bg-zinc-950 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  activePage === "meal"
                    ? "/pic.webp"
                    : activePage === "meetup"
                      ? "/coach.webp"
                      : activePage === "equipment"
                        ? "/image.webp"
                        : activePage === "objective"
                          ? "/coach3.webp"
                          : activePage === "coach"
                            ? "/coach.webp"
                            : "/coach2.webp"
                }
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/15" />

              {/* Title and metadata overlying the image banner, aligned with the sheet content below */}
              <div className="absolute inset-x-0 bottom-14 sm:bottom-16 z-0">
                <div className="max-w-xl mx-auto w-full px-6 sm:px-8 space-y-1.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/75 font-semibold block">
                    {activePage === "meal"
                      ? "Nutrition"
                      : activePage === "meetup"
                        ? "Schedule"
                        : activePage === "equipment"
                          ? "Gear"
                          : activePage === "objective"
                            ? "Blueprint"
                            : activePage === "coach"
                              ? "Faculty"
                              : activePage === "terms"
                                ? "Policy"
                                : "Literature"}
                  </span>

                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
                    {activePage === "meal"
                      ? "Meals"
                      : activePage === "meetup"
                        ? "Sessions"
                        : activePage === "equipment"
                          ? "Equipment"
                          : activePage === "objective"
                            ? "Objectives"
                            : activePage === "coach"
                              ? "Coaches"
                              : activePage === "terms"
                                ? "Terms & Rules"
                                : "References"}
                  </h1>

                  <p className="text-xs text-white/75 font-normal">
                    {activePage === "meal"
                      ? "Daily whole-food nutrition and recovery hydration."
                      : activePage === "meetup"
                        ? "Interactive live meetups and workshops."
                        : activePage === "equipment"
                          ? "Required training gear checklist."
                          : activePage === "objective"
                            ? "Target audience, methodology & expected outcomes."
                            : activePage === "coach"
                              ? "Certified longevity practitioners & dedicated cohort mentors."
                              : activePage === "terms"
                                ? "Cohort community guidelines, safety policies & daily cadence."
                                : "Clinical studies & scientific literature citations."}
                  </p>
                </div>
              </div>
            </div>

            {/* CURVED SHEET CONTAINER (AIRY, SPACIOUS, ZERO NESTED BOXES) */}
            <div className="relative -mt-8 sm:-mt-10 z-10 rounded-t-[32px] sm:rounded-t-[36px] border-t border-x border-zinc-200 dark:border-white/15 bg-white dark:bg-[#141414] shadow-2xl pt-9 px-6 sm:px-8 pb-32 max-w-xl mx-auto w-full flex-1">
              {/* 1. MEAL GUIDE: ALL DAYS DAY 1 TO END */}
              {activePage === "meal" && (
                <div className="space-y-7">
                  {/* Clean Page Overview Banner */}
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                        Daily Nutrition Protocols
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {mealDays.length} Days Planned
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Tailored whole-food nutrition and circadian hydration guidelines to fuel functional workouts and cellular recovery.
                    </p>
                  </div>

                  {/* Clean Day-by-Day Meal Rows separated by crisp hairlines */}
                  <div className="divide-y divide-zinc-200/90 dark:divide-white/10">
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

                      return (
                        <div
                          key={d.id}
                          className={`py-5 first:pt-2 last:pb-2 space-y-3 transition ${
                            isToday
                              ? "px-4 sm:px-5 -mx-2 rounded-2xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/15 my-2"
                              : ""
                          }`}
                        >
                          {/* Header: Day + Date + Today/Logged Badge */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-mono font-bold tracking-wide ${
                                  isToday
                                    ? "text-zinc-950 dark:text-white"
                                    : isPast
                                      ? "text-zinc-500 dark:text-zinc-400"
                                      : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                Day {d.dayNumber}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-700">•</span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatShortDayDate(d.unlockDate, d.dayNumber)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {complianceLabel && (
                                <span className="h-5 px-2 rounded-full bg-zinc-100 dark:bg-white/10 text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-300 inline-flex items-center">
                                  {complianceLabel}
                                </span>
                              )}
                              {isToday && (
                                <span className="h-5 px-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[10px] font-mono font-semibold uppercase tracking-wider inline-flex items-center">
                                  Today
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Meal Items */}
                          {rawLines.length > 0 ? (
                            <ul className="space-y-2">
                              {rawLines.map((line, idx) => (
                                <li
                                  key={idx}
                                  className={`text-xs sm:text-sm flex items-start gap-2.5 leading-relaxed ${
                                    isPast ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5 shrink-0">
                                    M{idx + 1}
                                  </span>
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                              Balanced whole-food nutrition and recovery hydration.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. MEETUPS & LIVE: ONLY MEETUPS / ZOOM SESSIONS */}
              {activePage === "meetup" && (
                <div className="space-y-7">
                  {/* Clean Page Overview Banner */}
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                        Live Cohort Sessions
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {meetupDays.length} Sessions
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Interactive live webinars, movement clinics, and onsite cohort gatherings.
                    </p>
                  </div>

                  {meetupDays.length > 0 ? (
                    <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                      {meetupDays.map((d) => {
                        const meetUrl = safeHttpUrl(d.meetupLink);
                        const mapUrl = safeHttpUrl(d.mapLink);
                        const isToday = d.id === currentDayId;
                        const isPast = !isToday && (d.isPast2359 || (currentDay ? d.dayNumber < currentDay.dayNumber : false));

                        return (
                          <div
                            key={d.id}
                            className={`py-5 transition-all space-y-3 ${
                              isToday
                                ? "border-l-2 border-zinc-950 dark:border-white pl-4"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-zinc-950 dark:text-white">
                                    Day {d.dayNumber}
                                  </span>
                                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                                  <span className="text-xs text-zinc-500">
                                    {formatShortDayDate(d.unlockDate, d.dayNumber)}
                                  </span>
                                  {isToday && (
                                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold">
                                      Today
                                    </span>
                                  )}
                                  {isPast && (
                                    <span className="text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 ml-1">
                                      • Concluded
                                    </span>
                                  )}
                                </div>
                                <h3
                                  className={`text-sm sm:text-base font-semibold mt-1.5 ${
                                    isPast ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-950 dark:text-white"
                                  }`}
                                >
                                  {d.eventTitle || d.title || "Live Coaching Session"}
                                </h3>
                              </div>
                              {d.onsiteSchedule && (
                                <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  <span>{d.onsiteSchedule}</span>
                                </span>
                              )}
                            </div>

                            {d.eventDetails && (
                              <p
                                className={`text-xs sm:text-sm leading-relaxed ${
                                  isPast ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-600 dark:text-zinc-300"
                                }`}
                              >
                                {d.eventDetails}
                              </p>
                            )}

                            {(d.onsiteVenue || program.venueAddress) && (
                              <div className="flex items-start gap-2 text-xs sm:text-sm text-zinc-500 pt-0.5">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400" />
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
                                    className={`h-9 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition ${
                                      isPast
                                        ? "bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10"
                                        : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
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
                                    className="h-9 px-4 rounded-full border border-zinc-200 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition hover:bg-zinc-50 dark:hover:bg-white/5"
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
                    <div className="py-16 text-center text-xs text-zinc-400">
                      No live sessions scheduled for this program.
                    </div>
                  )}
                </div>
              )}

              {/* 3. EQUIPMENT: CLEAN GEAR CHECKLIST */}
              {activePage === "equipment" && (
                <div className="space-y-7">
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                        Gear Checklist
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {equipmentItems.length} items
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Essential training props and mobility gear recommended for daily sessions.
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                    {equipmentItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="py-4 flex items-center gap-3.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-zinc-950 dark:text-white shrink-0" />
                        <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. OBJECTIVES & BLUEPRINT: FLAT SHEET SECTIONS */}
              {activePage === "objective" && (
                <div className="space-y-7">
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Curriculum Blueprint
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Audience specifications, core methodology, and physiological adaptation targets.
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                    {/* Audience & Logistics */}
                    <div className="py-5 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                        Audience &amp; Logistics
                      </span>
                      <dl className="divide-y divide-zinc-200/80 dark:divide-white/10 text-xs sm:text-sm">
                        <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <dt className="text-zinc-500 font-medium text-xs font-mono uppercase">Target Audience</dt>
                          <dd className="font-semibold text-zinc-900 dark:text-white sm:text-right">
                            {program.recommendedFor || program.audience || "All Levels • Mindful Longevity"}
                          </dd>
                        </div>
                        <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <dt className="text-zinc-500 font-medium text-xs font-mono uppercase">Daily Commitment</dt>
                          <dd className="font-semibold text-zinc-900 dark:text-white sm:text-right">
                            {program.dailyCommitment || "20–30 mins/day"}
                          </dd>
                        </div>
                        <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <dt className="text-zinc-500 font-medium text-xs font-mono uppercase">Intensity Level</dt>
                          <dd className="font-semibold text-zinc-900 dark:text-white sm:text-right">
                            {formatIntensityBadge(program.difficultyLevel)}
                          </dd>
                        </div>
                        <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <dt className="text-zinc-500 font-medium text-xs font-mono uppercase">Delivery &amp; Location</dt>
                          <dd className="font-semibold text-zinc-900 dark:text-white sm:text-right">
                            {program.locationType || "Online Studio"}
                          </dd>
                        </div>
                        {program.equipment && (
                          <div className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                            <dt className="text-zinc-500 font-medium text-xs font-mono uppercase">Gear Needed</dt>
                            <dd className="font-semibold text-zinc-900 dark:text-white sm:text-right">
                              {program.equipment}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {/* Methodology */}
                    <div className="py-4 sm:py-5 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                        Methodology &amp; Core Focus
                      </span>
                      <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {program.methodology || program.description || "Evidence-based somatic training combined with structured recovery routines and circadian alignment."}
                      </p>
                    </div>

                    {/* Target State */}
                    <div className="py-4 sm:py-5 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                        Target Physical &amp; Mental State
                      </span>
                      <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {program.targetState || "Optimal physical vitality, enhanced postural stability, regulated nervous system tone, and restored metabolic recovery."}
                      </p>
                    </div>

                    {/* Expected Outcomes */}
                    <div className="py-4 sm:py-5 space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                        Expected Benefits &amp; Outcomes
                      </span>
                      <ul className="space-y-2.5">
                        {(program.expectedBenefits && program.expectedBenefits.length > 0
                          ? program.expectedBenefits
                          : [
                              "Sustained all-day physical energy and enhanced mental focus without mid-day crashes.",
                              "Noticeable improvement in deep sleep duration and nighttime recovery scores.",
                              "Enhanced joint mobility, core stability, and functional movement mechanics.",
                              "Sustainable whole-food nutrition habits and reduced systemic metabolic strain.",
                            ]
                        ).map((benefit, i) => (
                          <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            <Check className="w-4 h-4 text-zinc-950 dark:text-white shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Practical Guidelines */}
                    {program.programGuidelines && program.programGuidelines.length > 0 && (
                      <div className="py-4 sm:py-5 space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                          Practical Guidelines
                        </span>
                        <ul className="space-y-2 list-disc pl-4 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {program.programGuidelines.map((g, i) => (
                            <li key={i}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. CLINICAL REFERENCES */}
              {activePage === "reference" && (
                <div className="space-y-7">
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                        Scientific Citations
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                        {validReferences.length} sources
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Peer-reviewed clinical studies and research trials supporting this curriculum.
                    </p>
                  </div>

                  {validReferences.length > 0 ? (
                    <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                      {validReferences.map((ref, idx) => {
                        const url = safeHttpUrl(ref.url);
                        return (
                          <div
                            key={idx}
                            className="py-4 sm:py-5 flex items-start justify-between gap-4"
                          >
                            <div className="min-w-0 space-y-1">
                              <span className="text-[10px] font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                                Source {String(idx + 1).padStart(2, "0")}
                              </span>
                              <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white leading-relaxed">
                                {ref.title}
                              </p>
                            </div>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 h-9 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition hover:opacity-90 shadow-2xs"
                              >
                                <span>Read Study</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="py-16 text-center text-xs text-zinc-400">
                      No clinical references cited for this program.
                    </p>
                  )}
                </div>
              )}

              {/* 6. PROGRAM TERMS & RULES */}
              {activePage === "terms" && (
                <div className="space-y-7">
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Program Code of Conduct
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Standards and commitments agreed upon by all enrolled members to maintain safety, focus, and maximum longevity benefits.
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                    {[
                      {
                        title: "1. Daily Cadence & 23:59 WIB Cutoff",
                        desc: "Curriculum tasks unlock at 00:00 WIB and must be logged before 23:59 WIB. Daily consistency anchors neural adaptation. Missed tasks can be marked as skipped without penalizing your habit profile.",
                      },
                      {
                        title: "2. Medical Safety & Intuitive Pacing",
                        desc: "Listen to biofeedback. Movement drills should never cause sharp pain. Stop immediately and contact your physician if feeling faint or discomfort.",
                      },
                      {
                        title: "3. Cohort Privacy & Respectful Space",
                        desc: "Everything shared within the cohort (photos, journals, questions) is strictly confidential. Mutual respect and encouragement are mandatory.",
                      },
                      {
                        title: "4. Data Integrity & Truthful Logging",
                        desc: "Log sleep hours, training reps, and meals accurately. Authentic tracking empowers personalized AI adjustments and honest self-discovery.",
                      },
                      {
                        title: "5. Rest Days & Nervous System Restoration",
                        desc: "Rest days are as vital as training days. Respect recovery protocols to allow neuromuscular integration and avoid chronic sympathetic overload.",
                      },
                    ].map((rule, idx) => (
                      <div
                        key={idx}
                        className="py-4 sm:py-5 space-y-1.5"
                      >
                        <h3 className="font-semibold text-zinc-950 dark:text-white text-sm">
                          {rule.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {rule.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. COACHES & MENTORS */}
              {activePage === "coach" && (
                <div className="space-y-7">
                  <div className="pb-5 border-b border-zinc-200/90 dark:border-white/10 space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
                      Dedicated Faculty
                    </span>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Learn with certified longevity practitioners, somatic movement specialists, and clinical nutritionists.
                    </p>
                  </div>

                  <div className="divide-y divide-zinc-200/90 dark:divide-white/10 border-t border-b border-zinc-200/90 dark:border-white/10">
                    {/* Coach 1: Lead Program Coach */}
                    <div className="py-5 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach.webp"
                        alt={program.coachName || "Lead Coach"}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                            {program.coachName || "Coach Julian Thorne"}
                          </h3>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold shrink-0">
                            Lead Guide
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">
                          {program.coachTitle || "Master Longevity & Movement Specialist"}
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                          Specializes in biomechanics, mobility progression, and neuromuscular longevity conditioning. Designed the daily training curriculum for this cohort.
                        </p>
                      </div>
                    </div>

                    {/* Coach 2: Clinical Nutritionist */}
                    <div className="py-5 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach2.webp"
                        alt="Nutrition Specialist"
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                            Dr. Marcus Vance, ND
                          </h3>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold shrink-0">
                            Nutrition
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">
                          Integrative Nutritionist &amp; Metabolic Health Researcher
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
                          Oversees dietary recommendations, circadian fasting windows, and cellular anti-inflammatory nutrition protocols for optimal recovery.
                        </p>
                      </div>
                    </div>

                    {/* Coach 3: Nervous System & Sleep Specialist */}
                    <div className="py-5 flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/coach3.webp"
                        alt="Sleep & Recovery Guide"
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-zinc-200 dark:border-white/10 shadow-sm"
                      />
                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white">
                            Elena Rostova, MSc
                          </h3>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-semibold shrink-0">
                            Recovery
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium">
                          Circadian Somatics &amp; Autonomic Nervous System Coach
                        </p>
                        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pt-1">
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
