import type { Prisma } from "@prisma/client";
import { lockProgramRow, lockUserRow } from "../db";
import { recordAuditLog } from "../integrations/audit-log";
import {
  grantProgramBonusTrackingInTx,
  grantStandalonePassInTx,
  revokeTrackingGrantBySourceInTx,
} from "./tracking-entitlement";

/**
 * Centralized Payment & Entitlement Orchestrator ("Pintu 3").
 *
 * Single source of truth for EVERY financial state transition across:
 * - Program enrollment activation (Admin manual approval, Dev simulation, Midtrans webhook)
 * - Standalone Tracking Pass activation (Admin manual approval, Dev simulation, Midtrans webhook)
 * - Payment refund & entitlement revocation (Admin manual refund, Midtrans refund webhook)
 *
 * Enforces canonical lock ordering (`programs` -> `users`) to prevent deadlocks,
 * active-account invariants, quota invariants, tracking grant sync, and AuditLog coverage.
 */

export function computeProgramValidUntilAt(
  program: { locationType: string; endAt: Date | null },
  paidAt: Date
): Date | null {
  if (program.locationType === "ONLINE" || !program.endAt) {
    return null;
  }
  return program.endAt > paidAt
    ? program.endAt
    : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);
}

export type PaymentChannel = "ADMIN_MANUAL" | "SIMULATION" | "WEBHOOK";

export interface ActivateProgramEnrollmentParams {
  enrollmentId: string;
  programId: string;
  userId: string;
  program: {
    id: string;
    title: string;
    maxQuota: number;
    locationType: string;
    startAt: Date | null;
    endAt: Date | null;
    durationDays: number;
    bonusTrackingDays?: number | null;
    price?: number;
  };
  channel: PaymentChannel;
  actorUserId: string;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
  alreadyLockedProgram?: boolean;
  approvedById?: string | null;
  paymentReferenceOverride?: string | null;
  txStatusToSet?: "SETTLEMENT" | "MANUAL_APPROVED";
  now?: Date;
  onQuotaOverflow?: "THROW" | "CREATE_TICKET";
  onInactiveAccount?: "THROW" | "REQUEST_REFUND";
  webhookTransaction?: {
    id: string;
    orderId: string;
    grossAmount: number;
  };
}

export type ActivateProgramEnrollmentResult =
  | { status: "ACTIVATED"; enrollment: unknown }
  | { status: "ALREADY_ACTIVE"; enrollment: unknown }
  | { status: "QUOTA_OVERFLOW" }
  | { status: "INACTIVE_ACCOUNT_REFUND" };

