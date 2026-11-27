import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";

const { mockCookieStore, mockFindUniqueUser, mockFindFirstProgram } = vi.hoisted(() => ({
  mockCookieStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
  mockFindUniqueUser: vi.fn(),
  mockFindFirstProgram: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    // Disable per-request memoization in unit tests so each test runs cleanly
    cache: <T extends (...args: unknown[]) => unknown>(fn: T): T => fn,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: {
    user: { findUnique: mockFindUniqueUser },
    program: { findFirst: mockFindFirstProgram },
  },
}));

import { hashPassword, verifyPassword } from "@/wellness/security/password";
import {
  clearSessionCookie,
  createSessionToken,
  getWellnessSession,
  setSessionCookie,
  verifySessionToken,
} from "@/wellness/security/session";
import {
  WellnessAuthError,
  WellnessForbiddenError,
  buildProgramScopeWhere,
  matchesCoachNameToken,
  requireAdminAccess,
  requireAuth,
  requirePlatformAdmin,
  requireProgramAccess,
  requireSuperadmin,
} from "@/wellness/security/guards";
import { SESSION_COOKIE_NAME } from "@/wellness/config";

describe("Security: Password Hashing (bcrypt cost 12)", () => {
  it("hashes with cost 12, verifies valid passwords, and rejects wrong passwords", async () => {
    const plain = "SanctuaryPass2026!";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    expect(hash1).toMatch(/^\$2[aby]\$12\$/);
    expect(hash1).not.toBe(hash2); // unique salt per call
    expect(await verifyPassword(plain, hash1)).toBe(true);
    expect(await verifyPassword("WrongPassword1!", hash1)).toBe(false);
  });
});

