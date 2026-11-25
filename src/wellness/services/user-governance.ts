import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { lockUserRow } from "../db";
import { recordAuditLog } from "../integrations/audit-log";

/**
 * Centralized User Governance Gatekeeper ("Pintu 2").
 *
 * Single source of truth for:
 * - Soft-deleting & anonymizing accounts (self-deletion & admin deletion) with row lock,
 *   sole-Superadmin protection, staff privilege stripping, ACTIVE/PENDING order & enrollment
 *   cancellation, tracking grant revocation, token/share cleanup, and PII-safe audit logs.
 * - Updating account status (ACTIVE / SUSPENDED) with row lock, session revocation,
 *   and token + share revocation on suspension.
 */

export function hashEmailForAudit(email: string | null | undefined): string {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export interface SoftDeleteUserParams {
  targetUserId: string;
  actorUserId: string;
  cancellationReason: string;
  auditAction: "ACCOUNT_SELF_DELETED" | "ADMIN_DELETE_USER";
}

export interface SoftDeletedUserSummary {
  id: string;
  fullName: string;
  email: string;
  avatarPath: string | null;
}

export async function softDeleteAndAnonymizeUserInTx(
  tx: Prisma.TransactionClient,
  params: SoftDeleteUserParams
): Promise<SoftDeletedUserSummary> {
  if (typeof lockUserRow === "function") {
    await lockUserRow(tx, params.targetUserId);
  }

  const txAny = tx as unknown as {
    user: {
      findUnique?: typeof tx.user.findUnique;
      findFirst?: typeof tx.user.findFirst;
      count: typeof tx.user.count;
      update: typeof tx.user.update;
    };
    programEnrollment?: { updateMany?: typeof tx.programEnrollment.updateMany };
    trackingPassOrder?: { updateMany?: typeof tx.trackingPassOrder.updateMany };
    userTrackingGrant?: { updateMany?: typeof tx.userTrackingGrant.updateMany };
    paymentTransaction?: { updateMany?: typeof tx.paymentTransaction.updateMany };
    userIdentity?: { deleteMany?: typeof tx.userIdentity.deleteMany };
    userPushSubscription?: { deleteMany?: typeof tx.userPushSubscription.deleteMany };
    userPasswordResetToken?: { deleteMany?: typeof tx.userPasswordResetToken.deleteMany };
    userEmailVerificationToken?: { deleteMany?: typeof tx.userEmailVerificationToken.deleteMany };
    userProgressShare?: { updateMany?: typeof tx.userProgressShare.updateMany };
  };

  const current =
    typeof txAny.user.findUnique === "function"
      ? await txAny.user.findUnique({
          where: { id: params.targetUserId },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            deletedAt: true,
            avatarPath: true,
          },
        })
      : typeof txAny.user.findFirst === "function"
        ? await txAny.user.findFirst({
            where: { id: params.targetUserId, deletedAt: null },
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              deletedAt: true,
              avatarPath: true,
            },
          })
        : null;

  if (!current || (current.deletedAt !== null && current.deletedAt !== undefined)) {
    throw new Error("User not found.");
  }

  if (current.role === "SUPERADMIN") {
    const superadminCount = await tx.user.count({
      where: { role: "SUPERADMIN", deletedAt: null },
    });
    if (superadminCount <= 1) {
      throw new Error("Cannot delete the sole Superadmin account on the platform.");
    }
  }

  const now = new Date();
  await tx.user.update({
    where: { id: params.targetUserId },
    data: {
      deletedAt: now,
      deletedById: params.actorUserId,
      status: "SUSPENDED",
      role: "USER",
      organizationId: null,
      coachProfileId: null,
      email: `deleted_${params.targetUserId}_${now.getTime()}@deleted.invalid`,
      fullName: "Deleted User",
      phone: null,
      gender: null,
      occupation: null,
      birthDate: null,
      address: null,
      city: null,
      province: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      avatarPath: null,
      passwordHash: null,
      trackingAccessUntil: null,
      tokenVersion: { increment: 1 },
    },
  });

  if (typeof txAny.programEnrollment?.updateMany === "function") {
    await txAny.programEnrollment.updateMany({
      where: { userId: params.targetUserId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "CANCELLED", cancellationReason: params.cancellationReason },
    });
  }

  // Cancel BOTH ACTIVE and PENDING TrackingPassOrder rows so order state matches REVOKED grants
  if (typeof txAny.trackingPassOrder?.updateMany === "function") {
    await txAny.trackingPassOrder.updateMany({
      where: { userId: params.targetUserId, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "CANCELLED", cancellationReason: params.cancellationReason },
    });
  }

  if (typeof txAny.userTrackingGrant?.updateMany === "function") {
    await txAny.userTrackingGrant.updateMany({
      where: { userId: params.targetUserId, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: now, revokeReason: params.cancellationReason },
    });
  }

  if (typeof txAny.paymentTransaction?.updateMany === "function") {
    await txAny.paymentTransaction.updateMany({
      where: { userId: params.targetUserId, status: "PENDING" },
      data: { status: "CANCEL" },
    });
  }

  if (typeof txAny.userIdentity?.deleteMany === "function") {
    await txAny.userIdentity.deleteMany({ where: { userId: params.targetUserId } });
  }
  if (typeof txAny.userPushSubscription?.deleteMany === "function") {
    await txAny.userPushSubscription.deleteMany({ where: { userId: params.targetUserId } });
  }
  if (typeof txAny.userPasswordResetToken?.deleteMany === "function") {
    await txAny.userPasswordResetToken.deleteMany({ where: { userId: params.targetUserId } });
  }
  if (typeof txAny.userEmailVerificationToken?.deleteMany === "function") {
    await txAny.userEmailVerificationToken.deleteMany({ where: { userId: params.targetUserId } });
  }
  if (typeof txAny.userProgressShare?.updateMany === "function") {
    await txAny.userProgressShare.updateMany({
      where: {
        OR: [{ ownerUserId: params.targetUserId }, { viewerUserId: params.targetUserId }],
        status: "ACTIVE",
      },
      data: { status: "REVOKED", revokedAt: now },
    });
  }

  // Privacy-preserving AuditLog: never persist plaintext email PII in immutable logs
  const emailHash = hashEmailForAudit(current.email);
  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: "User",
      entityId: params.targetUserId,
      ...(emailHash ? { metadata: { formerEmailSha256Prefix: emailHash } } : {}),
    },
    tx
  );

  return {
    id: current.id ?? params.targetUserId,
    fullName: current.fullName ?? "",
    email: current.email ?? "",
    avatarPath: current.avatarPath ?? null,
  };
}

