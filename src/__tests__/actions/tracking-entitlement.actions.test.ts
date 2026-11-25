import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRequireSuperadmin,
  mockLockUserRow,
  mockCreateQrisAdapter,
  mockCreateNotifications,
  mockRecordAuditLog,
  mockRateLimit,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    trackingPassPlan: {
      findFirst: vi.fn(),
    },
    userTrackingGrant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      aggregate: vi.fn(),
    },
    trackingPassOrder: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const prisma = {
    trackingPassPlan: tx.trackingPassPlan,
    user: {
      findFirst: vi.fn(),
    },
    trackingPassOrder: tx.trackingPassOrder,
    paymentTransaction: tx.paymentTransaction,
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") {
        return (arg as (client: typeof tx) => unknown)(tx);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };

  return {
    mockRequireAuth: vi.fn(),
    mockRequireSuperadmin: vi.fn(),
    mockLockUserRow: vi.fn(),
    mockCreateQrisAdapter: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockRateLimit: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/wellness/security/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/guards")>();
  return {
    ...actual,
    requireAuth: mockRequireAuth,
    requireSuperadmin: mockRequireSuperadmin,
  };
});
vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
}));
vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockUserRow: mockLockUserRow,
}));
vi.mock("@/wellness/integrations/payment-gateway", () => ({
  createQrisInvoiceAdapter: mockCreateQrisAdapter,
  generateQrisOrderId: vi.fn(() => "QRIS-PASS-TEST-1"),
}));
vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));
vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import {
  grantProgramBonusTrackingInTx,
  grantStandalonePassInTx,
  resolveTrackingAccessStatus,
  revokeTrackingGrantBySourceInTx,
} from "@/wellness/services/tracking-entitlement";
import {
  wellnessAdminApproveTrackingPassOrder,
  wellnessAdminGrantCompTrackingDays,
  wellnessCreateTrackingPassCheckout,
} from "@/wellness/actions/tracking-pass";
import { WellnessForbiddenError } from "@/wellness/security/guards";

