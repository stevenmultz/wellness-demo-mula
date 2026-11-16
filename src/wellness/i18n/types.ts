export type Locale = "id" | "en";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const DEFAULT_LOCALE: Locale = "en";

export function normalizeLocale(raw?: string | null): Locale {
  if (!raw) return DEFAULT_LOCALE;
  const v = raw.toLowerCase().trim();
  if (v === "id" || v.startsWith("id-")) return "id";
  if (v === "en" || v.startsWith("en-")) return "en";
  return DEFAULT_LOCALE;
}

export interface LocalizedFieldMap {
  id?: Record<string, string | undefined>;
  en?: Record<string, string | undefined>;
}

/**
 * Resolves a localized text field from an optional JSON translations column
 * (`{ id?: { [field]: "..." }, en?: { [field]: "..." } }`), falling back cleanly
 * to the primary string when no translation is configured.
 */
export function resolveLocalizedField(
  primaryValue: string | null | undefined,
  translationsJson: string | null | undefined,
  locale: Locale,
  field: string
): string {
  const base = primaryValue ?? "";
  if (!translationsJson) return base;
  try {
    const parsed = JSON.parse(translationsJson) as LocalizedFieldMap;
    const translated = parsed?.[locale]?.[field];
    if (typeof translated === "string" && translated.trim().length > 0) {
      return translated;
    }
  } catch {
    // Ignore malformed translation JSON and fall back safely
  }
  return base;
}
