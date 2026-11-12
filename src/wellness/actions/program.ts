"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { requireAuth, requireSuperadmin } from "../security/guards";
import {
  CreateProgramSchema,
  UpdateProgramMetaSchema,
  SaveSingleDaySchema,
  SubmitDayProgressSchema,
  validateProgramDay,
  isProgramDayComplete,
  isProgramHeaderComplete,
} from "../validators/program";
import { WellnessActionResult } from "./auth";
import {
  safeJsonParse,
  serializeTermsList,
  parseTermsList,
  serializeStringList,
  parseStringList,
  serializeReferencesList,
  parseReferencesList,
  parseWorkoutOptionGroups,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
} from "../utils/json";
import { getProgramDayWibWindow, calculateSleepDuration } from "../utils/timezone";
import { normalizeProgramStatus } from "../utils/timeline";

function splitCsvValues(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Synchronize 3NF relational pivot tables (ProgramCategory, ProgramCoach, ProgramAudience, ProgramEquipment, dailyCommitmentId)
 * inside an active Prisma transaction so relational integrity and Master Data foreign keys stay 100% in sync.
 */
async function syncProgramTaxonomyRelations(
  tx: any,
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
      data: categories.map((cat: any) => ({ programId, categoryId: cat.id })),
    });
  }
  if (coaches.length > 0) {
    await tx.programCoach.createMany({
      data: coaches.map((coach: any) => ({ programId, coachId: coach.id })),
    });
  }
  if (audiences.length > 0) {
    await tx.programAudience.createMany({
      data: audiences.map((aud: any) => ({ programId, audienceId: aud.id })),
    });
  }
  if (equipments.length > 0) {
    await tx.programEquipment.createMany({
      data: equipments.map((eq: any) => ({ programId, equipmentId: eq.id })),
    });
  }

  if (commitment?.id) {
    await tx.program.update({
      where: { id: programId },
      data: { dailyCommitmentId: commitment.id },
    });
  } else {
    await tx.program.update({
      where: { id: programId },
      data: { dailyCommitmentId: null },
    });
  }
}

function revalidateWellnessRoutes() {
  try {
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore in non-Next request contexts (e.g. seed/CLI)
  }
}

/**
 * Superadmin: Create a new Cohort Program in DRAFT state (`isPublished: false`).
 * Stores all base cohort information (`title`, `coachName`, `recommendedFor`, `durationDays`, `price`, `maxQuota`, `dates`, etc.)
 * so the Admin can then populate Day 1 through Day N day-by-day before final launch.
 */
export async function wellnessAdminCreateProgram(
  rawInput: unknown
): Promise<WellnessActionResult> {
  await requireSuperadmin();

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

  // Generate unique slug
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const slug = `${baseSlug}-${randomSuffix}`;

  const now = new Date();
  const resolvedDuration = durationDays || 21;
  const startD = startDate ? new Date(startDate) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const endD = endDate ? new Date(endDate) : new Date(startD.getTime() + (resolvedDuration - 1) * 24 * 60 * 60 * 1000);
  const calculatedDays = Math.max(
    1,
    Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const finalDuration = durationDays || calculatedDays;

  const regDeadline = registrationDeadline
    ? new Date(registrationDeadline)
    : new Date(startD.getTime() - 24 * 60 * 60 * 1000);
  const regOpen = registrationOpenDate ? new Date(registrationOpenDate) : now;

  const resolvedActualPrice = actualPrice !== undefined ? Number(actualPrice) : (Number(price) || 0);
  const resolvedDiscount = discountPercentage !== undefined ? Number(discountPercentage) : 0;
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

  // Execute Program Header creation + Relational Taxonomy Sync + Optional Day Seed in 1 Atomic Transaction
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
        coachName: (coachName || "TBA").trim(),
        coachTitle: coachTitle?.trim() || null,
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
        status: status && status !== "DRAFT" ? status : "DRAFT",
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
      coachName,
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
    data: {
      ...newProgram,
      termsList: parseTermsList(newProgram.customTerms),
      expectedBenefits: parseStringList(newProgram.expectedBenefits, DEFAULT_PROGRAM_BENEFITS),
      scientificReferences: parseReferencesList(newProgram.scientificReferences, DEFAULT_PROGRAM_REFERENCES),
      programGuidelines: parseStringList(newProgram.programGuidelines, DEFAULT_PROGRAM_GUIDELINES),
    },
  };
}

