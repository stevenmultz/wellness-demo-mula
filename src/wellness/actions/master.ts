"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireAdminAccess, requireSuperadmin } from "../security/guards";
import { isSafePhotoUrl, safeHttpUrl, safeMediaUrl } from "../utils/url-safety";
import { recordAuditLog } from "../integrations/audit-log";
import type { WellnessActionResult } from "./auth";

function revalidateAdminMasterRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/");
  } catch {
    // Ignore outside request context
  }
}

export interface MasterOrganizationItem {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  isVerified: boolean;
}

export interface MasterDataPayload {
  coaches: Array<{ id: string; name: string; title: string }>;
  targetAudiences: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  dailyCommitments: Array<{ id: string; name: string }>;
  organizations: MasterOrganizationItem[];
}

export async function wellnessGetMasterData(): Promise<{
  success: boolean;
  data: MasterDataPayload;
}> {
  try {
    await requireAdminAccess();
    const [coaches, targetAudiences, categories, equipment, dailyCommitments, organizations] =
      await Promise.all([
        prisma.masterCoach.findMany({ orderBy: { name: "asc" } }),
        prisma.masterTargetAudience.findMany({ orderBy: { name: "asc" } }),
        prisma.masterCategory.findMany({ orderBy: { name: "asc" } }),
        prisma.masterEquipment.findMany({ orderBy: { name: "asc" } }),
        prisma.masterDailyCommitment.findMany({ orderBy: { name: "asc" } }),
        prisma.masterOrganization.findMany({ orderBy: { name: "asc" } }),
      ]);

    const effectiveCoaches =
      coaches.length > 0
        ? coaches
        : [
            { id: "mc-1", name: "Marcus Vance", title: "Movement & Mobility Lead" },
            { id: "mc-2", name: "Elena Rostova", title: "Nutrition & Longevity Director" },
            { id: "mc-3", name: "Julian Thorne", title: "Breathwork & Recovery Lead" },
            { id: "mc-4", name: "Dr. Maya Lin", title: "Sleep & Circadian Specialist" },
          ];

    const effectiveCategories =
      categories.length > 0
        ? categories
        : [
            { id: "cat-1", name: "Pilates" },
            { id: "cat-2", name: "Strength & Conditioning" },
            { id: "cat-3", name: "Mobility & Recovery" },
            { id: "cat-4", name: "Breathwork & Mindfulness" },
            { id: "cat-5", name: "Holistic Longevity" },
          ];

    const effectiveAudiences =
      targetAudiences.length > 0
        ? targetAudiences
        : [
            { id: "ta-1", name: "Beginner Friendly" },
            { id: "ta-2", name: "Intermediate Practitioners" },
            { id: "ta-3", name: "Desk Workers & Sedentary" },
            { id: "ta-4", name: "Athletes & High Performers" },
          ];

    const effectiveEquipment =
      equipment.length > 0
        ? equipment
        : [
            { id: "eq-1", name: "No Equipment" },
            { id: "eq-2", name: "Yoga Mat" },
            { id: "eq-3", name: "Resistance Bands" },
            { id: "eq-4", name: "Light Dumbbells" },
            { id: "eq-5", name: "Pilates Foam Roller" },
            { id: "eq-6", name: "Pilates Ball" },
          ];

    const effectiveCommitments =
      dailyCommitments.length > 0
        ? dailyCommitments
        : [
            { id: "dc-1", name: "10 - 15 Mins / Day" },
            { id: "dc-2", name: "15 - 20 Mins / Day" },
            { id: "dc-3", name: "20 - 30 Mins / Day" },
            { id: "dc-4", name: "30 - 45 Mins / Day" },
            { id: "dc-5", name: "45 - 60 Mins / Day" },
          ];

    return {
      success: true,
      data: {
        coaches: effectiveCoaches,
        targetAudiences: effectiveAudiences,
        categories: effectiveCategories,
        equipment: effectiveEquipment,
        dailyCommitments: effectiveCommitments,
        organizations: organizations.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          tagline: o.tagline,
          logoUrl: o.logoPath,
          websiteUrl: o.websiteUrl,
          isVerified: o.isVerified,
        })),
      },
    };
  } catch (error) {
    console.error("Failed to fetch master data:", error);
    return {
      success: false,
      data: {
        coaches: [],
        targetAudiences: [],
        categories: [],
        equipment: [],
        dailyCommitments: [],
        organizations: [],
      },
    };
  }
}

