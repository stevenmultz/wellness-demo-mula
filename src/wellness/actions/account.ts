"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireAuth } from "../security/guards";
import { hashPassword, verifyPassword } from "../security/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "../security/session";
import { UpdateProfileSchema, ChangePasswordSchema, DeleteAccountSchema, HealthProfileSchema, calculateAgeFromDob } from "../validators/auth";
import { createQrisInvoiceAdapter } from "../integrations/payment-gateway";
import { createUserNotifications } from "../integrations/user-notifications";
import { isRegistrationClosedInWib } from "../utils/timezone";
import { normalizeProgramStatus, resolvePublicBadge } from "../utils/timeline";
import { WellnessActionResult } from "./auth";

/**
 * Fetch the authenticated user's profile.
 */
export async function wellnessGetProfile() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User profile not found.");
  }

  return user;
}

/**
 * Update user profile details (Full Name & Phone/WhatsApp).
 * Protected against IDOR: userId is strictly read from the verified server session cookie.
 */
export async function wellnessUpdateProfile(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = UpdateProfileSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid profile details.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    fullName,
    phone,
    age,
    dateOfBirth,
    gender,
    occupation,
    address,
    city,
    province,
    emergencyContactName,
    emergencyContactPhone,
  } = validation.data;

  // dateOfBirth is the source of truth; `age` is derived from it so the two never drift apart.
  const dobProvided = dateOfBirth !== undefined;
  const dobValue = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;
  const derivedAge = dateOfBirth ? calculateAgeFromDob(dateOfBirth) : null;

  const updatedUser = await prisma.user.update({
    where: { id: session.userId },
    data: {
      fullName,
      phone: phone || null,
      ...(dobProvided
        ? { dateOfBirth: dobValue, age: derivedAge }
        : { age: age !== undefined ? age : undefined }),
      gender: gender !== undefined ? (gender?.trim() || null) : undefined,
      occupation: occupation !== undefined ? (occupation?.trim() || null) : undefined,
      address: address !== undefined ? (address?.trim() || null) : undefined,
      city: city !== undefined ? (city?.trim() || null) : undefined,
      province: province !== undefined ? (province?.trim() || null) : undefined,
      emergencyContactName:
        emergencyContactName !== undefined
          ? (emergencyContactName?.trim() || null)
          : undefined,
      emergencyContactPhone:
        emergencyContactPhone !== undefined
          ? (emergencyContactPhone?.trim() || null)
          : undefined,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      age: true,
      dateOfBirth: true,
      gender: true,
      occupation: true,
      address: true,
      city: true,
      province: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  });

  if (updatedUser.age !== undefined) {
    await prisma.customerHealthProfile.updateMany({
      where: { userId: session.userId },
      data: { age: updatedUser.age },
    });
  }

  return {
    success: true,
    message: "Profile details updated successfully.",
    data: updatedUser,
  };
}

/**
 * Retrieve the authenticated user's baseline health & body assessment profile.
 */
export async function wellnessGetHealthProfile() {
  const session = await requireAuth();

  const profile = await prisma.customerHealthProfile.findUnique({
    where: { userId: session.userId },
  });

  return profile;
}

/**
 * Update or initialize the authenticated user's health, body photos, measurements, and lifestyle habits.
 */
export async function wellnessUpdateHealthProfile(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = HealthProfileSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid health profile data.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const data = validation.data;

  const updatedProfile = await prisma.customerHealthProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      ...data,
    },
    update: {
      ...data,
    },
  });

  try {
    revalidatePath("/dashboard");
    revalidatePath("/admin");
  } catch {
    // Ignore outside request context
  }

  return {
    success: true,
    message: "Health & lifestyle baseline profile updated successfully.",
    data: updatedProfile,
  };
}

/**
 * Change password from account settings.
 * Verifies current password, hashes new password, and increments tokenVersion to invalidate other sessions.
 */
