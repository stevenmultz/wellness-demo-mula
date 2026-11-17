"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
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
  BrandWordmark,
  EmptyState,
  ErrorState,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
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
  viewMode,
  onChangeViewMode,
  profileAvatarUrl,
  profileName,
  onOpenProfile,
}: {
  headerVisible: boolean;
  isActive?: boolean;
  completedPrograms?: CompletedProgramItem[];
  onOpenProgramDetail?: (programId: string) => void;
  initialSection?: Section;
  viewMode?: "intro" | "feed";
  onChangeViewMode?: (next: "intro" | "feed") => void;
  profileAvatarUrl?: string | null;
  profileName?: string | null;
  onOpenProfile?: () => void;
}) {
  const [internalMode, setInternalMode] = useState<"intro" | "feed">("intro");
  const mode = viewMode ?? internalMode;
  const setMode = (next: "intro" | "feed") => {
    setInternalMode(next);
    onChangeViewMode?.(next);
    window.scrollTo({ top: 0 });
  };

  const [section, setSection] = useState<Section>(initialSection);
  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);
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
      <FloatingHeader visible={headerVisible} transparent={mode === "intro"}>
        {mode === "intro" ? (
          <>
            <BrandWordmark light />
            <HeaderProfileButton
              avatarUrl={profileAvatarUrl}
              fullName={profileName}
              onClick={() => onOpenProfile?.()}
            />
          </>
        ) : (
          <HeaderBackButton
            onClick={() => setMode("intro")}
            ariaLabel="Back to Alerts overview"
          />
        )}
      </FloatingHeader>

      {mode === "intro" ? (
        <div className="relative flex-1 flex flex-col">
          {/* True Full-Viewport Background Image */}
          <div aria-hidden="true" className="fixed inset-0 z-0 pointer-events-none bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pic.webp"
              alt=""
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/25" />
          </div>

          <div
            style={{ minHeight: "100dvh" }}
            className="relative z-10 w-full flex-1 flex flex-col justify-between gap-8 pt-[calc(4.75rem+env(safe-area-inset-top))] pb-[calc(5.75rem+env(safe-area-inset-bottom))]"
          >
            <div>
              <PullToRefreshBanner pullDistance={pullDistance} refreshing={refreshing} />
            </div>

            <div className="space-y-6 max-w-md">
              <section className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-px bg-white/50" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/75">
                    Alerts
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-geometric font-light tracking-tight text-white leading-[1.08] drop-shadow-xs">
                  Notifications &amp; History
                </h1>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
                  Stay updated with cohort alerts, session reminders, completed plans, and billing records.
                </p>
              </section>

              <div className="w-10 h-px bg-white/30" />

              <div className="flex flex-col items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSection("notifications");
                    setMode("feed");
                  }}
                  className="group py-1 text-white hover:text-white/85 text-sm sm:text-base font-geometric font-medium inline-flex items-center gap-2.5 active:scale-95 transition drop-shadow-xs"
                >
                  <span>Notifications</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSection("history");
                    setMode("feed");
                  }}
                  className="group py-1 text-white/75 hover:text-white text-xs sm:text-sm font-geometric font-normal inline-flex items-center gap-2 active:scale-95 transition drop-shadow-xs"
                >
                  <span>History</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 max-w-2xl w-full mx-auto pt-2">
          <PullToRefreshBanner pullDistance={pullDistance} refreshing={refreshing} />

          {/* SUB-TAB BAR CONSISTENT WITH MY PLAN */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
              Alerts
            </h1>

            <div
              role="tablist"
              aria-label="Alerts sections"
              className="rounded-xl p-1 bg-zinc-200/80 dark:bg-white/10 grid grid-cols-2 gap-1"
            >
              {(
                [
                  { key: "notifications" as const, label: "Notifications", count: unreadCount },
                  {
                    key: "history" as const,
                    label: "History",
                    count:
                      history.status === "ready"
                        ? completedPrograms.length + history.data.payments.length
                        : 0,
                  },
                ]
              ).map(({ key, label, count }) => {
                const active = section === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSection(key)}
                    className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                      active
                        ? "bg-white text-zinc-950 dark:bg-white dark:text-zinc-950 shadow-sm"
                        : "text-zinc-600 hover:text-zinc-950 dark:text-white/75 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10"
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span
                        className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                          active
                            ? "bg-zinc-950/15 text-zinc-950 font-bold"
                            : "bg-zinc-950/10 text-zinc-700 dark:bg-white/20 dark:text-white font-semibold"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

      {/* ================================================================= */}
      {/* 1. SUB-TAB: NOTIFICATIONS                                         */}
      {/* ================================================================= */}
      {section === "notifications" && (
        <section className="space-y-6">
          {/* PUSH NOTIFICATION TOGGLE */}
          <div className="profile-detail-scope rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] p-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <h3 className="text-xs font-geometric font-medium text-zinc-950 dark:text-white">
                  Push Notifications
                </h3>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
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
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-geometric font-medium uppercase tracking-wider bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 disabled:opacity-50 inline-flex items-center gap-1.5 active:scale-95 transition"
                >
                  {(push.busy || push.status === "checking") && <Loader2 className="w-3 h-3 animate-spin" />}
                  {push.status === "on" ? "Turn Off" : "Turn On"}
                </button>
              )}
            </div>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-medium text-zinc-400">
                {notifs.status === "ready" ? `${allNotifications.length} Alerts` : "Recent Alerts"}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="text-[10px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1.5 transition"
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
                description="Plan updates, habit reminders, and payment receipts will appear here."
              />
            )}

            {allNotifications.length > 0 && (
              <div className="profile-detail-scope space-y-3">
                {allNotifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => markRead(n)}
                    className={`w-full text-left rounded-2xl border p-4 space-y-2 transition ${
                      n.isRead
                        ? "border-zinc-200/90 dark:border-white/10 bg-white/80 dark:bg-[#141414]/80 opacity-85"
                        : "border-zinc-300 dark:border-white/25 bg-white dark:bg-[#181818]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-white shrink-0" />
                        )}
                        <span
                          className={`text-xs font-geometric truncate ${
                            n.isRead
                              ? "text-zinc-600 dark:text-zinc-300 font-normal"
                              : "font-medium text-zinc-950 dark:text-white"
                          }`}
                        >
                          {n.title}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          n.isRead
                            ? "bg-zinc-100 dark:bg-white/5 text-zinc-400"
                            : "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                        }`}
                      >
                        {n.isRead ? "Read" : "New"}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {n.body}
                    </p>

                    <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{formatDateTimeWib(n.createdAt)}</span>
                    </div>
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
        <section className="space-y-3">
          {history.status === "loading" && <LoadingState label="Loading history..." />}
          {history.status === "error" && <ErrorState message={history.message} onRetry={() => loadHistory(false)} />}

          {history.status === "ready" && (completedPrograms.length > 0 || history.data.payments.length > 0) && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-zinc-400">
                  {completedPrograms.length + history.data.payments.length} Records
                </span>
              </div>

              <div className="profile-detail-scope space-y-3">
                {completedPrograms.map((cp) => (
                  <article
                    key={`completed-${cp.programId}`}
                    className="rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-geometric font-medium truncate text-zinc-950 dark:text-white min-w-0">
                        {cp.title}
                      </span>
                      <span className="text-[9px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                        Completed
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Coach {cp.coachName}
                    </p>

                    <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between gap-3 text-[10px] text-zinc-400">
                      <span className="font-mono">
                        {cp.endDate
                          ? new Date(cp.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Completed"}
                      </span>
                      {onOpenProgramDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenProgramDetail(cp.programId)}
                          className="font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1 transition"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </article>
                ))}

                {history.data.payments.map((p) => (
                  <article
                    key={`payment-${p.enrollmentId}`}
                    className="rounded-2xl border border-zinc-200/90 dark:border-white/15 bg-white dark:bg-[#141414] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-geometric font-medium truncate text-zinc-950 dark:text-white min-w-0">
                        {p.programTitle}
                      </span>
                      <span
                        className={`text-[9px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                          p.status === "ACTIVE"
                            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                            : "bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {p.statusLabel}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Total Billed · {p.isFree ? "Free Plan" : formatIdr(p.amount)}
                      {p.reference ? ` · Ref: ${p.reference}` : ""}
                    </p>

                    <div className="pt-2 border-t border-zinc-100 dark:border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{formatDateTimeWib(p.transactionDate)}</span>
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
              description="Completed plans and payment receipts will be recorded here."
            />
          )}
        </section>
      )}
        </div>
      )}
    </>
  );
}
