import type { Prisma } from "@prisma/client";
import { lockUserRow, prisma } from "../db";
import { recordAuditLog } from "../integrations/audit-log";
import { computeProgramEndWibCutoffMs } from "../utils/timezone";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrackingAccessMode =
  | "COHORT_ACTIVE"
  | "MAINTENANCE_PASS"
  | "EXPIRED_ARCHIVE"
  | "NEW_USER";

export interface TrackingAccessStatusDTO {
  mode: TrackingAccessMode;
  canWriteDailyLogs: boolean;
  trackingAccessUntil: string | null;
  daysRemaining: number;
  hasActiveCohort: boolean;
  hasAnyHistory: boolean;
}

/**
 * Computes the anchor date when a cohort program finishes (in UTC instant aligned to end of last day).
 * Bonus maintenance tracking days begin AFTER the cohort finishes (or stack onto existing access).
 */
export function computeProgramEndAnchor(params: {
  locationType: string;
  endAt: Date | null;
  startAt: Date | null;
  durationDays: number;
  paidAt: Date;
}): Date {
  const cutoffMs = computeProgramEndWibCutoffMs(params);
  if (cutoffMs !== null) {
    const cutoffDate = new Date(cutoffMs);
    return cutoffDate > params.paidAt ? cutoffDate : params.paidAt;
  }

  const safeDuration = Math.max(1, params.durationDays || 1);
  return new Date(params.paidAt.getTime() + safeDuration * DAY_MS);
}

/**
 * Recomputes `User.trackingAccessUntil` atomically from ALL `ACTIVE` rows in `user_tracking_grants`.
 * When `restackChain` is true (e.g. after a refund revokes a predecessor grant), shifts any remaining
 * stacked grants chronologically back to their natural anchors so refunded days are never retained for free.
 * Must be called while holding `lockUserRow(tx, userId)` (or inside the same transaction).
 */
export async function recomputeUserTrackingAccessInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  options?: { restackChain?: boolean }
): Promise<Date | null> {
  const txAny = tx as unknown as {
    userTrackingGrant?: {
      aggregate?: typeof tx.userTrackingGrant.aggregate;
      findMany?: typeof tx.userTrackingGrant.findMany;
      update?: typeof tx.userTrackingGrant.update;
    };
    user?: {
      update?: typeof tx.user.update;
    };
  };

  if (!txAny.userTrackingGrant || !txAny.user?.update) {
    return null;
  }

  let maxEndsAt: Date | null = null;

  if (options?.restackChain && typeof txAny.userTrackingGrant.findMany === "function") {
    const activeGrants = await tx.userTrackingGrant.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        sourceType: true,
        durationDays: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        programEnrollment: {
          select: {
            paidAt: true,
            approvedAt: true,
            createdAt: true,
            program: {
              select: {
                locationType: true,
                startAt: true,
                endAt: true,
                durationDays: true,
              },
            },
          },
        },
        trackingPassOrder: {
          select: {
            paidAt: true,
            createdAt: true,
          },
        },
      },
    });

    let runningUntil: Date | null = null;
    for (const g of activeGrants) {
      let naturalAnchor: Date;
      if (g.sourceType === "PROGRAM_BONUS" && g.programEnrollment?.program) {
        const prog = g.programEnrollment.program;
        naturalAnchor = computeProgramEndAnchor({
          locationType: prog.locationType,
          endAt: prog.endAt,
          startAt: prog.startAt,
          durationDays: prog.durationDays,
          paidAt:
            g.programEnrollment.paidAt ??
            g.programEnrollment.approvedAt ??
            g.programEnrollment.createdAt,
        });
      } else if (g.sourceType === "STANDALONE_PASS" && g.trackingPassOrder) {
        naturalAnchor =
          g.trackingPassOrder.paidAt ?? g.trackingPassOrder.createdAt ?? g.createdAt;
      } else {
        naturalAnchor = g.createdAt ?? g.startsAt;
      }

      const safeDays = Math.max(1, Math.round(g.durationDays || 1));
      const nextStartsAt: Date =
        runningUntil !== null && runningUntil > naturalAnchor ? runningUntil : naturalAnchor;
      const nextEndsAt: Date = new Date(nextStartsAt.getTime() + safeDays * DAY_MS);

      if (
        typeof txAny.userTrackingGrant.update === "function" &&
        (g.startsAt.getTime() !== nextStartsAt.getTime() ||
          g.endsAt.getTime() !== nextEndsAt.getTime())
      ) {
        await tx.userTrackingGrant.update({
          where: { id: g.id },
          data: { startsAt: nextStartsAt, endsAt: nextEndsAt },
        });
      }

      runningUntil = nextEndsAt;
      if (!maxEndsAt || nextEndsAt > maxEndsAt) {
        maxEndsAt = nextEndsAt;
      }
    }
  } else if (typeof txAny.userTrackingGrant.aggregate === "function") {
    const agg = await tx.userTrackingGrant.aggregate({
      where: { userId, status: "ACTIVE" },
      _max: { endsAt: true },
    });
    maxEndsAt = agg?._max?.endsAt ?? null;
  } else if (typeof txAny.userTrackingGrant.findMany === "function") {
    const activeGrants = await tx.userTrackingGrant.findMany({
      where: { userId, status: "ACTIVE" },
      select: { endsAt: true },
    });
    for (const g of activeGrants) {
      if (!maxEndsAt || g.endsAt > maxEndsAt) {
        maxEndsAt = g.endsAt;
      }
    }
  }

  await tx.user.update({
    where: { id: userId },
    data: { trackingAccessUntil: maxEndsAt },
  });

  return maxEndsAt;
}

