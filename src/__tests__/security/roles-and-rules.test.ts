import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLES,
  PLATFORM_ADMIN_ROLES,
  USER_ROLES,
  ensureCoachNameIncluded,
  isAdminRole,
  isPlatformAdminRole,
  isSuperadminRole,
  sanitizeUserScopeForRole,
} from "@/wellness/security/roles";
import {
  REQUIRED_FREE_INTRO_PROGRAMS,
  clampMinQuota,
  evaluateFreeIntroRequirement,
} from "@/wellness/security/program-rules";
import { buildOAuthLinkUserUpdate } from "@/wellness/security/oauth-linking";

describe("Security: Roles & Scoping (RBAC)", () => {
  describe("isAdminRole, isPlatformAdminRole & isSuperadminRole", () => {
    it("identifies all configured admin roles accurately", () => {
      expect(USER_ROLES).toEqual(["USER", "COACH", "PARTNER_ADMIN", "ADMIN", "SUPERADMIN"]);
      expect(PLATFORM_ADMIN_ROLES).toEqual(["SUPERADMIN", "ADMIN"]);
      expect(ADMIN_ROLES).toEqual(["SUPERADMIN", "ADMIN", "COACH", "PARTNER_ADMIN"]);

      expect(isAdminRole("SUPERADMIN")).toBe(true);
      expect(isAdminRole("ADMIN")).toBe(true);
      expect(isAdminRole("PARTNER_ADMIN")).toBe(true);
      expect(isAdminRole("COACH")).toBe(true);

      expect(isPlatformAdminRole("SUPERADMIN")).toBe(true);
      expect(isPlatformAdminRole("ADMIN")).toBe(true);
      expect(isPlatformAdminRole("PARTNER_ADMIN")).toBe(false);
      expect(isPlatformAdminRole("COACH")).toBe(false);
      expect(isPlatformAdminRole("USER")).toBe(false);
    });

    it("rejects standard users, invalid strings, wrong casing, and nullish values", () => {
      expect(isAdminRole("USER")).toBe(false);
      expect(isAdminRole("superadmin")).toBe(false);
      expect(isAdminRole("admin")).toBe(false);
      expect(isAdminRole("")).toBe(false);
      expect(isAdminRole(null)).toBe(false);
      expect(isAdminRole(undefined)).toBe(false);
    });

    it("strictly identifies SUPERADMIN only", () => {
      expect(isSuperadminRole("SUPERADMIN")).toBe(true);
      expect(isSuperadminRole("ADMIN")).toBe(false);
      expect(isSuperadminRole("PARTNER_ADMIN")).toBe(false);
      expect(isSuperadminRole("COACH")).toBe(false);
      expect(isSuperadminRole("USER")).toBe(false);
      expect(isSuperadminRole(null)).toBe(false);
      expect(isSuperadminRole(undefined)).toBe(false);
    });
  });

  describe("sanitizeUserScopeForRole (prevents cross-role scope leakage)", () => {
    it("clears coachProfileId when switching to PARTNER_ADMIN and preserves or updates orgId", () => {
      expect(
        sanitizeUserScopeForRole("PARTNER_ADMIN", {
          organizationId: "org-1",
          coachProfileId: "coach-9",
        })
      ).toEqual({ organizationId: "org-1", coachProfileId: null });

      expect(
        sanitizeUserScopeForRole(
          "PARTNER_ADMIN",
          { organizationId: "org-1", coachProfileId: "coach-9" },
          { organizationId: "org-2", coachProfileId: "coach-evil" }
        )
      ).toEqual({ organizationId: "org-2", coachProfileId: null });

      expect(
        sanitizeUserScopeForRole(
          "PARTNER_ADMIN",
          { organizationId: "org-1", coachProfileId: null },
          { organizationId: "" }
        )
      ).toEqual({ organizationId: null, coachProfileId: null });
    });

    it("strips inherited organizationId unless explicitly requested when switching to COACH", () => {
      expect(
        sanitizeUserScopeForRole("COACH", {
          organizationId: "org-old",
          coachProfileId: "coach-1",
        })
      ).toEqual({ organizationId: null, coachProfileId: "coach-1" });

      expect(
        sanitizeUserScopeForRole(
          "COACH",
          { organizationId: "org-old", coachProfileId: "coach-1" },
          { coachProfileId: "coach-2", organizationId: "org-partner" }
        )
      ).toEqual({ organizationId: "org-partner", coachProfileId: "coach-2" });
    });

    it("strips both organizationId and coachProfileId for USER, ADMIN, and SUPERADMIN", () => {
      expect(
        sanitizeUserScopeForRole(
          "USER",
          { organizationId: "org-1", coachProfileId: "coach-1" },
          { organizationId: "org-2", coachProfileId: "coach-2" }
        )
      ).toEqual({ organizationId: null, coachProfileId: null });

      expect(
        sanitizeUserScopeForRole(
          "ADMIN",
          { organizationId: "org-1", coachProfileId: "coach-1" },
          { organizationId: "org-2", coachProfileId: "coach-2" }
        )
      ).toEqual({ organizationId: null, coachProfileId: null });

      expect(
        sanitizeUserScopeForRole(
          "SUPERADMIN",
          { organizationId: "org-1", coachProfileId: "coach-1" },
          { organizationId: "org-2", coachProfileId: "coach-2" }
        )
      ).toEqual({ organizationId: null, coachProfileId: null });
    });
  });

  describe("ensureCoachNameIncluded", () => {
    it("prepends required coach name when missing", () => {
      expect(ensureCoachNameIncluded("Coach Sarah", "Coach Julian")).toBe(
        "Coach Julian, Coach Sarah"
      );
    });

    it("does not duplicate when already present (case-insensitive)", () => {
      expect(ensureCoachNameIncluded("Coach Sarah, coach julian", "Coach Julian")).toBe(
        "Coach Sarah, coach julian"
      );
    });

    it("strips default placeholder 'Head Wellness Coach'", () => {
      expect(ensureCoachNameIncluded("Head Wellness Coach", "Coach Julian")).toBe("Coach Julian");
      expect(
        ensureCoachNameIncluded("Head Wellness Coach, Coach Sarah", "Coach Julian")
      ).toBe("Coach Julian, Coach Sarah");
    });

    it("handles empty or whitespace inputs safely", () => {
      expect(ensureCoachNameIncluded(null, "Coach Julian")).toBe("Coach Julian");
      expect(ensureCoachNameIncluded("  Coach Sarah  ", "   ")).toBe("Coach Sarah");
    });
  });
});

