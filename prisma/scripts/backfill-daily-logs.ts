/**
 * Idempotent One-Time Backfill Script:
 * 1. Migrates historical Sleep, Water, and Meal intake records from ProgramDayProgress -> UserDailyLog
 * 2. Initializes UserTrackingGrant + User.trackingAccessUntil for existing ACTIVE enrollments
 *
 * Run safely multiple times:
 *   npx tsx prisma/scripts/backfill-daily-logs.ts
 */
import { PrismaClient } from "@prisma/client";
import { extractNutritionFromMealNotes } from "../../src/wellness/utils/nutrition";
import {
  computeProgramEndWibCutoffMs,
  getProgramDayWibWindow,
  toWibDateOnly,
} from "../../src/wellness/utils/timezone";

const prisma = new PrismaClient();

function extractSleepFeeling(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/Sleep Feeling:\s*(.+)/i);
  return match ? match[1].trim().slice(0, 120) : null;
}

function mapComplianceToQualityMode(
  mc: string | null | undefined
): "ON_PLAN" | "PARTIAL" | "OFF_TRACK" | null {
  if (!mc || mc === "SKIPPED") return null;
  const upper = mc.toUpperCase();
  if (upper === "FULL" || upper === "YES" || upper === "SIMILAR") return "ON_PLAN";
  if (upper === "PARTIAL") return "PARTIAL";
  if (upper === "OFF_TRACK" || upper === "NO") return "OFF_TRACK";
  return null;
}

