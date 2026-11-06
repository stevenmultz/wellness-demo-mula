"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Circle,
  Compass,
  Dumbbell,
  ExternalLink,
  Leaf,
  Loader2,
  MapPin,
  Moon,
  Smile,
  Users,
  Utensils,
  Video,
} from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { normalizeVideoEmbed } from "@/wellness/integrations/video-provider";
import { parseWorkoutOptionGroups } from "@/wellness/utils/json";
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

type MealGroups = Record<"Breakfast" | "Lunch" | "Dinner" | "Snacks", string[]>;

function parseMeals(text: string | null | undefined): MealGroups {
  const groups: MealGroups = { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
  if (!text) return groups;
  let bucket: keyof MealGroups | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^(breakfast|lunch|dinner|snacks?)\b[:\-\s]*(.*)$/i);
    if (heading) {
      const key = heading[1].toLowerCase().startsWith("snack")
        ? "Snacks"
        : ((heading[1][0].toUpperCase() + heading[1].slice(1).toLowerCase()) as keyof MealGroups);
      bucket = key;
      if (heading[2]?.trim()) groups[key].push(heading[2].trim());
      continue;
    }
    const clean = line.replace(/^[\s\-*–—\d.)]+/, "").trim();
    if (!clean) continue;
    if (bucket) groups[bucket].push(clean);
    else groups.Breakfast.push(clean);
  }
  return groups;
}

interface MealDraft {
  followed: boolean | null;
  checked: string[];
  actual: string;
}

function readMealDraft(compliance: string | null | undefined, notes: string | null | undefined): MealDraft {
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as Partial<MealDraft> & { v?: number };
      if (parsed && parsed.v === 1) {
        return {
          followed: typeof parsed.followed === "boolean" ? parsed.followed : compliance === "FULL" ? true : compliance ? false : null,
          checked: Array.isArray(parsed.checked) ? parsed.checked.filter((x) => typeof x === "string") : [],
          actual: typeof parsed.actual === "string" ? parsed.actual : "",
        };
      }
    } catch {
      /* plain text notes */
    }
  }
  if (compliance === "FULL") return { followed: true, checked: [], actual: "" };
  if (compliance) return { followed: false, checked: [], actual: notes || "" };
  return { followed: null, checked: [], actual: notes || "" };
}

interface AttendDraft {
  attended: "yes" | "no" | null;
  learned: string;
  feedback: string;
  reason: string;
}

