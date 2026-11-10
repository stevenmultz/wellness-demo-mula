import { NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import { dispatchDueNotifications } from "@/wellness/integrations/dispatch-due-notifications";
import { checkRateLimit } from "@/wellness/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Member sessions call this about once a minute. The server clock (WIB) decides what is due,
 * so Hobby's once-a-day Vercel cron is not the only sender. Time cannot be supplied by the client.
 */
export async function POST() {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  // Rate limit: max 4 tick requests per minute per authenticated user
  const rl = checkRateLimit(`tick:${session.userId}`, {
    windowMs: 60 * 1000,
    maxRequests: 4,
  });

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Rate limit exceeded. Ticking too frequently." },
      { status: 429 }
    );
  }

  try {
    const summary = await dispatchDueNotifications({ lookbackMinutes: 2 });
    return NextResponse.json({ success: true, ...summary });
  } catch (error: unknown) {
    console.error("[Notification Tick Error]:", error);
    const msg = error instanceof Error ? error.message : "Failed to dispatch notifications.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
