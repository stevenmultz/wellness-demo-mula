"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
  }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center px-6 bg-[#f6f6f4] text-zinc-900 font-sans antialiased">
        <div className="max-w-md w-full rounded-3xl border border-zinc-200 bg-white p-8 text-center space-y-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-400">
            System Recovery
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Temporary application error
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Please reload the page to continue.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                reset();
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
              className="px-5 py-2.5 rounded-full bg-zinc-950 text-white text-xs font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
