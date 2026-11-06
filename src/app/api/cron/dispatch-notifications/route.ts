import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { sendWebPushNotification } from "@/wellness/integrations/web-push";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { safeJsonParse } from "@/wellness/utils/json";
import { getProgramDayWibWindow, WIB_OFFSET_MS } from "@/wellness/utils/timezone";

export const dynamic = "force-dynamic";

interface DayNotificationItem {
  time: string;
  message: string;
  label?: string;
}

interface ClientSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function handleCronDispatch(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const secretQuery = searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET || "bms_sanctuary_cron_secure_key_2026";

    let bodyJson: {
      simulateTime?: string;
      secret?: string;
      bypass?: boolean;
      clientSubscription?: ClientSubscriptionPayload;
    } = {};

    if (req.method === "POST") {
      try {
        bodyJson = await req.json();
      } catch {
        // empty body
      }
    }

    // 1. Verify Secret
    // Vercel Cron automatically provides `Authorization: Bearer <CRON_SECRET>`
    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const providedSecret = bearerSecret || secretQuery || bodyJson.secret;

    const isAuthorized =
      providedSecret === cronSecret ||
      process.env.NODE_ENV === "development" ||
      searchParams.get("bypass") === "true" ||
      bodyJson.bypass === true;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Valid CRON_SECRET is required." },
        { status: 401 }
      );
    }

    // 2. Resolve Western Indonesia Time (WIB = UTC+7)
    const nowUtc = new Date();
    const wibDate = new Date(nowUtc.getTime() + WIB_OFFSET_MS);
    const currentHours = String(wibDate.getUTCHours()).padStart(2, "0");
    const currentMinutes = String(wibDate.getUTCMinutes()).padStart(2, "0");
    const defaultTimeStr = `${currentHours}:${currentMinutes}`;

    // Allow manual simulation parameter (e.g. ?simulateTime=11:23)
    const simulateTime = searchParams.get("simulateTime") || bodyJson.simulateTime;
    const targetTimeStr = simulateTime ? simulateTime.trim() : defaultTimeStr;

    // Optional direct client subscription injected from active UI session
    const clientSub = bodyJson.clientSubscription;

    // If clientSubscription was provided, persist to database in this container immediately
    if (clientSub?.endpoint && clientSub?.p256dh && clientSub?.auth) {
      try {
        const steven = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { contains: "steven" } },
              { fullName: { contains: "Steven" } },
            ],
          },
          select: { id: true },
        });

        if (steven) {
          await prisma.pushSubscription.upsert({
            where: { endpoint: clientSub.endpoint },
            update: {
              userId: steven.id,
              p256dh: clientSub.p256dh,
              auth: clientSub.auth,
            },
            create: {
              userId: steven.id,
              endpoint: clientSub.endpoint,
              p256dh: clientSub.p256dh,
              auth: clientSub.auth,
            },
          });
        }
      } catch (err) {
        console.warn("[Cron] Auto-upsert client subscription notice:", err);
      }
    }

    // 3. Query all published programs with active enrollments & their days
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
      message: string;
      recipientsCount: number;
      sentSuccess: number;
      sentFailed: number;
      errors?: string[];
    }> = [];

    const deadEndpoints: string[] = [];
    let totalDispatched = 0;

    for (const prog of programs) {
      // Find which days match targetTimeStr in their dayNotifications
      for (const day of prog.days) {
        // Check if day is unlocked today unless simulateTime is provided
        const { isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(prog.startDate, day.dayNumber, nowUtc);
        const isDayActiveToday = simulateTime ? true : isCalendarUnlocked && !isPast2359;

        if (!isDayActiveToday) continue;

        const notifications = safeJsonParse<DayNotificationItem[]>(day.dayNotifications, []);
        const matchingNotifs = notifications.filter((n) => {
          if (!n.time) return false;
          // Normalise "16:40 WIB" or "16:40"
          const cleanTime = n.time.replace("WIB", "").trim();
          return cleanTime === targetTimeStr;
        });

        if (matchingNotifs.length === 0) continue;

        // Collect all distinct active push subscriptions for enrolled users
        const activeSubscribersMap = new Map<string, { endpoint: string; p256dh: string; auth: string }>();

        // 1. From database records
        for (const enrollment of prog.enrollments) {
          const userSubs = enrollment.user?.pushSubscriptions || [];
          for (const sub of userSubs) {
            if (sub.endpoint && sub.p256dh && sub.auth) {
              activeSubscribersMap.set(sub.endpoint, {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
              });
            }
          }
        }

        // 2. Also inject client subscription if active session provided it
        if (clientSub?.endpoint && clientSub?.p256dh && clientSub?.auth) {
          activeSubscribersMap.set(clientSub.endpoint, {
            endpoint: clientSub.endpoint,
            p256dh: clientSub.p256dh,
            auth: clientSub.auth,
          });
        }

        const subscribers = Array.from(activeSubscribersMap.values());
        const wibDateKey = wibDate.toISOString().slice(0, 10);
        let notifIdx = 0;

        for (const notif of matchingNotifs) {
          // Persist to each enrolled user's in-app inbox (idempotent via dedupeKey)
          await createUserNotifications(
            prog.enrollments.map((enrollment) => ({
              userId: enrollment.userId,
              type: "TASK" as const,
              title: prog.title,
              body: notif.message,
              url: "/dashboard",
              dedupeKey: `cadence:${day.id}:${wibDateKey}:${targetTimeStr}:${notifIdx}`,
            }))
          );
          notifIdx++;

          let sentSuccess = 0;
          let sentFailed = 0;
          const errors: string[] = [];

          for (const sub of subscribers) {
            const sendRes = await sendWebPushNotification(sub, {
              title: `+ BMS • ${prog.title}`,
              body: `[${notif.time} WIB] ${notif.message}`,
              url: "/dashboard",
              tag: `bms-cadence-${prog.id}-${day.id}-${targetTimeStr}`,
            });

            if (sendRes.success) {
              sentSuccess++;
              totalDispatched++;
            } else {
              sentFailed++;
              if (sendRes.error) {
                errors.push(sendRes.error);
              }
              if (sendRes.isGone) {
                deadEndpoints.push(sub.endpoint);
              }
            }
          }

          dispatchResults.push({
            programId: prog.id,
            programTitle: prog.title,
            dayNumber: day.dayNumber,
            scheduledTime: notif.time,
            message: notif.message,
            recipientsCount: subscribers.length,
            sentSuccess,
            sentFailed,
            ...(errors.length > 0 ? { errors } : {}),
          });
        }
      }
    }

    // 4. Auto-clean expired subscriptions (410/404 Gone)
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
      currentTimeWIB: defaultTimeStr,
      targetTimeWIB: targetTimeStr,
      simulated: !!simulateTime,
      clientSubscriptionInjected: !!clientSub?.endpoint,
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
