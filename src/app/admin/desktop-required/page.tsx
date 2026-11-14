import Link from "next/link";
import { Monitor, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function DesktopRequiredPage() {
  return (
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full space-y-6 relative z-10">
        <div className="w-12 h-12 glass-panel-subtle text-zinc-900 dark:text-zinc-100 rounded-xl flex items-center justify-center mx-auto">
          <Monitor className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Desktop Browser Required
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
            The Admin Console is optimized for desktop screens. Please open this page on a desktop or laptop browser.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl chrome-button text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center px-5 py-2.5 rounded-xl graphite-button text-xs font-medium"
          >
            Home
          </Link>
        </div>
        <div className="pt-2">
          <Link
            href="/admin?forceDesktop=true"
            className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 underline font-mono"
          >
            Tablet / Emergency Mode: Continue anyway &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
