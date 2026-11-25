import crypto from "crypto";
import {
  getMidtransConfig,
  getPaymentProvider,
  QRIS_INVOICE_TTL_MS,
  type PaymentProviderMode,
} from "../config";

export interface QrisGatewayInvoiceRequest {
  orderId: string;
  enrollmentId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  programTitle: string;
  amountIdr: number;
}

export interface QrisGatewayInvoiceResponse {
  orderId: string;
  paymentReference: string;
  gatewayTransactionId?: string | null;
  qrStringOrUrl?: string | null;
  invoiceExpiresAt: Date;
  providerMode: PaymentProviderMode;
  rawResponse?: unknown;
}

export function generateQrisOrderId(): string {
  const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `QRIS-${Date.now().toString().slice(-6)}-${randomSuffix}`;
}

export async function createQrisInvoiceAdapter(
  req: QrisGatewayInvoiceRequest
): Promise<QrisGatewayInvoiceResponse> {
  const provider = getPaymentProvider();
  const invoiceExpiresAt = new Date(Date.now() + QRIS_INVOICE_TTL_MS);

  if (provider === "MIDTRANS") {
    const midtrans = getMidtransConfig();
    if (!midtrans.serverKey) {
      throw new Error(
        "Midtrans payment gateway is selected, but MIDTRANS_SERVER_KEY is not configured."
      );
    }

    const authHeader = Buffer.from(`${midtrans.serverKey}:`).toString("base64");
    const response = await fetch(`${midtrans.apiBaseUrl}/v2/charge`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: req.orderId,
          gross_amount: Math.round(req.amountIdr),
        },
        item_details: [
          {
            id: req.enrollmentId,
            price: Math.round(req.amountIdr),
            quantity: 1,
            name: req.programTitle.slice(0, 50),
          },
        ],
        customer_details: {
          email: req.userEmail,
          first_name: (req.userName || "Member").slice(0, 50),
        },
        custom_expiry: {
          expiry_duration: 15,
          unit: "minute",
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await response.json().catch(() => null)) as {
      status_code?: string;
      status_message?: string;
      transaction_id?: string;
      qr_string?: string;
      expiry_time?: string;
      actions?: Array<{ name?: string; url?: string }>;
    } | null;

    if (!response.ok || !data || (data.status_code && !["200", "201"].includes(data.status_code))) {
      throw new Error(
        data?.status_message || `Midtrans QRIS charge failed (HTTP ${response.status}).`
      );
    }

    const qrActionUrl =
      data.actions?.find((a) => a.name === "generate-qr-code")?.url ||
      data.actions?.[0]?.url ||
      data.qr_string ||
      null;

    const parsedExpiry = data.expiry_time ? new Date(data.expiry_time.replace(" ", "T") + "+07:00") : null;
    const finalExpiry =
      parsedExpiry && !Number.isNaN(parsedExpiry.getTime()) ? parsedExpiry : invoiceExpiresAt;

    return {
      orderId: req.orderId,
      paymentReference: req.orderId,
      gatewayTransactionId: data.transaction_id ?? null,
      qrStringOrUrl: qrActionUrl,
      invoiceExpiresAt: finalExpiry,
      providerMode: "MIDTRANS",
      rawResponse: data,
    };
  }

  return {
    orderId: req.orderId,
    paymentReference: req.orderId,
    gatewayTransactionId: null,
    qrStringOrUrl: null,
    invoiceExpiresAt,
    providerMode: provider,
  };
}

export function verifyMidtransWebhookSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): boolean {
  if (!params.serverKey || !params.signatureKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(params.signatureKey.toLowerCase(), "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export type PaymentTxStatus = "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "REFUND";

/**
 * Midtrans does not guarantee webhook ordering. A delayed `pending`/`expire`/`cancel`/`deny`
 * notification must never overwrite a settled or refunded payment.
 * - PENDING never overwrites any non-PENDING state.
 * - SETTLEMENT may only move to REFUND.
 * - REFUND is terminal.
 * Re-delivery of the same status is treated as allowed (callers handle idempotency).
 */
export function isAllowedPaymentTransition(from: string, to: PaymentTxStatus): boolean {
  if (from === to) return true;
  if (from === "REFUND") return false;
  if (from === "REFUND_REQUESTED") return to === "REFUND";
  if (from === "SETTLEMENT" || from === "MANUAL_APPROVED") return to === "REFUND";
  if (to === "PENDING") return from === "PENDING";
  return true;
}

export interface MidtransRefundResult {
  success: boolean;
  mode: PaymentProviderMode;
  refundKey?: string;
  errorMessage?: string;
  rawResponse?: unknown;
}

/**
 * Calls Midtrans Core API `POST /v2/{order_id}/refund` for SETTLEMENT transactions.
 * Handles QRIS/gateway constraints gracefully (e.g. >7 days Off-Us or insufficient Payable Amount),
 * returning structured failure details so caller can fall back to manual refund tracking.
 */
export async function refundMidtransTransactionAdapter(params: {
  orderId: string;
  amountIdr: number;
  reason: string;
  refundKey?: string;
}): Promise<MidtransRefundResult> {
  const provider = getPaymentProvider();
  const refundKey = (params.refundKey || `REF-${params.orderId}`).slice(0, 64);

  if (provider !== "MIDTRANS") {
    return {
      success: true,
      mode: provider,
      refundKey,
    };
  }

  const midtrans = getMidtransConfig();
  if (!midtrans.serverKey) {
    return {
      success: false,
      mode: "MIDTRANS",
      refundKey,
      errorMessage: "MIDTRANS_SERVER_KEY is not configured.",
    };
  }

  try {
    const authHeader = Buffer.from(`${midtrans.serverKey}:`).toString("base64");
    const response = await fetch(
      `${midtrans.apiBaseUrl}/v2/${encodeURIComponent(params.orderId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          refund_key: refundKey,
          amount: Math.max(1, Math.round(params.amountIdr)),
          reason: params.reason.slice(0, 200),
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    const data = (await response.json().catch(() => null)) as {
      status_code?: string;
      status_message?: string;
      refund_chargeback_id?: number;
    } | null;

    if (response.ok && data && ["200", "201"].includes(String(data.status_code || ""))) {
      return {
        success: true,
        mode: "MIDTRANS",
        refundKey,
        rawResponse: data,
      };
    }

    return {
      success: false,
      mode: "MIDTRANS",
      refundKey,
      errorMessage:
        data?.status_message || `Midtrans refund rejected (HTTP ${response.status}).`,
      rawResponse: data,
    };
  } catch (err) {
    return {
      success: false,
      mode: "MIDTRANS",
      refundKey,
      errorMessage: err instanceof Error ? err.message : "Midtrans refund request failed.",
    };
  }
}
