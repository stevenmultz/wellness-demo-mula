import { Prisma, type Program, type ProgramDay } from "@prisma/client";
import { prisma, lockProgramRow } from "../db";
import { requireAdminAccess, requireProgramAccess } from "../security/guards";
import { recordAuditLog } from "../integrations/audit-log";
import {
  CreateProgramSchema,
  UpdateProgramMetaSchema,
  isProgramDayComplete,
  isProgramHeaderComplete,
} from "../validators/program";
import {
  safeJsonParse,
  serializeTermsList,
  toStringArrayJson,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
} from "../utils/json";
import { normalizeProgramStatus, toPrismaProgramStatus } from "../utils/timeline";
import {
  hydrateProgramJsonFields,
  PROGRAM_TAXONOMY_INCLUDE,
  revalidateWellnessRoutes,
  serializeProgramTaxonomy,
  syncProgramTaxonomyRelations,
  type ProgramWithTaxonomyRelations,
} from "./program-taxonomy";
import type { WellnessActionResult } from "../actions/auth";

function toClientProgramPayload<
  T extends Program & ProgramWithTaxonomyRelations & { days?: ProgramDay[] },
>(program: T) {
  const tax = serializeProgramTaxonomy(program);
  const hydrated = hydrateProgramJsonFields(program);
  return {
    ...hydrated,
    ...tax,
    coverImage: program.coverImagePath,
    virtualFallbackAvailable: program.isVirtualFallbackAvailable,
    startDate: program.startAt,
    endDate: program.endAt,
    registrationOpenDate: program.registrationOpenAt,
    registrationDeadline: program.registrationDeadlineAt,
    isPublished: program.status === "PUBLISHED",
    status:
      program.status === "PUBLISHED"
        ? "PUBLISH"
        : program.status === "ARCHIVED"
          ? "ARCHIVE"
          : program.status,
  };
}

function getIncompleteHeaderMessage(
  program: Program & ProgramWithTaxonomyRelations
): string | null {
  const tax = serializeProgramTaxonomy(program);
  const headerCheck = isProgramHeaderComplete({
    title: program.title,
    description: program.description,
    difficultyLevel: program.difficultyLevel,
    targetState: program.targetState,
    methodology: program.methodology,
    expectedBenefits: safeJsonParse<string[]>(program.expectedBenefitsJson, []),
    category: tax.category,
    dailyCommitment: tax.dailyCommitment,
    coachName: tax.coachName,
    recommendedFor: tax.recommendedFor,
    startDate: program.startAt,
    endDate: program.endAt,
    registrationDeadline: program.registrationDeadlineAt,
    locationType: program.locationType,
    city: program.city,
    venueAddress: program.venueAddress,
    maxQuota: program.maxQuota,
    price: program.price,
    communityLink: program.communityLink,
    customTerms: program.customTerms,
  });

  if (headerCheck.isComplete) return null;

  const missingSummary = headerCheck.missingSections
    .map((s) => `Point ${s.point}: ${s.title}`)
    .join(", ");
  return `Cannot publish yet! Program header is incomplete (${headerCheck.completedCount}/${headerCheck.totalPoints} points completed). Missing: ${missingSummary}.`;
}

function getIncompleteDaysPreview(durationDays: number, days: ProgramDay[]): string | null {
  const missingDays: number[] = [];
  for (let i = 1; i <= durationDays; i++) {
    const dayRecord = days.find((d) => d.dayNumber === i);
    if (
      !isProgramDayComplete(
        dayRecord
          ? {
              ...dayRecord,
              videoChecklist: safeJsonParse<string[]>(dayRecord.videoChecklistJson, []),
            }
          : null
      )
    ) {
      missingDays.push(i);
    }
  }
  if (missingDays.length === 0) return null;
  return missingDays.length > 6
    ? `Day ${missingDays.slice(0, 6).join(", Day ")} (+${missingDays.length - 6} more)`
    : `Day ${missingDays.join(", Day ")}`;
}

