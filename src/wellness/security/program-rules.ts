/**
 * Isomorphic business policy evaluators for program publishing & quota validation.
 */

export const REQUIRED_FREE_INTRO_PROGRAMS = 0;

export function evaluateFreeIntroRequirement(_params: {
  callerRole: string;
  action: "PUBLISH" | "UNPUBLISH_OR_DELETE";
  programPrice: number;
  isCurrentlyPublished: boolean;
  otherPublishedFreeCount: number;
  otherPublishedPaidCount: number;
}): { allowed: boolean; message?: string } {
  // Free introductory quota policy is managed directly offline; allow publishing/unpublishing freely.
  return { allowed: true };
}

export function clampMinQuota(minQuota: number | undefined | null, maxQuota: number): number {
  const safeMax = Math.max(1, Math.round(Number(maxQuota) || 1));
  const rawMin = Math.max(1, Math.round(Number(minQuota) || 1));
  return Math.min(safeMax, rawMin);
}
