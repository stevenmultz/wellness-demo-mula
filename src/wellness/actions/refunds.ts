"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lockProgramRow, prisma } from "../db";
import { requireSuperadmin } from "../security/guards";
import { refundMidtransTransactionAdapter } from "../integrations/payment-gateway";
import { createUserNotifications } from "../integrations/user-notifications";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

export interface UnderQuotaProgramItem {
  id: string;
  title: string;
  price: number;
  minQuota: number;
  maxQuota: number;
  activeSubscribers: number;
  startAt: string;
  registrationDeadlineAt: string;
}

export interface AdminRefundTransactionItem {
  id: string;
  enrollmentId: string;
  orderId: string;
  provider: string;
  grossAmount: number;
  status: string;
  userFullName: string;
  userEmail: string;
  programId: string;
  programTitle: string;
  settledAt: string | null;
  refundAmount: number | null;
  refundFeeAmount: number | null;
  refundReason: string | null;
  refundedAt: string | null;
}

export interface AdminRefundDashboardPayload {
  underQuotaPrograms: UnderQuotaProgramItem[];
  transactions: AdminRefundTransactionItem[];
}

const CancelBatchRefundSchema = z.object({
  programId: z.string().min(1),
  tryMidtransAutoRefund: z.boolean().default(false),
  adminFeeDeduction: z.number().int().min(0).max(5_000_000).default(0),
  reason: z.string().trim().min(3, "Please provide a cancellation reason.").max(300),
});

const RecordManualRefundSchema = z.object({
  transactionId: z.string().min(1),
  refundAmount: z.number().int().min(0).max(100_000_000),
  adminFeeDeduction: z.number().int().min(0).max(5_000_000).default(0),
  note: z.string().trim().min(2, "Please provide a refund note.").max(300),
});

function revalidateRefundRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/");
  } catch {
    // Ignore outside request context
  }
}

export async function wellnessAdminGetRefundDashboardData(): Promise<
  WellnessActionResult<AdminRefundDashboardPayload>
