import { prisma } from "../db";
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

  const parentProgram = await prisma.program.findUnique({
    where: { id: d.programId },
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

  const sharedDayFields = {
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
        translations: d.translations || null,
      },
      update: {
        ...sharedDayFields,
        translations: d.translations !== undefined ? d.translations || null : undefined,
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
        const ctData = {
          sortOrder: idx,
          taskType: ct.taskType,
          title: ct.title.trim(),
          instructions: ct.instructions?.trim() || null,
          isRequired: ct.isRequired ?? true,
          fieldsSchema: JSON.stringify(ct.fields),
          translations: ct.translations || null,
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
      workoutOptions: safeJsonParse<string[]>(savedDay.workoutOptions, []),
      videoChecklist: safeJsonParse<string[]>(savedDay.videoChecklist, []),
      dayNotifications: safeJsonParse<unknown[]>(savedDay.dayNotifications, []),
      customTasks: savedDay.customTasks.map((ct) => ({
        id: ct.id,
        programDayId: ct.programDayId,
        sortOrder: ct.sortOrder,
        taskType: ct.taskType,
        title: ct.title,
        instructions: ct.instructions,
        isRequired: ct.isRequired,
        fields: parseCustomTaskFields(ct.fieldsSchema),
        translations: ct.translations,
      })),
    },
  };
}

export async function deleteProgramDayService(
  programId: string,
  dayNumber: number
): Promise<WellnessActionResult> {
  await requireProgramAccess(programId);

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
