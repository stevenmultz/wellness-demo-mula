import { type Program, type ProgramDay } from "@prisma/client";
import { prisma } from "../db";
import { requireAdminAccess, requireProgramAccess } from "../security/guards";
import {
  CreateProgramSchema,
  UpdateProgramMetaSchema,
  isProgramDayComplete,
  isProgramHeaderComplete,
} from "../validators/program";
import {
  safeJsonParse,
  serializeTermsList,
  serializeStringList,
  serializeReferencesList,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
} from "../utils/json";
import { normalizeProgramStatus } from "../utils/timeline";
import {
  hydrateProgramJsonFields,
  revalidateWellnessRoutes,
  syncProgramTaxonomyRelations,
} from "./program-taxonomy";
import type { WellnessActionResult } from "../actions/auth";

function getIncompleteHeaderMessage(program: Program): string | null {
  const headerCheck = isProgramHeaderComplete({
    title: program.title,
    description: program.description,
    difficultyLevel: program.difficultyLevel,
    targetState: program.targetState,
    methodology: program.methodology,
    expectedBenefits: safeJsonParse<string[]>(program.expectedBenefits, []),
    category: program.category,
    dailyCommitment: program.dailyCommitment,
    coachName: program.coachName,
    recommendedFor: program.recommendedFor,
    startDate: program.startDate,
    endDate: program.endDate,
    registrationDeadline: program.registrationDeadline,
    locationType: program.locationType,
    city: program.city,
    venueAddress: program.venueAddress,
    maxQuota: program.maxQuota,
    price: program.price,
    communityLink: program.communityLink,
    customTerms: program.customTerms,
  });

  if (headerCheck.isComplete) {
    return null;
  }

  const missingSummary = headerCheck.missingSections
    .map((s) => `Point ${s.point}: ${s.title}`)
    .join(", ");
  return `Cannot publish yet! Program header is incomplete (${headerCheck.completedCount}/${headerCheck.totalPoints} points completed). Missing: ${missingSummary}.`;
}

