"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PushStatus = "checking" | "unsupported" | "denied" | "off" | "on";

const SW_READY_TIMEOUT_MS = 10000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function getUnsupportedReason(): string | null {
  if (typeof window === "undefined") return "Notifications are not available.";
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (isIos && !isStandalone) {
      return "On iPhone, notifications only work after you add this app to your Home Screen (Share → Add to Home Screen), then open it from there.";
    }
    return "This browser does not support push notifications.";
  }
  return null;
}

function isExpired(sub: PushSubscription): boolean {
  return sub.expirationTime !== null && sub.expirationTime !== undefined && sub.expirationTime <= Date.now();
}

async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration();
  if (!reg) {
    // Service worker not registered yet: register it now instead of failing.
    reg = await navigator.serviceWorker.register("/sw.js");
  }
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("SW_TIMEOUT")), SW_READY_TIMEOUT_MS)
    ),
  ]);
  return ready || reg;
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "The server could not save your notification subscription.");
  }
}

async function deleteSubscription(endpoint: string): Promise<void> {
  const res = await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "The server could not remove your notification subscription.");
  }
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const reason = getUnsupportedReason();
    if (reason) {
      setUnsupportedReason(reason);
      setStatus("unsupported");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;

      if (Notification.permission === "denied") {
        // Permission revoked in browser settings: the old subscription can no longer deliver.
        if (sub) {
          await deleteSubscription(sub.endpoint).catch(() => undefined);
          await sub.unsubscribe().catch(() => undefined);
        }
        setStatus("denied");
        return;
      }

      if (!sub || Notification.permission !== "granted") {
        setStatus("off");
        return;
      }

      if (isExpired(sub)) {
        await deleteSubscription(sub.endpoint).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
        setNotice("Your previous notification subscription expired. Turn notifications on again.");
        setStatus("off");
        return;
      }

      // Confirm the server really knows this subscription; re-register it if it was purged.
      const res = await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && !json.subscribed) {
        await saveSubscription(sub);
      }
      setStatus("on");
    } catch {
      setStatus("off");
    }
  }, []);

  useEffect(() => {
    refresh();

    let permStatus: PermissionStatus | null = null;
    const onChange = () => refresh();
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((p) => {
          permStatus = p;
          p.addEventListener("change", onChange);
        })
        .catch(() => undefined);
    }
    return () => permStatus?.removeEventListener("change", onChange);
  }, [refresh]);

  const enable = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);

    let createdSub: PushSubscription | null = null;
    try {
      const reason = getUnsupportedReason();
      if (reason) {
        setUnsupportedReason(reason);
        setStatus("unsupported");
        return;
      }

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      let reg: ServiceWorkerRegistration;
      try {
        reg = await getReadyRegistration();
      } catch (err) {
        setError(
          err instanceof Error && err.message === "SW_TIMEOUT"
            ? "The service worker is not ready yet. Please reload the app and try again."
            : "The service worker could not be started. Please reload the app and try again."
        );
        return;
      }

      let sub = await reg.pushManager.getSubscription();
      if (sub && isExpired(sub)) {
        await sub.unsubscribe().catch(() => undefined);
        sub = null;
      }

      if (!sub) {
        const keyRes = await fetch("/api/push/subscribe", { cache: "no-store" });
        const keyJson = await keyRes.json().catch(() => null);
        const publicKey: string | undefined =
          keyJson?.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error("Push is not configured on the server.");
        }
        const applicationServerKey = urlBase64ToUint8Array(publicKey);
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as unknown as BufferSource,
          });
        } catch (err) {
          // A subscription created with a different key blocks subscribe(): drop it and retry once.
          if ((err as { name?: string }).name === "InvalidStateError") {
            const stale = await reg.pushManager.getSubscription();
            await stale?.unsubscribe().catch(() => undefined);
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: applicationServerKey as unknown as BufferSource,
            });
          } else {
            throw err;
          }
        }
        createdSub = sub;
      }

      await saveSubscription(sub);
      createdSub = null; // persisted successfully, nothing to roll back
      setStatus("on");
      setNotice("Notifications are on for this device.");
    } catch (err) {
      // Roll back a brand-new browser subscription that the server never accepted.
      if (createdSub) await createdSub.unsubscribe().catch(() => undefined);
      setStatus(Notification.permission === "denied" ? "denied" : "off");
      setError(
        err instanceof Error && err.message
          ? `Could not turn on notifications: ${err.message}`
          : "Could not turn on notifications. Please try again."
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;

      if (sub) {
        // Backend first: if it fails we keep the device subscribed so UI and server never diverge.
        await deleteSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setNotice("Notifications are off for this device.");
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `Could not turn off notifications: ${err.message}`
          : "Could not turn off notifications. Please try again."
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  return { status, busy, error, notice, unsupportedReason, enable, disable, refresh };
}
