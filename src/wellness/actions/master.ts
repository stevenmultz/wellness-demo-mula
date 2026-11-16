"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireAdminAccess, requireSuperadmin } from "../security/guards";
import { isSafePhotoUrl, safeHttpUrl, safeMediaUrl } from "../utils/url-safety";
import { WellnessActionResult } from "./auth";

function revalidateAdminMasterRoutes() {
  try {
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/");
  } catch {
    // Ignore outside request context
  }
}

function replaceCsvToken(
  csvValue: string | null | undefined,
  oldToken: string,
  newToken: string
): string | null {
  if (!csvValue) return null;
  const parts = csvValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let changed = false;
  const updated = parts.map((part) => {
    if (part === oldToken) {
      changed = true;
      return newToken;
    }
    return part;
  });
  return changed ? Array.from(new Set(updated)).join(", ") : null;
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
    let [coaches, targetAudiences, categories, equipment, dailyCommitments, organizations] =
      await Promise.all([
        prisma.masterCoach.findMany({ orderBy: { name: "asc" } }),
        prisma.masterTargetAudience.findMany({ orderBy: { name: "asc" } }),
        prisma.masterCategory.findMany({ orderBy: { name: "asc" } }),
        prisma.masterEquipment.findMany({ orderBy: { name: "asc" } }),
        prisma.masterDailyCommitment.findMany({ orderBy: { name: "asc" } }),
        prisma.masterOrganization.findMany({ orderBy: { name: "asc" } }),
      ]);

    // Provide fallback defaults in memory if tables are unseeded (pure read, no database mutation side-effects)
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
        organizations,
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

  const coach = await prisma.masterCoach.create({
    data: { name, title },
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Coach "${coach.name}" added.`, data: coach };
}

export async function wellnessDeleteMasterCoach(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await prisma.programCoach.count({ where: { coachId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Coach because they are currently assigned to ${usedCount} program(s).`,
      };
    }
    await prisma.masterCoach.delete({ where: { id } });
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
  await requireSuperadmin();
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

    if (oldCoach.name !== name || oldCoach.title !== title) {
      const affectedPrograms = await tx.program.findMany({
        where: {
          OR: [
            { coachName: { contains: oldCoach.name } },
            { coachCache: { contains: oldCoach.name } },
          ],
        },
        select: { id: true, coachName: true, coachTitle: true, coachCache: true },
      });

      for (const prog of affectedPrograms) {
        const nextCoachName =
          prog.coachName === oldCoach.name
            ? name
            : replaceCsvToken(prog.coachName, oldCoach.name, name) ?? prog.coachName;
        const nextCoachCache =
          prog.coachCache === oldCoach.name
            ? name
            : replaceCsvToken(prog.coachCache, oldCoach.name, name) ?? prog.coachCache;
        const nextCoachTitle =
          prog.coachName === oldCoach.name || prog.coachTitle === oldCoach.title
            ? title
            : prog.coachTitle;

        if (
          nextCoachName !== prog.coachName ||
          nextCoachCache !== prog.coachCache ||
          nextCoachTitle !== prog.coachTitle
        ) {
          await tx.program.update({
            where: { id: prog.id },
            data: {
              coachName: nextCoachName,
              coachTitle: nextCoachTitle,
              coachCache: nextCoachCache,
            },
          });
        }
      }

      if (oldCoach.name !== name) {
        await tx.programDay.updateMany({
          where: { coachName: oldCoach.name },
          data: { coachName: name },
        });
      }
    }

    return updatedCoach;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Coach "${coach.name}" updated.`, data: coach };
}

type CsvFieldKey = "recommendedFor" | "category" | "equipment";
type CacheFieldKey = "audienceCache" | "categoryCache" | "equipmentCache";
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
  countUsage: () => Promise<number>,
  deleteById: () => Promise<unknown>,
  labels: { titleCase: string; removedMsg: string }
): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await countUsage();
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this ${labels.titleCase} because it is used by ${usedCount} program(s).`,
      };
    }
    await deleteById();
    revalidateAdminMasterRoutes();
    return { success: true, message: labels.removedMsg };
  } catch {
    return {
      success: false,
      message: `Cannot delete this ${labels.titleCase} because it is linked to an existing program.`,
    };
  }
}

async function updateMasterCsvTaxonomyItem(
  input: { id: string; name: string },
  cfg: {
    findById: (id: string) => Promise<{ id: string; name: string } | null>;
    updateName: (tx: TxClient, id: string, name: string) => Promise<{ id: string; name: string }>;
    csvField: CsvFieldKey;
    cacheField: CacheFieldKey;
    syncProgramDays?: boolean;
    minLengthMsg: string;
    notFoundMsg: string;
    updatedPrefix: string;
  }
): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: cfg.minLengthMsg };
  }

  const oldItem = await cfg.findById(input.id);
  if (!oldItem) {
    return { success: false, message: cfg.notFoundMsg };
  }

  const item = await prisma.$transaction(async (tx) => {
    const updatedItem = await cfg.updateName(tx, input.id, name);

    if (oldItem.name !== name) {
      const affectedPrograms = await tx.program.findMany({
        where: {
          OR: [
            { [cfg.csvField]: { contains: oldItem.name } },
            { [cfg.cacheField]: { contains: oldItem.name } },
          ],
        },
        select: {
          id: true,
          recommendedFor: true,
          audienceCache: true,
          category: true,
          categoryCache: true,
          equipment: true,
          equipmentCache: true,
        },
      });

      for (const prog of affectedPrograms) {
        const curCsv = prog[cfg.csvField];
        const curCache = prog[cfg.cacheField];
        const nextCsv =
          curCsv === oldItem.name ? name : replaceCsvToken(curCsv, oldItem.name, name) ?? curCsv;
        const nextCache =
          curCache === oldItem.name ? name : replaceCsvToken(curCache, oldItem.name, name) ?? curCache;

        if (nextCsv !== curCsv || nextCache !== curCache) {
          await tx.program.update({
            where: { id: prog.id },
            data: { [cfg.csvField]: nextCsv, [cfg.cacheField]: nextCache },
          });
        }
      }

      if (cfg.syncProgramDays) {
        await tx.programDay.updateMany({
          where: { recommendedFor: oldItem.name },
          data: { recommendedFor: name },
        });
      }
    }

    return updatedItem;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `${cfg.updatedPrefix} "${item.name}" updated.`, data: item };
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
    () => prisma.programAudience.count({ where: { audienceId: id } }),
    () => prisma.masterTargetAudience.delete({ where: { id } }),
    { titleCase: "Target Audience", removedMsg: "Target audience removed." }
  );
}

