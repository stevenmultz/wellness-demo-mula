import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import { checkDistributedRateLimit } from "@/wellness/security/rate-limit";
import { sendWebPushNotification, VAPID_PUBLIC_KEY } from "@/wellness/integrations/web-push";
import { BRAND } from "@/wellness/brand";

const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 10;

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
      const found = await prisma.userPushSubscription.findFirst({
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

    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > 8192) {
      return NextResponse.json({ success: false, message: "Payload too large." }, { status: 413 });
    }

    const rl = await checkDistributedRateLimit(`push-sub:${session.userId}`, {
      maxRequests: 12,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: "Too many push subscription requests. Please try again shortly." },
        { status: 429 }
      );
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

    if (endpointUrl.port || endpointUrl.username || endpointUrl.password) {
      return NextResponse.json(
        { success: false, message: "Push endpoint URL must not include custom ports or credentials." },
        { status: 400 }
      );
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

    const existing = await prisma.userPushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });
    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { success: false, message: "Push endpoint is already registered to another account." },
        { status: 403 }
      );
    }

    if (!existing) {
      const currentSubCount = await prisma.userPushSubscription.count({
        where: { userId: session.userId },
      });
      if (currentSubCount >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
        const oldest = await prisma.userPushSubscription.findFirst({
          where: { userId: session.userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (oldest) {
          await prisma.userPushSubscription.delete({ where: { id: oldest.id } }).catch(() => null);
        }
      }
    }

    // Upsert subscription for current user
    const saved = await prisma.userPushSubscription.upsert({
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
          title: `${BRAND.name} • Web Push Activated`,
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

    await prisma.userPushSubscription.deleteMany({
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
