import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  MAX_AVATAR_BYTES,
  MAX_UPLOAD_BYTES,
  SESSION_COOKIE_NAME,
  getAppUrl,
  getEmailConfig,
  getGoogleOAuthConfig,
  getMidtransConfig,
  getPaymentProvider,
  getSupabaseConfig,
  isPaymentSimulationAllowed,
} from "@/wellness/config";

describe("Config & Brand Helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("builds properly encoded concierge WhatsApp URLs", () => {
    const url = buildConciergeWhatsAppUrl("Hi zera.id! Need help?");
    expect(url).toBe(
      `https://wa.me/${BRAND.conciergeWhatsApp}?text=${encodeURIComponent("Hi zera.id! Need help?")}`
    );
  });

  it("exposes operational constants and derives environment-backed configs safely", () => {
    expect(SESSION_COOKIE_NAME).toBe("wellness_session");
    expect(MAX_UPLOAD_BYTES).toBeGreaterThan(MAX_AVATAR_BYTES);

    process.env.APP_URL = "https://zera.id///";
    expect(getAppUrl()).toBe("https://zera.id");

    process.env.PAYMENT_PROVIDER = "MIDTRANS";
    expect(getPaymentProvider()).toBe("MIDTRANS");
    process.env.PAYMENT_PROVIDER = "UNKNOWN_VENDOR";
    expect(getPaymentProvider()).toBe("INTERNAL_SIMULATION");

    process.env.ALLOW_PAYMENT_SIMULATION = "true";
    expect(isPaymentSimulationAllowed()).toBe(true);

    process.env.MIDTRANS_IS_PRODUCTION = "false";
    expect(getMidtransConfig().apiBaseUrl).toBe("https://api.sandbox.midtrans.com");
    process.env.MIDTRANS_IS_PRODUCTION = "true";
    expect(getMidtransConfig().apiBaseUrl).toBe("https://api.midtrans.com");

    process.env.SUPABASE_URL = "https://proj.supabase.co/";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "srv_key";
    expect(getSupabaseConfig()).toEqual({
      url: "https://proj.supabase.co",
      serviceRoleKey: "srv_key",
    });

    process.env.EMAIL_PROVIDER = "RESEND";
    process.env.RESEND_API_KEY = "re_123";
    expect(getEmailConfig()).toMatchObject({ provider: "RESEND", resendApiKey: "re_123" });

    delete process.env.GOOGLE_REDIRECT_URI;
    expect(getGoogleOAuthConfig("https://origin.test").redirectUri).toBe(
      "https://zera.id/api/auth/google/callback"
    );
  });

  it("throws fatal error in production when JWT_SECRET is missing", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.JWT_SECRET;

    const freshConfig = await import("@/wellness/config");
    expect(() => freshConfig.getJwtSecretKey()).toThrow(/FATAL SECURITY CONFIGURATION/);
    vi.unstubAllEnvs();
  });
});
