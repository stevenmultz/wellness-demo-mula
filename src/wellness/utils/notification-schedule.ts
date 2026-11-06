import { getProgramDayWibWindow, WIB_OFFSET_MS } from "./timezone";

/**
 * Pure scheduling helpers for admin-configured day notifications (ProgramDay.dayNotifications).
 * All admin times are WIB (UTC+7) wall-clock "HH:mm" values, independent of the server timezone.
 */

export interface DayNotificationItem {
  time: string;
  message: string;
  label?: string;
}

export interface DueSlot {
  /** WIB calendar date, YYYY-MM-DD */
  dateKey: string;
  /** WIB wall-clock time, HH:mm */
  time: string;
  /** Exact UTC instant of the start of that WIB minute */
  instant: Date;
}

/** Normalises "7:05", "07:05", "07:05 WIB", "07.05" to "07:05"; returns null if invalid. */
export function normalizeWibTime(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const m = String(raw).replace(/WIB/gi, "").trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Formats a UTC instant as WIB date key + HH:mm. */
export function toWibSlot(instant: Date): DueSlot {
  const minuteStart = new Date(Math.floor(instant.getTime() / 60000) * 60000);
  const iso = new Date(minuteStart.getTime() + WIB_OFFSET_MS).toISOString();
  return { dateKey: iso.slice(0, 10), time: iso.slice(11, 16), instant: minuteStart };
}

/**
 * Every WIB minute in (now - lookbackMinutes, now], inclusive of the current minute.
 * A lookback > 1 makes dispatch resilient to cron jitter/delays; idempotency is provided by dedupeKey.
 */
export function getDueSlots(nowUtc: Date, lookbackMinutes = 1): DueSlot[] {
  const n = Math.max(1, Math.floor(lookbackMinutes));
  const slots: DueSlot[] = [];
  const nowMinute = Math.floor(nowUtc.getTime() / 60000) * 60000;
  for (let i = n - 1; i >= 0; i--) {
    slots.push(toWibSlot(new Date(nowMinute - i * 60000)));
  }
  return slots;
}

/**
 * Returns the admin notifications of a day that are due at the given slot.
 * Skips: day not unlocked/already past 23:59 WIB at that instant, invalid time, empty message.
 */
export function selectDueNotifications(
  day: { dayNumber: number; dayNotifications: DayNotificationItem[] },
  programStartDate: Date | string,
  slot: DueSlot
): Array<{ index: number; item: DayNotificationItem }> {
  const { isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(programStartDate, day.dayNumber, slot.instant);
  if (!isCalendarUnlocked || isPast2359) return [];
  const out: Array<{ index: number; item: DayNotificationItem }> = [];
  day.dayNotifications.forEach((item, index) => {
    if (!item || !item.message || !item.message.trim()) return;
    if (normalizeWibTime(item.time) !== slot.time) return;
    out.push({ index, item });
  });
  return out;
}

export function buildCadenceDedupeKey(dayId: string, slot: DueSlot, index: number): string {
  return `cadence:${dayId}:${slot.dateKey}:${slot.time}:${index}`;
}