export async function wellnessCreateMasterCoach(input: {
  name: string;
  title: string;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  const title = input.title?.trim();

  if (!name || name.length < 2) {
    return { success: false, message: "Coach name must be at least 2 characters." };
  }
  if (!title || title.length < 2) {
    return { success: false, message: "Coach title must be at least 2 characters." };
  }

  const coach = await prisma.masterCoach.create({ data: { name, title } });
  revalidateAdminMasterRoutes();
  return { success: true, message: `Coach "${coach.name}" added.`, data: coach };
}

export async function wellnessDeleteMasterCoach(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const res = await prisma.$transaction(async (tx) => {
      const usedCount = await tx.programCoach.count({ where: { coachId: id } });
      if (usedCount > 0) {
        return {
          blocked: `Cannot delete this Coach because they are currently assigned to ${usedCount} program(s).`,
        };
      }
      await tx.masterCoach.delete({ where: { id } });
      return { blocked: null };
    });
    if (res.blocked) return { success: false, message: res.blocked };
    revalidateAdminMasterRoutes();
    return { success: true, message: "Coach deleted." };
  } catch {
    return {
      success: false,
      message: "Cannot delete this Coach because they are still linked to an existing program.",
    };
  }
}

export async function wellnessUpdateMasterCoach(input: {
  id: string;
  name: string;
  title: string;
}): Promise<WellnessActionResult> {
  const admin = await requireSuperadmin();
  const name = input.name?.trim();
  const title = input.title?.trim();

  if (!name || name.length < 2) {
    return { success: false, message: "Coach name must be at least 2 characters." };
  }
  if (!title || title.length < 2) {
    return { success: false, message: "Coach title must be at least 2 characters." };
  }

  const oldCoach = await prisma.masterCoach.findUnique({ where: { id: input.id } });
  if (!oldCoach) {
    return { success: false, message: "Coach not found." };
  }

  const coach = await prisma.$transaction(async (tx) => {
    const updatedCoach = await tx.masterCoach.update({
      where: { id: input.id },
      data: { name, title },
    });

    if (oldCoach.name !== name) {
      await tx.programDay.updateMany({
        where: { coachName: oldCoach.name },
        data: { coachName: name },
      });
    }

    await recordAuditLog(
      {
        actorUserId: admin.userId,
        action: "MASTER_COACH_UPDATED",
        entityType: "MasterCoach",
        entityId: input.id,
        metadata: { oldName: oldCoach.name, newName: name },
      },
      tx
    );

    return updatedCoach;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Coach "${coach.name}" updated.`, data: coach };
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function createMasterTaxonomyItem(
  ops: {
    findByName: (name: string) => Promise<{ id: string; name: string } | null>;
    create: (name: string) => Promise<{ id: string; name: string }>;
  },
  nameInput: string,
  labels: { minLengthMsg: string; duplicatePrefix: string; addedPrefix: string }
): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = nameInput?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: labels.minLengthMsg };
  }
  const existing = await ops.findByName(name);
  if (existing) {
    return { success: false, message: `${labels.duplicatePrefix} "${name}" already exists.` };
  }
  const item = await ops.create(name);
  revalidateAdminMasterRoutes();
  return { success: true, message: `${labels.addedPrefix} "${item.name}" added.`, data: item };
}

async function deleteMasterTaxonomyItem(
  runTx: (tx: TxClient) => Promise<{ blocked: string | null }>,
  labels: { titleCase: string; removedMsg: string }
): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const res = await prisma.$transaction(runTx);
    if (res.blocked) return { success: false, message: res.blocked };
    revalidateAdminMasterRoutes();
    return { success: true, message: labels.removedMsg };
  } catch {
    return {
      success: false,
      message: `Cannot delete this ${labels.titleCase} because it is linked to an existing program.`,
    };
  }
}

export async function wellnessCreateMasterTargetAudience(nameInput: string): Promise<WellnessActionResult> {
  return createMasterTaxonomyItem(
    {
      findByName: (name) => prisma.masterTargetAudience.findUnique({ where: { name } }),
      create: (name) => prisma.masterTargetAudience.create({ data: { name } }),
    },
    nameInput,
    {
      minLengthMsg: "Target audience must be at least 2 characters.",
      duplicatePrefix: "Target audience",
      addedPrefix: "Target audience",
    }
  );
}

export async function wellnessDeleteMasterTargetAudience(id: string): Promise<WellnessActionResult> {
  return deleteMasterTaxonomyItem(
    async (tx) => {
      const usedCount = await tx.programAudience.count({ where: { audienceId: id } });
      if (usedCount > 0) {
        return { blocked: `Cannot delete this Target Audience because it is used by ${usedCount} program(s).` };
      }
      await tx.masterTargetAudience.delete({ where: { id } });
      return { blocked: null };
    },
    { titleCase: "Target Audience", removedMsg: "Target audience removed." }
  );
}

export async function wellnessUpdateMasterTargetAudience(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Target audience must be at least 2 characters." };
  }
  const oldItem = await prisma.masterTargetAudience.findUnique({ where: { id: input.id } });
  if (!oldItem) return { success: false, message: "Target audience not found." };

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.masterTargetAudience.update({ where: { id: input.id }, data: { name } });
    if (oldItem.name !== name) {
      await tx.programDay.updateMany({
        where: { recommendedFor: oldItem.name },
        data: { recommendedFor: name },
      });
    }
    return updated;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Target audience "${item.name}" updated.`, data: item };
}

export async function wellnessCreateMasterCategory(nameInput: string): Promise<WellnessActionResult> {
  return createMasterTaxonomyItem(
    {
      findByName: (name) => prisma.masterCategory.findUnique({ where: { name } }),
      create: (name) => prisma.masterCategory.create({ data: { name } }),
    },
    nameInput,
    {
      minLengthMsg: "Category name must be at least 2 characters.",
      duplicatePrefix: "Category",
      addedPrefix: "Category",
    }
  );
}

export async function wellnessDeleteMasterCategory(id: string): Promise<WellnessActionResult> {
  return deleteMasterTaxonomyItem(
    async (tx) => {
      const usedCount = await tx.programCategory.count({ where: { categoryId: id } });
      if (usedCount > 0) {
        return { blocked: `Cannot delete this Category because it is used by ${usedCount} program(s).` };
      }
      await tx.masterCategory.delete({ where: { id } });
      return { blocked: null };
    },
    { titleCase: "Category", removedMsg: "Category removed." }
  );
}

export async function wellnessUpdateMasterCategory(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Category name must be at least 2 characters." };
  }
  const existing = await prisma.masterCategory.findUnique({ where: { id: input.id } });
  if (!existing) return { success: false, message: "Category not found." };

  const item = await prisma.masterCategory.update({ where: { id: input.id }, data: { name } });
  revalidateAdminMasterRoutes();
  return { success: true, message: `Category "${item.name}" updated.`, data: item };
}