export async function activateProgramEnrollmentInTx(
  tx: Prisma.TransactionClient,
  params: ActivateProgramEnrollmentParams
): Promise<ActivateProgramEnrollmentResult> {
  const paidAt = params.now ?? new Date();

  if (!params.alreadyLockedProgram && typeof lockProgramRow === "function") {
    await lockProgramRow(tx, params.programId);
  }

  const currentEnrollment = await tx.programEnrollment.findUnique({
    where: { id: params.enrollmentId },
    select: {
      status: true,
      paymentReference: true,
      termsAgreedAt: true,
      termsAgreedVersion: true,
      user: { select: { status: true, deletedAt: true } },
    },
  });

  if (!currentEnrollment) {
    if (params.channel === "SIMULATION") {
      throw new Error("This invoice is no longer payable. Please start a new checkout.");
    }
    throw new Error("Enrollment record not found.");
  }

  if (currentEnrollment.status === "ACTIVE" && params.channel !== "WEBHOOK") {
    return { status: "ALREADY_ACTIVE", enrollment: currentEnrollment };
  }

  if (params.channel !== "WEBHOOK" && currentEnrollment.status !== "PENDING") {
    if (params.channel === "ADMIN_MANUAL") {
      throw new Error(
        `Cannot approve enrollment in status ${currentEnrollment.status}. Only PENDING enrollments can be approved.`
      );
    }
    throw new Error("This invoice is no longer payable. Please start a new checkout.");
  }

  // Active account verification (prevents activating entitlements on deleted/suspended accounts)
  let userLookupPerformed = false;
  let targetUser: { status?: string; deletedAt?: Date | null } | null | undefined = undefined;

  if (currentEnrollment.user !== undefined) {
    userLookupPerformed = true;
    targetUser = currentEnrollment.user;
  } else {
    const txUserRepo = (tx as unknown as { user?: { findUnique?: typeof tx.user.findUnique } })
      .user;
    if (typeof txUserRepo?.findUnique === "function") {
      const lookedUp = await txUserRepo.findUnique({
        where: { id: params.userId },
        select: { status: true, deletedAt: true },
      });
      if (lookedUp !== undefined) {
        userLookupPerformed = true;
        targetUser = lookedUp;
      }
    }
  }

  const isAccountInactive =
    userLookupPerformed &&
    (!targetUser ||
      (targetUser.deletedAt !== null && targetUser.deletedAt !== undefined) ||
      (targetUser.status !== undefined && targetUser.status !== "ACTIVE"));

  if (isAccountInactive) {
    if (params.onInactiveAccount === "REQUEST_REFUND" && params.webhookTransaction) {
      await tx.paymentTransaction.update({
        where: { id: params.webhookTransaction.id },
        data: {
          status: "REFUND_REQUESTED",
          refundAmount: params.webhookTransaction.grossAmount,
          refundFeeAmount: 0,
          refundReason: "Payment settled after account was deleted or suspended",
        },
      });
      await recordAuditLog(
        {
          actorUserId: params.userId,
          action: "PAYMENT_SETTLED_INACTIVE_ACCOUNT",
          entityType: "ProgramEnrollment",
          entityId: params.enrollmentId,
          metadata: {
            orderId: params.webhookTransaction.orderId,
            programId: params.programId,
            grossAmount: params.webhookTransaction.grossAmount,
          },
        },
        tx
      );
      return { status: "INACTIVE_ACCOUNT_REFUND" };
    }
    throw new Error("Cannot approve payment for a deleted or suspended user account.");
  }

  // Quota enforcement under Program row lock
  const activeCount = await tx.programEnrollment.count({
    where: {
      programId: params.programId,
      status: "ACTIVE",
    },
  });

  if (currentEnrollment.status !== "ACTIVE" && activeCount >= params.program.maxQuota) {
    if (params.onQuotaOverflow === "CREATE_TICKET" && params.webhookTransaction) {
      const existingOverflowTicket = await tx.cohortSupportRequest.findFirst({
        where: {
          enrollmentId: params.enrollmentId,
          reasonCode: "QUOTA_OVERFLOW_REFUND",
        },
        select: { id: true },
      });
      if (!existingOverflowTicket) {
        await tx.cohortSupportRequest.create({
          data: {
            userId: params.userId,
            programId: params.programId,
            enrollmentId: params.enrollmentId,
            requestType: "REPORT_ISSUE",
            reasonCode: "QUOTA_OVERFLOW_REFUND",
            note: `Automated ticket: QRIS payment settled (Order ${params.webhookTransaction.orderId}, Rp ${params.webhookTransaction.grossAmount.toLocaleString("id-ID")}) after cohort quota filled (${activeCount}/${params.program.maxQuota}). Refund or manual slot resolution required.`,
            status: "OPEN",
          },
        });
      }
      await recordAuditLog(
        {
          actorUserId: params.userId,
          action: "PAYMENT_SETTLED_QUOTA_EXCEEDED",
          entityType: "ProgramEnrollment",
          entityId: params.enrollmentId,
          metadata: {
            orderId: params.webhookTransaction.orderId,
            programId: params.programId,
          },
        },
        tx
      );
      return { status: "QUOTA_OVERFLOW" };
    }

    if (params.channel === "ADMIN_MANUAL") {
      throw new Error(
        `Cannot approve: Cohort "${params.program.title}" has reached its maximum quota of ${params.program.maxQuota} participants.`
      );
    }
    throw new Error("Cohort quota was just filled. Please contact support.");
  }

  const effectivePaymentRef = params.paymentReferenceOverride ?? currentEnrollment.paymentReference;
  const validUntilAt = computeProgramValidUntilAt(params.program, paidAt);

  if (params.txStatusToSet && effectivePaymentRef) {
    await tx.paymentTransaction.updateMany({
      where: { orderId: effectivePaymentRef, status: "PENDING" },
      data: { status: params.txStatusToSet, settledAt: paidAt },
    });
  }

  const saved = await tx.programEnrollment.update({
    where: { id: params.enrollmentId },
    data: {
      status: "ACTIVE",
      ...(params.paymentReferenceOverride ? { paymentReference: params.paymentReferenceOverride } : {}),
      paidAt,
      validUntilAt,
      ...(params.approvedById
        ? { approvedById: params.approvedById, approvedAt: paidAt }
        : {}),
      termsAgreedAt: currentEnrollment.termsAgreedAt ?? paidAt,
      termsAgreedVersion: currentEnrollment.termsAgreedVersion ?? "v1.0",
    },
  });

  await grantProgramBonusTrackingInTx(tx, {
    userId: params.userId,
    enrollmentId: params.enrollmentId,
    program: params.program,
    paidAt,
    grantedById: params.approvedById ?? undefined,
  });

  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: "ProgramEnrollment",
      entityId: params.enrollmentId,
      metadata: {
        ...(params.auditMetadata || {}),
        ...(effectivePaymentRef ? { paymentReference: effectivePaymentRef } : {}),
      },
    },
    tx
  );

  return { status: "ACTIVATED", enrollment: saved };
}

