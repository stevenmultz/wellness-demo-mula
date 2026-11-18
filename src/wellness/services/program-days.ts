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
    select: { id: true, durationDays: true, locationType: true },
  });
  if (!parentProgram) {
    return { success: false, message: "Program not found." };
  }
  if (
    parentProgram.locationType === "ONLINE" &&
    (d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
  ) {
    return {
      success: false,
      message:
        "Connect Day is only available for Hybrid programs. Full Online programs support Training and Rest days only.",
    };
  }
  if (parentProgram.locationType !== "ONLINE" && d.dayNumber > parentProgram.durationDays) {
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

  const sharedDayFields = {
    title: d.title.trim(),
    dayType: d.dayType,
    workoutOptionsJson: (d.workoutOptions || []) as Prisma.InputJsonValue,
    sleepRecommendation: d.sleepRecommendation?.trim() || null,
    dayNotificationsJson: (d.dayNotifications || []) as Prisma.InputJsonValue,
    videoUrl: d.videoUrl?.trim() || null,
    videoChecklistJson: (d.videoChecklist || []) as Prisma.InputJsonValue,
    mealRecommendation: d.mealRecommendation?.trim() || null,
    meetupLink: d.meetupLink?.trim() || null,
    mapLink: d.mapLink?.trim() || null,
    onsiteVenue: d.onsiteVenue?.trim() || null,
    onsiteSchedule: d.onsiteSchedule?.trim() || null,
    eventTitle: d.eventTitle?.trim() || null,
    eventHost: d.eventHost?.trim() || null,
    eventDetails: d.eventDetails?.trim() || null,
    restInstructions: d.restInstructions?.trim() || null,
  };

  const savedDay = await prisma.$transaction(async (tx) => {
    await lockProgramRow(tx, d.programId);

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
      },
      update: {
        ...sharedDayFields,
        version: { increment: 1 },
      },
    });

    if (parentProgram.locationType === "ONLINE") {
      const agg = await tx.programDay.aggregate({
        where: { programId: d.programId },
        _count: { id: true },
      });
      const syncedCount = Math.max(1, agg._count.id);
      await tx.program.update({
        where: { id: d.programId },
        data: { durationDays: syncedCount },
      });
    }

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
    const remainingAgg = await tx.programDay.aggregate({
      where: { programId },
      _max: { dayNumber: true },
      _count: { id: true },
    });
    const parentMeta = await tx.program.findUnique({
      where: { id: programId },
      select: { locationType: true, durationDays: true },
    });
    await tx.program.update({
      where: { id: programId },
      data: {
        status: "DRAFT",
        version: { increment: 1 },
        ...(parentMeta?.locationType === "ONLINE"
          ? { durationDays: Math.max(1, remainingAgg._count.id) }
          : {}),
      },
    });

    return {
      success: true as const,
      message: `Day ${dayNumber} cleared. Program status set to Draft until all days are filled.`,
    };
  });

  if (result.success) revalidateWellnessRoutes();
  return result;
}
