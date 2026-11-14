"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ArrowLeft } from "lucide-react";

interface PublicNavbarProps {
  sessionUser?: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
  showBackToSignIn?: boolean;
}

const PUBLIC_NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/programs", label: "Programs" },
  { href: "/specialists", label: "Specialists" },
  { href: "/concierge", label: "Concierge" },
] as const;

export function PublicNavbar({
  sessionUser,
  showBackToSignIn = false,
}: PublicNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="w-full flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
      <div className="flex items-center gap-4 shrink-0">
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

        {showBackToSignIn && (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-zinc-950 dark:text-white text-[11px] font-semibold transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{sessionUser ? "Back to Account" : "Back to Sign In"}</span>
          </Link>
        )}
      </div>

      <nav
        aria-label="Public navigation"
        className="flex items-center gap-4 sm:gap-6 overflow-x-auto text-xs"
      >
        {PUBLIC_NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 transition py-1 ${
                isActive
                  ? "text-zinc-950 dark:text-white font-semibold underline underline-offset-8 decoration-2"
                  : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}

        <ThemeToggle />
      </nav>
    </header>
  );
}