/**
 * Idempotently grants post-program bonus tracking days when a ProgramEnrollment activates.
 * - DB-level `@unique` on `programEnrollmentId` guarantees double-grant is impossible.
 * - Stacks cleanly onto any existing future `trackingAccessUntil` so members never lose days.
 * - Call AFTER `lockProgramRow` (strict canonical lock order: programs -> users).
 */
export async function grantProgramBonusTrackingInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    enrollmentId: string;
    program: {
      id: string;
      locationType: string;
      startAt: Date | null;
      endAt: Date | null;
      durationDays: number;
      bonusTrackingDays?: number | null;
      price?: number;
    };
    paidAt: Date;
    grantedById?: string | null;
  }
): Promise<{ granted: boolean; endsAt: Date | null }> {
  const txAny = tx as unknown as {
    userTrackingGrant?: {
      findUnique?: typeof tx.userTrackingGrant.findUnique;
      create?: typeof tx.userTrackingGrant.create;
    };
    user?: {
      findUnique?: typeof tx.user.findUnique;
    };
  };

  // Graceful no-op for legacy unit-test mocks that don't define userTrackingGrant
  if (!txAny.userTrackingGrant?.findUnique || !txAny.userTrackingGrant?.create) {
    return { granted: false, endsAt: null };
  }

  const bonusDays = Math.max(0, Math.round(params.program.bonusTrackingDays ?? 0));
  if (bonusDays <= 0) {
    return { granted: false, endsAt: null };
  }

  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === "function") {
    await lockUserRow(tx, params.userId);
  }

  const existing = await tx.userTrackingGrant.findUnique({
    where: { programEnrollmentId: params.enrollmentId },
    select: { id: true, status: true, endsAt: true },
  });

  if (existing) {
    return {
      granted: false,
      endsAt: existing.status === "ACTIVE" ? existing.endsAt : null,
    };
  }

  const userRow = txAny.user?.findUnique
    ? await tx.user.findUnique({
        where: { id: params.userId },
        select: { trackingAccessUntil: true },
      })
    : null;

  const programEndAnchor = computeProgramEndAnchor({
    locationType: params.program.locationType,
    endAt: params.program.endAt,
    startAt: params.program.startAt,
    durationDays: params.program.durationDays,
    paidAt: params.paidAt,
  });

  const currentUntil = userRow?.trackingAccessUntil ?? null;
  const startsAt =
    currentUntil && currentUntil > programEndAnchor ? currentUntil : programEndAnchor;
  const endsAt = new Date(startsAt.getTime() + bonusDays * DAY_MS);

  await tx.userTrackingGrant.create({
    data: {
      userId: params.userId,
      sourceType: "PROGRAM_BONUS",
      status: "ACTIVE",
      programEnrollmentId: params.enrollmentId,
      durationDays: bonusDays,
      startsAt,
      endsAt,
      grantedById: params.grantedById ?? null,
    },
  });

  const nextUntil = await recomputeUserTrackingAccessInTx(tx, params.userId);
  return { granted: true, endsAt: nextUntil ?? endsAt };
}

