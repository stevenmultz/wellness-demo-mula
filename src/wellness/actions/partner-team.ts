"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { BRAND } from "../brand";
import { getAppUrl, PASSWORD_RESET_TTL_MS } from "../config";
import { hashPassword } from "../security/password";
import {
  requireAdminAccess,
  requireSuperadmin,
  WellnessForbiddenError,
} from "../security/guards";
import { sendTransactionalEmail } from "../integrations/email-service";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateTempStaffPassword(): string {
  return `Zera${crypto.randomBytes(4).toString("hex").toUpperCase()}9!`;
}

function revalidateTeamRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/coaches");
  } catch {
    // Ignore outside Next.js request context
  }
}

export interface AdminTeamPartnerAdminItem {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
}

export interface AdminTeamCoachItem {
  id: string; // User ID
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  coachProfileId: string | null;
  coachName: string | null;
  coachTitle: string | null;
  createdAt: string;
}

export interface AdminTeamPayload {
  callerRole: string;
  callerOrganizationId: string | null;
  callerOrganizationName: string | null;
  organizations: Array<{ id: string; name: string; tagline: string | null; isVerified: boolean }>;
  partnerAdmins: AdminTeamPartnerAdminItem[];
  coaches: AdminTeamCoachItem[];
}

const CreatePartnerAdminSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").max(60),
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  phone: z.string().trim().max(24).optional().nullable(),
  organizationId: z.string().trim().optional().nullable(),
  newOrganizationName: z.string().trim().max(120).optional().nullable(),
  newOrganizationTagline: z.string().trim().max(300).optional().nullable(),
});

const CreatePartnerCoachSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").max(60),
  email: z.string().trim().toLowerCase().email("Invalid email address."),
  phone: z.string().trim().max(24).optional().nullable(),
  coachTitle: z.string().trim().min(2, "Specialization / title is required.").max(80),
  organizationId: z.string().trim().optional().nullable(),
});

const UpdateCoachProfileSchema = z.object({
  coachProfileId: z.string().trim().min(1),
  name: z.string().trim().min(2, "Coach name must be at least 2 characters.").max(60),
  title: z.string().trim().min(2, "Coach title must be at least 2 characters.").max(80),
});

/**
 * Loads Partner Admin & Coach team accounts strictly scoped to caller role:
 * - SUPERADMIN sees all organizations, partner admins, and coaches.
 * - PARTNER_ADMIN sees ONLY their organization and COACH accounts inside that organization.
 * - COACH and USER are strictly forbidden.
 */
