"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma, lockProgramRow } from "../db";
import { requireSuperadmin } from "../security/guards";
import { hashPassword } from "../security/password";
import { createUserNotifications } from "../integrations/user-notifications";
import { deleteStorageObjects } from "../integrations/supabase-storage";
import { recordAuditLog } from "../integrations/audit-log";
import { AdminUpdateCustomerProfileSchema, calculateAgeFromDob } from "../validators/auth";
import { cleanupUserUploadedFiles } from "../utils/image-processor";
import type { WellnessActionResult } from "./auth";

function revalidateAdminRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
  } catch {
    // Ignore outside request context
  }
}

export async function wellnessAdminGetUsers(searchQuery?: string, limit = 100, offset = 0) {
  await requireSuperadmin();

  const whereClause = {
    deletedAt: null,
    ...(searchQuery
      ? {
          OR: [
            { email: { contains: searchQuery, mode: "insensitive" as const } },
            { fullName: { contains: searchQuery, mode: "insensitive" as const } },
            { phone: { contains: searchQuery } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where: whereClause,
    take: Math.min(500, Math.max(1, limit)),
    skip: Math.max(0, offset),
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      birthDate: true,
      avatarPath: true,
      role: true,
      status: true,
      createdAt: true,
      enrollments: {
        select: {
          id: true,
          status: true,
          paymentReference: true,
          paidAt: true,
          validUntilAt: true,
          program: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    ...u,
    age: u.birthDate ? calculateAgeFromDob(u.birthDate) : null,
    enrollments: u.enrollments.map((e) => ({
      ...e,
      validUntil: e.validUntilAt,
    })),
  }));
}

export async function wellnessAdminUpdateUserRole(
  targetUserId: string,
  newRole: "USER" | "COACH" | "PARTNER_ADMIN" | "SUPERADMIN",
  scope?: { organizationId?: string | null; coachProfileId?: string | null }
): Promise<WellnessActionResult> {
  const currentAdmin = await requireSuperadmin();

  if (targetUserId === currentAdmin.userId && newRole !== "SUPERADMIN") {
    return {
      success: false,
      message: "You cannot demote your own Superadmin role.",
    };
  }

  if (newRole === "SUPERADMIN") {
    return {
      success: false,
      message: "Only one Superadmin is permitted in the system. Users cannot be promoted to Superadmin.",
    };
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
      });
      if (!targetUser) {
        throw new Error("User not found.");
      }

      if (targetUser.role === "SUPERADMIN") {
        const superadminCount = await tx.user.count({
          where: { role: "SUPERADMIN", deletedAt: null },
        });
        if (superadminCount <= 1) {
          throw new Error("Cannot demote the last remaining Superadmin on the platform.");
        }
      }

      const nextOrgId =
        newRole === "PARTNER_ADMIN"
          ? scope?.organizationId ?? targetUser.organizationId
          : newRole === "USER"
            ? null
            : targetUser.organizationId;

      const nextCoachId =
        newRole === "COACH"
          ? scope?.coachProfileId ?? targetUser.coachProfileId
          : newRole === "USER"
            ? null
            : targetUser.coachProfileId;

      if (nextOrgId) {
        const orgExists = await tx.masterOrganization.findUnique({
          where: { id: nextOrgId },
          select: { id: true },
        });
        if (!orgExists) {
          throw new Error("Selected organization does not exist.");
        }
      }

      if (nextCoachId) {
        const coachExists = await tx.masterCoach.findUnique({
          where: { id: nextCoachId },
          select: { id: true },
        });
        if (!coachExists) {
          throw new Error("Selected coach profile does not exist.");
        }
      }

      const updated = await tx.user.update({
        where: { id: targetUserId },
        data: {
          role: newRole,
          organizationId: nextOrgId,
          coachProfileId: nextCoachId,
          tokenVersion: { increment: 1 },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          organizationId: true,
          coachProfileId: true,
        },
      });

      await recordAuditLog(
        {
          actorUserId: currentAdmin.userId,
          action: "ADMIN_UPDATE_USER_ROLE",
          entityType: "User",
          entityId: targetUserId,
          metadata: { fromRole: targetUser.role, toRole: newRole, nextOrgId, nextCoachId },
        },
        tx
      );

      return updated;
    });

    revalidateAdminRoutes();
    return {
      success: true,
      message: `Role for ${updatedUser.fullName} updated to ${newRole}.`,
      data: updatedUser,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update user role.",
    };
  }
}