describe("Security: Session JWT & Cookie Lifecycle", () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    mockCookieStore.set.mockReset();
    mockCookieStore.delete.mockReset();
    mockFindUniqueUser.mockReset();
    mockFindFirstProgram.mockReset();
  });

  it("creates and verifies HS256 JWT tokens, rejecting tampered or invalid tokens", async () => {
    const token = await createSessionToken({
      userId: "u_123",
      email: "member@zera.id",
      role: "USER",
      tokenVersion: 2,
    });

    const decoded = await verifySessionToken(token);
    expect(decoded).toMatchObject({
      userId: "u_123",
      email: "member@zera.id",
      role: "USER",
      tokenVersion: 2,
    });

    // Tamper signature
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1]}.tamperedSignaturePayload`;
    expect(await verifySessionToken(tampered)).toBeNull();

    // Signed with wrong secret
    const wrongSecretToken = await new SignJWT({ userId: "u_123", role: "SUPERADMIN", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("wrong_attacker_secret_key"));
    expect(await verifySessionToken(wrongSecretToken)).toBeNull();
  });

  it("sets HttpOnly SameSite=lax session cookie and clears it cleanly", async () => {
    await setSessionCookie("jwt.token.val");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "jwt.token.val",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );

    await clearSessionCookie();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "",
      expect.objectContaining({ maxAge: 0 })
    );
  });

  it("returns active session with derived age and revokes deleted, suspended, or stale tokenVersion sessions", async () => {
    const token = await createSessionToken({
      userId: "u_active",
      email: "active@zera.id",
      role: "PARTNER_ADMIN",
      tokenVersion: 3,
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const baseDbUser = {
      id: "u_active",
      email: "active@zera.id",
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
      fullName: "Nadia Putri",
      phone: "081234567890",
      birthDate: new Date("1995-03-10T00:00:00Z"),
      avatarPath: null,
      gender: "Female",
      occupation: "Architect",
      address: null,
      city: "Jakarta",
      province: "DKI Jakarta",
      emergencyContactName: null,
      emergencyContactPhone: null,
      role: "PARTNER_ADMIN",
      status: "ACTIVE",
      deletedAt: null,
      preferredLocale: "id",
      organizationId: "org_1",
      coachProfileId: null,
      organization: { name: "Studio Senopati" },
      coachProfile: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      tokenVersion: 3,
    };

    mockFindUniqueUser.mockResolvedValueOnce(baseDbUser);
    const session = await getWellnessSession();
    expect(session).not.toBeNull();
    expect(session?.organizationName).toBe("Studio Senopati");
    expect(session?.age).toBeGreaterThanOrEqual(30);

    // Token version revoked (e.g. password changed / forced logout)
    mockFindUniqueUser.mockResolvedValueOnce({ ...baseDbUser, tokenVersion: 4 });
    expect(await getWellnessSession()).toBeNull();

    // Account suspended
    mockFindUniqueUser.mockResolvedValueOnce({ ...baseDbUser, status: "SUSPENDED" });
    expect(await getWellnessSession()).toBeNull();

    // Soft-deleted account
    mockFindUniqueUser.mockResolvedValueOnce({ ...baseDbUser, deletedAt: new Date() });
    expect(await getWellnessSession()).toBeNull();

    // Missing cookie
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getWellnessSession()).toBeNull();
  });
});

describe("Security: Authorization Guards & Program Scoping", () => {
  beforeEach(() => {
    mockCookieStore.get.mockReset();
    mockFindUniqueUser.mockReset();
    mockFindFirstProgram.mockReset();
  });

  async function mockSessionUser(overrides: Partial<Record<string, unknown>>) {
    const role = String(overrides.role ?? "USER");
    const token = await createSessionToken({
      userId: String(overrides.id ?? "u_1"),
      email: "user@zera.id",
      role,
      tokenVersion: 0,
    });
    mockCookieStore.get.mockReturnValue({ value: token });
    mockFindUniqueUser.mockResolvedValue({
      id: "u_1",
      email: "user@zera.id",
      emailVerifiedAt: new Date(),
      fullName: "Test User",
      phone: null,
      birthDate: null,
      avatarPath: null,
      gender: null,
      occupation: null,
      address: null,
      city: null,
      province: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      role,
      status: "ACTIVE",
      deletedAt: null,
      preferredLocale: "en",
      organizationId: null,
      coachProfileId: null,
      organization: null,
      coachProfile: null,
      createdAt: new Date(),
      tokenVersion: 0,
      ...overrides,
    });
  }

  it("enforces requireAuth, requireAdminAccess, and requireSuperadmin accurately", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    await expect(requireAuth()).rejects.toBeInstanceOf(WellnessAuthError);

    await mockSessionUser({ role: "USER" });
    const authed = await requireAuth();
    expect(authed.role).toBe("USER");
    await expect(requireAdminAccess()).rejects.toBeInstanceOf(WellnessForbiddenError);
    await expect(requireSuperadmin()).rejects.toBeInstanceOf(WellnessForbiddenError);

    await mockSessionUser({ role: "COACH", coachProfileId: "c1" });
    expect((await requireAdminAccess()).role).toBe("COACH");
    await expect(requirePlatformAdmin()).rejects.toBeInstanceOf(WellnessForbiddenError);
    await expect(requireSuperadmin()).rejects.toBeInstanceOf(WellnessForbiddenError);

    await mockSessionUser({ role: "PARTNER_ADMIN", organizationId: "org_1" });
    await expect(requirePlatformAdmin()).rejects.toBeInstanceOf(WellnessForbiddenError);

    await mockSessionUser({ role: "ADMIN" });
    expect((await requirePlatformAdmin()).role).toBe("ADMIN");
    await expect(requireSuperadmin()).rejects.toBeInstanceOf(WellnessForbiddenError);

    await mockSessionUser({ role: "SUPERADMIN" });
    expect((await requirePlatformAdmin()).role).toBe("SUPERADMIN");
    expect((await requireSuperadmin()).role).toBe("SUPERADMIN");
  });

  it("matchesCoachNameToken prevents substring spoofing (Ana vs Anastasia)", () => {
    expect(matchesCoachNameToken("Coach Anastasia, Coach Julian", "Ana")).toBe(false);
    expect(matchesCoachNameToken("Coach Anastasia, Coach Ana", "coach ana")).toBe(true);
    expect(matchesCoachNameToken("", "Ana")).toBe(false);
    expect(matchesCoachNameToken("Coach Ana", "  ")).toBe(false);
  });

  it("buildProgramScopeWhere fails closed for unassigned scoped roles", () => {
    expect(buildProgramScopeWhere({ role: "SUPERADMIN" })).toEqual({ deletedAt: null });

    expect(buildProgramScopeWhere({ role: "PARTNER_ADMIN", organizationId: "org_7" })).toEqual({
      deletedAt: null,
      organizationId: "org_7",
    });

    // Unassigned PARTNER_ADMIN fails closed
    expect(buildProgramScopeWhere({ role: "PARTNER_ADMIN", organizationId: null })).toEqual({
      id: "__unassigned_scope__",
    });

    // Scoped COACH builds OR clauses
    expect(
      buildProgramScopeWhere({
        role: "COACH",
        coachProfileId: "coach_5",
        coachProfileName: "Coach Julian",
      })
    ).toEqual({
      deletedAt: null,
      OR: [
        { coaches: { some: { coachId: "coach_5" } } },
        { coaches: { some: { coach: { name: { equals: "Coach Julian", mode: "insensitive" } } } } },
      ],
    });

    // Unassigned COACH or regular USER fails closed
    expect(buildProgramScopeWhere({ role: "COACH" })).toEqual({ id: "__unassigned_scope__" });
    expect(buildProgramScopeWhere({ role: "USER" })).toEqual({ id: "__unassigned_scope__" });
  });

  it("requireProgramAccess enforces organization and coach boundaries strictly", async () => {
    // SUPERADMIN bypasses ownership lookup
    await mockSessionUser({ role: "SUPERADMIN" });
    await expect(requireProgramAccess("prog_any")).resolves.toMatchObject({ role: "SUPERADMIN" });
    expect(mockFindFirstProgram).not.toHaveBeenCalled();

    // PARTNER_ADMIN allowed for own org, denied for foreign org
    await mockSessionUser({ role: "PARTNER_ADMIN", organizationId: "org_A" });
    mockFindFirstProgram.mockResolvedValueOnce({
      id: "prog_1",
      organizationId: "org_A",
      coaches: [],
    });
    await expect(requireProgramAccess("prog_1")).resolves.toMatchObject({ organizationId: "org_A" });

    mockFindFirstProgram.mockResolvedValueOnce({
      id: "prog_2",
      organizationId: "org_B",
      coaches: [],
    });
    await expect(requireProgramAccess("prog_2")).rejects.toBeInstanceOf(WellnessForbiddenError);

    // COACH allowed by coachId or exact case-insensitive coach name, denied otherwise
    await mockSessionUser({
      role: "COACH",
      coachProfileId: "c_10",
      coachProfile: { name: "Coach Sarah" },
    });
    mockFindFirstProgram.mockResolvedValueOnce({
      id: "prog_3",
      organizationId: "org_X",
      coaches: [{ coachId: "c_10", coach: { name: "Coach Sarah" } }],
    });
    await expect(requireProgramAccess("prog_3")).resolves.toMatchObject({ role: "COACH" });

    mockFindFirstProgram.mockResolvedValueOnce({
      id: "prog_4",
      organizationId: "org_X",
      coaches: [{ coachId: "c_99", coach: { name: "Coach Other" } }],
    });
    await expect(requireProgramAccess("prog_4")).rejects.toBeInstanceOf(WellnessForbiddenError);
  });
});
