import { prisma } from "@/wellness/db";
import { sendWebPushNotification } from "@/wellness/integrations/web-push";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { safeJsonParse } from "@/wellness/utils/json";
import {
  buildCadenceDedupeKey,
  getDueSlots,
  normalizeWibTime,
  selectDueNotifications,
  toWibSlot,
  type DayNotificationItem,
  type DueSlot,
} from "@/wellness/utils/notification-schedule";

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
}): Promise<DispatchSummary> {
  const nowUtc = options.nowUtc ?? new Date();
  const nowSlot = toWibSlot(nowUtc);
  const lookback = Math.min(Math.max(1, options.lookbackMinutes ?? 2), 120);
  const simulateTime = options.simulateTime ? normalizeWibTime(options.simulateTime) : null;

  const slots: DueSlot[] = simulateTime
    ? [{ dateKey: nowSlot.dateKey, time: simulateTime, instant: nowUtc }]
    : getDueSlots(nowUtc, lookback);

  const programs = await prisma.program.findMany({
    where: {
      OR: [{ status: "PUBLISHED" }, { isPublished: true }],
    },
    include: {
      days: { orderBy: { dayNumber: "asc" } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { user: { include: { pushSubscriptions: true } } },
      },
    },
  });

  const dispatchResults: DispatchDetail[] = [];
  const deadEndpoints: string[] = [];
  let totalDispatched = 0;

  for (const prog of programs) {
    if (prog.enrollments.length === 0) continue;

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
          const dedupeKey = buildCadenceDedupeKey(day.id, slot, index);
          const enrolledUserIds = prog.enrollments.map((e) => e.userId);
          const already = await prisma.userNotification.findMany({
            where: { dedupeKey, userId: { in: enrolledUserIds } },
            select: { userId: true },
          });
          const alreadySet = new Set(already.map((a) => a.userId));
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
          for (const sub of Array.from(subscribers.values())) {
            const sendRes = await sendWebPushNotification(sub, {
              title: prog.title,
              body: message,
              url: "/dashboard",
              tag: `bms-cadence-${day.id}-${slot.dateKey}-${slot.time}-${index}`,
            });
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
