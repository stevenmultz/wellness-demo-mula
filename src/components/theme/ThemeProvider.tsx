"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const syncThemeMeta = (next: Theme) => {
    const color = next === "dark" ? "#0e0e0e" : "#f6f6f4";
    document.querySelectorAll('meta[name="theme-color"]').forEach((el) => {
      el.setAttribute("content", color);
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem("wellness-theme") as Theme | null;
    if (saved === "dark") {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
      syncThemeMeta("dark");
    } else {
      // Default to Monochrome Light + Orange Silver luxury theme
      setThemeState("light");
      document.documentElement.classList.remove("dark");
      syncThemeMeta("light");
    }
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("wellness-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    syncThemeMeta(newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div data-theme-mounted={mounted ? "true" : "false"}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
