"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { prisma } from "../db";
import { BRAND } from "../brand";
import { hashPassword, verifyPassword } from "../security/password";
import {
  createSessionToken,
  getWellnessSession,
  setSessionCookie,
  clearSessionCookie,
} from "../security/session";
import {
  SignUpSchema,
  SignInSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  EmailAuthRequestSchema,
  EmailOtpVerifySchema,
  isUserOnboardingComplete,
} from "../validators/auth";
import { escapeHtml, sendTransactionalEmail } from "../integrations/email-service";
import { recordAuditLog } from "../integrations/audit-log";
import {
  checkDistributedRateLimit,
  resetDistributedRateLimit,
} from "../security/rate-limit";
import {
  EMAIL_VERIFICATION_TTL_MS,
  getAppUrl,
  getJwtSecretKey,
  getSuperadminConfig,
  isProductionEnv,
  PASSWORD_RESET_TTL_MS,
  RATE_LIMITS,
} from "../config";
import { reportCriticalIncident, reportServerError } from "../observability";

async function getClientIpKey(): Promise<string> {
  try {
    const h = await headers();
    const realIp = h.get("x-real-ip")?.trim();
    if (realIp) return realIp.slice(0, 64);
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first) return first.slice(0, 64);
    }
  } catch {
    // Outside Next.js request context
  }
  return "unknown";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateSixDigitOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashEmailOtp(email: string, code: string): string {
  return crypto
    .createHmac("sha256", Buffer.from(getJwtSecretKey()))
    .update(`email-otp:${email.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

const EMAIL_OTP_TTL_MS = 15 * 60 * 1000;

const DUMMY_PASSWORD_HASH = "$2a$12$NwraF30b7JtZAOkOowU0BeV33h.hq1PxXvyFm0ZJ.dc0ibqkVg.kW";

export interface WellnessActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  devResetUrl?: string;
  devVerifyUrl?: string;
  devOtpCode?: string;
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
    html: `<p>Hi ${escapeHtml(user.fullName)},</p><p>Please verify your email address to activate your account (valid for 24 hours):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    text: `Verify your email (valid 24 hours): ${verifyUrl}`,
  });

  return { verifyUrl, delivered: emailRes.delivered };
}

/**
 * Passwordless Email Auth Step 1:
 * Accepts an email address, creates a pending member account if new,
 * and sends BOTH a 6-digit OTP code AND a one-click verification link (valid 15 minutes).
 */
export async function wellnessRequestEmailSignIn(
  rawInput: unknown
): Promise<WellnessActionResult<{ email: string }>> {
  try {
    const normalizedInput =
      typeof rawInput === "string" ? { email: rawInput } : rawInput;
    const validation = EmailAuthRequestSchema.safeParse(normalizedInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Please enter a valid email address.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email } = validation.data;
    const ip = await getClientIpKey();

    const [ipRl, emailRl] = await Promise.all([
      checkDistributedRateLimit(`email-otp-req-ip:${ip}`, {
        maxRequests: 15,
        windowMs: 15 * 60 * 1000,
      }),
      checkDistributedRateLimit(`email-otp-req:${email}`, {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000,
      }),
    ]);

    if (!ipRl.allowed || !emailRl.allowed) {
      return {
        success: false,
        message: "Too many verification requests. Please wait a few minutes before trying again.",
      };
    }

    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (user && user.status !== "ACTIVE") {
      return {
        success: false,
        message: "Your account is currently suspended. Please contact the Wellness Administrator.",
      };
    }

    const superadminEnv = getSuperadminConfig();
    const isSuperadminEmail =
      Boolean(superadminEnv.email) && email.toLowerCase() === superadminEnv.email;

    if (!user && isSuperadminEmail) {
      return {
        success: false,
        message: "Please use password sign-in for administrator access.",
      };
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: "",
          passwordHash: null,
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
          status: true,
        },
      });
    }

    const otpCode = generateSixDigitOtp();
    const rawLinkToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);

    await prisma.$transaction(async (tx) => {
      await tx.userEmailVerificationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.userEmailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashEmailOtp(user.email, otpCode),
          expiresAt,
        },
      });
      await tx.userEmailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawLinkToken),
          expiresAt,
        },
      });
    });

    const verifyUrl = `${getAppUrl()}/verify-email?token=${rawLinkToken}`;
    const greeting = user.fullName.trim()
      ? `Hi ${escapeHtml(user.fullName.trim())},`
      : "Hi,";

    const emailRes = await sendTransactionalEmail({
      to: user.email,
      subject: `${otpCode} is your ${BRAND.fullName} verification code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #09090b; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 14px; margin: 0 0 12px;">${greeting}</p>
          <p style="font-size: 14px; color: #52525b; margin: 0 0 20px;">Use this 6-digit verification code to sign in to ${escapeHtml(BRAND.fullName)} (valid for 15 minutes):</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 0.25em; text-align: center; padding: 16px; background: #f4f4f5; border-radius: 12px; margin: 0 0 20px;">${otpCode}</div>
          <p style="font-size: 13px; color: #52525b; margin: 0 0 12px;">Or tap the button below to verify directly:</p>
          <p style="margin: 0 0 20px;"><a href="${verifyUrl}" style="display: inline-block; background: #09090b; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 999px;">Continue to ${escapeHtml(BRAND.name)}</a></p>
          <p style="font-size: 11px; color: #a1a1aa; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your ${BRAND.fullName} verification code is: ${otpCode} (valid 15 minutes). Or verify via link: ${verifyUrl}`,
    });

    if (!emailRes.delivered) {
      reportCriticalIncident(
        "email",
        "email_otp_delivery_failed",
        "Failed to deliver email OTP verification",
        "error",
        { userId: user.id, provider: emailRes.provider }
      );
      return {
        success: false,
        message: "We could not send the verification email right now. Please try again in a moment.",
      };
    }

    return {
      success: true,
      requiresVerification: true,
      message: "Verification code sent! Check your email inbox.",
      data: { email: user.email },
      devOtpCode: !isProductionEnv() ? otpCode : undefined,
      devVerifyUrl: !isProductionEnv() ? verifyUrl : undefined,
    };
  } catch (error) {
    reportServerError("auth", "request_email_signin", error);
    return {
      success: false,
      message: "Failed to send verification code. Please try again.",
    };
  }
}

