import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const {
  mockGetSession,
  mockVerifySameOrigin,
  mockRateLimit,
  mockIsSupabaseConfigured,
  mockUploadPrivate,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockVerifySameOrigin: vi.fn(),
  mockRateLimit: vi.fn(),
  mockIsSupabaseConfigured: vi.fn(),
  mockUploadPrivate: vi.fn(),
}));

vi.mock("@/wellness/security/session", () => ({
  getWellnessSession: mockGetSession,
  isAdminRole: (role?: string | null) =>
    role === "SUPERADMIN" || role === "ADMIN" || role === "PARTNER_ADMIN" || role === "COACH",
  isPlatformAdminRole: (role?: string | null) =>
    role === "SUPERADMIN" || role === "ADMIN",
}));

vi.mock("@/wellness/security/csrf", () => ({
  verifySameOriginRequest: mockVerifySameOrigin,
}));

vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
}));

vi.mock("@/wellness/integrations/supabase-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/supabase-storage")>();
  return {
    ...actual,
    isSupabaseStorageConfigured: mockIsSupabaseConfigured,
    uploadPrivateStorageObject: mockUploadPrivate,
  };
});

import { POST as uploadPost } from "@/app/api/upload/route";

function makeUploadReq(body: unknown, contentLengthOverride?: string) {
  const raw = JSON.stringify(body);
  return new NextRequest("https://zera.id/api/upload", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": contentLengthOverride ?? String(Buffer.byteLength(raw)),
    },
    body: raw,
  });
}

describe("API Route: POST /api/upload (CSRF, RBAC, Rate-Limit & Sharp Sanitization)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySameOrigin.mockReturnValue(true);
    mockGetSession.mockResolvedValue({ userId: "user_1", role: "USER" });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 19, resetMs: 60_000 });
    mockIsSupabaseConfigured.mockReturnValue(false);
  });

  it("blocks cross-origin CSRF (403), unauthenticated users (401), rate-limited bursts (429), and oversized bodies (413)", async () => {
    mockVerifySameOrigin.mockReturnValueOnce(false);
    expect((await uploadPost(makeUploadReq({}))).status).toBe(403);

    mockGetSession.mockResolvedValueOnce(null);
    expect((await uploadPost(makeUploadReq({}))).status).toBe(401);

    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 12_000 });
    const rlRes = await uploadPost(makeUploadReq({}));
    expect(rlRes.status).toBe(429);
    expect(rlRes.headers.get("retry-after")).toBe("12");

    expect((await uploadPost(makeUploadReq({}, "99999999"))).status).toBe(413);
    expect((await uploadPost(makeUploadReq({}, "0"))).status).toBe(413);
  });

  it("blocks regular USER and PARTNER_ADMIN/COACH from uploading program-cover assets", async () => {
    const res1 = await uploadPost(makeUploadReq({ type: "org-logo", dataUrl: "x" }));
    const res2 = await uploadPost(makeUploadReq({ type: "program-cover", dataUrl: "x" }));
    expect(res1.status).toBe(403);
    expect(res2.status).toBe(403);

    mockGetSession.mockResolvedValueOnce({ userId: "pa_1", role: "PARTNER_ADMIN" });
    const paCover = await uploadPost(makeUploadReq({ type: "program-cover", dataUrl: "x" }));
    expect(paCover.status).toBe(403);
  });

  it("rejects SVG data URLs and polyglot/spoofed magic bytes masquerading as JPEG", async () => {
    const svgRes = await uploadPost(
      makeUploadReq({
        type: "custom",
        dataUrl: `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`,
      })
    );
    expect(svgRes.status).toBe(400);

    // Claims data:image/jpeg but contains HTML script bytes
    const spoofedRes = await uploadPost(
      makeUploadReq({
        type: "custom",
        dataUrl: `data:image/jpeg;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`,
      })
    );
    expect(spoofedRes.status).toBe(400);
  });

  it("decodes, re-encodes valid PNG to WebP inline (fallback) and private Supabase storage when configured", async () => {
    const validPng = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${validPng.toString("base64")}`;

    // Fallback mode (no Supabase)
    const inlineRes = await uploadPost(makeUploadReq({ type: "custom", dataUrl }));
    const inlineJson = await inlineRes.json();
    expect(inlineRes.status).toBe(200);
    expect(inlineJson.success).toBe(true);
    expect(inlineJson.storagePath).toMatch(/^data:image\/webp;base64,/);

    // Supabase private bucket mode for ADMIN uploading program-cover
    mockGetSession.mockResolvedValueOnce({ userId: "admin_1", role: "SUPERADMIN" });
    mockIsSupabaseConfigured.mockReturnValueOnce(true);
    mockUploadPrivate.mockResolvedValueOnce({
      storageUri: "sb://workout-media/admin_1/program-cover-123.webp",
      signedUrl: "https://storage.supabase.co/signed",
    });

    const sbRes = await uploadPost(makeUploadReq({ type: "program-cover", dataUrl }));
    const sbJson = await sbRes.json();
    expect(sbRes.status).toBe(200);
    expect(sbJson.storagePath).toBe("sb://workout-media/admin_1/program-cover-123.webp");
    expect(sbJson.url).toContain("/api/media/signed?path=");
  });
});
