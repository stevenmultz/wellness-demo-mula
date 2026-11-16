"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireProgramAccess } from "../security/guards";
import { getProgramDayWibWindow } from "../utils/timezone";
import {
  extractBodyMetricsFromValues,
  parseCustomTaskFields,
  parseCustomSubmissionValues,
  sanitizeCustomTaskSubmission,
} from "../utils/custom-tasks";
import { ProgramDayCustomTaskInputSchema } from "../validators/program";
import type { WellnessActionResult } from "./auth";

const SubmitCustomTaskSchema = z.object({
  programDayId: z.string().min(1),
  customTaskId: z.string().min(1),
  values: z.record(z.unknown()),
});

/**
 * Member: Submit or update a custom daily task (e.g. Body Measurement, Benchmark, Coach Form).
 * For MEASUREMENT tasks, automatically records a time-series snapshot in `UserBodyMetricLog`
 * and updates the user's latest `CustomerHealthProfile` fields.
 */
export async function wellnessUserSubmitCustomTask(
  rawInput: unknown
): Promise<WellnessActionResult> {
  const session = await requireAuth();

  const parsed = SubmitCustomTaskSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid custom task submission payload.",
    };
  }

  const { programDayId, customTaskId, values } = parsed.data;

  const customTask = await prisma.programDayCustomTask.findUnique({
    where: { id: customTaskId },
    include: {
      programDay: {
        include: { program: true },
      },
    },
  });

  if (!customTask || customTask.programDayId !== programDayId) {
    return { success: false, message: "Custom task not found for this day." };
  }

  const enrollment = await prisma.programEnrollment.findUnique({
    where: {
      userId_programId: {
        userId: session.userId,
        programId: customTask.programDay.programId,
      },
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") {
    return {
      success: false,
      message: "Active enrollment is required to submit checkpoints.",
    };
  }

  const { isCalendarUnlocked, isPast2359 } = getProgramDayWibWindow(
    customTask.programDay.program.startDate,
    customTask.programDay.dayNumber
  );

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Day ${customTask.programDay.dayNumber} is not unlocked yet.`,
    };
  }

  const [existingSubmission, existingDayProgress] = await Promise.all([
    prisma.programDayCustomSubmission.findUnique({
      where: {
        userId_customTaskId: {
          userId: session.userId,
          customTaskId,
        },
      },
    }),
    prisma.programDayProgress.findUnique({
      where: {
        userId_programDayId: {
          userId: session.userId,
          programDayId,
        },
      },
      select: { id: true },
    }),
  ]);

  if (isPast2359 && !existingSubmission && !existingDayProgress) {
    return {
      success: false,
      message: `The 23:59 WIB cutoff for Day ${customTask.programDay.dayNumber} has passed.`,
    };
  }

  // Validate & sanitize all fields by schema type, bounds, and URL safety
  const fields = parseCustomTaskFields(customTask.fieldsSchema);
  const sanitizedResult = sanitizeCustomTaskSubmission(fields, values);
  if (!sanitizedResult.ok) {
    return {
      success: false,
      message: sanitizedResult.message,
    };
  }
  const sanitizedValues = sanitizedResult.values;

  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.programDayCustomSubmission.upsert({
      where: {
        userId_customTaskId: {
          userId: session.userId,
          customTaskId,
        },
      },
      create: {
        userId: session.userId,
        programDayId,
        customTaskId,
        valuesJson: JSON.stringify(sanitizedValues),
      },
      update: {
        valuesJson: JSON.stringify(sanitizedValues),
      },
    });

    // If MEASUREMENT task, sync time-series body metric snapshot & baseline profile
    if (customTask.taskType === "MEASUREMENT") {
      const metrics = extractBodyMetricsFromValues(sanitizedValues);
      if (metrics) {
        const existingMetric = await tx.userBodyMetricLog.findFirst({
          where: {
            userId: session.userId,
            programDayId,
            source: "CUSTOM_TASK",
          },
        });

        if (existingMetric) {
          await tx.userBodyMetricLog.update({
            where: { id: existingMetric.id },
            data: {
              weightKg: metrics.weightKg ?? existingMetric.weightKg,
              heightCm: metrics.heightCm ?? existingMetric.heightCm,
              waistCm: metrics.waistCm ?? existingMetric.waistCm,
              chestCm: metrics.chestCm ?? existingMetric.chestCm,
              hipsCm: metrics.hipsCm ?? existingMetric.hipsCm,
              bodyFatPct: metrics.bodyFatPct ?? existingMetric.bodyFatPct,
              restingHr: metrics.restingHr ?? existingMetric.restingHr,
              notes: metrics.notes ?? existingMetric.notes,
              recordedAt: new Date(),
            },
          });
        } else {
          await tx.userBodyMetricLog.create({
            data: {
              userId: session.userId,
              programId: customTask.programDay.programId,
              programDayId,
              source: "CUSTOM_TASK",
              weightKg: metrics.weightKg ?? null,
              heightCm: metrics.heightCm ?? null,
              waistCm: metrics.waistCm ?? null,
              chestCm: metrics.chestCm ?? null,
              hipsCm: metrics.hipsCm ?? null,
              bodyFatPct: metrics.bodyFatPct ?? null,
              restingHr: metrics.restingHr ?? null,
              notes: metrics.notes ?? null,
            },
          });
        }

        // Sync latest snapshot into CustomerHealthProfile
        await tx.customerHealthProfile.upsert({
          where: { userId: session.userId },
          create: {
            userId: session.userId,
            weightKg: metrics.weightKg ?? null,
            heightCm: metrics.heightCm ?? null,
            waistCm: metrics.waistCm ?? null,
            chestCm: metrics.chestCm ?? null,
            hipsCm: metrics.hipsCm ?? null,
          },
          update: {
            ...(metrics.weightKg !== undefined ? { weightKg: metrics.weightKg } : {}),
            ...(metrics.heightCm !== undefined ? { heightCm: metrics.heightCm } : {}),
            ...(metrics.waistCm !== undefined ? { waistCm: metrics.waistCm } : {}),
            ...(metrics.chestCm !== undefined ? { chestCm: metrics.chestCm } : {}),
            ...(metrics.hipsCm !== undefined ? { hipsCm: metrics.hipsCm } : {}),
          },
        });
      }
    }

    return submission;
  });

  try {
    revalidatePath("/dashboard");
    revalidatePath("/admin");
  } catch {
    // Ignore outside request context
  }

  return {
    success: true,
    message: `"${customTask.title}" saved.`,
    data: {
      id: result.id,
      customTaskId: result.customTaskId,
      values: parseCustomSubmissionValues(result.valuesJson),
      submittedAt: result.submittedAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    },
  };
}

/**
 * Member: Retrieve chronological body metric logs for progress visualization.
 */
export async function wellnessUserGetBodyMetricHistory() {
  const session = await requireAuth();
  const logsDesc = await prisma.userBodyMetricLog.findMany({
    where: { userId: session.userId },
    orderBy: { recordedAt: "desc" },
    take: 100,
  });
  const logs = logsDesc.reverse();

  return logs.map((l) => ({
    id: l.id,
    programId: l.programId,
    programDayId: l.programDayId,
    source: l.source,
    weightKg: l.weightKg,
    heightCm: l.heightCm,
    waistCm: l.waistCm,
    chestCm: l.chestCm,
    hipsCm: l.hipsCm,
    bodyFatPct: l.bodyFatPct,
    restingHr: l.restingHr,
    notes: l.notes,
    recordedAt: l.recordedAt.toISOString(),
  }));
}

/**
 * Admin / Coach / Partner: Save custom tasks attached to a specific ProgramDay.
 */
export async function wellnessAdminSaveDayCustomTasks(
  programId: string,
  programDayId: string,
  rawTasks: unknown[]
): Promise<WellnessActionResult> {
  await requireProgramAccess(programId);

  const parsedTasks = z.array(ProgramDayCustomTaskInputSchema).safeParse(rawTasks);
  if (!parsedTasks.success) {
    return {
      success: false,
      message: "Invalid custom task configuration.",
    };
  }

  const day = await prisma.programDay.findUnique({
    where: { id: programDayId },
    select: { id: true, programId: true },
  });

  if (!day || day.programId !== programId) {
    return { success: false, message: "Program day not found." };
  }

  const tasks = parsedTasks.data;
  const incomingIds = tasks.map((t) => t.id).filter((id): id is string => Boolean(id));

  await prisma.$transaction(async (tx) => {
    await tx.programDayCustomTask.deleteMany({
      where: {
        programDayId,
        ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
      },
    });

    for (let idx = 0; idx < tasks.length; idx++) {
      const task = tasks[idx];
      const payload = {
        sortOrder: idx,
        taskType: task.taskType,
        title: task.title.trim(),
        instructions: task.instructions?.trim() || null,
        isRequired: task.isRequired ?? true,
        fieldsSchema: JSON.stringify(task.fields),
        translations: task.translations || null,
      };

      if (task.id) {
        const updated = await tx.programDayCustomTask.updateMany({
          where: { id: task.id, programDayId },
          data: payload,
        });
        if (updated.count === 0) {
          await tx.programDayCustomTask.create({
            data: { programDayId, ...payload },
          });
        }
      } else {
        await tx.programDayCustomTask.create({
          data: { programDayId, ...payload },
        });
      }
    }
  });

  try {
    revalidatePath("/dashboard");
    revalidatePath("/admin", "layout");
  } catch {
    // Ignore outside request context
  }

  const freshTasks = await prisma.programDayCustomTask.findMany({
    where: { programDayId },
    orderBy: { sortOrder: "asc" },
  });

  return {
    success: true,
    message: "Custom tasks updated.",
    data: freshTasks.map((t) => ({
      id: t.id,
      programDayId: t.programDayId,
      sortOrder: t.sortOrder,
      taskType: t.taskType,
      title: t.title,
      instructions: t.instructions,
      isRequired: t.isRequired,
      fields: parseCustomTaskFields(t.fieldsSchema),
      translations: t.translations,
    })),
  };
}
