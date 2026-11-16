import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  dispatchDueNotifications,
  runDatabaseRetentionCleanup,
} from "@/wellness/integrations/dispatch-due-notifications";
import { normalizeWibTime } from "@/wellness/utils/notification-schedule";
import {
  getCronSecret,
  isProductionEnv,
  MAX_CRON_BODY_BYTES,
} from "@/wellness/config";

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
    const isProd = isProductionEnv();
    // No built-in fallback secret: CRON_SECRET must be configured explicitly in every environment.
    const cronSecret = getCronSecret();

    let bodyJson: {
      simulateTime?: string;
      secret?: string;
      lookbackMinutes?: number;
    } = {};

    const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (req.method === "POST") {
      const contentLength = Number(req.headers.get("content-length") || "0");
      if (contentLength > MAX_CRON_BODY_BYTES) {
        return NextResponse.json(
          { success: false, message: "Request payload too large." },
          { status: 413 }
        );
      }
      try {
        const rawText = await req.text();
        if (rawText.length <= MAX_CRON_BODY_BYTES && rawText.trim().length > 0) {
          bodyJson = JSON.parse(rawText);
        }
      } catch {
        // empty or invalid JSON body
      }
    }

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

    const [summary, retentionCleanup] = await Promise.all([
      dispatchDueNotifications({
        lookbackMinutes: lookback,
        simulateTime,
      }),
      runDatabaseRetentionCleanup().catch((err) => {
        console.warn("[Cron Retention Cleanup Warning]:", err);
        return null;
      }),
    ]);

    return NextResponse.json({ success: true, ...summary, retentionCleanup });
  } catch (error: unknown) {
    console.error("[Cron Dispatch Error]:", error);
    return NextResponse.json({ success: false, error: "Server error during cron dispatch" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCronDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleCronDispatch(req);
}
