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
