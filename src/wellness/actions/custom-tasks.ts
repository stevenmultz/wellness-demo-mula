"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
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
 * For MEASUREMENT tasks, atomically upserts into `user_body_metric_logs` via partial unique index.
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
    customTask.programDay.program.startAt,
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

  const fields = parseCustomTaskFields(customTask.fieldsSchemaJson);
  const sanitizedResult = sanitizeCustomTaskSubmission(fields, values);
  if (!sanitizedResult.ok) {
    return {
      success: false,
      message: sanitizedResult.message,
    };
  }
  const sanitizedValues = sanitizedResult.values as Prisma.InputJsonValue;

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
        valuesJson: sanitizedValues,
      },
      update: {
        valuesJson: sanitizedValues,
      },
    });

    if (customTask.taskType === "MEASUREMENT") {
      const metrics = extractBodyMetricsFromValues(sanitizedResult.values);
      if (metrics) {
        const logId = `bm_${crypto.randomBytes(10).toString("hex")}`;
        const now = new Date();
        // Atomic upsert backed by partial unique index `user_body_metric_logs_custom_task_day_uidx`
        await tx.$executeRaw`
          INSERT INTO "user_body_metric_logs" (
            "id", "user_id", "program_id", "program_day_id", "source",
            "weight_kg", "height_cm", "waist_cm", "chest_cm", "hips_cm",
            "body_fat_pct", "resting_hr", "notes", "recorded_at"
          )
          VALUES (
            ${logId}, ${session.userId}, ${customTask.programDay.programId}, ${programDayId}, 'CUSTOM_TASK'::"BodyMetricSource",
            ${metrics.weightKg ?? null}, ${metrics.heightCm ?? null}, ${metrics.waistCm ?? null}, ${metrics.chestCm ?? null}, ${metrics.hipsCm ?? null},
            ${metrics.bodyFatPct ?? null}, ${metrics.restingHr ?? null}, ${metrics.notes ?? null}, ${now}
          )
          ON CONFLICT ("user_id", "program_day_id", "source")
          WHERE "program_day_id" IS NOT NULL AND "source" = 'CUSTOM_TASK'
          DO UPDATE SET
            "weight_kg" = COALESCE(EXCLUDED."weight_kg", "user_body_metric_logs"."weight_kg"),
            "height_cm" = COALESCE(EXCLUDED."height_cm", "user_body_metric_logs"."height_cm"),
            "waist_cm" = COALESCE(EXCLUDED."waist_cm", "user_body_metric_logs"."waist_cm"),
            "chest_cm" = COALESCE(EXCLUDED."chest_cm", "user_body_metric_logs"."chest_cm"),
            "hips_cm" = COALESCE(EXCLUDED."hips_cm", "user_body_metric_logs"."hips_cm"),
            "body_fat_pct" = COALESCE(EXCLUDED."body_fat_pct", "user_body_metric_logs"."body_fat_pct"),
            "resting_hr" = COALESCE(EXCLUDED."resting_hr", "user_body_metric_logs"."resting_hr"),
            "notes" = COALESCE(EXCLUDED."notes", "user_body_metric_logs"."notes"),
            "recorded_at" = EXCLUDED."recorded_at"
        `;
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
      let parsedTranslations: Prisma.InputJsonValue | undefined = undefined;
      if (task.translations) {
        try {
          parsedTranslations =
            typeof task.translations === "string"
              ? (JSON.parse(task.translations) as Prisma.InputJsonValue)
              : (task.translations as Prisma.InputJsonValue);
        } catch {
          parsedTranslations = undefined;
        }
      }

      const payload = {
        sortOrder: idx,
        taskType: task.taskType,
        title: task.title.trim(),
        instructions: task.instructions?.trim() || null,
        isRequired: task.isRequired ?? true,
        fieldsSchemaJson: task.fields as unknown as Prisma.InputJsonValue,
        ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
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
      fields: parseCustomTaskFields(t.fieldsSchemaJson),
      translations: t.translationsJson ? JSON.stringify(t.translationsJson) : null,
    })),
  };
}
