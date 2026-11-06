"use client";

import { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

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

/** Only http(s) URLs are ever rendered as links (blocks javascript:/data: URLs from the DB). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Floating pill header shared by all tabs (hides on scroll-down like the original header). */
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
      className={`fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl min-h-12 px-3.5 sm:px-5 py-2 rounded-2xl flex items-center justify-between gap-3 border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] shadow-sm transition-all duration-300 ${
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
    <section className="rounded-3xl p-5 sm:p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          {eyebrow && (
            <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-500 dark:text-zinc-400 block">
              {eyebrow}
            </span>
          )}
          <h2 className="text-base sm:text-lg font-medium tracking-tight text-zinc-950 dark:text-white">
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
      className="py-10 flex flex-col items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"
    >
      <Loader2 className="w-5 h-5 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="py-8 px-4 flex flex-col items-center justify-center gap-3 text-center rounded-2xl border border-red-500/30 bg-red-50 dark:bg-red-950/20"
    >
      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      <p className="text-xs text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
        >
          Try again
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
    <div className="py-10 px-4 flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-white/15">
      <p className="text-sm font-medium text-zinc-900 dark:text-white">{title}</p>
      {description && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