export async function wellnessAdminUpdateUserStatus(
  targetUserId: string,
  newStatus: "ACTIVE" | "SUSPENDED"
): Promise<WellnessActionResult> {
  const currentAdmin = await requireSuperadmin();

  if (targetUserId === currentAdmin.userId && newStatus === "SUSPENDED") {
    return {
      success: false,
      message: "You cannot suspend your own Superadmin account.",
    };
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true },
  });
  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const row = await tx.user.update({
      where: { id: targetUserId },
      data: {
        status: newStatus,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, email: true, fullName: true, status: true },
    });

    await recordAuditLog(
      {
        actorUserId: currentAdmin.userId,
        action: "ADMIN_UPDATE_USER_STATUS",
        entityType: "User",
        entityId: targetUserId,
        metadata: { status: newStatus },
      },
      tx
    );

    return row;
  });

  revalidateAdminRoutes();
  return {
    success: true,
    message: `Account status for ${updatedUser.fullName} updated to ${newStatus}.`,
    data: updatedUser,
  };
}

export async function wellnessAdminApprovePayment(
  enrollmentId: string
): Promise<WellnessActionResult> {
  const currentAdmin = await requireSuperadmin();

  const enrollment = await prisma.programEnrollment.findUnique({
    where: { id: enrollmentId },
    include: { program: true, user: true },
  });

  if (!enrollment) {
    return { success: false, message: "Enrollment record not found." };
  }

  if (enrollment.status === "ACTIVE") {
    return { success: true, message: "Enrollment is already active.", data: enrollment };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await lockProgramRow(tx, enrollment.programId);

      const activeCount = await tx.programEnrollment.count({
        where: {
          programId: enrollment.programId,
          status: "ACTIVE",
        },
      });

      if (activeCount >= enrollment.program.maxQuota) {
        throw new Error(
          `Cannot approve: Cohort "${enrollment.program.title}" has reached its maximum quota of ${enrollment.program.maxQuota} participants.`
        );
      }

      const paidAt = new Date();
      const validUntilAt =
        enrollment.program.endAt > paidAt
          ? enrollment.program.endAt
          : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

      if (enrollment.paymentReference) {
        await tx.paymentTransaction.updateMany({
          where: { orderId: enrollment.paymentReference, status: "PENDING" },
          data: { status: "MANUAL_APPROVED", settledAt: paidAt },
        });
      }

      const saved = await tx.programEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "ACTIVE",
          paidAt,
          validUntilAt,
          approvedById: currentAdmin.userId,
          approvedAt: paidAt,
          termsAgreedAt: enrollment.termsAgreedAt ?? paidAt,
          termsAgreedVersion: enrollment.termsAgreedVersion ?? "v1.0",
        },
      });

      await recordAuditLog(
        {
          actorUserId: currentAdmin.userId,
          action: "ADMIN_MANUAL_APPROVE_PAYMENT",
          entityType: "ProgramEnrollment",
          entityId: enrollmentId,
          metadata: {
            programId: enrollment.programId,
            targetUserId: enrollment.userId,
            paymentReference: enrollment.paymentReference,
          },
        },
        tx
      );

      return saved;
    });

    await createUserNotifications([
      {
        userId: enrollment.userId,
        type: "PAYMENT",
        title: "Payment confirmed",
        body: `Your payment for "${enrollment.program.title}" is confirmed. Your plan is now active.`,
        url: "/dashboard",
        dedupeKey: `payment-active:${enrollment.id}`,
      },
    ]);

    revalidateAdminRoutes();
    return {
      success: true,
      message: `Payment for "${enrollment.program.title}" (${enrollment.user.fullName}) approved (Status: ACTIVE).`,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve payment.",
    };
  }
}

/**
 * Superadmin: Soft-Delete & Anonymize User Account (preserves immutable financial records).
 */