export async function wellnessUpdateMasterTargetAudience(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  return updateMasterCsvTaxonomyItem(input, {
    findById: (id) => prisma.masterTargetAudience.findUnique({ where: { id } }),
    updateName: (tx, id, name) => tx.masterTargetAudience.update({ where: { id }, data: { name } }),
    csvField: "recommendedFor",
    cacheField: "audienceCache",
    syncProgramDays: true,
    minLengthMsg: "Target audience must be at least 2 characters.",
    notFoundMsg: "Target audience not found.",
    updatedPrefix: "Target audience",
  });
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
    () => prisma.programCategory.count({ where: { categoryId: id } }),
    () => prisma.masterCategory.delete({ where: { id } }),
    { titleCase: "Category", removedMsg: "Category removed." }
  );
}

export async function wellnessUpdateMasterCategory(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  return updateMasterCsvTaxonomyItem(input, {
    findById: (id) => prisma.masterCategory.findUnique({ where: { id } }),
    updateName: (tx, id, name) => tx.masterCategory.update({ where: { id }, data: { name } }),
    csvField: "category",
    cacheField: "categoryCache",
    minLengthMsg: "Category name must be at least 2 characters.",
    notFoundMsg: "Category not found.",
    updatedPrefix: "Category",
  });
}

// ============================================================================
// MASTER EQUIPMENT CRUD
// ============================================================================

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
    () => prisma.programEquipment.count({ where: { equipmentId: id } }),
    () => prisma.masterEquipment.delete({ where: { id } }),
    { titleCase: "Equipment", removedMsg: "Equipment removed." }
  );
}

export async function wellnessUpdateMasterEquipment(input: {
  id: string;
  name: string;
}): Promise<WellnessActionResult> {
  return updateMasterCsvTaxonomyItem(input, {
    findById: (id) => prisma.masterEquipment.findUnique({ where: { id } }),
    updateName: (tx, id, name) => tx.masterEquipment.update({ where: { id }, data: { name } }),
    csvField: "equipment",
    cacheField: "equipmentCache",
    minLengthMsg: "Equipment name must be at least 2 characters.",
    notFoundMsg: "Equipment not found.",
    updatedPrefix: "Equipment",
  });
}

// ============================================================================
// MASTER DAILY COMMITMENT CRUD
// ============================================================================

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
    () => prisma.program.count({ where: { dailyCommitmentId: id } }),
    () => prisma.masterDailyCommitment.delete({ where: { id } }),
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

  const oldItem = await prisma.masterDailyCommitment.findUnique({ where: { id: input.id } });
  if (!oldItem) {
    return { success: false, message: "Daily commitment not found." };
  }

  const item = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.masterDailyCommitment.update({
      where: { id: input.id },
      data: { name },
    });

    if (oldItem.name !== name) {
      await tx.program.updateMany({
        where: { dailyCommitment: oldItem.name },
        data: { dailyCommitment: name, commitmentCache: name },
      });
    }

    return updatedItem;
  });

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
        logoUrl: rawLogo ? safeMediaUrl(rawLogo) : null,
        websiteUrl: safeWebsite,
        isVerified: input.isVerified ?? true,
      },
    });
    revalidateAdminMasterRoutes();
    return { success: true, message: `Community / Brand "${org.name}" added.`, data: org };
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
    const updated = await prisma.$transaction(async (tx) => {
      const org = await tx.masterOrganization.update({
        where: { id: input.id },
        data: {
          name,
          tagline: input.tagline !== undefined ? (input.tagline?.trim().slice(0, 300) || null) : oldItem.tagline,
          logoUrl:
            input.logoUrl !== undefined
              ? (input.logoUrl?.trim() ? safeMediaUrl(input.logoUrl) : null)
              : oldItem.logoUrl,
          websiteUrl:
            input.websiteUrl !== undefined
              ? (input.websiteUrl?.trim() ? safeHttpUrl(input.websiteUrl) : null)
              : oldItem.websiteUrl,
          isVerified: input.isVerified !== undefined ? input.isVerified : oldItem.isVerified,
        },
      });

      if (oldItem.name !== name) {
        await tx.program.updateMany({
          where: { organizationId: org.id },
          data: { organizationCache: name },
        });
      }
      return org;
    });

    revalidateAdminMasterRoutes();
    return { success: true, message: `Community / Brand "${updated.name}" updated.`, data: updated };
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
    const usedCount = await prisma.program.count({ where: { organizationId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Community / Brand because it is linked to ${usedCount} program(s).`,
      };
    }
    await prisma.masterOrganization.delete({ where: { id } });
    revalidateAdminMasterRoutes();
    return { success: true, message: "Community / Brand deleted." };
  } catch {
    return { success: false, message: "Failed to delete Community / Brand." };
  }
}
