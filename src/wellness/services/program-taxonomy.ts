import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import {
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  parseReferencesList,
  parseStringList,
  parseTermsList,
} from "../utils/json";

export const PROGRAM_TAXONOMY_INCLUDE = {
  categories: { include: { category: { select: { id: true, name: true } } } },
  coaches: { include: { coach: { select: { id: true, name: true, title: true } } } },
  equipments: { include: { equipment: { select: { id: true, name: true } } } },
  dailyCommitmentRef: { select: { id: true, name: true } },
  organization: { select: { id: true, name: true, logoPath: true, isVerified: true } },
} as const;

export interface ProgramWithTaxonomyRelations {
  categories?: Array<{ category: { name: string } }>;
  coaches?: Array<{ coach: { name: string; title: string } }>;
  equipments?: Array<{ equipment: { name: string } }>;
  dailyCommitmentRef?: { name: string } | null;
  organization?: { name: string; logoPath: string | null; isVerified: boolean } | null;
}

export function serializeProgramTaxonomy(program: ProgramWithTaxonomyRelations) {
  const categoryNames = (program.categories ?? []).map((c) => c.category.name).filter(Boolean);
  const coachList = (program.coaches ?? []).map((c) => c.coach).filter(Boolean);
  const equipmentNames = (program.equipments ?? []).map((e) => e.equipment.name).filter(Boolean);

  return {
    category: categoryNames.join(", ") || "Pilates",
    coachName: coachList.map((c) => c.name).join(", ") || "Head Wellness Coach",
    coachTitle: coachList[0]?.title ?? null,
    equipment: equipmentNames.length > 0 ? equipmentNames.join(", ") : null,
    dailyCommitment: program.dailyCommitmentRef?.name ?? null,
    organizationName: program.organization?.name ?? null,
    organizationLogoPath: program.organization?.logoPath ?? null,
    organizationVerified: program.organization?.isVerified ?? false,
  };
}

export function splitCsvValues(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Synchronizes 3NF relational pivot tables (`ProgramCategory`, `ProgramCoach`,
 * `ProgramAudience`, `ProgramEquipment`, `dailyCommitmentId`) inside an active
 * Prisma transaction (single source of truth in PostgreSQL).
 */
export async function syncProgramTaxonomyRelations(
  tx: Prisma.TransactionClient,
  programId: string,
  meta: {
    category?: string | null;
    coachName?: string | null;
    equipment?: string | null;
    dailyCommitment?: string | null;
  }
) {
  const categoryNames = splitCsvValues(meta.category);
  const coachNames = splitCsvValues(meta.coachName);
  const equipmentNames = splitCsvValues(meta.equipment);
  const commitmentName = meta.dailyCommitment?.trim() || "";

  const [categories, coaches, equipments, commitment] = await Promise.all([
    categoryNames.length > 0
      ? tx.masterCategory.findMany({ where: { name: { in: categoryNames } } })
      : Promise.resolve([]),
    coachNames.length > 0
      ? tx.masterCoach.findMany({ where: { name: { in: coachNames } } })
      : Promise.resolve([]),
    equipmentNames.length > 0
      ? tx.masterEquipment.findMany({ where: { name: { in: equipmentNames } } })
      : Promise.resolve([]),
    commitmentName
      ? tx.masterDailyCommitment.findUnique({ where: { name: commitmentName } })
      : Promise.resolve(null),
  ]);

  await Promise.all([
    tx.programCategory.deleteMany({ where: { programId } }),
    tx.programCoach.deleteMany({ where: { programId } }),
    tx.programEquipment.deleteMany({ where: { programId } }),
  ]);

  if (categories.length > 0) {
    await tx.programCategory.createMany({
      data: categories.map((cat) => ({ programId, categoryId: cat.id })),
    });
  }
  if (coaches.length > 0) {
    await tx.programCoach.createMany({
      data: coaches.map((coach) => ({ programId, coachId: coach.id })),
    });
  }
  if (equipments.length > 0) {
    await tx.programEquipment.createMany({
      data: equipments.map((eq) => ({ programId, equipmentId: eq.id })),
    });
  }

  await tx.program.update({
    where: { id: programId },
    data: { dailyCommitmentId: commitment?.id ?? null },
  });
}

export function revalidateWellnessRoutes() {
  try {
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore in non-Next request contexts (e.g. seed/CLI)
  }
}

export function hydrateProgramJsonFields<
  T extends {
    customTerms: string | null;
    expectedBenefitsJson: unknown;
    scientificReferencesJson: unknown;
    programGuidelinesJson: unknown;
  },
>(program: T) {
  return {
    ...program,
    termsList: parseTermsList(program.customTerms),
    expectedBenefits: parseStringList(program.expectedBenefitsJson, DEFAULT_PROGRAM_BENEFITS),
    scientificReferences: parseReferencesList(
      program.scientificReferencesJson,
      DEFAULT_PROGRAM_REFERENCES
    ),
    programGuidelines: parseStringList(program.programGuidelinesJson, DEFAULT_PROGRAM_GUIDELINES),
  };
}
