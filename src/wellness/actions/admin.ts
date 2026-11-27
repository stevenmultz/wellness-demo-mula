"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requirePlatformAdmin, requireSuperadmin } from "../security/guards";
import { isPlatformAdminRole, sanitizeUserScopeForRole } from "../security/roles";
import { hashPassword } from "../security/password";
import { resetDistributedRateLimit } from "../security/rate-limit";
import { createUserNotifications } from "../integrations/user-notifications";
import { deleteStorageObjects } from "../integrations/supabase-storage";
import { recordAuditLog } from "../integrations/audit-log";
import { AdminUpdateCustomerProfileSchema, calculateAgeFromDob } from "../validators/auth";
import { cleanupUserUploadedFiles } from "../utils/image-processor";
import { reportServerError } from "../observability";
import { rotateUserCredentialsInTx } from "../services/auth-core";
import { softDeleteAndAnonymizeUserInTx, updateUserStatusInTx } from "../services/user-governance";
import { activateProgramEnrollmentInTx } from "../services/payment-orchestrator";
import type { WellnessActionResult } from "./auth";

const AdminTargetUserIdSchema = z.string().trim().min(1, "User ID is required").max(128);
const AdminUpdateUserRoleSchema = z.object({
  targetUserId: AdminTargetUserIdSchema,
  newRole: z.enum(["USER", "COACH", "PARTNER_ADMIN", "ADMIN", "SUPERADMIN"]),
  scope: z
    .object({
      organizationId: z.string().trim().max(128).nullable().optional(),
      coachProfileId: z.string().trim().max(128).nullable().optional(),
    })
    .optional(),
});

function revalidateAdminRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
  } catch {
    // Ignore outside request context
  }
}

