import { z } from "zod";
import { parseTermsChapters } from "@/wellness/utils/json";

export const DayNotificationInputSchema = z.object({
  time: z.string().min(1, "Waktu notifikasi wajib diisi"), // e.g. "07:00"
  message: z.string().min(1, "Pesan notifikasi wajib diisi"),
  label: z.string().optional().or(z.literal("")),
});

export const ProgramDayInputSchema = z.object({
  dayNumber: z.number().int().positive(),
  title: z.string().min(2, "Day title is required (min. 2 characters)").max(120),
  dayType: z.enum(["TRAINING_DAY", "REST_DAY", "CONNECTION_DAY", "MEETUP_DAY"]),
  workoutOptions: z.array(z.string()).optional().default([]),
  sleepRecommendation: z.string().optional().or(z.literal("")),
  dayNotifications: z.array(DayNotificationInputSchema).optional().default([]),
  videoUrl: z.string().optional().or(z.literal("")),
  videoChecklist: z.array(z.string()).default([]),
  mealRecommendation: z.string().optional().or(z.literal("")),
  dailyAssessment: z.string().optional().or(z.literal("")),
  pendingReminder: z.string().optional().or(z.literal("")),
  completedReminder: z.string().optional().or(z.literal("")),
  meetupLink: z.string().optional().or(z.literal("")),
  mapLink: z.string().optional().or(z.literal("")),
  onsiteVenue: z.string().optional().or(z.literal("")),
  onsiteSchedule: z.string().optional().or(z.literal("")),
  eventTitle: z.string().optional().or(z.literal("")),
  eventHost: z.string().optional().or(z.literal("")),
  eventDetails: z.string().optional().or(z.literal("")),
  restInstructions: z.string().optional().or(z.literal("")),
  coachName: z.string().optional().or(z.literal("")),
  recommendedFor: z.string().optional().or(z.literal("")),
});

export const ProgramReferenceInputSchema = z.object({
  title: z.string(),
  url: z.string().optional().or(z.literal("")),
});

export const SaveSingleDaySchema = ProgramDayInputSchema.extend({
  programId: z.string().min(1, "Program ID is required"),
});

