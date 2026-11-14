"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowLeft, ArrowRight } from "lucide-react";

const PUBLIC_NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/programs", label: "Programs" },
  { href: "/specialists", label: "Specialists" },
  { href: "/concierge", label: "Concierge" },
] as const;

/**
 * Full-screen mobile background image (< lg) with guaranteed high-contrast
 * readability in both Light Theme and Dark Theme.
 */
export function PublicMobileBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 lg:hidden pointer-events-none bg-[#f6f6f4] dark:bg-[#0e0e0e]"
    >
      <Image
        src="/pic.webp"
        alt=""
        fill
        priority
        className="object-cover object-center grayscale contrast-[1.05] opacity-[0.16] dark:opacity-[0.22]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#f6f6f4]/85 via-[#f6f6f4]/65 to-[#f6f6f4]/92 dark:from-[#0e0e0e]/85 dark:via-[#0e0e0e]/65 dark:to-[#0e0e0e]/92" />
    </div>
  );
}

/**
 * Top bar: + BMS logo and a borderless icon-only theme toggle right next to it.
 */
export function PublicTopBrand() {
  return (
    <header className="w-full flex items-center gap-2.5 shrink-0">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-left group shrink-0"
        title="BMS Sanctuary"
      >
        <span className="font-mono font-light text-lg sm:text-xl text-zinc-950 dark:text-white leading-none">
          +
        </span>
        <span className="font-geometric font-semibold text-xs tracking-[0.28em] text-zinc-950 dark:text-white uppercase">
          BMS
        </span>
      </Link>

      <ThemeToggle />
    </header>
  );
}

/**
 * Mobile & Desktop action row for "Back to Sign In" and "Next" buttons on public subpages.
 */
export function PublicPageActions({
  sessionUser,
  nextHref,
  nextLabel,
}: {
  sessionUser?: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <section
      aria-label="Page navigation actions"
      className={`pt-2 ${
        nextHref && nextLabel
          ? "grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-between sm:gap-4"
          : "flex items-center"
      }`}
    >
      <Link
        href="/"
        className="h-10 sm:h-11 px-4 sm:px-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 sm:gap-2 transition w-full sm:w-auto"
      >
        <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {sessionUser ? "Account" : "Back to Sign In"}
        </span>
      </Link>

      {nextHref && nextLabel && (
        <Link
          href={nextHref}
          className="h-10 sm:h-11 px-4 sm:px-6 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 text-zinc-950 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 sm:gap-2 transition w-full sm:w-auto"
        >
          <span className="truncate">{nextLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      )}
    </section>
  );
}

/**
 * Single Bottom Navbar for the public website.
 */
export function PublicBottomNavbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Public navigation"
      className="w-full flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[11px] sm:text-xs pt-3 sm:pt-4 shrink-0"
    >
      <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5">
        {PUBLIC_NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 transition ${
                isActive
                  ? "text-zinc-950 dark:text-white font-semibold underline underline-offset-4"
                  : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
        © 2026 + BMS
      </span>
    </nav>
  );
}