export interface UpdateUserStatusParams {
  targetUserId: string;
  newStatus: "ACTIVE" | "SUSPENDED";
  actorUserId: string;
  auditAction: string;
  auditMetadata?: Record<string, unknown>;
}

/**
 * Atomically updates a user's ACTIVE/SUSPENDED status under row lock, bumps tokenVersion,
 * and on SUSPENDED invalidates active OTP/reset tokens and revokes active progress shares.
 */
export async function updateUserStatusInTx(
  tx: Prisma.TransactionClient,
  params: UpdateUserStatusParams
): Promise<{ id: string; email: string; fullName: string; status: string }> {
  if (typeof lockUserRow === "function") {
    await lockUserRow(tx, params.targetUserId);
  }

  const now = new Date();
  const updated = await tx.user.update({
    where: { id: params.targetUserId },
    data: {
      status: params.newStatus,
      tokenVersion: { increment: 1 },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
    },
  });

  if (params.newStatus === "SUSPENDED") {
    const txAny = tx as unknown as {
      userPasswordResetToken?: { updateMany?: typeof tx.userPasswordResetToken.updateMany };
      userEmailVerificationToken?: { updateMany?: typeof tx.userEmailVerificationToken.updateMany };
      userProgressShare?: { updateMany?: typeof tx.userProgressShare.updateMany };
    };
    if (typeof txAny.userPasswordResetToken?.updateMany === "function") {
      await txAny.userPasswordResetToken.updateMany({
        where: { userId: params.targetUserId, isUsed: false },
        data: { isUsed: true },
      });
    }
    if (typeof txAny.userEmailVerificationToken?.updateMany === "function") {
      await txAny.userEmailVerificationToken.updateMany({
        where: { userId: params.targetUserId, usedAt: null },
        data: { usedAt: now },
      });
    }
    if (typeof txAny.userProgressShare?.updateMany === "function") {
      await txAny.userProgressShare.updateMany({
        where: {
          OR: [{ ownerUserId: params.targetUserId }, { viewerUserId: params.targetUserId }],
          status: "ACTIVE",
        },
        data: { status: "REVOKED", revokedAt: now },
      });
    }
  }

  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: "User",
      entityId: params.targetUserId,
      metadata: {
        status: params.newStatus,
        ...(params.auditMetadata || {}),
      },
    },
    tx
  );

  return updated;
}