export async function wellnessAdminDeleteUser(
  targetUserId: string
): Promise<WellnessActionResult> {
  const currentAdmin = await requireSuperadmin();

  if (targetUserId === currentAdmin.userId) {
    return {
      success: false,
      message: "You cannot delete your own account from the Admin Console.",
    };
  }

  try {
    const deletedTarget = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true, fullName: true, email: true, role: true, avatarPath: true },
      });

      if (!targetUser) {
        throw new Error("User not found.");
      }

      if (targetUser.role === "SUPERADMIN") {
        const superadminCount = await tx.user.count({
          where: { role: "SUPERADMIN", deletedAt: null },
        });
        if (superadminCount <= 1) {
          throw new Error("Cannot delete the last remaining Superadmin on the platform.");
        }
      }

      const now = new Date();
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          deletedAt: now,
          deletedById: currentAdmin.userId,
          status: "SUSPENDED",
          email: `deleted_${targetUserId}_${now.getTime()}@deleted.invalid`,
          fullName: "Deleted User",
          phone: null,
          address: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          avatarPath: null,
          passwordHash: null,
          tokenVersion: { increment: 1 },
        },
      });
      await tx.userIdentity.deleteMany({ where: { userId: targetUserId } });
      await tx.userPushSubscription.deleteMany({ where: { userId: targetUserId } });
      await tx.userPasswordResetToken.deleteMany({ where: { userId: targetUserId } });
      await tx.userEmailVerificationToken.deleteMany({ where: { userId: targetUserId } });

      await recordAuditLog(
        {
          actorUserId: currentAdmin.userId,
          action: "ADMIN_DELETE_USER",
          entityType: "User",
          entityId: targetUserId,
          metadata: { formerEmail: targetUser.email },
        },
        tx
      );

      return targetUser;
    });

    await deleteStorageObjects([deletedTarget.avatarPath]);
    await cleanupUserUploadedFiles(targetUserId);
    revalidateAdminRoutes();
    return {
      success: true,
      message: `Account ${deletedTarget.fullName} (${deletedTarget.email}) has been deleted.`,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete user account.",
    };
  }
}

export async function wellnessAdminResetUserPassword(
  targetUserId: string
): Promise<WellnessActionResult<{ temporaryPassword: string }>> {
  const currentAdmin = await requireSuperadmin();

  const user = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
  });

  if (!user) {
    return { success: false, message: "User not found." };
  }

  const tempPassword = `Temp${crypto.randomBytes(3).toString("hex").toUpperCase()}9!`;
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: currentAdmin.userId,
        action: "ADMIN_RESET_USER_PASSWORD",
        entityType: "User",
        entityId: targetUserId,
      },
    }),
  ]);

  return {
    success: true,
    message: `Password for ${user.fullName} has been reset. Share this temporary password with the member:`,
    data: { temporaryPassword: tempPassword },
  };
}

export async function wellnessAdminUpdateCustomerProfile(
  userId: string,
  input: {
    city?: string | null;
    province?: string | null;
    address?: string | null;
    occupation?: string | null;
    gender?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  }
): Promise<WellnessActionResult> {
  await requireSuperadmin();

  const parsed = AdminUpdateCustomerProfileSchema.safeParse({ userId, ...(input || {}) });
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid customer profile payload.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  try {
    const target = await prisma.user.findFirst({
      where: { id: data.userId, deletedAt: null },
      select: { id: true },
    });
    if (!target) {
      return { success: false, message: "Customer user record not found." };
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: {
        city: data.city !== undefined ? (data.city?.trim() || null) : undefined,
        province: data.province !== undefined ? (data.province?.trim() || null) : undefined,
        address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
        occupation: data.occupation !== undefined ? (data.occupation?.trim() || null) : undefined,
        gender: data.gender !== undefined ? (data.gender?.trim() || null) : undefined,
        emergencyContactName:
          data.emergencyContactName !== undefined
            ? (data.emergencyContactName?.trim() || null)
            : undefined,
        emergencyContactPhone:
          data.emergencyContactPhone !== undefined
            ? (data.emergencyContactPhone?.trim() || null)
            : undefined,
      },
    });

    revalidateAdminRoutes();
    return {
      success: true,
      message: "Customer profile saved successfully.",
    };
  } catch (error: unknown) {
    console.error("[Admin Update Customer Profile Error]:", error);
    return {
      success: false,
      message: "Failed to save customer profile.",
    };
  }
}
