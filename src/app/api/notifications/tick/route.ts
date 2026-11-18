import { NextRequest, NextResponse } from "next/server";
import { getWellnessSession } from "@/wellness/security/session";
import { verifySameOriginRequest } from "@/wellness/security/csrf";
import { dispatchDueNotifications } from "@/wellness/integrations/dispatch-due-notifications";
import { checkDistributedRateLimit } from "@/wellness/security/rate-limit";
import { RATE_LIMITS } from "@/wellness/config";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!verifySameOriginRequest(req)) {
    return NextResponse.json({ success: false, message: "Cross-origin request rejected." }, { status: 403 });
  }
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const rl = await checkDistributedRateLimit(`tick:${session.userId}`, RATE_LIMITS.notificationsTick);

  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, message: "Rate limit exceeded. Ticking too frequently." },
      { status: 429 }
    );
  }

  try {
    const summary = await dispatchDueNotifications({
      lookbackMinutes: 2,
      userId: session.userId,
    });
    return NextResponse.json({
      success: true,
      currentTimeWIB: summary.currentTimeWIB,
      notificationsTriggered: summary.notificationsTriggered,
      dispatchedDetails: summary.dispatchedDetails.map((d) => ({
        programId: d.programId,
        programTitle: d.programTitle,
        dayNumber: d.dayNumber,
        scheduledTime: d.scheduledTime,
        scheduledDate: d.scheduledDate,
        message: d.message,
      })),
    });
  } catch (error: unknown) {
    console.error("[Notification Tick Error]:", error);
    return NextResponse.json({ success: false, message: "Failed to dispatch notifications." }, { status: 500 });
  }
}
