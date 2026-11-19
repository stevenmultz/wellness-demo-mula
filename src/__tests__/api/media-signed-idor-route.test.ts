import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockCreateSignedUrl,
  mockFindFirstProgram,
  mockFindFirstOrg,
  mockCountEnrollment,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
  mockFindFirstProgram: vi.fn(),
  mockFindFirstOrg: vi.fn(),
  mockCountEnrollment: vi.fn(),
}));

vi.mock("@/wellness/security/session", () => ({
  getWellnessSession: mockGetSession,
  isAdminRole: (role?: string | null) =>
    role === "SUPERADMIN" || role === "PARTNER_ADMIN" || role === "COACH",
}));

vi.mock("@/wellness/integrations/supabase-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/supabase-storage")>();
  return {
    ...actual,
    createSignedStorageUrl: mockCreateSignedUrl,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: {
    program: { findFirst: mockFindFirstProgram },
    masterOrganization: { findFirst: mockFindFirstOrg },
    programEnrollment: { count: mockCountEnrollment },
  },
}));

import { GET as signedMediaGet } from "@/app/api/media/signed/route";

function reqFor(storagePath: string) {
  return new NextRequest(
    `https://zera.id/api/media/signed?path=${encodeURIComponent(storagePath)}`
  );
}

describe("API Route: GET /api/media/signed (IDOR & Privacy Protection)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects malformed paths, traversal attempts, and disallowed buckets with 400", async () => {
    expect((await signedMediaGet(reqFor("https://evil.com/x.png"))).status).toBe(400);
    expect((await signedMediaGet(reqFor("sb://avatars/../secret.webp"))).status).toBe(400);
    expect((await signedMediaGet(reqFor("sb://private-backups/dump.sql"))).status).toBe(400);
  });

  it("blocks unauthenticated requests to private user photos (401) but allows public published covers (302)", async () => {
    mockGetSession.mockResolvedValue(null);

    // Private workout photo -> not a program cover or org logo -> 401
    mockFindFirstProgram.mockResolvedValueOnce(null);
    mockFindFirstOrg.mockResolvedValueOnce(null);
    expect((await signedMediaGet(reqFor("sb://workout-media/userA/day1.webp"))).status).toBe(401);

    // Published program cover -> allowed publicly
    mockFindFirstProgram.mockResolvedValueOnce({ id: "prog_1" });
    mockFindFirstOrg.mockResolvedValueOnce(null);
    mockCreateSignedUrl.mockResolvedValueOnce("https://storage.supabase.co/signed-cover");
    const pubRes = await signedMediaGet(reqFor("sb://workout-media/covers/p1.webp"));
    expect(pubRes.status).toBe(302);
    expect(pubRes.headers.get("location")).toBe("https://storage.supabase.co/signed-cover");
    expect(pubRes.headers.get("cache-control")).toContain("public");
  });

  it("prevents IDOR: User B cannot access User A's private progress photo (403)", async () => {
    mockGetSession.mockResolvedValue({ userId: "userB", role: "USER" });
    mockFindFirstProgram.mockResolvedValueOnce(null);
    mockFindFirstOrg.mockResolvedValueOnce(null);

    const res = await signedMediaGet(reqFor("sb://workout-media/userA/before.webp"));
    expect(res.status).toBe(403);
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("enforces cohort/org scope for COACH & PARTNER_ADMIN (blocks foreign user media, allows enrolled member)", async () => {
    mockGetSession.mockResolvedValue({
      userId: "coach1",
      role: "COACH",
      coachProfileId: "cp_1",
      coachProfileName: "Coach Julian",
    });

    // User outside coach's cohort -> 403
    mockCountEnrollment.mockResolvedValueOnce(0);
    mockFindFirstProgram.mockResolvedValueOnce(null);
    mockFindFirstOrg.mockResolvedValueOnce(null);
    expect((await signedMediaGet(reqFor("sb://workout-media/foreignUser/pic.webp"))).status).toBe(
      403
    );

    // User enrolled in coach's cohort -> 302 private redirect
    mockCountEnrollment.mockResolvedValueOnce(1);
    mockCreateSignedUrl.mockResolvedValueOnce("https://storage.supabase.co/signed-member");
    const okRes = await signedMediaGet(reqFor("sb://workout-media/memberInCohort/pic.webp"));
    expect(okRes.status).toBe(302);
    expect(okRes.headers.get("cache-control")).toContain("private");
  });

  it("allows owner and SUPERADMIN directly and returns 404 if storage object is missing", async () => {
    mockGetSession.mockResolvedValue({ userId: "userA", role: "USER" });
    mockCreateSignedUrl.mockResolvedValueOnce("https://storage.supabase.co/signed-own");
    const ownRes = await signedMediaGet(reqFor("sb://avatars/userA/avatar.webp"));
    expect(ownRes.status).toBe(302);

    mockGetSession.mockResolvedValue({ userId: "admin1", role: "SUPERADMIN" });
    mockCreateSignedUrl.mockResolvedValueOnce(null);
    const missingRes = await signedMediaGet(reqFor("sb://avatars/userA/deleted.webp"));
    expect(missingRes.status).toBe(404);
  });
});
