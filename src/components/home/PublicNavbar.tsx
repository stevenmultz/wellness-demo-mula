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
  { href: "/coaches", label: "Coaches" },
] as const;

/**
 * Full-screen mobile background image (< lg) tuned for generous negative space
 * and clean text contrast in both Light Theme and Dark Theme.
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
        className="object-cover object-center grayscale contrast-[1.04] opacity-[0.10] dark:opacity-[0.15]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#f6f6f4]/90 via-[#f6f6f4]/75 to-[#f6f6f4]/95 dark:from-[#0e0e0e]/90 dark:via-[#0e0e0e]/75 dark:to-[#0e0e0e]/95" />
    </div>
  );
}

/**
 * Top bar: + BMS logo on top-left and text-only theme toggle ("Dark" / "Light") on top-right.
 */
export function PublicTopBrand() {
  return (
    <header className="w-full flex items-center justify-between shrink-0">
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
 * Consistent spacing shell across every public information page.
 */
export function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      <PublicMobileBackdrop />

      <div className="relative z-10 max-w-4xl w-full mx-auto px-6 sm:px-10 py-6 sm:py-10 flex-1 flex flex-col justify-between gap-12 sm:gap-16">
        <PublicTopBrand />

        <main className="my-auto w-full space-y-10 sm:space-y-14">
          {children}
        </main>

        <PublicBottomNavbar />
      </div>
    </div>
  );
}

/**
 * Compact action row for "Sign In" and the next destination button.
 */
export function PublicPageActions({
  nextHref,
  nextLabel,
}: {
  nextHref?: string;
  nextLabel?: string;
}) {
  return (
    <section
      aria-label="Page navigation actions"
      className="pt-4 flex items-center justify-between gap-3"
    >
      <Link
        href="/"
        className="h-8 sm:h-10 px-3.5 sm:px-5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[10px] sm:text-xs font-medium tracking-wide inline-flex items-center justify-center gap-1.5 transition shrink-0"
      >
        <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
        <span>Sign In</span>
      </Link>

      {nextHref && nextLabel && (
        <Link
          href={nextHref}
          className="h-8 sm:h-10 px-3.5 sm:px-5 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 text-zinc-950 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white text-[10px] sm:text-xs font-medium tracking-wide inline-flex items-center justify-center gap-1.5 transition shrink-0"
        >
          <span>{nextLabel}</span>
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
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
      className="w-full flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[11px] sm:text-xs pt-4 shrink-0"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
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
