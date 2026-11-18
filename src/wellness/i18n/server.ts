import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, normalizeLocale, type Locale } from "./types";

export async function getServerLocale(userPreferredLocale?: string | null): Promise<Locale> {
  try {
    const cookieStore = await cookies();
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