export async function wellnessChangePassword(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = ChangePasswordSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid new password format.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true, tokenVersion: true, email: true, role: true },
  });

  if (!user) {
    return { success: false, message: "User not found." };
  }

  const isMatch = await verifyPassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    return {
      success: false,
      message: "The current password you entered is incorrect.",
    };
  }

  const newPasswordHash = await hashPassword(newPassword);
  const nextTokenVersion = user.tokenVersion + 1;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: nextTokenVersion,
      },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: session.userId, used: false },
      data: { used: true },
    }),
  ]);

  const newToken = await createSessionToken({
    userId: session.userId,
    email: user.email,
    role: user.role,
    tokenVersion: nextTokenVersion,
  });
  await setSessionCookie(newToken);

  return {
    success: true,
    message: "Password updated successfully. All other device sessions have been signed out.",
  };
}

/**
 * Enroll in a Cohort Program & Generate QRIS Invoice with a 15-Minute Validity Window (SOW 5.2).
 * Enforces Participant Quota Limits and Enrollment Cutoff Deadlines.
 */
export async function wellnessEnrollProgram(
  programId: string,
  attendanceMode: "IN_PERSON" | "VIRTUAL" = "VIRTUAL"
): Promise<
  WellnessActionResult<{
    id: string;
    programId: string;
    programTitle: string;
    price: number;
    status: string;
    attendanceMode: string;
    paymentReference: string | null;
    invoiceExpiresAt: Date | null;
  }>
