import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockLockProgramRow,
  mockCreateUserNotifications,
  mockRecordAuditLog,
  mockPrisma,
  mockTx,
} = vi.hoisted(() => {
  const tx = {
    paymentTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    programEnrollment: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    cohortSupportRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
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
    mockCreateUserNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockPrisma: prisma,
    mockTx: tx,
  };
});

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockProgramRow: mockLockProgramRow,
}));

vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateUserNotifications,
}));

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { POST as midtransWebhookPost } from "@/app/api/webhooks/midtrans/route";

const TEST_SERVER_KEY = "SB-Mid-server-WEBHOOK-SECRET";

function signWebhook(orderId: string, statusCode: string, grossAmount: string) {
  return crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${TEST_SERVER_KEY}`)
    .digest("hex");
}

function makeWebhookReq(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new NextRequest("https://zera.id/api/webhooks/midtrans", {
    method: "POST",
    headers: { "content-type": "application/json", ...extraHeaders },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("API Route: POST /api/webhooks/midtrans", () => {
  const originalEnv = { ...process.env };

  const baseTxRecord = {
    id: "tx_1",
    orderId: "QRIS-ORDER-100",
    enrollmentId: "enr_1",
    userId: "user_1",
    programId: "prog_1",
    grossAmount: 250000,
    status: "PENDING",
    gatewayTransactionId: null,
    paymentType: "qris",
    settledAt: null,
    enrollment: {
      id: "enr_1",
      program: {
        id: "prog_1",
        title: "21-Day Core Reset",
        maxQuota: 20,
        locationType: "ONLINE",
        endAt: null,
      },
    },
  };

  beforeEach(() => {
    process.env.MIDTRANS_SERVER_KEY = TEST_SERVER_KEY;
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects oversized payload (413), invalid JSON (400), wrong field types (400), and missing fields (400)", async () => {
    expect((await midtransWebhookPost(makeWebhookReq("{}", { "content-length": "90000" }))).status).toBe(
      413
    );
    expect((await midtransWebhookPost(makeWebhookReq("{broken"))).status).toBe(400);
    expect((await midtransWebhookPost(makeWebhookReq([]))).status).toBe(400);
    expect((await midtransWebhookPost(makeWebhookReq({ order_id: 12345 }))).status).toBe(400);
    expect((await midtransWebhookPost(makeWebhookReq({ order_id: "QRIS-1" }))).status).toBe(400);
  });

  it("returns 503 when server key is missing and 401 when signature is invalid", async () => {
    delete process.env.MIDTRANS_SERVER_KEY;
    const payload = {
      order_id: "QRIS-ORDER-100",
      status_code: "200",
      gross_amount: "250000.00",
      signature_key: "deadbeef",
    };
    expect((await midtransWebhookPost(makeWebhookReq(payload))).status).toBe(503);

    process.env.MIDTRANS_SERVER_KEY = TEST_SERVER_KEY;
    expect((await midtransWebhookPost(makeWebhookReq(payload))).status).toBe(401);
  });

  it("returns 404 when transaction is unknown and 400 (+ audit log) on gross_amount tampering", async () => {
    const orderId = "QRIS-ORDER-100";
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce(null);
    const notFoundRes = await midtransWebhookPost(
      makeWebhookReq({
        order_id: orderId,
        status_code: "200",
        gross_amount: "250000.00",
        signature_key: signWebhook(orderId, "200", "250000.00"),
        transaction_status: "settlement",
      })
    );
    expect(notFoundRes.status).toBe(404);

    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce(baseTxRecord);
    const tamperRes = await midtransWebhookPost(
      makeWebhookReq({
        order_id: orderId,
        status_code: "200",
        gross_amount: "1000.00", // tampered amount
        signature_key: signWebhook(orderId, "200", "1000.00"),
        transaction_status: "settlement",
      })
    );
    expect(tamperRes.status).toBe(400);
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_WEBHOOK_AMOUNT_MISMATCH" })
    );
  });

  it("acknowledges duplicate SETTLEMENT idempotently without opening a transaction", async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      ...baseTxRecord,
      status: "SETTLEMENT",
    });

    const res = await midtransWebhookPost(
      makeWebhookReq({
        order_id: baseTxRecord.orderId,
        status_code: "200",
        gross_amount: "250000.00",
        signature_key: signWebhook(baseTxRecord.orderId, "200", "250000.00"),
        transaction_status: "settlement",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, idempotent: true });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("activates enrollment, locks program row, records audit log, and notifies member on SETTLEMENT", async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce(baseTxRecord);
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "PENDING" });
    mockTx.programEnrollment.count.mockResolvedValueOnce(5);
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce({
      status: "PENDING",
      termsAgreedAt: null,
      termsAgreedVersion: null,
    });

    const res = await midtransWebhookPost(
      makeWebhookReq({
        order_id: baseTxRecord.orderId,
        status_code: "200",
        gross_amount: "250000.00",
        signature_key: signWebhook(baseTxRecord.orderId, "200", "250000.00"),
        transaction_status: "settlement",
        transaction_id: "mid_tx_99",
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, activated: true, quotaOverflow: false });
    expect(mockLockProgramRow).toHaveBeenCalledWith(mockTx, "prog_1");
    expect(mockTx.programEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "enr_1" },
        data: expect.objectContaining({ status: "ACTIVE", paymentReference: baseTxRecord.orderId }),
      })
    );
    expect(mockCreateUserNotifications).toHaveBeenCalledOnce();
  });

  it("opens QUOTA_OVERFLOW_REFUND support ticket instead of overbooking when cohort is already full", async () => {
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce(baseTxRecord);
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "PENDING" });
    mockTx.programEnrollment.count.mockResolvedValueOnce(20); // equals maxQuota
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce({
      status: "PENDING",
      termsAgreedAt: null,
      termsAgreedVersion: null,
    });
    mockTx.cohortSupportRequest.findFirst.mockResolvedValueOnce(null);

    const res = await midtransWebhookPost(
      makeWebhookReq({
        order_id: baseTxRecord.orderId,
        status_code: "200",
        gross_amount: "250000.00",
        signature_key: signWebhook(baseTxRecord.orderId, "200", "250000.00"),
        transaction_status: "settlement",
      })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, activated: false, quotaOverflow: true });
    expect(mockTx.programEnrollment.update).not.toHaveBeenCalled();
    expect(mockTx.cohortSupportRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reasonCode: "QUOTA_OVERFLOW_REFUND", status: "OPEN" }),
      })
    );
    expect(mockCreateUserNotifications).toHaveBeenCalledOnce();
  });

  it("ignores stale out-of-order EXPIRE webhook after SETTLEMENT and processes REFUND properly", async () => {
    // 1. Stale EXPIRE after SETTLEMENT
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      ...baseTxRecord,
      status: "SETTLEMENT",
    });
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "SETTLEMENT" });

    const staleRes = await midtransWebhookPost(
      makeWebhookReq({
        order_id: baseTxRecord.orderId,
        status_code: "202",
        gross_amount: "250000.00",
        signature_key: signWebhook(baseTxRecord.orderId, "202", "250000.00"),
        transaction_status: "expire",
      })
    );
    expect(staleRes.status).toBe(200);
    expect(mockTx.paymentTransaction.update).not.toHaveBeenCalled();
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_WEBHOOK_STALE_TRANSITION_IGNORED" }),
      mockTx
    );

    // 2. Valid REFUND cancels enrollment
    mockPrisma.paymentTransaction.findUnique.mockResolvedValueOnce({
      ...baseTxRecord,
      status: "SETTLEMENT",
    });
    mockTx.paymentTransaction.findUnique.mockResolvedValueOnce({ status: "SETTLEMENT" });

    const refundRes = await midtransWebhookPost(
      makeWebhookReq({
        order_id: baseTxRecord.orderId,
        status_code: "200",
        gross_amount: "250000.00",
        signature_key: signWebhook(baseTxRecord.orderId, "200", "250000.00"),
        transaction_status: "refund",
      })
    );
    expect(refundRes.status).toBe(200);
    expect(mockTx.programEnrollment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_REFUNDED_WEBHOOK" }),
      mockTx
    );
  });
});
