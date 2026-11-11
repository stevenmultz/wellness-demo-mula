"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Dumbbell,
  ExternalLink,
  Info,
  MapPin,
  Moon,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { DailyCheckIn } from "./DailyCheckIn";
import { EmptyState, FloatingHeader, safeHttpUrl } from "./shared";

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
  const [open, setOpen] = useState(false);
  const current = plans.find((p) => p.programId === selectedProgramId) || plans[0] || null;

  return (
    <FloatingHeader visible={visible}>
      <span
        aria-label="+BMS"
        className="select-none cursor-default flex items-center gap-1 text-zinc-950 dark:text-white"
      >
        <span className="font-light text-lg leading-none">+</span>
        <span className="font-geometric font-semibold text-sm tracking-[0.22em] uppercase">BMS</span>
      </span>

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
  onToggleCheck: (task: string, dayId: string) => Promise<void> | void;
  onSelectWorkout: (workout: string, dayId: string, resetChecklist?: boolean) => Promise<void | boolean>;
  onOpenVideo: (dayId: string) => Promise<void | boolean>;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string) => Promise<void | boolean>;
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
  const sleepDone = !!progress?.bedtime && !!progress?.wakeTime;
  const activityDone =
    day?.dayType === "TRAINING_DAY"
      ? !!progress?.videoWatched || !!progress?.isCompleted || (activities.length > 0 && activities.every((name) => checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : day?.dayType === "REST_DAY"
        ? activities.length > 0
          ? activities.every((name) => checks.includes(name))
          : !!progress?.isCompleted
        : !!progress?.eventFeedback || !!progress?.isCompleted;
  const initialDone: [boolean, boolean, boolean, boolean] = [
    sleepDone,
    activityDone,
    !!progress?.mealCompliance,
    !!progress?.dailyReflection,
  ];

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
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-[10px] font-mono font-semibold uppercase tracking-wider text-white">
              {formatIntensityBadge(program.difficultyLevel)}
            </span>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-medium tracking-tight leading-tight truncate">
                {program?.title || "No active program"}
              </h2>
              {program && (
                <p className="mt-1 text-xs text-white/80 truncate">{program.coachName || "—"}</p>
              )}
            </div>
            {program && (
              <button
                type="button"
                onClick={onOpenDetails}
                aria-label="Program details"
                className="shrink-0 w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
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
              <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 space-y-4">
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                    {startsInInfo.headline}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Program begins on <span className="font-medium text-zinc-800 dark:text-zinc-200">{startsInInfo.dateLabel}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenDetails}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition active:scale-98 shadow-sm"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Program Details</span>
                </button>
              </section>

              <ProgramPreparationWidgets
                program={program}
                days={allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays}
                currentDayId={day?.id}
              />

              <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Community</p>
                {community ? (
                  <a
                    href={community}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-zinc-400">Not set</span>
                )}
              </section>

              <ProgramReferencesWidget references={program.scientificReferences} />
            </>
          );
        })()
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3">
            <div className="flex items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-zinc-100 dark:border-white/10 text-sm">
              <div>
                <p className="font-medium tabular-nums">
                  {currentDayNumber > 0 ? `Day ${currentDayNumber}` : "—"}
                  <span className="text-zinc-400 font-normal"> / {totalProgramDays}</span>
                </p>
                {fullProgramDays.length > 0 && (
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {trainingDaysTotal} Training · {restDaysTotal} Rest · {connectDaysTotal} Connect
                  </p>
                )}
              </div>
              <p className="font-medium text-right">{day ? schedule.label.toUpperCase() : "NO OPEN DAY"}</p>
            </div>
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-[11px] text-zinc-500">Completed Day</dt>
                <dd className="mt-0.5 text-lg font-medium tabular-nums">{stats.completed}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500">Skipped Day</dt>
                <dd className="mt-0.5 text-lg font-medium tabular-nums">{stats.skipped}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-zinc-500">Remaining Day</dt>
                <dd className="mt-0.5 text-lg font-medium tabular-nums">{stats.remaining}</dd>
              </div>
            </dl>
          </section>

          <CohortPerformanceCard
            days={fullProgramDays}
            currentDayNumber={currentDayNumber}
          />

          <ProgramPreparationWidgets
            program={program}
            days={fullProgramDays}
            currentDayId={day?.id}
          />

          {day ? (
            <DailyCheckIn
              key={day.id}
              day={day}
              pastDays={historyDays}
              allProgramDays={allProgramDays}
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
            />
          ) : (
            <EmptyState title="No tasks today" description="There is no open session for today." />
          )}

          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Community</p>
            {community ? (
              <a
                href={community}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-semibold inline-flex items-center gap-1"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-[11px] text-zinc-400">Not set</span>
            )}
          </section>

          <ProgramReferencesWidget references={program.scientificReferences} />
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
}: {
  days: PlanDay[];
  currentDayNumber: number;
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

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 space-y-3.5">
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

      {/* 2 & 3. TRAINING & MEAL COUNTS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-xs">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-1 text-xs">
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

function ProgramPreparationWidgets({
  program,
  days,
  currentDayId,
}: {
  program: PlanProgramInfo;
  days: PlanDay[];
  currentDayId?: string;
}) {
  const [activePage, setActivePage] = useState<"meal" | "meetup" | "equipment" | null>(null);
  const sortedDays = useMemo(() => [...days].sort((a, b) => a.dayNumber - b.dayNumber), [days]);
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

  // Days that have meal guidance
  const mealDays = useMemo(() => {
    const withMeals = sortedDays.filter((d) => d.mealRecommendation && d.mealRecommendation.trim().length > 0);
    return withMeals.length > 0 ? withMeals : sortedDays;
  }, [sortedDays]);

  // Clean equipment checklist items
  const equipmentItems = useMemo(() => {
    const rawEquipment = program.equipment || "Movement Mat";
    return rawEquipment
      .split(/\n|,|•|·|;/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }, [program.equipment]);

  return (
    <>
      {/* 3 Preparation Cards (Zero mask-image, Zero GPU overhead, Generous spacing) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <div className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
              <Utensils className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400">
              {mealDays.length} days
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
      </section>

      {/* DEDICATED FULL-SCREEN VIEWS */}
      {activePage &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80] bg-[#f6f6f4] dark:bg-[#0e0e0e] flex flex-col overflow-y-auto">
            <div className="max-w-xl mx-auto w-full pb-24">
              {/* Header Banner */}
              <div className="relative h-36 sm:h-40 w-full bg-zinc-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    activePage === "meal"
                      ? "/pic.webp"
                      : activePage === "meetup"
                        ? "/coach.webp"
                        : "/image.webp"
                  }
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />

                <button
                  type="button"
                  onClick={() => setActivePage(null)}
                  className="absolute top-4 left-4 h-8 px-3 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-medium inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/70">
                    {program.title}
                  </p>
                  <h1 className="text-base sm:text-lg font-semibold tracking-tight mt-0.5">
                    {activePage === "meal"
                      ? "Meal Guide"
                      : activePage === "meetup"
                        ? "Meetups & Live"
                        : "Equipment"}
                  </h1>
                </div>
              </div>

              {/* View Content with Generous Negative Space */}
              <div className="p-5 sm:p-6 space-y-3">
                {/* 1. MEAL GUIDE: ONLY MEALS DAY 1 TO END */}
                {activePage === "meal" && (
                  <div className="space-y-3">
                    {mealDays.map((d) => {
                      const isToday = d.id === currentDayId;
                      const lines = splitActivities(d.mealRecommendation);

                      return (
                        <article
                          key={d.id}
                          className={`rounded-2xl border p-4 bg-white dark:bg-[#141414] space-y-2 ${
                            isToday
                              ? "border-zinc-950 dark:border-white ring-1 ring-zinc-950/10 dark:ring-white/15"
                              : "border-zinc-200 dark:border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white">
                                Day {d.dayNumber}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatShortDayDate(d.unlockDate, d.dayNumber)}
                              </span>
                            </div>
                            {isToday && (
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold">
                                Today
                              </span>
                            )}
                          </div>

                          {lines.length > 1 ? (
                            <ul className="space-y-1.5 pt-1">
                              {lines.map((line, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2 leading-relaxed"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                                  <span>{line}</span>
                                </li>
                              ))}
                            </ul>
                          ) : d.mealRecommendation && d.mealRecommendation.trim() ? (
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line pt-0.5">
                              {d.mealRecommendation}
                            </p>
                          ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Balanced whole-food nutrition and recovery hydration.
                            </p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* 2. MEETUPS & LIVE: ONLY MEETUPS / ZOOM SESSIONS */}
                {activePage === "meetup" && (
                  <div className="space-y-3">
                    {meetupDays.length > 0 ? (
                      meetupDays.map((d) => {
                        const meetUrl = safeHttpUrl(d.meetupLink);
                        const mapUrl = safeHttpUrl(d.mapLink);
                        const isToday = d.id === currentDayId;

                        return (
                          <article
                            key={d.id}
                            className={`rounded-2xl border p-4 bg-white dark:bg-[#141414] space-y-3 ${
                              isToday
                                ? "border-zinc-950 dark:border-white ring-1 ring-zinc-950/10 dark:ring-white/15"
                                : "border-zinc-200 dark:border-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
                                  Day {d.dayNumber} · {formatShortDayDate(d.unlockDate, d.dayNumber)}
                                </span>
                                <p className="text-sm font-semibold text-zinc-950 dark:text-white mt-0.5">
                                  {d.eventTitle || d.title || "Live Session"}
                                </p>
                              </div>
                              {d.onsiteSchedule && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  <span>{d.onsiteSchedule}</span>
                                </span>
                              )}
                            </div>

                            {d.eventDetails && (
                              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                {d.eventDetails}
                              </p>
                            )}

                            {(d.onsiteVenue || program.venueAddress) && (
                              <div className="flex items-start gap-1.5 text-xs text-zinc-500">
                                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-400" />
                                <span>{d.onsiteVenue || program.venueAddress}</span>
                              </div>
                            )}

                            {(meetUrl || mapUrl) && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {meetUrl && (
                                  <a
                                    href={meetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-3.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition"
                                  >
                                    <Video className="w-3.5 h-3.5" />
                                    <span>Join Session</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {mapUrl && (
                                  <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-8 px-3.5 rounded-full border border-zinc-300 dark:border-white/20 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 active:scale-95 transition"
                                  >
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Directions</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 text-center text-xs text-zinc-500">
                        No live sessions scheduled for this program.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. EQUIPMENT: ONLY EQUIPMENT CHECKLIST */}
                {activePage === "equipment" && (
                  <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 space-y-3">
                    <p className="text-xs font-semibold text-zinc-950 dark:text-white">
                      Required Gear ({equipmentItems.length})
                    </p>
                    <ul className="grid grid-cols-1 gap-2.5">
                      {equipmentItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 flex items-center gap-3 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                        >
                          <CheckCircle2 className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