function getIncompleteDaysPreview(durationDays: number, days: ProgramDay[]): string | null {
  const missingDays: number[] = [];
  for (let i = 1; i <= durationDays; i++) {
    const dayRecord = days.find((d) => d.dayNumber === i);
    if (!isProgramDayComplete(dayRecord)) {
      missingDays.push(i);
    }
  }
  if (missingDays.length === 0) {
    return null;
  }
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
    coachTitle,
    organizationId,
    organizationCache,
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
  const slug = `${baseSlug}-${randomSuffix}`;

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

  const resolvedActualPrice =
    actualPrice !== undefined ? Number(actualPrice) : Number(price) || 0;
  const resolvedDiscount =
    discountPercentage !== undefined ? Number(discountPercentage) : 0;
  const resolvedFinalPrice = Math.max(
    0,
    Math.round(resolvedActualPrice * (1 - resolvedDiscount / 100))
  );

  const serializedTerms = serializeTermsList(
    validation.data.termsList,
    validation.data.customTerms
  );
  const serializedBenefits = serializeStringList(
    validation.data.expectedBenefits,
    DEFAULT_PROGRAM_BENEFITS
  );
  const serializedReferences = serializeReferencesList(
    validation.data.scientificReferences,
    DEFAULT_PROGRAM_REFERENCES
  );
  const serializedGuidelines = serializeStringList(
    validation.data.programGuidelines,
    DEFAULT_PROGRAM_GUIDELINES
  );

  const effectiveOrganizationId =
    session.role === "PARTNER_ADMIN" && session.organizationId
      ? session.organizationId
      : organizationId?.trim() || null;

  const matchedOrg = effectiveOrganizationId
    ? await prisma.masterOrganization.findUnique({
        where: { id: effectiveOrganizationId },
        select: { id: true, name: true },
      })
    : null;

  const effectiveCoachName =
    session.role === "COACH" && session.coachProfileName
      ? session.coachProfileName
      : (coachName || "TBA").trim();

  const newProgram = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        targetState: validation.data.targetState?.trim() || DEFAULT_TARGET_STATE,
        methodology: validation.data.methodology?.trim() || DEFAULT_METHODOLOGY,
        expectedBenefits: serializedBenefits,
        scientificReferences: serializedReferences,
        programGuidelines: serializedGuidelines,
        coverImage: coverImage?.trim() || null,
        difficultyLevel: difficultyLevel || "INTERMEDIATE",
        category: category?.trim() || "Pilates",
        equipment: equipment?.trim() || null,
        dailyCommitment: dailyCommitment?.trim() || null,
        recommendedFor: recommendedFor?.trim() || "All Levels",
        coachName: effectiveCoachName,
        coachTitle: coachTitle?.trim() || null,
        organizationId: matchedOrg?.id || null,
        organizationCache: matchedOrg?.name || organizationCache?.trim() || null,
        language: language || "id",
        translations: translations || null,
        durationDays: finalDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        maxQuota: maxQuota || 50,
        communityLink: communityLink?.trim() || null,
        locationType: locationType || "ONLINE",
        city: city?.trim() || null,
        venueAddress: venueAddress?.trim() || null,
        virtualFallbackAvailable: virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: serializedTerms,
        categoryCache: category?.trim() || null,
        coachCache: coachName?.trim() || null,
        equipmentCache: equipment?.trim() || null,
        audienceCache: recommendedFor?.trim() || null,
        commitmentCache: dailyCommitment?.trim() || null,
        startDate: startD,
        endDate: endD,
        registrationOpenDate: regOpen,
        registrationDeadline: regDeadline,
        // Enforce Dual-Gate validation: newly created programs never bypass publish checks
        status: normalizeProgramStatus(status) === "ARCHIVE" ? "ARCHIVE" : "DRAFT",
        isPublished: false,
        days:
          days && days.length > 0
            ? {
                create: days.map((d) => ({
                  dayNumber: d.dayNumber,
                  title: d.title,
                  dayType: d.dayType,
                  workoutOptions: JSON.stringify(d.workoutOptions || []),
                  sleepRecommendation: d.sleepRecommendation || null,
                  dayNotifications: JSON.stringify(d.dayNotifications || []),
                  videoUrl: d.videoUrl || null,
                  videoChecklist: JSON.stringify(d.videoChecklist || []),
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
      include: {
        days: {
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    await syncProgramTaxonomyRelations(tx, created.id, {
      category,
      coachName: effectiveCoachName,
      recommendedFor,
      equipment,
      dailyCommitment,
    });

    return created;
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Draft program "${newProgram.title}" created (${newProgram.durationDays}-Day target). Now fill each day to unlock final launch.`,
    data: hydrateProgramJsonFields(newProgram),
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

  const existingProgram = await prisma.program.findUnique({
    where: { id: input.programId },
    include: { days: true },
  });

  if (!existingProgram) {
    return { success: false, message: "Program not found." };
  }

  if (
    existingProgram.isPublished ||
    normalizeProgramStatus(existingProgram.status) === "PUBLISH"
  ) {
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

  const resolvedActualPrice =
    input.actualPrice !== undefined
      ? Number(input.actualPrice)
      : existingProgram.actualPrice;
  const resolvedDiscount =
    input.discountPercentage !== undefined
      ? Number(input.discountPercentage)
      : existingProgram.discountPercentage;
  const resolvedFinalPrice = Math.max(
    0,
    Math.round(resolvedActualPrice * (1 - resolvedDiscount / 100))
  );

  const serializedTerms =
    input.termsList !== undefined || input.customTerms !== undefined
      ? serializeTermsList(
          input.termsList,
          input.customTerms ?? existingProgram.customTerms
        )
      : existingProgram.customTerms;

  const serializedBenefits =
    input.expectedBenefits !== undefined
      ? serializeStringList(input.expectedBenefits, DEFAULT_PROGRAM_BENEFITS)
      : existingProgram.expectedBenefits;

  const serializedReferences =
    input.scientificReferences !== undefined
      ? serializeReferencesList(input.scientificReferences, DEFAULT_PROGRAM_REFERENCES)
      : existingProgram.scientificReferences;

  const serializedGuidelines =
    input.programGuidelines !== undefined
      ? serializeStringList(input.programGuidelines, DEFAULT_PROGRAM_GUIDELINES)
      : existingProgram.programGuidelines;

  const updated = await prisma.$transaction(async (tx) => {
    const resolvedDuration = input.durationDays || existingProgram.durationDays || 21;
    if (resolvedDuration < existingProgram.durationDays) {
      await tx.programDay.deleteMany({
        where: {
          programId: input.programId,
          dayNumber: { gt: resolvedDuration },
        },
      });
    }

    const startD = input.startDate ? new Date(input.startDate) : existingProgram.startDate;
    const endD = input.endDate ? new Date(input.endDate) : existingProgram.endDate;
    const regDeadline = input.registrationDeadline
      ? new Date(input.registrationDeadline)
      : existingProgram.registrationDeadline;
    const regOpen =
      input.registrationOpenDate !== undefined
        ? input.registrationOpenDate
          ? new Date(input.registrationOpenDate)
          : null
        : existingProgram.registrationOpenDate;

    const requestedOrgId =
      session.role === "PARTNER_ADMIN" && session.organizationId
        ? session.organizationId
        : input.organizationId !== undefined
          ? input.organizationId?.trim() || null
          : existingProgram.organizationId;

    const orgRecord = requestedOrgId
      ? await tx.masterOrganization.findUnique({
          where: { id: requestedOrgId },
          select: { id: true, name: true },
        })
      : null;

    const requestedCoachName =
      session.role === "COACH" && session.coachProfileName
        ? existingProgram.coachName || session.coachProfileName
        : (input.coachName || existingProgram.coachName || "TBA").trim();

    const prog = await tx.program.update({
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
        expectedBenefits: serializedBenefits,
        scientificReferences: serializedReferences,
        programGuidelines: serializedGuidelines,
        coverImage: input.coverImage?.trim() || null,
        difficultyLevel:
          input.difficultyLevel || existingProgram.difficultyLevel || "INTERMEDIATE",
        category: input.category?.trim() || existingProgram.category || "Pilates",
        equipment: input.equipment?.trim() || null,
        dailyCommitment: input.dailyCommitment?.trim() || null,
        recommendedFor: (
          input.recommendedFor ||
          existingProgram.recommendedFor ||
          "All Levels"
        ).trim(),
        coachName: requestedCoachName,
        coachTitle: input.coachTitle?.trim() || null,
        organizationId: orgRecord?.id || null,
        organizationCache:
          orgRecord?.name ||
          (input.organizationCache !== undefined
            ? input.organizationCache?.trim() || null
            : existingProgram.organizationCache),
        language: input.language || existingProgram.language || "id",
        translations:
          input.translations !== undefined
            ? input.translations || null
            : existingProgram.translations,
        durationDays: resolvedDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        maxQuota: Math.max(1, Number(input.maxQuota) || 50),
        communityLink: input.communityLink?.trim() || null,
        locationType: input.locationType || "ONLINE",
        city: input.city?.trim() || null,
        venueAddress: input.venueAddress?.trim() || null,
        virtualFallbackAvailable: input.virtualFallbackAvailable ?? true,
        termsType: "CUSTOM",
        customTerms: serializedTerms,
        categoryCache: input.category?.trim() || existingProgram.categoryCache,
        coachCache: input.coachName?.trim() || existingProgram.coachCache,
        equipmentCache: input.equipment?.trim() || existingProgram.equipmentCache,
        audienceCache: input.recommendedFor?.trim() || existingProgram.audienceCache,
        commitmentCache: input.dailyCommitment?.trim() || existingProgram.commitmentCache,
        startDate: startD,
        endDate: endD,
        registrationOpenDate: regOpen,
        registrationDeadline: regDeadline,
        status: input.status ?? existingProgram.status,
      },
    });

    await syncProgramTaxonomyRelations(tx, prog.id, {
      category: prog.category,
      coachName: prog.coachName,
      recommendedFor: prog.recommendedFor,
      equipment: prog.equipment,
      dailyCommitment: prog.dailyCommitment,
    });

    return prog;
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Base info updated for "${updated.title}".`,
    data: hydrateProgramJsonFields(updated),
  };
}

export async function setProgramStatusService(
  programId: string,
  rawStatus: string
): Promise<WellnessActionResult<{ status: string; isPublished: boolean }>> {
  await requireProgramAccess(programId);

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  if (!program) {
    return { success: false, message: "Program not found." };
  }

  const targetStatus = normalizeProgramStatus(rawStatus);

  if (targetStatus === "PUBLISH") {
    const headerMsg = getIncompleteHeaderMessage(program);
    if (headerMsg) {
      return { success: false, message: headerMsg };
    }
  }

  if (targetStatus === "REVIEW" || targetStatus === "OPEN" || targetStatus === "PUBLISH") {
    const previewMissing = getIncompleteDaysPreview(program.durationDays, program.days);
    if (previewMissing) {
      return {
        success: false,
        message: `Cannot change status to ${targetStatus}! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
      };
    }
  }

  const isCurrentlyPublished =
    program.status === "PUBLISH" ||
    program.status === "PUBLISHED" ||
    program.status === "ACTIVE" ||
    program.isPublished;

  if (isCurrentlyPublished && targetStatus !== "PUBLISH") {
    const activeEnrollments = await prisma.programEnrollment.count({
      where: { programId, status: "ACTIVE" },
    });

    if (activeEnrollments > 0) {
      return {
        success: false,
        message: `Cannot update status: There are ${activeEnrollments} active participant(s) enrolled in this cohort. Use the official Unpublish action once no active participants remain.`,
      };
    }
  }

  const updated = await prisma.program.update({
    where: { id: programId },
    data: { status: targetStatus, isPublished: targetStatus === "PUBLISH" },
  });

  revalidateWellnessRoutes();

  const labelMap: Record<string, string> = {
    DRAFT: "Draft (Pengisian Awal)",
    OPEN: "Open (Siap Publish)",
    PUBLISH: "Publish (Disiarkan ke Publik)",
    DONE: "Done (Selesai)",
    ARCHIVE: "Archive (Diarsipkan)",
  };

  return {
    success: true,
    message: `Status program "${updated.title}" diubah menjadi: ${labelMap[targetStatus] || targetStatus}.`,
    data: { status: updated.status, isPublished: updated.isPublished },
  };
}

export async function togglePublishProgramService(
  programId: string,
  publish: boolean
): Promise<WellnessActionResult<{ isPublished: boolean; status: string }>> {
  await requireProgramAccess(programId);

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  if (!program) {
    return { success: false, message: "Program not found." };
  }

  if (publish) {
    const headerMsg = getIncompleteHeaderMessage(program);
    if (headerMsg) {
      return { success: false, message: headerMsg };
    }

    const previewMissing = getIncompleteDaysPreview(program.durationDays, program.days);
    if (previewMissing) {
      return {
        success: false,
        message: `Cannot publish yet! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
      };
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: { isPublished: true, status: "PUBLISH" },
    });

    revalidateWellnessRoutes();

    return {
      success: true,
      message: `Cohort "${updated.title}" is now PUBLISHED and live! Core settings are locked to preserve integrity.`,
      data: { isPublished: updated.isPublished, status: updated.status },
    };
  }

  const activeEnrollments = await prisma.programEnrollment.count({
    where: { programId, status: "ACTIVE" },
  });

  if (activeEnrollments > 0) {
    return {
      success: false,
      message: `Cannot unpublish: ${activeEnrollments} active member(s) are currently enrolled in this cohort. Unpublishing would break their live curriculum access.`,
    };
  }

  const updated = await prisma.program.update({
    where: { id: programId },
    data: { isPublished: false, status: "REVIEW" },
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Cohort "${updated.title}" has been unpublished and returned to Review status.`,
    data: { isPublished: updated.isPublished, status: updated.status },
  };
}

export async function deleteProgramService(
  programId: string
): Promise<WellnessActionResult> {
  await requireProgramAccess(programId);

  const existing = await prisma.program.findUnique({
    where: { id: programId },
  });

  if (!existing) {
    return { success: false, message: "Program not found." };
  }

  const activeEnrollments = await prisma.programEnrollment.count({
    where: { programId, status: "ACTIVE" },
  });

  if (activeEnrollments > 0) {
    return {
      success: false,
      message: `Cannot delete program: ${activeEnrollments} active member(s) are currently enrolled. Cancel or refund enrollments first.`,
    };
  }

  await prisma.program.delete({ where: { id: programId } });
  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Program "${existing.title}" deleted permanently.`,
  };
}
