"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Dictionary } from "./dictionaries";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "./types";
import { wellnessSetLocale } from "../actions/locale";

interface LocaleContextValue {
  locale: Locale;
  t: Dictionary;
  isUpdating: boolean;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  t: getDictionary(DEFAULT_LOCALE),
  isUpdating: false,
  setLocale: () => {},
  toggleLocale: () => {},
});

export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(normalizeLocale(initialLocale));
  const [isUpdating, startTransition] = useTransition();

  const setLocale = (next: Locale) => {
    const normalized = normalizeLocale(next);
    if (normalized === locale) return;
    setLocaleState(normalized);
    if (typeof document !== "undefined") {
      document.documentElement.lang = normalized;
    }
    startTransition(async () => {
      await wellnessSetLocale(normalized);
      router.refresh();
    });
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "id" : "en");
  };

  return (
    <LocaleContext.Provider
      value={{
        locale,
        t: getDictionary(locale),
        isUpdating,
        setLocale,
        toggleLocale,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
