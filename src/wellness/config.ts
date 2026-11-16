/**
 * Centralized server & Edge runtime configuration.
 * All environment variable reads and operational constants live here instead of
 * being scattered as `process.env.*` lookups or magic literals across the codebase.
 *
 * Must remain Edge-runtime compatible (no Node.js `fs`, `path`, or `crypto` imports)
 * so `src/middleware.ts` can share `getJwtSecretKey()` and `SESSION_COOKIE_NAME`.
 */
import { BRAND } from "./brand";

export const SESSION_COOKIE_NAME = "wellness_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_EXPIRATION_CLAIM = "7d";

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
export const QRIS_INVOICE_TTL_MS = 15 * 60 * 1000;

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BODY_BYTES = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 1024;

export const MAX_AVATAR_BYTES = 400 * 1024;
export const MAX_AVATAR_BODY_BYTES = Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 1024;

export const MAX_CRON_BODY_BYTES = 4096;

export const EMAIL_REQUEST_TIMEOUT_MS = 10_000;
export const EMAIL_MAX_ATTEMPTS = 2;
export const PUSH_REQUEST_TIMEOUT_MS = 10_000;

export const RATE_LIMITS = {
  signupIp: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  signupEmail: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  signinIp: { windowMs: 15 * 60 * 1000, maxRequests: 30 },
  signinAccount: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  pwdResetIp: { windowMs: 15 * 60 * 1000, maxRequests: 15 },
  pwdResetEmail: { windowMs: 15 * 60 * 1000, maxRequests: 3 },
  upload: { windowMs: 60 * 1000, maxRequests: 20 },
  avatar: { windowMs: 60 * 1000, maxRequests: 10 },
  notificationsTick: { windowMs: 60 * 1000, maxRequests: 4 },
} as const;

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopmentEnv(): boolean {
  return process.env.NODE_ENV === "development";
}

let cachedJwtSecretKey: Uint8Array | null = null;

/**
 * Returns the HMAC-SHA256 key bytes for signing and verifying session JWTs.
 * Throws in production if `JWT_SECRET` is missing.
 */
export function getJwtSecretKey(): Uint8Array {
  if (cachedJwtSecretKey) {
    return cachedJwtSecretKey;
  }
  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret && isProductionEnv()) {
    throw new Error(
      "FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable must be configured in production."
    );
  }
  cachedJwtSecretKey = new TextEncoder().encode(
    rawSecret || "wellness_platform_dev_only_jwt_secret_do_not_use_in_prod"
  );
  return cachedJwtSecretKey;
}

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function getAppUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function getCronSecret(): string {
  return process.env.CRON_SECRET || "";
}

export type PaymentProviderMode = "INTERNAL_SIMULATION" | "MIDTRANS" | "XENDIT";

export function getPaymentProvider(): PaymentProviderMode {
  const raw = process.env.PAYMENT_PROVIDER;
  if (raw === "MIDTRANS" || raw === "XENDIT") {
    return raw;
  }
  return "INTERNAL_SIMULATION";
}

export function isPaymentSimulationAllowed(): boolean {
  return process.env.ALLOW_PAYMENT_SIMULATION === "true" || isDevelopmentEnv();
}

export function getEmailConfig(): {
  provider: string;
  resendApiKey: string | undefined;
  from: string;
} {
  return {
    provider: process.env.EMAIL_PROVIDER || "CONSOLE_DEV",
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || `${BRAND.fullName} <no-reply@wellness.id>`,
  };
}

export function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || `mailto:${BRAND.supportEmail}`,
  };
}
