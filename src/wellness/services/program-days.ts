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
    select: { id: true, durationDays: true, locationType: true, status: true },
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

  let savedDay;
  try {
    savedDay = await prisma.$transaction(async (tx) => {
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
          _max: { dayNumber: true },
          _count: { id: true },
        });
        const syncedDuration = Math.max(1, agg._max.dayNumber ?? agg._count.id);
        await tx.program.update({
          where: { id: d.programId },
          data: { durationDays: syncedDuration },
        });
      }

      if (d.customTasks !== undefined) {
        const incomingIds = d.customTasks
          .map((t) => t.id)
          .filter((id): id is string => Boolean(id));

        const tasksToRemove = await tx.programDayCustomTask.findMany({
          where: {
            programDayId: dayRow.id,
            ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
          },
          select: { id: true, title: true, _count: { select: { submissions: true } } },
        });

        const submittedToRemove = tasksToRemove.filter((t) => t._count.submissions > 0);
        if (submittedToRemove.length > 0) {
          const activeEnrollments = await tx.programEnrollment.count({
            where: { programId: d.programId, status: "ACTIVE" },
          });
          if (parentProgram.status === "PUBLISHED" || activeEnrollments > 0) {
            throw new Error(
              `Cannot remove custom task(s) (${submittedToRemove
                .map((t) => `"${t.title}"`)
                .join(", ")}) because enrolled members have already submitted responses.`
            );
          }
        }

        if (tasksToRemove.length > 0) {
          await tx.programDayCustomTask.deleteMany({
            where: { id: { in: tasksToRemove.map((t) => t.id) } },
          });
        }

        const existingIds = new Set(
          (
            await tx.programDayCustomTask.findMany({
              where: { programDayId: dayRow.id },
              select: { id: true },
            })
          ).map((r) => r.id)
        );

        const toUpdate: Array<{
          id: string;
          data: Prisma.ProgramDayCustomTaskUpdateManyMutationInput;
        }> = [];
        const toCreate: Prisma.ProgramDayCustomTaskCreateManyInput[] = [];

        for (let idx = 0; idx < d.customTasks.length; idx++) {
          const ct = d.customTasks[idx];
          let ctTranslations: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined = undefined;
          if (ct.translations === null || ct.translations === "") {
            ctTranslations = Prisma.DbNull;
          } else if (ct.translations) {
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
            isRequired: true, // All tasks are mandatory (no optional tasks)
            fieldsSchemaJson: ct.fields as unknown as Prisma.InputJsonValue,
            ...(ctTranslations !== undefined ? { translationsJson: ctTranslations } : {}),
          };
          if (ct.id && existingIds.has(ct.id)) {
            toUpdate.push({ id: ct.id, data: ctData });
          } else {
            toCreate.push({ programDayId: dayRow.id, ...ctData });
          }
        }

        await Promise.all([
          ...toUpdate.map((u) =>
            tx.programDayCustomTask.update({
              where: { id: u.id },
              data: u.data,
            })
          ),
          toCreate.length > 0
            ? tx.programDayCustomTask.createMany({ data: toCreate })
            : Promise.resolve(),
        ]);
      }

      return tx.programDay.findUniqueOrThrow({
        where: { id: dayRow.id },
        include: { customTasks: { orderBy: { sortOrder: "asc" } } },
      });
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save program day.",
    };
  }

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

    const [activeOrPendingEnrollments, historicalProgressCount, historicalSubmissionCount] =
      await Promise.all([
        tx.programEnrollment.count({
          where: { programId, status: { in: ["ACTIVE", "PENDING"] } },
        }),
        tx.programDayProgress.count({
          where: { programDayId: existingDay.id },
        }),
        tx.programDayCustomSubmission.count({
          where: { programDayId: existingDay.id },
        }),
      ]);
    if (activeOrPendingEnrollments > 0) {
      return {
        success: false as const,
        message: `Cannot clear Day ${dayNumber}: ${activeOrPendingEnrollments} active or pending participant(s) are currently enrolled.`,
      };
    }
    if (historicalProgressCount > 0 || historicalSubmissionCount > 0) {
      return {
        success: false as const,
        message: `Cannot clear Day ${dayNumber}: historical member progress or submissions exist for this day.`,
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
          ? { durationDays: Math.max(1, remainingAgg._max.dayNumber ?? remainingAgg._count.id) }
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
