import crypto from "crypto";
import { Prisma, type Program, type ProgramDay } from "@prisma/client";
import { prisma, lockProgramRow } from "../db";
import { requireAdminAccess, requireProgramAccess } from "../security/guards";
import { clampMinQuota } from "../security/program-rules";
import { ensureCoachNameIncluded } from "../security/roles";
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
    batchNumber: program.batchNumber ?? null,
    coverImage: program.coverImagePath,
    introVideoUrl: program.introVideoUrl,
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

function getIncompleteDaysPreview(
  program: { locationType: string; durationDays: number },
  days: ProgramDay[]
): string | null {
  if (program.locationType === "ONLINE") {
    if (days.length === 0) return "at least 1 Day / Module";
    const maxDayNum = Math.max(
      program.durationDays || 1,
      ...days.map((d) => d.dayNumber)
    );
    const missingDays: number[] = [];
    for (let i = 1; i <= maxDayNum; i++) {
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

  const missingDays: number[] = [];
  for (let i = 1; i <= program.durationDays; i++) {
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

  if (session.role === "PARTNER_ADMIN" && !session.organizationId) {
    return {
      success: false,
      message: "Your Community Admin account is not linked to a community yet. Contact Superadmin.",
    };
  }
  if (session.role === "COACH" && (!session.coachProfileId || !session.coachProfileName)) {
    return {
      success: false,
      message: "Your Coach account is not linked to a Coach Profile yet. Contact Superadmin.",
    };
  }

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
    batchNumber,
    description,
    coverImage,
    introVideoUrl,
    difficultyLevel,
    category,
    equipment,
    dailyCommitment,
    coachName,
    organizationId,
    durationDays,
    actualPrice,
    discountPercentage,
    price,
    minQuota,
    maxQuota,
    communityLink,
    locationType,
    city,
    venueAddress,
    startDate,
    endDate,
    registrationOpenDate,
    registrationDeadline,
    status,
    days,
  } = validation.data;

  const isOnlineProgram = (locationType || "ONLINE") === "ONLINE";
  const resolvedBatchNumber =
    batchNumber !== undefined && batchNumber !== null
      ? batchNumber
      : isOnlineProgram
        ? null
        : 1;
  const baseSlug = `${title}${resolvedBatchNumber ? `-batch-${resolvedBatchNumber}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const slug = `${baseSlug || "program"}-${randomSuffix}`;

  const now = new Date();
  if (
    isOnlineProgram &&
    days?.some((d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
  ) {
    return {
      success: false,
      message: "Connect Day is only available for Hybrid programs. Full Online programs support Training and Rest days only.",
    };
  }

  const resolvedDuration = isOnlineProgram ? Math.max(1, days?.length || 1) : (durationDays || 21);
  let startD: Date | null = null;
  let endD: Date | null = null;
  let regDeadline: Date | null = null;
  let regOpen: Date | null = null;
  let finalDuration = resolvedDuration;

  if (!isOnlineProgram) {
    startD = startDate
      ? new Date(startDate)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    endD = endDate
      ? new Date(endDate)
      : new Date(startD.getTime() + (resolvedDuration - 1) * 24 * 60 * 60 * 1000);
    const calculatedDays = Math.max(
      1,
      Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    finalDuration = durationDays || calculatedDays;
    regDeadline = registrationDeadline
      ? new Date(registrationDeadline)
      : new Date(startD.getTime() - 24 * 60 * 60 * 1000);
    regOpen = registrationOpenDate ? new Date(registrationOpenDate) : now;
  }

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

  const effectiveOrganizationId =
    session.role === "SUPERADMIN"
      ? organizationId?.trim() || null
      : session.role === "PARTNER_ADMIN"
        ? session.organizationId
        : session.role === "COACH"
          ? session.organizationId ?? null
          : null;

  const matchedOrg = effectiveOrganizationId
    ? await prisma.masterOrganization.findUnique({
        where: { id: effectiveOrganizationId },
        select: { id: true },
      })
    : null;

  const effectiveCoachName =
    session.role === "COACH" && session.coachProfileName
      ? ensureCoachNameIncluded(coachName, session.coachProfileName)
      : (coachName || "").trim();

  const newProgram = await prisma.$transaction(async (tx) => {
    const created = await tx.program.create({
      data: {
        title: title.trim(),
        slug,
        batchNumber: resolvedBatchNumber,
        description: description.trim(),
        targetState: validation.data.targetState?.trim() || DEFAULT_TARGET_STATE,
        methodology: validation.data.methodology?.trim() || DEFAULT_METHODOLOGY,
        expectedBenefitsJson: benefitsJson,
        scientificReferencesJson: referencesJson,
        programGuidelinesJson: guidelinesJson,
        coverImagePath: coverImage?.trim() || null,
        introVideoUrl: introVideoUrl?.trim() || null,
        difficultyLevel: difficultyLevel || "INTERMEDIATE",
        organizationId: matchedOrg?.id || null,
        durationDays: finalDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        minQuota: clampMinQuota(minQuota, maxQuota || 50),
        maxQuota: maxQuota || 50,
        communityLink: communityLink?.trim() || null,
        locationType: isOnlineProgram ? "ONLINE" : "HYBRID",
        city: isOnlineProgram ? null : city?.trim() || null,
        venueAddress: isOnlineProgram ? null : venueAddress?.trim() || null,
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
                  meetupLink: d.meetupLink || null,
                  onsiteVenue: d.onsiteVenue || null,
                  onsiteSchedule: d.onsiteSchedule || null,
                  restInstructions:
                    d.dayType === "REST_DAY"
                      ? d.restInstructions ||
                        "Take today to rest, stretch gently, and let your body restore its energy."
                      : d.restInstructions || null,
                })),
              }
            : undefined,
      },
    });

    await syncProgramTaxonomyRelations(tx, created.id, {
      category: category?.trim() || "Pilates",
      coachName: effectiveCoachName,
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

  const existingTax = serializeProgramTaxonomy(existingProgram);
  const nextIsOnline = (input.locationType || existingProgram.locationType) === "ONLINE";

  if (
    nextIsOnline &&
    existingProgram.days.some(
      (d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY"
    )
  ) {
    return {
      success: false,
      message:
        "Cannot switch to Full Online while Connect Day modules exist in the curriculum. Change or clear those Connect Days to Training or Rest Days first.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, input.programId);

    const resolvedDuration = nextIsOnline
      ? Math.max(1, existingProgram.days.length)
      : input.durationDays || existingProgram.durationDays || 21;
    if (!nextIsOnline && resolvedDuration < existingProgram.durationDays) {
      await tx.programDay.deleteMany({
        where: {
          programId: input.programId,
          dayNumber: { gt: resolvedDuration },
        },
      });
    }

    const startD = nextIsOnline
      ? null
      : input.startDate
        ? new Date(input.startDate)
        : existingProgram.startAt;
    const endD = nextIsOnline
      ? null
      : input.endDate
        ? new Date(input.endDate)
        : existingProgram.endAt;
    const regDeadline = nextIsOnline
      ? null
      : input.registrationDeadline
        ? new Date(input.registrationDeadline)
        : existingProgram.registrationDeadlineAt;
    const regOpen = nextIsOnline
      ? null
      : input.registrationOpenDate !== undefined
        ? input.registrationOpenDate
          ? new Date(input.registrationOpenDate)
          : null
        : existingProgram.registrationOpenAt;

    const requestedOrgId =
      session.role === "SUPERADMIN"
        ? input.organizationId !== undefined
          ? input.organizationId?.trim() || null
          : existingProgram.organizationId
        : session.role === "PARTNER_ADMIN"
          ? session.organizationId
          : existingProgram.organizationId;

    const orgRecord = requestedOrgId
      ? await tx.masterOrganization.findUnique({
          where: { id: requestedOrgId },
          select: { id: true },
        })
      : null;

    const requestedCoachName =
      session.role === "COACH" && session.coachProfileName
        ? ensureCoachNameIncluded(
            input.coachName ?? existingTax.coachName,
            session.coachProfileName
          )
        : (input.coachName ?? existingTax.coachName).trim();

    await tx.program.update({
      where: { id: input.programId },
      data: {
        title: input.title.trim(),
        batchNumber:
          nextIsOnline
            ? null
            : input.batchNumber !== undefined
              ? input.batchNumber
              : existingProgram.batchNumber,
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
        introVideoUrl:
          input.introVideoUrl !== undefined
            ? input.introVideoUrl?.trim() || null
            : existingProgram.introVideoUrl,
        difficultyLevel:
          input.difficultyLevel || existingProgram.difficultyLevel || "INTERMEDIATE",
        organizationId: orgRecord?.id || null,
        durationDays: resolvedDuration,
        actualPrice: resolvedActualPrice,
        discountPercentage: resolvedDiscount,
        price: resolvedFinalPrice,
        minQuota: clampMinQuota(
          input.minQuota !== undefined ? input.minQuota : existingProgram.minQuota,
          Math.max(1, Number(input.maxQuota) || existingProgram.maxQuota || 50)
        ),
        maxQuota: Math.max(1, Number(input.maxQuota) || 50),
        communityLink: input.communityLink?.trim() || null,
        locationType: nextIsOnline ? "ONLINE" : "HYBRID",
        city: nextIsOnline ? null : input.city?.trim() || null,
        venueAddress: nextIsOnline ? null : input.venueAddress?.trim() || null,
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
      equipment: input.equipment !== undefined ? input.equipment : existingTax.equipment,
      dailyCommitment:
        input.dailyCommitment !== undefined
          ? input.dailyCommitment
          : existingTax.dailyCommitment,
    });

    return tx.program.findUniqueOrThrow({
      where: { id: input.programId },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: { orderBy: { dayNumber: "asc" } },
      },
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

      if (
        program.locationType === "ONLINE" &&
        program.days.some((d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
      ) {
        return {
          success: false as const,
          message:
            "Cannot publish Full Online program with Connect Day modules. Connect Days are only supported in Hybrid programs.",
        };
      }
    }

    if (targetPrismaStatus === "OPEN" || targetPrismaStatus === "PUBLISHED") {
      const previewMissing = getIncompleteDaysPreview(program, program.days);
      if (previewMissing) {
        return {
          success: false as const,
          message: `Cannot change status to ${targetPrismaStatus}! Curriculum content is incomplete: ${previewMissing}.`,
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

      if (
        program.locationType === "ONLINE" &&
        program.days.some((d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
      ) {
        return {
          success: false as const,
          message:
            "Cannot publish Full Online program with Connect Day modules. Connect Days are only supported in Hybrid programs.",
        };
      }

      const previewMissing = getIncompleteDaysPreview(program, program.days);
      if (previewMissing) {
        return {
          success: false as const,
          message: `Cannot publish yet! Curriculum content is incomplete: ${previewMissing}.`,
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
      message: `Cohort "${updated.title}" has been unpublished and returned to Open status.`,
      data: { isPublished: false, status: "OPEN" },
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
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        status: true,
        organizationId: true,
        coaches: { select: { coachId: true } },
      },
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

/**
 * Duplicates a program (header, taxonomy, all curriculum days, and custom tasks)
 * into a fresh Draft with an incremented `batchNumber` and unique slug so admins/communities
 * can launch Batch 2, Batch 3, etc. without re-entering data.
 */
export async function duplicateProgramService(
  sourceProgramId: string,
  options?: { asNextBatch?: boolean }
): Promise<WellnessActionResult> {
  const admin = await requireProgramAccess(sourceProgramId);

  const result = await prisma.$transaction(async (tx) => {
    const source = await tx.program.findFirst({
      where: { id: sourceProgramId, deletedAt: null },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: {
          orderBy: { dayNumber: "asc" },
          include: {
            customTasks: { orderBy: { sortOrder: "asc" } },
          },
        },
      },
    });

    if (!source) {
      return { success: false as const, message: "Source program not found." };
    }

    const asNextBatch = options?.asNextBatch ?? true;
    const isOnline = source.locationType === "ONLINE";

    let nextBatchNumber: number | null = null;
    if (!isOnline || source.batchNumber !== null) {
      const sameSeries = await tx.program.aggregate({
        where: {
          title: source.title,
          organizationId: source.organizationId,
          deletedAt: null,
        },
        _max: { batchNumber: true },
      });
      const currentMax = Math.max(source.batchNumber ?? 1, sameSeries._max.batchNumber ?? 1);
      nextBatchNumber = asNextBatch ? currentMax + 1 : source.batchNumber;
    }

    const baseSlug = `${source.title}${nextBatchNumber ? `-batch-${nextBatchNumber}` : "-copy"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const suffix = crypto.randomBytes(3).toString("hex");
    const slug = `${baseSlug || "program"}-${suffix}`;

    let nextStart: Date | null = null;
    let nextEnd: Date | null = null;
    let nextOpen: Date | null = null;
    let nextDeadline: Date | null = null;
    if (!isOnline) {
      const duration = Math.max(1, source.durationDays || 7);
      const baseStart = source.endAt
        ? new Date(source.endAt.getTime() + 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      nextStart = baseStart;
      nextEnd = new Date(baseStart.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
      nextOpen = new Date();
      nextDeadline = new Date(baseStart.getTime() - 2 * 24 * 60 * 60 * 1000);
    }

    const cloned = await tx.program.create({
      data: {
        title: source.title,
        slug,
        batchNumber: nextBatchNumber,
        description: source.description,
        coverImagePath: source.coverImagePath,
        introVideoUrl: source.introVideoUrl,
        difficultyLevel: source.difficultyLevel,
        durationDays: isOnline ? Math.max(1, source.days.length) : source.durationDays,
        actualPrice: source.actualPrice,
        discountPercentage: source.discountPercentage,
        price: source.price,
        minQuota: source.minQuota,
        maxQuota: source.maxQuota,
        communityLink: source.communityLink,
        locationType: source.locationType,
        city: isOnline ? null : source.city,
        venueAddress: isOnline ? null : source.venueAddress,
        startAt: nextStart,
        endAt: nextEnd,
        registrationOpenAt: nextOpen,
        registrationDeadlineAt: nextDeadline,
        status: "DRAFT",
        dailyCommitmentId: source.dailyCommitmentId,
        organizationId: source.organizationId,
        customTerms: source.customTerms,
        targetState: source.targetState,
        methodology: source.methodology,
        expectedBenefitsJson:
          source.expectedBenefitsJson === null
            ? Prisma.DbNull
            : (source.expectedBenefitsJson as Prisma.InputJsonValue),
        scientificReferencesJson:
          source.scientificReferencesJson === null
            ? Prisma.DbNull
            : (source.scientificReferencesJson as Prisma.InputJsonValue),
        programGuidelinesJson:
          source.programGuidelinesJson === null
            ? Prisma.DbNull
            : (source.programGuidelinesJson as Prisma.InputJsonValue),
      },
    });

    await Promise.all([
      source.categories.length > 0
        ? tx.programCategory.createMany({
            data: source.categories.map((c) => ({
              programId: cloned.id,
              categoryId: c.category.id,
            })),
          })
        : Promise.resolve(),
      source.coaches.length > 0
        ? tx.programCoach.createMany({
            data: source.coaches.map((c) => ({
              programId: cloned.id,
              coachId: c.coach.id,
            })),
          })
        : Promise.resolve(),
      source.equipments.length > 0
        ? tx.programEquipment.createMany({
            data: source.equipments.map((e) => ({
              programId: cloned.id,
              equipmentId: e.equipment.id,
            })),
          })
        : Promise.resolve(),
    ]);

    // Batch create all days and their custom tasks concurrently in chunks (avoids N+1 sequential timeout)
    const CHUNK_SIZE = 10;
    for (let i = 0; i < source.days.length; i += CHUNK_SIZE) {
      const chunk = source.days.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (day) => {
          const createdDay = await tx.programDay.create({
            data: {
              programId: cloned.id,
              dayNumber: day.dayNumber,
              title: day.title,
              dayType: day.dayType,
              workoutOptionsJson:
                day.workoutOptionsJson === null
                  ? Prisma.DbNull
                  : (day.workoutOptionsJson as Prisma.InputJsonValue),
              sleepRecommendation: day.sleepRecommendation,
              dayNotificationsJson:
                day.dayNotificationsJson === null
                  ? Prisma.DbNull
                  : (day.dayNotificationsJson as Prisma.InputJsonValue),
              videoUrl: day.videoUrl,
              videoChecklistJson:
                day.videoChecklistJson === null
                  ? Prisma.DbNull
                  : (day.videoChecklistJson as Prisma.InputJsonValue),
              mealRecommendation: day.mealRecommendation,
              meetupLink: day.meetupLink,
              mapLink: day.mapLink,
              onsiteVenue: day.onsiteVenue,
              onsiteSchedule: day.onsiteSchedule,
              eventTitle: day.eventTitle,
              eventHost: day.eventHost,
              eventDetails: day.eventDetails,
              restInstructions: day.restInstructions,
            },
          });

          if (day.customTasks.length > 0) {
            await tx.programDayCustomTask.createMany({
              data: day.customTasks.map((ct) => ({
                programDayId: createdDay.id,
                sortOrder: ct.sortOrder,
                taskType: ct.taskType,
                title: ct.title,
                instructions: ct.instructions,
                isRequired: true,
                fieldsSchemaJson: ct.fieldsSchemaJson as Prisma.InputJsonValue,
                translationsJson:
                  ct.translationsJson === null
                    ? Prisma.DbNull
                    : (ct.translationsJson as Prisma.InputJsonValue),
              })),
            });
          }
        })
      );
    }

    await recordAuditLog(
      {
        actorUserId: admin.userId,
        action: "PROGRAM_DUPLICATED",
        entityType: "Program",
        entityId: cloned.id,
        metadata: { sourceProgramId, batchNumber: nextBatchNumber },
      },
      tx
    );

    const fullCloned = await tx.program.findUniqueOrThrow({
      where: { id: cloned.id },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: {
          orderBy: { dayNumber: "asc" },
          include: { customTasks: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    return {
      success: true as const,
      message: nextBatchNumber
        ? `Created "${cloned.title}" (Batch ${nextBatchNumber}) as Draft with all ${source.days.length} day(s) copied.`
        : `Duplicated "${cloned.title}" as Draft with all ${source.days.length} module(s) copied.`,
      data: toClientProgramPayload(fullCloned),
    };
  }, { timeout: 20000 });

  if (result.success) revalidateWellnessRoutes();
  return result;
}
