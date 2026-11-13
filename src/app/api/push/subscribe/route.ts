import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import { sendWebPushNotification, VAPID_PUBLIC_KEY } from "@/wellness/integrations/web-push";

export const dynamic = "force-dynamic";

/**
 * GET /api/push/subscribe[?endpoint=...]
 * Returns the VAPID public key and, when an endpoint is given, whether that exact
 * subscription is registered on the server for the signed-in user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getWellnessSession();
    if (!session || !session.userId) {
      return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const endpoint = new URL(req.url).searchParams.get("endpoint");
    let subscribed = false;
    if (endpoint) {
      const found = await prisma.pushSubscription.findFirst({
        where: { endpoint, userId: session.userId },
        select: { id: true },
      });
      subscribed = !!found;
    }

    return NextResponse.json({ success: true, publicKey: VAPID_PUBLIC_KEY, subscribed });
  } catch (error: unknown) {
    console.error("[WebPush Status Error]:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

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

    if (
      typeof endpoint !== "string" ||
      !/^https:\/\//i.test(endpoint) ||
      endpoint.length > 2048 ||
      typeof keys.p256dh !== "string" ||
      keys.p256dh.length > 512 ||
      typeof keys.auth !== "string" ||
      keys.auth.length > 512
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid push endpoint or key format." },
        { status: 400 }
      );
    }

    // SSRF Prevention: Validate endpoint domain belongs to authorized web push services
    let endpointUrl: URL;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return NextResponse.json({ success: false, message: "Malformed push endpoint URL." }, { status: 400 });
    }

    const hostname = endpointUrl.hostname.toLowerCase();
    const isAllowedPushProvider =
      hostname === "fcm.googleapis.com" ||
      hostname === "android.googleapis.com" ||
      hostname === "updates.push.services.mozilla.com" ||
      hostname.endsWith(".push.services.mozilla.com") ||
      hostname.endsWith(".push.apple.com") ||
      hostname.endsWith(".notify.windows.com");

    if (!isAllowedPushProvider) {
      return NextResponse.json(
        { success: false, message: "Push endpoint domain is not a recognized push service provider." },
        { status: 400 }
      );
    }

    // Ownership check: prevent cross-account push subscription hijacking
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });
    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { success: false, message: "Push endpoint is already registered to another account." },
        { status: 403 }
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
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
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

    if (!endpoint || typeof endpoint !== "string" || endpoint.length > 2048) {
      return NextResponse.json({ success: false, message: "Valid endpoint required." }, { status: 400 });
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
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
