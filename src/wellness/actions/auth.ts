"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "../db";
import { BRAND } from "../brand";
import { hashPassword, verifyPassword } from "../security/password";
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
} from "../security/session";
import {
  SignUpSchema,
  SignInSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "../validators/auth";
import { sendTransactionalEmail } from "../integrations/email-service";
import { recordAuditLog } from "../integrations/audit-log";
import {
  checkDistributedRateLimit,
  resetDistributedRateLimit,
} from "../security/rate-limit";
import {
  EMAIL_VERIFICATION_TTL_MS,
  getAppUrl,
  isProductionEnv,
  PASSWORD_RESET_TTL_MS,
  RATE_LIMITS,
} from "../config";

function getClientIpKey(): string {
  try {
    const h = headers();
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }
    const realIp = h.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 64);
  } catch {
    // Outside Next.js request context
  }
  return "unknown";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const DUMMY_PASSWORD_HASH = "$2a$12$NwraF30b7JtZAOkOowU0BeV33h.hq1PxXvyFm0ZJ.dc0ibqkVg.kW";

export interface WellnessActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  devResetUrl?: string;
  devVerifyUrl?: string;
  requiresVerification?: boolean;
}

async function issueEmailVerificationForUser(user: {
  id: string;
  email: string;
  fullName: string;
}): Promise<{ verifyUrl: string; delivered: boolean }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.userEmailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.userEmailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });
  });

  const verifyUrl = `${getAppUrl()}/verify-email?token=${rawToken}`;
  const emailRes = await sendTransactionalEmail({
    to: user.email,
    subject: `${BRAND.fullName} — Verify your email address`,
    html: `<p>Hi ${user.fullName},</p><p>Please verify your email address to activate your account (valid for 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    text: `Verify your email (valid 24 hours): ${verifyUrl}`,
  });

  return { verifyUrl, delivered: emailRes.delivered };
}

/**
 * Register a new member account with mandatory email verification.
 */
export async function wellnessSignUp(
  rawInput: unknown
): Promise<WellnessActionResult<{ id: string; email: string; fullName: string; role: string }>> {
  try {
    const validation = SignUpSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid registration details.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { fullName, email, phone, password } = validation.data;
    const ip = getClientIpKey();

    const ipRl = await checkDistributedRateLimit(`signup-ip:${ip}`, RATE_LIMITS.signupIp);
    const emailRl = await checkDistributedRateLimit(`signup:${email}`, RATE_LIMITS.signupEmail);
    if (!ipRl.allowed || !emailRl.allowed) {
      return {
        success: false,
        message: "Too many registration attempts. Please try again in a few minutes.",
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });

    if (existingUser) {
      return {
        success: false,
        message: "This email is already registered. Please sign in or use another email.",
      };
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        phone: phone || null,
        passwordHash,
        emailVerifiedAt: null,
        role: "USER",
        status: "ACTIVE",
        tokenVersion: 0,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
    });

    const { verifyUrl } = await issueEmailVerificationForUser(newUser);

    return {
      success: true,
      requiresVerification: true,
      message: "Account created! Please check your email inbox and click the verification link before signing in.",
      devVerifyUrl: !isProductionEnv() ? verifyUrl : undefined,
      data: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
    };
  } catch (error) {
    console.error("[wellnessSignUp Error]:", error);
    return {
      success: false,
      message: "Failed to create account due to a server error. Please try again.",
    };
  }
}

/**
 * Verify email token atomically and start authenticated session.
 */
export async function wellnessVerifyEmailToken(
  rawToken: string
): Promise<WellnessActionResult<{ email: string; role: string }>> {
  const token = (rawToken || "").trim();
  if (!token) {
    return { success: false, message: "Verification token is missing." };
  }

  try {
    const tokenRecord = await prisma.userEmailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: { id: true, email: true, role: true, status: true, deletedAt: true, tokenVersion: true },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt !== null ||
      new Date() > tokenRecord.expiresAt ||
      tokenRecord.user.deletedAt !== null
    ) {
      return {
        success: false,
        message: "This verification link is invalid or has expired. Please request a new one.",
      };
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claim = await tx.userEmailVerificationToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) return null;

      const updated = await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerifiedAt: now },
        select: { id: true, email: true, role: true, status: true, tokenVersion: true },
      });

      await recordAuditLog(
        {
          actorUserId: updated.id,
          action: "EMAIL_VERIFIED",
          entityType: "User",
          entityId: updated.id,
        },
        tx
      );

      return updated;
    });

    if (!verifiedUser) {
      return {
        success: false,
        message: "This verification link has already been used or expired.",
      };
    }

    if (verifiedUser.status === "ACTIVE") {
      const sessionJwt = await createSessionToken({
        userId: verifiedUser.id,
        email: verifiedUser.email,
        role: verifiedUser.role,
        tokenVersion: verifiedUser.tokenVersion,
      });
      await setSessionCookie(sessionJwt);
    }

    return {
      success: true,
      message: "Email verified successfully! Your account is now active.",
      data: { email: verifiedUser.email, role: verifiedUser.role },
    };
  } catch (error) {
    console.error("[wellnessVerifyEmailToken Error]:", error);
    return {
      success: false,
      message: "Failed to verify email address. Please try again.",
    };
  }
}

/**
 * Resend verification link for unverified accounts (generic response prevents enumeration).
 */
export async function wellnessResendVerificationEmail(
  rawEmail: string
): Promise<WellnessActionResult> {
  try {
    const parsed = ForgotPasswordSchema.safeParse({ email: rawEmail });
    if (!parsed.success) {
      return { success: false, message: "Please provide a valid email address." };
    }

    const { email } = parsed.data;
    const ip = getClientIpKey();
    const ipRl = await checkDistributedRateLimit(`verify-ip:${ip}`, RATE_LIMITS.pwdResetIp);
    const emailRl = await checkDistributedRateLimit(`verify:${email}`, RATE_LIMITS.pwdResetEmail);
    if (!ipRl.allowed || !emailRl.allowed) {
      return {
        success: false,
        message: "Too many verification email requests. Please wait 15 minutes.",
      };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true, status: true },
    });

    const genericMsg =
      "If your account exists and is unverified, a new verification link has been sent to your email.";

    if (!user || user.emailVerifiedAt || user.status !== "ACTIVE") {
      return { success: true, message: genericMsg };
    }

    const { verifyUrl } = await issueEmailVerificationForUser(user);
    return {
      success: true,
      message: genericMsg,
      devVerifyUrl: !isProductionEnv() ? verifyUrl : undefined,
    };
  } catch (error) {
    console.error("[wellnessResendVerificationEmail Error]:", error);
    return {
      success: false,
      message: "Failed to resend verification email. Please try again.",
    };
  }
}

/**
 * Member / Superadmin Sign In (enforces verified email).
 */
export async function wellnessSignIn(
  rawInput: unknown
): Promise<WellnessActionResult<{ id: string; email: string; fullName: string; role: string }>> {
  try {
    const validation = SignInSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid sign-in credentials format.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validation.data;
    const ip = getClientIpKey();
    const accountBucket = `signin:${ip}:${email}`;

    const ipRl = await checkDistributedRateLimit(`signin-ip:${ip}`, RATE_LIMITS.signinIp);
    const rl = await checkDistributedRateLimit(accountBucket, RATE_LIMITS.signinAccount);
    if (!ipRl.allowed || !rl.allowed) {
      return {
        success: false,
        message: "Too many sign-in attempts. Please try again after 15 minutes.",
      };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });

    if (!user) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    if (!user.passwordHash) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
      return {
        success: false,
        message: "This account uses Google Sign-In. Please sign in with Google or use Forgot Password to set a password.",
      };
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    await resetDistributedRateLimit(accountBucket);

    if (user.status !== "ACTIVE") {
      return {
        success: false,
        message: "Your account is currently suspended. Please contact the Wellness Administrator.",
      };
    }

    if (!user.emailVerifiedAt) {
      return {
        success: false,
        requiresVerification: true,
        message: "Please verify your email address before signing in. Check your inbox or request a new verification link.",
      };
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await setSessionCookie(token);

    return {
      success: true,
      message: "Signed in successfully.",
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  } catch (error) {
    const errText = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    console.error("[wellnessSignIn Error]:", errText);
    return {
      success: false,
      message: "An unexpected error occurred during sign in. Please try again.",
    };
  }
}

/**
 * Sign Out and clear HttpOnly session cookie.
 */
export async function wellnessSignOut(): Promise<WellnessActionResult> {
  await clearSessionCookie();
  return {
    success: true,
    message: "You have been signed out.",
  };
}

/**
 * Request Password Reset link (transactional token rotation).
 */
export async function wellnessRequestPasswordReset(
  rawInput: unknown
): Promise<WellnessActionResult> {
  try {
    const validation = ForgotPasswordSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid email address format.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email } = validation.data;
    const ip = getClientIpKey();

    const ipRl = await checkDistributedRateLimit(`pwdreset-ip:${ip}`, RATE_LIMITS.pwdResetIp);
    const rl = await checkDistributedRateLimit(`pwdreset:${email}`, RATE_LIMITS.pwdResetEmail);
    if (!ipRl.allowed || !rl.allowed) {
      return {
        success: false,
        message: "Too many password reset attempts. Please wait 15 minutes before requesting again.",
      };
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });

    const genericSuccessMessage =
      "If your email is registered in our system, a password recovery link has been sent.";

    if (!user || user.status !== "ACTIVE") {
      return {
        success: true,
        message: genericSuccessMessage,
      };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.userPasswordResetToken.updateMany({
        where: { userId: user.id, isUsed: false },
        data: { isUsed: true },
      });

      await tx.userPasswordResetToken.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt,
          isUsed: false,
        },
      });
    });

    const appUrl = getAppUrl();
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const emailRes = await sendTransactionalEmail({
      to: email,
      subject: `${BRAND.fullName} — Password Reset Request`,
      html: `<p>Click the link below to reset your password (valid for 15 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      text: `Reset Link (valid for 15 minutes): ${resetUrl}`,
    });

    if (!emailRes.delivered) {
      console.error(`[wellnessRequestPasswordReset] Failed to deliver email via ${emailRes.provider} for userId=${user.id}`);
    }

    return {
      success: true,
      message: genericSuccessMessage,
      devResetUrl: !isProductionEnv() ? resetUrl : undefined,
    };
  } catch (error) {
    console.error("[wellnessRequestPasswordReset Error]:", error);
    return {
      success: false,
      message: "An error occurred while generating password reset request. Please try again.",
    };
  }
}

