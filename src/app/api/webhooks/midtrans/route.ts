import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { lockProgramRow, lockUserRow, prisma } from "@/wellness/db";
import { getMidtransConfig } from "@/wellness/config";
import { isAllowedPaymentTransition, verifyMidtransWebhookSignature } from "@/wellness/integrations/payment-gateway";
import { createUserNotifications } from "@/wellness/integrations/user-notifications";
import { recordAuditLog } from "@/wellness/integrations/audit-log";
import { reportCriticalIncident } from "@/wellness/observability";
import {
  activateProgramEnrollmentInTx,
  activateTrackingPassOrderInTx,
  revokeEntitlementOnRefundInTx,
} from "@/wellness/services/payment-orchestrator";

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
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 65_536) {
    return NextResponse.json({ message: "Payload too large" }, { status: 413 });
  }
  let body: MidtransWebhookBody;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
    body = parsed as MidtransWebhookBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  for (const key of ["order_id", "status_code", "gross_amount", "signature_key"] as const) {
    if (body[key] !== undefined && typeof body[key] !== "string") {
      return NextResponse.json({ message: "Invalid field types" }, { status: 400 });
    }
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
      trackingPassOrder: { include: { plan: true } },
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
    reportCriticalIncident(
      "payment",
      "midtrans_amount_mismatch",
      `Midtrans webhook gross amount mismatch for order ${orderId}`,
      "error",
      { orderId, txId: txRecord.id, expected: txRecord.grossAmount, received: grossAmount }
    );
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

  const isTrackingPass =
    txRecord.itemType === "TRACKING_PASS" ||
    (Boolean(txRecord.trackingPassOrderId) && !txRecord.enrollmentId);

  // ── BRANCH A: STANDALONE TRACKING PASS WEBHOOK ─────────────────────────────
  if (isTrackingPass) {
    const passOrderId = txRecord.trackingPassOrderId;
    const passOrder = txRecord.trackingPassOrder;
    if (!passOrderId || !passOrder) {
      return NextResponse.json({ message: "Linked tracking pass order missing" }, { status: 409 });
    }

    const passOutcome = await prisma.$transaction(async (tx) => {
      if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === "function") {
        await lockUserRow(tx, txRecord.userId);
      }

      const freshTx = await tx.paymentTransaction.findUnique({
        where: { id: txRecord.id },
        select: { status: true },
      });

      if (freshTx?.status === "SETTLEMENT" && nextTxStatus === "SETTLEMENT") {
        return { activated: false, quotaOverflow: false };
      }

      if (freshTx && !isAllowedPaymentTransition(freshTx.status, nextTxStatus)) {
        await recordAuditLog(
          {
            action: "PAYMENT_WEBHOOK_STALE_TRANSITION_IGNORED",
            entityType: "PaymentTransaction",
            entityId: txRecord.id,
            metadata: { orderId, from: freshTx.status, attempted: nextTxStatus },
          },
          tx
        );
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
        const activation = await activateTrackingPassOrderInTx(tx, {
          orderId: passOrderId,
          userId: txRecord.userId,
          channel: "WEBHOOK",
          actorUserId: txRecord.userId,
          alreadyLockedUser: true,
          paymentReferenceOverride: orderId,
          auditAction: "TRACKING_PASS_SETTLED_WEBHOOK",
          auditMetadata: { grossAmount: txRecord.grossAmount },
          now,
          onInactiveAccount: "REQUEST_REFUND",
          webhookTransaction: {
            id: txRecord.id,
            orderId,
            grossAmount: txRecord.grossAmount,
          },
          fallbackOrderSnapshot: {
            durationDaysSnapshot: passOrder.durationDaysSnapshot,
            termsAgreedAt: passOrder.termsAgreedAt,
            termsAgreedVersion: passOrder.termsAgreedVersion,
            paymentReference: orderId,
          },
        });
        if (activation.status === "INACTIVE_ACCOUNT_REFUND") {
          return { activated: false, quotaOverflow: false, inactiveAccountRefund: true };
        }
        return {
          activated: activation.status === "ACTIVATED",
          quotaOverflow: false,
          inactiveAccountRefund: false,
        };
      }

      if (nextTxStatus === "EXPIRE" || nextTxStatus === "CANCEL" || nextTxStatus === "DENY") {
        await tx.trackingPassOrder.updateMany({
          where: { id: passOrderId, status: "PENDING", paymentReference: orderId },
          data: { status: nextTxStatus === "EXPIRE" ? "EXPIRED" : "CANCELLED" },
        });
      } else if (nextTxStatus === "REFUND") {
        await revokeEntitlementOnRefundInTx(tx, {
          userId: txRecord.userId,
          trackingPassOrderId: passOrderId,
          reason: "Midtrans gateway refund webhook",
          actorUserId: txRecord.userId,
          auditAction: "TRACKING_PASS_REFUNDED_WEBHOOK",
          auditEntityType: "TrackingPassOrder",
          auditEntityId: passOrderId,
          auditMetadata: { orderId, grossAmount: txRecord.grossAmount },
        });
      }

      return { activated: false, quotaOverflow: false };
    });

    if (passOutcome.activated) {
      const planTitle = passOrder.plan?.name ?? "Tracking Pass";
      await createUserNotifications([
        {
          userId: txRecord.userId,
          type: "PAYMENT",
          title: "Tracking Pass active",
          body: `Your QRIS payment for "${planTitle}" (${passOrder.durationDaysSnapshot} days) is confirmed.`,
          url: "/dashboard",
          dedupeKey: `pass-active:${passOrderId}`,
        },
      ]);
    } else if ("inactiveAccountRefund" in passOutcome && passOutcome.inactiveAccountRefund) {
      reportCriticalIncident(
        "payment",
        "midtrans_settled_inactive_account",
        `Tracking Pass QRIS settled for deleted/suspended account on order ${orderId}`,
        "warning",
        { orderId, trackingPassOrderId: passOrderId, userId: txRecord.userId }
      );
    }

    return NextResponse.json({ ok: true, ...passOutcome });
  }

  // ── BRANCH B: PROGRAM ENROLLMENT WEBHOOK ───────────────────────────────────
  const enrollmentId = txRecord.enrollmentId;
  const programId = txRecord.programId;
  const enrollmentRef = txRecord.enrollment;
  if (!enrollmentId || !programId || !enrollmentRef?.program) {
    return NextResponse.json({ message: "Linked enrollment or program missing" }, { status: 409 });
  }

  const outcome = await prisma.$transaction(async (tx) => {
    // Canonical lock order: programs -> users (prevents deadlocks)
    await lockProgramRow(tx, programId);

    const freshTx = await tx.paymentTransaction.findUnique({
      where: { id: txRecord.id },
      select: { status: true },
    });

    if (freshTx?.status === "SETTLEMENT" && nextTxStatus === "SETTLEMENT") {
      return { activated: false, quotaOverflow: false };
    }

    if (freshTx && !isAllowedPaymentTransition(freshTx.status, nextTxStatus)) {
      await recordAuditLog(
        {
          action: "PAYMENT_WEBHOOK_STALE_TRANSITION_IGNORED",
          entityType: "PaymentTransaction",
          entityId: txRecord.id,
          metadata: { orderId, from: freshTx.status, attempted: nextTxStatus },
        },
        tx
      );
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
      const activation = await activateProgramEnrollmentInTx(tx, {
        enrollmentId,
        programId,
        userId: txRecord.userId,
        program: enrollmentRef.program,
        channel: "WEBHOOK",
        actorUserId: txRecord.userId,
        alreadyLockedProgram: true,
        paymentReferenceOverride: orderId,
        auditAction: "PAYMENT_SETTLED_WEBHOOK",
        auditMetadata: { orderId, grossAmount: txRecord.grossAmount },
        now,
        onQuotaOverflow: "CREATE_TICKET",
        onInactiveAccount: "REQUEST_REFUND",
        webhookTransaction: {
          id: txRecord.id,
          orderId,
          grossAmount: txRecord.grossAmount,
        },
      });
      if (activation.status === "INACTIVE_ACCOUNT_REFUND") {
        return { activated: false, quotaOverflow: false, inactiveAccountRefund: true };
      }
      if (activation.status === "QUOTA_OVERFLOW") {
        return { activated: false, quotaOverflow: true };
      }
      return { activated: activation.status === "ACTIVATED", quotaOverflow: false };
    }

    if (nextTxStatus === "EXPIRE" || nextTxStatus === "CANCEL" || nextTxStatus === "DENY") {
      await tx.programEnrollment.updateMany({
        where: { id: enrollmentId, status: "PENDING", paymentReference: orderId },
        data: { status: nextTxStatus === "EXPIRE" ? "EXPIRED" : "CANCELLED" },
      });
    } else if (nextTxStatus === "REFUND") {
      await revokeEntitlementOnRefundInTx(tx, {
        userId: txRecord.userId,
        enrollmentId,
        reason: "Midtrans gateway refund webhook",
        actorUserId: txRecord.userId,
        auditAction: "PAYMENT_REFUNDED_WEBHOOK",
        auditEntityType: "ProgramEnrollment",
        auditEntityId: enrollmentId,
        auditMetadata: { orderId, grossAmount: txRecord.grossAmount },
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
        body: `Your QRIS payment for "${enrollmentRef.program.title}" is confirmed. Your program is now active.`,
        url: "/dashboard",
        dedupeKey: `payment-active:${enrollmentId}`,
      },
    ]);
  } else if (outcome.quotaOverflow) {
    reportCriticalIncident(
      "payment",
      "midtrans_quota_overflow",
      `QRIS payment settled after cohort quota filled for order ${orderId}`,
      "warning",
      { orderId, programId, enrollmentId }
    );
    await createUserNotifications([
      {
        userId: txRecord.userId,
        type: "PAYMENT",
        title: "Payment settled — cohort quota full",
        body: `Your payment for "${enrollmentRef.program.title}" was received after the last slot filled. An admin support ticket has been opened to process your refund or reassignment.`,
        url: "/dashboard",
        dedupeKey: `payment-overflow:${enrollmentId}`,
      },
    ]);
  } else if ("inactiveAccountRefund" in outcome && outcome.inactiveAccountRefund) {
    reportCriticalIncident(
      "payment",
      "midtrans_settled_inactive_account",
      `Program QRIS settled for deleted/suspended account on order ${orderId}`,
      "warning",
      { orderId, programId, enrollmentId, userId: txRecord.userId }
    );
  }

  return NextResponse.json({ ok: true, ...outcome });
}
