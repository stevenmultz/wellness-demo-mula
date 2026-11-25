/**
 * TIMEZONE & CALENDAR DRIP SCHEDULING UTILITIES (WIB / UTC+7)
 * -------------------------------------------------------------
 * Ensures that all 00:00 Morning Unlocks, 23:59 Nightly Cutoffs,
 * and Registration Deadlines strictly align with Western Indonesia Time (WIB / UTC+7),
 * regardless of whether the Node.js server runs in UTC (Docker/Vercel) or another locale.
 */

export const WIB_OFFSET_HOURS = 7;
export const WIB_OFFSET_MS = WIB_OFFSET_HOURS * 60 * 60 * 1000;

export interface WibCalendarDate {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  date: number;
}

/**
 * Returns the calendar year, month, and date in Western Indonesia Time (UTC+7).
 */
export function getWibCalendarDate(d: Date | string | number): WibCalendarDate {
  const utcDate = new Date(d);
  const wibTime = new Date(utcDate.getTime() + WIB_OFFSET_MS);
  return {
    year: wibTime.getUTCFullYear(),
    month: wibTime.getUTCMonth(),
    date: wibTime.getUTCDate(),
  };
}

/**
 * Formats any Date/ISO timestamp as a canonical WIB calendar date key ("YYYY-MM-DD").
 */
export function formatWibDateKey(d: Date | string | number): string {
  const { year, month, date } = getWibCalendarDate(d);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}

/**
 * Converts any Date/ISO timestamp into a UTC-midnight Date matching the WIB calendar date,
 * suitable for PostgreSQL `@db.Date` columns without timezone shift.
 */
export function toWibDateOnly(d: Date | string | number): Date {
  const { year, month, date } = getWibCalendarDate(d);
  return new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a strict "YYYY-MM-DD" calendar key into a UTC-midnight Date (`@db.Date`).
 * Returns null if the date string is invalid or overflows calendar bounds (e.g. "2026-02-31").
 */
export function parseWibDateKey(key: string): Date | null {
  const m = DATE_KEY_RE.exec(key.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }
  return dt;
}

/**
 * Formats a PostgreSQL `@db.Date` value (already stored as UTC midnight representing WIB date)
 * back to "YYYY-MM-DD" without adding +7h offset.
 */
export function formatDateOnlyKey(dateOnly: Date | string): string {
  if (typeof dateOnly === "string" && DATE_KEY_RE.test(dateOnly.trim())) {
    return dateOnly.trim();
  }
  const dt = new Date(dateOnly);
  if (Number.isNaN(dt.getTime())) return formatWibDateKey(new Date());
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * Adds `days` to a UTC-midnight Date (`@db.Date`) cleanly.
 */
export function addWibDays(dateOnly: Date, days: number): Date {
  return new Date(
    Date.UTC(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate() + days,
      0,
      0,
      0,
      0
    )
  );
}

/**
 * Returns day of week (0 = Sun .. 6 = Sat) strictly in WIB (UTC+7),
 * preventing browser-local timezone shifts in 7-column calendar heatmaps.
 */
export function getWibDayOfWeek(d: Date | string | number): number {
  const utcDate = new Date(d);
  if (Number.isNaN(utcDate.getTime())) return 0;
  return new Date(utcDate.getTime() + WIB_OFFSET_MS).getUTCDay();
}

/**
 * Computes exact unlock timestamp (00:00:00 WIB) and cutoff timestamp (23:59:59.999 WIB)
 * for a program day, strictly aligned to Western Indonesia Time (UTC+7).
 */
export function getProgramDayWibWindow(
  batchStartDate: Date | string,
  dayNumber: number,
  nowUtc: Date = new Date()
) {
  const { year, month, date } = getWibCalendarDate(batchStartDate);

  // Day 1 starts at 00:00:00 WIB on batchStartDate. Day N adds (dayNumber - 1) days.
  const unlockUtcMs =
    Date.UTC(year, month, date + (dayNumber - 1), 0, 0, 0, 0) - WIB_OFFSET_MS;
  const deadlineUtcMs =
    Date.UTC(year, month, date + (dayNumber - 1), 23, 59, 59, 999) - WIB_OFFSET_MS;

  const unlockDate = new Date(unlockUtcMs);
  const deadline2359 = new Date(deadlineUtcMs);

  const currentMs = nowUtc.getTime();
  const isCalendarUnlocked = currentMs >= unlockUtcMs;
  const isPast2359 = currentMs > deadlineUtcMs;

  return {
    unlockDate,
    deadline2359,
    isCalendarUnlocked,
    isPast2359,
  };
}

/**
 * Canonical end-of-program cutoff timestamp (23:59:59.999 WIB on the final scheduled day).
 * Single Source of Truth shared by entitlement checks, SSR dashboard, and client lifecycle views.
 */
export function computeProgramEndWibCutoffMs(params: {
  locationType?: string | null;
  endAt?: Date | string | null;
  startAt?: Date | string | null;
  durationDays?: number | null;
  paidAt?: Date | string | null;
}): number | null {
  const safeDuration = Math.max(1, Math.round(params.durationDays || 1));

  if (params.locationType === "HYBRID" && params.endAt) {
    const { year, month, date } = getWibCalendarDate(params.endAt);
    return Date.UTC(year, month, date, 23, 59, 59, 999) - WIB_OFFSET_MS;
  }

  const baseAnchor =
    params.locationType === "HYBRID"
      ? params.startAt ?? params.paidAt
      : params.paidAt ?? params.startAt;

  if (!baseAnchor) return null;
  const { year, month, date } = getWibCalendarDate(baseAnchor);
  return Date.UTC(year, month, date + (safeDuration - 1), 23, 59, 59, 999) - WIB_OFFSET_MS;
}

/**
 * Checks whether registration for a program has closed in WIB (cutoff at 23:59:59.999 WIB on deadline date).
 */
export function isRegistrationClosedInWib(
  registrationDeadline: Date | string,
  nowUtc: Date = new Date()
): boolean {
  const { year, month, date } = getWibCalendarDate(registrationDeadline);
  const deadlineUtcMs = Date.UTC(year, month, date, 23, 59, 59, 999) - WIB_OFFSET_MS;
  return nowUtc.getTime() > deadlineUtcMs;
}

export interface SleepCalculationResult {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
}

/**
 * Calculates sleep duration across midnight boundary (e.g. Bed: 23:00, Wake: 06:30 -> 7h 30m).
 */
export function calculateSleepDuration(
  bedtime?: string | null,
  wakeTime?: string | null
): SleepCalculationResult | null {
  if (!bedtime || !wakeTime) return null;

  const [bH, bM] = bedtime.split(":").map(Number);
  const [wH, wM] = wakeTime.split(":").map(Number);

  if (isNaN(bH) || isNaN(bM) || isNaN(wH) || isNaN(wM)) return null;

  const bedMinutes = bH * 60 + bM;
  const wakeMinutes = wH * 60 + wM;

  // Formula handles cross-midnight seamlessly: (wake - bed + 1440) % 1440
  const totalMinutes = (wakeMinutes + 1440 - bedMinutes) % 1440;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    hours,
    minutes,
    totalMinutes,
    formatted: minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`,
  };
}