describe("Tracking Access Entitlement Ledger & Pass Checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      userId: "user_1",
      email: "member@zera.app",
      fullName: "Member One",
      role: "USER",
    });
    mockRequireSuperadmin.mockResolvedValue({
      userId: "admin_1",
      role: "SUPERADMIN",
    });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetMs: 60000 });
    mockTx.trackingPassOrder.findMany.mockResolvedValue([]);
    mockCreateNotifications.mockResolvedValue(undefined);
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  describe("resolveTrackingAccessStatus", () => {
    const now = new Date("2026-11-25T05:00:00.000Z");

    it("resolves all 4 modes accurately", () => {
      expect(
        resolveTrackingAccessStatus({
          trackingAccessUntil: null,
          hasActiveCohort: true,
          hasAnyEnrollmentOrLog: true,
          now,
        }).mode
      ).toBe("COHORT_ACTIVE");

      const future = new Date(now.getTime() + 45 * 86400000);
      const maint = resolveTrackingAccessStatus({
        trackingAccessUntil: future,
        hasActiveCohort: false,
        hasAnyEnrollmentOrLog: true,
        now,
      });
      expect(maint.mode).toBe("MAINTENANCE_PASS");
      expect(maint.canWriteDailyLogs).toBe(true);
      expect(maint.daysRemaining).toBe(45);

      const past = new Date(now.getTime() - 2 * 86400000);
      const expired = resolveTrackingAccessStatus({
        trackingAccessUntil: past,
        hasActiveCohort: false,
        hasAnyEnrollmentOrLog: true,
        now,
      });
      expect(expired.mode).toBe("EXPIRED_ARCHIVE");
      expect(expired.canWriteDailyLogs).toBe(false);

      const fresh = resolveTrackingAccessStatus({
        trackingAccessUntil: null,
        hasActiveCohort: false,
        hasAnyEnrollmentOrLog: false,
        now,
      });
      expect(fresh.mode).toBe("NEW_USER");
      expect(fresh.canWriteDailyLogs).toBe(false);
    });
  });

  describe("grantProgramBonusTrackingInTx (idempotency & stacking)", () => {
    it("skips granting when bonusTrackingDays is 0 (Free Program)", async () => {
      const res = await grantProgramBonusTrackingInTx(mockTx as never, {
        userId: "user_1",
        enrollmentId: "enr_free",
        program: {
          id: "prog_free",
          locationType: "ONLINE",
          startAt: null,
          endAt: null,
          durationDays: 7,
          bonusTrackingDays: 0,
          price: 0,
        },
        paidAt: new Date("2026-11-25T00:00:00.000Z"),
      });
      expect(res.granted).toBe(false);
      expect(mockTx.userTrackingGrant.create).not.toHaveBeenCalled();
    });

    it("is idempotent when grant already exists for the same enrollmentId", async () => {
      const existingEnd = new Date("2027-02-07T00:00:00.000Z");
      mockTx.userTrackingGrant.findUnique.mockResolvedValueOnce({
        id: "gr_existing",
        status: "ACTIVE",
        endsAt: existingEnd,
      });

      const res = await grantProgramBonusTrackingInTx(mockTx as never, {
        userId: "user_1",
        enrollmentId: "enr_1",
        program: {
          id: "prog_1",
          locationType: "ONLINE",
          startAt: null,
          endAt: null,
          durationDays: 14,
          bonusTrackingDays: 60,
          price: 500000,
        },
        paidAt: new Date("2026-11-25T00:00:00.000Z"),
      });
      expect(res.granted).toBe(false);
      expect(res.endsAt).toEqual(existingEnd);
      expect(mockTx.userTrackingGrant.create).not.toHaveBeenCalled();
    });

    it("stacks 60 bonus days cleanly onto an existing future trackingAccessUntil", async () => {
      const paidAt = new Date("2026-11-25T00:00:00.000Z");
      const currentUntil = new Date("2027-01-20T00:00:00.000Z");
      mockTx.userTrackingGrant.findUnique.mockResolvedValueOnce(null);
      mockTx.user.findUnique.mockResolvedValueOnce({ trackingAccessUntil: currentUntil });
      const expectedEnd = new Date(currentUntil.getTime() + 60 * 86400000);
      mockTx.userTrackingGrant.create.mockResolvedValueOnce({
        id: "gr_new",
        endsAt: expectedEnd,
      });
      mockTx.userTrackingGrant.aggregate.mockResolvedValueOnce({
        _max: { endsAt: expectedEnd },
      });

      const res = await grantProgramBonusTrackingInTx(mockTx as never, {
        userId: "user_1",
        enrollmentId: "enr_2",
        program: {
          id: "prog_2",
          locationType: "ONLINE",
          startAt: null,
          endAt: null,
          durationDays: 14,
          bonusTrackingDays: 60,
          price: 500000,
        },
        paidAt,
      });

      expect(res.granted).toBe(true);
      expect(res.endsAt).toEqual(expectedEnd);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { trackingAccessUntil: expectedEnd },
      });
    });
  });

  describe("grantStandalonePassInTx & revokeTrackingGrantBySourceInTx", () => {
    it("grants 180 days on pass activation and revokes cleanly on refund", async () => {
      const now = new Date("2026-11-25T00:00:00.000Z");
      const expectedEnd = new Date(now.getTime() + 180 * 86400000);
      mockTx.userTrackingGrant.findUnique.mockResolvedValueOnce(null);
      mockTx.user.findUnique.mockResolvedValueOnce({ trackingAccessUntil: null });
      mockTx.userTrackingGrant.create.mockResolvedValueOnce({
        id: "gr_pass_1",
        endsAt: expectedEnd,
      });
      mockTx.userTrackingGrant.aggregate.mockResolvedValueOnce({
        _max: { endsAt: expectedEnd },
      });

      const grant = await grantStandalonePassInTx(mockTx as never, {
        userId: "user_1",
        trackingPassOrderId: "ord_1",
        durationDays: 180,
        now,
      });
      expect(grant.granted).toBe(true);
      expect(grant.endsAt).toEqual(expectedEnd);

      // Now revoke on refund -> trackingAccessUntil recomputes to null
      mockTx.userTrackingGrant.updateMany.mockResolvedValueOnce({ count: 1 });
      mockTx.userTrackingGrant.findMany.mockResolvedValueOnce([]);

      const rev = await revokeTrackingGrantBySourceInTx(mockTx as never, {
        userId: "user_1",
        trackingPassOrderId: "ord_1",
        reason: "Refund processed",
      });
      expect(rev.revokedCount).toBe(1);
      expect(rev.nextTrackingAccessUntil).toBeNull();
      expect(mockTx.user.update).toHaveBeenLastCalledWith({
        where: { id: "user_1" },
        data: { trackingAccessUntil: null },
      });
    });

    it("restacks remaining active grants back to natural anchors on refund (prevents free stacked days exploit)", async () => {
      const DAY_MS = 86_400_000;
      const pass2PaidAt = new Date("2026-01-05T00:00:00.000Z");
      // Previously Pass #2 was stacked on top of Pass #1 (D180..D360)
      const oldStackedStart = new Date("2026-06-30T00:00:00.000Z");
      const oldStackedEnd = new Date(oldStackedStart.getTime() + 180 * DAY_MS);
      const expectedNaturalEnd = new Date(pass2PaidAt.getTime() + 180 * DAY_MS);

      mockTx.userTrackingGrant.updateMany.mockResolvedValueOnce({ count: 1 });
      mockTx.userTrackingGrant.findMany.mockResolvedValueOnce([
        {
          id: "gr_pass_2",
          sourceType: "STANDALONE_PASS",
          durationDays: 180,
          startsAt: oldStackedStart,
          endsAt: oldStackedEnd,
          createdAt: pass2PaidAt,
          programEnrollment: null,
          trackingPassOrder: { paidAt: pass2PaidAt, createdAt: pass2PaidAt },
        },
      ]);

      const rev = await revokeTrackingGrantBySourceInTx(mockTx as never, {
        userId: "user_1",
        trackingPassOrderId: "ord_pass_1_refunded",
        reason: "Refund Pass #1",
      });

      expect(rev.nextTrackingAccessUntil).toEqual(expectedNaturalEnd);
      expect(mockTx.userTrackingGrant.update).toHaveBeenCalledWith({
        where: { id: "gr_pass_2" },
        data: { startsAt: pass2PaidAt, endsAt: expectedNaturalEnd },
      });
      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: "user_1" },
        data: { trackingAccessUntil: expectedNaturalEnd },
      });
    });
  });

  describe("wellnessCreateTrackingPassCheckout & Admin Comp Grant", () => {
    it("reuses a valid non-expired PENDING TrackingPassOrder invoice", async () => {
      const future = new Date(Date.now() + 600_000);
      mockTx.user.findUnique.mockResolvedValueOnce({ status: "ACTIVE", deletedAt: null });
      mockTx.trackingPassPlan.findFirst.mockResolvedValueOnce({
        id: "plan_6m",
        name: "6-Month Tracking Pass",
        durationDays: 180,
        price: 500000,
        isActive: true,
      });
      mockTx.trackingPassOrder.findFirst.mockResolvedValueOnce({
        id: "ord_existing",
        status: "PENDING",
        durationDaysSnapshot: 180,
        priceSnapshot: 500000,
        invoiceExpiresAt: future,
        transactions: [
          {
            id: "tx_1",
            orderId: "QRIS-REUSED",
            grossAmount: 500000,
            qrisStringOrUrl: "https://qris.example/qr.png",
            expiresAt: future,
          },
        ],
      });

      const res = await wellnessCreateTrackingPassCheckout("plan_6m");
      expect(res.success).toBe(true);
      expect(res.data?.paymentReference).toBe("QRIS-REUSED");
      expect(mockCreateQrisAdapter).not.toHaveBeenCalled();
    });

    it("blocks infinite free stacking on Rp 0 promotional tracking passes", async () => {
      mockTx.user.findUnique.mockResolvedValueOnce({ status: "ACTIVE", deletedAt: null });
      mockTx.trackingPassPlan.findFirst.mockResolvedValueOnce({
        id: "plan_free_promo",
        name: "Free 30-Day Promo",
        durationDays: 30,
        price: 0,
        isActive: true,
      });
      // No pending order, but user already claimed this free plan once
      mockTx.trackingPassOrder.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "ord_already_claimed" });

      const res = await wellnessCreateTrackingPassCheckout("plan_free_promo");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/already claimed/i);
      expect(mockTx.trackingPassOrder.create).not.toHaveBeenCalled();
    });

    it("refuses manual admin approval of REFUNDED/CANCELLED tracking pass orders", async () => {
      mockPrisma.trackingPassOrder.findUnique
        .mockResolvedValueOnce({
          id: "ord_ref",
          userId: "user_1",
          status: "PENDING",
          durationDaysSnapshot: 180,
          paymentReference: "QRIS-REF",
          plan: { name: "6-Month Pass" },
          user: { fullName: "Member One" },
        })
        .mockResolvedValueOnce({
          status: "REFUNDED",
          paymentReference: "QRIS-REF",
          durationDaysSnapshot: 180,
          termsAgreedAt: null,
          termsAgreedVersion: null,
          user: { status: "ACTIVE", deletedAt: null },
        });

      const res = await wellnessAdminApproveTrackingPassOrder("ord_ref");
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/Only PENDING orders can be approved/i);
      expect(mockTx.trackingPassOrder.update).not.toHaveBeenCalled();
    });

    it("blocks non-superadmin from granting complimentary tracking days", async () => {
      mockRequireSuperadmin.mockRejectedValueOnce(new WellnessForbiddenError("Superadmin only"));
      await expect(
        wellnessAdminGrantCompTrackingDays({
          targetUserId: "user_1",
          durationDays: 30,
          reason: "Bonus",
        })
      ).rejects.toBeInstanceOf(WellnessForbiddenError);
    });
  });
});
