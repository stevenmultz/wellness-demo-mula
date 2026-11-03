/**
 * Safe JSON parser with fallback to prevent unhandled 500 crashes
 */
export function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val || typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export interface ProgramReferenceItem {
  title: string;
  url?: string;
}

export const DEFAULT_TARGET_STATE =
  "Designed for individuals experiencing physical stiffness from prolonged sitting, shallow breathing, or low daily stamina, combined with mental fatigue, high workplace stress, overthinking, or difficulty maintaining a consistent self-care rhythm.";

export const DEFAULT_METHODOLOGY =
  "Combines progressive low-impact biomechanical movement unlocked at 00:00 each morning, anti-inflammatory whole-food nourishment protocols, and evening circadian reflection to restore physical resilience and mental clarity.";

export const DEFAULT_PROGRAM_BENEFITS: string[] = [
  "Restore core stability, spinal alignment, and functional daily mobility.",
  "Regulate stress response, calm mental overthinking, and improve daily focus.",
  "Establish a sustainable morning movement, clean nutrition, and restorative sleep rhythm.",
];

export const DEFAULT_PROGRAM_REFERENCES: ProgramReferenceItem[] = [
  {
    title:
      "Journal of Bodywork and Movement Therapies (2021) — Mindful Core Movement for Postural Alignment & Chronic Tension Relief",
    url: "https://pubmed.ncbi.nlm.nih.gov/",
  },
  {
    title:
      "Journal of Clinical Sleep Medicine (2022) — Morning Physical Activity, Circadian Rhythm Synchronization & Cortisol Regulation",
    url: "https://jcsm.aasm.org/",
  },
];

export const DEFAULT_PROGRAM_GUIDELINES: string[] = [
  "Dedicate 20–30 uninterrupted minutes each morning for your movement protocol.",
  "Prepare a quiet space, exercise mat, and hydration 10 minutes before starting.",
  "Log your honest before/after check-in, meal compliance, and evening reflection before 23:59.",
];

export const DEFAULT_PROGRAM_TERMS: string[] = [
  "Participants confirm they are in good physical health and medically cleared to engage in daily movement protocols.",
  "All program tuition fees are final, non-refundable, and non-transferable once enrollment is confirmed.",
  "All video routines, nutrition protocols, and community materials are strictly for personal use by enrolled members.",
  "Daily progress logs and checklists must be completed before the 23:59 daily cutoff time.",
];

export interface ProgramTermChapter {
  chapter: string;
  clauses: string[];
}

export const DEFAULT_PROGRAM_TERMS_CHAPTERS: ProgramTermChapter[] = [
  {
    chapter: "Health Waiver & Medical Clearance",
    clauses: [
      "Participants confirm they are in sound physical health and medically cleared to engage in daily movement protocols.",
      "Consult a qualified healthcare professional prior to starting if you have pre-existing cardiovascular, joint, or spinal conditions.",
    ],
  },
  {
    chapter: "Tuition, Deferrals & Refund Policy",
    clauses: [
      "All tuition fees are final, non-refundable, and non-transferable once cohort enrollment is confirmed.",
      "A one-time cohort deferral may be granted upon submission of a formal medical certificate prior to Day 1.",
    ],
  },
  {
    chapter: "Daily Accountability & Cutoff Standards",
    clauses: [
      "Daily movement sequences, meal compliance, and Dear Diary reflections must be logged before the 23:59 WIB daily cutoff.",
      "Submissions after the daily cutoff will not count toward the active cohort consistency streak.",
    ],
  },
  {
    chapter: "Intellectual Property & Community Conduct",
    clauses: [
      "All coaching videos, nutrition guidelines, and habit frameworks are proprietary materials for personal use only.",
      "Members must maintain a supportive, respectful, and encouraging environment across all community communication channels.",
    ],
  },
];

/**
 * Parse a JSON string array or newline-separated string into a clean string array.
 */
export function parseStringList(raw?: string | null, fallback: string[] = []): string[] {
  if (!raw || typeof raw !== "string") {
    return [...fallback];
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return [...fallback];
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0);
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // Fallback to newline splitting
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);

  return lines.length > 0 ? lines : [...fallback];
}