> {
  await requireSuperadmin();

  const [publishedPrograms, txRows] = await Promise.all([
    prisma.program.findMany({
      where: {
        deletedAt: null,
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
        price: true,
        minQuota: true,
        maxQuota: true,
        startAt: true,
        registrationDeadlineAt: true,
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { registrationDeadlineAt: "asc" },
      take: 100,
    }),
    prisma.paymentTransaction.findMany({
      where: {
        grossAmount: { gt: 0 },
        status: { in: ["SETTLEMENT", "MANUAL_APPROVED", "REFUND_REQUESTED", "REFUND"] },
      },
      include: {
        user: { select: { fullName: true, email: true } },
        program: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const underQuotaPrograms: UnderQuotaProgramItem[] = publishedPrograms
    .filter((p) => p._count.enrollments < p.minQuota)
    .map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      minQuota: p.minQuota,
      maxQuota: p.maxQuota,
      activeSubscribers: p._count.enrollments,
      startAt: p.startAt.toISOString(),
      registrationDeadlineAt: p.registrationDeadlineAt.toISOString(),
    }));

  const transactions: AdminRefundTransactionItem[] = txRows.map((tx) => ({
    id: tx.id,
    enrollmentId: tx.enrollmentId,
    orderId: tx.orderId,
    provider: tx.provider,
    grossAmount: tx.grossAmount,
    status: tx.status,
    userFullName: tx.user.fullName,
    userEmail: tx.user.email,
    programId: tx.programId,
    programTitle: tx.program.title,
    settledAt: tx.settledAt ? tx.settledAt.toISOString() : null,
    refundAmount: tx.refundAmount,
    refundFeeAmount: tx.refundFeeAmount,
    refundReason: tx.refundReason,
    refundedAt: tx.refundedAt ? tx.refundedAt.toISOString() : null,
  }));

  return {
    success: true,
    data: { underQuotaPrograms, transactions },
  };
}

/**
 * Cancels an under-quota batch, cancels active enrollments, marks paid transactions as REFUND_REQUESTED,
 * optionally attempts Midtrans Refund API for eligible transactions, and leaves failures as REFUND_REQUESTED
 * so Admin can complete manual refunds safely without losing track.
 */
export async function wellnessAdminCancelBatchAndRefund(
  rawInput: unknown
): Promise<
  WellnessActionResult<{
    cancelledEnrollments: number;
    autoRefundedCount: number;
    manualRefundRequiredCount: number;
  }>
> {
  const admin = await requireSuperadmin();

  const parsed = CancelBatchRefundSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message:
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid batch refund request.",
    };
  }

  const { programId, tryMidtransAutoRefund, adminFeeDeduction, reason } = parsed.data;

  try {
    const prep = await prisma.$transaction(async (tx) => {
      await lockProgramRow(tx, programId);

      const program = await tx.program.findFirst({
        where: { id: programId, deletedAt: null },
        select: { id: true, title: true, status: true, minQuota: true },
      });
      if (!program) {
        throw new Error("Program not found.");
      }
      if (program.status === "ARCHIVED") {
        throw new Error("Program batch is already archived/cancelled.");
      }

      const activeEnrollments = await tx.programEnrollment.findMany({
        where: { programId, status: { in: ["ACTIVE", "PENDING"] } },
        select: { id: true, userId: true, status: true },
      });

      const paidTxs = await tx.paymentTransaction.findMany({
        where: {
          programId,
          grossAmount: { gt: 0 },
          status: { in: ["SETTLEMENT", "MANUAL_APPROVED"] },
        },
        select: {
          id: true,
          userId: true,
          orderId: true,
          provider: true,
          grossAmount: true,
          enrollmentId: true,
        },
      });

      // Cancel enrollments & archive program atomically before external Midtrans API calls
      if (activeEnrollments.length > 0) {
        await tx.programEnrollment.updateMany({
          where: { programId, status: { in: ["ACTIVE", "PENDING"] } },
          data: { status: "CANCELLED", cancellationReason: reason },
        });
      }

      await tx.program.update({
        where: { id: programId },
        data: { status: "ARCHIVED", version: { increment: 1 } },
      });

      for (const ptx of paidTxs) {
        const netRefund = Math.max(0, ptx.grossAmount - adminFeeDeduction);
        await tx.paymentTransaction.update({
          where: { id: ptx.id },
          data: {
            status: "REFUND_REQUESTED",
            refundAmount: netRefund,
            refundFeeAmount: Math.min(ptx.grossAmount, adminFeeDeduction),
            refundReason: reason,
          },
        });
      }

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: "ADMIN_CANCEL_UNDER_QUOTA_BATCH",
          entityType: "Program",
          entityId: programId,
          metadata: {
            reason,
            adminFeeDeduction,
            tryMidtransAutoRefund,
            cancelledCount: activeEnrollments.length,
            paidTxCount: paidTxs.length,
          },
        },
        tx
      );

      return { program, activeEnrollments, paidTxs };
    });

    let autoRefundedCount = 0;
    let manualRefundRequiredCount = 0;

    for (const ptx of prep.paidTxs) {
      const netRefund = Math.max(0, ptx.grossAmount - adminFeeDeduction);
      if (tryMidtransAutoRefund && ptx.provider === "MIDTRANS" && netRefund > 0) {
        const gwRes = await refundMidtransTransactionAdapter({
          orderId: ptx.orderId,
          amountIdr: netRefund,
          reason,
        });
        if (gwRes.success) {
          await prisma.paymentTransaction.update({
            where: { id: ptx.id },
            data: {
              status: "REFUND",
              refundedAt: new Date(),
              refundedById: admin.userId,
            },
          });
          autoRefundedCount++;
        } else {
          await prisma.paymentTransaction.update({
            where: { id: ptx.id },
            data: {
              status: "REFUND_REQUESTED",
              refundReason: `${reason} [Auto-refund fallback: ${gwRes.errorMessage || "Rejected by Midtrans"}]`.slice(
                0,
                300
              ),
            },
          });
          manualRefundRequiredCount++;
        }
      } else {
        manualRefundRequiredCount++;
      }
    }

    const userIds = Array.from(new Set(prep.activeEnrollments.map((e) => e.userId)));
    if (userIds.length > 0) {
      await createUserNotifications(
        userIds.map((userId) => ({
          userId,
          type: "PAYMENT",
          title: `Batch cancelled: ${prep.program.title}`,
          body: `This cohort did not reach the minimum quota (${prep.program.minQuota} participants) and has been cancelled. Refund processing is underway.`,
          url: "/dashboard",
          dedupeKey: `batch-cancel:${prep.program.id}:${userId}`,
        }))
      ).catch(() => null);
    }

    revalidateRefundRoutes();

    return {
      success: true,
      message: `Batch "${prep.program.title}" cancelled (${prep.activeEnrollments.length} enrollments). Auto-refunded: ${autoRefundedCount}, Manual refund queue: ${manualRefundRequiredCount}.`,
      data: {
        cancelledEnrollments: prep.activeEnrollments.length,
        autoRefundedCount,
        manualRefundRequiredCount,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to cancel batch and process refunds.",
    };
  }
}

