"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle visual theme"
      title={theme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
      className={`border-0 bg-transparent p-0 text-xs font-mono uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer ${className}`}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
