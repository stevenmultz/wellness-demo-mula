import crypto from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQrisInvoiceAdapter,
  generateQrisOrderId,
  isAllowedPaymentTransition,
  refundMidtransTransactionAdapter,
  verifyMidtransWebhookSignature,
} from "@/wellness/integrations/payment-gateway";

describe("Integrations: Payment Gateway (QRIS & Midtrans)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("generates unique QRIS order IDs with expected prefix", () => {
    const id1 = generateQrisOrderId();
    const id2 = generateQrisOrderId();
    expect(id1).toMatch(/^QRIS-\d{6}-[A-F0-9]{8}$/);
    expect(id1).not.toBe(id2);
  });

  it("verifies Midtrans SHA-512 signatures timing-safely and rejects tampering", () => {
    const serverKey = "SB-Mid-server-UNITTEST";
    const sig = crypto
      .createHash("sha512")
      .update(`QRIS-1001200250000.00${serverKey}`)
      .digest("hex");

    expect(
      verifyMidtransWebhookSignature({
        orderId: "QRIS-1001",
        statusCode: "200",
        grossAmount: "250000.00",
        serverKey,
        signatureKey: sig.toUpperCase(),
      })
    ).toBe(true);

    // Tampered gross amount
    expect(
      verifyMidtransWebhookSignature({
        orderId: "QRIS-1001",
        statusCode: "200",
        grossAmount: "100.00",
        serverKey,
        signatureKey: sig,
      })
    ).toBe(false);

    // Missing / wrong-length signature
    expect(
      verifyMidtransWebhookSignature({
        orderId: "QRIS-1001",
        statusCode: "200",
        grossAmount: "250000.00",
        serverKey,
        signatureKey: "short",
      })
    ).toBe(false);
  });

  it("enforces monotonic payment state transitions against out-of-order webhooks", () => {
    // PENDING -> any status allowed
    expect(isAllowedPaymentTransition("PENDING", "SETTLEMENT")).toBe(true);
    expect(isAllowedPaymentTransition("PENDING", "EXPIRE")).toBe(true);
    expect(isAllowedPaymentTransition("PENDING", "CANCEL")).toBe(true);

    // SETTLEMENT / MANUAL_APPROVED -> ONLY REFUND or idempotent SETTLEMENT
    expect(isAllowedPaymentTransition("SETTLEMENT", "SETTLEMENT")).toBe(true);
    expect(isAllowedPaymentTransition("SETTLEMENT", "REFUND")).toBe(true);
    expect(isAllowedPaymentTransition("SETTLEMENT", "EXPIRE")).toBe(false);
    expect(isAllowedPaymentTransition("SETTLEMENT", "CANCEL")).toBe(false);
    expect(isAllowedPaymentTransition("SETTLEMENT", "PENDING")).toBe(false);
    expect(isAllowedPaymentTransition("MANUAL_APPROVED", "REFUND")).toBe(true);
    expect(isAllowedPaymentTransition("MANUAL_APPROVED", "DENY")).toBe(false);

    // REFUND_REQUESTED -> ONLY REFUND
    expect(isAllowedPaymentTransition("REFUND_REQUESTED", "REFUND")).toBe(true);
    expect(isAllowedPaymentTransition("REFUND_REQUESTED", "SETTLEMENT")).toBe(false);

    // REFUND is strictly terminal
    expect(isAllowedPaymentTransition("REFUND", "REFUND")).toBe(true);
    expect(isAllowedPaymentTransition("REFUND", "SETTLEMENT")).toBe(false);
    expect(isAllowedPaymentTransition("REFUND", "EXPIRE")).toBe(false);

    // Stale PENDING cannot overwrite non-PENDING
    expect(isAllowedPaymentTransition("EXPIRE", "PENDING")).toBe(false);
    expect(isAllowedPaymentTransition("CANCEL", "PENDING")).toBe(false);
  });

  it("creates QRIS invoices in INTERNAL_SIMULATION and MIDTRANS modes", async () => {
    const req = {
      orderId: "QRIS-999-ABCD1234",
      enrollmentId: "enr_1",
      userId: "u_1",
      userEmail: "budi@zera.id",
      userName: "Budi",
      programTitle: "Somatic Core 21 Days",
      amountIdr: 250000,
    };

    process.env.PAYMENT_PROVIDER = "INTERNAL_SIMULATION";
    const simRes = await createQrisInvoiceAdapter(req);
    expect(simRes.providerMode).toBe("INTERNAL_SIMULATION");
    expect(simRes.orderId).toBe(req.orderId);
    expect(simRes.qrStringOrUrl).toBeNull();

    // MIDTRANS missing key throws
    process.env.PAYMENT_PROVIDER = "MIDTRANS";
    delete process.env.MIDTRANS_SERVER_KEY;
    await expect(createQrisInvoiceAdapter(req)).rejects.toThrow(/MIDTRANS_SERVER_KEY/);

    // MIDTRANS success response with mocked fetch
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-TEST";
    process.env.MIDTRANS_IS_PRODUCTION = "false";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status_code: "201",
          transaction_id: "tx-mid-777",
          expiry_time: "2026-06-01 12:15:00",
          actions: [{ name: "generate-qr-code", url: "https://api.sandbox.midtrans.com/qr/777" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const midRes = await createQrisInvoiceAdapter(req);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(midRes.providerMode).toBe("MIDTRANS");
    expect(midRes.gatewayTransactionId).toBe("tx-mid-777");
    expect(midRes.qrStringOrUrl).toBe("https://api.sandbox.midtrans.com/qr/777");
    expect(midRes.invoiceExpiresAt.toISOString()).toBe("2026-06-01T05:15:00.000Z");

    // MIDTRANS error status_code throws
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status_code: "400", status_message: "Duplicate order_id" }), {
        status: 400,
      })
    );
    await expect(createQrisInvoiceAdapter(req)).rejects.toThrow(/Duplicate order_id/);
  });

  it("handles Midtrans refunds across simulation, success, rejection, and network failure", async () => {
    process.env.PAYMENT_PROVIDER = "INTERNAL_SIMULATION";
    const sim = await refundMidtransTransactionAdapter({
      orderId: "QRIS-1",
      amountIdr: 100000,
      reason: "User request",
    });
    expect(sim.success).toBe(true);
    expect(sim.mode).toBe("INTERNAL_SIMULATION");

    process.env.PAYMENT_PROVIDER = "MIDTRANS";
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-server-TEST";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status_code: "200", refund_chargeback_id: 99 }), {
        status: 200,
      })
    );
    const ok = await refundMidtransTransactionAdapter({
      orderId: "QRIS-1",
      amountIdr: 100000,
      reason: "Quota overflow",
    });
    expect(ok.success).toBe(true);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status_code: "412", status_message: "Insufficient balance" }), {
        status: 412,
      })
    );
    const rejected = await refundMidtransTransactionAdapter({
      orderId: "QRIS-1",
      amountIdr: 100000,
      reason: "Quota overflow",
    });
    expect(rejected.success).toBe(false);
    expect(rejected.errorMessage).toContain("Insufficient balance");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ETIMEDOUT"));
    const netErr = await refundMidtransTransactionAdapter({
      orderId: "QRIS-1",
      amountIdr: 100000,
      reason: "Quota overflow",
    });
    expect(netErr.success).toBe(false);
    expect(netErr.errorMessage).toBe("ETIMEDOUT");
  });
});
