"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  Info,
  Loader2,
  LogOut,
  Share2,
  User,
  UserPlus,
  X,
} from "lucide-react";

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
import { BrandLogo } from "@/components/common/BrandLogo";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { FillUserIcon } from "./sharedFillIcons";

/** Unified static brand wordmark rendered identically across all top headers. */
export function BrandWordmark({ light = false }: { light?: boolean }) {
  return (
    <BrandLogo
      size="md"
      tone={light ? "light" : "auto"}
      className={light ? "drop-shadow-xs" : ""}
    />
  );
}

export interface HeaderProfileMenuActions {
  onEditProfile?: () => void;
  onShareProgress?: () => void;
  onAddAccount?: () => void;
  onLogout?: () => void;
}

/** First-page header profile pill displayed on the top-right opposite zera.id with a simple dropdown menu. */
export function HeaderProfileButton({
  avatarUrl,
  fullName,
  email,
  onClick,
  menuActions,
  light = false,
}: {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  onClick?: () => void;
  menuActions?: HeaderProfileMenuActions;
  light?: boolean;
}) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const displayText = email?.trim() || fullName?.trim() || t.nav.profile;
  const hasMenu = Boolean(
    menuActions &&
      (menuActions.onEditProfile ||
        menuActions.onShareProgress ||
        menuActions.onAddAccount ||
        menuActions.onLogout)
  );

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          if (hasMenu) {
            setOpen((prev) => !prev);
          } else {
            onClick?.();
          }
        }}
        aria-label={t.nav.profile}
        aria-haspopup={hasMenu ? "menu" : undefined}
        aria-expanded={hasMenu ? open : undefined}
        title={email ? `${t.nav.profile} (${email})` : t.nav.profile}
        className={`shrink-0 w-8 h-8 rounded-full overflow-hidden border inline-flex items-center justify-center active:scale-95 transition cursor-pointer ${
          light
            ? "bg-white/20 hover:bg-white/30 backdrop-blur-md border-white/30 text-white drop-shadow-xs"
            : "bg-white hover:bg-zinc-50 border-zinc-200/90 text-zinc-700 shadow-2xs"
        }`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayText}
            className="w-full h-full object-cover"
          />
        ) : (
          <FillUserIcon className={`w-4 h-4 ${light ? "text-white" : "text-zinc-600"}`} />
        )}
      </button>

      {hasMenu && open && (
        <div
          role="menu"
          aria-label={t.nav.profile}
          className="dashboard-nav-boxed absolute right-0 top-[calc(100%+0.5rem)] w-56 rounded-2xl bg-white border border-zinc-200/90 shadow-xl py-1.5 z-[70] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3.5 py-2 border-b border-zinc-100">
            {fullName?.trim() && (
              <p className="text-xs font-geometric font-semibold text-zinc-950 truncate">
                {fullName}
              </p>
            )}
            {email?.trim() && (
              <p className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                {email}
              </p>
            )}
          </div>

          <div className="py-1">
            {menuActions?.onEditProfile && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  menuActions.onEditProfile?.();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-geometric font-medium text-zinc-800 hover:bg-zinc-100/80 flex items-center gap-2.5 transition"
              >
                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{t.profile.editProfile}</span>
              </button>
            )}
            {menuActions?.onShareProgress && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  menuActions.onShareProgress?.();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-geometric font-medium text-zinc-800 hover:bg-zinc-100/80 flex items-center gap-2.5 transition"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{t.profile.shareProgressTitle}</span>
              </button>
            )}
            {menuActions?.onAddAccount && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  menuActions.onAddAccount?.();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-geometric font-medium text-zinc-800 hover:bg-zinc-100/80 flex items-center gap-2.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span>{isId ? "Tambah Akun" : "Add Account"}</span>
              </button>
            )}
          </div>

          {menuActions?.onLogout && (
            <div className="pt-1 border-t border-zinc-100">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  menuActions.onLogout?.();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-geometric font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>{isId ? "Keluar" : "Log Out"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Unified borderless & boxless back button used consistently across all detail & subview headers. */
export function HeaderBackButton({
  onClick,
  label,
  ariaLabel,
  title,
  overlay = false,
  className = "",
}: {
  onClick: () => void;
  label?: string;
  ariaLabel?: string;
  title?: string;
  overlay?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const displayLabel = label ?? t.common.back;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={`shrink-0 py-1.5 text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 active:scale-95 transition ${
        overlay
          ? "text-white hover:text-white/80 drop-shadow-xs"
          : "text-zinc-900 hover:text-zinc-600 dark:text-white dark:hover:text-white/75"
      } ${className}`}
    >
      <ArrowLeft className="w-4 h-4 shrink-0" />
      <span>{displayLabel}</span>
    </button>
  );
}

/** Full-width seamless top header bar (borderless, extends into top safe-area/notch, slides away on scroll-down). */
export function FloatingHeader({
  visible,
  transparent = false,
  children,
}: {
  visible: boolean;
  transparent?: boolean;
  children: ReactNode;
}) {
  return (
    <header
      style={{ paddingTop: "env(safe-area-inset-top)" }}
      className={`fixed top-0 left-0 right-0 z-50 w-full transition-[transform,opacity,background-color] duration-300 border-0 shadow-none ${
        transparent
          ? "bg-transparent"
          : "bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
      } ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-8 min-h-14 py-2 flex items-center justify-between gap-3">
        {children}
      </div>
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
    <section className="py-2 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          {eyebrow && (
            <span className="text-[10px] uppercase tracking-[0.06em] font-semibold text-zinc-500 dark:text-zinc-400 block">
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

export function LoadingState({ label }: { label?: string }) {
  const { t } = useLocale();
  const text = label ?? t.common.loading;
  return (
    <div
      role="status"
      aria-label={text}
      className="py-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        <span>{text}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="py-2 space-y-2.5">
          <div className="h-3.5 w-24 skeleton-block" />
          <div className="h-5 w-3/4 skeleton-block" />
          <div className="h-3 w-full skeleton-block" />
          <div className="h-8 w-28 rounded-full skeleton-block mt-2" />
        </div>
        <div className="py-2 space-y-2.5 hidden sm:block">
          <div className="h-3.5 w-20 skeleton-block" />
          <div className="h-5 w-2/3 skeleton-block" />
          <div className="h-3 w-5/6 skeleton-block" />
          <div className="h-8 w-28 rounded-full skeleton-block mt-2" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { locale } = useLocale();
  return (
    <div
      role="alert"
      className="py-8 px-4 flex flex-col items-center justify-center gap-3 text-center rounded-2xl bg-red-500/10"
    >
      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      <p className="text-xs text-red-700 dark:text-red-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 active:scale-95 transition"
        >
          {locale === "id" ? "Coba lagi" : "Try again"}
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
    <div className="py-10 px-4 flex flex-col items-center justify-center gap-2 text-center">
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
  const { locale } = useLocale();
  if (!refreshing && pullDistance < 8) return null;
  const ready = pullDistance >= 48;

  return (
    <div
      style={{
        height: refreshing ? 36 : Math.min(44, Math.max(28, pullDistance)),
      }}
      className="flex items-center justify-center overflow-hidden transition-all duration-150"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-200/70 dark:bg-white/10 text-[11px] font-mono text-zinc-600 dark:text-zinc-300">
        {refreshing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{locale === "id" ? "Memuat data terbaru..." : "Refreshing latest data..."}</span>
          </>
        ) : (
          <>
            <ArrowDown
              className={`w-3 h-3 transition-transform ${ready ? "rotate-180 text-zinc-950 dark:text-white" : ""}`}
            />
            <span>
              {ready
                ? locale === "id"
                  ? "Lepaskan untuk muat ulang"
                  : "Release to refresh"
                : locale === "id"
                  ? "Tarik ke bawah untuk muat ulang"
                  : "Pull down to refresh"}
            </span>
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
        className="w-full max-w-md rounded-3xl bg-[#f6f6f4] dark:bg-[#161616] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-200/70 dark:bg-white/10 text-zinc-900 dark:text-white flex items-center justify-center shrink-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-950 dark:text-white truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close info popup"
            className="w-8 h-8 rounded-xl bg-zinc-200/60 dark:bg-white/5 text-zinc-500 hover:text-zinc-950 dark:hover:text-white flex items-center justify-center shrink-0 active:scale-95 transition"
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
          className="w-full h-10 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold active:scale-[0.98] transition"
        >
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
