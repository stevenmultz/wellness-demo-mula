import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockGetSession, mockFindPrograms, mockFindEnrollments } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockFindPrograms: vi.fn(),
  mockFindEnrollments: vi.fn(),
}));

vi.mock("@/wellness/security/session", () => ({
  getWellnessSession: mockGetSession,
}));

vi.mock("@/wellness/db", () => ({
  prisma: {
    program: { findMany: mockFindPrograms },
    programEnrollment: { findMany: mockFindEnrollments },
  },
}));

import { GET as exploreGet } from "@/app/api/explore/programs/route";

function makeProgramRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p_1",
    title: "Online Somatic Core",
    batchNumber: 1,
    coverImagePath: "sb://workout-media/covers/p1.webp",
    introVideoUrl: null,
    status: "PUBLISHED",
    locationType: "ONLINE",
    city: null,
    startAt: null,
    endAt: null,
    registrationOpenAt: null,
    registrationDeadlineAt: null,
    price: 150_000,
    actualPrice: 200_000,
    discountPercentage: 0,
    durationDays: 14,
    minQuota: 1,
    maxQuota: 30,
    difficultyLevel: "INTERMEDIATE",
    categories: [{ category: { name: "Pilates" } }],
    coaches: [{ coach: { name: "Coach Julian", title: "Lead" } }],
    equipments: [],
    dailyCommitmentRef: { name: "20 mins/day" },
    organization: { name: "Zera Studio", logoPath: "sb://avatars/org/logo.webp", isVerified: true },
    _count: { enrollments: 5 },
    days: [{ dayType: "TRAINING_DAY" }, { dayType: "REST_DAY" }],
    ...overrides,
  };
}

describe("API Route: GET /api/explore/programs (Visibility, Enrollment Filtering & Media Signing)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await exploreGet(new NextRequest("https://zera.id/api/explore/programs"));
    expect(res.status).toBe(401);
  });

  it("only queries PUBLISHED non-deleted programs, hides ACTIVE enrollments, keeps PENDING visible, and proxies sb:// URLs", async () => {
    mockGetSession.mockResolvedValueOnce({ userId: "u_1", role: "USER" });
    mockFindPrograms.mockResolvedValueOnce([
      makeProgramRow({ id: "p_active", title: "Already Enrolled" }),
      makeProgramRow({ id: "p_pending", title: "Pending Invoice Cohort", price: 100_000 }),
      makeProgramRow({ id: "p_open", title: "Open Cohort", price: 250_000 }),
      makeProgramRow({ id: "p_draft_leak", title: "Draft Should Be Filtered", status: "DRAFT" }),
    ]);
    mockFindEnrollments.mockResolvedValueOnce([
      { programId: "p_active", status: "ACTIVE" },
      { programId: "p_pending", status: "PENDING" },
    ]);

    const res = await exploreGet(
      new NextRequest("https://zera.id/api/explore/programs?sort=price&dir=asc")
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockFindPrograms).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PUBLISHED", deletedAt: null }),
      })
    );
    // p_active and p_draft_leak must be excluded; p_pending & p_open remain sorted by price asc
    expect(json.programs.map((p: { id: string }) => p.id)).toEqual(["p_pending", "p_open"]);
    expect(json.programs[0]).toMatchObject({
      enrollmentStatus: "PENDING",
      seatsLeft: 25,
      coverImage: "/api/media/signed?path=sb%3A%2F%2Fworkout-media%2Fcovers%2Fp1.webp",
      organizationLogo: "/api/media/signed?path=sb%3A%2F%2Favatars%2Forg%2Flogo.webp",
    });
    expect(json.pagination).toEqual({ page: 1, limit: 50, total: 2, hasMore: false });
  });
});