/**
 * Records a self-processed refund (via Midtrans MAP Dashboard or direct bank transfer,
 * with optional admin fee deduction) and marks the transaction as REFUND.
 */
export async function wellnessAdminRecordManualRefund(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const admin = await requireSuperadmin();

  const parsed = RecordManualRefundSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message:
        Object.values(parsed.error.flatten().fieldErrors).flat()[0] ||
        "Invalid manual refund payload.",
    };
  }

  const { transactionId, refundAmount, adminFeeDeduction, note } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: {
          program: { select: { title: true } },
        },
      });
      if (!existing) {
        throw new Error("Payment transaction not found.");
      }
      if (!["SETTLEMENT", "MANUAL_APPROVED", "REFUND_REQUESTED"].includes(existing.status)) {
        throw new Error(`Cannot refund transaction in status ${existing.status}.`);
      }
      if (refundAmount > existing.grossAmount) {
        throw new Error(
          `Refund amount (Rp ${refundAmount.toLocaleString("id-ID")}) cannot exceed gross amount (Rp ${existing.grossAmount.toLocaleString("id-ID")}).`
        );
      }

      const now = new Date();
      const row = await tx.paymentTransaction.update({
        where: { id: existing.id },
        data: {
          status: "REFUND",
          refundAmount,
          refundFeeAmount: adminFeeDeduction,
          refundReason: note,
          refundedAt: now,
          refundedById: admin.userId,
        },
      });

      await tx.programEnrollment.updateMany({
        where: { id: existing.enrollmentId, status: { in: ["ACTIVE", "PENDING"] } },
        data: { status: "CANCELLED", cancellationReason: note },
      });

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: "ADMIN_RECORD_MANUAL_REFUND",
          entityType: "PaymentTransaction",
          entityId: existing.id,
          metadata: {
            orderId: existing.orderId,
            grossAmount: existing.grossAmount,
            refundAmount,
            adminFeeDeduction,
            note,
          },
        },
        tx
      );

      return { row, programTitle: existing.program.title, userId: existing.userId };
    });

    await createUserNotifications([
      {
        userId: updated.userId,
        type: "PAYMENT",
        title: "Refund recorded",
        body: `Your refund of Rp ${refundAmount.toLocaleString("id-ID")} for "${updated.programTitle}" has been processed.`,
        url: "/dashboard",
        dedupeKey: `refund-done:${updated.row.id}`,
      },
    ]).catch(() => null);

    revalidateRefundRoutes();

    return {
      success: true,
      message: `Refund of Rp ${refundAmount.toLocaleString("id-ID")} recorded for ${updated.row.orderId}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to record refund.",
    };
  }
}