async function main() {
  console.log("Starting idempotent backfill for UserDailyLog & UserTrackingGrant...");

  // 1. Backfill UserDailyLog from ProgramDayProgress (batched per active enrollment)
  const enrollments = await prisma.programEnrollment.findMany({
    where: { status: "ACTIVE" },
    include: {
      program: {
        select: {
          id: true,
          locationType: true,
          startAt: true,
          endAt: true,
          durationDays: true,
          price: true,
          bonusTrackingDays: true,
        },
      },
    },
  });

  const enrollmentByUserProgram = new Map(
    enrollments.map((e) => [`${e.userId}:${e.programId}`, e])
  );

  const progresses = await prisma.programDayProgress.findMany({
    include: {
      programDay: {
        select: { id: true, programId: true, dayNumber: true },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  let migratedLogs = 0;
  for (const p of progresses) {
    const enr = enrollmentByUserProgram.get(`${p.userId}:${p.programDay.programId}`);
    const effectiveStart =
      enr?.program.locationType === "ONLINE"
        ? enr.paidAt ?? enr.approvedAt ?? enr.createdAt ?? enr.program.startAt
        : enr?.program.startAt ?? enr?.paidAt ?? enr?.createdAt;

    const targetDate = effectiveStart
      ? getProgramDayWibWindow(effectiveStart, p.programDay.dayNumber).unlockDate
      : p.completedAt ?? p.updatedAt;
    const logDate = toWibDateOnly(targetDate);

    const nutr = extractNutritionFromMealNotes(p.mealNotes);
    const hasSleep = Boolean(
      p.bedtime && p.wakeTime && p.bedtime !== "SKIPPED" && p.wakeTime !== "SKIPPED"
    );
    const validSleepMins =
      hasSleep &&
      typeof p.sleepDurationMinutes === "number" &&
      p.sleepDurationMinutes >= 60 &&
      p.sleepDurationMinutes <= 1080
        ? p.sleepDurationMinutes
        : null;

    if (!hasSleep && !nutr.hasWaterData && !nutr.hasMealData && !p.mealCompliance) {
      continue;
    }

    const existing = await prisma.userDailyLog.findUnique({
      where: { userId_logDate: { userId: p.userId, logDate } },
    });

    const qualityMode = mapComplianceToQualityMode(p.mealCompliance);
    const clampedWater = Math.min(15000, Math.max(0, nutr.waterMl));
    const clampedCal = Math.min(15000, Math.max(0, nutr.calories));

    if (!existing) {
      await prisma.userDailyLog.create({
        data: {
          userId: p.userId,
          logDate,
          bedtime: hasSleep ? p.bedtime : null,
          wakeTime: hasSleep ? p.wakeTime : null,
          sleepDurationMinutes: validSleepMins,
          sleepFeeling: extractSleepFeeling(p.assessmentResponse),
          waterMl: clampedWater,
          caloriesKcal: clampedCal,
          carbsG: Math.min(3000, Math.max(0, nutr.carbsG)),
          proteinG: Math.min(1500, Math.max(0, nutr.proteinG)),
          fatG: Math.min(1000, Math.max(0, nutr.fatG)),
          mealQualityMode: qualityMode,
        },
      });
      migratedLogs++;
    } else {
      // Take the richer meal macro tuple as an atomic unit so carbs/protein/fat never mix across plans
      const useIncomingMeal = clampedCal > existing.caloriesKcal;
      await prisma.userDailyLog.update({
        where: { id: existing.id },
        data: {
          bedtime: existing.bedtime ?? (hasSleep ? p.bedtime : null),
          wakeTime: existing.wakeTime ?? (hasSleep ? p.wakeTime : null),
          sleepDurationMinutes: existing.sleepDurationMinutes ?? validSleepMins,
          sleepFeeling: existing.sleepFeeling ?? extractSleepFeeling(p.assessmentResponse),
          waterMl: Math.max(existing.waterMl, clampedWater),
          ...(useIncomingMeal
            ? {
                caloriesKcal: clampedCal,
                carbsG: Math.min(3000, Math.max(0, nutr.carbsG)),
                proteinG: Math.min(1500, Math.max(0, nutr.proteinG)),
                fatG: Math.min(1000, Math.max(0, nutr.fatG)),
                mealQualityMode: qualityMode ?? existing.mealQualityMode,
              }
            : {
                mealQualityMode: existing.mealQualityMode ?? qualityMode,
              }),
        },
      });
    }
  }

  // 2. Backfill UserTrackingGrant for active paid enrollments (chronologically stacked per user)
  const DAY_MS = 24 * 60 * 60 * 1000;
  let grantedCount = 0;
  const affectedUserIds = new Set<string>();

  const enrollmentsByUser = new Map<string, typeof enrollments>();
  for (const enr of enrollments) {
    const list = enrollmentsByUser.get(enr.userId) ?? [];
    list.push(enr);
    enrollmentsByUser.set(enr.userId, list);
  }

  for (const [userId, userEnrollments] of enrollmentsByUser.entries()) {
    userEnrollments.sort((a, b) => {
      const aMs = (a.paidAt ?? a.approvedAt ?? a.createdAt).getTime();
      const bMs = (b.paidAt ?? b.approvedAt ?? b.createdAt).getTime();
      return aMs - bMs;
    });

    const existingAgg = await prisma.userTrackingGrant.aggregate({
      where: { userId, status: "ACTIVE" },
      _max: { endsAt: true },
    });
    let runningUntil: Date | null = existingAgg._max.endsAt ?? null;

    for (const enr of userEnrollments) {
      const bonusDays = enr.program.price > 0 ? Math.max(0, enr.program.bonusTrackingDays) : 0;
      if (bonusDays <= 0) continue;

      const existingGrant = await prisma.userTrackingGrant.findUnique({
        where: { programEnrollmentId: enr.id },
        select: { id: true, endsAt: true, status: true },
      });
      if (existingGrant) {
        if (
          existingGrant.status === "ACTIVE" &&
          (!runningUntil || existingGrant.endsAt > runningUntil)
        ) {
          runningUntil = existingGrant.endsAt;
        }
        continue;
      }

      const paidAt = enr.paidAt ?? enr.approvedAt ?? enr.createdAt;
      const cutoffMs = computeProgramEndWibCutoffMs({
        locationType: enr.program.locationType,
        endAt: enr.program.endAt,
        startAt: enr.program.startAt,
        durationDays: enr.program.durationDays,
        paidAt,
      });
      const rawEnd =
        cutoffMs !== null
          ? new Date(cutoffMs)
          : new Date(paidAt.getTime() + Math.max(1, enr.program.durationDays) * DAY_MS);
      const programEndAnchor = rawEnd > paidAt ? rawEnd : paidAt;
      const startsAt =
        runningUntil && runningUntil > programEndAnchor ? runningUntil : programEndAnchor;
      const endsAt = new Date(startsAt.getTime() + bonusDays * DAY_MS);

      await prisma.userTrackingGrant.create({
        data: {
          userId,
          sourceType: "PROGRAM_BONUS",
          status: "ACTIVE",
          programEnrollmentId: enr.id,
          durationDays: bonusDays,
          startsAt,
          endsAt,
        },
      });
      runningUntil = endsAt;
      affectedUserIds.add(userId);
      grantedCount++;
    }
  }

  for (const userId of affectedUserIds) {
    const agg = await prisma.userTrackingGrant.aggregate({
      where: { userId, status: "ACTIVE" },
      _max: { endsAt: true },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { trackingAccessUntil: agg._max.endsAt ?? null },
    });
  }

  console.log(
    `Backfill finished: ${migratedLogs} daily logs created, ${grantedCount} tracking grants created for ${affectedUserIds.size} users.`
  );
}

main()
  .catch((err) => {
    console.error("Backfill error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
