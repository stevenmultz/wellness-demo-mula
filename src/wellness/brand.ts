/**
 * Single Source of Truth for all brand identity, naming, and copy constants.
 * Update this file (and BrandLogo.tsx) to rebrand the entire application consistently.
 */
export const BRAND = {
  /** Primary short brand name (e.g. "ZERA +") */
  name: "ZERA +",
  /** Wordmark primary text */
  wordmarkPrimary: "ZERA",
  /** Wordmark accent symbol */
  wordmarkAccent: "+",
  /** Full sanctuary brand name */
  fullName: "ZERA + Sanctuary",
  /** Default page title */
  title: "ZERA + — Minimalist Longevity & Movement Sanctuary",
  /** Platform label for exports/diagnostics */
  platform: "ZERA + PWA",
  /** Support email */
  supportEmail: "support@zera.plus",
  /** Fallback coach & faculty labels */
  coachFallback: "ZERA + Coach",
  facultyFallback: "ZERA Faculty",
  /** Copyright notice */
  copyright: "© 2026 ZERA +",
  /** Web Push notification tag prefix */
  notificationTagPrefix: "zera-cadence",
} as const;
