import { Prisma } from "@prisma/client";
import { prisma, lockProgramRow } from "../db";
import { requireProgramAccess } from "../security/guards";
import { parseCustomTaskFields } from "../utils/custom-tasks";
import { SaveSingleDaySchema, validateProgramDay } from "../validators/program";
import { safeJsonParse } from "../utils/json";
import { revalidateWellnessRoutes } from "./program-taxonomy";
import type { WellnessActionResult } from "../actions/auth";

export async function saveProgramDayService(
  rawInput: unknown
): Promise<WellnessActionResult> {
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
  await requireProgramAccess(d.programId);

  const parentProgram = await prisma.program.findFirst({
    where: { id: d.programId, deletedAt: null },
    select: { id: true, durationDays: true },
  });
  if (!parentProgram) {
    return { success: false, message: "Program not found." };
  }
  if (d.dayNumber > parentProgram.durationDays) {
    return {
      success: false,
      message: `Day ${d.dayNumber} exceeds the program's ${parentProgram.durationDays}-day duration.`,
    };
  }

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

  let parsedTranslations: Prisma.InputJsonValue | undefined = undefined;
  if (d.translations) {
    try {
      parsedTranslations =
        typeof d.translations === "string"
          ? (JSON.parse(d.translations) as Prisma.InputJsonValue)
          : (d.translations as Prisma.InputJsonValue);
    } catch {
      parsedTranslations = undefined;
    }
  }

  const sharedDayFields = {
    title: d.title.trim(),
    dayType: d.dayType,
    workoutOptionsJson: (d.workoutOptions || []) as Prisma.InputJsonValue,
    sleepRecommendation: d.sleepRecommendation?.trim() || null,
    dayNotificationsJson: (d.dayNotifications || []) as Prisma.InputJsonValue,
    videoUrl: d.videoUrl?.trim() || null,
    videoChecklistJson: (d.videoChecklist || []) as Prisma.InputJsonValue,
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
    coachName: d.dayType === "REST_DAY" ? null : d.coachName?.trim() || null,
    recommendedFor: d.dayType === "REST_DAY" ? null : d.recommendedFor?.trim() || null,
  };

  const savedDay = await prisma.$transaction(async (tx) => {
    const dayRow = await tx.programDay.upsert({
      where: {
        programId_dayNumber: {
          programId: d.programId,
          dayNumber: d.dayNumber,
        },
      },
      create: {
        programId: d.programId,
        dayNumber: d.dayNumber,
        ...sharedDayFields,
        ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
      },
      update: {
        ...sharedDayFields,
        version: { increment: 1 },
        ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
      },
    });

    if (d.customTasks !== undefined) {
      const incomingIds = d.customTasks
        .map((t) => t.id)
        .filter((id): id is string => Boolean(id));
      await tx.programDayCustomTask.deleteMany({
        where: {
          programDayId: dayRow.id,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      });
      for (let idx = 0; idx < d.customTasks.length; idx++) {
        const ct = d.customTasks[idx];
        let ctTranslations: Prisma.InputJsonValue | undefined = undefined;
        if (ct.translations) {
          try {
            ctTranslations =
              typeof ct.translations === "string"
                ? (JSON.parse(ct.translations) as Prisma.InputJsonValue)
                : (ct.translations as Prisma.InputJsonValue);
          } catch {
            ctTranslations = undefined;
          }
        }
        const ctData = {
          sortOrder: idx,
          taskType: ct.taskType,
          title: ct.title.trim(),
          instructions: ct.instructions?.trim() || null,
          isRequired: ct.isRequired ?? true,
          fieldsSchemaJson: ct.fields as unknown as Prisma.InputJsonValue,
          ...(ctTranslations !== undefined ? { translationsJson: ctTranslations } : {}),
        };
        if (ct.id) {
          const upd = await tx.programDayCustomTask.updateMany({
            where: { id: ct.id, programDayId: dayRow.id },
            data: ctData,
          });
          if (upd.count === 0) {
            await tx.programDayCustomTask.create({
              data: { programDayId: dayRow.id, ...ctData },
            });
          }
        } else {
          await tx.programDayCustomTask.create({
            data: { programDayId: dayRow.id, ...ctData },
          });
        }
      }
    }

    return tx.programDay.findUniqueOrThrow({
      where: { id: dayRow.id },
      include: { customTasks: { orderBy: { sortOrder: "asc" } } },
    });
  });

  revalidateWellnessRoutes();

  return {
    success: true,
    message: `Day ${savedDay.dayNumber} ("${savedDay.title}") saved.`,
    data: {
      ...savedDay,
      workoutOptions: safeJsonParse<string[]>(savedDay.workoutOptionsJson, []),
      videoChecklist: safeJsonParse<string[]>(savedDay.videoChecklistJson, []),
      dayNotifications: safeJsonParse<unknown[]>(savedDay.dayNotificationsJson, []),
      customTasks: savedDay.customTasks.map((ct) => ({
        id: ct.id,
        programDayId: ct.programDayId,
        sortOrder: ct.sortOrder,
        taskType: ct.taskType,
        title: ct.title,
        instructions: ct.instructions,
        isRequired: ct.isRequired,
        fields: parseCustomTaskFields(ct.fieldsSchemaJson),
        translations: ct.translationsJson ? JSON.stringify(ct.translationsJson) : null,
      })),
    },
  };
}

export async function deleteProgramDayService(
  programId: string,
  dayNumber: number
): Promise<WellnessActionResult> {
  await requireProgramAccess(programId);

  const result = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, programId);

    const existingDay = await tx.programDay.findUnique({
      where: {
        programId_dayNumber: {
          programId,
          dayNumber,
        },
      },
    });

    if (!existingDay) {
      return {
        success: false as const,
        message: `Day ${dayNumber} has not been saved yet.`,
      };
    }

    const activeEnrollments = await tx.programEnrollment.count({
      where: { programId, status: "ACTIVE" },
    });
    if (activeEnrollments > 0) {
      return {
        success: false as const,
        message: `Cannot clear Day ${dayNumber}: ${activeEnrollments} active participant(s) are currently enrolled.`,
      };
    }

    await tx.programDay.delete({ where: { id: existingDay.id } });
    await tx.program.update({
      where: { id: programId },
      data: { status: "DRAFT", version: { increment: 1 } },
    });

    return {
      success: true as const,
      message: `Day ${dayNumber} cleared. Program status set to Draft until all days are filled.`,
    };
  });

  if (result.success) revalidateWellnessRoutes();
  return result;
}
