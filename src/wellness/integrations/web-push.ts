import webpush from "web-push";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@bms.id";

// Initialize VAPID details once
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (err) {
    console.warn("[WebPush] Failed to initialize VAPID details:", err);
  }
} else {
  console.warn("[WebPush] VAPID keys not configured in environment; push delivery disabled.");
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface SendPushResult {
  success: boolean;
  isGone?: boolean;
  error?: string;
}

export async function sendWebPushNotification(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushNotificationPayload
): Promise<SendPushResult> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, error: "Web Push VAPID keys not configured." };
  }

  const pushSubscription: webpush.PushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth,
    },
  };

  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/favicon.svg",
    badge: payload.badge || "/favicon.svg",
    url: payload.url || "/dashboard",
    tag: payload.tag || "bms-cadence",
    data: payload.data || {},
  });

  try {
    await webpush.sendNotification(pushSubscription, jsonPayload, {
      TTL: 60 * 60 * 24, // 24 hours
      urgency: "high",
    });
    return { success: true };
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    const statusCode = error.statusCode;

    // HTTP 404 or 410 means the user unsubscribed or revoked permission
    if (statusCode === 404 || statusCode === 410) {
      return { success: false, isGone: true, error: "Subscription has expired or is gone (410/404)" };
    }

    return { success: false, error: error.message || "Failed to send web push notification" };
  }
}
