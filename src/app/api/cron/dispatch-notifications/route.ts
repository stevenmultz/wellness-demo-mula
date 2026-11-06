import { NextRequest, NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";

/**
 * Minutes looked back from "now" (WIB). The production cron runs every minute; lookback covers
 * jitter. Inbox createdAt is the scheduled WIB minute, and the body is the admin message.
 */
const DEFAULT_LOOKBACK_MINUTES = 15;

async function handleCronDispatch(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const secretQuery = searchParams.get("secret");
    const isProd = process.env.NODE_ENV === "production";
    // In production CRON_SECRET MUST be configured; no hardcoded fallback.
    const cronSecret = process.env.CRON_SECRET || (isProd ? "" : "bms_sanctuary_cron_secure_key_2026");

    let bodyJson: {
      simulateTime?: string;
      secret?: string;
      lookbackMinutes?: number;
    } = {};

    if (req.method === "POST") {
      try {
        bodyJson = await req.json();
      } catch {
        // empty body
      }
    }

    // Vercel Cron automatically provides `Authorization: Bearer <CRON_SECRET>`
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const providedSecret = bearerSecret || secretQuery || bodyJson.secret;

    const isAuthorized =
      (!!cronSecret && providedSecret === cronSecret) || process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Valid CRON_SECRET is required." },
        { status: 401 }
      );
    }

    // Resolve the minute window(s) in WIB (UTC+7) - independent of server timezone (Vercel = UTC)
    const nowUtc = new Date();
    const nowSlot = toWibSlot(nowUtc);

    const simulateRaw = searchParams.get("simulateTime") || bodyJson.simulateTime;
    const simulateTime = simulateRaw ? normalizeWibTime(simulateRaw) : null;
    if (simulateRaw && !simulateTime) {
      return NextResponse.json({ success: false, error: "Invalid simulateTime, expected HH:mm (WIB)" }, { status: 400 });
    }

    const lookbackParam = Number(searchParams.get("lookback") ?? bodyJson.lookbackMinutes);
    const lookback =
      Number.isFinite(lookbackParam) && lookbackParam >= 1 ? Math.min(lookbackParam, 120) : DEFAULT_LOOKBACK_MINUTES;

    const slots: DueSlot[] = simulateTime
      ? [{ dateKey: nowSlot.dateKey, time: simulateTime, instant: nowUtc }]
      : getDueSlots(nowUtc, lookback);

    // Published programs with ACTIVE enrollments only
    const programs = await prisma.program.findMany({
      where: {
        OR: [{ status: "PUBLISHED" }, { isPublished: true }],
      },
      include: {
        days: {
          orderBy: { dayNumber: "asc" },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            user: {
              include: {
                pushSubscriptions: true,
              },
            },
          },
        },
      },
    });

    const dispatchResults: Array<{
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
    }> = [];

    const deadEndpoints: string[] = [];
    let totalDispatched = 0;

    for (const prog of programs) {
      if (prog.enrollments.length === 0) continue;

      for (const day of prog.days) {
        const notifications = safeJsonParse<DayNotificationItem[]>(day.dayNotifications, []);
        if (!Array.isArray(notifications) || notifications.length === 0) continue;

        for (const slot of slots) {
          // Simulation ignores the calendar-day window so admins can test any day
          const due = simulateTime
            ? notifications
                .map((item, index) => ({ item, index }))
                .filter(({ item }) => item?.message?.trim() && normalizeWibTime(item.time) === slot.time)
            : selectDueNotifications({ dayNumber: day.dayNumber, dayNotifications: notifications }, prog.startDate, slot);

          for (const { index, item } of due) {
            const dedupeKey = buildCadenceDedupeKey(day.id, slot, index);
            const enrolledUserIds = prog.enrollments.map((e) => e.userId);

            // Users that already received this exact notification (idempotency across cron runs)
            const already = await prisma.userNotification.findMany({
              where: { dedupeKey, userId: { in: enrolledUserIds } },
              select: { userId: true },
            });
            const alreadySet = new Set(already.map((a) => a.userId));
            const recipients = prog.enrollments.filter((e) => !alreadySet.has(e.userId));
            if (recipients.length === 0) continue;

            const message = item.message.trim();

            // In-app inbox row: SAME message as the push payload
            await createUserNotifications(
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

    // Auto-clean expired subscriptions (410/404 Gone)
    let deadCleanedCount = 0;
    if (deadEndpoints.length > 0) {
      const cleanRes = await prisma.pushSubscription.deleteMany({
        where: {
          endpoint: { in: Array.from(new Set(deadEndpoints)) },
        },
      });
      deadCleanedCount = cleanRes.count;
    }

    return NextResponse.json({
      success: true,
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
    });
  } catch (error: unknown) {
    console.error("[Cron Dispatch Error]:", error);
    const msg = error instanceof Error ? error.message : "Server error during cron dispatch";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCronDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleCronDispatch(req);
}