/**
 * Superadmin (Modular Day-by-Day Curriculum Submission):
 * Save or update a single day independently (Day 1 through Day N).
 */
export async function wellnessAdminSaveProgramDay(
  rawInput: unknown
): Promise<WellnessActionResult> {
  await requireSuperadmin();

  const validation = SaveSingleDaySchema.safeParse(rawInput);
  if (!validation.success) {
    const detail = Object.values(validation.error.flatten().fieldErrors)
      .flat()
      .join(" ");
    return {
      success: false,
      message: detail || "Invalid daily curriculum input.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const d = validation.data;

  // Enforce required content based on dayType before saving as complete
  const dayValidation = validateProgramDay({
    title: d.title,
    dayType: d.dayType,
    videoUrl: d.videoUrl,
    videoChecklist: d.videoChecklist,
    restInstructions: d.restInstructions,
    onsiteVenue: d.onsiteVenue,
    onsiteSchedule: d.onsiteSchedule,
    meetupLink: d.meetupLink,
    eventTitle: d.eventTitle,
    mapLink: d.mapLink,
  });

  if (!dayValidation.isComplete) {
    return {
      success: false,
      message: `Incomplete Day Content: Please provide ${dayValidation.missingFields.join(", ")}.`,
    };
  }

  const savedDay = await prisma.programDay.upsert({
    where: {
      programId_dayNumber: {
        programId: d.programId,
        dayNumber: d.dayNumber,
      },
    },
    create: {
      programId: d.programId,
      dayNumber: d.dayNumber,
      title: d.title.trim(),
      dayType: d.dayType,
      workoutOptions: JSON.stringify(d.workoutOptions || []),
      sleepRecommendation: d.sleepRecommendation?.trim() || null,
      dayNotifications: JSON.stringify(d.dayNotifications || []),
      videoUrl: d.videoUrl?.trim() || null,
      videoChecklist: JSON.stringify(d.videoChecklist || []),
      mealRecommendation: d.mealRecommendation?.trim() || null,
      dailyAssessment: d.dailyAssessment?.trim() || null,
      pendingReminder:
        d.pendingReminder?.trim() ||
        `Day ${d.dayNumber} is unlocked! Complete your routine before 23:59.`,
      completedReminder:
        d.completedReminder?.trim() ||
        `Day ${d.dayNumber} completed! Great consistency.`,
      meetupLink: d.meetupLink?.trim() || null,
      mapLink: d.mapLink?.trim() || null,
      onsiteVenue: d.onsiteVenue?.trim() || null,
      onsiteSchedule: d.onsiteSchedule?.trim() || null,
      eventTitle: d.eventTitle?.trim() || null,
      eventHost: d.eventHost?.trim() || null,
      eventDetails: d.eventDetails?.trim() || null,
      restInstructions: d.restInstructions?.trim() || null,
      coachName: d.dayType === "REST_DAY" ? null : (d.coachName?.trim() || null),
      recommendedFor: d.dayType === "REST_DAY" ? null : (d.recommendedFor?.trim() || null),
    },
    update: {
      title: d.title.trim(),
      dayType: d.dayType,
      workoutOptions: JSON.stringify(d.workoutOptions || []),
      sleepRecommendation: d.sleepRecommendation?.trim() || null,
      dayNotifications: JSON.stringify(d.dayNotifications || []),
      videoUrl: d.videoUrl?.trim() || null,
      videoChecklist: JSON.stringify(d.videoChecklist || []),
      mealRecommendation: d.mealRecommendation?.trim() || null,
      dailyAssessment: d.dailyAssessment?.trim() || null,
      pendingReminder:
        d.pendingReminder?.trim() ||
        `Day ${d.dayNumber} is unlocked! Complete your routine before 23:59.`,
      completedReminder:
        d.completedReminder?.trim() ||
        `Day ${d.dayNumber} completed! Great consistency.`,
      meetupLink: d.meetupLink?.trim() || null,
      mapLink: d.mapLink?.trim() || null,
      onsiteVenue: d.onsiteVenue?.trim() || null,
      onsiteSchedule: d.onsiteSchedule?.trim() || null,
      eventTitle: d.eventTitle?.trim() || null,
      eventHost: d.eventHost?.trim() || null,
      eventDetails: d.eventDetails?.trim() || null,
      restInstructions: d.restInstructions?.trim() || null,
      coachName: d.dayType === "REST_DAY" ? null : (d.coachName?.trim() || null),
      recommendedFor: d.dayType === "REST_DAY" ? null : (d.recommendedFor?.trim() || null),
    },
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Day ${savedDay.dayNumber} ("${savedDay.title}") saved.`,
    data: {
      ...savedDay,
      workoutOptions: safeJsonParse<string[]>(savedDay.workoutOptions, []),
      videoChecklist: safeJsonParse<string[]>(savedDay.videoChecklist, []),
      dayNotifications: safeJsonParse<any[]>(savedDay.dayNotifications, []),
    },
  };
}

/**
 * Superadmin: Clear / Delete a specific Day from a Program.
 * If the program was published and removing a day makes it incomplete, reverts to Draft (`isPublished: false`).
 */
export async function wellnessAdminDeleteProgramDay(
  programId: string,
  dayNumber: number
): Promise<WellnessActionResult> {
  await requireSuperadmin();

  const existingDay = await prisma.programDay.findUnique({
    where: {
      programId_dayNumber: {
        programId,
        dayNumber,
      },
    },
  });

  if (!existingDay) {
    return {
      success: false,
      message: `Day ${dayNumber} has not been saved yet.`,
    };
  }

  await prisma.$transaction([
    prisma.programDay.delete({
      where: { id: existingDay.id },
    }),
    prisma.program.update({
      where: { id: programId },
      data: { isPublished: false },
    }),
  ]);

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Day ${dayNumber} cleared. Program status set to Draft until all days are filled.`,
  };
}

/**
 * Superadmin: Update all Base Info metadata (title, coachName, recommendedFor, description, durationDays, quota, dates, price, communityLink).
 */
export async function wellnessAdminUpdateProgramMeta(
  rawInput: unknown
): Promise<WellnessActionResult> {
  await requireSuperadmin();

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

  const existingProgram = await prisma.program.findUnique({
    where: { id: input.programId },
    include: { days: true },
  });

  if (!existingProgram) {
    return { success: false, message: "Program not found." };
  }

  // Prevent modifying core parameters once program is published and live
  if (existingProgram.isPublished) {
    return {
      success: false,
      message:
        "Program information is locked because this cohort is published and live. Unpublish the program first if you need to modify core terms.",
    };
  }

  // If duration is reduced, delete truncated excess days and update header atomically
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
      ? serializeTermsList(input.termsList, input.customTerms ?? existingProgram.customTerms)
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
    const regDeadline = input.registrationDeadline ? new Date(input.registrationDeadline) : existingProgram.registrationDeadline;
    const regOpen = input.registrationOpenDate !== undefined
      ? (input.registrationOpenDate ? new Date(input.registrationOpenDate) : null)
      : existingProgram.registrationOpenDate;

    const prog = await tx.program.update({
      where: { id: input.programId },
      data: {
        title: input.title.trim(),
        description: (input.description || existingProgram.description || "Program description will be configured soon.").trim(),
        targetState: input.targetState !== undefined ? (input.targetState.trim() || null) : existingProgram.targetState,
        methodology: input.methodology !== undefined ? (input.methodology.trim() || null) : existingProgram.methodology,
        expectedBenefits: serializedBenefits,
        scientificReferences: serializedReferences,
        programGuidelines: serializedGuidelines,
        coverImage: input.coverImage?.trim() || null,
        difficultyLevel: input.difficultyLevel || existingProgram.difficultyLevel || "INTERMEDIATE",
        category: input.category?.trim() || existingProgram.category || "Pilates",
        equipment: input.equipment?.trim() || null,
        dailyCommitment: input.dailyCommitment?.trim() || null,
        recommendedFor: (input.recommendedFor || existingProgram.recommendedFor || "All Levels").trim(),
        coachName: (input.coachName || existingProgram.coachName || "TBA").trim(),
        coachTitle: input.coachTitle?.trim() || null,
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
    data: {
      ...updated,
      termsList: parseTermsList(updated.customTerms),
      expectedBenefits: parseStringList(updated.expectedBenefits, DEFAULT_PROGRAM_BENEFITS),
      scientificReferences: parseReferencesList(updated.scientificReferences, DEFAULT_PROGRAM_REFERENCES),
      programGuidelines: parseStringList(updated.programGuidelines, DEFAULT_PROGRAM_GUIDELINES),
    },
  };
}

/**
 * Superadmin: Set program status directly:
 * - "NOT_SHOW" (Disembunyikan dari public & user catalog)
 * - "COMING_SOON" (Tampil dengan label Coming Soon, tanggal buka pendaftaran / TBA, belum bisa beli)
 * - "ACTIVE" (Aktif, pendaftaran terbuka dan bisa di-enroll)
 */
export async function wellnessAdminSetProgramStatus(
  programId: string,
  rawStatus: "DRAFT" | "REVIEW" | "OPEN" | "PUBLISH" | "DONE" | "ARCHIVE" | string
): Promise<WellnessActionResult<{ status: string; isPublished: boolean }>> {
  await requireSuperadmin();

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { days: { orderBy: { dayNumber: "asc" } } },
  });

  if (!program) {
    return { success: false, message: "Program not found." };
  }

  const targetStatus = normalizeProgramStatus(rawStatus);

  // If changing to REVIEW, OPEN or PUBLISH, ensure all days from Day 1 to Day durationDays are complete
  if (targetStatus === "REVIEW" || targetStatus === "OPEN" || targetStatus === "PUBLISH") {
    const missingDays: number[] = [];
    for (let i = 1; i <= program.durationDays; i++) {
      const dayRecord = program.days.find((d) => d.dayNumber === i);
      if (!isProgramDayComplete(dayRecord)) {
        missingDays.push(i);
      }
    }

    if (missingDays.length > 0) {
      const previewMissing =
        missingDays.length > 6
          ? `Day ${missingDays.slice(0, 6).join(", Day ")} (+${missingDays.length - 6} more)`
          : `Day ${missingDays.join(", Day ")}`;
      return {
        success: false,
        message: `Cannot change status to ${targetStatus}! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
      };
    }
  }

  // Jika diubah dari PUBLISH ke status non-PUBLISH (DRAFT, OPEN, ARCHIVE, DONE), pastikan tidak ada active members
  const isCurrentlyPublished =
    program.status === "PUBLISH" ||
    program.status === "PUBLISHED" ||
    program.status === "ACTIVE" ||
    program.isPublished;

  if (isCurrentlyPublished && targetStatus !== "PUBLISH") {
    const activeEnrollments = await prisma.programEnrollment.count({
      where: {
        programId,
        status: "ACTIVE",
      },
    });

    if (activeEnrollments > 0) {
      return {
        success: false,
        message: `Cannot update status: There are ${activeEnrollments} active participant(s) enrolled in this cohort. Use the official Unpublish action once no active participants remain.`,
      };
    }
  }

  const isPublished = targetStatus === "PUBLISH";

  const updated = await prisma.program.update({
    where: { id: programId },
    data: {
      status: targetStatus,
      isPublished,
    },
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

/**
 * Superadmin: Submit Final & Launch Program (`isPublished: true`) or revert to Draft (`isPublished: false`).
 * Dual-Gate Validation:
 * 1. Program Header must be 8/8 complete.
 * 2. Every single day from Day 1 to Day `durationDays` must be 100% complete.
 * Unpublish Guard:
 * Blocks unpublishing if active enrolled paying members exist.
 */
export async function wellnessAdminTogglePublishProgram(
  programId: string,
  publish: boolean
): Promise<WellnessActionResult<{ isPublished: boolean; status: string }>> {
  await requireSuperadmin();

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: {
      days: {
        orderBy: { dayNumber: "asc" },
      },
    },
  });

  if (!program) {
    return { success: false, message: "Program not found." };
  }

  if (publish) {
    // 1. Dual-Gate Gate 1: Program Header completeness (8/8 sections)
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

    if (!headerCheck.isComplete) {
      const missingSummary = headerCheck.missingSections
        .map((s) => `Point ${s.point}: ${s.title}`)
        .join(", ");
      return {
        success: false,
        message: `Cannot publish yet! Program header is incomplete (${headerCheck.completedCount}/${headerCheck.totalPoints} points completed). Missing: ${missingSummary}.`,
      };
    }

    // 2. Dual-Gate Gate 2: Full Curriculum Days completeness (Day 1..durationDays)
    const missingDays: number[] = [];
    for (let i = 1; i <= program.durationDays; i++) {
      const dayRecord = program.days.find((d) => d.dayNumber === i);
      if (!isProgramDayComplete(dayRecord)) {
        missingDays.push(i);
      }
    }

    if (missingDays.length > 0) {
      const previewMissing =
        missingDays.length > 6
          ? `Day ${missingDays.slice(0, 6).join(", Day ")} (+${missingDays.length - 6} more)`
          : `Day ${missingDays.join(", Day ")}`;
      return {
        success: false,
        message: `Cannot publish yet! All ${program.durationDays} curriculum days must be completed first. Incomplete: ${previewMissing}.`,
      };
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        isPublished: true,
        status: "PUBLISH",
      },
    });

    revalidateWellnessRoutes();

    return {
      success: true,
      message: `Cohort "${updated.title}" is now PUBLISHED and live! Core settings are locked to preserve integrity.`,
      data: { isPublished: updated.isPublished, status: updated.status },
    };
  } else {
    // Unpublish Guard: Check for active enrolled members
    const activeEnrollments = await prisma.programEnrollment.count({
      where: {
        programId,
        status: "ACTIVE",
      },
    });

    if (activeEnrollments > 0) {
      return {
        success: false,
        message: `Cannot unpublish: ${activeEnrollments} active member(s) are currently enrolled in this cohort. Unpublishing would break their live curriculum access.`,
      };
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        isPublished: false,
        status: "REVIEW",
      },
    });

    revalidateWellnessRoutes();

    return {
      success: true,
      message: `Cohort "${updated.title}" has been unpublished and returned to Review status.`,
      data: { isPublished: updated.isPublished, status: updated.status },
    };
  }
}

/**
 * Superadmin: Delete a wellness program and its days.
 * Strictly prevents deleting programs with active member enrollments.
 */
export async function wellnessAdminDeleteProgram(
  programId: string
): Promise<WellnessActionResult> {
  await requireSuperadmin();

  const existing = await prisma.program.findUnique({
    where: { id: programId },
  });

  if (!existing) {
    return { success: false, message: "Program not found." };
  }

  const activeEnrollments = await prisma.programEnrollment.count({
    where: {
      programId,
      status: "ACTIVE",
    },
  });

  if (activeEnrollments > 0) {
    return {
      success: false,
      message: `Cannot delete program: ${activeEnrollments} active member(s) are currently enrolled. Cancel or refund enrollments first.`,
    };
  }

  await prisma.program.delete({
    where: { id: programId },
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Program "${existing.title}" deleted permanently.`,
  };
}

/**
 * User: Submit or toggle daily progress (checklist, video completion, assessment response).
 * Enforces SOW 5.3 Strict Calendar Drip (`00:00` unlock & `23:59` cutoff) & Verified Paying Member access.
 */
export async function wellnessUserSubmitDayProgress(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const validation = SubmitDayProgressSchema.safeParse(rawInput);
  if (!validation.success) {
    return {
      success: false,
      message: "Invalid day progress input.",
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    programDayId,
    videoWatched,
    isCompleted,
    checklistCompleted,
    selectedWorkout,
    photoBeforeUrl,
    photoAfterUrl,
    workoutNotes,
    eventFeedback,
    mealCompliance,
    mealNotes,
    dailyReflection,
    happinessRate,
    bedtime,
    wakeTime,
    sleepDurationMinutes,
    assessmentResponse,
  } = validation.data;

  // Verify the day exists and get its programId
  const programDay = await prisma.programDay.findUnique({
    where: { id: programDayId },
    include: { program: true },
  });

  if (!programDay) {
    return { success: false, message: "Scheduled day not found." };
  }

  // Verify user has an ACTIVE enrollment for this program
  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      userId_programId: {
        userId: session.userId,
        programId: programDay.programId,
      },
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") {
    return {
      success: false,
      message:
        "Access denied. Active QRIS-verified enrollment is required to log daily curriculum progress.",
    };
  }

  // Enforce SOW 5.3 Strict Calendar Drip & 23:59 Nightly Cutoff in Western Indonesia Time (WIB)
  const { isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(
    programDay.program.startDate,
    programDay.dayNumber
  );

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Day ${programDay.dayNumber} is locked until 00:00 WIB on its scheduled calendar date.`,
    };
  }

  // Existing answers stay editable after 23:59 WIB. A day with no saved row stays closed.
  const existingProgress = await prisma.programDayProgress.findUnique({
    where: {
      userId_programDayId: {
        userId: session.userId,
        programDayId,
      },
    },
  });

  if (isPast2359 && !existingProgress) {
    return {
      success: false,
      message: `The 23:59 WIB cutoff for Day ${programDay.dayNumber} has passed. Past days are read-only.`,
    };
  }

  const nextVideoWatched =
    videoWatched !== undefined
      ? videoWatched
      : existingProgress?.videoWatched ?? false;

  // Compute sleep duration if bedtime and wakeTime are provided
  const finalBedtime = bedtime !== undefined ? bedtime : existingProgress?.bedtime || null;
  const finalWakeTime = wakeTime !== undefined ? wakeTime : existingProgress?.wakeTime || null;
  let finalSleepMinutes = sleepDurationMinutes;
  if (finalSleepMinutes === undefined && finalBedtime && finalWakeTime) {
    const calc = calculateSleepDuration(finalBedtime, finalWakeTime);
    finalSleepMinutes = calc ? calc.totalMinutes : null;
  }

  // Enforce Training Day completion rules (checklist items complete for selected workout option)
  let verifiedCompleted = isCompleted;
  if (programDay.dayType === "TRAINING_DAY") {
    const rawChecklist: string[] = safeJsonParse<string[]>(programDay.videoChecklist, []);
    const groups = parseWorkoutOptionGroups(
      safeJsonParse<string[]>(programDay.workoutOptions, []),
      rawChecklist
    );

    const activeOptName =
      selectedWorkout ||
      existingProgress?.selectedWorkout ||
      groups[0]?.optionName ||
      "Workout";

    const activeGroup =
      groups.find(
        (g) => g.optionName.trim().toLowerCase() === activeOptName.trim().toLowerCase()
      ) || groups[0];

    if (activeGroup && activeGroup.movements.length > 0) {
      // Normalize checked keys by stripping actual reps ("= reps") and matching case-insensitively
      const checkedKeys = new Set(
        checklistCompleted.map((item) =>
          (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
        )
      );

      const allActiveMovementsDone = activeGroup.movements.every((m) => {
        const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
        const plainKey = m.name.trim().toLowerCase();
        return checkedKeys.has(scopedKey) || checkedKeys.has(plainKey);
      });

      if (!allActiveMovementsDone) {
        verifiedCompleted = false;
      }
    } else if (rawChecklist.length > 0) {
      const allTasksChecked = rawChecklist.every((t) => checklistCompleted.includes(t));
      if (!allTasksChecked) {
        verifiedCompleted = false;
      }
    }
  }

  const payloadData = {
    videoWatched: nextVideoWatched,
    isCompleted: verifiedCompleted,
    checklistCompleted: JSON.stringify(checklistCompleted),
    selectedWorkout: selectedWorkout !== undefined ? (selectedWorkout || null) : existingProgress?.selectedWorkout,
    photoBeforeUrl: photoBeforeUrl !== undefined ? (photoBeforeUrl || null) : existingProgress?.photoBeforeUrl,
    photoAfterUrl: photoAfterUrl !== undefined ? (photoAfterUrl || null) : existingProgress?.photoAfterUrl,
    workoutNotes: workoutNotes !== undefined ? (workoutNotes || null) : (existingProgress as any)?.workoutNotes,
    eventFeedback: eventFeedback !== undefined ? (eventFeedback || null) : (existingProgress as any)?.eventFeedback,
    mealCompliance: mealCompliance !== undefined ? (mealCompliance || null) : existingProgress?.mealCompliance,
    mealNotes: mealNotes !== undefined ? (mealNotes || null) : existingProgress?.mealNotes,
    dailyReflection: dailyReflection !== undefined ? (dailyReflection || null) : existingProgress?.dailyReflection,
    happinessRate: happinessRate !== undefined ? happinessRate : existingProgress?.happinessRate,
    bedtime: finalBedtime,
    wakeTime: finalWakeTime,
    sleepDurationMinutes: finalSleepMinutes,
    assessmentResponse: assessmentResponse !== undefined ? (assessmentResponse || null) : existingProgress?.assessmentResponse,
    completedAt: verifiedCompleted ? new Date() : (isCompleted ? existingProgress?.completedAt : null),
  };

  const progress = existingProgress
    ? await prisma.programDayProgress.update({
        where: { id: existingProgress.id },
        data: payloadData,
      })
    : await prisma.programDayProgress.create({
        data: {
          userId: session.userId,
          programDayId,
          ...payloadData,
        },
      });

  return {
    success: true,
    message: verifiedCompleted
      ? programDay.completedReminder || "Day marked as completed! Excellent job."
      : "Daily progress saved.",
    data: progress,
  };
}

export interface ProgramSubmissionItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  programDayId: string;
  dayNumber: number;
  dayTitle: string;
  dayType: string;
  isCompleted: boolean;
  videoWatched: boolean;
  checklistCompleted: string[];
  selectedWorkout: string | null;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  workoutNotes: string | null;
  eventFeedback: string | null;
  mealCompliance: string | null;
  mealNotes: string | null;
  dailyReflection: string | null;
  happinessRate: number | null;
  bedtime: string | null;
  wakeTime: string | null;
  sleepDurationMinutes: number | null;
  assessmentResponse: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface ProgramSubmissionsPayload {
  submissions: ProgramSubmissionItem[];
  stats: {
    totalSubmissions: number;
    completedSubmissions: number;
    photoSubmissions: number;
    uniqueMembers: number;
  };
}

/**
 * Superadmin: Retrieve all member responses / day progress submissions for a program.
 * Includes optional filtering by day number, user ID, or photo presence.
 */
export async function wellnessAdminGetProgramSubmissions(
  programId: string,
  filters?: {
    dayNumber?: number;
    userId?: string;
    hasPhotosOnly?: boolean;
    limit?: number;
  }
): Promise<WellnessActionResult<ProgramSubmissionsPayload>> {
  await requireSuperadmin();

  if (!programId) {
    return { success: false, message: "Program ID is required." };
  }

  const whereClause: any = {
    programDay: {
      programId,
    },
  };

  if (filters?.dayNumber !== undefined && filters.dayNumber > 0) {
    whereClause.programDay.dayNumber = filters.dayNumber;
  }

  if (filters?.userId && filters.userId !== "ALL") {
    whereClause.userId = filters.userId;
  }

  if (filters?.hasPhotosOnly) {
    whereClause.OR = [
      { photoBeforeUrl: { not: null } },
      { photoAfterUrl: { not: null } },
    ];
  }

  const limit = filters?.limit ? Math.min(500, Math.max(1, filters.limit)) : 200;

  const rawRecords = await prisma.programDayProgress.findMany({
    where: whereClause,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      programDay: {
        select: {
          id: true,
          dayNumber: true,
          title: true,
          dayType: true,
        },
      },
    },
    orderBy: [
      { programDay: { dayNumber: "asc" } },
      { completedAt: "desc" },
    ],
  });

  const uniqueUserIds = new Set<string>();
  let completedCount = 0;
  let photoCount = 0;

  const submissions: ProgramSubmissionItem[] = rawRecords.map((r) => {
    uniqueUserIds.add(r.userId);
    if (r.isCompleted) completedCount++;
    if (r.photoBeforeUrl || r.photoAfterUrl) photoCount++;

    return {
      id: r.id,
      userId: r.userId,
      userName: r.user?.fullName || "Member",
      userEmail: r.user?.email || "",
      programDayId: r.programDayId,
      dayNumber: r.programDay.dayNumber,
      dayTitle: r.programDay.title,
      dayType: r.programDay.dayType,
      isCompleted: r.isCompleted,
      videoWatched: r.videoWatched,
      checklistCompleted: safeJsonParse<string[]>(r.checklistCompleted, []),
      selectedWorkout: r.selectedWorkout,
      photoBeforeUrl: r.photoBeforeUrl,
      photoAfterUrl: r.photoAfterUrl,
      workoutNotes: r.workoutNotes,
      eventFeedback: r.eventFeedback,
      mealCompliance: r.mealCompliance,
      mealNotes: r.mealNotes,
      dailyReflection: r.dailyReflection,
      happinessRate: r.happinessRate,
      bedtime: r.bedtime,
      wakeTime: r.wakeTime,
      sleepDurationMinutes: r.sleepDurationMinutes,
      assessmentResponse: r.assessmentResponse,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    };
  });

  return {
    success: true,
    message: "Program submissions loaded successfully.",
    data: {
      submissions,
      stats: {
        totalSubmissions: submissions.length,
        completedSubmissions: completedCount,
        photoSubmissions: photoCount,
        uniqueMembers: uniqueUserIds.size,
      },
    },
  };
}
