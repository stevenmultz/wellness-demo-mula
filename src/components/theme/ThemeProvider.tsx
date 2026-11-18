"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLightOnlyRoute = pathname?.startsWith("/dashboard") ?? false;
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const syncThemeMeta = (next: Theme) => {
    const color = next === "dark" ? "#0e0e0e" : "#f6f6f4";
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute("content", color);
    });
  };

  useEffect(() => {
    if (isLightOnlyRoute) {
      document.documentElement.classList.remove("dark");
      syncThemeMeta("light");
      setMounted(true);
      return;
    }

    const saved = localStorage.getItem("wellness-theme") as Theme | null;
    const isDark =
      saved === "dark" ||
      (!saved &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
      syncThemeMeta("dark");
    } else {
      setThemeState("light");
      document.documentElement.classList.remove("dark");
      syncThemeMeta("light");
    }
    setMounted(true);
  }, [isLightOnlyRoute]);

  const effectiveTheme: Theme = isLightOnlyRoute ? "light" : theme;

  const setTheme = (newTheme: Theme) => {
    if (isLightOnlyRoute) {
      document.documentElement.classList.remove("dark");
      syncThemeMeta("light");
      return;
    }
    setThemeState(newTheme);
    localStorage.setItem("wellness-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    syncThemeMeta(newTheme);
  };

  const toggleTheme = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme: effectiveTheme, toggleTheme, setTheme }}>
      <div data-theme-mounted={mounted ? "true" : "false"}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