/**
 * Confirm Password Reset and revoke existing sessions.
 */
export async function wellnessConfirmPasswordReset(
  rawInput: unknown
): Promise<WellnessActionResult> {
  try {
    const validation = ResetPasswordSchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid password reset submission.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { token, newPassword } = validation.data;

    const resetRecord = await prisma.userPasswordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, userId: true, isUsed: true, expiresAt: true },
    });

    if (!resetRecord || resetRecord.isUsed || new Date() > resetRecord.expiresAt) {
      return {
        success: false,
        message: "This password reset link is invalid or has expired. Please request a new one.",
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    const consumed = await prisma.$transaction(async (tx) => {
      const claim = await tx.userPasswordResetToken.updateMany({
        where: { id: resetRecord.id, isUsed: false, expiresAt: { gt: new Date() } },
        data: { isUsed: true },
      });
      if (claim.count !== 1) return false;
      const targetUser = await tx.user.findUnique({
        where: { id: resetRecord.userId },
        select: { emailVerifiedAt: true },
      });
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          emailVerifiedAt: targetUser?.emailVerifiedAt ?? new Date(),
          tokenVersion: { increment: 1 },
        },
      });
      return true;
    });

    if (!consumed) {
      return {
        success: false,
        message: "This password reset link is invalid or has expired. Please request a new one.",
      };
    }

    return {
      success: true,
      message: "Your password has been updated. Please sign in with your new password.",
    };
  } catch (error) {
    console.error("[wellnessConfirmPasswordReset Error]:", error);
    return {
      success: false,
      message: "Failed to update password due to a server error. Please try again.",
    };
  }
}
