import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 font-sans">
      <div className="max-w-md w-full rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#141414] p-8 text-center space-y-4 shadow-xs">
        <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-zinc-400">
          404 • Not Found
        </p>
        <h1 className="text-xl font-geometric font-medium tracking-tight">
          Page not found
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          The page or cohort you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
          >
            Dashboard
          </Link>
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