/**
 * Idempotently grants standalone tracking pass days (e.g. 180 days / 6 months) when a TrackingPassOrder settles.
 * Stacks cleanly from `max(now, current trackingAccessUntil)` so early renewals never forfeit remaining days.
 */
export async function grantStandalonePassInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    trackingPassOrderId: string;
    durationDays: number;
    now?: Date;
    grantedById?: string | null;
  }
): Promise<{ granted: boolean; endsAt: Date | null }> {
  const safeDuration = Math.max(1, Math.round(params.durationDays));
  const now = params.now ?? new Date();

  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === "function") {
    await lockUserRow(tx, params.userId);
  }

  const existing = await tx.userTrackingGrant.findUnique({
    where: { trackingPassOrderId: params.trackingPassOrderId },
    select: { id: true, status: true, endsAt: true },
  });

  if (existing) {
    return {
      granted: false,
      endsAt: existing.status === "ACTIVE" ? existing.endsAt : null,
    };
  }

  const userRow = await tx.user.findUnique({
    where: { id: params.userId },
    select: { trackingAccessUntil: true },
  });

  const currentUntil = userRow?.trackingAccessUntil ?? null;
  const startsAt = currentUntil && currentUntil > now ? currentUntil : now;
  const endsAt = new Date(startsAt.getTime() + safeDuration * DAY_MS);

  await tx.userTrackingGrant.create({
    data: {
      userId: params.userId,
      sourceType: "STANDALONE_PASS",
      status: "ACTIVE",
      trackingPassOrderId: params.trackingPassOrderId,
      durationDays: safeDuration,
      startsAt,
      endsAt,
      grantedById: params.grantedById ?? null,
    },
  });

  const nextUntil = await recomputeUserTrackingAccessInTx(tx, params.userId);
  return { granted: true, endsAt: nextUntil ?? endsAt };
}

/**
 * Grants complimentary tracking days (e.g. customer support compensation) by Superadmin.
 */
export async function grantAdminCompTrackingInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    durationDays: number;
    reason: string;
    adminUserId: string;
    now?: Date;
  }
): Promise<{ grantId: string; endsAt: Date }> {
  const safeDuration = Math.max(1, Math.round(params.durationDays));
  const now = params.now ?? new Date();

  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === "function") {
    await lockUserRow(tx, params.userId);
  }

  const userRow = await tx.user.findUnique({
    where: { id: params.userId },
    select: { trackingAccessUntil: true },
  });
  const currentUntil = userRow?.trackingAccessUntil ?? null;
  const startsAt = currentUntil && currentUntil > now ? currentUntil : now;
  const endsAt = new Date(startsAt.getTime() + safeDuration * DAY_MS);

  const created = await tx.userTrackingGrant.create({
    data: {
      userId: params.userId,
      sourceType: "ADMIN_COMP",
      status: "ACTIVE",
      durationDays: safeDuration,
      startsAt,
      endsAt,
      grantedById: params.adminUserId,
    },
  });

  const nextUntil = await recomputeUserTrackingAccessInTx(tx, params.userId);

  await recordAuditLog(
    {
      actorUserId: params.adminUserId,
      action: "ADMIN_GRANT_COMP_TRACKING",
      entityType: "UserTrackingGrant",
      entityId: created.id,
      metadata: {
        targetUserId: params.userId,
        durationDays: safeDuration,
        reason: params.reason,
        endsAt: (nextUntil ?? endsAt).toISOString(),
      },
    },
    tx
  );

  return { grantId: created.id, endsAt: nextUntil ?? endsAt };
}

/**
 * Revokes a specific grant upon refund/cancellation and accurately recomputes `User.trackingAccessUntil`
 * so any OTHER valid active grants remain 100% intact.
 */
