import type { ProgramTermChapter } from "@/wellness/utils/json";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";

export interface ProgramDayItem {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  workoutOptions?: string[];
  sleepRecommendation?: string | null;
  unlockDate: string;
  isCalendarUnlocked: boolean;
  isPast2359: boolean;
  isSkipped: boolean;
  videoUrl: string | null;
  videoChecklist: string[];
  mealRecommendation: string | null;
  dailyAssessment: string | null;
  pendingReminder: string | null;
  completedReminder: string | null;
  meetupLink: string | null;
  mapLink?: string | null;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  eventTitle?: string | null;
  eventHost?: string | null;
  eventDetails?: string | null;
  restInstructions: string | null;
  coachName?: string | null;
  recommendedFor?: string | null;
  dayNotifications?: Array<{ time: string; message: string; label?: string }>;
  customTasks?: ProgramDayCustomTaskDTO[];
  userProgress?: {
    id: string;
    videoWatched: boolean;
    isCompleted: boolean;
    checklistCompleted: string | null;
    selectedWorkout?: string | null;
    photoBeforeUrl?: string | null;
    photoAfterUrl?: string | null;
    workoutNotes?: string | null;
    eventFeedback?: string | null;
    mealCompliance?: string | null;
    mealNotes?: string | null;
    dailyReflection?: string | null;
    happinessRate?: number | null;
    bedtime?: string | null;
    wakeTime?: string | null;
    sleepDurationMinutes?: number | null;
    assessmentResponse?: string | null;
  } | null;
}

export interface ProgramItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  recommendedFor?: string;
  coachName: string;
  coachTitle?: string | null;
  organizationName?: string | null;
  organizationLogo?: string | null;
  organizationVerified?: boolean;
  language?: string;
  category?: string;
  difficultyLevel?: string;
  dailyCommitment?: string | null;
  durationDays?: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  maxQuota: number;
  equipment?: string | null;
  audience?: string | null;
  termsType?: string | null;
  enrolledCount: number;
  locationType?: string;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean;
  communityLink: string | null;
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string;
  status?: string;
  dayCount: number;
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  scientificReferences?: Array<{ title: string; url?: string }>;
  programGuidelines?: string[];
  termsList?: string[];
  termsChapters?: ProgramTermChapter[];
  customTerms?: string | null;
  days: ProgramDayItem[];
}

export interface EnrollmentItem {
  enrollmentId: string;
  programId: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  coachName: string;
  organizationName?: string | null;
  organizationLogo?: string | null;
  organizationVerified?: boolean;
  price: number;
  maxQuota: number;
  locationType?: string;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean;
  attendanceMode?: string;
  communityLink: string | null;
  dayCount: number;
  startDate: Date | string;
  endDate: Date | string;
  registrationDeadline: Date | string;
  status: string;
  paymentReference: string | null;
  invoiceExpiresAt: Date | string | null;
  paidAt: Date | string | null;
  validUntil: Date | string | null;
  termsList?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  age?: number | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  role: string;
  status: string;
  createdAt: Date | string;
}

export interface HealthProfileData {
  id?: string;
  photoFrontUrl?: string | null;
  photoSideUrl?: string | null;
  photoBackUrl?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  chestCm?: number | null;
  hipsCm?: number | null;
  dietType?: string | null;
  foodAllergies?: string | null;
  injuriesOrConditions?: string | null;
  primaryGoal?: string | null;
  currentMood?: string | null;
  energyLevel?: number | null;
  routineConfidence?: number | null;
  workoutFrequency?: string | null;
  averageBedtime?: string | null;
  averageWakeTime?: string | null;
  sleepQualityNotes?: string | null;
  eatingPatterns?: string | null;
}

export type ActionNotice = { type: "success" | "error"; text: string };
