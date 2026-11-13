"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireSuperadmin } from "../security/guards";
import { hashPassword } from "../security/password";
import { createUserNotifications } from "../integrations/user-notifications";
import { AdminUpdateCustomerProfileSchema } from "../validators/auth";
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
      message: "Only one Superadmin is permitted in the system. Users cannot be promoted to Superadmin.",
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
    const target = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    if (!target) {
      return { success: false, message: "Customer user record not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.userId },
        data: {
          city: data.city !== undefined ? (data.city?.trim() || null) : undefined,
          province: data.province !== undefined ? (data.province?.trim() || null) : undefined,
          address: data.address !== undefined ? (data.address?.trim() || null) : undefined,
          occupation: data.occupation !== undefined ? (data.occupation?.trim() || null) : undefined,
          gender: data.gender !== undefined ? (data.gender?.trim() || null) : undefined,
          age: data.age !== undefined ? data.age : undefined,
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

      await tx.customerHealthProfile.upsert({
        where: { userId: data.userId },
        create: {
          userId: data.userId,
          dietType: data.dietType?.trim() || null,
          heightCm: data.heightCm !== undefined ? data.heightCm : null,
          weightKg: data.weightKg !== undefined ? data.weightKg : null,
          injuriesOrConditions: data.injuriesOrConditions?.trim() || null,
          foodAllergies: data.foodAllergies?.trim() || null,
          primaryGoal: data.primaryGoal?.trim() || null,
          coachNotes: data.coachNotes?.trim() || null,
        },
        update: {
          dietType:
            data.dietType !== undefined ? (data.dietType?.trim() || null) : undefined,
          heightCm: data.heightCm !== undefined ? data.heightCm : undefined,
          weightKg: data.weightKg !== undefined ? data.weightKg : undefined,
          injuriesOrConditions:
            data.injuriesOrConditions !== undefined
              ? (data.injuriesOrConditions?.trim() || null)
              : undefined,
          foodAllergies:
            data.foodAllergies !== undefined
              ? (data.foodAllergies?.trim() || null)
              : undefined,
          primaryGoal:
            data.primaryGoal !== undefined
              ? (data.primaryGoal?.trim() || null)
              : undefined,
          coachNotes:
            data.coachNotes !== undefined
              ? (data.coachNotes?.trim() || null)
              : undefined,
        },
      });
    });

    revalidateAdminRoutes();
    return {
      success: true,
      message: "Customer profile and coaching notes saved successfully.",
    };
  } catch (error: unknown) {
    console.error("[Admin Update Customer Profile Error]:", error);
    return {
      success: false,
      message: "Failed to save customer profile and coaching notes.",
    };
  }
}