export async function wellnessGetAdminTeamData(): Promise<WellnessActionResult<AdminTeamPayload>> {
  const session = await requireAdminAccess();

  if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
    throw new WellnessForbiddenError("Only Superadmin or Partner Admin can access team management.");
  }

  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return {
      success: true,
      message: "Partner Admin is not linked to an organization yet.",
      data: {
        callerRole: session.role,
        callerOrganizationId: null,
        callerOrganizationName: null,
        organizations: [],
        partnerAdmins: [],
        coaches: [],
      },
    };
  }

  const orgWhere =
    session.role === "SUPERADMIN"
      ? undefined
      : { id: session.organizationId! };

  const coachUserWhere =
    session.role === "SUPERADMIN"
      ? { role: "COACH" as const, deletedAt: null }
      : { role: "COACH" as const, organizationId: session.organizationId!, deletedAt: null };

  const [organizations, partnerAdminsRaw, coachesRaw] = await Promise.all([
    prisma.masterOrganization.findMany({
      where: orgWhere,
      select: { id: true, name: true, tagline: true, isVerified: true },
      orderBy: { name: "asc" },
    }),
    session.role === "SUPERADMIN"
      ? prisma.user.findMany({
          where: { role: "PARTNER_ADMIN", deletedAt: null },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
            organizationId: true,
            organization: { select: { name: true } },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: coachUserWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        organizationId: true,
        organization: { select: { name: true } },
        coachProfileId: true,
        coachProfile: { select: { name: true, title: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    success: true,
    data: {
      callerRole: session.role,
      callerOrganizationId: session.organizationId,
      callerOrganizationName: session.organizationName,
      organizations,
      partnerAdmins: partnerAdminsRaw.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status,
        organizationId: u.organizationId,
        organizationName: u.organization?.name ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
      coaches: coachesRaw.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status,
        organizationId: u.organizationId,
        organizationName: u.organization?.name ?? null,
        coachProfileId: u.coachProfileId,
        coachName: u.coachProfile?.name ?? null,
        coachTitle: u.coachProfile?.title ?? null,
        createdAt: u.createdAt.toISOString(),
      })),
    },
  };
}

/**
 * SUPERADMIN ONLY: Create a new Partner Admin account (linked to an existing or newly created MasterOrganization).
 */
export async function wellnessSuperadminCreatePartnerAdmin(
  rawInput: unknown
): Promise<WellnessActionResult<{ user: AdminTeamPartnerAdminItem; temporaryPassword: string }>> {
  const admin = await requireSuperadmin();

  const parsed = CreatePartnerAdminSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid Partner Admin details.",
    };
  }

  const { fullName, email, phone, organizationId, newOrganizationName, newOrganizationTagline } =
    parsed.data;

  const trimmedExistingOrgId = organizationId?.trim() || "";
  const trimmedNewOrgName = newOrganizationName?.trim() || "";

  if (!trimmedExistingOrgId && trimmedNewOrgName.length < 2) {
    return {
      success: false,
      message: "Please select an existing Partner organization or enter a new Partner name.",
    };
  }

  const tempPassword = generateTempStaffPassword();
  const passwordHash = await hashPassword(tempPassword);
  const setupToken = crypto.randomBytes(32).toString("hex");
  const setupTokenExpires = new Date(Date.now() + Math.max(PASSWORD_RESET_TTL_MS, 24 * 60 * 60 * 1000));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
        select: { id: true },
      });
      if (existingUser) {
        throw new Error("An active account with this email already exists.");
      }

      let resolvedOrg: { id: string; name: string };
      if (trimmedExistingOrgId) {
        const foundOrg = await tx.masterOrganization.findUnique({
          where: { id: trimmedExistingOrgId },
          select: { id: true, name: true },
        });
        if (!foundOrg) {
          throw new Error("Selected Partner organization does not exist.");
        }
        resolvedOrg = foundOrg;
      } else {
        const baseSlug = trimmedNewOrgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
        const slug = `${baseSlug || "partner"}-${crypto.randomBytes(2).toString("hex")}`;
        const duplicateOrg = await tx.masterOrganization.findFirst({
          where: { name: { equals: trimmedNewOrgName, mode: "insensitive" } },
          select: { id: true },
        });
        if (duplicateOrg) {
          throw new Error(`Partner "${trimmedNewOrgName}" already exists. Select it from the list instead.`);
        }
        resolvedOrg = await tx.masterOrganization.create({
          data: {
            name: trimmedNewOrgName,
            slug,
            tagline: newOrganizationTagline?.trim() || null,
            isVerified: true,
          },
          select: { id: true, name: true },
        });
      }

      const newUser = await tx.user.create({
        data: {
          fullName,
          email,
          phone: phone?.trim() || null,
          passwordHash,
          emailVerifiedAt: new Date(),
          role: "PARTNER_ADMIN",
          status: "ACTIVE",
          organizationId: resolvedOrg.id,
          coachProfileId: null,
          tokenVersion: 0,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          organizationId: true,
          createdAt: true,
        },
      });

      await tx.userPasswordResetToken.create({
        data: {
          tokenHash: hashToken(setupToken),
          userId: newUser.id,
          expiresAt: setupTokenExpires,
          isUsed: false,
        },
      });

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: "ADMIN_CREATE_PARTNER_ADMIN",
          entityType: "User",
          entityId: newUser.id,
          metadata: { organizationId: resolvedOrg.id, organizationName: resolvedOrg.name },
        },
        tx
      );

      return { newUser, resolvedOrg };
    });

    const setupUrl = `${getAppUrl()}/reset-password?token=${setupToken}`;
    await sendTransactionalEmail({
      to: created.newUser.email,
      subject: `${BRAND.fullName} — Partner Admin Account Ready`,
      html: `<p>Hi ${created.newUser.fullName},</p><p>Your Partner Admin account for <strong>${created.resolvedOrg.name}</strong> has been created.</p><p>Set your personal password here (valid for 24 hours): <a href="${setupUrl}">${setupUrl}</a></p>`,
      text: `Your Partner Admin account for ${created.resolvedOrg.name} is ready. Set your password: ${setupUrl}`,
    }).catch(() => null);

    revalidateTeamRoutes();

    return {
      success: true,
      message: `Partner Admin "${created.newUser.fullName}" created for ${created.resolvedOrg.name}.`,
      data: {
        user: {
          id: created.newUser.id,
          fullName: created.newUser.fullName,
          email: created.newUser.email,
          phone: created.newUser.phone,
          status: created.newUser.status,
          organizationId: created.resolvedOrg.id,
          organizationName: created.resolvedOrg.name,
          createdAt: created.newUser.createdAt.toISOString(),
        },
        temporaryPassword: tempPassword,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create Partner Admin account.",
    };
  }
}

