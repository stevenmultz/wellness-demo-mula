import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireSuperadmin,
  mockRequireAdminAccess,
  mockLockProgramRow,
  mockCreateNotifications,
  mockRecordAuditLog,
  mockSendEmail,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    user: {
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    masterOrganization: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    masterCoach: { findUnique: vi.fn() },
    programEnrollment: { count: vi.fn(), update: vi.fn() },
    paymentTransaction: { updateMany: vi.fn() },
    userPasswordResetToken: { create: vi.fn() },
  };
  const prisma = {
    user: { findFirst: vi.fn(), findMany: vi.fn() },
    masterOrganization: { findMany: vi.fn() },
    programEnrollment: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockRequireSuperadmin: vi.fn(),
    mockRequireAdminAccess: vi.fn(),
    mockLockProgramRow: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockSendEmail: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/wellness/security/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/guards")>();
  return {
    ...actual,
    requireSuperadmin: mockRequireSuperadmin,
    requireAdminAccess: mockRequireAdminAccess,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockProgramRow: mockLockProgramRow,
}));

vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

vi.mock("@/wellness/integrations/email-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/email-service")>();
  return { ...actual, sendTransactionalEmail: mockSendEmail };
});

import {
  wellnessAdminApprovePayment,
  wellnessAdminUpdateUserRole,
  wellnessAdminUpdateUserStatus,
} from "@/wellness/actions/admin";
import {
  wellnessGetAdminTeamData,
  wellnessSuperadminCreatePartnerAdmin,
} from "@/wellness/actions/partner-team";
import { WellnessForbiddenError } from "@/wellness/security/guards";

describe("Server Actions: Admin Governance & Payment Approval Integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSuperadmin.mockResolvedValue({ userId: "super_1", role: "SUPERADMIN" });
    mockRequireAdminAccess.mockResolvedValue({ userId: "super_1", role: "SUPERADMIN" });
    mockCreateNotifications.mockResolvedValue(undefined);
    mockSendEmail.mockResolvedValue({ delivered: true, provider: "CONSOLE_DEV" });
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  it("enforces single-superadmin invariant, prevents self-demotion, and bumps tokenVersion on role change", async () => {
    // Cannot self-demote
    const selfDemote = await wellnessAdminUpdateUserRole("super_1", "USER");
    expect(selfDemote.success).toBe(false);
    expect(selfDemote.message).toContain("cannot demote your own");

    // Cannot promote anyone to SUPERADMIN
    const promoteSuper = await wellnessAdminUpdateUserRole("user_2", "SUPERADMIN");
    expect(promoteSuper.success).toBe(false);
    expect(promoteSuper.message).toContain("Only one Superadmin");

    // Valid role change USER -> PARTNER_ADMIN clears coachProfileId and increments tokenVersion
    mockTx.user.findFirst.mockResolvedValueOnce({
      id: "user_2",
      role: "COACH",
      organizationId: null,
      coachProfileId: "coach_old",
    });
    mockTx.masterOrganization.findUnique.mockResolvedValueOnce({ id: "org_1" });
    mockTx.user.update.mockResolvedValueOnce({
      id: "user_2",
      email: "partner@zera.id",
      fullName: "Partner A",
      role: "PARTNER_ADMIN",
      organizationId: "org_1",
      coachProfileId: null,
    });

    const ok = await wellnessAdminUpdateUserRole("user_2", "PARTNER_ADMIN", {
      organizationId: "org_1",
    });
    expect(ok.success).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "PARTNER_ADMIN",
          organizationId: "org_1",
          coachProfileId: null,
          tokenVersion: { increment: 1 },
        }),
      })
    );
  });

  it("prevents self-suspension and bumps tokenVersion when suspending another user", async () => {
    const selfSuspend = await wellnessAdminUpdateUserStatus("super_1", "SUSPENDED");
    expect(selfSuspend.success).toBe(false);

    mockPrisma.user.findFirst.mockResolvedValueOnce({ id: "user_2" });
    mockTx.user.update.mockResolvedValueOnce({
      id: "user_2",
      email: "u2@zera.id",
      fullName: "User 2",
      status: "SUSPENDED",
    });

    const ok = await wellnessAdminUpdateUserStatus("user_2", "SUSPENDED");
    expect(ok.success).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUSPENDED", tokenVersion: { increment: 1 } }),
      })
    );
  });

  it("prevents manual payment approval from exceeding cohort maxQuota (anti-overbooking)", async () => {
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_1",
      programId: "prog_1",
      userId: "u_1",
      status: "PENDING",
      paymentReference: "QRIS-555",
      termsAgreedAt: null,
      termsAgreedVersion: null,
      program: {
        id: "prog_1",
        title: "Full Cohort",
        maxQuota: 10,
        locationType: "ONLINE",
        endAt: null,
      },
      user: { id: "u_1", email: "u1@zera.id", fullName: "User 1" },
    });
    mockTx.programEnrollment.count.mockResolvedValueOnce(10); // Full!

    const res = await wellnessAdminApprovePayment("enr_1");
    expect(res.success).toBe(false);
    expect(res.message).toContain("reached its maximum quota");
    expect(mockLockProgramRow).toHaveBeenCalledWith(mockTx, "prog_1");
    expect(mockTx.programEnrollment.update).not.toHaveBeenCalled();
  });
});

describe("Server Actions: Multi-Tenant Partner Team Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  it("blocks COACH from team management and strictly isolates PARTNER_ADMIN to their own organization", async () => {
    mockRequireAdminAccess.mockResolvedValueOnce({ userId: "c1", role: "COACH" });
    await expect(wellnessGetAdminTeamData()).rejects.toBeInstanceOf(WellnessForbiddenError);

    // Unassigned PARTNER_ADMIN fails closed with empty arrays
    mockRequireAdminAccess.mockResolvedValueOnce({
      userId: "pa_unassigned",
      role: "PARTNER_ADMIN",
      organizationId: null,
      organizationName: null,
    });
    const emptyRes = await wellnessGetAdminTeamData();
    expect(emptyRes.data?.coaches).toEqual([]);
    expect(mockPrisma.masterOrganization.findMany).not.toHaveBeenCalled();

    // Assigned PARTNER_ADMIN ONLY queries their own organizationId
    mockRequireAdminAccess.mockResolvedValueOnce({
      userId: "pa_1",
      role: "PARTNER_ADMIN",
      organizationId: "org_A",
      organizationName: "Org A",
    });
    mockPrisma.masterOrganization.findMany.mockResolvedValueOnce([
      { id: "org_A", name: "Org A", tagline: null, isVerified: true },
    ]);
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const scopedRes = await wellnessGetAdminTeamData();
    expect(scopedRes.success).toBe(true);
    expect(mockPrisma.masterOrganization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org_A" } })
    );
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "COACH", organizationId: "org_A", deletedAt: null },
      })
    );
  });

  it("blocks duplicate active emails when creating a Partner Admin", async () => {
    mockRequireSuperadmin.mockResolvedValueOnce({ userId: "super_1", role: "SUPERADMIN" });
    mockTx.user.findFirst.mockResolvedValueOnce({ id: "existing_user" });

    const dup = await wellnessSuperadminCreatePartnerAdmin({
      fullName: "Admin Baru",
      email: "existing@zera.id",
      newOrganizationName: "New Studio",
    });
    expect(dup.success).toBe(false);
    expect(dup.message).toContain("already exists");
  });
});
