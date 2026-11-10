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
      data: { coaches, targetAudiences, categories, equipment: effectiveEquipment, dailyCommitments: effectiveCommitments },
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

  const coach = await prisma.masterCoach.update({
    where: { id: input.id },
    data: { name, title },
  });

  if (oldCoach.name !== name || oldCoach.title !== title) {
    await prisma.program.updateMany({
      where: { coachName: oldCoach.name },
      data: {
        coachName: name,
        coachTitle: title,
        coachCache: name,
      },
    });
  }

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

  const item = await prisma.masterTargetAudience.update({
    where: { id: input.id },
    data: { name },
  });

  if (oldItem.name !== name) {
    await prisma.program.updateMany({
      where: { recommendedFor: oldItem.name },
      data: { recommendedFor: name, audienceCache: name },
    });
  }

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

  const item = await prisma.masterCategory.update({
    where: { id: input.id },
    data: { name },
  });

  if (oldItem.name !== name) {
    await prisma.program.updateMany({
      where: { category: oldItem.name },
      data: { category: name, categoryCache: name },
    });
  }

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

  const item = await prisma.masterEquipment.update({
    where: { id: input.id },
    data: { name },
  });

  if (oldItem.name !== name) {
    await prisma.program.updateMany({
      where: { equipment: oldItem.name },
      data: { equipment: name, equipmentCache: name },
    });
  }

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

  const item = await prisma.masterDailyCommitment.update({
    where: { id: input.id },
    data: { name },
  });

  if (oldItem.name !== name) {
    await prisma.program.updateMany({
      where: { dailyCommitment: oldItem.name },
      data: { dailyCommitment: name, commitmentCache: name },
    });
  }

  revalidateAdminMasterRoutes();
  return { success: true, message: `Daily commitment "${item.name}" updated.`, data: item };
}
