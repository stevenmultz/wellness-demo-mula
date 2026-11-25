import { Prisma } from "@prisma/client";
import { prisma } from "@/wellness/db";
import { sendWebPushNotification } from "@/wellness/integrations/web-push";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { safeJsonParse } from "@/wellness/utils/json";
import { BRAND } from "@/wellness/brand";
import {
  computeProgramEndWibCutoffMs,
  getProgramDayWibWindow,
} from "@/wellness/utils/timezone";
import {
  buildCadenceDedupeKey,
  getDueSlots,
  normalizeWibTime,
  selectDueNotifications,
  toWibSlot,
  type DayNotificationItem,
  type DueSlot,
} from "@/wellness/utils/notification-schedule";

const PUSH_SEND_CONCURRENCY = 10;

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

export interface RetentionCleanupSummary {
  expiredEnrollments: number;
  expiredTrackingPassOrders?: number;
  expiredTransactions: number;
  purgedTokens: number;
  purgedRateBuckets: number;
  purgedOldNotifications: number;
}

/**
 * Expires overdue PENDING invoices and cleans up expired tokens / rate-limit buckets / stale read notifications.
 */
export async function runDatabaseRetentionCleanup(nowUtc = new Date()): Promise<RetentionCleanupSummary> {
  const ninetyDaysAgo = new Date(nowUtc.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);

  const [expiredEnr, expiredTx, delReset, delVerify, delBuckets, delOldNotif] =
    await prisma.$transaction([
      prisma.programEnrollment.updateMany({
        where: { status: "PENDING", invoiceExpiresAt: { lt: nowUtc } },
        data: { status: "EXPIRED" },
      }),
      prisma.paymentTransaction.updateMany({
        where: { status: "PENDING", expiresAt: { lt: nowUtc } },
        data: { status: "EXPIRE" },
      }),
      prisma.userPasswordResetToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: oneDayAgo } }, { isUsed: true, createdAt: { lt: oneDayAgo } }] },
      }),
      prisma.userEmailVerificationToken.deleteMany({
        where: { OR: [{ expiresAt: { lt: oneDayAgo } }, { usedAt: { lt: oneDayAgo } }] },
      }),
      prisma.rateLimitBucket.deleteMany({
        where: { expiresAt: { lt: nowUtc } },
      }),
      prisma.userNotification.deleteMany({
        where: { readAt: { lt: ninetyDaysAgo } },
      }),
    ]);

  let expiredPassCount = 0;
  if (
    typeof (prisma as { trackingPassOrder?: { updateMany?: unknown } }).trackingPassOrder
      ?.updateMany === "function"
  ) {
    const passRes = await prisma.trackingPassOrder.updateMany({
      where: { status: "PENDING", invoiceExpiresAt: { lt: nowUtc } },
      data: { status: "EXPIRED" },
    });
    expiredPassCount = passRes.count;
  }

  return {
    expiredEnrollments: expiredEnr.count,
    expiredTrackingPassOrders: expiredPassCount,
    expiredTransactions: expiredTx.count,
    purgedTokens: delReset.count + delVerify.count,
    purgedRateBuckets: delBuckets.count,
    purgedOldNotifications: delOldNotif.count,
  };
}

/**
 * Sends H-7 and H-3 renewal reminder notifications for members whose Maintenance / Tracking Pass
 * is approaching expiration. Uses indexed `users.tracking_access_until` + `dedupeKey` (Zero N+1).
 */
