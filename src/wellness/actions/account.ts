"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { prisma, lockProgramRow } from "../db";
import { requireAuth } from "../security/guards";
import { hashPassword, verifyPassword } from "../security/password";
import { createSessionToken, setSessionCookie, clearSessionCookie } from "../security/session";
import { UpdateProfileSchema, ChangePasswordSchema, DeleteAccountSchema, calculateAgeFromDob } from "../validators/auth";
import { createQrisInvoiceAdapter, generateQrisOrderId } from "../integrations/payment-gateway";
import { createUserNotifications } from "../integrations/user-notifications";
import { deleteStorageObjects } from "../integrations/supabase-storage";
import { recordAuditLog } from "../integrations/audit-log";
import { isRegistrationClosedInWib } from "../utils/timezone";
import { normalizeProgramStatus, resolvePublicBadge } from "../utils/timeline";
import { cleanupUserUploadedFiles } from "../utils/image-processor";
import { getPaymentProvider, isPaymentSimulationAllowed, QRIS_INVOICE_TTL_MS } from "../config";
import type { WellnessActionResult } from "./auth";

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
    dateOfBirth,
    gender,
    occupation,
    address,
    city,
    province,
    emergencyContactName,
    emergencyContactPhone,
  } = validation.data;

  const dobProvided = dateOfBirth !== undefined;
  const dobValue = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;

  const updatedUser = await prisma.user.update({
    where: { id: session.userId },
    data: {
      fullName,
      phone: phone || null,
      ...(dobProvided ? { birthDate: dobValue } : {}),
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
      birthDate: true,
      gender: true,
      occupation: true,
      address: true,
      city: true,
      province: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  });

  return {
    success: true,
    message: "Profile details updated successfully.",
    data: {
      ...updatedUser,
      age: updatedUser.birthDate ? calculateAgeFromDob(updatedUser.birthDate) : null,
      dateOfBirth: updatedUser.birthDate,
    },
  };
}

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

  if (!user.passwordHash) {
    return {
      success: false,
      message: "Your account currently signs in via Google. Use Forgot Password to set a local password.",
    };
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
    prisma.userPasswordResetToken.updateMany({
      where: { userId: session.userId, isUsed: false },
      data: { isUsed: true },
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
    qrStringOrUrl?: string | null;
  }>
> {
  const session = await requireAuth();

  const program = await prisma.program.findFirst({
    where: { id: programId, deletedAt: null },
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

  const publicBadge = resolvePublicBadge({
    status: program.status,
    registrationOpenDate: program.registrationOpenAt,
    registrationDeadline: program.registrationDeadlineAt,
    startDate: program.startAt,
    endDate: program.endAt,
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
  if (isRegistrationClosedInWib(program.registrationDeadlineAt)) {
    return {
      success: false,
      message: "Registration for this cohort batch has closed.",
    };
  }

  // Free Program: Atomic activation
  if (program.price <= 0) {
    const paidAt = new Date();
    const validUntilAt =
      program.endAt > paidAt
        ? program.endAt
        : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    try {
      const enrollment = await prisma.$transaction(async (tx) => {
        await lockProgramRow(tx, program.id);
        const txExisting = await tx.programEnrollment.findUnique({
          where: { userId_programId: { userId: session.userId, programId: program.id } },
        });
        if (txExisting && txExisting.status === "ACTIVE") {
          throw new Error("You are already an active member of this cohort batch.");
        }

        const liveActiveCount = await tx.programEnrollment.count({
          where: { programId: program.id, status: "ACTIVE" },
        });
        if (liveActiveCount >= program.maxQuota) {
          throw new Error(
            `This cohort batch has reached its maximum quota of ${program.maxQuota} participants.`
          );
        }

        const freeRef = txExisting?.paymentReference || `FREE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        const now = new Date();
        const saved = txExisting
          ? await tx.programEnrollment.update({
              where: { id: txExisting.id },
              data: {
                status: "ACTIVE",
                attendanceMode,
                paymentReference: freeRef,
                paidAt,
                validUntilAt,
                termsAgreedAt: now,
                termsAgreedVersion: "v1.0",
              },
            })
          : await tx.programEnrollment.create({
              data: {
                userId: session.userId,
                programId: program.id,
                status: "ACTIVE",
                attendanceMode,
                paymentReference: freeRef,
                paidAt,
                validUntilAt,
                termsAgreedAt: now,
                termsAgreedVersion: "v1.0",
              },
            });

        await tx.paymentTransaction.create({
          data: {
            enrollmentId: saved.id,
            userId: session.userId,
            programId: program.id,
            orderId: `${freeRef}-${Date.now()}`,
            provider: "FREE",
            paymentType: "free",
            grossAmount: 0,
            status: "SETTLEMENT",
            settledAt: paidAt,
            createdById: session.userId,
          },
        });

        return saved;
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
        message: err instanceof Error ? err.message : "Failed to complete free enrollment.",
      };
    }
  }

  // Paid Program: Lock quota + create/reuse PENDING enrollment & transaction ledger BEFORE external gateway charge
  try {
    const provider = getPaymentProvider();
    const { enrollment, paymentTx, reusedValidInvoice } = await prisma.$transaction(async (tx) => {
      await lockProgramRow(tx, program.id);
      const txNow = new Date();

      const txExisting = await tx.programEnrollment.findUnique({
        where: { userId_programId: { userId: session.userId, programId: program.id } },
        include: {
          transactions: {
            where: { status: "PENDING", expiresAt: { gt: txNow } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (txExisting && txExisting.status === "ACTIVE") {
        throw new Error("You are already an active member of this cohort batch.");
      }

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

      const activePendingTx = txExisting?.transactions[0] ?? null;
      if (
        txExisting &&
        txExisting.status === "PENDING" &&
        txExisting.invoiceExpiresAt &&
        txNow < txExisting.invoiceExpiresAt &&
        activePendingTx &&
        activePendingTx.grossAmount === program.price
      ) {
        const refreshed = await tx.programEnrollment.update({
          where: { id: txExisting.id },
          data: { attendanceMode },
        });
        return { enrollment: refreshed, paymentTx: activePendingTx, reusedValidInvoice: true };
      }

      const newOrderId = generateQrisOrderId();
      const provisionalExpiresAt = new Date(txNow.getTime() + QRIS_INVOICE_TTL_MS);

      const savedEnrollment = txExisting
        ? await tx.programEnrollment.update({
            where: { id: txExisting.id },
            data: {
              status: "PENDING",
              attendanceMode,
              paymentReference: newOrderId,
              invoiceExpiresAt: provisionalExpiresAt,
            },
          })
        : await tx.programEnrollment.create({
            data: {
              userId: session.userId,
              programId: program.id,
              status: "PENDING",
              attendanceMode,
              paymentReference: newOrderId,
              invoiceExpiresAt: provisionalExpiresAt,
            },
          });

      // Expire any stale pending transactions for this enrollment before creating the new ledger entry
      await tx.paymentTransaction.updateMany({
        where: { enrollmentId: savedEnrollment.id, status: "PENDING" },
        data: { status: "EXPIRE" },
      });

      const createdTx = await tx.paymentTransaction.create({
        data: {
          enrollmentId: savedEnrollment.id,
          userId: session.userId,
          programId: program.id,
          orderId: newOrderId,
          provider,
          paymentType: "qris",
          grossAmount: program.price,
          status: "PENDING",
          expiresAt: provisionalExpiresAt,
          createdById: session.userId,
        },
      });

      return { enrollment: savedEnrollment, paymentTx: createdTx, reusedValidInvoice: false };
    });

    let finalExpiresAt = paymentTx.expiresAt ?? enrollment.invoiceExpiresAt;
    let qrStringOrUrl = paymentTx.qrisStringOrUrl;

    if (!reusedValidInvoice) {
      try {
        const gatewayInvoice = await createQrisInvoiceAdapter({
          orderId: paymentTx.orderId,
          enrollmentId: enrollment.id,
          userId: session.userId,
          userEmail: session.email,
          userName: session.fullName,
          programTitle: program.title,
          amountIdr: program.price,
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
          prisma.programEnrollment.update({
            where: { id: enrollment.id },
            data: { invoiceExpiresAt: finalExpiresAt },
          }),
        ]);
      } catch (gwErr) {
        await prisma.$transaction([
          prisma.paymentTransaction.update({
            where: { id: paymentTx.id },
            data: { status: "CANCEL" },
          }),
          prisma.programEnrollment.updateMany({
            where: { id: enrollment.id, status: "PENDING", paymentReference: paymentTx.orderId },
            data: { status: "CANCELLED" },
          }),
        ]);
        throw gwErr;
      }

      await createUserNotifications([
        {
          userId: session.userId,
          type: "PAYMENT",
          title: "Payment pending",
          body: `Complete your QRIS payment for "${program.title}" before the invoice expires.`,
          url: "/dashboard",
          dedupeKey: `payment-pending:${enrollment.id}:${paymentTx.orderId}`,
        },
      ]);
    }

    return {
      success: true,
      message: reusedValidInvoice
        ? "QRIS checkout invoice ready."
        : `QRIS invoice generated for ${program.title}. Valid for 15 minutes.`,
      data: {
        id: enrollment.id,
        programId: program.id,
        programTitle: program.title,
        price: program.price,
        status: enrollment.status,
        attendanceMode: enrollment.attendanceMode,
        paymentReference: paymentTx.orderId,
        invoiceExpiresAt: finalExpiresAt,
        qrStringOrUrl,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to generate QRIS invoice.",
    };
  }
}

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
    include: { program: true },
  });

  if (!enrollment || enrollment.userId !== session.userId) {
    return { success: false, message: "Invoice record not found." };
  }
  if (enrollment.status === "ACTIVE") {
    return { success: true, message: "Payment already verified." };
  }
  if (enrollment.status !== "PENDING") {
    return {
      success: false,
      message: "This invoice is no longer payable. Please start a new checkout.",
    };
  }

  if (!isPaymentSimulationAllowed()) {
    return {
      success: false,
      message:
        "Direct client confirmation is disabled in production. Payments are verified automatically via Midtrans webhook or Admin manual approval.",
    };
  }

  if (isRegistrationClosedInWib(enrollment.program.registrationDeadlineAt)) {
    return {
      success: false,
      message: "Registration for this cohort batch has closed.",
    };
  }

  if (enrollment.invoiceExpiresAt && new Date() > new Date(enrollment.invoiceExpiresAt)) {
    await prisma.$transaction([
      prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "EXPIRED" },
      }),
      prisma.paymentTransaction.updateMany({
        where: { enrollmentId: enrollment.id, status: "PENDING" },
        data: { status: "EXPIRE" },
      }),
    ]);
    return {
      success: false,
      message: "QRIS invoice 15-minute window has expired. Please regenerate a new QRIS code.",
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await lockProgramRow(tx, enrollment.programId);
      const current = await tx.programEnrollment.findUnique({
        where: { id: enrollment.id },
        select: { status: true, paymentReference: true },
      });
      if (!current || current.status !== "PENDING") {
        throw new Error("This invoice is no longer payable. Please start a new checkout.");
      }
      const activeCount = await tx.programEnrollment.count({
        where: { programId: enrollment.programId, status: "ACTIVE" },
      });
      if (activeCount >= enrollment.program.maxQuota) {
        throw new Error("Cohort quota was just filled. Please contact support.");
      }

      const paidAt = new Date();
      const validUntilAt =
        enrollment.program.endAt > paidAt
          ? enrollment.program.endAt
          : new Date(paidAt.getTime() + 90 * 24 * 60 * 60 * 1000);

      if (current.paymentReference) {
        await tx.paymentTransaction.updateMany({
          where: { orderId: current.paymentReference, status: "PENDING" },
          data: { status: "SETTLEMENT", settledAt: paidAt },
        });
      }

      const row = await tx.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "ACTIVE",
          paidAt,
          validUntilAt,
          termsAgreedAt: paidAt,
          termsAgreedVersion: "v1.0",
        },
      });

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "PAYMENT_SIMULATION_CONFIRMED",
          entityType: "ProgramEnrollment",
          entityId: enrollment.id,
          metadata: { orderId: current.paymentReference },
        },
        tx
      );

      return row;
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
 * Self-Service Soft Account Deletion & PII Anonymization.
 * Preserves ProgramEnrollment & PaymentTransaction financial ledger integrity (`onDelete: Restrict`).
 */
export async function wellnessDeleteAccount(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = DeleteAccountSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid account deletion request.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { password } = validation.data;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || user.deletedAt !== null) {
    return { success: false, message: "User not found." };
  }

  if (user.passwordHash) {
    if (!password) {
      return { success: false, message: "Password verification is required to delete your account." };
    }
    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return {
        success: false,
        message: "Incorrect password. Account deletion cancelled.",
      };
    }
  }

  const oldAvatarPath = user.avatarPath;

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: session.userId },
        select: { role: true, deletedAt: true },
      });
      if (!current || current.deletedAt !== null) {
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
        where: { id: session.userId },
        data: {
          deletedAt: now,
          deletedById: session.userId,
          status: "SUSPENDED",
          email: `deleted_${session.userId}_${now.getTime()}@deleted.invalid`,
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
      await tx.userIdentity.deleteMany({ where: { userId: session.userId } });
      await tx.userPushSubscription.deleteMany({ where: { userId: session.userId } });
      await tx.userPasswordResetToken.deleteMany({ where: { userId: session.userId } });
      await tx.userEmailVerificationToken.deleteMany({ where: { userId: session.userId } });

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "ACCOUNT_SELF_DELETED",
          entityType: "User",
          entityId: session.userId,
        },
        tx
      );
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to delete account.",
    };
  }

  await deleteStorageObjects([oldAvatarPath]);
  await cleanupUserUploadedFiles(session.userId);
  await clearSessionCookie();

  return {
    success: true,
    message: "Your account and personal data have been deleted.",
  };
}
