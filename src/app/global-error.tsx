"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

function isStaleDeploymentError(err: Error | undefined): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("failed to find server action") ||
    msg.includes("chunkloaderror") ||
    msg.includes("loading chunk") ||
    msg.includes("dynamically imported module")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError Boundary]:", error);
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
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center px-6 bg-[#f6f6f4] text-zinc-900 font-sans antialiased">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-11 h-11 rounded-2xl bg-zinc-200/80 text-zinc-900 mx-auto flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-950">
              {stale ? "Update ready" : "Connection interrupted"}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
              {stale
                ? "A newer version is ready. Tap refresh to continue smoothly."
                : "Your progress is safe. Tap below to refresh the page."}
            </p>
          </div>

          <div className="pt-1 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                reset();
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="h-10 px-6 rounded-full bg-zinc-950 text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
