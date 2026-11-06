"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import {
  HistoryPayload,
  InboxNotification,
  wellnessGetHistory,
  wellnessGetNotifications,
  wellnessMarkAllNotificationsRead,
  wellnessMarkNotificationRead,
} from "@/wellness/actions/activity";
import { usePushNotifications } from "./usePushNotifications";
import { EmptyState, ErrorState, FloatingHeader, LoadingState, formatDateTimeWib, formatIdr } from "./shared";

type Section = "notifications" | "activity" | "history";

const NOTIFY_TYPES = new Set(["PROGRAM", "ANNOUNCEMENT", "REMINDER", "INFO", "PAYMENT"]);
const ACTIVITY_TYPES = new Set(["TASK"]);

type Loadable<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

function PushHeader({ visible }: { visible: boolean }) {
  const push = usePushNotifications();
  const canToggle = push.status === "off" || push.status === "on" || push.status === "checking";
  return (
    <FloatingHeader visible={visible}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950 dark:text-white">Alerts</p>
        {push.error && (
          <p role="alert" className="text-[11px] text-red-600 truncate">
            {push.error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {push.status === "denied" && <span className="text-[11px] text-red-600 max-w-[140px] text-right">Blocked in browser settings</span>}
        {push.status === "unsupported" && <span className="text-[11px] text-zinc-500 max-w-[160px] text-right">Unavailable on this device</span>}
        {canToggle && (
          <button
            type="button"
            onClick={push.status === "on" ? push.disable : push.enable}
            disabled={push.busy || push.status === "checking"}
            className="shrink-0 px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {(push.busy || push.status === "checking") && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {push.status === "on" ? "Turn Off Notification" : "Turn On Notification"}
          </button>
        )}
      </div>
    </FloatingHeader>
  );
}

export function NotificationsHistoryTab({ headerVisible }: { headerVisible: boolean }) {
  const [section, setSection] = useState<Section>("notifications");
  const [notifs, setNotifs] = useState<Loadable<{ items: InboxNotification[]; unreadCount: number }>>({ status: "loading" });
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
      setNotifs({ status: "ready", data: before });
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
          data: { unreadCount: 0, items: notifs.data.items.map((i) => ({ ...i, isRead: true })) },
        });
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const items = notifs.status === "ready" ? notifs.data.items : [];
  const notes = items.filter((n) => NOTIFY_TYPES.has(n.type));
  const taskNotes = items.filter((n) => ACTIVITY_TYPES.has(n.type));

  return (
    <>
      <PushHeader visible={headerVisible} />
      <div className="flex p-1 rounded-full bg-zinc-100 dark:bg-white/10">
        {(
          [
            ["notifications", "Notifications"],
            ["activity", "Activity"],
            ["history", "History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`flex-1 py-2 rounded-full text-[11px] font-semibold ${section === key ? "bg-white dark:bg-zinc-950 shadow-sm text-zinc-950 dark:text-white" : "text-zinc-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "notifications" && (
        <section className="space-y-2">
          {notifs.status === "ready" && notifs.data.unreadCount > 0 && (
            <button type="button" onClick={markAllRead} disabled={markingAll} className="text-[11px] font-semibold text-zinc-500 inline-flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
          {notifs.status === "loading" && <LoadingState label="Loading notifications..." />}
          {notifs.status === "error" && <ErrorState message={notifs.message} onRetry={loadNotifs} />}
          {notifs.status === "ready" && notes.length === 0 && (
            <EmptyState title="No notifications" description="Program updates and reminders will show up here." />
          )}
          {notes.map((n) => (
            <button key={n.id} type="button" onClick={() => markRead(n)} className={`w-full text-left rounded-2xl border p-3.5 ${n.isRead ? "border-zinc-200 dark:border-white/10" : "border-zinc-300 bg-white dark:bg-white/5"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className={`text-sm ${n.isRead ? "text-zinc-600" : "font-semibold text-zinc-950 dark:text-white"}`}>{n.title}</span>
                <span className="text-[10px] uppercase text-zinc-400">{n.isRead ? "Read" : "Unread"}</span>
              </span>
              <span className="block text-xs text-zinc-500 mt-1">{n.body}</span>
              <span className="block text-[10px] text-zinc-400 mt-1">{formatDateTimeWib(n.createdAt)}</span>
            </button>
          ))}
        </section>
      )}

      {section === "activity" && (
        <section className="space-y-2">
          {(notifs.status === "loading" || history.status === "loading") && <LoadingState label="Loading activity..." />}
          {notifs.status === "error" && <ErrorState message={notifs.message} onRetry={loadNotifs} />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={loadHistory} />}
          {notifs.status === "ready" && history.status === "ready" && taskNotes.length === 0 && history.data.activities.length === 0 && (
            <EmptyState title="No recent activity" description="Completed tasks and program updates will appear here." />
          )}
          {taskNotes.map((n) => (
            <article key={n.id} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-3.5">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-zinc-500 mt-1">{n.body}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{formatDateTimeWib(n.createdAt)}</p>
            </article>
          ))}
          {history.status === "ready" &&
            history.data.activities.map((a) => (
              <article key={a.id} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-3.5">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-zinc-500 mt-1">{a.programTitle}</p>
                <p className="text-[10px] text-zinc-400 mt-1">{formatDateTimeWib(a.date)}</p>
              </article>
            ))}
        </section>
      )}

      {section === "history" && (
        <section className="space-y-2">
          {history.status === "loading" && <LoadingState label="Loading history..." />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={loadHistory} />}
          {notifs.status === "ready" && history.status === "ready" && notes.length === 0 && history.data.payments.length === 0 && history.data.activities.length === 0 && (
            <EmptyState title="No history yet" description="Earlier updates and payments will stay here." />
          )}
          {notes.filter((n) => n.isRead).map((n) => (
            <article key={n.id} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-3.5">
              <p className="text-sm">{n.title}</p>
              <p className="text-xs text-zinc-500 mt-1">{n.body}</p>
              <p className="text-[10px] text-zinc-400 mt-1">{formatDateTimeWib(n.createdAt)}</p>
            </article>
          ))}
          {history.status === "ready" &&
            history.data.payments.map((p) => (
              <article key={p.enrollmentId} className="rounded-2xl border border-zinc-200 dark:border-white/10 p-3.5">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-medium">{p.programTitle}</p>
                  <span className="text-[10px] uppercase text-zinc-500">{p.statusLabel}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{formatDateTimeWib(p.transactionDate)} · {p.isFree ? "Free" : formatIdr(p.amount)}</p>
              </article>
            ))}
        </section>
      )}
    </>
  );
}
