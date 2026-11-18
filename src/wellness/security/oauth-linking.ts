/**
 * Builds the user update applied when a Google identity (with a Google-verified email) is
 * linked to an EXISTING local account found by email.
 *
 * Pre-hijacking defence (CWE-287): if the local account never verified its email, whoever created
 * it (possibly an attacker who registered with the victim's address) may know its password.
 * Linking must therefore revoke that unproven credential and invalidate existing sessions,
 * otherwise the attacker keeps access after the real owner signs in with Google.
 */
export function buildOAuthLinkUserUpdate(
  existing: { emailVerifiedAt: Date | null },
  now: Date = new Date()
): { emailVerifiedAt?: Date; passwordHash?: null; tokenVersion?: { increment: number } } | null {
  if (existing.emailVerifiedAt) return null;
  return {
    emailVerifiedAt: now,
    passwordHash: null,
    tokenVersion: { increment: 1 },
  };
}