export interface ActivateTrackingPassOrderParams {
  orderId: string;
  userId: string;
  channel: PaymentChannel;
  actorUserId: string;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
  alreadyLockedUser?: boolean;
  approvedById?: string | null;
  paymentReferenceOverride?: string | null;
  txStatusToSet?: "SETTLEMENT" | "MANUAL_APPROVED";
  now?: Date;
  onInactiveAccount?: "THROW" | "REQUEST_REFUND";
  webhookTransaction?: {
    id: string;
    orderId: string;
    grossAmount: number;
  };
  fallbackOrderSnapshot?: {
    durationDaysSnapshot: number;
    termsAgreedAt: Date | null;
    termsAgreedVersion: string | null;
    paymentReference?: string | null;
  };
}

export type ActivateTrackingPassOrderResult =
  | { status: "ACTIVATED"; order: unknown; endsAt: Date | null }
  | { status: "ALREADY_ACTIVE" }
  | { status: "INACTIVE_ACCOUNT_REFUND" };

export async function activateTrackingPassOrderInTx(
  tx: Prisma.TransactionClient,
  params: ActivateTrackingPassOrderParams
): Promise<ActivateTrackingPassOrderResult> {
  const paidAt = params.now ?? new Date();

  if (!params.alreadyLockedUser && typeof lockUserRow === "function") {
    const txWithRaw = tx as unknown as { $queryRaw?: unknown };
    if (typeof txWithRaw.$queryRaw === "function") {
      await lockUserRow(tx, params.userId);
    }
  }

  let currentOrder: {
    status: string;
    paymentReference: string | null;
    durationDaysSnapshot: number;
    termsAgreedAt: Date | null;
    termsAgreedVersion: string | null;
    user?: { status: string; deletedAt: Date | null } | null;
  } | null = null;

  const txOrderRepo = (
    tx as unknown as { trackingPassOrder?: { findUnique?: typeof tx.trackingPassOrder.findUnique } }
  ).trackingPassOrder;

  if (typeof txOrderRepo?.findUnique === "function") {
    currentOrder = await txOrderRepo.findUnique({
      where: { id: params.orderId },
      select: {
        status: true,
        paymentReference: true,
        durationDaysSnapshot: true,
        termsAgreedAt: true,
        termsAgreedVersion: true,
        user: { select: { status: true, deletedAt: true } },
      },
    });
  }

  if (!currentOrder && params.channel === "WEBHOOK" && params.fallbackOrderSnapshot) {
    currentOrder = {
      status: "PENDING",
      paymentReference: params.fallbackOrderSnapshot.paymentReference ?? null,
      durationDaysSnapshot: params.fallbackOrderSnapshot.durationDaysSnapshot,
      termsAgreedAt: params.fallbackOrderSnapshot.termsAgreedAt,
      termsAgreedVersion: params.fallbackOrderSnapshot.termsAgreedVersion,
    };
  }

  if (!currentOrder) {
    throw new Error("Tracking pass order not found.");
  }

  if (currentOrder.status === "ACTIVE" && params.channel !== "WEBHOOK") {
    return { status: "ALREADY_ACTIVE" };
  }

  if (params.channel !== "WEBHOOK" && currentOrder.status !== "PENDING") {
    if (params.channel === "ADMIN_MANUAL") {
      throw new Error(
        `Cannot approve tracking pass order in status ${currentOrder.status}. Only PENDING orders can be approved.`
      );
    }
    throw new Error("This invoice is no longer payable.");
  }

  let userLookupPerformed = false;
  let targetUser: { status?: string; deletedAt?: Date | null } | null | undefined = undefined;
  if (currentOrder.user !== undefined) {
    userLookupPerformed = true;
    targetUser = currentOrder.user;
  } else {
    const txUserRepo = (tx as unknown as { user?: { findUnique?: typeof tx.user.findUnique } })
      .user;
    if (typeof txUserRepo?.findUnique === "function") {
      const lookedUp = await txUserRepo.findUnique({
        where: { id: params.userId },
        select: { status: true, deletedAt: true },
      });
      if (lookedUp !== undefined) {
        userLookupPerformed = true;
        targetUser = lookedUp;
      }
    }
  }

  const isAccountInactive =
    userLookupPerformed &&
    (!targetUser ||
      (targetUser.deletedAt !== null && targetUser.deletedAt !== undefined) ||
      (targetUser.status !== undefined && targetUser.status !== "ACTIVE"));

  if (isAccountInactive) {
    if (params.onInactiveAccount === "REQUEST_REFUND" && params.webhookTransaction) {
      await tx.paymentTransaction.update({
        where: { id: params.webhookTransaction.id },
        data: {
          status: "REFUND_REQUESTED",
          refundAmount: params.webhookTransaction.grossAmount,
          refundFeeAmount: 0,
          refundReason: "Payment settled after account was deleted or suspended",
        },
      });
      await recordAuditLog(
        {
          actorUserId: params.userId,
          action: "PAYMENT_SETTLED_INACTIVE_ACCOUNT",
          entityType: "TrackingPassOrder",
          entityId: params.orderId,
          metadata: {
            orderId: params.webhookTransaction.orderId,
            grossAmount: params.webhookTransaction.grossAmount,
          },
        },
        tx
      );
      return { status: "INACTIVE_ACCOUNT_REFUND" };
    }
    throw new Error("Cannot approve payment for a deleted or suspended account.");
  }

  const effectivePaymentRef = params.paymentReferenceOverride ?? currentOrder.paymentReference;
  if (params.txStatusToSet && effectivePaymentRef) {
    await tx.paymentTransaction.updateMany({
      where: { orderId: effectivePaymentRef, status: "PENDING" },
      data: { status: params.txStatusToSet, settledAt: paidAt },
    });
  }

  const updatedOrder = await tx.trackingPassOrder.update({
    where: { id: params.orderId },
    data: {
      status: "ACTIVE",
      ...(params.paymentReferenceOverride ? { paymentReference: params.paymentReferenceOverride } : {}),
      paidAt,
      ...(params.approvedById
        ? { approvedById: params.approvedById, approvedAt: paidAt }
        : {}),
      termsAgreedAt: currentOrder.termsAgreedAt ?? paidAt,
      termsAgreedVersion: currentOrder.termsAgreedVersion ?? "v1.0",
    },
  });

  const grant = await grantStandalonePassInTx(tx, {
    userId: params.userId,
    trackingPassOrderId: params.orderId,
    durationDays: currentOrder.durationDaysSnapshot,
    now: paidAt,
    grantedById: params.approvedById ?? undefined,
  });

  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: "TrackingPassOrder",
      entityId: params.orderId,
      metadata: {
        ...(params.auditMetadata || {}),
        ...(effectivePaymentRef ? { orderId: effectivePaymentRef } : {}),
        durationDays: currentOrder.durationDaysSnapshot,
        endsAt: grant.endsAt?.toISOString() ?? null,
      },
    },
    tx
  );

  return { status: "ACTIVATED", order: updatedOrder, endsAt: grant.endsAt ?? null };
}