export async function dispatchTrackingExpiryReminders(nowUtc = new Date()): Promise<number> {
  if (typeof (prisma as { user?: { findMany?: unknown } }).user?.findMany !== "function") {
    return 0;
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const in7DaysEnd = new Date(nowUtc.getTime() + 7.5 * DAY_MS);
  const BATCH_SIZE = 200;
  const MAX_PAGES = 50;

  let cursorId: string | undefined;
  let totalSent = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const expiringUsers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        trackingAccessUntil: {
          gt: nowUtc,
          lte: in7DaysEnd,
        },
      },
      select: {
        id: true,
        trackingAccessUntil: true,
        enrollments: {
          where: { status: "ACTIVE", program: { deletedAt: null } },
          select: {
            paidAt: true,
            approvedAt: true,
            createdAt: true,
            program: {
              select: {
                locationType: true,
                startAt: true,
                endAt: true,
                durationDays: true,
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });

    if (expiringUsers.length === 0) break;
    cursorId = expiringUsers[expiringUsers.length - 1].id;

    const notifications = expiringUsers
      .map((u) => {
        if (!u.trackingAccessUntil) return null;

        // Skip expiry nudges while the member is still inside an active guided cohort
        const hasActiveCohort = (u.enrollments || []).some((e) => {
          const cutoffMs = computeProgramEndWibCutoffMs({
            locationType: e.program.locationType,
            endAt: e.program.endAt,
            startAt: e.program.startAt,
            durationDays: e.program.durationDays,
            paidAt: e.paidAt ?? e.approvedAt ?? e.createdAt,
          });
          return cutoffMs !== null && nowUtc.getTime() <= cutoffMs;
        });
        if (hasActiveCohort) return null;

        const daysLeft = Math.ceil((u.trackingAccessUntil.getTime() - nowUtc.getTime()) / DAY_MS);
        const milestone = daysLeft <= 3 ? "3d" : daysLeft <= 7 ? "7d" : null;
        if (!milestone) return null;
        const dateStamp = u.trackingAccessUntil.toISOString().slice(0, 10);
        return {
          userId: u.id,
          type: "REMINDER" as const,
          title:
            daysLeft <= 3
              ? `Tracking access expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`
              : `Tracking access expires in ${daysLeft} days`,
          body: "Join a new guided coach batch (14 days + 2 months app bonus) or extend with a 6-Month Independent Tracking Pass to keep logging daily.",
          url: "/dashboard",
          dedupeKey: `tracking-expiry:${milestone}:${u.id}:${dateStamp}`,
        };
      })
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (notifications.length > 0) {
      await createUserNotifications(notifications);
      totalSent += notifications.length;
    }

    if (expiringUsers.length < BATCH_SIZE) break;
  }

  return totalSent;
}

/**
 * Sends admin-configured day notifications due in the WIB window with batched DB reads/writes.
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
      status: "PUBLISHED",
      deletedAt: null,
      OR: [
        { locationType: "HYBRID", startAt: { not: null } },
        { locationType: "ONLINE" },
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
      locationType: true,
      startAt: true,
      days: {
        select: {
          id: true,
          dayNumber: true,
          dayNotificationsJson: true,
        },
        orderBy: { dayNumber: "asc" },
      },
      enrollments: {
        where: {
          status: "ACTIVE",
          ...(scopedUserId ? { userId: scopedUserId } : {}),
        },
        select: {
          id: true,
          userId: true,
          paidAt: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: {
              pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
            },
          },
        },
      },
    },
  });

  // 1. Collect candidate dispatches across ALL programs (HYBRID from batch startAt; ONLINE from each member's join date)
  const candidates: Array<{
    prog: (typeof programs)[number];
    day: (typeof programs)[number]["days"][number];
    slot: DueSlot;
    index: number;
    item: DayNotificationItem;
    dedupeKey: string;
    targetUserIds?: Set<string>;
  }> = [];

  for (const prog of programs) {
    if (prog.enrollments.length === 0 || prog.days.length === 0) continue;

    if (prog.locationType === "ONLINE") {
      // For each active member in an ONLINE program, match their calendar-dripped day today in WIB
      // based on join date (paidAt / approvedAt / createdAt). Members past their final day stop receiving reminders.
      const usersByDayId = new Map<string, Set<string>>();
      for (const enrollment of prog.enrollments) {
        const effectiveStart =
          enrollment.paidAt ?? enrollment.approvedAt ?? enrollment.createdAt ?? prog.startAt;
        if (!effectiveStart) continue;
        const todayDay = prog.days.find((d) => {
          const win = getProgramDayWibWindow(effectiveStart, d.dayNumber, nowUtc);
          return win.isCalendarUnlocked && !win.isPast2359;
        });
        if (!todayDay) continue;
        let userSet = usersByDayId.get(todayDay.id);
        if (!userSet) {
          userSet = new Set<string>();
          usersByDayId.set(todayDay.id, userSet);
        }
        userSet.add(enrollment.userId);
      }

      for (const day of prog.days) {
        const targetUsers = usersByDayId.get(day.id);
        if (!targetUsers || targetUsers.size === 0) continue;

        const rawNotifs = safeJsonParse<DayNotificationItem[]>(day.dayNotificationsJson, []);
        const notifications =
          Array.isArray(rawNotifs) && rawNotifs.length > 0
            ? rawNotifs
            : [
                {
                  time: "08:00",
                  label: "Daily Task Reminder",
                  message: `Day ${day.dayNumber} di ${prog.title} sudah terbuka hari ini. Selesaikan tugas sebelum 23:59 WIB.`,
                },
              ];

        for (const slot of slots) {
          notifications.forEach((item, index) => {
            if (!item?.message?.trim()) return;
            if (normalizeWibTime(item.time) === slot.time) {
              candidates.push({
                prog,
                day,
                slot,
                index,
                item,
                dedupeKey: `online:${buildCadenceDedupeKey(day.id, slot, index)}`,
                targetUserIds: targetUsers,
              });
            }
          });
        }
      }
      continue;
    }

    if (!prog.startAt) continue;

    for (const day of prog.days) {
      const notifications = safeJsonParse<DayNotificationItem[]>(day.dayNotificationsJson, []);
      if (!Array.isArray(notifications) || notifications.length === 0) continue;

      for (const slot of slots) {
        const due = simulateTime
          ? notifications
              .map((item, index) => ({ item, index }))
              .filter(({ item }) => item?.message?.trim() && normalizeWibTime(item.time) === slot.time)
          : selectDueNotifications({ dayNumber: day.dayNumber, dayNotifications: notifications }, prog.startAt, slot);

        for (const { index, item } of due) {
          candidates.push({
            prog,
            day,
            slot,
            index,
            item,
            dedupeKey: buildCadenceDedupeKey(day.id, slot, index),
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return {
      timestampUTC: nowUtc.toISOString(),
      currentTimeWIB: nowSlot.time,
      currentDateWIB: nowSlot.dateKey,
      windowWIB: slots.map((s) => s.time),
      simulated: !!simulateTime,
      totalProgramsChecked: programs.length,
      notificationsTriggered: 0,
      totalDispatched: 0,
      deadSubscriptionsPurged: 0,
      dispatchedDetails: [],
    };
  }

  // 2. Single batched query to find already-sent notifications across all users & dedupeKeys
  const allUserIds = Array.from(
    new Set(candidates.flatMap((c) => c.prog.enrollments.map((e) => e.userId)))
  );
  const allDedupeKeys = Array.from(new Set(candidates.map((c) => c.dedupeKey)));

  const alreadyRows = await prisma.userNotification.findMany({
    where: { dedupeKey: { in: allDedupeKeys }, userId: { in: allUserIds } },
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

  // 3. Batch-insert all missing notifications in ONE createMany({ skipDuplicates: true }) call
  const notificationsToInsert: Parameters<typeof createUserNotifications>[0] = [];
  const candidateTargets: Array<{
    cand: (typeof candidates)[number];
    recipients: (typeof programs)[number]["enrollments"];
    alreadyCount: number;
  }> = [];

  for (const cand of candidates) {
    const alreadySet = alreadyByKey.get(cand.dedupeKey) ?? new Set<string>();
    const recipients = cand.prog.enrollments.filter(
      (e) => (!cand.targetUserIds || cand.targetUserIds.has(e.userId)) && !alreadySet.has(e.userId)
    );
    if (recipients.length === 0) continue;

    const message = cand.item.message.trim();
    candidateTargets.push({ cand, recipients, alreadyCount: alreadySet.size });
    for (const enrollment of recipients) {
      notificationsToInsert.push({
        userId: enrollment.userId,
        type: "TASK" as const,
        title: cand.prog.title,
        body: message,
        url: "/dashboard",
        dedupeKey: cand.dedupeKey,
        createdAt: cand.slot.instant,
      });
    }
  }

  const insertedTotal =
    notificationsToInsert.length > 0 ? await createUserNotifications(notificationsToInsert) : 0;

  const dispatchResults: DispatchDetail[] = [];
  const deadEndpoints: string[] = [];
  let totalDispatched = 0;

  if (insertedTotal > 0) {
    for (const { cand, recipients, alreadyCount } of candidateTargets) {
      const { prog, day, slot, index, item } = cand;
      const message = item.message.trim();

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
        skippedAlreadySent: alreadyCount,
        sentSuccess,
        sentFailed,
        ...(errors.length > 0 ? { errors } : {}),
      });
    }
  }

  let deadCleanedCount = 0;
  if (deadEndpoints.length > 0) {
    const cleanRes = await prisma.userPushSubscription.deleteMany({
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
