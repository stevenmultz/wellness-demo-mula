import type { Prisma } from "@prisma/client";
import { getSuperadminConfig } from "../config";
import { createSessionToken, setSessionCookie } from "../security/session";
import { buildOAuthLinkUserUpdate } from "../security/oauth-linking";
import { recordAuditLog } from "../integrations/audit-log";

/**
 * Centralized Auth Core Gatekeeper ("Pintu 1").
 *
 * Single source of truth for:
 * - Configured Superadmin email matching & post-verification bootstrap promotion
 * - CWE-287 pre-hijacking defense when claiming an unverified account via OTP, magic link, or OAuth
 * - Linking pending progress shares to newly verified/authenticated users
 * - Unified session JWT creation and HttpOnly cookie issuance
 * - Atomic credential rotation (password update + session revocation + token invalidation + audit)
 */

export function isConfiguredSuperadminEmail(email: string | null | undefined): boolean {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return false;
  const configured = getSuperadminConfig().email;
  return Boolean(configured) && normalized === configured;
}

/**
 * CWE-287 Pre-Hijacking Defense:
 * When an email address is proven via OTP, verification link, or Google OAuth for an account
 * that had never verified its email, any previously attached passwordHash is unproven (could
 * belong to a pre-hijacking attacker) and must be revoked along with existing sessions.
 */
export function buildUnverifiedClaimSecurityPatch(
  user: { emailVerifiedAt: Date | null },
  now: Date = new Date()
) {
  return buildOAuthLinkUserUpdate(user, now);
}

/**
 * Builds the atomic SUPERADMIN promotion patch ONLY after ownership of the configured
 * SUPERADMIN_EMAIL has been cryptographically verified (Email OTP, verification link,
 * Google OAuth verified email, or bootstrap password verification).
 *
 * Always bumps `tokenVersion` on privilege escalation and strips partner/coach scoping.
 */
export function buildSuperadminPromotionPatch(user: {
  email: string;
  role: string;
  fullName?: string | null;
}): {
  role: "SUPERADMIN";
  organizationId: null;
  coachProfileId: null;
  tokenVersion: { increment: 1 };
  fullName?: string;
} | null {
  if (!isConfiguredSuperadminEmail(user.email) || user.role === "SUPERADMIN") {
    return null;
  }
  const superadminCfg = getSuperadminConfig();
  return {
    role: "SUPERADMIN",
    organizationId: null,
    coachProfileId: null,
    tokenVersion: { increment: 1 },
    ...(!user.fullName || !user.fullName.trim() ? { fullName: superadminCfg.fullName } : {}),
  };
}

/**
 * Combines email verification claim + CWE-287 pre-hijack defense + post-verification
 * Superadmin bootstrap promotion into one safe Prisma update payload without conflicting
 * `tokenVersion` increments.
 */
export function buildPostVerificationUserUpdate(
  user: {
    email: string;
    role: string;
    fullName?: string | null;
    emailVerifiedAt: Date | null;
  },
  now: Date = new Date()
): {
  data: Prisma.UserUncheckedUpdateInput;
  promotedToSuperadmin: boolean;
  revokedUnverifiedCredentials: boolean;
} {
  const claimPatch = buildUnverifiedClaimSecurityPatch(user, now);
  const superadminPatch = buildSuperadminPromotionPatch(user);

  const data: Prisma.UserUncheckedUpdateInput = {
    emailVerifiedAt: user.emailVerifiedAt ?? now,
  };

  if (claimPatch) {
    data.emailVerifiedAt = claimPatch.emailVerifiedAt ?? now;
    data.passwordHash = null;
  }

  if (superadminPatch) {
    data.role = superadminPatch.role;
    data.organizationId = null;
    data.coachProfileId = null;
    if (superadminPatch.fullName) {
      data.fullName = superadminPatch.fullName;
    }
  }

  if (claimPatch || superadminPatch) {
    data.tokenVersion = { increment: 1 };
  }

  return {
    data,
    promotedToSuperadmin: Boolean(superadminPatch),
    revokedUnverifiedCredentials: Boolean(claimPatch),
  };
}

/**
 * Links any pending email-based progress share invitations to the verified user.
 */