export async function createProgramService(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAdminAccess();

  const validation = CreateProgramSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid program configuration data.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    title,
    description,
    coverImage,
    difficultyLevel,
    category,
    equipment,
    dailyCommitment,
    recommendedFor,
    coachName,
    organizationId,
    language,
    translations,
    durationDays,
    actualPrice,
    discountPercentage,
    price,
    maxQuota,
    communityLink,
    locationType,
    city,
    venueAddress,
    virtualFallbackAvailable,
    startDate,
    endDate,
    registrationOpenDate,
    registrationDeadline,
    status,
    days,
  } = validation.data;

  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const slug = `${baseSlug || "program"}-${randomSuffix}`;

  const now = new Date();
  const resolvedDuration = durationDays || 21;
  const startD = startDate
    ? new Date(startDate)
    : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const endD = endDate
    ? new Date(endDate)
    : new Date(startD.getTime() + (resolvedDuration - 1) * 24 * 60 * 60 * 1000);
  const calculatedDays = Math.max(
    1,
    Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const finalDuration = durationDays || calculatedDays;

  const regDeadline = registrationDeadline
    ? new Date(registrationDeadline)
    : new Date(startD.getTime() - 24 * 60 * 60 * 1000);
  const regOpen = registrationOpenDate ? new Date(registrationOpenDate) : now;

  const resolvedActualPrice = Math.round(
    actualPrice !== undefined ? Number(actualPrice) : Number(price) || 0
  );
  const resolvedDiscount = Math.round(discountPercentage !== undefined ? Number(discountPercentage) : 0);
  const resolvedFinalPrice = Math.max(
    0,
    Math.round(resolvedActualPrice * (1 - resolvedDiscount / 100))
  );

  const serializedTerms = serializeTermsList(
    validation.data.termsList,
    validation.data.customTerms
  );
  const benefitsJson = toStringArrayJson(
    validation.data.expectedBenefits,
    DEFAULT_PROGRAM_BENEFITS
  ) as Prisma.InputJsonValue;
  const refsList = validation.data.scientificReferences?.filter((r) => r.title.trim()) ?? [];
  const referencesJson = (
    refsList.length > 0 ? refsList : DEFAULT_PROGRAM_REFERENCES
  ) as unknown as Prisma.InputJsonValue;
  const guidelinesJson = toStringArrayJson(
    validation.data.programGuidelines,
    DEFAULT_PROGRAM_GUIDELINES
  ) as Prisma.InputJsonValue;

  let parsedTranslations: Prisma.InputJsonValue | undefined = undefined;
  if (translations) {
    try {
      parsedTranslations =
        typeof translations === "string"
          ? (JSON.parse(translations) as Prisma.InputJsonValue)
          : (translations as Prisma.InputJsonValue);
    } catch {
      parsedTranslations = undefined;
    }
  }

  const effectiveOrganizationId =
    session.role === "PARTNER_ADMIN" && session.organizationId
      ? session.organizationId
      : organizationId?.trim() || null;

  const matchedOrg = effectiveOrganizationId
    ? await prisma.masterOrganization.findUnique({
        where: { id: effectiveOrganizationId },
        select: { id: true },
      })
    : null;

  const effectiveCoachName =
    session.role === "COACH" && session.coachProfileName
      ? session.coachProfileName
      : (coachName || "").trim();

  const newProgram = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        targetState: validation.data.targetState?.trim() || DEFAULT_TARGET_STATE,
        methodology: validation.data.methodology?.trim() || DEFAULT_METHODOLOGY,
        expectedBenefitsJson: benefitsJson,
        scientificReferencesJson: referencesJson,
        programGuidelinesJson: guidelinesJson,
        coverImagePath: coverImage?.trim() || null,
        difficultyLevel: difficultyLevel || "INTERMEDIATE",
        organizationId: matchedOrg?.id || null,
        language: language || "id",
        ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
        durationDays: finalDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        maxQuota: maxQuota || 50,
        communityLink: communityLink?.trim() || null,
        locationType: locationType || "ONLINE",
        city: city?.trim() || null,
        venueAddress: venueAddress?.trim() || null,
        isVirtualFallbackAvailable: virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: serializedTerms,
        startAt: startD,
        endAt: endD,
        registrationOpenAt: regOpen,
        registrationDeadlineAt: regDeadline,
        status: normalizeProgramStatus(status) === "ARCHIVE" ? "ARCHIVED" : "DRAFT",
        days:
          days && days.length > 0
            ? {
                create: days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  dayType: d.dayType,
                  workoutOptionsJson: (d.workoutOptions || []) as Prisma.InputJsonValue,
                  sleepRecommendation: d.sleepRecommendation || null,
                  dayNotificationsJson: (d.dayNotifications || []) as Prisma.InputJsonValue,
                  videoUrl: d.videoUrl || null,
                  videoChecklistJson: (d.videoChecklist || []) as Prisma.InputJsonValue,
                  mealRecommendation: d.mealRecommendation || null,
                  dailyAssessment: d.dailyAssessment || null,
                  pendingReminder:
                    d.pendingReminder ||
                    "Don't forget your scheduled routine today! Complete video & checklist before 23:59.",
                  completedReminder:
                    d.completedReminder ||
                    "Outstanding work completing your routine today! Hydrate and recover.",
                  meetupLink: d.meetupLink || null,
                  onsiteVenue: d.onsiteVenue || null,
                  onsiteSchedule: d.onsiteSchedule || null,
                  restInstructions:
                    d.restInstructions ||
                    "Take today to rest, stretch gently, and let your body restore its energy.",
                })),
              }
            : undefined,
      },
    });

    await syncProgramTaxonomyRelations(tx, created.id, {
      category: category?.trim() || "Pilates",
      coachName: effectiveCoachName,
      recommendedFor: recommendedFor?.trim() || "All Levels",
      equipment: equipment?.trim() || null,
      dailyCommitment: dailyCommitment?.trim() || null,
    });

    return tx.program.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: { orderBy: { dayNumber: "asc" } },
      },
    });
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Draft program "${newProgram.title}" created (${newProgram.durationDays}-Day target). Now fill each day to unlock final launch.`,
    data: toClientProgramPayload(newProgram),
  };
}

export async function updateProgramMetaService(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const validation = UpdateProgramMetaSchema.safeParse(rawInput);
  if (!validation.success) {
    const detail = Object.values(validation.error.flatten().fieldErrors)
      .flat()
      .join(" ");
    return {
      success: false,
      message: detail || "Invalid program base settings.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const input = validation.data;
  const session = await requireProgramAccess(input.programId);

  const existingProgram = await prisma.program.findFirst({
    where: { id: input.programId, deletedAt: null },
    include: {
      ...PROGRAM_TAXONOMY_INCLUDE,
      days: true,
    },
  });

  if (!existingProgram) {
    return { success: false, message: "Program not found." };
  }

  if (existingProgram.status === "PUBLISHED") {
    return {
      success: false,
      message:
        "Program information is locked because this cohort is published and live. Unpublish the program first if you need to modify core terms.",
    };
  }

  if (input.status && normalizeProgramStatus(input.status) === "PUBLISH") {
    return {
      success: false,
      message:
        "Use the official Publish action to launch this program once header and all curriculum days are complete.",
    };
  }

  const resolvedActualPrice = Math.round(
    input.actualPrice !== undefined ? Number(input.actualPrice) : existingProgram.actualPrice
  );
  const resolvedDiscount = Math.round(
    input.discountPercentage !== undefined
      ? Number(input.discountPercentage)
      : existingProgram.discountPercentage
  );
  const resolvedFinalPrice = Math.max(
    0,
    Math.round(resolvedActualPrice * (1 - resolvedDiscount / 100))
  );

  const serializedTerms =
    input.termsList !== undefined || input.customTerms !== undefined
      ? serializeTermsList(input.termsList, input.customTerms ?? existingProgram.customTerms)
      : existingProgram.customTerms;

  const benefitsJson =
    input.expectedBenefits !== undefined
      ? (toStringArrayJson(input.expectedBenefits, DEFAULT_PROGRAM_BENEFITS) as Prisma.InputJsonValue)
      : undefined;

  const referencesJson =
    input.scientificReferences !== undefined
      ? ((input.scientificReferences.filter((r) => r.title.trim()).length > 0
          ? input.scientificReferences.filter((r) => r.title.trim())
          : DEFAULT_PROGRAM_REFERENCES) as unknown as Prisma.InputJsonValue)
      : undefined;

  const guidelinesJson =
    input.programGuidelines !== undefined
      ? (toStringArrayJson(
          input.programGuidelines,
          DEFAULT_PROGRAM_GUIDELINES
        ) as Prisma.InputJsonValue)
      : undefined;

  let parsedTranslations: Prisma.InputJsonValue | undefined = undefined;
  if (input.translations !== undefined && input.translations) {
    try {
      parsedTranslations =
        typeof input.translations === "string"
          ? (JSON.parse(input.translations) as Prisma.InputJsonValue)
          : (input.translations as Prisma.InputJsonValue);
    } catch {
      parsedTranslations = undefined;
    }
  }

  const existingTax = serializeProgramTaxonomy(existingProgram);

  const updated = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, input.programId);

    const resolvedDuration = input.durationDays || existingProgram.durationDays || 21;
    if (resolvedDuration < existingProgram.durationDays) {
      await tx.programDay.deleteMany({
        where: {
          programId: input.programId,
          dayNumber: { gt: resolvedDuration },
        },
      });
    }

    const startD = input.startDate ? new Date(input.startDate) : existingProgram.startAt;
    const endD = input.endDate ? new Date(input.endDate) : existingProgram.endAt;
    const regDeadline = input.registrationDeadline
      ? new Date(input.registrationDeadline)
      : existingProgram.registrationDeadlineAt;
    const regOpen =
      input.registrationOpenDate !== undefined
        ? input.registrationOpenDate
          ? new Date(input.registrationOpenDate)
          : null
        : existingProgram.registrationOpenAt;

    const requestedOrgId =
      session.role === "PARTNER_ADMIN" && session.organizationId
        ? session.organizationId
        : input.organizationId !== undefined
          ? input.organizationId?.trim() || null
          : existingProgram.organizationId;

    const orgRecord = requestedOrgId
      ? await tx.masterOrganization.findUnique({
          where: { id: requestedOrgId },
          select: { id: true },
        })
      : null;

    const requestedCoachName =
      session.role === "COACH" && session.coachProfileName
        ? existingTax.coachName || session.coachProfileName
        : (input.coachName ?? existingTax.coachName).trim();

    await tx.program.update({
      where: { id: input.programId },
      data: {
        title: input.title.trim(),
        description: (
          input.description ||
          existingProgram.description ||
          "Program description will be configured soon."
        ).trim(),
        targetState:
          input.targetState !== undefined
            ? input.targetState.trim() || null
            : existingProgram.targetState,
        methodology:
          input.methodology !== undefined
            ? input.methodology.trim() || null
            : existingProgram.methodology,
        ...(benefitsJson !== undefined ? { expectedBenefitsJson: benefitsJson } : {}),
        ...(referencesJson !== undefined ? { scientificReferencesJson: referencesJson } : {}),
        ...(guidelinesJson !== undefined ? { programGuidelinesJson: guidelinesJson } : {}),
        coverImagePath: input.coverImage?.trim() || null,
        difficultyLevel:
          input.difficultyLevel || existingProgram.difficultyLevel || "INTERMEDIATE",
        organizationId: orgRecord?.id || null,
        language: input.language || existingProgram.language || "id",
        ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
        durationDays: resolvedDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        maxQuota: Math.max(1, Number(input.maxQuota) || 50),
        communityLink: input.communityLink?.trim() || null,
        locationType: input.locationType || "ONLINE",
        city: input.city?.trim() || null,
        venueAddress: input.venueAddress?.trim() || null,
        isVirtualFallbackAvailable: input.virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: serializedTerms,
        startAt: startD,
        endAt: endD,
        registrationOpenAt: regOpen,
        registrationDeadlineAt: regDeadline,
        status: input.status ? toPrismaProgramStatus(input.status) : existingProgram.status,
        version: { increment: 1 },
      },
    });

    await syncProgramTaxonomyRelations(tx, input.programId, {
      category: input.category !== undefined ? input.category : existingTax.category,
      coachName: requestedCoachName,
      recommendedFor:
        input.recommendedFor !== undefined ? input.recommendedFor : existingTax.recommendedFor,
      equipment: input.equipment !== undefined ? input.equipment : existingTax.equipment,
      dailyCommitment:
        input.dailyCommitment !== undefined
          ? input.dailyCommitment
          : existingTax.dailyCommitment,
    });

    return tx.program.findUniqueOrThrow({
      where: { id: input.programId },
      include: PROGRAM_TAXONOMY_INCLUDE,
    });
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Base info updated for "${updated.title}".`,
    data: toClientProgramPayload(updated),
  };
}

