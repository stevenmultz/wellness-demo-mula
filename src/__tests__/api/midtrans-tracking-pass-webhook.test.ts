import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockLockProgramRow,
  mockLockUserRow,
  mockGrantBonus,
  mockGrantPass,
  mockRevokeGrant,
  mockCreateNotifications,
  mockRecordAuditLog,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
    },
    paymentTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    programEnrollment: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    trackingPassOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  const prisma = {
    paymentTransaction: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };

  return {
    mockLockProgramRow: vi.fn(),
    mockLockUserRow: vi.fn(),
    mockGrantBonus: vi.fn(),
    mockGrantPass: vi.fn(),
    mockRevokeGrant: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockProgramRow: mockLockProgramRow,
  lockUserRow: mockLockUserRow,
}));
vi.mock("@/wellness/config", () => ({
  getMidtransConfig: () => ({
    serverKey: "test-midtrans-server-key",
    clientKey: "test-client",
    isProduction: false,
  }),
}));
vi.mock("@/wellness/services/tracking-entitlement", () => ({
  grantProgramBonusTrackingInTx: mockGrantBonus,
  grantStandalonePassInTx: mockGrantPass,
  revokeTrackingGrantBySourceInTx: mockRevokeGrant,
}));
vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));
vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));
vi.mock("@/wellness/observability", () => ({
  reportServerError: vi.fn(),
  reportCriticalIncident: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/midtrans/route";

function signMidtrans(orderId: string, statusCode: string, grossAmount: string) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}test-midtrans-server-key`)
    .digest("hex");
}

function makeWebhookRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/webhooks/midtrans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Midtrans Webhook — Dual-Target (Program Enrollment XOR Tracking Pass)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.user.findUnique.mockResolvedValue({ status: "ACTIVE", deletedAt: null });
    mockGrantBonus.mockResolvedValue({ granted: true, endsAt: new Date("2027-02-01T00:00:00.000Z") });
    mockGrantPass.mockResolvedValue({ granted: true, endsAt: new Date("2027-05-25T00:00:00.000Z") });
    mockRevokeGrant.mockResolvedValue({ revokedCount: 1, nextTrackingAccessUntil: null });
    mockCreateNotifications.mockResolvedValue(undefined);
    mockRecordAuditLog.mockResolvedValue(undefined);
  });

  it("rejects invalid signature with 401", async () => {
    const req = makeWebhookRequest({
      order_id: "QRIS-PASS-1",
      status_code: "200",
      gross_amount: "500000.00",
      transaction_status: "settlement",
      signature_key: "bad-sig",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("activates TrackingPassOrder and grants 180 days on TRACKING_PASS settlement with zero NPE on null enrollmentId/programId", async () => {
    const sig = signMidtrans("QRIS-PASS-180", "200", "500000.00");
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "ptx_1",
      itemType: "TRACKING_PASS",
      orderId: "QRIS-PASS-180",
      userId: "user_1",
      enrollmentId: null,
      programId: null,
      trackingPassOrderId: "pass_ord_1",
      grossAmount: 500000,
      status: "PENDING",
      settledAt: null,
      enrollment: null,
      trackingPassOrder: {
        id: "pass_ord_1",
        status: "PENDING",
        durationDaysSnapshot: 180,
        termsAgreedAt: null,
        termsAgreedVersion: null,
        plan: { name: "6-Month Independent Tracking Pass" },
      },
    });
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "PENDING" });

    const req = makeWebhookRequest({
      order_id: "QRIS-PASS-180",
      status_code: "200",
      gross_amount: "500000.00",
      transaction_status: "settlement",
      transaction_id: "mid-tx-1",
      payment_type: "qris",
      signature_key: sig,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mockLockUserRow).toHaveBeenCalledWith(mockTx, "user_1");
    expect(mockTx.trackingPassOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pass_ord_1" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(mockGrantPass).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        userId: "user_1",
        trackingPassOrderId: "pass_ord_1",
        durationDays: 180,
      })
    );
    expect(mockCreateNotifications).toHaveBeenCalledTimes(1);
  });

  it("revokes tracking grant cleanly on TRACKING_PASS refund webhook", async () => {
    const sig = signMidtrans("QRIS-PASS-REF", "200", "500000.00");
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "ptx_2",
      itemType: "TRACKING_PASS",
      orderId: "QRIS-PASS-REF",
      userId: "user_1",
      enrollmentId: null,
      programId: null,
      trackingPassOrderId: "pass_ord_2",
      grossAmount: 500000,
      status: "SETTLEMENT",
      settledAt: new Date("2026-11-25T00:00:00.000Z"),
      enrollment: null,
      trackingPassOrder: {
        id: "pass_ord_2",
        status: "ACTIVE",
        durationDaysSnapshot: 180,
        termsAgreedAt: new Date(),
        termsAgreedVersion: "v1.0",
        plan: { name: "6-Month Tracking Pass" },
      },
    });
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "SETTLEMENT" });

    const req = makeWebhookRequest({
      order_id: "QRIS-PASS-REF",
      status_code: "200",
      gross_amount: "500000.00",
      transaction_status: "refund",
      refund_amount: "500000.00",
      signature_key: sig,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockTx.trackingPassOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "pass_ord_2" }),
        data: expect.objectContaining({ status: "REFUNDED" }),
      })
    );
    expect(mockRevokeGrant).toHaveBeenCalledWith(
      mockTx,
      expect.objectContaining({
        userId: "user_1",
        trackingPassOrderId: "pass_ord_2",
      })
    );
  });

  it("refuses to activate Tracking Pass and flags REFUND_REQUESTED when settlement arrives for a deleted account", async () => {
    const sig = signMidtrans("QRIS-PASS-DEL", "200", "500000.00");
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      id: "ptx_del",
      itemType: "TRACKING_PASS",
      orderId: "QRIS-PASS-DEL",
      userId: "user_deleted",
      enrollmentId: null,
      programId: null,
      trackingPassOrderId: "pass_ord_del",
      grossAmount: 500000,
      status: "CANCEL",
      settledAt: null,
      enrollment: null,
      trackingPassOrder: {
        id: "pass_ord_del",
        status: "CANCELLED",
        durationDaysSnapshot: 180,
        termsAgreedAt: null,
        termsAgreedVersion: null,
        plan: { name: "6-Month Tracking Pass" },
      },
    });
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "CANCEL" });
    mockTx.user.findUnique.mockResolvedValueOnce({
      status: "SUSPENDED",
      deletedAt: new Date("2026-11-24T00:00:00.000Z"),
    });

    const req = makeWebhookRequest({
      order_id: "QRIS-PASS-DEL",
      status_code: "200",
      gross_amount: "500000.00",
      transaction_status: "settlement",
      signature_key: sig,
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activated).toBe(false);
    expect(json.inactiveAccountRefund).toBe(true);
    expect(mockTx.trackingPassOrder.update).not.toHaveBeenCalled();
    expect(mockGrantPass).not.toHaveBeenCalled();
    expect(mockTx.paymentTransaction.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "ptx_del" },
        data: expect.objectContaining({ status: "REFUND_REQUESTED" }),
      })
    );
  });
});