export async function linkPendingProgressSharesInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const txAny = tx as unknown as {
    userProgressShare?: {
      updateMany?: (args: Prisma.UserProgressShareUpdateManyArgs) => Promise<unknown>;
    };
  };
  if (typeof txAny.userProgressShare?.updateMany === "function") {
    await txAny.userProgressShare.updateMany({
      where: {
        viewerEmail: normalized,
        viewerUserId: null,
        status: "ACTIVE",
      },
      data: { viewerUserId: userId },
    });
  }
}

/**
 * Single canonical session token + HttpOnly cookie issuer across Email OTP,
 * Verification Link, Password Sign-In, Password Change, and Google OAuth.
 */
export async function issueAuthenticatedSession(user: {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}): Promise<string> {
  const jwt = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });
  await setSessionCookie(jwt);
  return jwt;
}

export interface RotateUserCredentialsParams {
  targetUserId: string;
  newPasswordHash: string;
  actorUserId: string;
  auditAction: string;
  auditMetadata?: Prisma.InputJsonValue;
  markEmailVerified?: boolean;
  /**
   * When true (default), verifies the target account is ACTIVE and not soft-deleted
   * inside the transaction before writing credentials.
   */
  requireActive?: boolean;
  /**
   * Optional explicit next tokenVersion (otherwise atomically incremented by 1).
   */
  explicitTokenVersion?: number;
}

/**
 * Atomically updates a user's password hash, invalidates all existing sessions via
 * `tokenVersion`, revokes ALL pending password-reset tokens AND email verification/OTP
 * tokens, and records an immutable AuditLog entry.
 */
export async function rotateUserCredentialsInTx(
  tx: Prisma.TransactionClient,
  params: RotateUserCredentialsParams
): Promise<{ email: string; tokenVersion: number } | null> {
  const now = new Date();
  const txAny = tx as unknown as {
    user?: {
      findUnique?: (args: Prisma.UserFindUniqueArgs) => Promise<{
        id?: string;
        email?: string;
        status?: string;
        deletedAt?: Date | null;
        emailVerifiedAt?: Date | null;
        tokenVersion?: number;
      } | null>;
      update: (args: Prisma.UserUpdateArgs) => Promise<{
        email?: string;
        tokenVersion?: number;
      }>;
    };
    userPasswordResetToken?: {
      updateMany?: (args: Prisma.UserPasswordResetTokenUpdateManyArgs) => Promise<unknown>;
    };
    userEmailVerificationToken?: {
      updateMany?: (args: Prisma.UserEmailVerificationTokenUpdateManyArgs) => Promise<unknown>;
    };
  };

  let existingEmail = "";
  let existingVerifiedAt: Date | null | undefined = undefined;

  if (typeof txAny.user?.findUnique === "function") {
    const existing = await txAny.user.findUnique({
      where: { id: params.targetUserId },
      select: {
        id: true,
        email: true,
        status: true,
        deletedAt: true,
        emailVerifiedAt: true,
        tokenVersion: true,
      },
    });
    if (existing) {
      if (
        params.requireActive !== false &&
        (existing.deletedAt !== null && existing.deletedAt !== undefined)
      ) {
        return null;
      }
      if (
        params.requireActive !== false &&
        existing.status !== undefined &&
        existing.status !== "ACTIVE"
      ) {
        return null;
      }
      existingEmail = existing.email || "";
      existingVerifiedAt = existing.emailVerifiedAt;
    } else if (params.requireActive !== false) {
      return null;
    }
  }

  const updateData: Prisma.UserUpdateInput = {
    passwordHash: params.newPasswordHash,
    tokenVersion:
      typeof params.explicitTokenVersion === "number"
        ? params.explicitTokenVersion
        : { increment: 1 },
    ...(params.markEmailVerified
      ? { emailVerifiedAt: existingVerifiedAt ?? now }
      : {}),
  };

  const updated = await tx.user.update({
    where: { id: params.targetUserId },
    data: updateData,
    select: { email: true, tokenVersion: true },
  });

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

  await recordAuditLog(
    {
      actorUserId: params.actorUserId,
      action: params.auditAction,
      entityType: "User",
      entityId: params.targetUserId,
      metadata: params.auditMetadata,
    },
    tx
  );

  return {
    email: updated?.email || existingEmail,
    tokenVersion:
      typeof updated?.tokenVersion === "number"
        ? updated.tokenVersion
        : typeof params.explicitTokenVersion === "number"
          ? params.explicitTokenVersion
          : 0,
  };
}
