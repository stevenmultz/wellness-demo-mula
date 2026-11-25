"use server";

import { revalidatePath } from "next/cache";
import { lockUserRow, prisma } from "../db";
import { requireAuth, requireSuperadmin } from "../security/guards";
import { checkDistributedRateLimit } from "../security/rate-limit";
import {
  getPaymentProvider,
  isPaymentSimulationAllowed,
  QRIS_INVOICE_TTL_MS,
  RATE_LIMITS,
} from "../config";
import {
  createQrisInvoiceAdapter,
  generateQrisOrderId,
} from "../integrations/payment-gateway";
import { createUserNotifications } from "../integrations/user-notifications";
import { recordAuditLog } from "../integrations/audit-log";
import { reportServerError } from "../observability";
import {
  AdminCompTrackingGrantSchema,
  UpsertTrackingPassPlanSchema,
} from "../validators/daily-log";
import {
  grantAdminCompTrackingInTx,
  grantStandalonePassInTx,
} from "../services/tracking-entitlement";
import { activateTrackingPassOrderInTx } from "../services/payment-orchestrator";
import type { WellnessActionResult } from "./auth";

export interface TrackingPassPlanDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  durationDays: number;
  actualPrice: number;
  discountPercentage: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
  customTerms: string | null;
}

export interface TrackingPassCheckoutDTO {
  id: string;
  itemType: "TRACKING_PASS";
  planId: string;
  planName: string;
  durationDays: number;
  price: number;
  status: string;
  paymentReference: string | null;
  invoiceExpiresAt: Date | null;
  qrStringOrUrl?: string | null;
}

function safeRevalidate() {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore outside request context
  }
}

export async function wellnessGetTrackingPassPlans(
  includeInactive = false
): Promise<WellnessActionResult<TrackingPassPlanDTO[]>> {
  if (includeInactive) {
    await requireSuperadmin();
  } else {
    await requireAuth();
  }

  const rows = await prisma.trackingPassPlan.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      durationDays: r.durationDays,
      actualPrice: r.actualPrice,
      discountPercentage: r.discountPercentage,
      price: r.price,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      customTerms: r.customTerms,
    })),
  };
}

/**
 * Member: Initiates QRIS checkout for a Standalone Tracking Pass (e.g. Rp 500.000 / 6 Months).
 * Reuses active non-expired PENDING invoice if identical plan/price to avoid orphaned invoices.
 */
