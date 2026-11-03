import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import { sendWebPushNotification } from "@/wellness/integrations/web-push";

export async function POST(req: NextRequest) {
  try {
    const session = await getWellnessSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, message: "Invalid subscription payload. Endpoint, p256dh, and auth are required." },
        { status: 400 }
      );
    }

    // Upsert subscription for current user
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: session.userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    // Send immediate welcome test push
    try {
      await sendWebPushNotification(
        {
          endpoint: saved.endpoint,
          p256dh: saved.p256dh,
          auth: saved.auth,
        },
        {
          title: "+ BMS • Web Push Activated",
          body: "Your device is now synced with automated circadian cadence dispatches.",
          url: "/dashboard",
        }
      );
    } catch (err) {
      console.warn("[WebPush] Welcome dispatch notice error:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription registered successfully.",
      subscriptionId: saved.id,
    });
  } catch (error: unknown) {
    console.error("[WebPush Subscribe Error]:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getWellnessSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body || {};

    if (!endpoint) {
      return NextResponse.json({ success: false, message: "Endpoint required." }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId: session.userId,
      },
    });

    return NextResponse.json({ success: true, message: "Push subscription removed." });
  } catch (error: unknown) {
    console.error("[WebPush Unsubscribe Error]:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
