/**
 * PROGRAM TIMELINE & LIFECYCLE RESOLVER (WIB / UTC+7)
 * -------------------------------------------------------------
 * Ultra-fast In-Memory timeline phase resolution (0ms execution, zero DB write load).
 * 
 * ARCHITECTURE (Best Practice Separation of Concerns):
 * 1. DATABASE STATUS (Authoritative Administrative State in Program.status):
 *    - "DRAFT"   : Minimal isi judul saja (draft awal)
 *    - "OPEN"    : Header 8/8 & day-by-day 1..N sudah selesai semua (siap disiarkan)
 *    - "PUBLISH" : Sudah disiarkan ke publik (tayang di landing page & katalog)
 *    - "DONE"    : Program telah selesai periodenya
 *    - "ARCHIVE" : Diarsipkan / disembunyikan
 * 
 * 2. DYNAMIC FRONTEND BADGES (Exclusively computed when Program.status === "PUBLISH"):
 *    - "Coming Soon"        : Tanggal regis belum mulai (now < registrationOpenDate)
 *    - "Open Registration"  : Sudah mulai dan masih available (regOpen <= now <= regDeadline && enrolled < quota)
 *    - "Full"               : Sudah habis slot tapi belum tanggal close regis (enrolled >= quota && now <= regDeadline)
 *    - "Close Registration" : Sudah selesai tanggal regis menunggu hari mulai (regDeadline < now < startDate)
 *    - "On going"           : Masa program sedang berjalan (startDate <= now <= endDate)
 *    - "End"                : Selesai program (now > endDate)
 */

export type ProgramDatabaseStatus = "DRAFT" | "REVIEW" | "OPEN" | "PUBLISH" | "DONE" | "ARCHIVE";

// Legacy aliases for full backward compatibility during migration
export type ProgramAuthoringStatus = "CONCEPT" | "DRAFT" | "READY" | "PUBLISHED";
export type ProgramTimelinePhase =
  | "DRAFT"
  | "COMING_SOON"
  | "ENROLLMENT_OPEN"
  | "SOLD_OUT"
  | "REGISTRATION_CLOSED"
  | "ONGOING"
  | "FINISHED";

export type PublicProgramBadge =
  | "Coming Soon"
  | "Open Registration"
  | "Full"
  | "Close Registration"
  | "On going"
  | "End";

export function normalizeProgramStatus(rawStatus?: string | null): ProgramDatabaseStatus {
  if (!rawStatus) return "DRAFT";
  const s = rawStatus.toUpperCase().trim();
  if (s === "PUBLISH" || s === "PUBLISHED" || s === "ACTIVE") return "PUBLISH";
  if (s === "REVIEW" || s === "IN_REVIEW" || s === "IN-REVIEW") return "REVIEW";
  if (s === "OPEN" || s === "READY") return "OPEN";
  if (s === "DONE" || s === "FINISHED") return "DONE";
  if (s === "ARCHIVE" || s === "ARCHIVED" || s === "NOT_SHOW") return "ARCHIVE";
  return "DRAFT";
}

/**
 * Resolves the dynamic public badge when a program has status === "PUBLISH".
 * Returns null if the program is not published.
 */