export async function wellnessCreateTrackingPassCheckout(
  planId: string
): Promise<WellnessActionResult<TrackingPassCheckoutDTO>> {
  const session = await requireAuth();

  const rl = await checkDistributedRateLimit(`pass-checkout:${session.userId}`, RATE_LIMITS.checkout);
  if (!rl.allowed) {
    return {
      success: false,
      message: "Too many checkout attempts. Please wait a moment and try again.",
    };
  }

  try {
    const provider = getPaymentProvider();

    const { order, paymentTx, reusedValidInvoice, lockedPlan } = await prisma.$transaction(
      async (tx) => {
        await lockUserRow(tx, session.userId);
        const txNow = new Date();

        const activeUser = await tx.user.findUnique({
          where: { id: session.userId },
          select: { status: true, deletedAt: true },
        });
        if (!activeUser || activeUser.deletedAt !== null || activeUser.status !== "ACTIVE") {
          throw new Error("Your account is not eligible to purchase a tracking pass.");
        }

        const freshPlan = await tx.trackingPassPlan.findFirst({
          where: { id: planId, isActive: true },
        });
        if (!freshPlan) {
          throw new Error("Tracking pass plan is not available.");
        }

        const existingPending = await tx.trackingPassOrder.findFirst({
          where: {
            userId: session.userId,
            planId: freshPlan.id,
            status: "PENDING",
            invoiceExpiresAt: { gt: txNow },
          },
          include: {
            transactions: {
              where: { status: "PENDING", expiresAt: { gt: txNow } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const activeTx = existingPending?.transactions[0] ?? null;
        if (
          existingPending &&
          activeTx &&
          activeTx.grossAmount === freshPlan.price &&
          existingPending.durationDaysSnapshot === freshPlan.durationDays &&
          (provider !== "MIDTRANS" || Boolean(activeTx.qrisStringOrUrl))
        ) {
          return {
            order: existingPending,
            paymentTx: activeTx,
            reusedValidInvoice: true,
            lockedPlan: freshPlan,
          };
        }

        // Supersede any stale/mismatched PENDING orders & transactions for this user + plan
        const staleOrders = await tx.trackingPassOrder.findMany({
          where: { userId: session.userId, planId: freshPlan.id, status: "PENDING" },
          select: { id: true },
        });
        if (staleOrders.length > 0) {
          const staleIds = staleOrders.map((o) => o.id);
          await tx.trackingPassOrder.updateMany({
            where: { id: { in: staleIds }, status: "PENDING" },
            data: { status: "EXPIRED" },
          });
          await tx.paymentTransaction.updateMany({
            where: { trackingPassOrderId: { in: staleIds }, status: "PENDING" },
            data: { status: "EXPIRE" },
          });
        }

        // Free pass edge case (price === 0): allow max 1 claim per plan per user to prevent infinite stacking
        if (freshPlan.price <= 0) {
          const alreadyClaimed = await tx.trackingPassOrder.findFirst({
            where: {
              userId: session.userId,
              planId: freshPlan.id,
              status: "ACTIVE",
            },
            select: { id: true },
          });
          if (alreadyClaimed) {
            throw new Error("You have already claimed this complimentary tracking pass.");
          }

          const freeRef = `PASS-FREE-${Date.now()}`;
          const createdOrder = await tx.trackingPassOrder.create({
            data: {
              userId: session.userId,
              planId: freshPlan.id,
              status: "ACTIVE",
              paymentReference: freeRef,
              paidAt: txNow,
              durationDaysSnapshot: freshPlan.durationDays,
              priceSnapshot: 0,
              termsAgreedAt: txNow,
              termsAgreedVersion: "v1.0",
            },
          });
          const createdTx = await tx.paymentTransaction.create({
            data: {
              itemType: "TRACKING_PASS",
              trackingPassOrderId: createdOrder.id,
              userId: session.userId,
              orderId: freeRef,
              provider: "FREE",
              paymentType: "free",
              grossAmount: 0,
              status: "SETTLEMENT",
              settledAt: txNow,
              createdById: session.userId,
            },
          });
          await grantStandalonePassInTx(tx, {
            userId: session.userId,
            trackingPassOrderId: createdOrder.id,
            durationDays: freshPlan.durationDays,
            now: txNow,
          });
          return {
            order: createdOrder,
            paymentTx: createdTx,
            reusedValidInvoice: true,
            lockedPlan: freshPlan,
          };
        }

        const newOrderId = generateQrisOrderId();
        const provisionalExpiresAt = new Date(txNow.getTime() + QRIS_INVOICE_TTL_MS);

        const createdOrder = await tx.trackingPassOrder.create({
          data: {
            userId: session.userId,
            planId: freshPlan.id,
            status: "PENDING",
            paymentReference: newOrderId,
            invoiceExpiresAt: provisionalExpiresAt,
            durationDaysSnapshot: freshPlan.durationDays,
            priceSnapshot: freshPlan.price,
          },
        });

        const createdTx = await tx.paymentTransaction.create({
          data: {
            itemType: "TRACKING_PASS",
            trackingPassOrderId: createdOrder.id,
            userId: session.userId,
            orderId: newOrderId,
            provider,
            paymentType: "qris",
            grossAmount: freshPlan.price,
            status: "PENDING",
            expiresAt: provisionalExpiresAt,
            createdById: session.userId,
          },
        });

        return {
          order: createdOrder,
          paymentTx: createdTx,
          reusedValidInvoice: false,
          lockedPlan: freshPlan,
        };
      }
    );

    let finalExpiresAt = paymentTx.expiresAt ?? order.invoiceExpiresAt;
    let qrStringOrUrl = paymentTx.qrisStringOrUrl;

    if (!reusedValidInvoice) {
      try {
        const gatewayInvoice = await createQrisInvoiceAdapter({
          orderId: paymentTx.orderId,
          enrollmentId: order.id,
          userId: session.userId,
          userEmail: session.email,
          userName: session.fullName,
          programTitle: lockedPlan.name,
          amountIdr: lockedPlan.price,
        });

        finalExpiresAt = gatewayInvoice.invoiceExpiresAt;
        qrStringOrUrl = gatewayInvoice.qrStringOrUrl ?? null;

        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: {
              gatewayTransactionId: gatewayInvoice.gatewayTransactionId ?? null,
              qrisStringOrUrl: qrStringOrUrl,
              expiresAt: finalExpiresAt,
            },
          }),
          prisma.trackingPassOrder.update({
            where: { id: order.id },
            data: { invoiceExpiresAt: finalExpiresAt },
          }),
        ]);
      } catch (gwErr) {
        reportServerError("payment", "tracking_pass_qris_rollback", gwErr, {
          orderId: paymentTx.orderId,
          trackingPassOrderId: order.id,
        });
        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: { status: "CANCEL" },
          }),
          prisma.trackingPassOrder.updateMany({
            where: { id: order.id, status: "PENDING" },
            data: { status: "CANCELLED" },
          }),
        ]);
        throw gwErr;
      }
    }

    safeRevalidate();
    return {
      success: true,
      message: reusedValidInvoice
        ? order.status === "ACTIVE"
          ? `${lockedPlan.name} unlocked!`
          : "QRIS checkout invoice ready."
        : `QRIS invoice generated for ${lockedPlan.name}. Valid for 15 minutes.`,
      data: {
        id: order.id,
        itemType: "TRACKING_PASS",
        planId: lockedPlan.id,
        planName: lockedPlan.name,
        durationDays: order.durationDaysSnapshot,
        price: order.priceSnapshot,
        status: order.status,
        paymentReference: paymentTx.orderId,
        invoiceExpiresAt: finalExpiresAt,
        qrStringOrUrl,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to initiate Tracking Pass checkout.",
    };
  }
}

