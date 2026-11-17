"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import type { Locale } from "@/wellness/i18n/types";

export function LocaleToggle({
  className = "",
  confirmReload = false,
  variant = "link",
}: {
  className?: string;
  confirmReload?: boolean;
  variant?: "link" | "pill";
}) {
  const { locale, setLocale, isUpdating } = useLocale();
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [reloading, setReloading] = useState(false);

  const handleSelect = (target: Locale) => {
    if (isUpdating || reloading || target === locale) return;
    if (confirmReload) {
      setPendingLocale(target);
      return;
    }
    setLocale(target);
  };

  const handleConfirmReload = () => {
    if (!pendingLocale) return;
    setReloading(true);
    setLocale(pendingLocale, { reload: true });
  };

  return (
    <>
      {variant === "pill" ? (
        <div
          role="group"
          aria-label="Language switcher"
          className={`inline-flex items-center p-0.5 rounded-full bg-zinc-100 dark:bg-white/10 border border-zinc-200/80 dark:border-white/15 ${className}`}
        >
          {(["id", "en"] as const).map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                disabled={isUpdating || reloading}
                onClick={() => handleSelect(code)}
                className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider transition active:scale-95 ${
                  active
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                }`}
                title={code === "id" ? "Bahasa Indonesia" : "English"}
              >
                {code}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          role="group"
          aria-label="Language switcher"
          className={`inline-flex items-center gap-1.5 text-xs font-sans ${className}`}
        >
          <button
            type="button"
            disabled={isUpdating || reloading}
            onClick={() => handleSelect("id")}
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
            disabled={isUpdating || reloading}
            onClick={() => handleSelect("en")}
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
      )}

      {pendingLocale &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="locale-reload-title"
            className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/15 p-6 shadow-2xl space-y-5">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 flex items-center justify-center mx-auto text-zinc-950 dark:text-white">
                <RefreshCw className={`w-5 h-5 ${reloading ? "animate-spin" : ""}`} />
              </div>

              <div className="text-center space-y-2">
                <h3
                  id="locale-reload-title"
                  className="text-base font-geometric font-semibold text-zinc-950 dark:text-white"
                >
                  {pendingLocale === "id"
                    ? "Ganti ke Bahasa Indonesia?"
                    : "Switch to English?"}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {pendingLocale === "id"
                    ? "Aplikasi harus dimuat ulang (reload) agar seluruh tampilan dan teks program diperbarui ke Bahasa Indonesia."
                    : "The app needs to reload so all pages and program text update cleanly to English."}
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={reloading}
                  onClick={() => setPendingLocale(null)}
                  className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-white/15 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50 transition"
                >
                  {pendingLocale === "id" ? "Batal" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={reloading}
                  onClick={handleConfirmReload}
                  className="flex-1 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 active:scale-[0.98] transition"
                >
                  {reloading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {reloading
                      ? pendingLocale === "id"
                        ? "Memuat ulang..."
                        : "Reloading..."
                      : pendingLocale === "id"
                        ? "Muat Ulang App"
                        : "Reload App"}
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