export async function wellnessCreateMasterEquipment(nameInput: string): Promise<WellnessActionResult> {
  return createMasterTaxonomyItem(
    {
      findByName: (name) => prisma.masterEquipment.findUnique({ where: { name } }),
      create: (name) => prisma.masterEquipment.create({ data: { name } }),
    },
    nameInput,
    {
      minLengthMsg: "Equipment name must be at least 2 characters.",
      duplicatePrefix: "Equipment",
      addedPrefix: "Equipment",
    }
  );
}

export async function wellnessDeleteMasterEquipment(id: string): Promise<WellnessActionResult> {
  return deleteMasterTaxonomyItem(
    async (tx) => {
      const usedCount = await tx.programEquipment.count({ where: { equipmentId: id } });
      if (usedCount > 0) {
        return { blocked: `Cannot delete this Equipment because it is used by ${usedCount} program(s).` };
      }
      await tx.masterEquipment.delete({ where: { id } });
      return { blocked: null };
    },
    { titleCase: "Equipment", removedMsg: "Equipment removed." }
  );
}

export async function wellnessUpdateMasterEquipment(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Equipment name must be at least 2 characters." };
  }
  const existing = await prisma.masterEquipment.findUnique({ where: { id: input.id } });
  if (!existing) return { success: false, message: "Equipment not found." };

  const item = await prisma.masterEquipment.update({ where: { id: input.id }, data: { name } });
  revalidateAdminMasterRoutes();
  return { success: true, message: `Equipment "${item.name}" updated.`, data: item };
}

export async function wellnessCreateMasterDailyCommitment(nameInput: string): Promise<WellnessActionResult> {
  return createMasterTaxonomyItem(
    {
      findByName: (name) => prisma.masterDailyCommitment.findUnique({ where: { name } }),
      create: (name) => prisma.masterDailyCommitment.create({ data: { name } }),
    },
    nameInput,
    {
      minLengthMsg: "Time commitment must be at least 2 characters.",
      duplicatePrefix: "Daily commitment",
      addedPrefix: "Daily commitment",
    }
  );
}

export async function wellnessDeleteMasterDailyCommitment(id: string): Promise<WellnessActionResult> {
  return deleteMasterTaxonomyItem(
    async (tx) => {
      const usedCount = await tx.program.count({ where: { dailyCommitmentId: id, deletedAt: null } });
      if (usedCount > 0) {
        return { blocked: `Cannot delete this Daily Commitment because it is used by ${usedCount} program(s).` };
      }
      await tx.masterDailyCommitment.delete({ where: { id } });
      return { blocked: null };
    },
    { titleCase: "Daily Commitment", removedMsg: "Daily commitment removed." }
  );
}