/**
 * Dev/Staging Payment Simulation Confirmation for Standalone Tracking Pass.
 * Blocked in production (where Midtrans webhook or Admin approval settles payments).
 */
export async function wellnessConfirmTrackingPassQrisPayment(
  orderId: string,
  termsAgreed = true
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const rl = await checkDistributedRateLimit(`pass-confirm:${session.userId}`, RATE_LIMITS.checkout);
  if (!rl.allowed) {
    return {
      success: false,
      message: "Too many payment verification attempts. Please wait a moment.",
    };
  }

  if (!termsAgreed) {
    return { success: false, message: "Please agree to the Terms & Conditions before paying." };
  }

  const order = await prisma.trackingPassOrder.findUnique({
    where: { id: orderId },
    include: { plan: true },
  });

  if (!order || order.userId !== session.userId) {
    return { success: false, message: "Tracking pass order not found." };
  }
  if (order.status === "ACTIVE") {
    return { success: true, message: "Tracking pass is already active." };
  }
  if (order.status !== "PENDING") {
    return { success: false, message: "This invoice is no longer payable. Please retry checkout." };
  }

  if (!isPaymentSimulationAllowed()) {
    return {
      success: false,
      message:
        "Direct client confirmation is disabled in production. Payments are verified automatically via Midtrans webhook or Admin manual approval.",
    };
  }

  if (order.invoiceExpiresAt && new Date() > new Date(order.invoiceExpiresAt)) {
    await prisma.$transaction([
      prisma.trackingPassOrder.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      }),
      prisma.paymentTransaction.updateMany({
        where: { trackingPassOrderId: order.id, status: "PENDING" },
        data: { status: "EXPIRE" },
      }),
    ]);
    return {
      success: false,
      message: "QRIS invoice has expired. Please start a new checkout.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const outcome = await activateTrackingPassOrderInTx(tx, {
        orderId: order.id,
        userId: session.userId,
        channel: "SIMULATION",
        actorUserId: session.userId,
        txStatusToSet: "SETTLEMENT",
        auditAction: "TRACKING_PASS_SIMULATION_CONFIRMED",
        onInactiveAccount: "THROW",
      });
      if (outcome.status !== "ACTIVATED") {
        return { updatedOrder: order, endsAt: null };
      }
      return { updatedOrder: outcome.order, endsAt: outcome.endsAt };
    });

    await createUserNotifications([
      {
        userId: session.userId,
        type: "PAYMENT",
        title: "Tracking Pass active",
        body: `Your "${order.plan.name}" (${order.durationDaysSnapshot} days) is now active.`,
        url: "/dashboard",
        dedupeKey: `pass-active:${order.id}`,
      },
    ]);

    safeRevalidate();
    return {
      success: true,
      message: `${order.plan.name} unlocked!`,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to verify tracking pass payment.",
    };
  }
}

/**
 * Superadmin: Create or update a TrackingPassPlan catalog item.
 */
export async function wellnessAdminUpsertTrackingPassPlan(
  rawInput: unknown
): Promise<WellnessActionResult<TrackingPassPlanDTO>> {
  const admin = await requireSuperadmin();
  const parsed = UpsertTrackingPassPlanSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid Tracking Pass plan payload.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const row = data.id
        ? await tx.trackingPassPlan.update({
            where: { id: data.id },
            data: {
              slug: data.slug,
              name: data.name,
              description: data.description ?? null,
              durationDays: data.durationDays,
              actualPrice: data.actualPrice,
              discountPercentage: data.discountPercentage,
              price: data.price,
              isActive: data.isActive,
              sortOrder: data.sortOrder,
              customTerms: data.customTerms ?? null,
            },
          })
        : await tx.trackingPassPlan.create({
            data: {
              slug: data.slug,
              name: data.name,
              description: data.description ?? null,
              durationDays: data.durationDays,
              actualPrice: data.actualPrice,
              discountPercentage: data.discountPercentage,
              price: data.price,
              isActive: data.isActive,
              sortOrder: data.sortOrder,
              customTerms: data.customTerms ?? null,
            },
          });

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: data.id ? "ADMIN_UPDATE_TRACKING_PASS_PLAN" : "ADMIN_CREATE_TRACKING_PASS_PLAN",
          entityType: "TrackingPassPlan",
          entityId: row.id,
          metadata: { slug: row.slug, durationDays: row.durationDays, price: row.price },
        },
        tx
      );
      return row;
    });

    safeRevalidate();
    return {
      success: true,
      message: `Tracking Pass plan "${saved.name}" saved.`,
      data: {
        id: saved.id,
        slug: saved.slug,
        name: saved.name,
        description: saved.description,
        durationDays: saved.durationDays,
        actualPrice: saved.actualPrice,
        discountPercentage: saved.discountPercentage,
        price: saved.price,
        isActive: saved.isActive,
        sortOrder: saved.sortOrder,
        customTerms: saved.customTerms,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save Tracking Pass plan.",
    };
  }
}