export async function setProgramStatusService(
  programId: string,
  rawStatus: string
): Promise<WellnessActionResult<{ status: string; isPublished: boolean }>> {
  const admin = await requireProgramAccess(programId);

  const targetPrismaStatus = toPrismaProgramStatus(rawStatus);
  const normStatus = normalizeProgramStatus(rawStatus);

  const result = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, programId);

    const program = await tx.program.findFirst({
      where: { id: programId, deletedAt: null },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: { orderBy: { dayNumber: "asc" } },
      },
    });

    if (!program) {
      return { success: false as const, message: "Program not found." };
    }

    if (targetPrismaStatus === "PUBLISHED") {
      const headerMsg = getIncompleteHeaderMessage(program);
      if (headerMsg) return { success: false as const, message: headerMsg };
    }

    if (targetPrismaStatus === "OPEN" || targetPrismaStatus === "PUBLISHED") {
      const previewMissing = getIncompleteDaysPreview(program.durationDays, program.days);
      if (previewMissing) {
        return {
          success: false as const,
          message: `Cannot change status to ${targetPrismaStatus}! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
        };
      }
    }

    if (program.status === "PUBLISHED" && targetPrismaStatus !== "PUBLISHED") {
      const activeEnrollments = await tx.programEnrollment.count({
        where: { programId, status: "ACTIVE" },
      });
      if (activeEnrollments > 0) {
        return {
          success: false as const,
          message: `Cannot update status: There are ${activeEnrollments} active participant(s) enrolled in this cohort. Use the official Unpublish action once no active participants remain.`,
        };
      }
    }

    const updated = await tx.program.update({
      where: { id: programId },
      data: { status: targetPrismaStatus, version: { increment: 1 } },
    });

    await recordAuditLog(
      {
        actorUserId: admin.userId,
        action: "PROGRAM_STATUS_CHANGED",
        entityType: "Program",
        entityId: programId,
        metadata: { from: program.status, to: targetPrismaStatus },
      },
      tx
    );

    const labelMap: Record<string, string> = {
      DRAFT: "Draft (Pengisian Awal)",
      OPEN: "Open (Siap Publish)",
      PUBLISHED: "Publish (Disiarkan ke Publik)",
      DONE: "Done (Selesai)",
      ARCHIVED: "Archive (Diarsipkan)",
    };

    const clientStatus =
      updated.status === "PUBLISHED"
        ? "PUBLISH"
        : updated.status === "ARCHIVED"
          ? "ARCHIVE"
          : updated.status;

    return {
      success: true as const,
      message: `Status program "${updated.title}" diubah menjadi: ${labelMap[updated.status] || normStatus}.`,
      data: { status: clientStatus, isPublished: updated.status === "PUBLISHED" },
    };
  });

  if (result.success) revalidateWellnessRoutes();
  return result;
}

export async function togglePublishProgramService(
  programId: string,
  publish: boolean
): Promise<WellnessActionResult<{ isPublished: boolean; status: string }>> {
  const admin = await requireProgramAccess(programId);

  const result = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, programId);

    const program = await tx.program.findFirst({
      where: { id: programId, deletedAt: null },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: { orderBy: { dayNumber: "asc" } },
      },
    });

    if (!program) {
      return { success: false as const, message: "Program not found." };
    }

    if (publish) {
      const headerMsg = getIncompleteHeaderMessage(program);
      if (headerMsg) return { success: false as const, message: headerMsg };

      const previewMissing = getIncompleteDaysPreview(program.durationDays, program.days);
      if (previewMissing) {
        return {
          success: false as const,
          message: `Cannot publish yet! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
        };
      }

      const updated = await tx.program.update({
        where: { id: programId },
        data: { status: "PUBLISHED", version: { increment: 1 } },
      });

      await recordAuditLog(
        {
          actorUserId: admin.userId,
          action: "PROGRAM_PUBLISHED",
          entityType: "Program",
          entityId: programId,
        },
        tx
      );

      return {
        success: true as const,
        message: `Cohort "${updated.title}" is now PUBLISHED and live! Core settings are locked to preserve integrity.`,
        data: { isPublished: true, status: "PUBLISH" },
      };
    }

    const activeEnrollments = await tx.programEnrollment.count({
      where: { programId, status: "ACTIVE" },
    });

    if (activeEnrollments > 0) {
      return {
        success: false as const,
        message: `Cannot unpublish: ${activeEnrollments} active member(s) are currently enrolled in this cohort. Unpublishing would break their live curriculum access.`,
      };
    }

    const updated = await tx.program.update({
      where: { id: programId },
      data: { status: "OPEN", version: { increment: 1 } },
    });

    await recordAuditLog(
      {
        actorUserId: admin.userId,
        action: "PROGRAM_UNPUBLISHED",
        entityType: "Program",
        entityId: programId,
      },
      tx
    );

    return {
      success: true as const,
      message: `Cohort "${updated.title}" has been unpublished and returned to Review status.`,
      data: { isPublished: false, status: "REVIEW" },
    };
  });

  if (result.success) revalidateWellnessRoutes();
  return result;
}