export function serializeStringList(items?: string[] | null, fallback: string[] = []): string {
  if (Array.isArray(items)) {
    const cleaned = items
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 0);
    if (cleaned.length > 0) {
      return JSON.stringify(cleaned);
    }
  }
  return JSON.stringify(fallback);
}

/**
 * Parse scientific references from JSON string into ProgramReferenceItem[].
 */
export function parseReferencesList(
  raw?: string | null,
  fallback: ProgramReferenceItem[] = DEFAULT_PROGRAM_REFERENCES
): ProgramReferenceItem[] {
  if (!raw || typeof raw !== "string") {
    return fallback.map((r) => ({ ...r }));
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback.map((r) => ({ ...r }));
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned: ProgramReferenceItem[] = parsed
          .map((item) => {
            if (typeof item === "string") {
              return { title: item.trim(), url: "" };
            }
            if (item && typeof item === "object" && typeof item.title === "string") {
              return {
                title: item.title.trim(),
                url: typeof item.url === "string" ? item.url.trim() : "",
              };
            }
            return { title: "", url: "" };
          })
          .filter((item) => item.title.length > 0);
        if (cleaned.length > 0) return cleaned;
      }
    } catch {
      // Fallback to newline splitting
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0)
    .map((line) => ({ title: line, url: "" }));

  return lines.length > 0 ? lines : fallback.map((r) => ({ ...r }));
}

export function serializeReferencesList(
  items?: ProgramReferenceItem[] | null,
  fallback: ProgramReferenceItem[] = DEFAULT_PROGRAM_REFERENCES
): string {
  if (Array.isArray(items)) {
    const cleaned = items
      .map((item) => ({
        title: typeof item?.title === "string" ? item.title.trim() : "",
        url: typeof item?.url === "string" ? item.url.trim() : "",
      }))
      .filter((item) => item.title.length > 0);
    if (cleaned.length > 0) {
      return JSON.stringify(cleaned);
    }
  }
  return JSON.stringify(fallback);
}

/**
 * Parse structured Terms & Conditions Chapters (Bab & Sub-bab).
 * Supports modern chapter objects array, legacy flat string arrays, or raw text.
 */
export function parseTermsChapters(customTerms?: string | null): ProgramTermChapter[] {
  if (!customTerms || typeof customTerms !== "string") {
    return DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    }));
  }

  const trimmed = customTerms.trim();
  if (!trimmed) {
    return DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
      chapter: c.chapter,
      clauses: [...c.clauses],
    }));
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Modern Chapter Structure: [{ chapter: "...", clauses: [...] }]
        if (typeof parsed[0] === "object" && parsed[0] !== null && "chapter" in parsed[0]) {
          const validChapters: ProgramTermChapter[] = parsed
            .map((item) => ({
              chapter: typeof item.chapter === "string" ? item.chapter.trim() : "",
              clauses: Array.isArray(item.clauses)
                ? item.clauses
                    .map((cl: unknown) => (typeof cl === "string" ? cl.trim() : ""))
                    .filter((cl: string) => cl.length > 0)
                : [],
            }))
            .filter((c) => c.chapter.length > 0 || c.clauses.length > 0);

          if (validChapters.length > 0) {
            return validChapters;
          }
        }

        // Legacy Flat String Array: ["Clause 1", "Clause 2"]
        if (typeof parsed[0] === "string") {
          const clauses = parsed
            .map((s: unknown) => (typeof s === "string" ? s.trim() : ""))
            .filter((s: string) => s.length > 0);
          if (clauses.length > 0) {
            return [
              {
                chapter: "General Terms & Health Guidelines",
                clauses,
              },
            ];
          }
        }
      }
    } catch {
      // Fallback to multiline splitting
    }
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length > 0) {
    return [
      {
        chapter: "General Terms & Health Guidelines",
        clauses: lines,
      },
    ];
  }

  return DEFAULT_PROGRAM_TERMS_CHAPTERS.map((c) => ({
    chapter: c.chapter,
    clauses: [...c.clauses],
  }));
}

/**
 * Serialize Chapters and Clauses into JSON string for Program.customTerms.
 */