export function resolvePublicBadge(program: {
  status?: string | null;
  registrationOpenDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  maxQuota?: number | null;
  enrolledCount?: number | null;
  now?: Date;
}): PublicProgramBadge | null {
  const normStatus = normalizeProgramStatus(program.status);
  if (normStatus !== "PUBLISH") {
    return null;
  }

  const now = (program.now ? new Date(program.now) : new Date()).getTime();
  const regOpen = program.registrationOpenDate ? new Date(program.registrationOpenDate).getTime() : 0;
  const regClose = program.registrationDeadline ? new Date(program.registrationDeadline).getTime() : 0;
  const start = program.startDate ? new Date(program.startDate).getTime() : 0;
  const end = program.endDate ? new Date(program.endDate).getTime() : 0;

  const quota = program.maxQuota || 35;
  const enrolled = program.enrolledCount || 0;
  const isFull = enrolled >= quota;

  // 1. End: program period has concluded
  if (end > 0 && now > end) {
    return "End";
  }

  // 2. On going: batch dates are actively underway
  if (start > 0 && now >= start) {
    return "On going";
  }

  // 3. Close Registration: cutoff deadline passed, awaiting batch start date
  if (regClose > 0 && now > regClose) {
    return "Close Registration";
  }

  // 4. Coming Soon: registration opening date is in the future
  if (regOpen > 0 && now < regOpen) {
    return "Coming Soon";
  }

  // 5. Full: seats are filled prior to cutoff deadline
  if (isFull) {
    return "Full";
  }

  // 6. Open Registration: live registration window with seats available
  return "Open Registration";
}

export function getPublicBadgeMeta(badge: PublicProgramBadge): {
  label: string;
  colorClass: string;
  canEnroll: boolean;
} {
  switch (badge) {
    case "Coming Soon":
      return {
        label: "Coming Soon",
        colorClass:
          "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700",
        canEnroll: false,
      };
    case "Open Registration":
      return {
        label: "Open Registration",
        colorClass:
          "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-700",
        canEnroll: true,
      };
    case "Full":
      return {
        label: "Full",
        colorClass:
          "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-700",
        canEnroll: false,
      };
    case "Close Registration":
      return {
        label: "Close Registration",
        colorClass:
          "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-white/10 dark:text-zinc-200 dark:border-white/15",
        canEnroll: false,
      };
    case "On going":
      return {
        label: "On going",
        colorClass:
          "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-700",
        canEnroll: false,
      };
    case "End":
      return {
        label: "End",
        colorClass:
          "bg-zinc-200/80 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
        canEnroll: false,
      };
  }
}

export interface ProgramStatusResolution {
  authoringStatus: ProgramAuthoringStatus;
  timelinePhase: ProgramTimelinePhase;
  dbStatus: ProgramDatabaseStatus;
  publicBadge: PublicProgramBadge | null;
  badgeLabel: string;
  badgeSublabel: string;
  colorClass: string;
  isLocked: boolean;
  canPublish: boolean;
  canEnroll: boolean;
}