/**
 * Passwordless Email Auth Step 2:
 * Verifies the 6-digit OTP code atomically, issues session cookie,
 * and signals whether the member must complete onboarding first.
 */
export async function wellnessVerifyEmailOtp(
  rawInput: unknown
): Promise<
  WellnessActionResult<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    needsOnboarding: boolean;
  }>
> {
  try {
    const validation = EmailOtpVerifySchema.safeParse(rawInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Please enter a valid 6-digit verification code.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email, code } = validation.data;
    const ip = await getClientIpKey();
    const emailBucket = `email-otp-verify:${email}`;
    const ipBucket = `email-otp-verify-ip:${ip}`;

    const [ipRl, emailRl] = await Promise.all([
      checkDistributedRateLimit(ipBucket, { maxRequests: 20, windowMs: 15 * 60 * 1000 }),
      checkDistributedRateLimit(emailBucket, { maxRequests: 6, windowMs: 15 * 60 * 1000 }),
    ]);
    if (!ipRl.allowed || !emailRl.allowed) {
      return {
        success: false,
        message: "Too many invalid attempts. Please wait 15 minutes or request a new code.",
      };
    }

    const tokenRecord = await prisma.userEmailVerificationToken.findUnique({
      where: { tokenHash: hashEmailOtp(email, code) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            birthDate: true,
            gender: true,
            phone: true,
            city: true,
            emailVerifiedAt: true,
            role: true,
            status: true,
            deletedAt: true,
            tokenVersion: true,
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.user.deletedAt !== null ||
      tokenRecord.user.email.toLowerCase() !== email ||
      tokenRecord.usedAt !== null ||
      new Date() > tokenRecord.expiresAt
    ) {
      return {
        success: false,
        message: "Invalid or expired verification code. Please check your email or request a new code.",
      };
    }

    if (tokenRecord.user.status !== "ACTIVE") {
      return {
        success: false,
        message: "Your account is currently suspended. Please contact the Wellness Administrator.",
      };
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claim = await tx.userEmailVerificationToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) return null;

      // Invalidate any sibling tokens (such as the paired magic link) for this user
      await tx.userEmailVerificationToken.updateMany({
        where: { userId: tokenRecord.userId, usedAt: null },
        data: { usedAt: now },
      });

      const updated = await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? now },
        select: {
          id: true,
          email: true,
          fullName: true,
          birthDate: true,
          gender: true,
          phone: true,
          city: true,
          role: true,
          status: true,
          tokenVersion: true,
        },
      });

      await tx.userProgressShare.updateMany({
        where: {
          viewerEmail: updated.email.trim().toLowerCase(),
          viewerUserId: null,
          status: "ACTIVE",
        },
        data: { viewerUserId: updated.id },
      });

      await recordAuditLog(
        {
          actorUserId: updated.id,
          action: "EMAIL_OTP_SIGN_IN",
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
        message: "This verification code has already been used. Please request a new code.",
      };
    }

    await resetDistributedRateLimit(emailBucket);

    const sessionJwt = await createSessionToken({
      userId: verifiedUser.id,
      email: verifiedUser.email,
      role: verifiedUser.role,
      tokenVersion: verifiedUser.tokenVersion,
    });
    await setSessionCookie(sessionJwt);

    const needsOnboarding = !isUserOnboardingComplete(verifiedUser);

    return {
      success: true,
      message: "Email verified! Signing you in...",
      data: {
        id: verifiedUser.id,
        email: verifiedUser.email,
        fullName: verifiedUser.fullName,
        role: verifiedUser.role,
        needsOnboarding,
      },
    };
  } catch (error) {
    reportServerError("auth", "verify_email_otp", error);
    return {
      success: false,
      message: "Failed to verify code. Please try again.",
    };
  }
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
    const ip = await getClientIpKey();

    const [ipRl, emailRl] = await Promise.all([
      checkDistributedRateLimit(`signup-ip:${ip}`, RATE_LIMITS.signupIp),
      checkDistributedRateLimit(`signup:${email}`, RATE_LIMITS.signupEmail),
    ]);
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
      if (!existingUser.emailVerifiedAt) {
        const { verifyUrl, delivered } = await issueEmailVerificationForUser(existingUser);
        if (!delivered) {
          reportCriticalIncident("email", "verification_email_failed", "Failed to deliver verification email on re-signup", "error", { userId: existingUser.id });
        }
        return {
          success: false,
          requiresVerification: true,
          devVerifyUrl: !isProductionEnv() ? verifyUrl : undefined,
          message:
            "This email is already registered but not yet verified. We have sent a fresh verification link.",
        };
      }
      return {
        success: false,
        message: "This email is already registered. Please sign in or use another email.",
      };
    }

    const passwordHash = await hashPassword(password);
    const superadminEnv = getSuperadminConfig();
    const isSuperadminEmail =
      Boolean(superadminEnv.email) && email.toLowerCase() === superadminEnv.email;

    if (isSuperadminEmail) {
      return {
        success: false,
        message: "This email is reserved for platform administration. Please sign in directly.",
      };
    }

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
        tokenVersion: true,
      },
    });

    const { verifyUrl, delivered } = await issueEmailVerificationForUser(newUser);
    if (!delivered) {
      reportCriticalIncident("email", "verification_email_failed", "Failed to deliver verification email on signup", "error", { userId: newUser.id });
    }

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
    reportServerError("auth", "signup", error);
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
): Promise<WellnessActionResult<{ email: string; role: string; needsOnboarding?: boolean }>> {
  const token = (rawToken || "").trim();
  if (!token) {
    return { success: false, message: "Verification token is missing." };
  }

  try {
    const tokenRecord = await prisma.userEmailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            birthDate: true,
            gender: true,
            phone: true,
            city: true,
            emailVerifiedAt: true,
            role: true,
            status: true,
            deletedAt: true,
            tokenVersion: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.user.deletedAt !== null) {
      return {
        success: false,
        message: "This verification link is invalid or has expired. Please request a new one.",
      };
    }

    // Idempotent handling: if an email scanner prefetched the link or user clicked twice,
    // succeed gracefully when the user's email is already verified.
    if (tokenRecord.usedAt !== null) {
      if (tokenRecord.user.emailVerifiedAt) {
        if (tokenRecord.user.status === "ACTIVE") {
          try {
            const sessionJwt = await createSessionToken({
              userId: tokenRecord.user.id,
              email: tokenRecord.user.email,
              role: tokenRecord.user.role,
              tokenVersion: tokenRecord.user.tokenVersion,
            });
            await setSessionCookie(sessionJwt);
          } catch {
            // Safe fallback when invoked from a Server Component render
          }
        }
        return {
          success: true,
          message: "Email verified successfully! Your account is active.",
          data: {
            email: tokenRecord.user.email,
            role: tokenRecord.user.role,
            needsOnboarding: !isUserOnboardingComplete(tokenRecord.user),
          },
        };
      }
      return {
        success: false,
        message: "This verification link has already been used. Please request a new one.",
      };
    }

    if (new Date() > tokenRecord.expiresAt) {
      return {
        success: false,
        message: "This verification link has expired. Please request a new one.",
      };
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claim = await tx.userEmailVerificationToken.updateMany({
        where: { id: tokenRecord.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claim.count !== 1) return null;

      await tx.userEmailVerificationToken.updateMany({
        where: { userId: tokenRecord.userId, usedAt: null },
        data: { usedAt: now },
      });

      const updated = await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { emailVerifiedAt: tokenRecord.user.emailVerifiedAt ?? now },
        select: {
          id: true,
          email: true,
          fullName: true,
          birthDate: true,
          gender: true,
          phone: true,
          city: true,
          role: true,
          status: true,
          tokenVersion: true,
        },
      });

      await tx.userProgressShare.updateMany({
        where: {
          viewerEmail: updated.email.trim().toLowerCase(),
          viewerUserId: null,
          status: "ACTIVE",
        },
        data: { viewerUserId: updated.id },
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
        success: true,
        message: "Email verified successfully! Your account is active.",
        data: {
          email: tokenRecord.user.email,
          role: tokenRecord.user.role,
          needsOnboarding: !isUserOnboardingComplete(tokenRecord.user),
        },
      };
    }

    if (verifiedUser.status === "ACTIVE") {
      try {
        const sessionJwt = await createSessionToken({
          userId: verifiedUser.id,
          email: verifiedUser.email,
          role: verifiedUser.role,
          tokenVersion: verifiedUser.tokenVersion,
        });
        await setSessionCookie(sessionJwt);
      } catch {
        // Safe fallback when invoked from a Server Component render
      }
    }

    return {
      success: true,
      message: "Email verified successfully! Your account is now active.",
      data: {
        email: verifiedUser.email,
        role: verifiedUser.role,
        needsOnboarding: !isUserOnboardingComplete(verifiedUser),
      },
    };
  } catch (error) {
    reportServerError("auth", "verify_email", error);
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
    const ip = await getClientIpKey();
    const [ipRl, emailRl] = await Promise.all([
      checkDistributedRateLimit(`verify-ip:${ip}`, RATE_LIMITS.pwdResetIp),
      checkDistributedRateLimit(`verify:${email}`, RATE_LIMITS.pwdResetEmail),
    ]);
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

    const { verifyUrl, delivered } = await issueEmailVerificationForUser(user);
    if (!delivered) {
      reportCriticalIncident("email", "verification_email_failed", "Failed to resend verification email", "error", { userId: user.id });
    }
    return {
      success: true,
      message: genericMsg,
      devVerifyUrl: !isProductionEnv() ? verifyUrl : undefined,
    };
  } catch (error) {
    reportServerError("auth", "resend_verification", error);
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
): Promise<
  WellnessActionResult<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    needsOnboarding?: boolean;
  }>
