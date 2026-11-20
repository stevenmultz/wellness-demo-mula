"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthGatewayCard,
  AuthModal,
  AuthTabMode,
} from "@/components/auth/AuthModal";
import {
  PublicTopBrand,
  PublicBottomNavbar,
  PublicMobileBackdrop,
} from "@/components/home/PublicNavbar";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { isAdminRole } from "@/wellness/security/roles";
import { BRAND } from "@/wellness/brand";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  LogOut,
} from "lucide-react";

interface LandingClientProps {
  sessionUser: {
    userId: string;
    email: string;
    fullName: string;
    role: string;
  } | null;
}

export function LandingClient({ sessionUser }: LandingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLocale();

  const [authTab, setAuthTab] = useState<AuthTabMode>("signin");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedProgramTitle, setSelectedProgramTitle] = useState<
    string | null
  >(null);
  const [deletedNotice, setDeletedNotice] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const authQuery = searchParams.get("auth");
    const programQuery = searchParams.get("program");
    const isDeleted = searchParams.get("deleted");

    if (
      authQuery === "signin" ||
      authQuery === "signup" ||
      authQuery === "forgot"
    ) {
      setAuthTab(authQuery);
    }
    if (programQuery) {
      setSelectedProgramTitle(programQuery);
      if (!authQuery) {
        setAuthTab("signup");
      }
    }
    if (isDeleted === "true") {
      setDeletedNotice(true);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await wellnessSignOut();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col lg:flex-row bg-[#f6f6f4] text-zinc-900 selection:bg-zinc-900 selection:text-white font-sans overflow-x-clip">
      {/* MOBILE FULL-SCREEN BACKDROP (< lg) */}
      <PublicMobileBackdrop />

      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-full bg-zinc-900 text-white py-2.5 px-5 text-xs flex items-center justify-between shadow-xl font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{t.public.accountDeleted}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setDeletedNotice(false)}
            className="opacity-70 hover:opacity-100 text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* LEFT COLUMN: LOGO AT TOP, FORM IN CENTER, STACKED FOOTER AT BOTTOM  */}
      {/* =================================================================== */}
      <div className="relative z-10 w-full lg:w-[48%] xl:w-[44%] min-h-[100dvh] flex flex-col justify-between px-5 sm:px-8 lg:px-14 xl:px-16 pt-0 pb-4 sm:pb-6">
        {/* TOP: LOGO + LOCALE TOGGLE (SAFE-AREA FLUSH) */}
        <PublicTopBrand />

        {/* CENTER: SIGN IN / SIGN UP FORM (CONSISTENT VERTICAL SPACING) */}
        <main className="my-auto py-8 w-full max-w-sm sm:max-w-md mx-auto lg:mx-0">
          <div className="animate-in fade-in duration-150">
            {!sessionUser ? (
              <AuthGatewayCard
                initialTab={authTab}
                activeTabOverride={authTab}
                onTabChange={(next) => setAuthTab(next)}
                contextProgramTitle={selectedProgramTitle}
              />
            ) : (
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 block">
                    Active Session • {sessionUser.role}
                  </span>
                  <h1 className="text-xl sm:text-3xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white">
                    {sessionUser.fullName.trim()
                      ? `${t.public.welcomeBack}, ${sessionUser.fullName}`
                      : t.public.welcomeBack}
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-mono">
                    {sessionUser.email}
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <Link
                    href="/dashboard"
                    className="w-full h-10 sm:h-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                  >
                    <span>{t.public.enterDashboard}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {isAdminRole(sessionUser.role) && (
                    <Link
                      href="/admin"
                      className="w-full h-10 sm:h-11 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-950 dark:text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    >
                      <span>{t.public.openAdmin}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  <button
                    type="button"
                    disabled={signingOut}
                    onClick={handleLogout}
                    className="w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white flex items-center justify-center gap-1.5 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{signingOut ? t.common.signingOut : t.common.signOut}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM: SINGLE NAVBAR */}
        <PublicBottomNavbar />
      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: DESKTOP CLEAN SOLID LIGHT SHOWCASE (NO BG IMAGE)      */}
      {/* =================================================================== */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[56%] relative min-h-screen flex-col justify-between p-12 xl:p-16 bg-[#ecece7] dark:bg-[#141414] border-l border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          <span>{BRAND.fullName}</span>
          <span>{t.public.heroLocationTag}</span>
        </div>

        <div className="max-w-lg space-y-6">
          <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-600 dark:text-zinc-400">
            <span className="w-6 h-px bg-zinc-400 dark:bg-zinc-600" />
            <span>{t.public.heroCaptionTag}</span>
          </span>
          <h2 className="text-4xl xl:text-5xl font-geometric font-light tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
            {t.public.heroCaptionTitle}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md">
            {t.public.curriculumIntro}
          </p>

          <div className="pt-2 grid grid-cols-3 gap-3 max-w-md">
            <div className="rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                01
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                Movement
              </span>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                02
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                Nutrition
              </span>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-zinc-200/80 dark:border-white/10 p-3.5 space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                03
              </span>
              <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                Recovery
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-300/60 dark:border-white/10 pt-5">
          <span>Online · Hybrid Cohorts</span>
          <span>00:00 – 23:59 WIB</span>
        </div>
      </div>

      {/* Fallback AuthModal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authTab}
        contextProgramTitle={selectedProgramTitle}
      />
    </div>
  );
}
