import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dispatchDueNotifications } from "@/wellness/integrations/dispatch-due-notifications";
import { normalizeWibTime } from "@/wellness/utils/notification-schedule";

export const dynamic = "force-dynamic";

/**
 * Hobby Vercel cron runs once per day (07:00 WIB). That call is a backup for the morning slot.
 * Other admin times are sent by POST /api/notifications/tick while a member session is open,
 * using the same dispatcher and the server clock in WIB.
 */
const DEFAULT_LOOKBACK_MINUTES = 15;

async function handleCronDispatch(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get("authorization");
    const secretQuery = searchParams.get("secret");
    const isProd = process.env.NODE_ENV === "production";
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

    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    // In production, reject secrets passed in URL query parameters to prevent log leakage
    const providedSecret =
      bearerSecret || bodyJson.secret || (isProd ? null : secretQuery);

    let isAuthorized = false;
    if (cronSecret && providedSecret) {
      const a = Buffer.from(providedSecret);
      const b = Buffer.from(cronSecret);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        isAuthorized = true;
      }
    } else if (process.env.NODE_ENV === "development" && !cronSecret) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Valid CRON_SECRET is required." },
        { status: 401 }
      );
    }

    const simulateRaw = searchParams.get("simulateTime") || bodyJson.simulateTime;
    const simulateTime = simulateRaw ? normalizeWibTime(simulateRaw) : null;
    if (simulateRaw && !simulateTime) {
      return NextResponse.json({ success: false, error: "Invalid simulateTime, expected HH:mm (WIB)" }, { status: 400 });
    }

    const lookbackParam = Number(searchParams.get("lookback") ?? bodyJson.lookbackMinutes);
    const lookback =
      Number.isFinite(lookbackParam) && lookbackParam >= 1 ? Math.min(lookbackParam, 120) : DEFAULT_LOOKBACK_MINUTES;

    const summary = await dispatchDueNotifications({
      lookbackMinutes: lookback,
      simulateTime,
    });

    return NextResponse.json({ success: true, ...summary });
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