/**
 * PARTNER_ADMIN (locked to own organizationId) or SUPERADMIN:
 * Creates a MasterCoach profile + COACH user account atomically.
 * COACH and USER callers are strictly forbidden.
 */
export async function wellnessCreatePartnerCoachAccount(
  rawInput: unknown
): Promise<WellnessActionResult<{ coach: AdminTeamCoachItem; temporaryPassword: string }>> {
  const session = await requireAdminAccess();

  if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
    return {
      success: false,
      message: "Forbidden: Only Superadmin or Partner Admin can create Coach accounts.",
    };
  }

  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return {
      success: false,
      message: "Your Partner Admin account is not linked to an organization yet.",
    };
  }

  const parsed = CreatePartnerCoachSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid Coach details.",
    };
  }

  const { fullName, email, phone, coachTitle, organizationId } = parsed.data;

  // Enforce strict tenant isolation: PARTNER_ADMIN can ONLY assign their own organizationId
  const targetOrgId =
    session.role === "SUPERADMIN" ? organizationId?.trim() || null : session.organizationId!;

  const tempPassword = generateTempStaffPassword();
  const passwordHash = await hashPassword(tempPassword);
  const setupToken = crypto.randomBytes(32).toString("hex");
  const setupTokenExpires = new Date(Date.now() + Math.max(PASSWORD_RESET_TTL_MS, 24 * 60 * 60 * 1000));

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
        select: { id: true },
      });
      if (existingUser) {
        throw new Error("An active account with this email already exists.");
      }

      let orgName: string | null = null;
      if (targetOrgId) {
        const org = await tx.masterOrganization.findUnique({
          where: { id: targetOrgId },
          select: { id: true, name: true },
        });
        if (!org) {
          throw new Error("Target organization does not exist.");
        }
        orgName = org.name;
      }

      const masterCoach = await tx.masterCoach.create({
        data: {
          name: fullName,
          title: coachTitle,
          organizationId: targetOrgId,
        },
        select: { id: true, name: true, title: true },
      });

      const newUser = await tx.user.create({
        data: {
          fullName,
          email,
          phone: phone?.trim() || null,
          passwordHash,
          emailVerifiedAt: new Date(),
          role: "COACH",
          status: "ACTIVE",
          organizationId: targetOrgId,
          coachProfileId: masterCoach.id,
          tokenVersion: 0,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          status: true,
          organizationId: true,
          coachProfileId: true,
          createdAt: true,
        },
      });

      await tx.userPasswordResetToken.create({
        data: {
          tokenHash: hashToken(setupToken),
          userId: newUser.id,
          expiresAt: setupTokenExpires,
          isUsed: false,
        },
      });

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "ADMIN_CREATE_COACH_ACCOUNT",
          entityType: "User",
          entityId: newUser.id,
          metadata: { organizationId: targetOrgId, coachProfileId: masterCoach.id },
        },
        tx
      );

      return { newUser, masterCoach, orgName };
    });

    const setupUrl = `${getAppUrl()}/reset-password?token=${setupToken}`;
    await sendTransactionalEmail({
      to: created.newUser.email,
      subject: `${BRAND.fullName} — Coach Account Ready`,
      html: `<p>Hi ${created.newUser.fullName},</p><p>Your Coach account${created.orgName ? ` for <strong>${created.orgName}</strong>` : ""} has been created.</p><p>Set your personal password here (valid for 24 hours): <a href="${setupUrl}">${setupUrl}</a></p>`,
      text: `Your Coach account is ready. Set your password: ${setupUrl}`,
    }).catch(() => null);

    revalidateTeamRoutes();

    return {
      success: true,
      message: `Coach account "${created.newUser.fullName}" created.`,
      data: {
        coach: {
          id: created.newUser.id,
          fullName: created.newUser.fullName,
          email: created.newUser.email,
          phone: created.newUser.phone,
          status: created.newUser.status,
          organizationId: created.newUser.organizationId,
          organizationName: created.orgName,
          coachProfileId: created.masterCoach.id,
          coachName: created.masterCoach.name,
          coachTitle: created.masterCoach.title,
          createdAt: created.newUser.createdAt.toISOString(),
        },
        temporaryPassword: tempPassword,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create Coach account.",
    };
  }
}

