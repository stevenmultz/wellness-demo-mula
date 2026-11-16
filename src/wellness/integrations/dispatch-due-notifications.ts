import { prisma } from "@/wellness/db";
import { sendWebPushNotification } from "@/wellness/integrations/web-push";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { safeJsonParse } from "@/wellness/utils/json";
import { BRAND } from "@/wellness/brand";
import {
  buildCadenceDedupeKey,
  getDueSlots,
  normalizeWibTime,
  selectDueNotifications,
  toWibSlot,
  type DayNotificationItem,
  type DueSlot,
} from "@/wellness/utils/notification-schedule";

/** Max simultaneous outbound push requests per dispatched notification (bounded fan-out). */
const PUSH_SEND_CONCURRENCY = 10;

/** Runs `worker` over `items` with at most `limit` in flight; never rejects on worker errors. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return results;
}

export interface DispatchDetail {
  programId: string;
  programTitle: string;
  dayNumber: number;
  scheduledTime: string;
  scheduledDate: string;
  message: string;
  recipientsCount: number;
  skippedAlreadySent: number;
  sentSuccess: number;
  sentFailed: number;
  errors?: string[];
}

export interface DispatchSummary {
  timestampUTC: string;
  currentTimeWIB: string;
  currentDateWIB: string;
  windowWIB: string[];
  simulated: boolean;
  totalProgramsChecked: number;
  notificationsTriggered: number;
  totalDispatched: number;
  deadSubscriptionsPurged: number;
  dispatchedDetails: DispatchDetail[];
}

/**
 * Sends admin-configured day notifications that are due in the WIB window.
 * `createdAt` is the scheduled minute, and the body is the admin message.
 */