> {
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
    const ip = await getClientIpKey();
    const accountBucket = `signin:${ip}:${email}`;
    const emailBucket = `signin-email:${email}`;

    const [ipRl, rl, emailRl] = await Promise.all([
      checkDistributedRateLimit(`signin-ip:${ip}`, RATE_LIMITS.signinIp),
      checkDistributedRateLimit(accountBucket, RATE_LIMITS.signinAccount),
      checkDistributedRateLimit(emailBucket, { maxRequests: 12, windowMs: 15 * 60 * 1000 }),
    ]);
    if (!ipRl.allowed || !rl.allowed || !emailRl.allowed) {
      return {
        success: false,
        message: "Too many sign-in attempts. Please try again after 15 minutes.",
      };
    }

    let user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    });

    const superadminEnv = getSuperadminConfig();
    const isConfiguredSuperadminEmail =
      Boolean(superadminEnv.email) && email.trim().toLowerCase() === superadminEnv.email;

    // Best-practice Bootstrap-Only Superadmin pattern:
    // 1. If the Superadmin account does not exist yet in DB (or has no passwordHash), bootstrap it once using SUPERADMIN_PASSWORD from env.
    // 2. Once the account exists in DB with a bcrypt passwordHash, verify against the DB hash so in-app password changes & resets work normally.
    if (!user && isConfiguredSuperadminEmail && superadminEnv.password) {
      const a = Buffer.from(password, "utf8");
      const b = Buffer.from(superadminEnv.password, "utf8");
      const envMatch = a.length === b.length && crypto.timingSafeEqual(a, b);

      if (!envMatch) {
        await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
        return {
          success: false,
          message: "Invalid email or password.",
        };
      }

      const syncedHash = await hashPassword(superadminEnv.password);
      user = await prisma.user.create({
        data: {
          email: superadminEnv.email,
          emailVerifiedAt: new Date(),
          fullName: superadminEnv.fullName,
          passwordHash: syncedHash,
          role: "SUPERADMIN",
          status: "ACTIVE",
          tokenVersion: 0,
        },
      });
    } else {
      if (!user) {
        await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
        return {
          success: false,
          message: "Invalid email or password.",
        };
      }

      if (!user.passwordHash) {
        if (isConfiguredSuperadminEmail && superadminEnv.password) {
          const a = Buffer.from(password, "utf8");
          const b = Buffer.from(superadminEnv.password, "utf8");
          if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
            const syncedHash = await hashPassword(superadminEnv.password);
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                passwordHash: syncedHash,
                role: "SUPERADMIN",
                status: "ACTIVE",
                emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
              },
            });
          } else {
            await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
            return {
              success: false,
              message: "Invalid email or password.",
            };
          }
        } else {
          await verifyPassword(password, DUMMY_PASSWORD_HASH).catch(() => false);
          return {
            success: false,
            message: "This account uses Google Sign-In. Please sign in with Google or use Forgot Password to set a password.",
          };
        }
      } else {
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          return {
            success: false,
            message: "Invalid email or password.",
          };
        }
        if (isConfiguredSuperadminEmail && (user.role !== "SUPERADMIN" || !user.emailVerifiedAt)) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              role: "SUPERADMIN",
              emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
              organizationId: null,
              coachProfileId: null,
            },
          });
        }
      }
    }

    await Promise.all([
      resetDistributedRateLimit(accountBucket),
      resetDistributedRateLimit(emailBucket),
    ]);

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
        needsOnboarding: !isUserOnboardingComplete(user),
      },
    };
  } catch (error) {
    reportServerError("auth", "signin", error);
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
  try {
    const session = await getWellnessSession();
    if (session?.userId) {
      await prisma.user.updateMany({
        where: { id: session.userId, deletedAt: null },
        data: { tokenVersion: { increment: 1 } },
      });
    }
  } catch {
    // Always continue clearing cookie even if session lookup/revocation fails
  }
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
    const normalizedInput =
      typeof rawInput === "string" ? { email: rawInput } : rawInput;
    const validation = ForgotPasswordSchema.safeParse(normalizedInput);
    if (!validation.success) {
      return {
        success: false,
        message: "Invalid email address format.",
        errors: validation.error.flatten().fieldErrors,
      };
    }

    const { email } = validation.data;
    const ip = await getClientIpKey();

    const [ipRl, rl] = await Promise.all([
      checkDistributedRateLimit(`pwdreset-ip:${ip}`, RATE_LIMITS.pwdResetIp),
      checkDistributedRateLimit(`pwdreset:${email}`, RATE_LIMITS.pwdResetEmail),
    ]);
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
      reportCriticalIncident("email", "password_reset_email_failed", `Failed to deliver password reset email via ${emailRes.provider}`, "error", { userId: user.id, provider: emailRes.provider });
    }

    return {
      success: true,
      message: genericSuccessMessage,
      devResetUrl: !isProductionEnv() ? resetUrl : undefined,
    };
  } catch (error) {
    reportServerError("auth", "request_password_reset", error);
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
        select: { email: true, emailVerifiedAt: true },
      });
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash: newPasswordHash,
          emailVerifiedAt: targetUser?.emailVerifiedAt ?? new Date(),
          tokenVersion: { increment: 1 },
        },
      });
      return targetUser?.email || null;
    });

    if (!consumed) {
      return {
        success: false,
        message: "This password reset link is invalid or has expired. Please request a new one.",
      };
    }

    const ip = await getClientIpKey();
    await Promise.all([
      resetDistributedRateLimit(`signin-email:${consumed.toLowerCase()}`),
      resetDistributedRateLimit(`signin:${ip}:${consumed.toLowerCase()}`),
    ]);

    return {
      success: true,
      message: "Your password has been updated. Please sign in with your new password.",
    };
  } catch (error) {
    reportServerError("auth", "confirm_password_reset", error);
    return {
      success: false,
      message: "Failed to update password due to a server error. Please try again.",
    };
  }
}
