import assert from "node:assert/strict";
import {
  buildCadenceDedupeKey,
  getDueSlots,
  normalizeWibTime,
  selectDueNotifications,
} from "../src/wellness/utils/notification-schedule";

// Admin config as persisted by actions/program.ts (JSON string in ProgramDay.dayNotifications)
const ADMIN_MESSAGE = "Waktunya Ritual Pagi: 25 menit gerak sadar.";
const dayNotificationsJson = JSON.stringify([
  { time: "07:00", message: ADMIN_MESSAGE, label: "Morning" },
  { time: "7:05", message: "  Unpadded time works  " },
  { time: "12:30", message: "   " }, // blank -> never sent
  { time: "25:99", message: "invalid time" },
]);
const day = { id: "day1", dayNumber: 1, dayNotifications: JSON.parse(dayNotificationsJson) };
// Batch starts 2026-11-06 (00:00 WIB = 2026-11-05T17:00Z)
const start = new Date("2026-11-05T17:00:00.000Z");

// Simulated dispatcher (same logic as the route, minus DB): returns {body, dedupeKey} per due slot
const inbox = new Set<string>();
function run(nowIso: string, lookback = 1) {
  const sent: Array<{ body: string; key: string }> = [];
  for (const slot of getDueSlots(new Date(nowIso), lookback)) {
    for (const { index, item } of selectDueNotifications(day, start, slot)) {
      const key = buildCadenceDedupeKey(day.id, slot, index);
      if (inbox.has(key)) continue; // dedupe
      inbox.add(key);
      sent.push({ body: item.message.trim(), key }); // inbox body === push body
    }
  }
  return sent;
}

// 07:00 WIB == 00:00 UTC. Production cron runs every minute so any admin HH:mm is delivered.
let r = run("2026-11-06T00:00:10.000Z");
assert.equal(r.length, 1);
assert.equal(r[0].body, ADMIN_MESSAGE);
assert.equal(r[0].key, "cadence:day1:2026-11-06:07:00:0");

// Not sent at other times (06:59 WIB, 07:01 WIB, and the UTC-confusion 07:00 UTC = 14:00 WIB)
assert.equal(run("2026-11-05T23:59:59.000Z").length, 0);
assert.equal(run("2026-11-06T00:01:00.000Z").length, 0);
assert.equal(run("2026-11-06T07:00:00.000Z").length, 0);

// Idempotent: same minute re-run -> no duplicate
assert.equal(run("2026-11-06T00:00:40.000Z").length, 0);

// Lookback window catches delayed cron (07:05 unpadded entry at 07:12 WIB w/ 15 min lookback), no re-send of 07:00
r = run("2026-11-06T00:12:00.000Z", 15);
assert.equal(r.length, 1);
assert.equal(r[0].body, "Unpadded time works");

// Blank / invalid entries never sent even within a wide window
inbox.clear();
r = run("2026-11-06T06:00:00.000Z", 600);
assert.ok(r.every((x) => x.body === ADMIN_MESSAGE || x.body === "Unpadded time works"));

// Day gating: day 2 not unlocked on 2026-11-06 WIB; day 1 over after 23:59 WIB
const day2 = { id: "day2", dayNumber: 2, dayNotifications: day.dayNotifications };
assert.equal(selectDueNotifications(day2, start, getDueSlots(new Date("2026-11-06T00:00:00Z"))[0]).length, 0);
assert.equal(selectDueNotifications(day2, start, getDueSlots(new Date("2026-11-07T00:00:00Z"))[0]).length, 1);
assert.equal(selectDueNotifications(day, start, getDueSlots(new Date("2026-11-07T00:00:00Z"))[0]).length, 0);

// Midnight rollover of the WIB date key
assert.equal(getDueSlots(new Date("2026-11-05T17:00:00Z"))[0].dateKey, "2026-11-06");
assert.equal(getDueSlots(new Date("2026-11-05T16:59:00Z"))[0].dateKey, "2026-11-05");
assert.equal(normalizeWibTime("07:00 WIB"), "07:00");

console.log("notification schedule checks: OK");
