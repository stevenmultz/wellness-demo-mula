import { getWellnessSession, isAdminRole } from "./session";
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
 * Guard for platform-wide Superadmin operations only.
 */
export async function requireSuperadmin() {
  const session = await requireAuth();
  if (session.role !== "SUPERADMIN") {
    throw new WellnessForbiddenError("Superadmin access required.");
  }
  return session;
}

/**
 * Guard for Admin Console roles (SUPERADMIN, PARTNER_ADMIN, COACH).
 */
export async function requireAdminAccess() {
  const session = await requireAuth();
  if (!isAdminRole(session.role)) {
    throw new WellnessForbiddenError("Admin, Partner, or Coach access required.");
  }
  return session;
}

/**
 * Returns a Prisma `ProgramWhereInput` scoped to the caller's role:
 * - SUPERADMIN sees all programs.
 * - PARTNER_ADMIN sees programs belonging to their linked `organizationId`.
 * - COACH sees programs linked to their `coachProfileId` or matching `coachProfileName`.
 */
export function buildProgramScopeWhere(session: {
  role: string;
  organizationId?: string | null;
  coachProfileId?: string | null;
  coachProfileName?: string | null;
}) {
  if (session.role === "SUPERADMIN") {
    return {};
  }

  if (session.role === "PARTNER_ADMIN" && session.organizationId) {
    return { organizationId: session.organizationId };
  }

  if (session.role === "COACH" && (session.coachProfileId || session.coachProfileName)) {
    const orClauses: Array<Record<string, unknown>> = [];
    if (session.coachProfileId) {
      orClauses.push({ coaches: { some: { coachId: session.coachProfileId } } });
    }
    if (session.coachProfileName) {
      orClauses.push({ coachName: { contains: session.coachProfileName, mode: "insensitive" } });
    }
    return { OR: orClauses };
  }

  // Fail-closed: unassigned scoped roles cannot access arbitrary programs
  return { id: "__unassigned_scope__" };
}

/**
 * Verifies that an admin/partner/coach caller has permission to access or mutate a specific program.
 */
export async function requireProgramAccess(
  programId: string,
  session?: Awaited<ReturnType<typeof requireAdminAccess>>
) {
  const activeSession = session ?? (await requireAdminAccess());
  if (activeSession.role === "SUPERADMIN") {
    return activeSession;
  }

  const count = await prisma.program.count({
    where: {
      AND: [{ id: programId }, buildProgramScopeWhere(activeSession)],
    },
  });

  if (count === 0) {
    throw new WellnessForbiddenError("You do not have access to this program.");
  }

  return activeSession;
}