export async function revokeTrackingGrantBySourceInTx(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    programEnrollmentId?: string | null;
    trackingPassOrderId?: string | null;
    reason: string;
  }
): Promise<{ revokedCount: number; nextTrackingAccessUntil: Date | null }> {
  const txAny = tx as unknown as {
    userTrackingGrant?: {
      updateMany?: typeof tx.userTrackingGrant.updateMany;
    };
  };

  if (!txAny.userTrackingGrant?.updateMany) {
    return { revokedCount: 0, nextTrackingAccessUntil: null };
  }

  if (!params.programEnrollmentId && !params.trackingPassOrderId) {
    return { revokedCount: 0, nextTrackingAccessUntil: null };
  }

  if (typeof (tx as { $queryRaw?: unknown }).$queryRaw === "function") {
    await lockUserRow(tx, params.userId);
  }

  const res = await tx.userTrackingGrant.updateMany({
    where: {
      userId: params.userId,
      status: "ACTIVE",
      ...(params.programEnrollmentId
        ? { programEnrollmentId: params.programEnrollmentId }
        : { trackingPassOrderId: params.trackingPassOrderId! }),
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      revokeReason: params.reason.slice(0, 300),
    },
  });

  const nextUntil = await recomputeUserTrackingAccessInTx(tx, params.userId, {
    restackChain: true,
  });
  return { revokedCount: res.count, nextTrackingAccessUntil: nextUntil };
}

/**
 * Checks if a user currently has write permission for daily wellness logs
 * (either `User.trackingAccessUntil > now` OR an active non-ended enrollment).
 */
export async function hasActiveTrackingWriteAccess(
  userId: string,
  now: Date = new Date()
): Promise<{
  allowed: boolean;
  trackingAccessUntil: Date | null;
  hasActiveCohort: boolean;
}> {
  const [user, activeEnrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { trackingAccessUntil: true, deletedAt: true, status: true },
    }),
    prisma.programEnrollment.findMany({
      where: { userId, status: "ACTIVE", program: { deletedAt: null } },
      select: {
        id: true,
        paidAt: true,
        approvedAt: true,
        createdAt: true,
        program: {
          select: {
            locationType: true,
            startAt: true,
            endAt: true,
            durationDays: true,
          },
        },
      },
    }),
  ]);

  if (!user || user.deletedAt !== null || user.status !== "ACTIVE") {
    return { allowed: false, trackingAccessUntil: null, hasActiveCohort: false };
  }

  const hasActiveCohort = activeEnrollments.some((e) => {
    const endCutoffMs = computeProgramEndWibCutoffMs({
      locationType: e.program.locationType,
      endAt: e.program.endAt,
      startAt: e.program.startAt,
      durationDays: e.program.durationDays,
      paidAt: e.paidAt ?? e.approvedAt ?? e.createdAt,
    });
    return endCutoffMs !== null && now.getTime() <= endCutoffMs;
  });

  const hasValidPass = Boolean(user.trackingAccessUntil && user.trackingAccessUntil > now);
  return {
    allowed: hasActiveCohort || hasValidPass,
    trackingAccessUntil: user.trackingAccessUntil ?? null,
    hasActiveCohort,
  };
}

/**
 * Computes the complete member lifecycle state for Dashboard UI rendering.
 */
export function resolveTrackingAccessStatus(params: {
  trackingAccessUntil: Date | string | null | undefined;
  hasActiveCohort: boolean;
  hasAnyEnrollmentOrLog: boolean;
  now?: Date;
}): TrackingAccessStatusDTO {
  const now = params.now ?? new Date();
  const untilDate = params.trackingAccessUntil ? new Date(params.trackingAccessUntil) : null;
  const validUntil = untilDate && !Number.isNaN(untilDate.getTime()) ? untilDate : null;
  const msRemaining = validUntil ? validUntil.getTime() - now.getTime() : 0;
  const daysRemaining = msRemaining > 0 ? Math.ceil(msRemaining / DAY_MS) : 0;
  const hasValidPass = msRemaining > 0;

  let mode: TrackingAccessMode;
  if (params.hasActiveCohort) {
    mode = "COHORT_ACTIVE";
  } else if (hasValidPass) {
    mode = "MAINTENANCE_PASS";
  } else if (params.hasAnyEnrollmentOrLog) {
    mode = "EXPIRED_ARCHIVE";
  } else {
    mode = "NEW_USER";
  }

  return {
    mode,
    canWriteDailyLogs: params.hasActiveCohort || hasValidPass,
    trackingAccessUntil: validUntil ? validUntil.toISOString() : null,
    daysRemaining,
    hasActiveCohort: params.hasActiveCohort,
    hasAnyHistory: params.hasAnyEnrollmentOrLog,
  };
}
