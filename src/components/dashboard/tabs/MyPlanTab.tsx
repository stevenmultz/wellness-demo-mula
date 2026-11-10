"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, ChevronDown, Compass, ExternalLink, Info } from "lucide-react";
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
  description?: string | null;
  locationType?: string | null;
  city?: string | null;
  durationDays?: number;
  coverImage: string | null;
  startDate: string | Date;
  endDate: string | Date;
  communityLink: string | null;
  totalDays: number;
  isUpcoming?: boolean;
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
  onToggleCheck: (task: string, dayId: string) => Promise<void> | void;
  onSelectWorkout: (workout: string, dayId: string) => Promise<void | boolean>;
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
          );
        })()
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] px-4 py-3">
            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-100 dark:border-white/10 text-sm">
              <p className="font-medium tabular-nums">
                {currentDayNumber > 0 ? `Day ${currentDayNumber}` : "—"}
                <span className="text-zinc-400 font-normal"> / {totalProgramDays}</span>
              </p>
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

          {day ? (
            <DailyCheckIn
              key={day.id}
              day={day}
              pastDays={historyDays}
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
        </>
      )}
    </div>
  );
}
