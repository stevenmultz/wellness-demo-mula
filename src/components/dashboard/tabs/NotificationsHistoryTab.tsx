"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Calendar, CheckCheck, CreditCard, ExternalLink, Loader2 } from "lucide-react";
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
  PullToRefreshBanner,
  formatDateTimeWib,
  formatIdr,
  usePullToRefresh,
} from "./shared";

type Section = "notifications" | "history";

type Loadable<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

export interface CompletedProgramItem {
  programId: string;
  title: string;
  coachName: string;
  coachTitle?: string | null;
  coverImage?: string | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  dayCount?: number;
}

export function NotificationsHistoryTab({
  headerVisible,
  isActive = true,
  completedPrograms = [],
  onOpenProgramDetail,
  initialSection = "notifications",
}: {
  headerVisible: boolean;
  isActive?: boolean;
  completedPrograms?: CompletedProgramItem[];
  onOpenProgramDetail?: (programId: string) => void;
  initialSection?: Section;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [notifs, setNotifs] = useState<Loadable<{ items: InboxNotification[]; unreadCount: number }>>({ status: "loading" });
  const [history, setHistory] = useState<Loadable<HistoryPayload>>({ status: "loading" });
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Push notification hook for Web Push toggle
  const push = usePushNotifications();
  const canTogglePush = push.status === "off" || push.status === "on" || push.status === "checking";

  const loadNotifs = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setNotifs((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    }
    try {
      const res = await wellnessGetNotifications();
      if (res.success && res.data) setNotifs({ status: "ready", data: res.data });
      else
        setNotifs((prev) =>
          prev.status === "ready" ? prev : { status: "error", message: res.message || "Failed to load notifications." }
        );
    } catch {
      setNotifs((prev) =>
        prev.status === "ready" ? prev : { status: "error", message: "Failed to load notifications." }
      );
    }
  }, []);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setHistory((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
    }
    try {
      const res = await wellnessGetHistory();
      if (res.success && res.data) setHistory({ status: "ready", data: res.data });
      else
        setHistory((prev) =>
          prev.status === "ready" ? prev : { status: "error", message: res.message || "Failed to load history." }
        );
    } catch {
      setHistory((prev) =>
        prev.status === "ready" ? prev : { status: "error", message: "Failed to load history." }
      );
    }
  }, []);

  useEffect(() => {
    loadNotifs(false);
    loadHistory(false);
  }, [loadNotifs, loadHistory]);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadNotifs(true), loadHistory(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifs, loadHistory]);

  const { pullDistance } = usePullToRefresh({
    active: isActive,
    refreshing,
    onRefresh: handlePullRefresh,
  });

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

  const allNotifications = notifs.status === "ready" ? notifs.data.items : [];
  const unreadCount = notifs.status === "ready" ? notifs.data.unreadCount : 0;

  return (
    <>
      {/* FLOATING HEADER: SUBTAB SWITCHER (NOTIFICATIONS | HISTORY) */}
      <FloatingHeader visible={headerVisible}>
        <div className="w-full flex p-1 rounded-xl bg-zinc-100 dark:bg-white/10">
          <button
            type="button"
            onClick={() => setSection("notifications")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              section === "notifications"
                ? "bg-white dark:bg-zinc-950 shadow-sm text-zinc-950 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSection("history")}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
              section === "history"
                ? "bg-white dark:bg-zinc-950 shadow-sm text-zinc-950 dark:text-white"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            History
          </button>
        </div>
      </FloatingHeader>

      <PullToRefreshBanner pullDistance={pullDistance} refreshing={refreshing} />

      {/* ================================================================= */}
      {/* 1. SUB-TAB: NOTIFICATIONS                                         */}
      {/* ================================================================= */}
      {section === "notifications" && (
        <section className="space-y-3">
          {/* PUSH NOTIFICATION TOGGLE CARD (Placed directly in Notifications) */}
          <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <h3 className="text-xs font-semibold text-zinc-950 dark:text-white">Push Notifications</h3>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {push.status === "on"
                  ? "Alerts active for daily tasks & live sessions"
                  : push.status === "denied"
                    ? "Notifications blocked in browser settings"
                    : push.status === "unsupported"
                      ? "Push unavailable on this device"
                      : "Enable alerts for task reminders & live calls"}
              </p>
              {push.error && (
                <p role="alert" className="text-[11px] text-red-600 truncate mt-0.5">
                  {push.error}
                </p>
              )}
            </div>

            <div>
              {canTogglePush && (
                <button
                  type="button"
                  onClick={push.status === "on" ? push.disable : push.enable}
                  disabled={push.busy || push.status === "checking"}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  {(push.busy || push.status === "checking") && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {push.status === "on" ? "Turn Off" : "Turn On"}
                </button>
              )}
            </div>
          </div>

          {/* NOTIFICATION HEADER BAR */}
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-xs font-semibold text-zinc-500">
              {notifs.status === "ready" ? `${allNotifications.length} Notifications` : "Recent Alerts"}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1 transition"
              >
                <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {notifs.status === "loading" && <LoadingState label="Loading notifications..." />}
          {notifs.status === "error" && <ErrorState message={notifs.message} onRetry={() => loadNotifs(false)} />}
          {notifs.status === "ready" && allNotifications.length === 0 && (
            <EmptyState
              title="No notifications yet"
              description="Program updates, habit reminders, and payment receipts will appear here."
            />
          )}

          {allNotifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => markRead(n)}
              className={`w-full text-left rounded-2xl border p-4 transition-all shadow-sm ${
                n.isRead
                  ? "border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-[#141414]/60"
                  : "border-zinc-300 dark:border-white/25 bg-white dark:bg-[#181818] ring-1 ring-zinc-950/5 dark:ring-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs sm:text-sm ${n.isRead ? "text-zinc-700 dark:text-zinc-300 font-medium" : "font-semibold text-zinc-950 dark:text-white"}`}>
                  {n.title}
                </span>
                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${n.isRead ? "bg-zinc-100 dark:bg-white/5 text-zinc-400" : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold"}`}>
                  {n.isRead ? "Read" : "New"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{n.body}</p>
              <span className="block text-[10px] font-mono text-zinc-400 mt-2">{formatDateTimeWib(n.createdAt)}</span>
            </button>
          ))}
        </section>
      )}

      {/* ================================================================= */}
      {/* 2. SUB-TAB: HISTORY                                               */}
      {/* ================================================================= */}
      {section === "history" && (
        <section className="space-y-4">
          {history.status === "loading" && <LoadingState label="Loading history..." />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={() => loadHistory(false)} />}

          {/* COMPLETED PROGRAMS (ALUMNI) */}
          {completedPrograms.length > 0 && (
            <div className="space-y-2.5">
              <div className="px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Completed Programs ({completedPrograms.length})</span>
                </span>
              </div>

              {completedPrograms.map((cp) => (
                <article
                  key={cp.programId}
                  className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4 bg-white dark:bg-[#141414] space-y-2.5 shadow-sm transition-all hover:border-zinc-400 dark:hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-[9px] font-mono font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 mb-1">
                        Completed
                      </span>
                      <h4 className="text-sm font-semibold truncate text-zinc-900 dark:text-white">
                        {cp.title}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Coach {cp.coachName}
                      </p>
                    </div>
                    {cp.endDate && (
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {new Date(cp.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>

                  {onOpenProgramDetail && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenProgramDetail(cp.programId)}
                        className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white uppercase tracking-wider inline-flex items-center gap-1"
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* PAYMENT & INVOICE LEDGER */}
          {history.status === "ready" && history.data.payments.length > 0 && (
            <div className="space-y-2.5">
              <div className="px-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-950 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Payment & Billing History</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {history.data.payments.length} transactions
                </span>
              </div>

              {history.data.payments.map((p) => (
                <article
                  key={p.enrollmentId}
                  className="rounded-2xl border border-zinc-200 dark:border-white/10 p-4 bg-white dark:bg-[#141414] space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {p.programTitle}
                      </h4>
                      <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                        {formatDateTimeWib(p.transactionDate)}
                        {p.reference ? ` · Ref: ${p.reference}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        p.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : p.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-zinc-100 dark:bg-white/10 text-zinc-500"
                      }`}
                    >
                      {p.statusLabel}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Total Billed</span>
                    <span className="font-semibold text-zinc-950 dark:text-white">
                      {p.isFree ? "Free Program" : formatIdr(p.amount)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* EMPTY STATE */}
          {history.status === "ready" && completedPrograms.length === 0 && history.data.payments.length === 0 && (
            <EmptyState
              title="No history yet"
              description="Completed programs and payment receipts will be recorded here."
            />
          )}
        </section>
      )}
    </>
  );
}