function readAttend(raw: string | null | undefined): AttendDraft {
  if (!raw) return { attended: null, learned: "", feedback: "", reason: "" };
  try {
    const parsed = JSON.parse(raw) as Partial<AttendDraft> & { v?: number };
    if (parsed && parsed.v === 1) {
      return {
        attended: parsed.attended === "yes" || parsed.attended === "no" ? parsed.attended : null,
        learned: parsed.learned || "",
        feedback: parsed.feedback || "",
        reason: parsed.reason || "",
      };
    }
  } catch {
    /* legacy free text */
  }
  return { attended: "yes", learned: raw, feedback: "", reason: "" };
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

export function MyPlanOverview({
  program,
  plan,
  day,
  completedDays,
  checklist,
  onExplore,
  onToggleCheck,
  onSaveSleep,
  onSaveMeal,
  onSaveReflection,
  onSaveAttendance,
}: {
  program: PlanProgramInfo | null;
  plan: ProgramDailyPlan | null;
  day: PlanDay | null;
  completedDays: number;
  checklist: string[] | undefined;
  onExplore: () => void;
  onToggleCheck: (task: string) => Promise<void> | void;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number) => Promise<void>;
  onSaveMeal: (compliance: string, notes: string) => Promise<void>;
  onSaveReflection: (reflection: string, happiness: number) => Promise<void>;
  onSaveAttendance: (notes: string) => Promise<void>;
}) {
  const [openTask, setOpenTask] = useState<PlanTaskId | null>(null);
  const progress = day?.userProgress;
  const bedtime = progress?.bedtime || "";
  const wakeTime = progress?.wakeTime || "";
  const sleepDone = !!bedtime && !!wakeTime;
  const checks = day ? checkedList(day, checklist) : [];
  const schedule = scheduleMeta(day?.dayType);
  const activities =
    day?.dayType === "REST_DAY"
      ? splitActivities(day.restInstructions)
      : day?.dayType === "TRAINING_DAY"
        ? movementNames(day)
        : [];
  const activityDone =
    day?.dayType === "TRAINING_DAY"
      ? !!progress?.videoWatched || !!progress?.isCompleted || (activities.length > 0 && activities.every((name) => checks.some((c) => c.toLowerCase().includes(name.toLowerCase()))))
      : day?.dayType === "REST_DAY"
        ? activities.length > 0
          ? activities.every((name) => checks.includes(name))
          : !!progress?.isCompleted
        : !!progress?.eventFeedback || !!progress?.isCompleted;
  const mealDone = !!progress?.mealCompliance;
  const reflectionDone = !!progress?.dailyReflection;
  const tasks = [
    { id: "sleep" as const, n: "01", title: "Sleep Tracking", description: "Record yesterday's sleep time and today's wake-up time.", done: sleepDone, Icon: Moon },
    { id: "activity" as const, n: "02", title: "Daily Activity", description: day ? schedule.label : "Today's training, rest, or connect session.", done: activityDone, Icon: schedule.Icon },
    { id: "meal" as const, n: "03", title: "Meal Tracking", description: "Follow the meal plan or record what you ate.", done: mealDone, Icon: Utensils },
    { id: "reflection" as const, n: "04", title: "Daily Reflection", description: "How was your day, and how happy are you?", done: reflectionDone, Icon: Smile },
  ];
  const doneCount = tasks.filter((t) => t.done).length;
  const totalProgramDays = program?.totalDays || 0;
  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  const programPct = totalProgramDays ? Math.round((completedDays / totalProgramDays) * 100) : 0;
  const deadlineMs = day?.unlockDate ? new Date(day.unlockDate).getTime() + 24 * 60 * 60 * 1000 - 1000 : null;
  const deadline = useDeadline(day?.isPast2359 ? Date.now() - 1000 : deadlineMs);
  const locked = !day || !day.isCalendarUnlocked || day.isPast2359;
  const community = safeHttpUrl(program?.communityLink);

  if (openTask && day && program) {
    return (
      <TaskDetail
        task={openTask}
        day={day}
        checks={checks}
        activities={activities}
        locked={locked}
        onBack={() => setOpenTask(null)}
        onToggleCheck={onToggleCheck}
        onSaveSleep={onSaveSleep}
        onSaveMeal={onSaveMeal}
        onSaveReflection={onSaveReflection}
        onSaveAttendance={onSaveAttendance}
        done={tasks.find((t) => t.id === openTask)?.done || false}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 shadow-sm">
        <div className="relative aspect-[16/8] sm:aspect-[21/8] w-full">
          {program?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Your program</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-light tracking-tight font-geometric">
              {program?.title || "No active program"}
            </h2>
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
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              ["Program", program.title],
              ["Coach", program.coachName || "Your coach"],
              ["Starts", formatDateWib(program.startDate)],
              ["Ends", formatDateWib(program.endDate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 px-3.5 py-3 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
                <p className="mt-1 text-sm font-medium text-zinc-950 dark:text-white truncate">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[28px] bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 p-5 sm:p-6 space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">Daily progress</p>
                <h3 className="text-lg font-medium text-zinc-950 dark:text-white">
                  {currentDayNumber > 0 ? `Day ${currentDayNumber} of ${totalProgramDays}` : "Program has not started"}
                </h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${schedule.tone}`}>
                <schedule.Icon className="w-3.5 h-3.5" />
                {day ? schedule.label : "No session"}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Program progress</span>
                <span>{completedDays} of {totalProgramDays} days</span>
              </div>
              <Bar value={programPct} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Today&apos;s tasks</span>
                <span>{doneCount} of {tasks.length} completed</span>
              </div>
              <Bar value={(doneCount / tasks.length) * 100} />
              <p className="text-[11px] text-zinc-500">{tasks.length - doneCount} incomplete</p>
            </div>
            <p className={`text-sm font-medium ${deadline.closed ? "text-zinc-500" : "text-zinc-950 dark:text-white"}`}>
              {deadline.label}
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="px-1 text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500">Daily tasks</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tasks.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => day && setOpenTask(task.id)}
                    className="w-full text-left rounded-[24px] bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 p-4 flex gap-3 hover:border-zinc-400 dark:hover:border-white/30 transition"
                  >
                    <span className="text-xs font-semibold tabular-nums text-zinc-400 pt-0.5">{task.n}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-950 dark:text-white">{task.title}</span>
                        {task.done ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-300 shrink-0" />
                        )}
                      </span>
                      <span className="block mt-1 text-xs text-zinc-500 leading-relaxed">{task.description}</span>
                      <span className="mt-2 inline-block text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                        {task.done ? "Completed" : "Open"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[28px] bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 p-4 sm:p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/10 flex items-center justify-center shrink-0">
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

function TaskDetail({
  task,
  day,
  checks,
  activities,
  locked,
  done,
  onBack,
  onToggleCheck,
  onSaveSleep,
  onSaveMeal,
  onSaveReflection,
  onSaveAttendance,
}: {
  task: PlanTaskId;
  day: PlanDay;
  checks: string[];
  activities: string[];
  locked: boolean;
  done: boolean;
  onBack: () => void;
  onToggleCheck: (task: string) => Promise<void> | void;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number) => Promise<void>;
  onSaveMeal: (compliance: string, notes: string) => Promise<void>;
  onSaveReflection: (reflection: string, happiness: number) => Promise<void>;
  onSaveAttendance: (notes: string) => Promise<void>;
}) {
  const title =
    task === "sleep" ? "Sleep Tracking" : task === "activity" ? "Daily Activity" : task === "meal" ? "Meal Tracking" : "Daily Reflection";
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        <ArrowLeft className="w-4 h-4" /> Back to My Plan
      </button>
      <div className="rounded-[28px] bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Day {day.dayNumber}</p>
            <h2 className="text-xl font-medium text-zinc-950 dark:text-white">{title}</h2>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${done ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"}`}>
            {done ? "Completed" : "In progress"}
          </span>
        </div>
        {locked && (
          <p className="text-xs text-zinc-500">
            {!day.isCalendarUnlocked ? "This day is not open yet." : "Submission is closed for this day."}
          </p>
        )}
        {task === "sleep" && <SleepForm day={day} locked={locked} onSave={onSaveSleep} />}
        {task === "activity" && (
          <ActivityForm day={day} activities={activities} checks={checks} locked={locked} onToggle={onToggleCheck} onSaveAttendance={onSaveAttendance} />
        )}
        {task === "meal" && <MealForm day={day} locked={locked} onSave={onSaveMeal} />}
        {task === "reflection" && <ReflectionForm day={day} locked={locked} onSave={onSaveReflection} />}
      </div>
    </div>
  );
}

function sleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

function SleepForm({
  day,
  locked,
  onSave,
}: {
  day: PlanDay;
  locked: boolean;
  onSave: (bedtime: string, wakeTime: string, minutes: number) => Promise<void>;
}) {
  const [bed, setBed] = useState(day.userProgress?.bedtime || "");
  const [wake, setWake] = useState(day.userProgress?.wakeTime || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!bed || !wake) return;
        setBusy(true);
        setMsg(null);
        try {
          await onSave(bed, wake, sleepMinutes(bed, wake));
          setMsg("Saved");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-zinc-500">Record yesterday&apos;s sleep time and today&apos;s wake-up time.</p>
      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        What time did you sleep yesterday?
        <input type="time" required value={bed} disabled={locked} onChange={(e) => setBed(e.target.value)} className={`${fieldCls} mt-1.5`} />
      </label>
      <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
        What time did you wake up today?
        <input type="time" required value={wake} disabled={locked} onChange={(e) => setWake(e.target.value)} className={`${fieldCls} mt-1.5`} />
      </label>
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
      <button type="submit" disabled={locked || busy} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-40 inline-flex items-center gap-2">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
      </button>
    </form>
  );
}

function ActivityForm({
  day,
  activities,
  checks,
  locked,
  onToggle,
  onSaveAttendance,
}: {
  day: PlanDay;
  activities: string[];
  checks: string[];
  locked: boolean;
  onToggle: (task: string) => Promise<void> | void;
  onSaveAttendance: (notes: string) => Promise<void>;
}) {
  const embed = useMemo(() => normalizeVideoEmbed(day.videoUrl), [day.videoUrl]);
  const [draft, setDraft] = useState<AttendDraft>(() => readAttend(day.userProgress?.eventFeedback));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const meta = scheduleMeta(day.dayType);

  if (day.dayType !== "TRAINING_DAY" && day.dayType !== "REST_DAY") {
    return (
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg(null);
          try {
            await onSaveAttendance(JSON.stringify({ v: 1, ...draft }));
            setMsg("Saved");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm text-zinc-500">Today is a {meta.label.toLowerCase()}.</p>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4 space-y-2">
          <p className="text-base font-medium text-zinc-950 dark:text-white">{day.eventTitle || day.title}</p>
          {day.onsiteSchedule && (
            <p className="text-xs text-zinc-500">{day.onsiteSchedule}</p>
          )}
          {(day.meetupLink || day.onsiteVenue || day.mapLink) && (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {day.meetupLink ? (
                <a href={safeHttpUrl(day.meetupLink) || "#"} className="underline break-all" target="_blank" rel="noopener noreferrer">
                  {day.meetupLink}
                </a>
              ) : (
                <span>{day.onsiteVenue || day.mapLink}</span>
              )}
            </p>
          )}
          {day.eventDetails && <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{day.eventDetails}</p>}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-zinc-950 dark:text-white">Did you attend today&apos;s session?</legend>
          {(["yes", "no"] as const).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input type="radio" name="attended" disabled={locked} checked={draft.attended === opt} onChange={() => setDraft((d) => ({ ...d, attended: opt }))} />
              {opt === "yes" ? "Yes" : "No"}
            </label>
          ))}
        </fieldset>
        {draft.attended === "yes" && (
          <>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              What did you learn from today&apos;s session?
              <textarea value={draft.learned} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, learned: e.target.value }))} rows={3} className={`${fieldCls} mt-1.5`} />
            </label>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Any feedback or questions?
              <textarea value={draft.feedback} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, feedback: e.target.value }))} rows={3} className={`${fieldCls} mt-1.5`} />
            </label>
          </>
        )}
        {draft.attended === "no" && (
          <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
            Why you could not attend (optional)
            <textarea value={draft.reason} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))} rows={3} className={`${fieldCls} mt-1.5`} />
          </label>
        )}
        {msg && <p className="text-xs text-emerald-700">{msg}</p>}
        <button type="submit" disabled={locked || busy || !draft.attended} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-40 inline-flex items-center gap-2">
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        {day.dayType === "REST_DAY" ? "Recovery activities for today." : day.title}
      </p>
      {day.dayType === "TRAINING_DAY" && embed.embedUrl && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe title={day.title} src={embed.embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      )}
      {day.dayType === "TRAINING_DAY" && day.videoUrl && !embed.embedUrl && (
        <a href={safeHttpUrl(day.videoUrl) || "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm underline">
          <Video className="w-4 h-4" /> Open training video
        </a>
      )}
      {activities.length === 0 ? (
        <p className="text-sm text-zinc-500">No activities have been assigned for today.</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((name) => {
            const on = checks.some((c) => c === name || c.toLowerCase().includes(name.toLowerCase()));
            return (
              <li key={name}>
                <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-white/10 px-3.5 py-3 text-sm">
                  <input type="checkbox" disabled={locked} checked={on} onChange={() => onToggle(name)} />
                  <span>{name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MealForm({
  day,
  locked,
  onSave,
}: {
  day: PlanDay;
  locked: boolean;
  onSave: (compliance: string, notes: string) => Promise<void>;
}) {
  const groups = parseMeals(day.mealRecommendation);
  const allMeals = (Object.keys(groups) as (keyof MealGroups)[]).flatMap((k) => groups[k]);
  const initial = readMealDraft(day.userProgress?.mealCompliance, day.userProgress?.mealNotes);
  const [draft, setDraft] = useState<MealDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (draft.followed === null) return;
        setBusy(true);
        setMsg(null);
        try {
          await onSave(
            draft.followed ? "FULL" : "OFF_TRACK",
            JSON.stringify({ v: 1, followed: draft.followed, checked: draft.checked, actual: draft.actual })
          );
          setMsg("Saved");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-zinc-500">Recommended meals from your coach.</p>
      {(Object.keys(groups) as (keyof MealGroups)[]).map((key) =>
        groups[key].length === 0 ? null : (
          <div key={key} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500">{key}</p>
            <ul className="space-y-1.5">
              {groups[key].map((meal) => (
                <li key={meal} className="text-sm text-zinc-800 dark:text-zinc-200 rounded-xl bg-zinc-50 dark:bg-white/5 px-3 py-2">
                  {meal}
                </li>
              ))}
            </ul>
          </div>
        )
      )}
      {allMeals.length === 0 && <p className="text-sm text-zinc-500">No meal recommendation was published for today. You can still record what you ate.</p>}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Did you follow today&apos;s meal recommendation?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="follow" disabled={locked} checked={draft.followed === true} onChange={() => setDraft((d) => ({ ...d, followed: true }))} /> Yes
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="follow" disabled={locked} checked={draft.followed === false} onChange={() => setDraft((d) => ({ ...d, followed: false }))} /> No
        </label>
      </fieldset>
      {draft.followed === true && allMeals.length > 0 && (
        <ul className="space-y-1.5">
          {allMeals.map((meal) => (
            <li key={meal}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={draft.checked.includes(meal)}
                  onChange={() =>
                    setDraft((d) => ({
                      ...d,
                      checked: d.checked.includes(meal) ? d.checked.filter((m) => m !== meal) : [...d.checked, meal],
                    }))
                  }
                />
                {meal}
              </label>
            </li>
          ))}
        </ul>
      )}
      {draft.followed === false && (
        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          What did you eat today?
          <textarea value={draft.actual} disabled={locked} onChange={(e) => setDraft((d) => ({ ...d, actual: e.target.value }))} rows={4} className={`${fieldCls} mt-1.5`} />
        </label>
      )}
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
      <button type="submit" disabled={locked || busy || draft.followed === null} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-40 inline-flex items-center gap-2">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save
      </button>
    </form>
  );
}

function ReflectionForm({
  day,
  locked,
  onSave,
}: {
  day: PlanDay;
  locked: boolean;
  onSave: (reflection: string, happiness: number) => Promise<void>;
}) {
  const [text, setText] = useState(day.userProgress?.dailyReflection || "");
  const [score, setScore] = useState(day.userProgress?.happinessRate || 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!score) return;
        setBusy(true);
        setMsg(null);
        try {
          await onSave(text, score);
          setMsg("Saved");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-sm font-medium text-zinc-950 dark:text-white">
        How was your day today?
        <textarea value={text} disabled={locked} onChange={(e) => setText(e.target.value)} rows={5} className={`${fieldCls} mt-1.5`} placeholder="Write about your day" />
      </label>
      <div>
        <p className="text-sm font-medium text-zinc-950 dark:text-white">How satisfied or happy are you today?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              disabled={locked}
              onClick={() => setScore(n)}
              className={`w-9 h-9 rounded-full text-sm font-semibold ${score === n ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950" : "bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {msg && <p className="text-xs text-emerald-700">{msg}</p>}
      <button type="submit" disabled={locked || busy || !score} className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold uppercase tracking-wider disabled:opacity-40 inline-flex items-center gap-2">
        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit
      </button>
    </form>
  );
}