export async function wellnessAdminGetUsers(searchQuery?: string, limit = 100, offset = 0) {
  await requirePlatformAdmin();

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
      trackingAccessUntil: true,
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
  newRole: "USER" | "COACH" | "PARTNER_ADMIN" | "ADMIN" | "SUPERADMIN",
  scope?: { organizationId?: string | null; coachProfileId?: string | null }
): Promise<WellnessActionResult> {
  const currentAdmin = await requireSuperadmin();

  const parsedInput = AdminUpdateUserRoleSchema.safeParse({ targetUserId, newRole, scope });
  if (!parsedInput.success) {
    return {
      success: false,
      message: "Invalid role update payload.",
    };
  }
  const cleanTargetId = parsedInput.data.targetUserId;
  const cleanRole = parsedInput.data.newRole;
  const cleanScope = parsedInput.data.scope;

  if (cleanTargetId === currentAdmin.userId && cleanRole !== "SUPERADMIN") {
    return {
      success: false,
      message: "You cannot demote your own Superadmin role.",
    };
  }

  if (cleanRole === "SUPERADMIN") {
    return {
      success: false,
      message: "Only one Superadmin is permitted in the system. Users cannot be promoted to Superadmin.",
    };
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: cleanTargetId, deletedAt: null },
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

      let resolvedScope = sanitizeUserScopeForRole(
        cleanRole,
        {
          organizationId: targetUser.organizationId,
          coachProfileId: targetUser.coachProfileId,
        },
        cleanScope
      );

      if (resolvedScope.organizationId) {
        const orgExists = await tx.masterOrganization.findUnique({
          where: { id: resolvedScope.organizationId },
          select: { id: true },
        });
        if (!orgExists) {
          throw new Error("Selected organization does not exist.");
        }
      }

      if (resolvedScope.coachProfileId) {
        const coachExists = await tx.masterCoach.findUnique({
          where: { id: resolvedScope.coachProfileId },
          select: { id: true, organizationId: true },
        });
        if (!coachExists) {
          throw new Error("Selected coach profile does not exist.");
        }
        if (cleanRole === "COACH" && cleanScope?.organizationId === undefined) {
          resolvedScope = {
            ...resolvedScope,
            organizationId: coachExists.organizationId ?? null,
          };
        }
      }

      const { organizationId: nextOrgId, coachProfileId: nextCoachId } = resolvedScope;

      const updated = await tx.user.update({
        where: { id: cleanTargetId },
        data: {
          role: cleanRole,
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
          entityId: cleanTargetId,
          metadata: { fromRole: targetUser.role, toRole: cleanRole, nextOrgId, nextCoachId },
        },
        tx
      );

      return updated;
    });

    revalidateAdminRoutes();
    return {
      success: true,
      message: `Role for ${updatedUser.fullName} updated to ${cleanRole}.`,
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
  const currentAdmin = await requirePlatformAdmin();

  if (targetUserId === currentAdmin.userId && newStatus === "SUSPENDED") {
    return {
      success: false,
      message: "You cannot suspend your own account.",
    };
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, deletedAt: null },
    select: { id: true, role: true },
  });
  if (!targetUser) {
    return { success: false, message: "User not found." };
  }
  if (currentAdmin.role !== "SUPERADMIN" && isPlatformAdminRole(targetUser.role)) {
    return {
      success: false,
      message: "Only Superadmin can modify status for Platform Admin or Superadmin accounts.",
    };
  }

  const updatedUser = await prisma.$transaction((tx) =>
    updateUserStatusInTx(tx, {
      targetUserId,
      newStatus,
      actorUserId: currentAdmin.userId,
      auditAction: "ADMIN_UPDATE_USER_STATUS",
    })
  );

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
    const result = await prisma.$transaction((tx) =>
      activateProgramEnrollmentInTx(tx, {
        enrollmentId,
        programId: enrollment.programId,
        userId: enrollment.userId,
        program: enrollment.program,
        channel: "ADMIN_MANUAL",
        actorUserId: currentAdmin.userId,
        approvedById: currentAdmin.userId,
        txStatusToSet: "MANUAL_APPROVED",
        auditAction: "ADMIN_MANUAL_APPROVE_PAYMENT",
        auditMetadata: {
          programId: enrollment.programId,
          targetUserId: enrollment.userId,
        },
        onQuotaOverflow: "THROW",
        onInactiveAccount: "THROW",
      })
    );

    if (result.status === "ALREADY_ACTIVE") {
      return { success: true, message: "Enrollment is already active.", data: enrollment };
    }

    const updated = result.status === "ACTIVATED" ? result.enrollment : enrollment;

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
    const deletedTarget = await prisma.$transaction((tx) =>
      softDeleteAndAnonymizeUserInTx(tx, {
        targetUserId,
        actorUserId: currentAdmin.userId,
        cancellationReason: "Account deleted by administrator",
        auditAction: "ADMIN_DELETE_USER",
      })
    );

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
  const currentAdmin = await requirePlatformAdmin();

  const parsedId = AdminTargetUserIdSchema.safeParse(targetUserId);
  if (!parsedId.success) {
    return { success: false, message: "Invalid user ID." };
  }
  const cleanTargetId = parsedId.data;

  try {
    const user = await prisma.user.findFirst({
      where: { id: cleanTargetId, deletedAt: null },
      select: { id: true, email: true, fullName: true, role: true },
    });

    if (!user) {
      return { success: false, message: "User not found." };
    }

    if (user.role === "SUPERADMIN" && user.id !== currentAdmin.userId) {
      return {
        success: false,
        message: "Cannot reset another Superadmin's password.",
      };
    }
    if (currentAdmin.role !== "SUPERADMIN" && isPlatformAdminRole(user.role) && user.id !== currentAdmin.userId) {
      return {
        success: false,
        message: "Only Superadmin can reset another Platform Admin's password.",
      };
    }

    const tempPassword = `Temp-${crypto.randomBytes(8).toString("base64url")}9!`;
    const passwordHash = await hashPassword(tempPassword);

    await prisma.$transaction((tx) =>
      rotateUserCredentialsInTx(tx, {
        targetUserId: cleanTargetId,
        newPasswordHash: passwordHash,
        actorUserId: currentAdmin.userId,
        auditAction: "ADMIN_RESET_USER_PASSWORD",
        requireActive: false,
      })
    );

    await resetDistributedRateLimit(`signin-email:${user.email.toLowerCase()}`);

    return {
      success: true,
      message: `Password for ${user.fullName} has been reset. Share this temporary password with the member:`,
      data: { temporaryPassword: tempPassword },
    };
  } catch (err) {
    reportServerError("admin", "reset_user_password", err, { targetUserId });
    return {
      success: false,
      message: "Failed to reset user password.",
    };
  }
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
  await requirePlatformAdmin();

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
    reportServerError("admin", "update_customer_profile", error, { targetUserId: data.userId });
    return {
      success: false,
      message: "Failed to save customer profile.",
    };
  }
}