/**
 * Allows SUPERADMIN or the owning PARTNER_ADMIN to suspend/activate a COACH inside their organization.
 */
export async function wellnessTogglePartnerCoachStatus(
  targetUserId: string,
  newStatus: "ACTIVE" | "SUSPENDED"
): Promise<WellnessActionResult> {
  const session = await requireAdminAccess();
  if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
    return { success: false, message: "Forbidden." };
  }
  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return { success: false, message: "Partner Admin is not linked to an organization." };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true, fullName: true, role: true, organizationId: true },
      });
      if (!target || target.role !== "COACH") {
        throw new Error("Coach account not found.");
      }
      if (session.role === "PARTNER_ADMIN" && target.organizationId !== session.organizationId) {
        throw new Error("Forbidden: This Coach belongs to another organization.");
      }

      const row = await tx.user.update({
        where: { id: target.id },
        data: { status: newStatus, tokenVersion: { increment: 1 } },
        select: { id: true, fullName: true, status: true },
      });

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "PARTNER_UPDATE_COACH_STATUS",
          entityType: "User",
          entityId: target.id,
          metadata: { status: newStatus, organizationId: target.organizationId },
        },
        tx
      );

      return row;
    });

    revalidateTeamRoutes();
    return {
      success: true,
      message: `Coach "${updated.fullName}" is now ${updated.status}.`,
      data: updated,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update Coach status.",
    };
  }
}

/**
 * Allows SUPERADMIN or the owning PARTNER_ADMIN to reset password for a COACH inside their organization.
 */
export async function wellnessResetPartnerCoachPassword(
  targetUserId: string
): Promise<WellnessActionResult<{ temporaryPassword: string }>> {
  const session = await requireAdminAccess();
  if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
    return { success: false, message: "Forbidden." };
  }
  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return { success: false, message: "Partner Admin is not linked to an organization." };
  }

  const tempPassword = generateTempStaffPassword();
  const passwordHash = await hashPassword(tempPassword);

  try {
    const target = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { id: targetUserId, deletedAt: null },
        select: { id: true, fullName: true, role: true, organizationId: true },
      });
      if (!existing || existing.role !== "COACH") {
        throw new Error("Coach account not found.");
      }
      if (session.role === "PARTNER_ADMIN" && existing.organizationId !== session.organizationId) {
        throw new Error("Forbidden: This Coach belongs to another organization.");
      }

      await tx.user.update({
        where: { id: existing.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "PARTNER_RESET_COACH_PASSWORD",
          entityType: "User",
          entityId: existing.id,
          metadata: { organizationId: existing.organizationId },
        },
        tx
      );

      return existing;
    });

    return {
      success: true,
      message: `Temporary password generated for Coach ${target.fullName}.`,
      data: { temporaryPassword: tempPassword },
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to reset Coach password.",
    };
  }
}

/**
 * Allows SUPERADMIN or the owning PARTNER_ADMIN to update a MasterCoach profile inside their organization.
 */
export async function wellnessUpdatePartnerCoachProfile(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAdminAccess();
  if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
    return { success: false, message: "Forbidden." };
  }
  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return { success: false, message: "Partner Admin is not linked to an organization." };
  }

  const parsed = UpdateCoachProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: Object.values(parsed.error.flatten().fieldErrors).flat()[0] || "Invalid Coach profile.",
    };
  }

  const { coachProfileId, name, title } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const coach = await tx.masterCoach.findUnique({ where: { id: coachProfileId } });
      if (!coach) {
        throw new Error("Coach profile not found.");
      }
      if (session.role === "PARTNER_ADMIN" && coach.organizationId !== session.organizationId) {
        throw new Error("Forbidden: This Coach belongs to another organization.");
      }

      const row = await tx.masterCoach.update({
        where: { id: coach.id },
        data: { name, title },
      });

      if (coach.name !== name) {
        await tx.programDay.updateMany({
          where: { coachName: coach.name },
          data: { coachName: name },
        });
      }

      await recordAuditLog(
        {
          actorUserId: session.userId,
          action: "PARTNER_UPDATE_COACH_PROFILE",
          entityType: "MasterCoach",
          entityId: coach.id,
          metadata: { oldName: coach.name, newName: name, organizationId: coach.organizationId },
        },
        tx
      );

      return row;
    });

    revalidateTeamRoutes();
    return {
      success: true,
      message: `Coach profile "${updated.name}" updated.`,
      data: updated,
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update Coach profile.",
    };
  }
}
