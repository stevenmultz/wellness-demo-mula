"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireSuperadmin } from "../security/guards";
import { hashPassword } from "../security/password";
import { createUserNotifications } from "../integrations/user-notifications";
import { WellnessActionResult } from "./auth";

function revalidateAdminRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
  } catch {
    // Ignore outside request context
  }
}

/**
 * Superadmin: Retrieve directory of all users and their cohort enrollments.
 */
export async function wellnessAdminGetUsers(searchQuery?: string, limit = 100, offset = 0) {
  await requireSuperadmin();

  const whereClause = searchQuery
    ? {
        OR: [
          { email: { contains: searchQuery } },
          { fullName: { contains: searchQuery } },
          { phone: { contains: searchQuery } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where: whereClause,
    take: Math.min(500, Math.max(1, limit)),
    skip: Math.max(0, offset),
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      age: true,
      role: true,
      status: true,
      createdAt: true,
      healthProfile: true,
      enrollments: {
        select: {
          id: true,
          status: true,
          paymentReference: true,
          paidAt: true,
          validUntil: true,
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

  return users;
}

/**
 * Superadmin: Update User Role (USER <-> SUPERADMIN).
 * Protected against accidental self-demotion.
 */
export async function wellnessAdminUpdateUserRole(
  targetUserId: string,
  newRole: "USER" | "SUPERADMIN"
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
      message: "Hanya boleh ada 1 Superadmin pada sistem. Customer tidak dapat dipromosikan.",
    };
  }

  if (newRole === "USER") {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (targetUser?.role === "SUPERADMIN") {
      const superadminCount = await prisma.user.count({ where: { role: "SUPERADMIN" } });
      if (superadminCount <= 1) {
        return {
          success: false,
          message: "Cannot demote the last remaining Superadmin on the platform.",
        };
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      role: newRole,
      tokenVersion: { increment: 1 },
    },
    select: { id: true, email: true, fullName: true, role: true },
  });

  revalidateAdminRoutes();
  return {
    success: true,
    message: `Role for ${updatedUser.fullName} updated to ${newRole}.`,
    data: updatedUser,
  };
}

/**
 * Superadmin: Update Account Status (ACTIVE <-> SUSPENDED).
 * Automatically increments tokenVersion to immediately revoke active sessions.
 */
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

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      status: newStatus,
      tokenVersion: { increment: 1 },
    },
    select: { id: true, email: true, fullName: true, status: true },
  });

  revalidateAdminRoutes();
  return {
    success: true,
    message: `Account status for ${updatedUser.fullName} updated to ${newStatus}.`,
    data: updatedUser,
  };
}

/**
 * Superadmin: Manual Payment Verification & Cohort Activation.
 */
export async function wellnessAdminApprovePayment(
  enrollmentId: string
): Promise<WellnessActionResult> {
  await requireSuperadmin();

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
      // Verify cohort quota atomically before activating
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
      const validUntil =
        enrollment.program.endDate && enrollment.program.endDate > paidAt
          ? enrollment.program.endDate
          : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

      return await tx.programEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: "ACTIVE",
          paidAt,
          validUntil,
        },
      });
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
 * Superadmin: Permanently Delete User Account.
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

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    return { success: false, message: "User not found." };
  }

  if (targetUser.role === "SUPERADMIN") {
    const superadminCount = await prisma.user.count({
      where: { role: "SUPERADMIN" },
    });
    if (superadminCount <= 1) {
      return {
        success: false,
        message: "Cannot delete the last remaining Superadmin on the platform.",
      };
    }
  }

  await prisma.user.delete({
    where: { id: targetUserId },
  });

  revalidateAdminRoutes();
  return {
    success: true,
    message: `Account ${targetUser.fullName} (${targetUser.email}) has been permanently deleted.`,
  };
}

/**
 * Superadmin: Force Reset User Password (Generates Temporary Password).
 */
export async function wellnessAdminResetUserPassword(
  targetUserId: string
): Promise<WellnessActionResult<{ temporaryPassword: string }>> {
  await requireSuperadmin();

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!user) {
    return { success: false, message: "User not found." };
  }

  const tempPassword = `Temp${crypto.randomBytes(3).toString("hex").toUpperCase()}9!`;
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      passwordHash,
      tokenVersion: { increment: 1 },
    },
  });

  return {
    success: true,
    message: `Password for ${user.fullName} has been reset. Share this temporary password with the member:`,
    data: { temporaryPassword: tempPassword },
  };
}

/**
 * Superadmin: Update Customer Health, Emergency, and Coaching Adaptation Profile
 */
export async function wellnessAdminUpdateCustomerProfile(
  userId: string,
  input: {
    city?: string | null;
    province?: string | null;
    address?: string | null;
    occupation?: string | null;
    gender?: string | null;
    age?: number | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    dietType?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    injuriesOrConditions?: string | null;
    foodAllergies?: string | null;
    primaryGoal?: string | null;
    coachNotes?: string | null;
  }
): Promise<WellnessActionResult> {
  await requireSuperadmin();

  // 1. Update User level details (personal info, address, occupation, location & emergency contacts)
  await prisma.user.update({
    where: { id: userId },
    data: {
      city: input.city !== undefined ? (input.city?.trim() || null) : undefined,
      province: input.province !== undefined ? (input.province?.trim() || null) : undefined,
      address: input.address !== undefined ? (input.address?.trim() || null) : undefined,
      occupation: input.occupation !== undefined ? (input.occupation?.trim() || null) : undefined,
      gender: input.gender !== undefined ? (input.gender?.trim() || null) : undefined,
      age: input.age !== undefined ? input.age : undefined,
      emergencyContactName:
        input.emergencyContactName !== undefined
          ? (input.emergencyContactName?.trim() || null)
          : undefined,
      emergencyContactPhone:
        input.emergencyContactPhone !== undefined
          ? (input.emergencyContactPhone?.trim() || null)
          : undefined,
    },
  });

  // 2. Upsert CustomerHealthProfile details (diet, metrics, injuries, allergies, notes)
  await prisma.customerHealthProfile.upsert({
    where: { userId },
    create: {
      userId,
      dietType: input.dietType?.trim() || null,
      heightCm: input.heightCm !== undefined ? input.heightCm : null,
      weightKg: input.weightKg !== undefined ? input.weightKg : null,
      injuriesOrConditions: input.injuriesOrConditions?.trim() || null,
      foodAllergies: input.foodAllergies?.trim() || null,
      primaryGoal: input.primaryGoal?.trim() || null,
      coachNotes: input.coachNotes?.trim() || null,
    },
    update: {
      dietType:
        input.dietType !== undefined ? (input.dietType?.trim() || null) : undefined,
      heightCm: input.heightCm !== undefined ? input.heightCm : undefined,
      weightKg: input.weightKg !== undefined ? input.weightKg : undefined,
      injuriesOrConditions:
        input.injuriesOrConditions !== undefined
          ? (input.injuriesOrConditions?.trim() || null)
          : undefined,
      foodAllergies:
        input.foodAllergies !== undefined
          ? (input.foodAllergies?.trim() || null)
          : undefined,
      primaryGoal:
        input.primaryGoal !== undefined
          ? (input.primaryGoal?.trim() || null)
          : undefined,
      coachNotes:
        input.coachNotes !== undefined
          ? (input.coachNotes?.trim() || null)
          : undefined,
    },
  });

  revalidateAdminRoutes();
  return {
    success: true,
    message: "Customer profile and coaching notes saved successfully.",
  };
}
