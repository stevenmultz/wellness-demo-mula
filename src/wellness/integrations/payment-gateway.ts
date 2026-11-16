/**
 * PAYMENT GATEWAY INTEGRATION TEMPLATE (QRIS / MIDTRANS / XENDIT)
 * ---------------------------------------------------------------
 * Currently runs in INTERNAL_SIMULATION mode so checkout & admin approval work out-of-the-box.
 * When ready to connect Midtrans or Xendit in production:
 * 1. Set PAYMENT_PROVIDER="MIDTRANS" or "XENDIT" in .env
 * 2. Add MIDTRANS_SERVER_KEY or XENDIT_SECRET_KEY in .env
 * 3. Implement the HTTP call inside `createQrisInvoiceAdapter` & `verifyQrisWebhookSignature`.
 */

import crypto from "crypto";
import {
  getPaymentProvider,
  QRIS_INVOICE_TTL_MS,
  type PaymentProviderMode,
} from "../config";

export interface QrisGatewayInvoiceRequest {
  enrollmentId: string;
  userId: string;
  userEmail: string;
  programTitle: string;
  amountIdr: number;
}

export interface QrisGatewayInvoiceResponse {
  paymentReference: string;
  qrStringOrUrl?: string;
  invoiceExpiresAt: Date;
  providerMode: PaymentProviderMode;
}

export async function createQrisInvoiceAdapter(
  req: QrisGatewayInvoiceRequest
): Promise<QrisGatewayInvoiceResponse> {
  const provider = getPaymentProvider();

  // 15-minute validity window (SOW 5.2)
  const invoiceExpiresAt = new Date(Date.now() + QRIS_INVOICE_TTL_MS);
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  const paymentReference = `QRIS-${Date.now().toString().slice(-5)}-${randomSuffix}`;

  if (provider === "MIDTRANS") {
    // TODO [Third-Party Integration]: Call Midtrans Core API /v2/charge with payment_type: "qris"
    // const response = await fetch("https://api.midtrans.com/v2/charge", { ... });
  }

  if (provider === "XENDIT") {
    // TODO [Third-Party Integration]: Call Xendit QR Codes API /qr_codes
    // const response = await fetch("https://api.xendit.co/qr_codes", { ... });
  }

  return {
    paymentReference,
    invoiceExpiresAt,
    providerMode: provider,
  };
}