export function serializeTermsChapters(
  chapters?: ProgramTermChapter[] | null,
  fallback = DEFAULT_PROGRAM_TERMS_CHAPTERS
): string {
  if (Array.isArray(chapters)) {
    const cleaned = chapters
      .map((c) => ({
        chapter: typeof c?.chapter === "string" ? c.chapter.trim() : "",
        clauses: Array.isArray(c?.clauses)
          ? c.clauses
              .map((cl) => (typeof cl === "string" ? cl.trim() : ""))
              .filter((cl) => cl.length > 0)
          : [],
      }))
      .filter((c) => c.chapter.length > 0 || c.clauses.length > 0);

    if (cleaned.length > 0) {
      return JSON.stringify(cleaned);
    }
  }
  return JSON.stringify(fallback);
}

/**
 * Parse program Terms & Conditions into a clean string array.
 * Backwards compatible with legacy callers; extracts all clauses across chapters.
 */
export function parseTermsList(customTerms?: string | null): string[] {
  const chapters = parseTermsChapters(customTerms);
  const allClauses: string[] = [];
  for (const ch of chapters) {
    for (const cl of ch.clauses) {
      allClauses.push(cl);
    }
  }
  return allClauses.length > 0 ? allClauses : DEFAULT_PROGRAM_TERMS;
}

/**
 * Serialize a list of T&C items into a compact JSON string for storage in Program.customTerms.
 */
export function serializeTermsList(terms?: string[] | null, fallbackText?: string | null): string {
  if (Array.isArray(terms)) {
    const cleaned = terms.map((t) => (typeof t === "string" ? t.trim() : "")).filter((t) => t.length > 0);
    if (cleaned.length > 0) {
      return JSON.stringify([
        {
          chapter: "General Terms & Program Guidelines",
          clauses: cleaned,
        },
      ]);
    }
  }
  if (fallbackText && fallbackText.trim().length > 0) {
    return JSON.stringify(parseTermsChapters(fallbackText));
  }
  return JSON.stringify(DEFAULT_PROGRAM_TERMS_CHAPTERS);
}

// ============================================================================
// DAY-BY-DAY MULTI-VIDEO LINKS & SYNCHRONIZED WORKOUT OPTION GROUPS
// ============================================================================

export interface DayVideoLinkItem {
  title: string;
  url: string;
}

export interface WorkoutMovementItem {
  name: string;
  target: string;
}

export interface WorkoutOptionGroup {
  optionName: string;
  movements: WorkoutMovementItem[];
}

export const DEFAULT_WORKOUT_OPTION_GROUPS: WorkoutOptionGroup[] = [
  {
    optionName: "Workout",
    movements: [
      { name: "Push-up", target: "30 reps" },
      { name: "Sit-up", target: "50 reps" },
      { name: "Pull-up", target: "10 reps" },
    ],
  },
  {
    optionName: "Pilates",
    movements: [
      { name: "Hundred Prep", target: "15 reps" },
      { name: "Roll Up Sequence", target: "12 reps" },
      { name: "Core Plank Hold", target: "60 secs" },
    ],
  },
  {
    optionName: "Yoga",
    movements: [
      { name: "Sun Salutation Flow", target: "5 rounds" },
      { name: "Warrior II Hold", target: "45 secs" },
      { name: "Child's Pose Decompression", target: "60 secs" },
    ],
  },
];

/**
 * Parse `ProgramDay.videoUrl` into an array of `{ title, url }` objects.
 * Supports JSON array string (multi-video) as well as legacy single/newline URL strings.
 */
export function parseDayVideoLinks(rawVideoUrl?: string | null): DayVideoLinkItem[] {
  if (!rawVideoUrl || typeof rawVideoUrl !== "string") {
    return [];
  }
  const trimmed = rawVideoUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const cleaned: DayVideoLinkItem[] = parsed
          .map((item) => {
            if (typeof item === "string") {
              return { title: "", url: item.trim() };
            }
            if (item && typeof item === "object") {
              return {
                title: typeof item.title === "string" ? item.title.trim() : "",
                url: typeof item.url === "string" ? item.url.trim() : "",
              };
            }
            return { title: "", url: "" };
          })
          .filter((item) => item.url.length > 0);
        return cleaned;
      }
    } catch {
      // Fallback to plain URL parsing
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((url) => ({ title: "", url }));
}

/**
 * Serialize multiple YouTube video links into a compact string for `ProgramDay.videoUrl`.
 */
