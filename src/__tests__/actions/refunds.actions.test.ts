import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireSuperadmin,
  mockLockProgramRow,
  mockRefundMidtrans,
  mockCreateNotifications,
  mockRecordAuditLog,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    program: { findFirst: vi.fn(), update: vi.fn() },
    programEnrollment: { findMany: vi.fn(), updateMany: vi.fn() },
    paymentTransaction: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    program: { findMany: vi.fn() },
    paymentTransaction: { findMany: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockRequireSuperadmin: vi.fn(),
    mockLockProgramRow: vi.fn(),
    mockRefundMidtrans: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/wellness/security/guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/guards")>();
  return {
    ...actual,
    requireSuperadmin: mockRequireSuperadmin,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockProgramRow: mockLockProgramRow,
}));

vi.mock("@/wellness/integrations/payment-gateway", () => ({
  refundMidtransTransactionAdapter: mockRefundMidtrans,
}));

vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import {
  wellnessAdminCancelBatchAndRefund,
  wellnessAdminRecordManualRefund,
} from "@/wellness/actions/refunds";
import { WellnessForbiddenError } from "@/wellness/security/guards";

describe("Server Actions: Financial Refunds & Under-Quota Batch Cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSuperadmin.mockResolvedValue({ userId: "super_1", role: "SUPERADMIN" });
    mockCreateNotifications.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  it("blocks non-SUPERADMIN callers from refund operations", async () => {
    mockRequireSuperadmin.mockRejectedValueOnce(new WellnessForbiddenError("Superadmin access required."));
    await expect(
      wellnessAdminCancelBatchAndRefund({ programId: "p1", reason: "Under quota" })
    ).rejects.toBeInstanceOf(WellnessForbiddenError);
  });

  it("rejects cancelling an already ARCHIVED batch to prevent duplicate refund runs", async () => {
    mockTx.program.findFirst.mockResolvedValueOnce({
      id: "p1",
      title: "Cohort A",
      status: "ARCHIVED",
      minQuota: 5,
    });

    const res = await wellnessAdminCancelBatchAndRefund({
      programId: "p1",
      reason: "Minimum quota not met",
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain("already archived");
    expect(mockTx.paymentTransaction.update).not.toHaveBeenCalled();
  });

  it("atomically cancels enrollments, deducts admin fee accurately, auto-refunds eligible Midtrans tx, and falls back safely on gateway rejection", async () => {
    mockTx.program.findFirst.mockResolvedValueOnce({
      id: "p1",
      title: "Hybrid Pilates",
      status: "PUBLISHED",
      minQuota: 10,
    });
    mockTx.programEnrollment.findMany.mockResolvedValueOnce([
      { id: "e1", userId: "u1", status: "ACTIVE" },
      { id: "e2", userId: "u2", status: "ACTIVE" },
    ]);
    mockTx.paymentTransaction.findMany.mockResolvedValueOnce([
      {
        id: "tx1",
        userId: "u1",
        orderId: "QRIS-001",
        provider: "MIDTRANS",
        grossAmount: 250_000,
        enrollmentId: "e1",
      },
      {
        id: "tx2",
        userId: "u2",
        orderId: "QRIS-002",
        provider: "MIDTRANS",
        grossAmount: 250_000,
        enrollmentId: "e2",
      },
    ]);

    // tx1 auto-refund succeeds; tx2 rejected by Midtrans (>7 days) -> stays REFUND_REQUESTED
    mockRefundMidtrans
      .mockResolvedValueOnce({ success: true, mode: "MIDTRANS" })
      .mockResolvedValueOnce({ success: false, mode: "MIDTRANS", errorMessage: "Expired refund window" });

    const res = await wellnessAdminCancelBatchAndRefund({
      programId: "p1",
      tryMidtransAutoRefund: true,
      adminFeeDeduction: 10_000,
      reason: "Cohort under minimum quota",
    });

    expect(res.success).toBe(true);
    expect(res.data).toEqual({
      cancelledEnrollments: 2,
      autoRefundedCount: 1,
      manualRefundRequiredCount: 1,
    });

    expect(mockLockProgramRow).toHaveBeenCalledWith(mockTx, "p1");
    // Net refund = 250_000 - 10_000 = 240_000
    expect(mockTx.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx1" },
        data: expect.objectContaining({
          status: "REFUND_REQUESTED",
          refundAmount: 240_000,
          refundFeeAmount: 10_000,
        }),
      })
    );
    expect(mockRefundMidtrans).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "QRIS-001", amountIdr: 240_000, refundKey: "REF-tx1" })
    );
    // tx1 marked REFUND, tx2 kept REFUND_REQUESTED with fallback audit note
    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx1" },
        data: expect.objectContaining({ status: "REFUND", refundedById: "super_1" }),
      })
    );
    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tx2" },
        data: expect.objectContaining({ status: "REFUND_REQUESTED" }),
      })
    );
  });

  it("prevents double-refund and over-refund (refundAmount > grossAmount) in manual refund recording", async () => {
    // 1. Double-refund blocked (status is already REFUND)
    mockTx.paymentTransaction.findUnique
      .mockResolvedValueOnce({
        id: "tx1",
        orderId: "QRIS-001",
        programId: "p1",
        enrollmentId: "e1",
        userId: "u1",
        grossAmount: 200_000,
        status: "REFUND",
        program: { title: "Core" },
      })
      .mockResolvedValueOnce({ status: "REFUND", grossAmount: 200_000 });

    const doubleRes = await wellnessAdminRecordManualRefund({
      transactionId: "tx1",
      refundAmount: 200_000,
      adminFeeDeduction: 0,
      note: "Duplicate attempt",
    });
    expect(doubleRes.success).toBe(false);
    expect(doubleRes.message).toContain("Cannot refund transaction in status REFUND");

    // 2. Over-refund blocked (refundAmount > grossAmount)
    mockTx.paymentTransaction.findUnique
      .mockResolvedValueOnce({
        id: "tx2",
        orderId: "QRIS-002",
        programId: "p1",
        enrollmentId: "e2",
        userId: "u2",
        grossAmount: 200_000,
        status: "REFUND_REQUESTED",
        program: { title: "Core" },
      })
      .mockResolvedValueOnce({ status: "REFUND_REQUESTED", grossAmount: 200_000 });

    const overRes = await wellnessAdminRecordManualRefund({
      transactionId: "tx2",
      refundAmount: 250_000,
      adminFeeDeduction: 0,
      note: "Overpayment typo",
    });
    expect(overRes.success).toBe(false);
    expect(overRes.message).toContain("cannot exceed gross amount");

    // 2b. Over-deduction blocked (refundAmount + adminFeeDeduction > grossAmount)
    mockTx.paymentTransaction.findUnique
      .mockResolvedValueOnce({
        id: "tx2b",
        orderId: "QRIS-002B",
        programId: "p1",
        enrollmentId: "e2",
        userId: "u2",
        grossAmount: 200_000,
        status: "REFUND_REQUESTED",
        program: { title: "Core" },
      })
      .mockResolvedValueOnce({ status: "REFUND_REQUESTED", grossAmount: 200_000 });

    const overComboRes = await wellnessAdminRecordManualRefund({
      transactionId: "tx2b",
      refundAmount: 195_000,
      adminFeeDeduction: 10_000,
      note: "Fee + refund exceeds gross",
    });
    expect(overComboRes.success).toBe(false);
    expect(overComboRes.message).toContain("cannot exceed gross amount");

    // 3. Valid manual refund succeeds, cancels enrollment, logs audit, and notifies user
    mockTx.paymentTransaction.findUnique
      .mockResolvedValueOnce({
        id: "tx3",
        orderId: "QRIS-003",
        programId: "p1",
        enrollmentId: "e3",
        userId: "u3",
        grossAmount: 200_000,
        status: "REFUND_REQUESTED",
        program: { title: "Core" },
      })
      .mockResolvedValueOnce({ status: "REFUND_REQUESTED", grossAmount: 200_000 });
    mockTx.paymentTransaction.update.mockResolvedValueOnce({ id: "tx3", orderId: "QRIS-003" });

    const okRes = await wellnessAdminRecordManualRefund({
      transactionId: "tx3",
      refundAmount: 190_000,
      adminFeeDeduction: 10_000,
      note: "Transferred via BCA",
    });
    expect(okRes.success).toBe(true);
    expect(mockTx.programEnrollment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) })
    );
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADMIN_RECORD_MANUAL_REFUND" }),
      mockTx
    );
    expect(mockCreateNotifications).toHaveBeenCalledOnce();
  });
});
