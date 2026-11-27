"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

function isStaleDeploymentError(err: Error | undefined): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("failed to find server action") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("dynamically imported module")
  );
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError Boundary]:", error);
    Sentry.captureException(error);

    if (typeof window !== "undefined" && isStaleDeploymentError(error)) {
      const key = "zera:auto-reload-ts";
      const last = Number(window.sessionStorage.getItem(key) || "0");
      if (Date.now() - last > 15_000) {
        window.sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    }
  }, [error]);

  const stale = isStaleDeploymentError(error);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-11 h-11 rounded-2xl bg-zinc-200/80 dark:bg-white/10 text-zinc-900 dark:text-white mx-auto flex items-center justify-center">
          <RotateCcw className="w-5 h-5" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-geometric font-semibold tracking-tight text-zinc-950 dark:text-white">
            {stale ? "New update available" : "Something went wrong"}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {stale
              ? "The app was just updated. Tap below to refresh and continue right where you left off."
              : "A brief hiccup occurred while loading. Your data is safe — please try again."}
          </p>
        </div>

        <div className="pt-1 flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (stale && typeof window !== "undefined") {
                window.location.reload();
                return;
              }
              reset();
            }}
            className="h-10 px-5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="h-10 px-5 rounded-full bg-zinc-200/75 dark:bg-white/10 text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center justify-center hover:bg-zinc-300/70 dark:hover:bg-white/15 active:scale-95 transition"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
