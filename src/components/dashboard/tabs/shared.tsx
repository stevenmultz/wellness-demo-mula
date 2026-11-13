"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, ArrowDown, Info, Loader2, X } from "lucide-react";

/** App timezone: Western Indonesia Time. All user-facing dates use it (SSR and browser agree). */
export const APP_TIMEZONE = "Asia/Jakarta";

export function formatDateWib(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: APP_TIMEZONE }).format(d);
}

export function formatDateTimeWib(value: string | Date | null | undefined): string {
  return formatDateWib(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export { safeHttpUrl } from "@/wellness/utils/url-safety";

/** Floating architectural masthead header shared across member tabs. */
export function FloatingHeader({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return (
    <header
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
      className={`fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl min-h-12 px-4 sm:px-6 py-2 rounded-[2px] flex items-center justify-between gap-3 border border-zinc-900/15 dark:border-white/15 bg-[#faf9f6]/95 dark:bg-[#0e0e11]/95 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-28 opacity-0 pointer-events-none"
      }`}
    >
      {children}
    </header>
  );
}

export function SectionCard({
  eyebrow,
  title,
  children,
  right,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="rounded-[2px] p-5 sm:p-7 bg-[#faf9f6] dark:bg-[#121215] border border-zinc-900/15 dark:border-white/15 space-y-5">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-900/10 dark:border-white/10">
        <div className="space-y-1">
          {eyebrow && (
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] font-semibold text-zinc-500 dark:text-zinc-400 block">
              {eyebrow}
            </span>
          )}
          <h2 className="font-editorial text-2xl sm:text-[26px] font-normal tracking-tight text-zinc-950 dark:text-[#f4f3ef] leading-tight">
            {title}
          </h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="py-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 font-mono">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-5 rounded-[2px] border border-zinc-900/15 dark:border-white/15 space-y-2.5">
          <div className="h-3 w-24 skeleton-block" />
          <div className="h-5 w-3/4 skeleton-block" />
          <div className="h-3 w-full skeleton-block" />
          <div className="h-8 w-28 skeleton-block mt-2" />
        </div>
        <div className="p-5 rounded-[2px] border border-zinc-900/15 dark:border-white/15 space-y-2.5 hidden sm:block">
          <div className="h-3 w-20 skeleton-block" />
          <div className="h-5 w-2/3 skeleton-block" />
          <div className="h-3 w-5/6 skeleton-block" />
          <div className="h-8 w-28 skeleton-block mt-2" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="py-8 px-5 flex flex-col items-center justify-center gap-3 text-center rounded-[2px] border border-red-500/30 bg-red-50/70 dark:bg-red-950/20"
    >
      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      <p className="text-xs text-red-700 dark:text-red-300 font-mono">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-[2px] text-[10px] font-mono font-semibold uppercase tracking-[0.2em] bg-zinc-950 text-white dark:bg-[#f4f3ef] dark:text-zinc-950 active:scale-95 transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-12 px-5 flex flex-col items-center justify-center gap-2.5 text-center rounded-[2px] border border-zinc-900/15 dark:border-white/15 bg-[#faf9f6] dark:bg-[#121215]">
      <p className="font-editorial text-2xl font-normal text-zinc-950 dark:text-[#f4f3ef]">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function usePullToRefresh({
  active = true,
  refreshing,
  onRefresh,
}: {
  active?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const atTopSinceRef = useRef<number>(Date.now());
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setPullDistance(0);
      pullRef.current = 0;
      startYRef.current = null;
      return;
    }

    const onScroll = () => {
      if (window.scrollY <= 2) {
        if (atTopSinceRef.current === 0) atTopSinceRef.current = Date.now();
      } else {
        atTopSinceRef.current = 0;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && !refreshing && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
      } else {
        startYRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshing) return;
      if (window.scrollY > 2) {
        startYRef.current = null;
        pullRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 12) {
        const next = Math.min(84, Math.round((delta - 12) * 0.55));
        pullRef.current = next;
        setPullDistance(next);
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = () => {
      if (startYRef.current === null) return;
      const dist = pullRef.current;
      startYRef.current = null;
      pullRef.current = 0;
      setPullDistance(0);
      if (dist >= 48 && !refreshing) {
        lastRefreshRef.current = Date.now();
        onRefresh();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (refreshing) return;
      const now = Date.now();
      if (
        window.scrollY <= 0 &&
        atTopSinceRef.current > 0 &&
        now - atTopSinceRef.current > 350 &&
        now - lastRefreshRef.current > 2500 &&
        e.deltaY < -55
      ) {
        lastRefreshRef.current = now;
        onRefresh();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [active, refreshing, onRefresh]);

  return { pullDistance };
}

export function PullToRefreshBanner({
  pullDistance,
  refreshing,
}: {
  pullDistance: number;
  refreshing: boolean;
}) {
  if (!refreshing && pullDistance < 8) return null;
  const ready = pullDistance >= 48;

  return (
    <div
      style={{
        height: refreshing ? 36 : Math.min(44, Math.max(28, pullDistance)),
      }}
      className="flex items-center justify-center overflow-hidden transition-all duration-150"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-[#faf9f6] dark:bg-zinc-900 border border-zinc-900/15 dark:border-white/15 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-300">
        {refreshing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Refreshing latest data...</span>
          </>
        ) : (
          <>
            <ArrowDown
              className={`w-3 h-3 transition-transform ${ready ? "rotate-180 text-zinc-950 dark:text-white" : ""}`}
            />
            <span>{ready ? "Release to refresh" : "Pull down to refresh"}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Shared accessible pop-up modal used by section (i) info triggers across dashboard tabs. */
export function InfoPopupModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[2px] bg-[#faf9f6] dark:bg-[#121215] border border-zinc-900/20 dark:border-white/15 p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-900/10 dark:border-white/10">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[2px] border border-zinc-900/15 dark:border-white/15 bg-zinc-900/[0.03] dark:bg-white/[0.04] text-zinc-900 dark:text-[#f4f3ef] flex items-center justify-center shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-editorial text-xl sm:text-2xl font-normal text-zinc-950 dark:text-[#f4f3ef] leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close info popup"
            className="w-8 h-8 rounded-[2px] border border-zinc-900/15 dark:border-white/15 bg-transparent text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed space-y-2.5">
          {children}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-[2px] bg-zinc-950 text-[#f4f3ef] dark:bg-[#f4f3ef] dark:text-zinc-950 text-[11px] font-mono uppercase tracking-[0.22em] font-semibold active:scale-[0.99] transition"
        >
          Acknowledge
        </button>
      </div>
    </div>,
    document.body
  );
}