export function serializeDayVideoLinks(links?: DayVideoLinkItem[] | null): string {
  if (!Array.isArray(links)) return "";
  const cleaned = links
    .map((item) => ({
      title: typeof item?.title === "string" ? item.title.trim() : "",
      url: typeof item?.url === "string" ? item.url.trim() : "",
    }))
    .filter((item) => item.url.length > 0);

  if (cleaned.length === 0) return "";
  return JSON.stringify(cleaned);
}

/**
 * Parse synchronized Workout Option Groups from `workoutOptions` and `videoChecklist`.
 * Items in `videoChecklist` formatted as `"[OptionName] MovementName = TargetReps"` are mapped to their option group.
 * Legacy unprefixed items are assigned to the first available workout option.
 */
export function parseWorkoutOptionGroups(
  workoutOptions?: string[] | null,
  videoChecklist?: string[] | null
): WorkoutOptionGroup[] {
  const safeOptions = Array.isArray(workoutOptions)
    ? workoutOptions.map((o) => (typeof o === "string" ? o.trim() : "")).filter(Boolean)
    : [];
  const safeChecklist = Array.isArray(videoChecklist)
    ? videoChecklist.map((c) => (typeof c === "string" ? c.trim() : "")).filter(Boolean)
    : [];

  if (safeOptions.length === 0 && safeChecklist.length === 0) {
    return DEFAULT_WORKOUT_OPTION_GROUPS.map((g) => ({
      optionName: g.optionName,
      movements: g.movements.map((m) => ({ ...m })),
    }));
  }

  const groupMap = new Map<string, WorkoutMovementItem[]>();
  const groupOrder: string[] = [];

  const ensureGroup = (name: string) => {
    const cleanName = name.trim() || "Workout";
    const existingKey = groupOrder.find((k) => k.toLowerCase() === cleanName.toLowerCase());
    if (existingKey) return existingKey;
    groupOrder.push(cleanName);
    groupMap.set(cleanName, []);
    return cleanName;
  };

  for (const opt of safeOptions) {
    ensureGroup(opt);
  }

  const defaultOptionName = groupOrder[0] || "Workout";

  for (const rawItem of safeChecklist) {
    const prefixMatch = rawItem.match(/^\[([^\]]+)\]\s*(.+)$/);
    const targetOption = prefixMatch ? ensureGroup(prefixMatch[1]) : ensureGroup(defaultOptionName);
    const movementStr = prefixMatch ? prefixMatch[2].trim() : rawItem.trim();

    let moveName = movementStr;
    let moveTarget = "";
    if (movementStr.includes("=")) {
      const eqIdx = movementStr.indexOf("=");
      moveName = movementStr.slice(0, eqIdx).trim();
      moveTarget = movementStr.slice(eqIdx + 1).trim();
    }

    if (moveName) {
      groupMap.get(targetOption)!.push({
        name: moveName,
        target: moveTarget,
      });
    }
  }

  return groupOrder.map((optName) => {
    const moves = groupMap.get(optName) || [];
    return {
      optionName: optName,
      movements: moves.length > 0 ? moves : [{ name: "", target: "" }],
    };
  });
}

/**
 * Serialize `WorkoutOptionGroup[]` back into `{ workoutOptions: string[]; videoChecklist: string[] }`.
 */
export function serializeWorkoutOptionGroups(groups?: WorkoutOptionGroup[] | null): {
  workoutOptions: string[];
  videoChecklist: string[];
} {
  if (!Array.isArray(groups) || groups.length === 0) {
    return { workoutOptions: [], videoChecklist: [] };
  }

  const workoutOptions: string[] = [];
  const videoChecklist: string[] = [];

  for (const group of groups) {
    const optName = typeof group?.optionName === "string" ? group.optionName.trim() : "";
    if (!optName) continue;

    if (!workoutOptions.some((o) => o.toLowerCase() === optName.toLowerCase())) {
      workoutOptions.push(optName);
    }

    const movements = Array.isArray(group.movements) ? group.movements : [];
    for (const move of movements) {
      const mName = typeof move?.name === "string" ? move.name.trim() : "";
      const mTarget = typeof move?.target === "string" ? move.target.trim() : "";
      if (!mName) continue;

      const formatted = mTarget
        ? `[${optName}] ${mName} = ${mTarget}`
        : `[${optName}] ${mName}`;
      videoChecklist.push(formatted);
    }
  }

  return { workoutOptions, videoChecklist };
}