export interface RevokeOrderOnRefundParams {
  userId: string;
  enrollmentId?: string | null;
  trackingPassOrderId?: string | null;
  reason: string;
  actorUserId: string;
  auditAction: string;
  auditEntityType: "PaymentTransaction" | "ProgramEnrollment" | "TrackingPassOrder";
  auditEntityId: string;
  auditMetadata?: Record<string, unknown>;
}

/**
 * Single canonical post-refund entitlement revocation helper:
 * cancels ProgramEnrollment or marks TrackingPassOrder REFUNDED, revokes & restacks
 * tracking grants via `revokeTrackingGrantBySourceInTx`, and writes an immutable AuditLog.
 */
export async function revokeEntitlementOnRefundInTx(
  tx: Prisma.TransactionClient,
  params: RevokeOrderOnRefundParams
): Promise<void> {
  if (params.enrollmentId) {
    await tx.programEnrollment.updateMany({
      where: { id: params.enrollmentId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "CANCELLED", cancellationReason: params.reason },
    });
    await revokeTrackingGrantBySourceInTx(tx, {
      userId: params.userId,
      programEnrollmentId: params.enrollmentId,
      reason: params.reason,
    });
  } else if (params.trackingPassOrderId) {
    await tx.trackingPassOrder.updateMany({
      where: { id: params.trackingPassOrderId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "REFUNDED", cancellationReason: params.reason },
    });
    await revokeTrackingGrantBySourceInTx(tx, {
      userId: params.userId,
      trackingPassOrderId: params.trackingPassOrderId,
      reason: params.reason,
    });
  }

  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: params.auditEntityType,
      entityId: params.auditEntityId,
      metadata: params.auditMetadata as Prisma.InputJsonValue | undefined,
    },
    tx
  );
}
