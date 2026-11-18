"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError Boundary]:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-md w-full rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-8 text-center space-y-4 shadow-xs">
        <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-400">
          System Notice
        </p>
        <h1 className="text-xl font-geometric font-medium tracking-tight">
          Something went wrong
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          We encountered a temporary issue loading this view. Your progress and account data remain safe.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full border border-zinc-200 dark:border-white/15 text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