> {
  const session = await requireAuth();

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      _count: {
        select: {
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
  });

  if (!program) {
    return { success: false, message: "Wellness cohort program not found." };
  }

  const normStatus = normalizeProgramStatus(program.status);
  if (normStatus !== "PUBLISH") {
    return {
      success: false,
      message: "This cohort program is currently not open for public enrollment.",
    };
  }

  // Resolve Dynamic Public Badge
  const publicBadge = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: program.registrationOpenDate,
    registrationDeadline: program.registrationDeadline,
    startDate: program.startDate,
    endDate: program.endDate,
    maxQuota: program.maxQuota,
    enrolledCount: program._count.enrollments,
    now: new Date(),
  });

  if (publicBadge === "Coming Soon") {
    return {
      success: false,
      message: "Registration for this cohort program has not opened yet (Coming Soon).",
    };
  }

  if (publicBadge === "Full") {
    return {
      success: false,
      message: `This cohort batch has reached its maximum quota of ${program.maxQuota} participants.`,
    };
  }

  if (publicBadge === "Close Registration" || publicBadge === "On going" || publicBadge === "End") {
    return {
      success: false,
      message: "Registration for this cohort batch has closed.",
    };
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      userId_programId: {
        userId: session.userId,
        programId: program.id,
      },
    },
  });

  if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
    return {
      success: false,
      message: "You are already an active member of this cohort batch.",
    };
  }

  // Check Enrollment Cutoff Deadline in Western Indonesia Time (WIB)
  if (isRegistrationClosedInWib(program.registrationDeadline)) {
    return {
      success: false,
      message: "Registration for this cohort batch has closed.",
    };
  }

  // Check Participant Quota Limit (Active + Unexpired PENDING checkout holds)
  const now = new Date();
  const activeAndHoldingCount = await prisma.programEnrollment.count({
    where: {
      programId: program.id,
      OR: [
        { status: "ACTIVE" },
        {
          status: "PENDING",
          invoiceExpiresAt: { gt: now },
          userId: { not: session.userId },
        },
      ],
    },
  });

  if (activeAndHoldingCount >= program.maxQuota) {
    return {
      success: false,
      message: `This cohort batch has reached its maximum quota of ${program.maxQuota} participants (including active checkout holds).`,
    };
  }

  // Free Program: Automatically activate cohort enrollment inside an atomic transaction
  if (program.price <= 0) {
    const paidAt = new Date();
    const validUntil =
      program.endDate && program.endDate > paidAt
        ? program.endDate
        : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    try {
      const enrollment = await prisma.$transaction(async (tx) => {
        const liveActiveCount = await tx.programEnrollment.count({
          where: { programId: program.id, status: "ACTIVE" },
        });

        if (liveActiveCount >= program.maxQuota) {
          throw new Error(
            `This cohort batch has reached its maximum quota of ${program.maxQuota} participants.`
          );
        }

        if (existingEnrollment) {
          return await tx.programEnrollment.update({
            where: { id: existingEnrollment.id },
            data: {
              status: "ACTIVE",
              attendanceMode,
              paidAt,
              validUntil,
              termsAgreedAt: new Date(),
              termsAgreedVersion: "v1.0",
            },
          });
        }

        return await tx.programEnrollment.create({
          data: {
            userId: session.userId,
            programId: program.id,
            status: "ACTIVE",
            attendanceMode,
            paymentReference: `FREE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
            paidAt,
            validUntil,
            termsAgreedAt: new Date(),
            termsAgreedVersion: "v1.0",
          },
        });
      });

      await createUserNotifications([
        {
          userId: session.userId,
          type: "PROGRAM",
          title: "Enrollment successful",
          body: `You are enrolled in "${program.title}". Your plan is now active.`,
          url: "/dashboard",
          dedupeKey: `payment-active:${enrollment.id}`,
        },
      ]);

      return {
        success: true,
        message: `Enrolled successfully! Full access unlocked for "${program.title}".`,
        data: {
          id: enrollment.id,
          programId: program.id,
          programTitle: program.title,
          price: 0,
          status: enrollment.status,
          attendanceMode: enrollment.attendanceMode,
          paymentReference: enrollment.paymentReference,
          invoiceExpiresAt: null,
        },
      };
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Failed to complete free enrollment.",
      };
    }
  }

  // Standard 15-minute QRIS invoice validity window via Payment Gateway Adapter Template (SOW 5.2)
  const gatewayInvoice = await createQrisInvoiceAdapter({
    enrollmentId: existingEnrollment?.id || "new",
    userId: session.userId,
    userEmail: session.email,
    programTitle: program.title,
    amountIdr: program.price,
  });

  try {
    const { enrollment, isRefresh } = await prisma.$transaction(async (tx) => {
      const txNow = new Date();
      const liveHoldCount = await tx.programEnrollment.count({
        where: {
          programId: program.id,
          OR: [
            { status: "ACTIVE" },
            {
              status: "PENDING",
              invoiceExpiresAt: { gt: txNow },
              userId: { not: session.userId },
            },
          ],
        },
      });

      if (liveHoldCount >= program.maxQuota) {
        throw new Error(
          `This cohort batch has reached its maximum quota of ${program.maxQuota} participants (including active checkout holds).`
        );
      }

      if (existingEnrollment) {
        const isStillValid =
          existingEnrollment.status === "PENDING" &&
          existingEnrollment.invoiceExpiresAt &&
          txNow < new Date(existingEnrollment.invoiceExpiresAt);

        const refreshed = await tx.programEnrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            status: "PENDING",
            attendanceMode,
            paymentReference: isStillValid
              ? existingEnrollment.paymentReference || gatewayInvoice.paymentReference
              : gatewayInvoice.paymentReference,
            invoiceExpiresAt: isStillValid
              ? existingEnrollment.invoiceExpiresAt
              : gatewayInvoice.invoiceExpiresAt,
          },
        });
        return { enrollment: refreshed, isRefresh: true };
      }

      const created = await tx.programEnrollment.create({
        data: {
          userId: session.userId,
          programId: program.id,
          status: "PENDING",
          attendanceMode,
          paymentReference: gatewayInvoice.paymentReference,
          invoiceExpiresAt: gatewayInvoice.invoiceExpiresAt,
        },
      });
      return { enrollment: created, isRefresh: false };
    });

    if (!isRefresh) {
      await createUserNotifications([
        {
          userId: session.userId,
          type: "PAYMENT",
          title: "Payment pending",
          body: `Complete your QRIS payment for "${program.title}" before the invoice expires.`,
          url: "/dashboard",
          dedupeKey: `payment-pending:${enrollment.id}:${enrollment.paymentReference ?? ""}`,
        },
      ]);
    }

    return {
      success: true,
      message: isRefresh
        ? "QRIS checkout invoice ready."
        : `QRIS invoice generated for ${program.title}. Valid for 15 minutes.`,
      data: {
        id: enrollment.id,
        programId: program.id,
        programTitle: program.title,
        price: program.price,
        status: enrollment.status,
        attendanceMode: enrollment.attendanceMode,
        paymentReference: enrollment.paymentReference,
        invoiceExpiresAt: enrollment.invoiceExpiresAt,
      },
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to generate QRIS invoice.",
    };
  }
}

/**
 * Automated QRIS Payment Verification / Gateway Webhook Handler (SOW 5.2).
 * Verifies the 15-minute QRIS invoice window and unlocks cohort access immediately.
 */
export async function wellnessConfirmQrisPayment(
  enrollmentId: string,
  termsAgreed: boolean = true
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  if (!termsAgreed) {
    return {
      success: false,
      message: "You must agree to the program terms and conditions before confirming payment.",
    };
  }

  const enrollment = await prisma.programEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      program: true,
    },
  });

  if (!enrollment || enrollment.userId !== session.userId) {
    return { success: false, message: "Invoice record not found." };
  }

  if (enrollment.status === "ACTIVE") {
    return { success: true, message: "Payment already verified." };
  }

  // Guard against self-activation in production:
  // Direct client payment self-confirmation is ONLY permitted in development or when explicitly enabled
  const isSimulationAllowed =
    process.env.ALLOW_PAYMENT_SIMULATION === "true" ||
    process.env.NODE_ENV === "development";

  if (!isSimulationAllowed) {
    return {
      success: false,
      message:
        "Direct client confirmation is disabled in production. Payments must be verified via payment gateway or Admin manual approval.",
    };
  }

  // Check registration deadline
  if (isRegistrationClosedInWib(enrollment.program.registrationDeadline)) {
    return {
      success: false,
      message: "Registration for this cohort batch has closed.",
    };
  }

  // Verify 15-minute QRIS validity window
  if (
    enrollment.invoiceExpiresAt &&
    new Date() > new Date(enrollment.invoiceExpiresAt)
  ) {
    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "EXPIRED" },
    });
    return {
      success: false,
      message: "QRIS invoice 15-minute window has expired. Please regenerate a new QRIS code.",
    };
  }

  // Atomic quota verification and activation within transaction to prevent race-condition overselling
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const activeCount = await tx.programEnrollment.count({
        where: {
          programId: enrollment.programId,
          status: "ACTIVE",
        },
      });

      if (activeCount >= enrollment.program.maxQuota) {
        throw new Error("Cohort quota was just filled. Please contact support.");
      }

      const paidAt = new Date();
      const validUntil =
        enrollment.program.endDate && enrollment.program.endDate > paidAt
          ? enrollment.program.endDate
          : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

      return await tx.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "ACTIVE",
          paidAt,
          validUntil,
          termsAgreedAt: new Date(),
          termsAgreedVersion: "v1.0",
        },
      });
    });

    try {
      revalidatePath("/dashboard");
      revalidatePath("/admin");
    } catch {
      // Ignore outside request context
    }

    await createUserNotifications([
      {
        userId: session.userId,
        type: "PAYMENT",
        title: "Payment confirmed",
        body: `Your payment for "${enrollment.program.title}" is confirmed. Your plan is now active.`,
        url: "/dashboard",
        dedupeKey: `payment-active:${enrollment.id}`,
      },
    ]);

    return {
      success: true,
      message: `QRIS payment verified! Full cohort access unlocked for "${enrollment.program.title}".`,
      data: updated,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to verify payment.",
    };
  }
}

/**
 * Self-Service Permanent Account Deletion.
 * Requires current password verification and prevents deleting the sole Superadmin.
 */
export async function wellnessDeleteAccount(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = DeleteAccountSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Password verification is required to delete your account.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    return { success: false, message: "User not found." };
  }

  const isMatch = await verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    return {
      success: false,
      message: "Incorrect password. Account deletion cancelled.",
    };
  }

  if (user.role === "SUPERADMIN") {
    const superadminCount = await prisma.user.count({
      where: { role: "SUPERADMIN" },
    });
    if (superadminCount <= 1) {
      return {
        success: false,
        message: "Cannot delete the sole Superadmin account on the platform.",
      };
    }
  }

  await prisma.user.delete({
    where: { id: session.userId },
  });

  await clearSessionCookie();

  return {
    success: true,
    message: "Your account and all associated records have been permanently deleted.",
  };
}
