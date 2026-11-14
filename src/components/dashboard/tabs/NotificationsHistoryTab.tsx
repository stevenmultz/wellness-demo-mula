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
    <div className="space-y-8 max-w-2xl mx-auto pt-2">
      {/* FLOATING HEADER: SUBTAB SWITCHER (NOTIFICATIONS | HISTORY) */}
      <FloatingHeader visible={headerVisible}>
        <div className="w-full flex p-1 rounded-full bg-zinc-100 dark:bg-white/10">
          <button
            type="button"
            onClick={() => setSection("notifications")}
            className={`flex-1 py-1.5 rounded-full text-xs font-geometric font-medium transition ${
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
            className={`flex-1 py-1.5 rounded-full text-xs font-geometric font-medium transition ${
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
        <section className="space-y-6">
          <div className="space-y-1.5 px-1">
            <span className="block text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400">
              Inbox & Alerts
            </span>
            <h2 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
              Notifications
            </h2>
          </div>

          {/* PUSH NOTIFICATION TOGGLE CARD */}
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white">
                  Push Notifications
                </h3>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {push.status === "on"
                  ? "Alerts active for daily tasks & live sessions"
                  : push.status === "denied"
                    ? "Notifications blocked in browser settings"
                    : push.status === "unsupported"
                      ? "Push unavailable on this device"
                      : "Enable alerts for task reminders & live calls"}
              </p>
              {push.error && (
                <p role="alert" className="text-[11px] text-red-600 truncate mt-1">
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
                  className="shrink-0 px-4 py-2 rounded-full text-[11px] font-geometric font-medium uppercase tracking-wider bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  {(push.busy || push.status === "checking") && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {push.status === "on" ? "Turn Off" : "Turn On"}
                </button>
              )}
            </div>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                {notifs.status === "ready" ? `${allNotifications.length} Alerts` : "Recent Alerts"}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1.5 transition"
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

            {allNotifications.length > 0 && (
              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                {allNotifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n)}
                    className={`w-full text-left py-4 px-2 transition hover:bg-zinc-50/70 dark:hover:bg-white/[0.03] ${
                      n.isRead ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-white shrink-0" />
                        )}
                        <span
                          className={`text-xs sm:text-sm font-geometric truncate ${
                            n.isRead
                              ? "text-zinc-600 dark:text-zinc-300 font-normal"
                              : "font-medium text-zinc-950 dark:text-white"
                          }`}
                        >
                          {n.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0 pt-0.5">
                        {formatDateTimeWib(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      {n.body}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* 2. SUB-TAB: HISTORY                                               */}
      {/* ================================================================= */}
      {section === "history" && (
        <section className="space-y-8">
          <div className="space-y-1.5 px-1">
            <span className="block text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-400">
              Archive & Billing
            </span>
            <h2 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
              History
            </h2>
          </div>

          {history.status === "loading" && <LoadingState label="Loading history..." />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={() => loadHistory(false)} />}

          {/* COMPLETED PROGRAMS (ALUMNI) */}
          {completedPrograms.length > 0 && (
            <div className="space-y-3">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Completed Programs ({completedPrograms.length})</span>
                </span>
              </div>

              <div className="space-y-3">
                {completedPrograms.map((cp) => (
                  <article
                    key={cp.programId}
                    className="rounded-3xl border border-zinc-200 dark:border-white/10 p-5 bg-white dark:bg-[#141414] space-y-3 transition-all hover:border-zinc-400 dark:hover:border-white/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-[9px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                          Completed
                        </span>
                        <h4 className="text-base font-geometric font-medium truncate text-zinc-950 dark:text-white">
                          {cp.title}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Coach {cp.coachName}
                        </p>
                      </div>
                      {cp.endDate && (
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0 pt-1">
                          {new Date(cp.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>

                    {onOpenProgramDetail && (
                      <div className="pt-3 border-t border-zinc-100 dark:border-white/10 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenProgramDetail(cp.programId)}
                          className="text-[11px] font-geometric font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white uppercase tracking-wider inline-flex items-center gap-1.5 transition"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* PAYMENT & INVOICE LEDGER */}
          {history.status === "ready" && history.data.payments.length > 0 && (
            <div className="space-y-3">
              <div className="px-1 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400 inline-flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Payment & Billing Ledger</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {history.data.payments.length} transactions
                </span>
              </div>

              <div className="divide-y divide-zinc-200/80 dark:divide-white/10 border-y border-zinc-200/80 dark:border-white/10">
                {history.data.payments.map((p) => (
                  <article
                    key={p.enrollmentId}
                    className="py-4 px-2 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-geometric font-medium text-zinc-950 dark:text-white truncate">
                          {p.programTitle}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-400 mt-1">
                          {formatDateTimeWib(p.transactionDate)}
                          {p.reference ? ` · Ref: ${p.reference}` : ""}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 border ${
                          p.status === "ACTIVE"
                            ? "bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white"
                            : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10"
                        }`}
                      >
                        {p.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                        Total Billed
                      </span>
                      <span className="font-geometric font-medium text-zinc-950 dark:text-white">
                        {p.isFree ? "Free Program" : formatIdr(p.amount)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
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
    </div>
  );
}
