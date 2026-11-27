import type { Prisma } from "@prisma/client";
import { getWellnessSession, isAdminRole, isPlatformAdminRole } from "./session";
import { prisma } from "../db";

export class WellnessAuthError extends Error {
  constructor(message: string = "Please sign in first.") {
    super(message);
    this.name = "WellnessAuthError";
  }
}

export class WellnessForbiddenError extends Error {
  constructor(message: string = "Access denied: You do not have permission for this action.") {
    super(message);
    this.name = "WellnessForbiddenError";
  }
}

/**
 * Guard to ensure caller is authenticated and active.
 */
export async function requireAuth() {
  const session = await getWellnessSession();
  if (!session) {
    throw new WellnessAuthError();
  }
  return session;
}

/**
 * Guard for platform-wide Superadmin operations only (financial refunds, payment approvals, role grants).
 */
export async function requireSuperadmin() {
  const session = await requireAuth();
  if (session.role !== "SUPERADMIN") {
    throw new WellnessForbiddenError("Superadmin access required.");
  }
  return session;
}

/**
 * Guard for internal ZERA Platform Admins (SUPERADMIN + ADMIN).
 * Required for authoring/mutating Programs, Curriculum Days, Templates, and Master Directories.
 * Community Admins (PARTNER_ADMIN) and Coaches (COACH) are strictly blocked from program authoring.
 */
export async function requirePlatformAdmin() {
  const session = await requireAuth();
  if (!isPlatformAdminRole(session.role)) {
    throw new WellnessForbiddenError(
      "Only ZERA Superadmin or Platform Admin can create or modify programs and platform directories."
    );
  }
  return session;
}

/**
 * Guard for Admin Console roles (SUPERADMIN, ADMIN, PARTNER_ADMIN, COACH).
 */
export async function requireAdminAccess() {
  const session = await requireAuth();
  if (!isAdminRole(session.role)) {
    throw new WellnessForbiddenError("Admin, Partner, or Coach access required.");
  }
  return session;
}

/**
 * Exact case-insensitive token check against a comma-separated coachName string.
 * Prevents substring matches (e.g. "Ana" matching "Anastasia").
 */
export function matchesCoachNameToken(
  coachNameCsv: string | null | undefined,
  targetCoachName: string | null | undefined
): boolean {
  if (!coachNameCsv || !targetCoachName) return false;
  const normalizedTarget = targetCoachName.trim().toLowerCase();
  if (!normalizedTarget) return false;
  return coachNameCsv
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .some((part) => part === normalizedTarget);
}

/**
 * Returns a Prisma `ProgramWhereInput` scoped to the caller's role:
 * - SUPERADMIN & ADMIN see all programs across all communities.
 * - PARTNER_ADMIN sees programs belonging to their linked `organizationId`.
 * - COACH sees programs linked to their `coachProfileId` or exact CSV token match on `coachName`.
 */
export function buildProgramScopeWhere(session: {
  role: string;
  organizationId?: string | null;
  coachProfileId?: string | null;
  coachProfileName?: string | null;
}) {
  if (isPlatformAdminRole(session.role)) {
    return { deletedAt: null };
  }

  if (session.role === "PARTNER_ADMIN" && session.organizationId) {
    return { deletedAt: null, organizationId: session.organizationId };
  }

  if (session.role === "COACH" && (session.coachProfileId || session.coachProfileName)) {
    const orClauses: Array<Record<string, unknown>> = [];
    if (session.coachProfileId) {
      orClauses.push({ coaches: { some: { coachId: session.coachProfileId } } });
    }
    if (session.coachProfileName && session.coachProfileName.trim()) {
      const name = session.coachProfileName.trim();
      orClauses.push({
        coaches: { some: { coach: { name: { equals: name, mode: "insensitive" } } } },
      });
    }
    if (orClauses.length > 0) {
      return { deletedAt: null, OR: orClauses };
    }
  }

  // Fail-closed: unassigned scoped roles cannot access arbitrary programs
  return { id: "__unassigned_scope__" };
}

/**
 * Verifies that an admin/partner/coach caller has READ/MONITOR access to a specific program
 * (e.g. viewing member progress & submissions). Program mutations must use `requirePlatformAdmin()`.
 */
export async function requireProgramAccess(
  programId: string,
  session?: Awaited<ReturnType<typeof requireAdminAccess>>
) {
  const activeSession = session ?? (await requireAdminAccess());
  if (isPlatformAdminRole(activeSession.role)) {
    return activeSession;
  }

  const program = await prisma.program.findFirst({
    where: { id: programId, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      coaches: {
        select: {
          coachId: true,
          coach: { select: { name: true } },
        },
      },
    },
  });

  if (!program) {
    throw new WellnessForbiddenError("You do not have access to this program.");
  }

  if (activeSession.role === "PARTNER_ADMIN") {
    if (!activeSession.organizationId || program.organizationId !== activeSession.organizationId) {
      throw new WellnessForbiddenError("You do not have access to this program.");
    }
    return activeSession;
  }

  if (activeSession.role === "COACH") {
    const hasPivotLink = program.coaches.some(
      (c) =>
        (activeSession.coachProfileId && c.coachId === activeSession.coachProfileId) ||
        (activeSession.coachProfileName &&
          c.coach.name.trim().toLowerCase() === activeSession.coachProfileName.trim().toLowerCase())
    );
    if (!hasPivotLink) {
      throw new WellnessForbiddenError("You do not have access to this program.");
    }
    return activeSession;
  }

  throw new WellnessForbiddenError("You do not have access to this program.");
}

/**
 * Verifies inside a database transaction that the target user account exists,
 * is ACTIVE, and has not been soft-deleted.
 */
export async function assertActiveAccountInTx(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  const txAny = tx as unknown as {
    user?: {
      findUnique?: (args: Prisma.UserFindUniqueArgs) => Promise<{
        status?: string;
        deletedAt?: Date | null;
      } | null>;
    };
  };
  if (typeof txAny.user?.findUnique !== "function") {
    return;
  }
  const user = await txAny.user.findUnique({
    where: { id: userId },
    select: { status: true, deletedAt: true },
  });
  if (!user || (user.deletedAt !== null && user.deletedAt !== undefined) || (user.status !== undefined && user.status !== "ACTIVE")) {
    throw new Error("Cannot complete action for a deleted or suspended user account.");
  }
}
