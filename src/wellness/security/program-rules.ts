/**
 * Isomorphic business policy evaluators for program publishing & quota validation.
 */

export const REQUIRED_FREE_INTRO_PROGRAMS = 2;

export function evaluateFreeIntroRequirement(params: {
  callerRole: string;
  action: "PUBLISH" | "UNPUBLISH_OR_DELETE";
  programPrice: number;
  isCurrentlyPublished: boolean;
  otherPublishedFreeCount: number;
  otherPublishedPaidCount: number;
}): { allowed: boolean; message?: string } {
  // Superadmin may manage platform programs without blocking system/seeding workflows
  if (params.callerRole === "SUPERADMIN") {
    return { allowed: true };
  }

  if (params.action === "PUBLISH") {
    if (params.programPrice > 0 && params.otherPublishedFreeCount < REQUIRED_FREE_INTRO_PROGRAMS) {
      return {
        allowed: false,
        message: `Mitra / Coach wajib mempublikasikan minimal ${REQUIRED_FREE_INTRO_PROGRAMS} program GRATIS (Rp 0) sebagai program pengenalan sebelum mempublikasikan program berbayar (saat ini baru ${params.otherPublishedFreeCount}/${REQUIRED_FREE_INTRO_PROGRAMS} program gratis aktif).`,
      };
    }
    return { allowed: true };
  }

  // UNPUBLISH_OR_DELETE
  if (
    params.isCurrentlyPublished &&
    params.programPrice === 0 &&
    params.otherPublishedPaidCount > 0 &&
    params.otherPublishedFreeCount < REQUIRED_FREE_INTRO_PROGRAMS
  ) {
    return {
      allowed: false,
      message: `Tidak dapat menonaktifkan atau menghapus program gratis ini karena Anda masih memiliki ${params.otherPublishedPaidCount} program berbayar yang aktif dan wajib mempertahankan minimal ${REQUIRED_FREE_INTRO_PROGRAMS} program pengenalan gratis.`,
    };
  }

  return { allowed: true };
}

export function clampMinQuota(minQuota: number | undefined | null, maxQuota: number): number {
  const safeMax = Math.max(1, Math.round(Number(maxQuota) || 1));
  const rawMin = Math.max(1, Math.round(Number(minQuota) || 1));
  return Math.min(safeMax, rawMin);
}
