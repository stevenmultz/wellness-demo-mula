/**
 * DAILY TASK RESOLUTION (WIB / UTC+7)
 * -----------------------------------
 * Derives the "today" and "tomorrow" task lists of a program from the real ProgramDay /
 * ProgramDayProgress rows. "Today" and "tomorrow" are calendar days in Western Indonesia Time
 * (the application timezone), never the server/browser locale, and tomorrow's list never
 * contains today's tasks because the two are resolved from distinct 00:00 WIB window starts.
 */
import { extractWaterMl } from "./nutrition";
import { WIB_OFFSET_MS, getProgramDayWibWindow } from "./timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyTaskKind =
  | "SLEEP"
  | "WORKOUT"
  | "MEAL"
  | "WATER"
  | "REFLECTION"
  | "REST"
  | "EVENT"
  | "CUSTOM";

export interface DailyTask {
  id: string; // stable: `${programDayId}:${kind}` or `${programDayId}:CUSTOM:${customTaskId}`
  kind: DailyTaskKind;
  name: string;
  description: string;
  isDone: boolean;
}

export interface DailyTaskDayInput {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  videoUrl: string | null;
  mealRecommendation: string | null;
  restInstructions: string | null;
  eventTitle: string | null;
  eventDetails: string | null;
  customTasks?: Array<{
    id: string;
    title: string;
    instructions?: string | null;
    isDone: boolean;
  }>;
  progress: {
    videoWatched: boolean;
    isCompleted: boolean;
    mealCompliance: string | null;
    mealNotes?: string | null;
    dailyReflection: string | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    eventFeedback?: string | null;
    checklistCompleted?: string | null;
    workoutNotes?: string | null;
    selectedWorkout?: string | null;
  } | null;
}

export interface ProgramDailyPlan {
  programId: string;
  today: { dayNumber: number; title: string; tasks: DailyTask[] } | null;
  tomorrow: { dayNumber: number; title: string; tasks: DailyTask[] } | null;
}

/** 00:00 WIB (as a UTC instant) of the WIB calendar day that contains `now`. */
export function getWibDayStartMs(now: Date): number {
  const wibMs = now.getTime() + WIB_OFFSET_MS;
  return Math.floor(wibMs / DAY_MS) * DAY_MS - WIB_OFFSET_MS;
}

function checklistHasItems(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return raw.trim().length > 0;
  }
}

export function buildDayTasks(day: DailyTaskDayInput): DailyTask[] {
  const p = day.progress;
  const tasks: DailyTask[] = [];

  const sleepDone = Boolean(
    p?.bedtime && p?.wakeTime && p.bedtime !== "SKIPPED" && p.wakeTime !== "SKIPPED"
  );
  tasks.push({
    id: `${day.id}:SLEEP`,
    kind: "SLEEP",
    name: "Sleep Tracking",
    description: "Record yesterday's sleep time and today's wake-up time.",
    isDone: sleepDone,
  });

  if (day.dayType === "TRAINING_DAY") {
    tasks.push({
      id: `${day.id}:WORKOUT`,
      kind: "WORKOUT",
      name: "Online Training",
      description: day.title,
      isDone:
        !!p &&
        (p.isCompleted ||
          p.videoWatched ||
          (!!p.workoutNotes && p.workoutNotes !== "SKIPPED") ||
          (!!p.selectedWorkout && p.selectedWorkout !== "SKIPPED") ||
          checklistHasItems(p.checklistCompleted)),
    });
  } else if (day.dayType === "REST_DAY") {
    tasks.push({
      id: `${day.id}:REST`,
      kind: "REST",
      name: "Rest Activity",
      description: day.restInstructions || day.title,
      isDone:
        !!p?.isCompleted ||
        (checklistHasItems(p?.checklistCompleted) && p?.checklistCompleted !== "SKIPPED") ||
        (!!p?.workoutNotes && p.workoutNotes !== "SKIPPED"),
    });
  } else {
    tasks.push({
      id: `${day.id}:EVENT`,
      kind: "EVENT",
      name: "Connect",
      description: day.eventTitle || day.eventDetails || day.title,
      isDone:
        !!p?.isCompleted ||
        (!!p?.eventFeedback && p.eventFeedback !== "SKIPPED"),
    });
  }

  tasks.push({
    id: `${day.id}:MEAL`,
    kind: "MEAL",
    name: "Meal Control",
    description: "Log whether you followed today's meal plan & calories.",
    isDone: Boolean(p?.mealCompliance && p.mealCompliance !== "SKIPPED"),
  });

  tasks.push({
    id: `${day.id}:WATER`,
    kind: "WATER",
    name: "Water Intake",
    description: "Log your daily hydration intake (resets daily at 00:00 WIB).",
    isDone: extractWaterMl(p?.mealNotes) > 0,
  });

  if (Array.isArray(day.customTasks)) {
    for (const ct of day.customTasks) {
      tasks.push({
        id: `${day.id}:CUSTOM:${ct.id}`,
        kind: "CUSTOM",
        name: ct.title,
        description: ct.instructions || "Custom checkpoint assigned by your coach.",
        isDone: ct.isDone,
      });
    }
  }

  return tasks;
}

/**
 * Resolves today's / tomorrow's day for a program.
 * - Both HYBRID cohorts (using program startAt) and enrolled ONLINE programs (using member enrollment start date)
 *   resolve by WIB calendar date (00:00 WIB window).
 * - Only falls back to next uncompleted day if no startDate is provided.
 */
export function resolveProgramDailyPlan(
  programId: string,
  startDate: Date | string | null | undefined,
  days: DailyTaskDayInput[],
  now: Date = new Date(),
  locationType?: string | null
): ProgramDailyPlan {
  void locationType;
  if (!startDate) {
    const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);
    const todayDay =
      sorted.find((d) => !d.progress?.isCompleted) || sorted[sorted.length - 1] || null;
    const tomorrowDay = todayDay
      ? sorted.find((d) => d.dayNumber === todayDay.dayNumber + 1) || null
      : null;

    return {
      programId,
      today: todayDay
        ? { dayNumber: todayDay.dayNumber, title: todayDay.title, tasks: buildDayTasks(todayDay) }
        : null,
      tomorrow: tomorrowDay
        ? {
            dayNumber: tomorrowDay.dayNumber,
            title: tomorrowDay.title,
            tasks: buildDayTasks(tomorrowDay),
          }
        : null,
    };
  }

  const todayStart = getWibDayStartMs(now);
  const tomorrowStart = todayStart + DAY_MS;

  const findByStart = (startMs: number) =>
    days.find(
      (d) => getProgramDayWibWindow(startDate, d.dayNumber, now).unlockDate.getTime() === startMs
    ) || null;

  const todayDay = findByStart(todayStart);
  const tomorrowDay = findByStart(tomorrowStart);

  return {
    programId,
    today: todayDay
      ? { dayNumber: todayDay.dayNumber, title: todayDay.title, tasks: buildDayTasks(todayDay) }
      : null,
    tomorrow: tomorrowDay
      ? {
          dayNumber: tomorrowDay.dayNumber,
          title: tomorrowDay.title,
          tasks: buildDayTasks(tomorrowDay),
        }
      : null,
  };
}
