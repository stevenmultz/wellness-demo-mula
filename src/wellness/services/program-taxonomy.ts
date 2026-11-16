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
 * Prisma transaction so relational integrity stays in sync with CSV caches.
 */
export async function syncProgramTaxonomyRelations(
  tx: Prisma.TransactionClient,
  programId: string,
  meta: {
    category?: string | null;
    coachName?: string | null;
    recommendedFor?: string | null;
    equipment?: string | null;
    dailyCommitment?: string | null;
  }
) {
  const categoryNames = splitCsvValues(meta.category);
  const coachNames = splitCsvValues(meta.coachName);
  const audienceNames = splitCsvValues(meta.recommendedFor);
  const equipmentNames = splitCsvValues(meta.equipment);
  const commitmentName = meta.dailyCommitment?.trim() || "";

  const [categories, coaches, audiences, equipments, commitment] = await Promise.all([
    categoryNames.length > 0
      ? tx.masterCategory.findMany({ where: { name: { in: categoryNames } } })
      : Promise.resolve([]),
    coachNames.length > 0
      ? tx.masterCoach.findMany({ where: { name: { in: coachNames } } })
      : Promise.resolve([]),
    audienceNames.length > 0
      ? tx.masterTargetAudience.findMany({ where: { name: { in: audienceNames } } })
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
    tx.programAudience.deleteMany({ where: { programId } }),
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
  if (audiences.length > 0) {
    await tx.programAudience.createMany({
      data: audiences.map((aud) => ({ programId, audienceId: aud.id })),
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
    expectedBenefits: string | null;
    scientificReferences: string | null;
    programGuidelines: string | null;
  },
>(program: T) {
  return {
    ...program,
    termsList: parseTermsList(program.customTerms),
    expectedBenefits: parseStringList(program.expectedBenefits, DEFAULT_PROGRAM_BENEFITS),
    scientificReferences: parseReferencesList(
      program.scientificReferences,
      DEFAULT_PROGRAM_REFERENCES
    ),
    programGuidelines: parseStringList(program.programGuidelines, DEFAULT_PROGRAM_GUIDELINES),
  };
}
