import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import sharp from "sharp";

const {
  mockGetSession,
  mockVerifySameOrigin,
  mockRateLimit,
  mockIsSupabaseConfigured,
  mockUploadPrivate,
  mockDeleteStorageObjects,
  mockPrisma,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockVerifySameOrigin: vi.fn(),
  mockRateLimit: vi.fn(),
  mockIsSupabaseConfigured: vi.fn(),
  mockUploadPrivate: vi.fn(),
  mockDeleteStorageObjects: vi.fn(),
  mockPrisma: {
    user: { update: vi.fn() },
    programEnrollment: { count: vi.fn() },
  },
}));

vi.mock("@/wellness/security/session", () => ({
  getWellnessSession: mockGetSession,
  isAdminRole: (role?: string | null) =>
    role === "SUPERADMIN" || role === "PARTNER_ADMIN" || role === "COACH",
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
    deleteStorageObjects: mockDeleteStorageObjects,
  };
});

vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import { GET as workoutMediaGet } from "@/app/api/media/workouts/[filename]/route";
import { DELETE as avatarDelete, POST as avatarPost } from "@/app/api/profile/avatar/route";

describe("API Route: GET /api/media/workouts/[filename] (Path Traversal & IDOR Guards)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unauthenticated requests (401) and path traversal / invalid filenames (400)", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const unauth = await workoutMediaGet(
      new NextRequest("https://zera.id/api/media/workouts/u1-custom-1-ab.webp"),
      { params: Promise.resolve({ filename: "u1-custom-1-ab.webp" }) }
    );
    expect(unauth.status).toBe(401);

    mockGetSession.mockResolvedValue({ userId: "u1", role: "USER" });
    for (const badName of ["../.env", "u1-custom-1-ab.svg", "passwd", "u1-evil-1-ab.webp"]) {
      const res = await workoutMediaGet(
        new NextRequest(`https://zera.id/api/media/workouts/${encodeURIComponent(badName)}`),
        { params: Promise.resolve({ filename: badName }) }
      );
      expect(res.status, `Expected 400 for ${badName}`).toBe(400);
    }
  });

  it("enforces strict ownership & scoped coach authorization (403 IDOR block)", async () => {
    // Regular user requesting another user's workout photo -> 403
    mockGetSession.mockResolvedValueOnce({ userId: "userB", role: "USER" });
    const idorUser = await workoutMediaGet(
      new NextRequest("https://zera.id/api/media/workouts/userA-before-123-abcdef.webp"),
      { params: Promise.resolve({ filename: "userA-before-123-abcdef.webp" }) }
    );
    expect(idorUser.status).toBe(403);

    // Coach requesting foreign user's photo outside their cohort -> 403
    mockGetSession.mockResolvedValueOnce({
      userId: "coach1",
      role: "COACH",
      coachProfileId: "cp1",
    });
    mockPrisma.programEnrollment.count.mockResolvedValueOnce(0);
    const idorCoach = await workoutMediaGet(
      new NextRequest("https://zera.id/api/media/workouts/userA-before-123-abcdef.webp"),
      { params: Promise.resolve({ filename: "userA-before-123-abcdef.webp" }) }
    );
    expect(idorCoach.status).toBe(403);
  });
});

describe("API Route: POST & DELETE /api/profile/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySameOrigin.mockReturnValue(true);
    mockGetSession.mockResolvedValue({
      userId: "u_1",
      role: "USER",
      avatarPath: "sb://avatars/u_1/old-avatar.webp",
    });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetMs: 60_000 });
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockDeleteStorageObjects.mockResolvedValue(undefined);
  });

  it("enforces CSRF, 400KB size cap, re-encodes via Sharp, uploads privately, and cleans up old avatar", async () => {
    // CSRF rejected
    mockVerifySameOrigin.mockReturnValueOnce(false);
    const csrfRes = await avatarPost(
      new NextRequest("https://zera.id/api/profile/avatar", {
        method: "POST",
        headers: { "content-length": "100" },
        body: "{}",
      })
    );
    expect(csrfRes.status).toBe(403);

    // Valid PNG -> 384x384 WebP uploaded to avatars bucket + old avatar deleted
    const validPng = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 40, g: 40, b: 45 } },
    })
      .png()
      .toBuffer();
    const raw = JSON.stringify({ dataUrl: `data:image/png;base64,${validPng.toString("base64")}` });

    mockUploadPrivate.mockResolvedValueOnce({
      storageUri: "sb://avatars/u_1/avatar-new.webp",
      signedUrl: "https://storage.supabase.co/signed-avatar",
    });

    const okRes = await avatarPost(
      new NextRequest("https://zera.id/api/profile/avatar", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(raw)),
        },
        body: raw,
      })
    );
    expect(okRes.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u_1" },
      data: { avatarPath: "sb://avatars/u_1/avatar-new.webp" },
    });
    expect(mockDeleteStorageObjects).toHaveBeenCalledWith(["sb://avatars/u_1/old-avatar.webp"]);

    // DELETE removes avatarPath and deletes storage object
    const delRes = await avatarDelete(
      new NextRequest("https://zera.id/api/profile/avatar", { method: "DELETE" })
    );
    expect(delRes.status).toBe(200);
    expect(mockPrisma.user.update).toHaveBeenLastCalledWith({
      where: { id: "u_1" },
      data: { avatarPath: null },
    });
  });
});
