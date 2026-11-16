import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { lockProgramRow, prisma } from "@/wellness/db";
import { getMidtransConfig } from "@/wellness/config";
import { verifyMidtransWebhookSignature } from "@/wellness/integrations/payment-gateway";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { recordAuditLog } from "@/wellness/integrations/audit-log";

export const dynamic = "force-dynamic";

interface MidtransWebhookBody {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  transaction_id?: string;
  fraud_status?: string;
  payment_type?: string;
}

export async function POST(request: NextRequest) {
  let body: MidtransWebhookBody;
  try {
    body = (await request.json()) as MidtransWebhookBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const orderId = body.order_id?.trim() || "";
  const statusCode = body.status_code?.trim() || "";
  const grossAmount = body.gross_amount?.trim() || "";
  const signatureKey = body.signature_key?.trim() || "";
  const txStatus = (body.transaction_status || "").toLowerCase().trim();
  const fraudStatus = (body.fraud_status || "").toLowerCase().trim();

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return NextResponse.json({ message: "Missing required Midtrans fields" }, { status: 400 });
  }

  const { serverKey } = getMidtransConfig();
  if (!serverKey) {
    return NextResponse.json({ message: "Midtrans webhook key not configured" }, { status: 503 });
  }

  const validSig = verifyMidtransWebhookSignature({
    orderId,
    statusCode,
    grossAmount,
    serverKey,
    signatureKey,
  });

  if (!validSig) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  const txRecord = await prisma.paymentTransaction.findUnique({
    where: { orderId },
    include: {
      enrollment: { include: { program: true } },
    },
  });

  if (!txRecord) {
    return NextResponse.json({ message: "Transaction not found" }, { status: 404 });
  }

  const receivedAmount = Math.round(Number(grossAmount));
  if (!Number.isFinite(receivedAmount) || receivedAmount !== txRecord.grossAmount) {
    await recordAuditLog({
      action: "PAYMENT_WEBHOOK_AMOUNT_MISMATCH",
      entityType: "PaymentTransaction",
      entityId: txRecord.id,
      metadata: { orderId, expected: txRecord.grossAmount, received: grossAmount },
    });
    return NextResponse.json({ message: "Gross amount mismatch" }, { status: 400 });
  }

  let nextTxStatus: "PENDING" | "SETTLEMENT" | "EXPIRE" | "CANCEL" | "DENY" | "REFUND" = "PENDING";
  if (txStatus === "settlement" || (txStatus === "capture" && (!fraudStatus || fraudStatus === "accept"))) {
    nextTxStatus = "SETTLEMENT";
  } else if (txStatus === "expire") {
    nextTxStatus = "EXPIRE";
  } else if (txStatus === "cancel") {
    nextTxStatus = "CANCEL";
  } else if (txStatus === "deny") {
    nextTxStatus = "DENY";
  } else if (txStatus === "refund" || txStatus === "partial_refund") {
    nextTxStatus = "REFUND";
  }

  // Idempotency: if already settled, acknowledge without side effects
  if (txRecord.status === "SETTLEMENT" && nextTxStatus === "SETTLEMENT") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  const outcome = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, txRecord.programId);

    const freshTx = await tx.paymentTransaction.findUnique({
      where: { id: txRecord.id },
      select: { status: true },
    });

    if (freshTx?.status === "SETTLEMENT" && nextTxStatus === "SETTLEMENT") {
      return { activated: false, quotaOverflow: false };
    }

    const now = new Date();
    const webhookJson = JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue;

    await tx.paymentTransaction.update({
      where: { id: txRecord.id },
      data: {
        status: nextTxStatus,
        gatewayTransactionId: body.transaction_id ?? txRecord.gatewayTransactionId,
        paymentType: body.payment_type || txRecord.paymentType,
        rawWebhookJson: webhookJson,
        settledAt: nextTxStatus === "SETTLEMENT" ? txRecord.settledAt ?? now : txRecord.settledAt,
      },
    });

    if (nextTxStatus === "SETTLEMENT") {
      const activeCount = await tx.programEnrollment.count({
        where: { programId: txRecord.programId, status: "ACTIVE" },
      });

      const currentEnrollment = await tx.programEnrollment.findUnique({
        where: { id: txRecord.enrollmentId },
        select: { status: true, termsAgreedAt: true, termsAgreedVersion: true },
      });

      if (
        currentEnrollment?.status !== "ACTIVE" &&
        activeCount >= txRecord.enrollment.program.maxQuota
      ) {
        await recordAuditLog(
          {
            actorUserId: txRecord.userId,
            action: "PAYMENT_SETTLED_QUOTA_EXCEEDED",
            entityType: "ProgramEnrollment",
            entityId: txRecord.enrollmentId,
            metadata: { orderId, programId: txRecord.programId },
          },
          tx
        );
        return { activated: false, quotaOverflow: true };
      }

      const programEnd = txRecord.enrollment.program.endAt;
      const validUntilAt =
        programEnd > now ? programEnd : new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      await tx.programEnrollment.update({
        where: { id: txRecord.enrollmentId },
        data: {
          status: "ACTIVE",
          paymentReference: orderId,
          paidAt: now,
          validUntilAt,
          termsAgreedAt: currentEnrollment?.termsAgreedAt ?? now,
          termsAgreedVersion: currentEnrollment?.termsAgreedVersion ?? "v1.0",
        },
      });

      await recordAuditLog(
        {
          actorUserId: txRecord.userId,
          action: "PAYMENT_SETTLED_WEBHOOK",
          entityType: "ProgramEnrollment",
          entityId: txRecord.enrollmentId,
          metadata: { orderId, grossAmount: txRecord.grossAmount },
        },
        tx
      );

      return { activated: true, quotaOverflow: false };
    }

    if (nextTxStatus === "EXPIRE" || nextTxStatus === "CANCEL" || nextTxStatus === "DENY") {
      await tx.programEnrollment.updateMany({
        where: { id: txRecord.enrollmentId, status: "PENDING", paymentReference: orderId },
        data: { status: nextTxStatus === "EXPIRE" ? "EXPIRED" : "CANCELLED" },
      });
    }

    return { activated: false, quotaOverflow: false };
  });

  if (outcome.activated) {
    await createUserNotifications([
      {
        userId: txRecord.userId,
        type: "PAYMENT",
        title: "Payment confirmed",
        body: `Your QRIS payment for "${txRecord.enrollment.program.title}" is confirmed. Your plan is now active.`,
        url: "/dashboard",
        dedupeKey: `payment-active:${txRecord.enrollmentId}`,
      },
    ]);
  }

  return NextResponse.json({ ok: true, ...outcome });
}
