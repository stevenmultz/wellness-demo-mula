"use server";

import crypto from "crypto";
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
import { checkRateLimit } from "../security/rate-limit";

/** Reset tokens are stored as SHA-256 digests so a database leak cannot be replayed. */
function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Valid bcrypt hash of a random value, compared against when the account does not exist
// so response time does not reveal which emails are registered.
const DUMMY_PASSWORD_HASH = "$2a$12$NwraF30b7JtZAOkOowU0BeV33h.hq1PxXvyFm0ZJ.dc0ibqkVg.kW";

export interface WellnessActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  devResetUrl?: string;
}

/**
 * Register a new member account.
 * Automatically assigns role = USER and status = ACTIVE.
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

    // Rate limiting: max 5 registration attempts per 15 minutes per email
    const rl = checkRateLimit(`signup:${email}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: "Too many registration attempts. Please try again in a few minutes.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
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
        role: "USER",
        status: "ACTIVE",
        tokenVersion: 0,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tokenVersion: true,
      },
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tokenVersion: newUser.tokenVersion,
    });
    await setSessionCookie(token);

    return {
      success: true,
      message: `Account created! Welcome to ${BRAND.fullName}.`,
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
 * Member / Superadmin Sign In.
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

    // Rate limiting: max 5 failed attempts per 15 minutes per email
    const rl = checkRateLimit(`signin:${email}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: "Too many sign-in attempts. Please try again after 15 minutes.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    if (user.status !== "ACTIVE") {
      return {
        success: false,
        message: "Your account is currently suspended. Please contact the Wellness Administrator.",
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
 * Request Password Reset link (256-bit random token valid for 15 minutes).
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

    // Rate limiting: max 3 password reset requests per 15 minutes per email
    const rl = checkRateLimit(`pwdreset:${email}`, {
      windowMs: 15 * 60 * 1000,
      maxRequests: 3,
    });
    if (!rl.allowed) {
      return {
        success: false,
        message: "Too many password reset attempts. Please wait 15 minutes before requesting again.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const genericSuccessMessage =
      "If your email is registered in our system, a password recovery link has been sent.";

    if (!user || user.status !== "ACTIVE") {
      return {
        success: true,
        message: genericSuccessMessage,
      };
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        token: hashResetToken(token),
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await sendTransactionalEmail({
      to: email,
      subject: `${BRAND.fullName} — Password Reset Request`,
      html: `<p>Click the link below to reset your password (valid for 15 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      text: `Reset Link (valid for 15 minutes): ${resetUrl}`,
    });

    return {
      success: true,
      message: genericSuccessMessage,
      devResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined,
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

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashResetToken(token) },
      select: { id: true, userId: true, used: true, expiresAt: true },
    });

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expiresAt) {
      return {
        success: false,
        message: "This password reset link is invalid or has expired. Please request a new one.",
      };
    }

    const newPasswordHash = await hashPassword(newPassword);

    // Atomically consume the token: only one concurrent request can flip used false -> true.
    const consumed = await prisma.$transaction(async (tx) => {
      const claim = await tx.passwordResetToken.updateMany({
        where: { id: resetRecord.id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });
      if (claim.count !== 1) return false;
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
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