describe("Security: Program Rules & Quota Clamping", () => {
  it("allows publishing/unpublishing regardless of free intro count", () => {
    expect(REQUIRED_FREE_INTRO_PROGRAMS).toBe(0);
    expect(
      evaluateFreeIntroRequirement({
        callerRole: "PARTNER_ADMIN",
        action: "PUBLISH",
        programPrice: 250_000,
        isCurrentlyPublished: false,
        otherPublishedFreeCount: 0,
        otherPublishedPaidCount: 0,
      })
    ).toEqual({ allowed: true });

    expect(
      evaluateFreeIntroRequirement({
        callerRole: "COACH",
        action: "UNPUBLISH_OR_DELETE",
        programPrice: 0,
        isCurrentlyPublished: true,
        otherPublishedFreeCount: 0,
        otherPublishedPaidCount: 2,
      })
    ).toEqual({ allowed: true });
  });

  it("clamps minQuota strictly within [1, maxQuota]", () => {
    expect(clampMinQuota(5, 30)).toBe(5);
    expect(clampMinQuota(50, 30)).toBe(30);
    expect(clampMinQuota(0, 30)).toBe(1);
    expect(clampMinQuota(-10, 30)).toBe(1);
    expect(clampMinQuota(null, 30)).toBe(1);
    expect(clampMinQuota(undefined, 0)).toBe(1);
    expect(clampMinQuota(4.6, 10.2)).toBe(5);
  });
});

describe("Security: OAuth Pre-Hijacking Defense (CWE-287)", () => {
  it("returns null when existing local account already verified its email", () => {
    const update = buildOAuthLinkUserUpdate({
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(update).toBeNull();
  });

  it("verifies email, revokes unverified local password, and bumps tokenVersion on unverified account", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const update = buildOAuthLinkUserUpdate({ emailVerifiedAt: null }, now);
    expect(update).toEqual({
      emailVerifiedAt: now,
      passwordHash: null,
      tokenVersion: { increment: 1 },
    });
  });
});
