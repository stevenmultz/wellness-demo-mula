import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

const { mockPrisma, mockSetSessionCookie, mockRecordAuditLog } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
  },
  mockSetSessionCookie: vi.fn(),
  mockRecordAuditLog: vi.fn(),
}));

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/wellness/security/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/session")>();
  return {
    ...actual,
    setSessionCookie: mockSetSessionCookie,
  };
});

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { GET as googleCallbackGet } from "@/app/api/auth/google/callback/route";
import { getJwtSecretKey, GOOGLE_OAUTH_COOKIE } from "@/wellness/config";

async function signOAuthCookie(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m")
    .sign(getJwtSecretKey());
}

describe("API Route: GET /api/auth/google/callback (OAuth CSRF & Error Guards)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.APP_URL = "https://zera.id";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("redirects with cancellation error when code/state is missing or Google returned error", async () => {
    const res1 = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?error=access_denied")
    );
    expect(res1.status).toBe(307);
    expect(res1.headers.get("location")).toBe("https://zera.id/?authError=access_denied");

    const res2 = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback")
    );
    expect(res2.headers.get("location")).toBe("https://zera.id/?authError=google_oauth_cancelled");
  });

  it("blocks missing, tampered, or mismatched OAuth state cookies (OAuth CSRF defense)", async () => {
    // Missing cookie
    const missing = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?code=abc&state=st_1")
    );
    expect(missing.headers.get("location")).toBe(
      "https://zera.id/?authError=google_oauth_state_missing"
    );

    // Tampered JWT cookie
    const tampered = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?code=abc&state=st_1", {
        headers: { cookie: `${GOOGLE_OAUTH_COOKIE}=tampered.jwt.token` },
      })
    );
    expect(tampered.headers.get("location")).toBe(
      "https://zera.id/?authError=google_oauth_state_invalid"
    );

    // Valid cookie but mismatched state parameter
    const validCookie = await signOAuthCookie({ state: "expected_state", codeVerifier: "verifier_1" });
    const mismatch = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?code=abc&state=attacker_state", {
        headers: { cookie: `${GOOGLE_OAUTH_COOKIE}=${validCookie}` },
      })
    );
    expect(mismatch.headers.get("location")).toBe(
      "https://zera.id/?authError=google_oauth_state_mismatch"
    );
  });

  it("handles missing Google OAuth env credentials and token exchange failures cleanly", async () => {
    const validCookie = await signOAuthCookie({ state: "st_ok", codeVerifier: "verifier_1" });

    delete process.env.GOOGLE_CLIENT_ID;
    const unconf = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?code=abc&state=st_ok", {
        headers: { cookie: `${GOOGLE_OAUTH_COOKIE}=${validCookie}` },
      })
    );
    expect(unconf.headers.get("location")).toBe("https://zera.id/?authError=google_not_configured");

    // Token exchange HTTP 400
    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
    );
    const failedExchange = await googleCallbackGet(
      new NextRequest("https://zera.id/api/auth/google/callback?code=badcode&state=st_ok", {
        headers: { cookie: `${GOOGLE_OAUTH_COOKIE}=${validCookie}` },
      })
    );
    expect(failedExchange.headers.get("location")).toBe(
      "https://zera.id/?authError=google_token_exchange_failed"
    );
  });
});