/**
 * Superadmin: List PENDING TrackingPassOrder rows awaiting manual verification.
 */
export async function wellnessAdminGetPendingTrackingPassOrders(): Promise<
  WellnessActionResult<
    Array<{
      id: string;
      userId: string;
      userFullName: string;
      userEmail: string;
      planName: string;
      durationDays: number;
      price: number;
      paymentReference: string | null;
      createdAt: string;
    }>
  >
> {
  await requireSuperadmin();
  const rows = await prisma.trackingPassOrder.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { fullName: true, email: true } },
      plan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userFullName: r.user.fullName,
      userEmail: r.user.email,
      planName: r.plan.name,
      durationDays: r.durationDaysSnapshot,
      price: r.priceSnapshot,
      paymentReference: r.paymentReference,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Superadmin: Manually approve a PENDING TrackingPassOrder.
 */
export async function wellnessAdminApproveTrackingPassOrder(
  orderId: string
): Promise<WellnessActionResult> {
  const admin = await requireSuperadmin();

  const order = await prisma.trackingPassOrder.findUnique({
    where: { id: orderId },
    include: { plan: true, user: { select: { fullName: true } } },
  });
  if (!order) {
    return { success: false, message: "Tracking pass order not found." };
  }
  if (order.status === "ACTIVE") {
    return { success: true, message: "Tracking pass order is already active." };
  }

  try {
    const outcome = await prisma.$transaction((tx) =>
      activateTrackingPassOrderInTx(tx, {
        orderId: order.id,
        userId: order.userId,
        channel: "ADMIN_MANUAL",
        actorUserId: admin.userId,
        approvedById: admin.userId,
        txStatusToSet: "MANUAL_APPROVED",
        auditAction: "ADMIN_MANUAL_APPROVE_TRACKING_PASS",
        auditMetadata: { targetUserId: order.userId },
        onInactiveAccount: "THROW",
      })
    );

    if (outcome.status === "ALREADY_ACTIVE") {
      return { success: true, message: "Tracking pass order is already active." };
    }

    await createUserNotifications([
      {
        userId: order.userId,
        type: "PAYMENT",
        title: "Tracking Pass confirmed",
        body: `Your "${order.plan.name}" (${order.durationDaysSnapshot} days) has been activated.`,
        url: "/dashboard",
        dedupeKey: `pass-active:${order.id}`,
      },
    ]);

    safeRevalidate();
    return {
      success: true,
      message: `Approved "${order.plan.name}" for ${order.user.fullName}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to approve tracking pass order.",
    };
  }
}

/**
 * Superadmin: Grant complimentary tracking days (`ADMIN_COMP`) to a member.
 */
export async function wellnessAdminGrantCompTrackingDays(
  rawInput: unknown
): Promise<WellnessActionResult<{ grantId: string; endsAt: string }>> {
  const admin = await requireSuperadmin();
  const parsed = AdminCompTrackingGrantSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message || "Invalid comp grant payload.",
    };
  }

  const { targetUserId, durationDays, reason } = parsed.data;
  const userExists = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, fullName: true },
  });
  if (!userExists) {
    return { success: false, message: "Target user not found." };
  }

  const res = await prisma.$transaction((tx) =>
    grantAdminCompTrackingInTx(tx, {
      userId: targetUserId,
      durationDays,
      reason,
      adminUserId: admin.userId,
    })
  );

  await createUserNotifications([
    {
      userId: targetUserId,
      type: "INFO",
      title: "Bonus tracking access granted",
      body: `You received +${durationDays} days of Zera tracking access.`,
      url: "/dashboard",
      dedupeKey: `comp-grant:${res.grantId}`,
    },
  ]);

  safeRevalidate();
  return {
    success: true,
    message: `Granted +${durationDays} tracking days to ${userExists.fullName}.`,
    data: { grantId: res.grantId, endsAt: res.endsAt.toISOString() },
  };
}