export async function deleteProgramService(
  programId: string
): Promise<WellnessActionResult> {
  const admin = await requireProgramAccess(programId);

  const result = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, programId);

    const existing = await tx.program.findFirst({
      where: { id: programId, deletedAt: null },
      select: { id: true, title: true, slug: true },
    });

    if (!existing) {
      return { success: false as const, message: "Program not found." };
    }

    const activeEnrollments = await tx.programEnrollment.count({
      where: { programId, status: "ACTIVE" },
    });

    if (activeEnrollments > 0) {
      return {
        success: false as const,
        message: `Cannot delete program: ${activeEnrollments} active member(s) are currently enrolled. Cancel or refund enrollments first.`,
      };
    }

    const anyEnrollments = await tx.programEnrollment.count({ where: { programId } });
    if (anyEnrollments > 0) {
      // Soft-delete when historical enrollments/transactions exist (onDelete: Restrict)
      const now = new Date();
      await tx.program.update({
        where: { id: programId },
        data: {
          deletedAt: now,
          deletedById: admin.userId,
          status: "ARCHIVED",
          slug: `deleted_${programId}_${now.getTime()}`,
        },
      });
    } else {
      await tx.program.delete({ where: { id: programId } });
    }

    await recordAuditLog(
      {
        actorUserId: admin.userId,
        action: "PROGRAM_DELETED",
        entityType: "Program",
        entityId: programId,
        metadata: { title: existing.title, softDeleted: anyEnrollments > 0 },
      },
      tx
    );

    return {
      success: true as const,
      message: `Program "${existing.title}" deleted.`,
    };
  });

  if (result.success) revalidateWellnessRoutes();
  return result;
}
