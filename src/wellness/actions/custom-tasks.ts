"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requirePlatformAdmin } from "../security/guards";
import { getProgramDayWibWindow, toWibDateOnly } from "../utils/timezone";
import { safeJsonParse } from "../utils/json";
import { computeVerifiedDayCompletionInTx } from "../services/program-progress";
import { mapMealQualityToProgramCompliance } from "../utils/wellness-metrics";
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
  values: z.record(z.string(), z.unknown()),
});

/**
 * Member: Submit or update a custom daily task (e.g. Body Measurement, Benchmark, Coach Form).
 * For MEASUREMENT tasks, atomically upserts into `user_body_metric_logs` via partial unique index.
 */
export async function wellnessUserSubmitCustomTask(
  rawInput: unknown
): Promise<WellnessActionResult> {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return {
      success: false,
      message: "Your session has expired. Please reload and sign in again.",
    };
  }

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

  const effectiveStartAt =
    customTask.programDay.program.locationType === "ONLINE"
      ? enrollment.paidAt ??
        enrollment.approvedAt ??
        enrollment.createdAt ??
        customTask.programDay.program.startAt
      : customTask.programDay.program.startAt;
  const { isCalendarUnlocked, isPast2359 } = !effectiveStartAt
    ? { isCalendarUnlocked: true, isPast2359: false }
    : getProgramDayWibWindow(
        effectiveStartAt,
        customTask.programDay.dayNumber
      );

  if (!isCalendarUnlocked) {
    return {
      success: false,
      message: `Day ${customTask.programDay.dayNumber} is not unlocked yet.`,
    };
  }

  if (isPast2359) {
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

  const { submission: result, dayCompleted } = await prisma.$transaction(async (tx) => {
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
        // with graceful transactional fallback if index is missing (e.g. fresh `db push`).
        try {
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (!msg.includes("42P10") && !msg.includes("ON CONFLICT")) {
            throw err;
          }
          const existingLog = await tx.userBodyMetricLog.findFirst({
            where: { userId: session.userId, programDayId, source: "CUSTOM_TASK" },
          });
          if (existingLog) {
            await tx.userBodyMetricLog.update({
              where: { id: existingLog.id },
              data: {
                weightKg: metrics.weightKg ?? existingLog.weightKg,
                heightCm: metrics.heightCm ?? existingLog.heightCm,
                waistCm: metrics.waistCm ?? existingLog.waistCm,
                chestCm: metrics.chestCm ?? existingLog.chestCm,
                hipsCm: metrics.hipsCm ?? existingLog.hipsCm,
                bodyFatPct: metrics.bodyFatPct ?? existingLog.bodyFatPct,
                restingHr: metrics.restingHr ?? existingLog.restingHr,
                notes: metrics.notes ?? existingLog.notes,
                recordedAt: now,
              },
            });
          } else {
            await tx.userBodyMetricLog.create({
              data: {
                id: logId,
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
                recordedAt: now,
              },
            });
          }
        }
      }
    }

    // Re-evaluate and sync ProgramDayProgress.isCompleted whenever a custom task is submitted
    let computedDayCompleted = false;
    const txAny = tx as unknown as {
      programDayProgress?: {
        findUnique?: typeof tx.programDayProgress.findUnique;
        update?: typeof tx.programDayProgress.update;
      };
      programDayCustomTask?: { findMany?: typeof tx.programDayCustomTask.findMany };
      programDayCustomSubmission?: { count?: typeof tx.programDayCustomSubmission.count };
      userDailyLog?: { findUnique?: typeof tx.userDailyLog.findUnique };
    };
    const existingProg =
      typeof txAny.programDayProgress?.findUnique === "function"
        ? await tx.programDayProgress.findUnique({
            where: {
              userId_programDayId: {
                userId: session.userId,
                programDayId,
              },
            },
          })
        : null;

    if (
      existingProg &&
      typeof txAny.programDayCustomTask?.findMany === "function" &&
      typeof txAny.programDayCustomSubmission?.count === "function"
    ) {
      const unlockDate = effectiveStartAt
        ? getProgramDayWibWindow(effectiveStartAt, customTask.programDay.dayNumber).unlockDate
        : new Date();
      const globalDailyLog =
        typeof txAny.userDailyLog?.findUnique === "function"
          ? await tx.userDailyLog.findUnique({
              where: {
                userId_logDate: {
                  userId: session.userId,
                  logDate: toWibDateOnly(unlockDate),
                },
              },
              select: {
                bedtime: true,
                wakeTime: true,
                waterMl: true,
                stepsCount: true,
                mealQualityMode: true,
              },
            })
          : null;

      computedDayCompleted = await computeVerifiedDayCompletionInTx(
        tx,
        session.userId,
        {
          ...customTask.programDay,
          locationType: customTask.programDay.program.locationType,
        },
        {
          isVideoWatched: existingProg.isVideoWatched,
          checklistCompleted: safeJsonParse<string[]>(existingProg.checklistCompletedJson, []),
          selectedWorkout: existingProg.selectedWorkout,
          workoutNotes: existingProg.workoutNotes,
          eventFeedback: existingProg.eventFeedback,
          mealCompliance:
            existingProg.mealCompliance ??
            mapMealQualityToProgramCompliance(globalDailyLog?.mealQualityMode),
          mealNotes: existingProg.mealNotes,
          bedtime: globalDailyLog?.bedtime ?? existingProg.bedtime,
          wakeTime: globalDailyLog?.wakeTime ?? existingProg.wakeTime,
          ...(globalDailyLog ? { waterMlOverride: globalDailyLog.waterMl } : {}),
          ...(typeof txAny.userDailyLog?.findUnique === "function"
            ? { stepsCountOverride: globalDailyLog?.stepsCount ?? 0 }
            : {}),
        }
      );
      if (
        computedDayCompleted !== existingProg.isCompleted &&
        typeof txAny.programDayProgress?.update === "function"
      ) {
        await tx.programDayProgress.update({
          where: { id: existingProg.id },
          data: {
            isCompleted: computedDayCompleted,
            completedAt: computedDayCompleted ? existingProg.completedAt ?? new Date() : null,
          },
        });
      }
    }

    return { submission, dayCompleted: computedDayCompleted };
  });

  try {
    revalidatePath("/admin");
  } catch {
    // Ignore outside request context
  }

  return {
    success: true,
    message: dayCompleted
      ? `"${customTask.title}" saved — Day ${customTask.programDay.dayNumber} completed!`
      : `"${customTask.title}" saved.`,
    data: {
      id: result.id,
      customTaskId: result.customTaskId,
      values: parseCustomSubmissionValues(result.valuesJson),
      submittedAt: result.submittedAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
      dayCompleted,
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
  await requirePlatformAdmin();

  const parsedTasks = z.array(ProgramDayCustomTaskInputSchema).safeParse(rawTasks);
  if (!parsedTasks.success) {
    return {
      success: false,
      message: "Invalid custom task configuration.",
    };
  }

  const day = await prisma.programDay.findUnique({
    where: { id: programDayId },
    select: {
      id: true,
      programId: true,
      program: { select: { status: true } },
    },
  });

  if (!day || day.programId !== programId) {
    return { success: false, message: "Program day not found." };
  }

  const tasks = parsedTasks.data;
  const incomingIds = tasks.map((t) => t.id).filter((id): id is string => Boolean(id));

  try {
    await prisma.$transaction(async (tx) => {
      // Prevent accidental cascade deletion of member submissions when removing tasks on live/enrolled programs
      const tasksToRemove = await tx.programDayCustomTask.findMany({
        where: {
          programDayId,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
        select: { id: true, title: true, _count: { select: { submissions: true } } },
      });
      const submittedToRemove = tasksToRemove.filter((t) => t._count.submissions > 0);
      if (submittedToRemove.length > 0) {
        const activeEnrollments = await tx.programEnrollment.count({
          where: { programId, status: "ACTIVE" },
        });
        if (day.program.status === "PUBLISHED" || activeEnrollments > 0) {
          throw new Error(
            `Cannot delete custom task(s) (${submittedToRemove
              .map((t) => `"${t.title}"`)
              .join(", ")}) because members have already submitted responses on this live program.`
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
            where: { programDayId },
            select: { id: true },
          })
        ).map((r) => r.id)
      );

      const toUpdate: Array<{ id: string; data: Prisma.ProgramDayCustomTaskUpdateManyMutationInput }> = [];
      const toCreate: Prisma.ProgramDayCustomTaskCreateManyInput[] = [];

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

        const basePayload = {
          sortOrder: idx,
          taskType: task.taskType,
          title: task.title.trim(),
          instructions: task.instructions?.trim() || null,
          isRequired: true, // All tasks are mandatory (no optional tasks)
          fieldsSchemaJson: task.fields as unknown as Prisma.InputJsonValue,
          ...(parsedTranslations !== undefined ? { translationsJson: parsedTranslations } : {}),
        };

        if (task.id && existingIds.has(task.id)) {
          toUpdate.push({ id: task.id, data: basePayload });
        } else {
          toCreate.push({ programDayId, ...basePayload });
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
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to update custom tasks.",
    };
  }

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
