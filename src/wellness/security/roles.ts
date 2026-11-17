/**
 * Isomorphic single source of truth for ZERA Sanctuary user roles and scoping rules.
 * Safe to import in Edge Middleware, Server Components, Server Actions, and Client Components.
 */

export const USER_ROLES = ["USER", "COACH", "PARTNER_ADMIN", "SUPERADMIN"] as const;
export type UserRoleType = (typeof USER_ROLES)[number];

export const ADMIN_ROLES = ["SUPERADMIN", "COACH", "PARTNER_ADMIN"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const ADMIN_ROLE_SET = new Set<string>(ADMIN_ROLES);

export function isAdminRole(role?: string | null): role is AdminRole {
  return Boolean(role && ADMIN_ROLE_SET.has(role));
}

export function isSuperadminRole(role?: string | null): boolean {
  return role === "SUPERADMIN";
}

/**
 * Ensures `organizationId` and `coachProfileId` never leak or remain attached
 * after switching a user's role (e.g. PARTNER_ADMIN -> COACH or COACH -> USER).
 */
export function sanitizeUserScopeForRole(
  newRole: UserRoleType,
  currentScope: { organizationId: string | null; coachProfileId: string | null },
  requestedScope?: { organizationId?: string | null; coachProfileId?: string | null }
): { organizationId: string | null; coachProfileId: string | null } {
  if (newRole === "PARTNER_ADMIN") {
    const nextOrgId =
      requestedScope?.organizationId !== undefined
        ? requestedScope.organizationId || null
        : currentScope.organizationId;
    return { organizationId: nextOrgId, coachProfileId: null };
  }

  if (newRole === "COACH") {
    const nextCoachId =
      requestedScope?.coachProfileId !== undefined
        ? requestedScope.coachProfileId || null
        : currentScope.coachProfileId;
    const nextOrgId =
      requestedScope?.organizationId !== undefined
        ? requestedScope.organizationId || null
        : null;
    return { organizationId: nextOrgId, coachProfileId: nextCoachId };
  }

  // USER and SUPERADMIN never carry partner organization or coach profile locks
  return { organizationId: null, coachProfileId: null };
}

/**
 * Ensures a scoped coach's own MasterCoach name is always present in a comma-separated
 * coachName list (case-insensitive deduplication) so a coach cannot assign a program
 * exclusively to other coaches and lock themselves out or hijack another coach's listing.
 */
export function ensureCoachNameIncluded(
  coachNameCsv: string | null | undefined,
  requiredCoachName: string
): string {
  const required = requiredCoachName.trim();
  if (!required) return (coachNameCsv || "").trim();

  const existing = (coachNameCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== "head wellness coach");

  const hasRequired = existing.some((s) => s.toLowerCase() === required.toLowerCase());
  return hasRequired ? existing.join(", ") : [required, ...existing].join(", ");
}
