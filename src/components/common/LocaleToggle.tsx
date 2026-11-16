"use client";

import { useLocale } from "@/wellness/i18n/LocaleContext";

export function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, isUpdating } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`inline-flex items-center gap-1.5 text-xs font-sans ${className}`}
    >
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setLocale("id")}
        className={`border-0 bg-transparent p-0 transition-colors cursor-pointer ${
          locale === "id"
            ? "font-semibold text-zinc-950 dark:text-white underline underline-offset-4"
            : "font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        }`}
        title="Bahasa Indonesia"
      >
        ID
      </button>
      <span className="text-zinc-300 dark:text-zinc-600 select-none">/</span>
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setLocale("en")}
        className={`border-0 bg-transparent p-0 transition-colors cursor-pointer ${
          locale === "en"
            ? "font-semibold text-zinc-950 dark:text-white underline underline-offset-4"
            : "font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