export function resolveProgramStatus(program: {
  isPublished?: boolean | null;
  status?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  registrationOpenDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  maxQuota?: number | null;
  enrolledCount?: number | null;
  headerComplete?: boolean;
  curriculumComplete?: boolean;
  now?: Date;
}): ProgramStatusResolution {
  const normStatus = normalizeProgramStatus(program.status);
  const headerComplete = Boolean(program.headerComplete);
  const curriculumComplete = Boolean(program.curriculumComplete);
  const allContentReady = headerComplete && curriculumComplete;

  // 1. Program is in PUBLISH state (Live on Public Catalog)
  if (normStatus === "PUBLISH") {
    const publicBadge = resolvePublicBadge({ ...program, status: "PUBLISH" }) || "Open Registration";
    const meta = getPublicBadgeMeta(publicBadge);

    // Map publicBadge to legacy timelinePhase for backwards compatibility
    let legacyPhase: ProgramTimelinePhase = "ENROLLMENT_OPEN";
    if (publicBadge === "Coming Soon") legacyPhase = "COMING_SOON";
    else if (publicBadge === "Full") legacyPhase = "SOLD_OUT";
    else if (publicBadge === "Close Registration") legacyPhase = "REGISTRATION_CLOSED";
    else if (publicBadge === "On going") legacyPhase = "ONGOING";
    else if (publicBadge === "End") legacyPhase = "FINISHED";

    return {
      authoringStatus: "PUBLISHED",
      timelinePhase: legacyPhase,
      dbStatus: "PUBLISH",
      publicBadge,
      badgeLabel: publicBadge,
      badgeSublabel: `Publish • ${publicBadge}`,
      colorClass: meta.colorClass,
      isLocked: true,
      canPublish: false,
      canEnroll: meta.canEnroll,
    };
  }

  // 2. Program is in REVIEW / OPEN state (Header & Day-by-Day complete, ready to publish)
  if (normStatus === "REVIEW" || normStatus === "OPEN") {
    return {
      authoringStatus: "READY",
      timelinePhase: "DRAFT",
      dbStatus: "REVIEW",
      publicBadge: null,
      badgeLabel: "Review (Ready to Launch)",
      badgeSublabel: "Header & Curriculum 100% complete • Ready to publish",
      colorClass:
        "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700",
      isLocked: false,
      canPublish: true,
      canEnroll: false,
    };
  }

  // 3. Program is in DONE state (Concluded cohort)
  if (normStatus === "DONE") {
    return {
      authoringStatus: "PUBLISHED",
      timelinePhase: "FINISHED",
      dbStatus: "DONE",
      publicBadge: "End",
      badgeLabel: "Completed",
      badgeSublabel: "Cohort cycle concluded",
      colorClass:
        "bg-zinc-200/80 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
      isLocked: true,
      canPublish: false,
      canEnroll: false,
    };
  }

  // 4. Program is in ARCHIVE state (Hidden from catalog)
  if (normStatus === "ARCHIVE") {
    return {
      authoringStatus: "CONCEPT",
      timelinePhase: "DRAFT",
      dbStatus: "ARCHIVE",
      publicBadge: null,
      badgeLabel: "Archived",
      badgeSublabel: "Hidden from public catalog",
      colorClass:
        "bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800",
      isLocked: false,
      canPublish: false,
      canEnroll: false,
    };
  }

  // 5. Default: Program is in DRAFT state
  const isReady = allContentReady;
  return {
    authoringStatus: isReady ? "READY" : headerComplete ? "DRAFT" : "CONCEPT",
    timelinePhase: "DRAFT",
    dbStatus: isReady ? "REVIEW" : "DRAFT",
    publicBadge: null,
    badgeLabel: isReady
      ? "Review (Ready to Launch)"
      : headerComplete
      ? "Draft (Curriculum Incomplete)"
      : "Draft (Incomplete)",
    badgeSublabel: isReady
      ? "Header & Curriculum 100% complete • Ready to publish"
      : headerComplete
      ? "Header complete • Continue filling daily curriculum"
      : "Initial draft • Complete all 8 Program Header sections",
    colorClass: isReady
      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
      : "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-white/10 dark:text-zinc-200 dark:border-white/15",
    isLocked: false,
    canPublish: isReady,
    canEnroll: false,
  };
}

/**
 * Format bytes into clean human-readable units (B, KB, MB).
 */
export function formatByteSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export interface ProgramMemoryFootprint {
  bytes: number;
  formatted: string;
  daysCount: number;
  estimatedMemoryKb: number;
}

/**
 * Calculate the exact UTF-8 memory and payload size of a program and all its days.
 * Enables admins to track program data weight for mobile PWA caching and network budget.
 */
export function calculateProgramMemoryFootprint(program: unknown): ProgramMemoryFootprint {
  if (!program || typeof program !== "object") {
    return { bytes: 0, formatted: "0 B", daysCount: 0, estimatedMemoryKb: 0 };
  }

  try {
    const serialized = JSON.stringify(program);
    const bytes =
      typeof TextEncoder !== "undefined"
        ? new TextEncoder().encode(serialized).length
        : typeof Buffer !== "undefined"
        ? Buffer.byteLength(serialized, "utf8")
        : serialized.length;

    const daysCount = Array.isArray((program as any).days)
      ? (program as any).days.length
      : 0;

    const estimatedMemoryKb = Math.round((bytes / 1024) * 10) / 10;

    return {
      bytes,
      formatted: formatByteSize(bytes),
      daysCount,
      estimatedMemoryKb,
    };
  } catch {
    return { bytes: 0, formatted: "0 B", daysCount: 0, estimatedMemoryKb: 0 };
  }
}
