import { describe, expect, it } from "vitest";
import {
  WIB_OFFSET_HOURS,
  calculateSleepDuration,
  getProgramDayWibWindow,
  getWibCalendarDate,
  isRegistrationClosedInWib,
} from "@/wellness/utils/timezone";
import {
  buildCadenceDedupeKey,
  getDueSlots,
  normalizeWibTime,
  selectDueNotifications,
  toWibSlot,
} from "@/wellness/utils/notification-schedule";

describe("Utils: WIB Timezone & Drip Scheduling (UTC+7)", () => {
  it("converts UTC instants to WIB calendar dates across midnight rollover", () => {
    expect(WIB_OFFSET_HOURS).toBe(7);

    // 2026-06-01 16:59:59 UTC == 2026-06-01 23:59:59 WIB
    expect(getWibCalendarDate("2026-06-01T16:59:59.000Z")).toEqual({
      year: 2026,
      month: 5, // 0-indexed June
      date: 1,
    });

    // 2026-06-01 17:00:00 UTC == 2026-06-02 00:00:00 WIB
    expect(getWibCalendarDate("2026-06-01T17:00:00.000Z")).toEqual({
      year: 2026,
      month: 5,
      date: 2,
    });
  });

  it("enforces exact 00:00:00.000 WIB unlock and 23:59:59.999 WIB cutoff boundaries", () => {
    // Batch starts on 2026-06-01 WIB -> Day 1 unlocks 2026-05-31T17:00:00.000Z, cutoff 2026-06-01T16:59:59.999Z
    const batchStart = "2026-06-01T00:00:00.000Z";

    // 1ms before unlock (23:59:59.999 WIB on May 31)
    const beforeUnlock = getProgramDayWibWindow(batchStart, 1, new Date("2026-05-31T16:59:59.999Z"));
    expect(beforeUnlock.isCalendarUnlocked).toBe(false);
    expect(beforeUnlock.isPast2359).toBe(false);

    // Exact 00:00:00.000 WIB unlock
    const atUnlock = getProgramDayWibWindow(batchStart, 1, new Date("2026-05-31T17:00:00.000Z"));
    expect(atUnlock.isCalendarUnlocked).toBe(true);
    expect(atUnlock.isPast2359).toBe(false);
    expect(atUnlock.unlockDate.toISOString()).toBe("2026-05-31T17:00:00.000Z");

    // Exact 23:59:59.999 WIB (still inside window)
    const atCutoff = getProgramDayWibWindow(batchStart, 1, new Date("2026-06-01T16:59:59.999Z"));
    expect(atCutoff.isCalendarUnlocked).toBe(true);
    expect(atCutoff.isPast2359).toBe(false);

    // 1ms past cutoff (00:00:00.000 WIB Day 2)
    const afterCutoff = getProgramDayWibWindow(batchStart, 1, new Date("2026-06-01T17:00:00.000Z"));
    expect(afterCutoff.isCalendarUnlocked).toBe(true);
    expect(afterCutoff.isPast2359).toBe(true);

    // Day 21 unlocks 20 days later (2026-06-21 00:00 WIB = 2026-06-20T17:00:00.000Z)
    const day21 = getProgramDayWibWindow(batchStart, 21, new Date("2026-06-20T17:00:00.000Z"));
    expect(day21.isCalendarUnlocked).toBe(true);
    expect(day21.unlockDate.toISOString()).toBe("2026-06-20T17:00:00.000Z");
  });

  it("evaluates registration deadline cutoff in WIB", () => {
    const deadline = "2026-06-10T00:00:00.000Z"; // 2026-06-10 WIB
    expect(isRegistrationClosedInWib(deadline, new Date("2026-06-10T16:59:59.999Z"))).toBe(false);
    expect(isRegistrationClosedInWib(deadline, new Date("2026-06-10T17:00:00.000Z"))).toBe(true);
  });

  it("calculates sleep duration across midnight and handles invalid inputs", () => {
    expect(calculateSleepDuration("23:00", "06:30")).toEqual({
      hours: 7,
      minutes: 30,
      totalMinutes: 450,
      formatted: "7h 30m",
    });

    expect(calculateSleepDuration("22:00", "06:00")).toEqual({
      hours: 8,
      minutes: 0,
      totalMinutes: 480,
      formatted: "8h",
    });

    expect(calculateSleepDuration("13:15", "14:45")).toEqual({
      hours: 1,
      minutes: 30,
      totalMinutes: 90,
      formatted: "1h 30m",
    });

    expect(calculateSleepDuration(null, "06:00")).toBeNull();
    expect(calculateSleepDuration("invalid", "06:00")).toBeNull();
  });
});

describe("Utils: Admin Notification Cadence Schedule (WIB)", () => {
  it("normalizes varied WIB time formats and rejects invalid hours/minutes", () => {
    expect(normalizeWibTime("7:05")).toBe("07:05");
    expect(normalizeWibTime("07:05 WIB")).toBe("07:05");
    expect(normalizeWibTime("23.59 wib")).toBe("23:59");
    expect(normalizeWibTime("00:00")).toBe("00:00");
    expect(normalizeWibTime("24:00")).toBeNull();
    expect(normalizeWibTime("12:60")).toBeNull();
    expect(normalizeWibTime("morning")).toBeNull();
    expect(normalizeWibTime(null)).toBeNull();
  });

  it("generates chronological WIB minute slots for lookback windows", () => {
    // 2026-06-01T00:02:45Z == 2026-06-01 07:02 WIB
    const slots = getDueSlots(new Date("2026-06-01T00:02:45.000Z"), 3);
    expect(slots.map((s) => `${s.dateKey} ${s.time}`)).toEqual([
      "2026-06-01 07:00",
      "2026-06-01 07:01",
      "2026-06-01 07:02",
    ]);
  });

  it("selects only due notifications within unlocked non-expired WIB day window", () => {
    const day = {
      dayNumber: 1,
      dayNotifications: [
        { time: "07:00 WIB", message: "Morning stretch!" },
        { time: "07:00", message: "   " }, // blank message skipped
        { time: "21:00", message: "Evening reflection" },
      ],
    };

    const start = "2026-06-01T00:00:00.000Z";
    // 07:00 WIB on Day 1 -> 2026-06-01T00:00:00.000Z
    const morningSlot = toWibSlot(new Date("2026-06-01T00:00:30.000Z"));
    const due = selectDueNotifications(day, start, morningSlot);
    expect(due).toHaveLength(1);
    expect(due[0].index).toBe(0);
    expect(due[0].item.message).toBe("Morning stretch!");

    // Day 2 morning -> Day 1 is expired, must return []
    const nextDaySlot = toWibSlot(new Date("2026-06-02T00:00:00.000Z"));
    expect(selectDueNotifications(day, start, nextDaySlot)).toEqual([]);

    // Dedupe key format
    expect(buildCadenceDedupeKey("day_abc", morningSlot, 0)).toBe(
      "cadence:day_abc:2026-06-01:07:00:0"
    );
  });
});
