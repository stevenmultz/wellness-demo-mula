/**
 * Single Source of Truth for all brand identity, naming, and copy constants.
 * Update this file (and BrandLogo.tsx) to rebrand the entire application consistently.
 */
export const BRAND = {
  /** Primary short brand name (e.g. "zera.id") */
  name: "zera.id",
  /** Wordmark primary text */
  wordmarkPrimary: "zera",
  /** Wordmark accent symbol */
  wordmarkAccent: ".id",
  /** Full platform brand name */
  fullName: "zera.id",
  /** Default page title */
  title: "zera.id — Wellness & Movement Community",
  /** Platform label for exports/diagnostics */
  platform: "zera.id PWA",
  /** Support email */
  supportEmail: "support@zera.id",
  /** Fallback coach & faculty labels */
  coachFallback: "zera.id Coach",
  facultyFallback: "zera.id Faculty",
  /** Copyright notice */
  copyright: "© 2026 zera.id",
  /** Web Push notification tag prefix */
  notificationTagPrefix: "zera-cadence",
  /** Concierge WhatsApp phone number (E.164 digits without `+`) */
  conciergeWhatsApp: process.env.NEXT_PUBLIC_CONCIERGE_WHATSAPP || "6281290002026",
} as const;

export function buildConciergeWhatsAppUrl(message: string): string {
  return `https://wa.me/${BRAND.conciergeWhatsApp}?text=${encodeURIComponent(message)}`;
}
