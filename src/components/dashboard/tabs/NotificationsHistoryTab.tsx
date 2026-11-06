"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, CheckCheck, Loader2 } from "lucide-react";
import {
  HistoryPayload,
  InboxNotification,
  wellnessGetHistory,
  wellnessGetNotifications,
  wellnessMarkAllNotificationsRead,
  wellnessMarkNotificationRead,
} from "@/wellness/actions/activity";
import { usePushNotifications } from "./usePushNotifications";
import {
  EmptyState,
  ErrorState,
  FloatingHeader,
  LoadingState,
  SectionCard,
  formatDateTimeWib,
  formatIdr,
} from "./shared";

const TYPE_LABEL: Record<string, string> = {
  PROGRAM: "Program",
  TASK: "Daily task",
  PAYMENT: "Payment",
  REMINDER: "Reminder",
  ANNOUNCEMENT: "Announcement",
  INFO: "Info",
};

const PAYMENT_BADGE: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  Pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  Expired: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

type Loadable<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

/* -------------------------------------------------------------------------- */
/* HEADER — PWA notification control                                           */
/* -------------------------------------------------------------------------- */
function PushHeader({ visible }: { visible: boolean }) {
  const push = usePushNotifications();

  let description = "Get reminders and daily task updates on this device.";
  if (push.status === "on") description = "Notifications are on for this device.";
  if (push.status === "denied")
    description =
      "Notifications are blocked. Allow them in your browser's site settings, then reload this page.";
  if (push.status === "unsupported") description = push.unsupportedReason || "Notifications are not supported here.";

  return (
    <FloatingHeader visible={visible}>
      <div className="min-w-0 flex items-start gap-3">
        <div className="mt-0.5 w-9 h-9 shrink-0 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center">
          {push.status === "on" ? (
            <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          ) : push.status === "off" || push.status === "checking" ? (
            <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
          ) : (
            <BellOff className="w-4 h-4 text-zinc-500" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-950 dark:text-white">PWA Notification</p>
          <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{description}</p>
          {push.error && (
            <p role="alert" className="mt-1 text-[11px] leading-snug text-red-600 dark:text-red-400">
              {push.error}
            </p>
          )}
          {!push.error && push.notice && (
            <p role="status" className="mt-1 text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">
              {push.notice}
            </p>
          )}
        </div>
      </div>

      {(push.status === "off" || push.status === "on" || push.status === "checking") && (
        <button
          type="button"
          onClick={push.status === "on" ? push.disable : push.enable}
          disabled={push.busy || push.status === "checking"}
          className={`shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50 ${
            push.status === "on"
              ? "border border-zinc-300 dark:border-white/20 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10"
              : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          }`}
        >
          {(push.busy || push.status === "checking") && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{push.status === "on" ? "Turn Off Notification" : "Turn On Notification"}</span>
        </button>
      )}
    </FloatingHeader>
  );
}

/* -------------------------------------------------------------------------- */
/* CONTENT                                                                     */
/* -------------------------------------------------------------------------- */
export function NotificationsHistoryTab({ headerVisible }: { headerVisible: boolean }) {
  const [notifs, setNotifs] = useState<Loadable<{ items: InboxNotification[]; unreadCount: number }>>({
    status: "loading",
  });
  const [history, setHistory] = useState<Loadable<HistoryPayload>>({ status: "loading" });
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifs = useCallback(async () => {
    setNotifs({ status: "loading" });
    try {
      const res = await wellnessGetNotifications();
      if (res.success && res.data) setNotifs({ status: "ready", data: res.data });
      else setNotifs({ status: "error", message: res.message || "Failed to load notifications." });
    } catch {
      setNotifs({ status: "error", message: "Failed to load notifications." });
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistory({ status: "loading" });
    try {
      const res = await wellnessGetHistory();
      if (res.success && res.data) setHistory({ status: "ready", data: res.data });
      else setHistory({ status: "error", message: res.message || "Failed to load history." });
    } catch {
      setHistory({ status: "error", message: "Failed to load history." });
    }
  }, []);

  useEffect(() => {
    loadNotifs();
    loadHistory();
  }, [loadNotifs, loadHistory]);

  const markRead = async (n: InboxNotification) => {
    if (n.isRead || notifs.status !== "ready") return;
    const before = notifs.data;
    setNotifs({
      status: "ready",
      data: {
        unreadCount: Math.max(0, before.unreadCount - 1),
        items: before.items.map((i) => (i.id === n.id ? { ...i, isRead: true } : i)),
      },
    });
    try {
      const res = await wellnessMarkNotificationRead(n.id);
      if (!res.success) throw new Error(res.message);
    } catch {
      setNotifs({ status: "ready", data: before }); // roll back: backend is the source of truth
    }
  };

  const markAllRead = async () => {
    if (notifs.status !== "ready" || notifs.data.unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await wellnessMarkAllNotificationsRead();
      if (res.success) {
        setNotifs({
          status: "ready",
          data: {
            unreadCount: 0,
            items: notifs.data.items.map((i) => ({ ...i, isRead: true })),
          },
        });
      }
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <PushHeader visible={headerVisible} />

      <div className="space-y-4 sm:space-y-5 font-mono">
        {/* SECTION 1 — NOTIFICATION */}
        <SectionCard
          title="Notification"
          right={
            notifs.status === "ready" && notifs.data.unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read ({notifs.data.unreadCount})
              </button>
            ) : undefined
          }
        >
          {notifs.status === "loading" && <LoadingState label="Loading notifications..." />}
          {notifs.status === "error" && <ErrorState message={notifs.message} onRetry={loadNotifs} />}
          {notifs.status === "ready" && notifs.data.items.length === 0 && (
            <EmptyState
              title="No notifications yet"
              description="Program updates, task reminders and payment info will appear here."
            />
          )}
          {notifs.status === "ready" && notifs.data.items.length > 0 && (
            <ul className="space-y-2">
              {notifs.data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    className={`w-full text-left p-3.5 rounded-2xl border flex items-start gap-3 transition ${
                      n.isRead
                        ? "border-zinc-200 dark:border-white/10 bg-transparent"
                        : "border-zinc-300 dark:border-white/25 bg-zinc-50 dark:bg-white/5"
                    }`}
                  >
                    <span
                      aria-label={n.isRead ? "Read" : "Unread"}
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        n.isRead ? "bg-transparent" : "bg-blue-500"
                      }`}
                    />
                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs truncate ${
                            n.isRead
                              ? "font-medium text-zinc-700 dark:text-zinc-300"
                              : "font-bold text-zinc-950 dark:text-white"
                          }`}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                          {TYPE_LABEL[n.type] ?? "Info"}
                        </span>
                      </span>
                      <span className="block text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {n.body}
                      </span>
                      <span className="block text-[10px] text-zinc-500">
                        {formatDateTimeWib(n.createdAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* SECTION 2 — HISTORY */}
        <SectionCard title="History">
          {history.status === "loading" && <LoadingState label="Loading history..." />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={loadHistory} />}
          {history.status === "ready" &&
            history.data.payments.length === 0 &&
            history.data.activities.length === 0 && (
              <EmptyState
                title="No history yet"
                description="Your payments and membership activity will be listed here."
              />
            )}

          {history.status === "ready" && history.data.payments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">
                Payment history
              </p>
              <ul className="space-y-2">
                {history.data.payments.map((p) => (
                  <li
                    key={p.enrollmentId}
                    className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-tight text-zinc-950 dark:text-white">
                        {p.programTitle}
                      </span>
                      <span
                        className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          PAYMENT_BADGE[p.statusLabel]
                        }`}
                      >
                        {p.statusLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>{formatDateTimeWib(p.transactionDate)}</span>
                      <span className="font-bold text-zinc-950 dark:text-white">
                        {p.isFree ? "Free" : formatIdr(p.amount)}
                      </span>
                    </div>
                    {p.reference && (
                      <p className="text-[10px] text-zinc-500 break-all">Ref: {p.reference}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {history.status === "ready" && history.data.activities.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500">
                Membership activity
              </p>
              <ul className="border-l border-zinc-200 dark:border-white/15 ml-1.5 space-y-3">
                {history.data.activities.map((a) => (
                  <li key={a.id} className="pl-4 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                    <p className="text-xs font-medium text-zinc-950 dark:text-white">
                      {a.label} · <span className="uppercase">{a.programTitle}</span>
                    </p>
                    <p className="text-[10px] text-zinc-500">{formatDateTimeWib(a.date)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>
    </>
  );
}
