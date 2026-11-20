"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleToggle } from "@/components/common/LocaleToggle";
import { BrandLogo } from "@/components/common/BrandLogo";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { ArrowLeft, ArrowRight } from "lucide-react";

const PUBLIC_NAV_KEYS = [
  { href: "/about", key: "about" },
  { href: "/curriculum", key: "curriculum" },
  { href: "/programs", key: "programs" },
  { href: "/coaches", key: "coaches" },
] as const;

/**
 * Clean solid Light Theme mobile backdrop extending full-bleed across the entire viewport.
 */
export function PublicMobileBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 lg:hidden pointer-events-none bg-[#f6f6f4]"
    />
  );
}

/**
 * Top bar: zera.id logo on top-left and language toggle on top-right (Light-only, safe-area flush).
 */
export function PublicTopBrand() {
  return (
    <header
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
      }}
      className="w-full min-h-14 flex items-center justify-between gap-3 pb-3 border-b border-zinc-200/70 shrink-0"
    >
      <Link
        href="/"
        className="flex items-center text-left group shrink-0"
        title={BRAND.fullName}
      >
        <BrandLogo size="sm" tone="dark" className="sm:hidden" />
        <BrandLogo size="md" tone="dark" className="hidden sm:inline-flex" />
      </Link>

      <div className="flex items-center text-[11px] sm:text-xs">
        <LocaleToggle className="text-[11px] sm:text-xs" />
      </div>
    </header>
  );
}

/**
 * Consistent spacing shell across every public information page (Light-only, full-screen safe-area).
 */
export function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-between bg-[#f6f6f4] text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans overflow-x-clip">
      <PublicMobileBackdrop />

      <div className="relative z-10 max-w-4xl w-full mx-auto px-5 sm:px-8 pt-0 pb-4 flex-1 flex flex-col justify-between gap-8 sm:gap-12">
        <PublicTopBrand />

        <main className="my-auto py-4 sm:py-6 w-full space-y-8 sm:space-y-12">
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
  const { t } = useLocale();

  return (
    <section
      aria-label="Page navigation actions"
      className="pt-4 flex items-center justify-between gap-3"
    >
      <Link
        href="/"
        className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-[11px] sm:text-xs font-medium tracking-wide inline-flex items-center justify-center gap-1.5 transition shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
        <span>{t.common.signIn}</span>
      </Link>

      {nextHref && nextLabel && (
        <Link
          href={nextHref}
          className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 text-zinc-950 text-[11px] sm:text-xs font-medium tracking-wide inline-flex items-center justify-center gap-1.5 transition shrink-0"
        >
          <span>{nextLabel}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </Link>
      )}
    </section>
  );
}

/**
 * Stacked public footer with consistent global spacing and copyright at the very bottom.
 */
export function PublicBottomNavbar() {
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const isId = locale === "id";

  return (
    <footer
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      aria-label="Public navigation"
      className="w-full border-t border-zinc-200/70 pt-5 flex flex-col items-center gap-3 text-center shrink-0"
    >
      <nav
        aria-label="Footer navigation"
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
      >
        {PUBLIC_NAV_KEYS.map(({ href, key }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 transition ${
                isActive
                  ? "text-zinc-950 font-semibold underline underline-offset-4"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {t.nav[key]}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <Link
          href="/terms"
          className={`transition hover:text-zinc-950 ${
            pathname === "/terms" ? "text-zinc-950 font-medium underline underline-offset-4" : ""
          }`}
        >
          {isId ? "Ketentuan Layanan" : "Terms of Service"}
        </Link>
        <span aria-hidden="true" className="text-zinc-300">
          ·
        </span>
        <Link
          href="/privacy"
          className={`transition hover:text-zinc-950 ${
            pathname === "/privacy" ? "text-zinc-950 font-medium underline underline-offset-4" : ""
          }`}
        >
          {isId ? "Kebijakan Privasi" : "Privacy Policy"}
        </Link>
      </div>

      <span className="text-[10px] font-mono text-zinc-400 pt-0.5">
        {BRAND.copyright}
      </span>
    </footer>
  );
}