export async function dispatchDueNotifications(options: {
  nowUtc?: Date;
  lookbackMinutes?: number;
  simulateTime?: string | null;
  userId?: string;
}): Promise<DispatchSummary> {
  const nowUtc = options.nowUtc ?? new Date();
  const nowSlot = toWibSlot(nowUtc);
  const lookback = Math.min(Math.max(1, options.lookbackMinutes ?? 2), 120);
  const simulateTime = options.simulateTime ? normalizeWibTime(options.simulateTime) : null;
  const scopedUserId = options.userId;

  const slots: DueSlot[] = simulateTime
    ? [{ dateKey: nowSlot.dateKey, time: simulateTime, instant: nowUtc }]
    : getDueSlots(nowUtc, lookback);

  const programs = await prisma.program.findMany({
    take: 200,
    where: {
      OR: [
        { status: { in: ["PUBLISH", "PUBLISHED", "ACTIVE"] } },
        { isPublished: true },
      ],
      ...(scopedUserId
        ? {
            enrollments: {
              some: { status: "ACTIVE", userId: scopedUserId },
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      days: {
        where: {
          dayNotifications: { not: null },
        },
        select: {
          id: true,
          dayNumber: true,
          dayNotifications: true,
        },
        orderBy: { dayNumber: "asc" },
      },
      enrollments: {
        where: {
          status: "ACTIVE",
          ...(scopedUserId ? { userId: scopedUserId } : {}),
        },
        select: {
          userId: true,
          user: {
            select: {
              pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
            },
          },
        },
      },
    },
  });

  const dispatchResults: DispatchDetail[] = [];
  const deadEndpoints: string[] = [];
  let totalDispatched = 0;

  for (const prog of programs) {
    if (prog.enrollments.length === 0 || prog.days.length === 0) continue;

    // Collect all due items across this program's days/slots first, then batch-check existing dedupeKeys once!
    const pendingItems: Array<{
      day: (typeof prog.days)[number];
      slot: DueSlot;
      index: number;
      item: DayNotificationItem;
      dedupeKey: string;
    }> = [];

    for (const day of prog.days) {
      const notifications = safeJsonParse<DayNotificationItem[]>(day.dayNotifications, []);
      if (!Array.isArray(notifications) || notifications.length === 0) continue;

      for (const slot of slots) {
        const due = simulateTime
          ? notifications
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item?.message?.trim() && normalizeWibTime(item.time) === slot.time)
          : selectDueNotifications({ dayNumber: day.dayNumber, dayNotifications: notifications }, prog.startDate, slot);

        for (const { index, item } of due) {
          pendingItems.push({
            day,
            slot,
            index,
            item,
            dedupeKey: buildCadenceDedupeKey(day.id, slot, index),
          });
        }
      }
    }

    if (pendingItems.length === 0) continue;

    const enrolledUserIds = prog.enrollments.map((e) => e.userId);
    const allDedupeKeys = Array.from(new Set(pendingItems.map((p) => p.dedupeKey)));
    const alreadyRows = await prisma.userNotification.findMany({
      where: { dedupeKey: { in: allDedupeKeys }, userId: { in: enrolledUserIds } },
      select: { userId: true, dedupeKey: true },
    });
    const alreadyByKey = new Map<string, Set<string>>();
    for (const row of alreadyRows) {
      if (!row.dedupeKey) continue;
      let set = alreadyByKey.get(row.dedupeKey);
      if (!set) {
        set = new Set<string>();
        alreadyByKey.set(row.dedupeKey, set);
      }
      set.add(row.userId);
    }

    for (const { day, slot, index, item, dedupeKey } of pendingItems) {
      const alreadySet = alreadyByKey.get(dedupeKey) ?? new Set<string>();
      const recipients = prog.enrollments.filter((e) => !alreadySet.has(e.userId));
      if (recipients.length === 0) continue;

      const message = item.message.trim();
      const createdCount = await createUserNotifications(
        recipients.map((enrollment) => ({
          userId: enrollment.userId,
          type: "TASK" as const,
          title: prog.title,
          body: message,
          url: "/dashboard",
          dedupeKey,
          createdAt: slot.instant,
        }))
      );

      // Atomic idempotency check: If 0 rows were inserted (due to duplicate key in concurrent execution), skip push dispatch!
      if (createdCount === 0) continue;

      const subscribers = new Map<string, { endpoint: string; p256dh: string; auth: string }>();
      for (const enrollment of recipients) {
        for (const sub of enrollment.user?.pushSubscriptions || []) {
          if (sub.endpoint && sub.p256dh && sub.auth) {
            subscribers.set(sub.endpoint, { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
          }
        }
      }

      let sentSuccess = 0;
      let sentFailed = 0;
      const errors: string[] = [];
      const subList = Array.from(subscribers.values());
      const sendResults = await mapWithConcurrency(subList, PUSH_SEND_CONCURRENCY, (sub) =>
        sendWebPushNotification(sub, {
          title: prog.title,
          body: message,
          url: "/dashboard",
          tag: `${BRAND.notificationTagPrefix}-${day.id}-${slot.dateKey}-${slot.time}-${index}`,
        })
      );
      for (let s = 0; s < subList.length; s++) {
        const sub = subList[s];
        const sendRes = sendResults[s];
        if (sendRes.success) {
          sentSuccess++;
          totalDispatched++;
        } else {
          sentFailed++;
          if (sendRes.error) errors.push(sendRes.error);
          if (sendRes.isGone) deadEndpoints.push(sub.endpoint);
        }
      }

      dispatchResults.push({
        programId: prog.id,
        programTitle: prog.title,
        dayNumber: day.dayNumber,
        scheduledTime: slot.time,
        scheduledDate: slot.dateKey,
        message,
        recipientsCount: recipients.length,
        skippedAlreadySent: alreadySet.size,
        sentSuccess,
        sentFailed,
        ...(errors.length > 0 ? { errors } : {}),
      });
    }
  }

  let deadCleanedCount = 0;
  if (deadEndpoints.length > 0) {
    const cleanRes = await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: Array.from(new Set(deadEndpoints)) } },
    });
    deadCleanedCount = cleanRes.count;
  }

  return {
    timestampUTC: nowUtc.toISOString(),
    currentTimeWIB: nowSlot.time,
    currentDateWIB: nowSlot.dateKey,
    windowWIB: slots.map((s) => s.time),
    simulated: !!simulateTime,
    totalProgramsChecked: programs.length,
    notificationsTriggered: dispatchResults.length,
    totalDispatched,
    deadSubscriptionsPurged: deadCleanedCount,
    dispatchedDetails: dispatchResults,
  };
}
