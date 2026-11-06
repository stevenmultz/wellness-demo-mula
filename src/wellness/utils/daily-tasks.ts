/**
 * DAILY TASK RESOLUTION (WIB / UTC+7)
 * -----------------------------------
 * Derives the "today" and "tomorrow" task lists of a program from the real ProgramDay /
 * ProgramDayProgress rows. "Today" and "tomorrow" are calendar days in Western Indonesia Time
 * (the application timezone), never the server/browser locale, and tomorrow's list never
 * contains today's tasks because the two are resolved from distinct 00:00 WIB window starts.
 */
import { WIB_OFFSET_MS, getProgramDayWibWindow } from "./timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyTaskKind = "SLEEP" | "WORKOUT" | "MEAL" | "REFLECTION" | "REST" | "EVENT";

export interface DailyTask {
  id: string; // stable: `${programDayId}:${kind}`
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
  progress: {
    videoWatched: boolean;
    isCompleted: boolean;
    mealCompliance: string | null;
    dailyReflection: string | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    eventFeedback?: string | null;
    checklistCompleted?: string | null;
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

  tasks.push({
    id: `${day.id}:SLEEP`,
    kind: "SLEEP",
    name: "Sleep Tracking",
    description: "Record yesterday's sleep time and today's wake-up time.",
    isDone: !!p?.bedtime && !!p?.wakeTime,
  });

  if (day.dayType === "TRAINING_DAY") {
    tasks.push({
      id: `${day.id}:WORKOUT`,
      kind: "WORKOUT",
      name: "Daily Activity",
      description: day.title,
      isDone: !!p && (p.isCompleted || p.videoWatched),
    });
  } else if (day.dayType === "REST_DAY") {
    tasks.push({
      id: `${day.id}:REST`,
      kind: "REST",
      name: "Daily Activity",
      description: day.restInstructions || day.title,
      isDone: !!p?.isCompleted || checklistHasItems(p?.checklistCompleted),
    });
  } else {
    tasks.push({
      id: `${day.id}:EVENT`,
      kind: "EVENT",
      name: "Daily Activity",
      description: day.eventTitle || day.eventDetails || day.title,
      isDone: !!p?.isCompleted || !!p?.eventFeedback,
    });
  }

  tasks.push({
    id: `${day.id}:MEAL`,
    kind: "MEAL",
    name: "Meal Tracking",
    description: "Log whether you followed today's meal recommendation.",
    isDone: !!p?.mealCompliance,
  });

  tasks.push({
    id: `${day.id}:REFLECTION`,
    kind: "REFLECTION",
    name: "Daily Reflection",
    description: "Write your daily reflection and rate how your day went.",
    isDone: !!p?.dailyReflection,
  });

  return tasks;
}

/**
 * Resolves today's / tomorrow's day for a program. A day belongs to a calendar date when its
 * 00:00 WIB unlock instant equals that date's WIB window start.
 */
export function resolveProgramDailyPlan(
  programId: string,
  startDate: Date | string,
  days: DailyTaskDayInput[],
  now: Date = new Date()
): ProgramDailyPlan {
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
