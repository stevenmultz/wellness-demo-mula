"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
    <div className="relative min-h-[100dvh] flex flex-col lg:flex-row bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-950 font-sans transition-colors duration-200 overflow-x-clip">
      {/* MOBILE FULL-SCREEN IMAGE BACKGROUND (< lg) */}
      <PublicMobileBackdrop />

      {/* Account Deletion Notice */}
      {deletedNotice && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 py-2.5 px-5 text-xs flex items-center justify-between shadow-xl font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Your account has been deleted.</span>
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
      {/* LEFT COLUMN: LOGO + THEME ICON AT TOP, FORM IN CENTER, NAV AT BOTTOM*/}
      {/* =================================================================== */}
      <div className="relative z-10 w-full lg:w-[48%] xl:w-[44%] min-h-[100dvh] flex flex-col justify-between px-5 sm:px-12 lg:px-14 xl:px-16 py-5 sm:py-8">
        {/* TOP: LOGO + BORDERLESS THEME ICON */}
        <PublicTopBrand />

        {/* CENTER: SIGN IN / SIGN UP FORM (BALANCED MOBILE VERTICAL SPACING) */}
        <main className="my-auto py-4 sm:py-8 w-full max-w-md mx-auto lg:mx-0">
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
                    Welcome back, {sessionUser.fullName}
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
                    <span>Enter Member Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  {sessionUser.role === "SUPERADMIN" && (
                    <Link
                      href="/admin"
                      className="w-full h-10 sm:h-11 rounded-full bg-zinc-900/10 hover:bg-zinc-900/15 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-950 dark:text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    >
                      <span>Open Admin Console</span>
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
                    <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
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
      {/* RIGHT COLUMN: DESKTOP FULL-BLEED IMAGE SHOWCASE (HIDDEN ON MOBILE)  */}
      {/* =================================================================== */}
      <div className="hidden lg:block lg:w-[52%] xl:w-[56%] relative min-h-screen overflow-hidden bg-zinc-950">
        <Image
          src="/pic.webp"
          alt="BMS Sanctuary"
          fill
          priority
          className="object-cover object-center grayscale contrast-[1.08] brightness-[0.82] transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        {/* Subtle Editorial Caption Overlay on Bottom of Image */}
        <div className="absolute bottom-8 left-8 right-8 z-10 flex items-end justify-between gap-4 text-white pointer-events-none">
          <div className="space-y-1 max-w-md">
            <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-zinc-300 block">
              00:00 WIB Synchronized Protocol
            </span>
            <p className="text-lg sm:text-xl font-geometric font-light tracking-tight text-white">
              Precision Movement. Engineered Longevity.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-300">
            Jakarta • Online
          </span>
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
