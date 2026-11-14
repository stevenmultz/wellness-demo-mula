"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireSuperadmin } from "../security/guards";
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

export interface MasterDataPayload {
  coaches: Array<{ id: string; name: string; title: string }>;
  targetAudiences: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  equipment: Array<{ id: string; name: string }>;
  dailyCommitments: Array<{ id: string; name: string }>;
}

export async function wellnessGetMasterData(): Promise<{
  success: boolean;
  data: MasterDataPayload;
}> {
  try {
    await requireSuperadmin();
    let [coaches, targetAudiences, categories, equipment, dailyCommitments] =
      await Promise.all([
        prisma.masterCoach.findMany({ orderBy: { name: "asc" } }),
        prisma.masterTargetAudience.findMany({ orderBy: { name: "asc" } }),
        prisma.masterCategory.findMany({ orderBy: { name: "asc" } }),
        prisma.masterEquipment.findMany({ orderBy: { name: "asc" } }),
        prisma.masterDailyCommitment.findMany({ orderBy: { name: "asc" } }),
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

export async function wellnessCreateMasterTargetAudience(nameInput: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = nameInput?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Target audience must be at least 2 characters." };
  }

  const existing = await prisma.masterTargetAudience.findUnique({ where: { name } });
  if (existing) {
    return { success: false, message: `Target audience "${name}" already exists.` };
  }

  const item = await prisma.masterTargetAudience.create({
    data: { name },
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Target audience "${item.name}" added.`, data: item };
}

export async function wellnessDeleteMasterTargetAudience(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await prisma.programAudience.count({ where: { audienceId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Target Audience because it is used by ${usedCount} program(s).`,
      };
    }
    await prisma.masterTargetAudience.delete({ where: { id } });
    revalidateAdminMasterRoutes();
    return { success: true, message: "Target audience removed." };
  } catch {
    return {
      success: false,
      message: "Cannot delete this Target Audience because it is linked to an existing program.",
    };
  }
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
  if (!oldItem) {
    return { success: false, message: "Target audience not found." };
  }

  const item = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.masterTargetAudience.update({
      where: { id: input.id },
      data: { name },
    });

    if (oldItem.name !== name) {
      const affectedPrograms = await tx.program.findMany({
        where: {
          OR: [
            { recommendedFor: { contains: oldItem.name } },
            { audienceCache: { contains: oldItem.name } },
          ],
        },
        select: { id: true, recommendedFor: true, audienceCache: true },
      });

      for (const prog of affectedPrograms) {
        const nextRec =
          prog.recommendedFor === oldItem.name
            ? name
            : replaceCsvToken(prog.recommendedFor, oldItem.name, name) ?? prog.recommendedFor;
        const nextCache =
          prog.audienceCache === oldItem.name
            ? name
            : replaceCsvToken(prog.audienceCache, oldItem.name, name) ?? prog.audienceCache;

        if (nextRec !== prog.recommendedFor || nextCache !== prog.audienceCache) {
          await tx.program.update({
            where: { id: prog.id },
            data: { recommendedFor: nextRec, audienceCache: nextCache },
          });
        }
      }

      await tx.programDay.updateMany({
        where: { recommendedFor: oldItem.name },
        data: { recommendedFor: name },
      });
    }

    return updatedItem;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Target audience "${item.name}" updated.`, data: item };
}

export async function wellnessCreateMasterCategory(nameInput: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = nameInput?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Category name must be at least 2 characters." };
  }

  const existing = await prisma.masterCategory.findUnique({ where: { name } });
  if (existing) {
    return { success: false, message: `Category "${name}" already exists.` };
  }

  const item = await prisma.masterCategory.create({
    data: { name },
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Category "${item.name}" added.`, data: item };
}

export async function wellnessDeleteMasterCategory(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await prisma.programCategory.count({ where: { categoryId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Category because it is used by ${usedCount} program(s).`,
      };
    }
    await prisma.masterCategory.delete({ where: { id } });
    revalidateAdminMasterRoutes();
    return { success: true, message: "Category removed." };
  } catch {
    return {
      success: false,
      message: "Cannot delete this Category because it is linked to an existing program.",
    };
  }
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

  const oldItem = await prisma.masterCategory.findUnique({ where: { id: input.id } });
  if (!oldItem) {
    return { success: false, message: "Category not found." };
  }

  const item = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.masterCategory.update({
      where: { id: input.id },
      data: { name },
    });

    if (oldItem.name !== name) {
      const affectedPrograms = await tx.program.findMany({
        where: {
          OR: [
            { category: { contains: oldItem.name } },
            { categoryCache: { contains: oldItem.name } },
          ],
        },
        select: { id: true, category: true, categoryCache: true },
      });

      for (const prog of affectedPrograms) {
        const nextCat =
          prog.category === oldItem.name
            ? name
            : replaceCsvToken(prog.category, oldItem.name, name) ?? prog.category;
        const nextCache =
          prog.categoryCache === oldItem.name
            ? name
            : replaceCsvToken(prog.categoryCache, oldItem.name, name) ?? prog.categoryCache;

        if (nextCat !== prog.category || nextCache !== prog.categoryCache) {
          await tx.program.update({
            where: { id: prog.id },
            data: { category: nextCat, categoryCache: nextCache },
          });
        }
      }
    }

    return updatedItem;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Category "${item.name}" updated.`, data: item };
}

// ============================================================================
// MASTER EQUIPMENT CRUD
// ============================================================================

export async function wellnessCreateMasterEquipment(nameInput: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = nameInput?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Equipment name must be at least 2 characters." };
  }

  const existing = await prisma.masterEquipment.findUnique({ where: { name } });
  if (existing) {
    return { success: false, message: `Equipment "${name}" already exists.` };
  }

  const item = await prisma.masterEquipment.create({
    data: { name },
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Equipment "${item.name}" added.`, data: item };
}

export async function wellnessDeleteMasterEquipment(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await prisma.programEquipment.count({ where: { equipmentId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Equipment because it is used by ${usedCount} program(s).`,
      };
    }
    await prisma.masterEquipment.delete({ where: { id } });
    revalidateAdminMasterRoutes();
    return { success: true, message: "Equipment removed." };
  } catch {
    return {
      success: false,
      message: "Cannot delete this Equipment because it is linked to an existing program.",
    };
  }
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

  const oldItem = await prisma.masterEquipment.findUnique({ where: { id: input.id } });
  if (!oldItem) {
    return { success: false, message: "Equipment not found." };
  }

  const item = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.masterEquipment.update({
      where: { id: input.id },
      data: { name },
    });

    if (oldItem.name !== name) {
      const affectedPrograms = await tx.program.findMany({
        where: {
          OR: [
            { equipment: { contains: oldItem.name } },
            { equipmentCache: { contains: oldItem.name } },
          ],
        },
        select: { id: true, equipment: true, equipmentCache: true },
      });

      for (const prog of affectedPrograms) {
        const nextEq =
          prog.equipment === oldItem.name
            ? name
            : replaceCsvToken(prog.equipment, oldItem.name, name) ?? prog.equipment;
        const nextCache =
          prog.equipmentCache === oldItem.name
            ? name
            : replaceCsvToken(prog.equipmentCache, oldItem.name, name) ?? prog.equipmentCache;

        if (nextEq !== prog.equipment || nextCache !== prog.equipmentCache) {
          await tx.program.update({
            where: { id: prog.id },
            data: { equipment: nextEq, equipmentCache: nextCache },
          });
        }
      }
    }

    return updatedItem;
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Equipment "${item.name}" updated.`, data: item };
}

// ============================================================================
// MASTER DAILY COMMITMENT CRUD
// ============================================================================

export async function wellnessCreateMasterDailyCommitment(nameInput: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  const name = nameInput?.trim();
  if (!name || name.length < 2) {
    return { success: false, message: "Time commitment must be at least 2 characters." };
  }

  const existing = await prisma.masterDailyCommitment.findUnique({ where: { name } });
  if (existing) {
    return { success: false, message: `Daily commitment "${name}" already exists.` };
  }

  const item = await prisma.masterDailyCommitment.create({
    data: { name },
  });

  revalidateAdminMasterRoutes();
  return { success: true, message: `Daily commitment "${item.name}" added.`, data: item };
}

export async function wellnessDeleteMasterDailyCommitment(id: string): Promise<WellnessActionResult> {
  await requireSuperadmin();
  try {
    const usedCount = await prisma.program.count({ where: { dailyCommitmentId: id } });
    if (usedCount > 0) {
      return {
        success: false,
        message: `Cannot delete this Daily Commitment because it is used by ${usedCount} program(s).`,
      };
    }
    await prisma.masterDailyCommitment.delete({ where: { id } });
    revalidateAdminMasterRoutes();
    return { success: true, message: "Daily commitment removed." };
  } catch {
    return {
      success: false,
      message: "Cannot delete this Daily Commitment because it is linked to an existing program.",
    };
  }
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