export async function wellnessUpdateMasterDailyCommitment(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Time commitment must be at least 2 characters." };
  }
  const existing = await prisma.masterDailyCommitment.findUnique({ where: { id: input.id } });
  if (!existing) return { success: false, message: "Daily commitment not found." };

  const item = await prisma.masterDailyCommitment.update({ where: { id: input.id }, data: { name } });
  revalidateAdminMasterRoutes();
  return { success: true, message: `Daily commitment "${item.name}" updated.`, data: item };
}

export async function wellnessCreateMasterOrganization(input: {
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isVerified?: boolean;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 120) {
    return { success: false, message: "Community / Brand name must be between 2 and 120 characters." };
  }
  const rawLogo = input.logoUrl?.trim() || "";
  if (rawLogo && !isSafePhotoUrl(rawLogo)) {
    return { success: false, message: "Invalid logo URL format." };
  }
  const rawWebsite = input.websiteUrl?.trim() || "";
  const safeWebsite = rawWebsite ? safeHttpUrl(rawWebsite) : null;
  if (rawWebsite && !safeWebsite) {
    return { success: false, message: "Website URL must be a valid http(s) URL." };
  }

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const slug = baseSlug || `org-${Date.now()}`;

  try {
    const existing = await prisma.masterOrganization.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return { success: false, message: `Community / Brand "${name}" already exists.` };
    }

    const org = await prisma.masterOrganization.create({
      data: {
        name,
        slug,
        tagline: input.tagline?.trim().slice(0, 300) || null,
        logoPath: rawLogo ? safeMediaUrl(rawLogo) : null,
        websiteUrl: safeWebsite,
        isVerified: input.isVerified ?? true,
      },
    });
    revalidateAdminMasterRoutes();
    return {
      success: true,
      message: `Community / Brand "${org.name}" added.`,
      data: { ...org, logoUrl: org.logoPath },
    };
  } catch (error) {
    console.error("Failed to create master organization:", error);
    return { success: false, message: "Failed to add Community / Brand." };
  }
}

export async function wellnessUpdateMasterOrganization(input: {
  id: string;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  isVerified?: boolean;
}): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2 || name.length > 120) {
    return { success: false, message: "Community / Brand name must be between 2 and 120 characters." };
  }
  if (input.logoUrl !== undefined && input.logoUrl?.trim() && !isSafePhotoUrl(input.logoUrl)) {
    return { success: false, message: "Invalid logo URL format." };
  }
  if (input.websiteUrl !== undefined && input.websiteUrl?.trim() && !safeHttpUrl(input.websiteUrl)) {
    return { success: false, message: "Website URL must be a valid http(s) URL." };
  }

  const oldItem = await prisma.masterOrganization.findUnique({ where: { id: input.id } });
  if (!oldItem) {
    return { success: false, message: "Community / Brand not found." };
  }

  try {
    const org = await prisma.masterOrganization.update({
      where: { id: input.id },
      data: {
        name,
        tagline: input.tagline !== undefined ? (input.tagline?.trim().slice(0, 300) || null) : oldItem.tagline,
        logoPath:
          input.logoUrl !== undefined
            ? (input.logoUrl?.trim() ? safeMediaUrl(input.logoUrl) : null)
            : oldItem.logoPath,
        websiteUrl:
          input.websiteUrl !== undefined
            ? (input.websiteUrl?.trim() ? safeHttpUrl(input.websiteUrl) : null)
            : oldItem.websiteUrl,
        isVerified: input.isVerified !== undefined ? input.isVerified : oldItem.isVerified,
      },
    });

    revalidateAdminMasterRoutes();
    return {
      success: true,
      message: `Community / Brand "${org.name}" updated.`,
      data: { ...org, logoUrl: org.logoPath },
    };
  } catch (error) {
    console.error("Failed to update master organization:", error);
    return { success: false, message: "Failed to update Community / Brand." };
  }
}

export async function wellnessDeleteMasterOrganization(
  id: string
): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const res = await prisma.$transaction(async (tx) => {
      const usedCount = await tx.program.count({ where: { organizationId: id, deletedAt: null } });
      if (usedCount > 0) {
        return {
          blocked: `Cannot delete this Community / Brand because it is linked to ${usedCount} program(s).`,
        };
      }
      await tx.masterOrganization.delete({ where: { id } });
      return { blocked: null };
    });
    if (res.blocked) return { success: false, message: res.blocked };
    revalidateAdminMasterRoutes();
    return { success: true, message: "Community / Brand deleted." };
  } catch {
    return { success: false, message: "Failed to delete Community / Brand." };
  }
}
