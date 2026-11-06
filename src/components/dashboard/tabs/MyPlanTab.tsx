"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, Compass, Dumbbell, ExternalLink, Info, Leaf, Users } from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
import { DailyCheckIn } from "./DailyCheckIn";
import { EmptyState, FloatingHeader, formatDateWib, safeHttpUrl } from "./shared";

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
  coverImage: string | null;
  startDate: string | Date;
  endDate: string | Date;
  communityLink: string | null;
  totalDays: number;
}

const fieldCls =
  "w-full px-3.5 py-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/15 text-base sm:text-sm text-zinc-950 dark:text-white outline-none focus:border-zinc-500";

function scheduleMeta(dayType: string | undefined) {
  if (dayType === "REST_DAY") {
    return { label: "Rest Day", tone: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200", Icon: Leaf };
  }
  if (dayType === "TRAINING_DAY") {
    return { label: "Training Day", tone: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200", Icon: Dumbbell };
  }
  return { label: "Connect Day", tone: "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200", Icon: Users };
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

function useDeadline(deadlineMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  if (!deadlineMs) return { closed: false, label: "No submission window today" };
  const diff = deadlineMs - now;
  if (diff <= 0) return { closed: true, label: "Submission closed" };
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours >= 1) return { closed: false, label: `Submission closes in ${hours} hour${hours === 1 ? "" : "s"}` };
  return { closed: false, label: `Submission closes in ${Math.max(1, mins)} min` };
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
  onExplore,
  onOpenDetails,
  onToggleCheck,
  onSaveSleep,
  onSaveMeal,
  onSaveReflection,
  onSaveAttendance,
  onSaveWorkoutNotes,
  onUploadPhoto,
}: {
  program: PlanProgramInfo | null;
  plan: ProgramDailyPlan | null;
  day: PlanDay | null;
  stats: PlanStats;
  checklist: string[] | undefined;
  onExplore: () => void;
  onOpenDetails: () => void;
  onToggleCheck: (task: string) => Promise<void> | void;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number) => Promise<void | boolean>;
  onSaveMeal: (compliance: string, notes: string) => Promise<void | boolean>;
  onSaveReflection: (reflection: string, happiness: number) => Promise<void | boolean>;
  onSaveAttendance: (notes: string) => Promise<void | boolean>;
  onSaveWorkoutNotes: (notes: string) => Promise<void | boolean>;
  onUploadPhoto: (type: "before" | "after", url: string) => Promise<void | boolean>;
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
  const deadlineMs = day?.unlockDate ? new Date(day.unlockDate).getTime() + 24 * 60 * 60 * 1000 - 1000 : null;
  const deadline = useDeadline(day?.isPast2359 ? Date.now() - 1000 : deadlineMs);
  const locked = !day || !day.isCalendarUnlocked || day.isPast2359;
  const community = safeHttpUrl(program?.communityLink);

  const segmentCls: Record<PlanStats["segments"][number], string> = {
    done: "bg-white",
    today: "bg-white/55 animate-pulse",
    skipped: "bg-white/25",
    upcoming: "bg-white/10",
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Section 1 — Program banner */}
      <section className="overflow-hidden rounded-[28px] bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-sm">
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full">
          {program?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-light tracking-tight font-geometric leading-tight">
                {program?.title || "No active program"}
              </h2>
              {program && (
                <>
                  <p className="mt-1 text-sm text-white/80 truncate">Coach {program.coachName || "—"}</p>
                  <p className="mt-1.5 text-[10px] tracking-wide text-white/55">
                    {formatDateWib(program.startDate)} – {formatDateWib(program.endDate)}
                  </p>
                </>
              )}
            </div>
            {program && (
              <button
                type="button"
                onClick={onOpenDetails}
                aria-label="Program details"
                className="shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur border border-white/25 flex items-center justify-center active:scale-90 transition"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {!program ? (
        <EmptyState
          title="No active program"
          description="You are not enrolled in an active program yet. Explore available plans to get started."
          action={
            <button type="button" onClick={onExplore} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2">
              <Compass className="w-3.5 h-3.5" /> Explore Plan
            </button>
          }
        />
      ) : (
        <>
          {/* Section 2 — Training day & progress */}
          <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-zinc-900 via-zinc-800 to-black dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-950 border border-zinc-800 dark:border-white/15 shadow-xl shadow-zinc-900/20 p-5 sm:p-6 space-y-6 text-white">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="relative text-5xl font-extralight tracking-tight tabular-nums text-white leading-none">
                  {currentDayNumber > 0 ? `Day ${String(currentDayNumber).padStart(2, "0")}` : "—"}
                </p>
                <p className="mt-2 text-xs text-white/60 uppercase tracking-[0.2em]">
                  {day ? schedule.label : currentDayNumber > 0 ? "Session closed" : "Not started"}
                </p>
              </div>
              <p className="relative text-[11px] text-white/45 tabular-nums pb-1">of {totalProgramDays} days</p>
            </div>

            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalProgramDays}
              aria-valuenow={stats.completed}
              aria-label="Program progress"
              className="relative flex gap-[2px] h-2"
            >
              {stats.segments.map((s, i) => (
                <span key={i} className={`flex-1 rounded-full ${segmentCls[s]}`} />
              ))}
            </div>

            <dl className="relative grid grid-cols-3 text-center divide-x divide-white/10 rounded-2xl bg-white/5 backdrop-blur border border-white/10 py-4">
              {[
                ["Days completed", stats.completed],
                ["Days skipped", stats.skipped],
                ["Days remaining", stats.remaining],
              ].map(([label, value]) => (
                <div key={label} className="px-2">
                  <dd className="text-3xl font-light tabular-nums text-white">{value}</dd>
                  <dt className="mt-1 text-[10px] uppercase tracking-wider text-white/45">{label}</dt>
                </div>
              ))}
            </dl>
            {day && <p className="relative text-[11px] text-white/45 text-center">{deadline.label}</p>}
          </section>

          {/* Section 3 — Daily tasks (guided check-in) */}
          {day ? (
            <DailyCheckIn
              key={day.id}
              day={day}
              locked={locked}
              activities={activities}
              checks={checks}
              initialDone={initialDone}
              onToggleCheck={onToggleCheck}
              onSaveSleep={onSaveSleep}
              onSaveAttendance={onSaveAttendance}
              onSaveWorkoutNotes={onSaveWorkoutNotes}
              onUploadPhoto={onUploadPhoto}
              onSaveMeal={onSaveMeal}
              onSaveReflection={onSaveReflection}
            />
          ) : (
            <EmptyState title="No tasks today" description="There is no open session for today in this program." />
          )}

          <section className="rounded-[28px] bg-gradient-to-br from-zinc-200 via-zinc-100 to-zinc-300 dark:from-zinc-800 dark:via-zinc-900 dark:to-zinc-800 border border-zinc-300/70 dark:border-white/10 p-4 sm:p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-zinc-700 dark:text-zinc-200" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-950 dark:text-white">{program.title} Community</p>
              <p className="text-xs text-zinc-500 mt-0.5">Connect with your coach and the people in this program.</p>
            </div>
            {community ? (
              <a
                href={community}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-[11px] text-zinc-400 shrink-0">Not set</span>
            )}
          </section>
        </>
      )}
    </div>
  );
}
