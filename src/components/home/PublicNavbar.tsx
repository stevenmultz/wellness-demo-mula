"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";

const PUBLIC_NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/programs", label: "Programs" },
  { href: "/specialists", label: "Specialists" },
  { href: "/concierge", label: "Concierge" },
] as const;

/**
 * Top bar: only the + BMS logo and a text-only theme toggle button right next to it.
 */
export function PublicTopBrand() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="w-full flex items-center gap-3">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-left group shrink-0"
        title="BMS Sanctuary"
      >
        <span className="font-mono font-light text-xl text-zinc-950 dark:text-white leading-none">
          +
        </span>
        <span className="font-geometric font-semibold text-xs tracking-[0.28em] text-zinc-950 dark:text-white uppercase">
          BMS
        </span>
      </Link>

      <span className="text-zinc-300 dark:text-zinc-700 text-xs select-none">
        /
      </span>

      <button
        type="button"
        onClick={toggleTheme}
        className="text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition"
      >
        {theme === "dark" ? "Light Theme" : "Dark Theme"}
      </button>
    </header>
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
      className="w-full flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs pt-4"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {PUBLIC_NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 transition ${
                isActive
                  ? "text-zinc-950 dark:text-white font-semibold underline underline-offset-4"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        © 2026 + BMS
      </span>
    </nav>
  );
}