export const CreateProgramSchema = z
  .object({
    title: z.string().min(3, "Program title must be at least 3 characters").max(120),
    description: z
      .string()
      .optional()
      .default("Program curriculum, synopsis, and protocol overview will be configured."),
    targetState: z.string().optional().or(z.literal("")),
    methodology: z.string().optional().or(z.literal("")),
    expectedBenefits: z.array(z.string()).optional(),
    scientificReferences: z.array(ProgramReferenceInputSchema).optional(),
    programGuidelines: z.array(z.string()).optional(),
    coverImage: z.string().optional().or(z.literal("")),
    difficultyLevel: z
      .enum(["BEGINNER", "MODERATE", "INTERMEDIATE", "ADVANCED", "HIGH_INTENSITY"])
      .default("INTERMEDIATE"),
    category: z.string().default("Pilates"),
    equipment: z.string().optional().or(z.literal("")),
    dailyCommitment: z.string().optional().or(z.literal("")),
    recommendedFor: z
      .string()
      .max(400)
      .default("All Levels")
      .optional(),
    coachName: z.string().max(300).default("TBA").optional(),
    coachTitle: z.string().optional().or(z.literal("")),
    durationDays: z
      .number()
      .int()
      .min(1, "Program must be at least 1 day")
      .max(90, "Program cannot exceed 90 days")
      .default(21),
    actualPrice: z.number().min(0, "Actual price must be 0 or higher").default(0),
    discountPercentage: z.number().int().min(0).max(100).default(0),
    price: z.number().min(0, "Price must be 0 or higher").default(0),
    maxQuota: z.number().int().min(1, "Quota must be at least 1 participant").default(35),
    communityLink: z.string().optional().or(z.literal("")),
    locationType: z.enum(["ONLINE", "ONSITE", "HYBRID"]).default("ONLINE"),
    city: z.string().optional().or(z.literal("")),
    venueAddress: z.string().optional().or(z.literal("")),
    virtualFallbackAvailable: z.boolean().default(true),
    termsType: z.enum(["STANDARD", "CUSTOM"]).default("CUSTOM").optional(),
    customTerms: z.string().optional().or(z.literal("")),
    termsList: z.array(z.string()).optional(),
    startDate: z.union([z.string(), z.date()]).optional(),
    endDate: z.union([z.string(), z.date()]).optional(),
    registrationOpenDate: z.union([z.string(), z.date()]).optional().nullable(),
    registrationDeadline: z.union([z.string(), z.date()]).optional(),
    status: z
      .enum([
        "DRAFT",
        "OPEN",
        "PUBLISH",
        "DONE",
        "ARCHIVE",
        "PUBLISHED",
        "NOT_SHOW",
        "COMING_SOON",
        "ACTIVE",
      ])
      .default("DRAFT"),
    isPublished: z.boolean().default(false),
    days: z.array(ProgramDayInputSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    }
  );

export const UpdateProgramMetaSchema = z
  .object({
    programId: z.string().min(1, "Program ID is required"),
    title: z.string().min(3, "Program title must be at least 3 characters").max(120),
    description: z
      .string()
      .default("Program description will be configured soon.")
      .optional()
      .or(z.literal("")),
    targetState: z.string().optional().or(z.literal("")),
    methodology: z.string().optional().or(z.literal("")),
    expectedBenefits: z.array(z.string()).optional(),
    scientificReferences: z.array(ProgramReferenceInputSchema).optional(),
    programGuidelines: z.array(z.string()).optional(),
    coverImage: z.string().optional().or(z.literal("")),
    difficultyLevel: z
      .enum(["BEGINNER", "MODERATE", "INTERMEDIATE", "ADVANCED", "HIGH_INTENSITY"])
      .default("INTERMEDIATE"),
    category: z.string().default("Pilates").optional().or(z.literal("")),
    equipment: z.string().optional().or(z.literal("")),
    dailyCommitment: z.string().optional().or(z.literal("")),
    recommendedFor: z
      .string()
      .max(400)
      .default("All Levels")
      .optional()
      .or(z.literal("")),
    coachName: z
      .string()
      .max(300)
      .default("TBA")
      .optional()
      .or(z.literal("")),
    coachTitle: z.string().optional().or(z.literal("")),
    durationDays: z.number().int().min(1).max(90).default(21),
    actualPrice: z.number().min(0, "Actual price must be 0 or higher").default(0),
    discountPercentage: z.number().int().min(0).max(100).default(0),
    price: z.number().min(0, "Price must be 0 or higher").default(0),
    maxQuota: z.number().int().min(1, "Quota must be at least 1 participant").default(35),
    communityLink: z.string().optional().or(z.literal("")),
    locationType: z.enum(["ONLINE", "ONSITE", "HYBRID"]).default("ONLINE"),
    city: z.string().optional().or(z.literal("")),
    venueAddress: z.string().optional().or(z.literal("")),
    virtualFallbackAvailable: z.boolean().default(true),
    termsType: z.enum(["STANDARD", "CUSTOM"]).default("CUSTOM").optional(),
    customTerms: z.string().optional().or(z.literal("")),
    termsList: z.array(z.string()).optional(),
    startDate: z.union([z.string(), z.date()]).optional(),
    endDate: z.union([z.string(), z.date()]).optional(),
    registrationOpenDate: z.union([z.string(), z.date()]).optional().nullable(),
    registrationDeadline: z.union([z.string(), z.date()]).optional(),
    status: z
      .enum([
        "DRAFT",
        "OPEN",
        "PUBLISH",
        "DONE",
        "ARCHIVE",
        "PUBLISHED",
        "NOT_SHOW",
        "COMING_SOON",
        "ACTIVE",
      ])
      .default("DRAFT"),
    isPublished: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "End date must be on or after the start date",
      path: ["endDate"],
    }
  );

export const SubmitDayProgressSchema = z.object({
  programDayId: z.string().min(1, "Program day ID is required"),
  videoWatched: z.boolean().optional(),
  isCompleted: z.boolean(),
  checklistCompleted: z.array(z.string()).default([]),
  selectedWorkout: z.string().optional().or(z.literal("")),
  photoBeforeUrl: z.string().optional().or(z.literal("")),
  photoAfterUrl: z.string().optional().or(z.literal("")),
  workoutNotes: z.string().optional().or(z.literal("")),
  eventFeedback: z.string().optional().or(z.literal("")),
  mealCompliance: z.string().optional().or(z.literal("")),
  mealNotes: z.string().optional().or(z.literal("")),
  dailyReflection: z.string().optional().or(z.literal("")),
  happinessRate: z.number().int().min(1).max(5).optional().nullable(),
  bedtime: z.string().optional().or(z.literal("")),
  wakeTime: z.string().optional().or(z.literal("")),
  sleepDurationMinutes: z.number().int().optional().nullable(),
  assessmentResponse: z.string().optional().or(z.literal("")),
});

export interface ProgramDayCheckResult {
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Validates a single day curriculum item and returns detailed missing field reasons.
 */
export function validateProgramDay(day?: {
  title?: string | null;
  dayType?: string | null;
  videoUrl?: string | null;
  videoChecklist?: string[] | string | null;
  restInstructions?: string | null;
  onsiteVenue?: string | null;
  onsiteSchedule?: string | null;
  meetupLink?: string | null;
  eventTitle?: string | null;
  mapLink?: string | null;
  mealRecommendation?: string | null;
  sleepRecommendation?: string | null;
} | null): ProgramDayCheckResult {
  if (!day) {
    return { isComplete: false, missingFields: ["Day record data is missing."] };
  }

  const missing: string[] = [];

  if (!day.title || day.title.trim().length < 2) {
    missing.push("Day Title (min. 2 characters)");
  }

  const type = day.dayType || "TRAINING_DAY";

  if (type === "TRAINING_DAY") {
    let hasVideo = false;
    if (day.videoUrl && typeof day.videoUrl === "string") {
      const trimmed = day.videoUrl.trim();
      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          hasVideo =
            Array.isArray(parsed) &&
            parsed.some((v: any) =>
              typeof v === "string"
                ? v.trim().length > 0
                : Boolean(v && typeof v.url === "string" && v.url.trim().length > 0)
            );
        } catch {
          hasVideo = trimmed.length > 0;
        }
      } else {
        hasVideo = trimmed.length > 0;
      }
    }

    if (!hasVideo) {
      missing.push("Coaching Video Link (YouTube URL)");
    }

    let checklistCount = 0;
    if (Array.isArray(day.videoChecklist)) {
      checklistCount = day.videoChecklist.filter((i) => i && i.trim().length > 0).length;
    } else if (typeof day.videoChecklist === "string") {
      try {
        const parsed = JSON.parse(day.videoChecklist);
        if (Array.isArray(parsed)) {
          checklistCount = parsed.filter((i) => typeof i === "string" && i.trim().length > 0).length;
        }
      } catch {
        checklistCount = 0;
      }
    }

    if (checklistCount === 0) {
      missing.push("Movement Checklist (at least 1 exercise/task)");
    }
  } else if (type === "REST_DAY") {
    if (!day.restInstructions || day.restInstructions.trim().length < 3) {
      missing.push("Rest & Recovery Instructions (min. 3 characters)");
    }
  } else if (type === "CONNECTION_DAY" || type === "MEETUP_DAY") {
    const hasOnline = !!day.meetupLink && day.meetupLink.trim().length >= 5;
    const hasOnsite =
      !!day.onsiteVenue && day.onsiteVenue.trim().length >= 2 &&
      !!day.onsiteSchedule && day.onsiteSchedule.trim().length >= 2;

    if (!hasOnline && !hasOnsite) {
      missing.push("Virtual Meetup Link OR Studio Venue with Session Schedule");
    }
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Helper to check if a single day module has sufficient content to be considered "Filled / Ready".
 */
export function isProgramDayComplete(day?: {
  title?: string | null;
  dayType?: string | null;
  videoUrl?: string | null;
  videoChecklist?: string[] | string | null;
  restInstructions?: string | null;
  onsiteVenue?: string | null;
  onsiteSchedule?: string | null;
  meetupLink?: string | null;
  eventTitle?: string | null;
  mapLink?: string | null;
  mealRecommendation?: string | null;
  sleepRecommendation?: string | null;
} | null): boolean {
  return validateProgramDay(day).isComplete;
}

export interface ProgramHeaderCheckResult {
  isComplete: boolean;
  completedCount: number;
  totalPoints: number;
  missingSections: { point: number; title: string; reason: string }[];
}

/**
 * Validates that all 8 Program Header points are thoroughly configured before publishing.
 */
export function isProgramHeaderComplete(program?: {
  title?: string | null;
  description?: string | null;
  difficultyLevel?: string | null;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[] | string | null;
  category?: string | null;
  dailyCommitment?: string | null;
  coachName?: string | null;
  recommendedFor?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  maxQuota?: number | null;
  price?: number | null;
  communityLink?: string | null;
  termsList?: string[] | string | null;
  customTerms?: string | null;
} | null): ProgramHeaderCheckResult {
  if (!program) {
    return {
      isComplete: false,
      completedCount: 0,
      totalPoints: 8,
      missingSections: [{ point: 1, title: "Program", reason: "Program record not found" }],
    };
  }

  const missing: { point: number; title: string; reason: string }[] = [];

  // Point 1: Program Information
  const hasTitle = !!program.title && program.title.trim().length >= 3;
  const desc = (program.description || "").trim();
  const hasDesc = desc.length >= 15 && !desc.toLowerCase().includes("will be configured");
  const hasDifficulty = !!program.difficultyLevel && program.difficultyLevel.trim().length > 0;
  if (!hasTitle || !hasDesc || !hasDifficulty) {
    missing.push({
      point: 1,
      title: "Program Information",
      reason: "Requires a valid title, detailed description (min 15 chars), and difficulty level.",
    });
  }

  // Point 2: Purpose & Methodology
  const hasTargetState = !!program.targetState && program.targetState.trim().length >= 5;
  const hasMethodology = !!program.methodology && program.methodology.trim().length >= 5;
  let benefitsCount = 0;
  if (Array.isArray(program.expectedBenefits)) {
    benefitsCount = program.expectedBenefits.filter((b) => b && b.trim().length > 0).length;
  }
  if (!hasTargetState || !hasMethodology || benefitsCount === 0) {
    missing.push({
      point: 2,
      title: "Purpose & Methodology",
      reason: "Requires target physical/mental condition, methodology, and at least 1 key benefit.",
    });
  }

  // Point 3: Classification & Coaches
  const hasCategory = !!program.category && program.category.trim().length > 0;
  const coach = (program.coachName || "").trim();
  const hasCoach = coach.length >= 2 && coach.toUpperCase() !== "TBA";
  const hasAudience = !!program.recommendedFor && program.recommendedFor.trim().length > 0;
  if (!hasCategory || !hasCoach || !hasAudience) {
    missing.push({
      point: 3,
      title: "Classification & Coaches",
      reason: "Requires category taxonomy, assigned lead coach (cannot be TBA), and target audience persona.",
    });
  }

  // Point 4: Schedule & Registration Dates
  const startD = program.startDate ? new Date(program.startDate) : null;
  const endD = program.endDate ? new Date(program.endDate) : null;
  const regDeadline = program.registrationDeadline ? new Date(program.registrationDeadline) : null;
  const hasValidDates =
    startD &&
    endD &&
    regDeadline &&
    !isNaN(startD.getTime()) &&
    !isNaN(endD.getTime()) &&
    !isNaN(regDeadline.getTime()) &&
    startD <= endD &&
    regDeadline <= startD;

  if (!hasValidDates) {
    missing.push({
      point: 4,
      title: "Schedule & Registration Dates",
      reason: "Requires valid Start Date, End Date, and Cutoff Deadline (WIB).",
    });
  }

  // Point 5: Attendance Mode & Location
  const hasLocationType =
    !!program.locationType && ["ONLINE", "ONSITE", "HYBRID"].includes(program.locationType);

  if (!hasLocationType) {
    missing.push({
      point: 5,
      title: "Attendance Mode & Location",
      reason: "Requires selecting an attendance format (Online, On-Site, or Hybrid).",
    });
  } else if (program.locationType === "ONLINE") {
    // Online cohorts do not require a physical city or studio venue address. Automatically valid!
  } else {
    // ONSITE or HYBRID: Requires physical studio venue address and city
    const hasCity = !!program.city && program.city.trim().length >= 2;
    const hasVenue = !!program.venueAddress && program.venueAddress.trim().length >= 5;
    if (!hasCity || !hasVenue) {
      missing.push({
        point: 5,
        title: "Attendance Mode & Location",
        reason: "On-Site / Hybrid delivery requires primary city and physical studio venue address.",
      });
    }
  }

  // Point 6: Pricing & Quota
  const hasQuota = typeof program.maxQuota === "number" && program.maxQuota >= 1;
  const hasPrice = typeof program.price === "number" && program.price >= 0;
  if (!hasQuota || !hasPrice) {
    missing.push({
      point: 6,
      title: "Pricing & Participant Quota",
      reason: "Requires seat capacity cap (min 1) and tuition structure.",
    });
  }

  // Point 7: Community & Channel Link
  const hasCommunity = !!program.communityLink && program.communityLink.trim().length > 0;
  if (!hasCommunity) {
    missing.push({
      point: 7,
      title: "Community & Channel Link",
      reason: "Requires member group invitation link (e.g., WhatsApp, Telegram, Discord).",
    });
  }

  // Point 8: Terms & Conditions (Chapters & Clauses)
  const chapters = parseTermsChapters(
    program.customTerms || (Array.isArray(program.termsList) ? JSON.stringify(program.termsList) : null)
  );
  const validChapters = chapters.filter(
    (ch) => ch.chapter.trim().length > 0 && ch.clauses.some((cl) => cl.trim().length > 0)
  );
  if (validChapters.length === 0) {
    missing.push({
      point: 8,
      title: "Terms & Conditions",
      reason: "Requires at least 1 Chapter with detailed clause conditions (e.g. Refund Policy, Health Waiver).",
    });
  }

  return {
    isComplete: missing.length === 0,
    completedCount: 8 - missing.length,
    totalPoints: 8,
    missingSections: missing,
  };
}
