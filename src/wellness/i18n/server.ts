import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, normalizeLocale, type Locale } from "./types";

export function getServerLocale(userPreferredLocale?: string | null): Locale {
  try {
    const cookieStore = cookies();
    const rawCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
    if (rawCookie) {
      return normalizeLocale(rawCookie);
    }
  } catch {
    // Outside request context
  }
  if (userPreferredLocale) {
    return normalizeLocale(userPreferredLocale);
  }
  return DEFAULT_LOCALE;
}
