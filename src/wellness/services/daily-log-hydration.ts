import { prisma } from "../db";
import {
  formatDateOnlyKey,
  getProgramDayWibWindow,
  toWibDateOnly,
} from "../utils/timezone";

/**
 * Centralized Daily Log Hydration Service ("Pintu 5").
 *
 * Single source of truth for:
 * - Resolving the effective start date of an ONLINE vs HYBRID program enrollment
 * - Mapping a (effectiveStart, dayNumber) pair to its canonical WIB calendar `Date`
 * - Batch-fetching `UserDailyLog` biomarkers for arbitrary `(userId, logDate)` pairs
 *   in 300-pair chunks (Zero N+1, zero truncation across dashboard, coach review, admin, and shares).
 */

export interface HydratedDailyLogRow {
  userId: string;
  logDate: Date;
  bedtime: string | null;
  wakeTime: string | null;
  sleepDurationMinutes: number | null;
  waterMl: number;
  stepsCount: number;
  caloriesKcal: number;
  mealQualityMode: string | null;
}

export function resolveEffectiveProgramStart(
  program: { locationType: string; startAt: Date | null },
  enrollment?: {
    paidAt?: Date | null;
    approvedAt?: Date | null;
    createdAt?: Date | null;
  } | null,
  options?: { fallbackToEnrollmentForHybrid?: boolean }
): Date | null {
  if (program.locationType === "ONLINE") {
    return (
      enrollment?.paidAt ??
      enrollment?.approvedAt ??
      enrollment?.createdAt ??
      program.startAt ??
      null
    );
  }
  if (options?.fallbackToEnrollmentForHybrid) {
    return program.startAt ?? enrollment?.paidAt ?? enrollment?.createdAt ?? null;
  }
  return program.startAt ?? null;
}

export function resolveProgramDayWibDateOnly(
  effectiveStart: Date | string | null | undefined,
  dayNumber: number,
  now?: Date
): Date | null {
  if (!effectiveStart) return null;
  const { unlockDate } = getProgramDayWibWindow(effectiveStart, dayNumber, now);
  return toWibDateOnly(unlockDate);
}

export function buildUserDatePairKey(userId: string, logDate: Date): string {
  return `${userId}:${formatDateOnlyKey(logDate)}`;
}

/**
 * Batch-hydrates `UserDailyLog` rows for arbitrary `(userId, logDate)` pairs in chunks of 300.
 * Returns a lookup map keyed by `${userId}:${YYYY-MM-DD}`.
 */
export async function fetchDailyLogsByUserDatePairs(
  pairs: Array<{ userId: string; logDate: Date }>,
  options?: { chunkSize?: number }
): Promise<Map<string, HydratedDailyLogRow>> {
  const result = new Map<string, HydratedDailyLogRow>();
  if (pairs.length === 0) {
    return result;
  }

  const prismaAny = prisma as unknown as {
    userDailyLog?: { findMany?: typeof prisma.userDailyLog.findMany };
  };
  if (typeof prismaAny.userDailyLog?.findMany !== "function") {
    return result;
  }

  // Deduplicate pairs before querying
  const deduped = new Map<string, { userId: string; logDate: Date }>();
  for (const p of pairs) {
    const key = buildUserDatePairKey(p.userId, p.logDate);
    if (!deduped.has(key)) {
      deduped.set(key, p);
    }
  }

  const uniquePairs = Array.from(deduped.values());
  const chunkSize = Math.max(1, options?.chunkSize ?? 300);

  for (let i = 0; i < uniquePairs.length; i += chunkSize) {
    const chunk = uniquePairs.slice(i, i + chunkSize);
    const logs = await prisma.userDailyLog.findMany({
      where: {
        OR: chunk.map((p) => ({ userId: p.userId, logDate: p.logDate })),
      },
      select: {
        userId: true,
        logDate: true,
        bedtime: true,
        wakeTime: true,
        sleepDurationMinutes: true,
        waterMl: true,
        stepsCount: true,
        caloriesKcal: true,
        mealQualityMode: true,
      },
    });
    for (const row of logs) {
      result.set(buildUserDatePairKey(row.userId, row.logDate), row);
    }
  }

  return result;
}
