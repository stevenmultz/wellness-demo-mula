import type { MasterDataPayload } from "@/wellness/actions/master";
import type {
  DayVideoLinkItem,
  ProgramReferenceItem,
  ProgramTermChapter,
  WorkoutOptionGroup,
} from "@/wellness/utils/json";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { AdminCustomTaskDraft } from "./AdminCustomTasksBuilder";

export interface DayNotificationState {
  time: string;
  message: string;
  label?: string;
}

export function getDefaultNotificationsForType(dayType: string): DayNotificationState[] {
  if (dayType === "REST_DAY") {
    return [
      {
        time: "08:00",
        label: "Morning • Active Restoration",
        message:
          "Today is a Rest Day. Take a 20-minute gentle outdoor walk, hydrate, and allow your nervous system to recharge.",
      },
      {
        time: "20:30",
        label: "Evening • Recovery Diary & Sleep",
        message:
          "Log your restorative insights in Dear Diary and align your sleep environment for deep cellular recovery.",
      },
    ];
  }
  if (dayType === "CONNECTION_DAY" || dayType === "MEETUP_DAY") {
    return [
      {
        time: "08:30",
        label: "Morning • Live Studio / Zoom Circle",
        message:
          "Live Community Circle begins today. Check the studio directions or virtual link on your program dashboard.",
      },
      {
        time: "13:00",
        label: "Afternoon • Community Reflection",
        message:
          "Thank you for connecting! Nourish mindfully and log your nutrition compliance for today.",
      },
      {
        time: "20:30",
        label: "Evening • Gratitude & Sleep Track",
        message:
          "Record your shared insights in Dear Diary and commit to your target bedtime schedule.",
      },
    ];
  }
  return [
    {
      time: "07:00",
      label: "Morning • Movement Ritual",
      message:
        "Today's movement sequence is live. Dedicate 25 minutes for practice and capture your before/after check-in.",
    },
    {
      time: "12:30",
      label: "Afternoon • Clean Nourishment",
      message:
        "Time for mindful midday fuel. Review your coach's meal protocol and log your dietary compliance.",
    },
    {
      time: "20:30",
      label: "Evening • Dear Diary & Cutoff",
      message:
        "Complete your daily Dear Diary, rate your fulfillment index, and finalize logs prior to the 23:59 cutoff.",
    },
  ];
}

export interface AdminProgramDay {
  id: string;
  dayNumber: number;
  title: string;
  dayType: string;
  workoutOptions?: string[];
  sleepRecommendation?: string | null;
  dayNotifications?: DayNotificationState[];
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
  translations?: string | null;
  customTasks?: ProgramDayCustomTaskDTO[];
  responseCount?: number;
}

export interface AdminProgram {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  equipment?: string | null;
  dailyCommitment?: string | null;
  recommendedFor: string;
  coachName: string;
  coachTitle?: string | null;
  organizationId?: string | null;
  organizationCache?: string | null;
  language?: string | null;
  translations?: string | null;
  durationDays: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  maxQuota: number;
  communityLink: string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean | null;
  termsType?: string | null;
  customTerms?: string | null;
  termsList?: string[];
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  scientificReferences?: ProgramReferenceItem[];
  programGuidelines?: string[];
  startDate: Date | string;
  endDate: Date | string;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string;
  status?: string;
  isPublished: boolean;
  dayCount: number;
  activeSubscribers: number;
  pendingSubscribers: number;
  submissionCount?: number;
  days: AdminProgramDay[];
}

export interface AdminCustomerHealthProfile {
  id: string;
  photoFrontUrl: string | null;
  photoSideUrl: string | null;
  photoBackUrl: string | null;
  age?: number | null;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipsCm: number | null;
  currentMood: string | null;
  energyLevel: number | null;
  routineConfidence: number | null;
  workoutFrequency: string | null;
  averageBedtime: string | null;
  averageWakeTime: string | null;
  sleepQualityNotes: string | null;
  eatingPatterns: string | null;
  dietType?: string | null;
  injuriesOrConditions?: string | null;
  foodAllergies?: string | null;
  primaryGoal?: string | null;
  coachNotes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  age?: number | null;
  gender?: string | null;
  occupation?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  role: string;
  status: string;
  organizationId?: string | null;
  coachProfileId?: string | null;
  createdAt: Date | string;
  healthProfile?: AdminCustomerHealthProfile | null;
  enrollments: {
    id: string;
    status: string;
    attendanceMode?: string;
    paymentReference: string | null;
    paidAt: Date | string | null;
    validUntil: Date | string | null;
    termsAgreedAt?: Date | string | null;
    program: {
      id: string;
      title: string;
      price: number;
      locationType?: string;
      city?: string | null;
      venueAddress?: string | null;
      _count: { days: number };
    };
  }[];
  dayProgress?: {
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
    completedAt: Date | string | null;
    updatedAt?: Date | string | null;
    programDay: {
      id?: string;
      dayNumber: number;
      title: string;
      dayType?: string;
      programId: string;
      program?: {
        id: string;
        title: string;
      };
    };
  }[];
}

export interface AdminInitialRoute {
  menu: "dashboard" | "programs" | "master" | "members" | "payments";
  programId?: string | null;
  isCreating?: boolean;
  programTab?: "info" | "schedule" | "responses";
  day?: number;
  masterTab?:
    | "coaches"
    | "organizations"
    | "audience"
    | "categories"
    | "equipment"
    | "commitments";
  customerId?: string | null;
  customerTab?: "overview" | "responses" | "health" | "medical" | "lifestyle" | "notes";
}

export interface AdminClientProps {
  initialUsers: AdminUserItem[];
  initialPrograms: AdminProgram[];
  initialMasterData: MasterDataPayload;
  currentAdminId: string;
  currentAdminRole?: string;
  currentAdminOrgId?: string | null;
  currentAdminCoachId?: string | null;
  initialRoute?: AdminInitialRoute;
}

export const DIFFICULTY_LEVELS = [
  { value: "BEGINNER", label: "Beginner", description: "Foundational & gentle pace" },
  { value: "MODERATE", label: "Moderate", description: "Accessible steady rhythm" },
  {
    value: "INTERMEDIATE",
    label: "Intermediate",
    description: "Balanced endurance & technique",
  },
  { value: "ADVANCED", label: "Advanced", description: "High progression & load" },
  {
    value: "HIGH_INTENSITY",
    label: "High Intensity",
    description: "Maximum demand & athletic push",
  },
] as const;

export type AdminMenuKey = "dashboard" | "programs" | "master" | "members" | "payments";

export interface AdminBreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface AdminFeedbackMessage {
  type: "success" | "error";
  text: string;
}

export interface AdminPendingEnrollmentItem {
  id: string;
  userFullName: string;
  userEmail: string;
  userPhone: string | null;
  programTitle: string;
  amountPaid: number;
  paymentRef: string | null;
}

export interface AdminPublishModalState {
  isOpen: boolean;
  mode: "ERROR" | "CONFIRM";
  missingDays?: number[];
  errorList?: string[];
}

export interface AdminLightboxData {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  title: string;
  memberName: string;
  dayNumber: number;
  dateStr?: string | null;
}

export interface ProgramHeaderFormState {
  title: string;
  description: string;
  targetState: string;
  methodology: string;
  expectedBenefits: string[];
  scientificReferences: ProgramReferenceItem[];
  programGuidelines: string[];
  coverImage: string;
  difficultyLevel: string;
  category: string;
  equipment: string;
  dailyCommitment: string;
  coachName: string;
  coachTitle: string;
  organizationId: string;
  organizationCache: string;
  language: "id" | "en" | "bilingual";
  titleEn: string;
  descriptionEn: string;
  recommendedFor: string;
  durationDays: number;
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationDeadline: string;
  actualPrice: number;
  discountPercentage: number;
  price: number;
  maxQuota: number;
  communityLink: string;
  locationType: "ONLINE" | "ONSITE" | "HYBRID";
  city: string;
  venueAddress: string;
  virtualFallbackAvailable: boolean;
  termsType: "STANDARD" | "CUSTOM";
  customTerms: string;
  termsList: string[];
  termsChapters: ProgramTermChapter[];
  status: "DRAFT" | "PUBLISHED";
}

export interface AdminDayFormState {
  title: string;
  dayType: "TRAINING_DAY" | "REST_DAY" | "CONNECTION_DAY" | "MEETUP_DAY";
  coachName: string;
  recommendedFor: string;
  videoUrl: string;
  videoLinks: DayVideoLinkItem[];
  workoutGroups: WorkoutOptionGroup[];
  videoChecklist: string[];
  mealRecommendation: string;
  dailyAssessment: string;
  workoutOptions: string[];
  sleepRecommendation: string;
  dayNotifications: DayNotificationState[];
  restInstructions: string;
  onsiteVenue: string;
  onsiteSchedule: string;
  meetupLink: string;
  mapLink: string;
  eventTitle: string;
  eventHost: string;
  eventDetails: string;
  pendingReminder: string;
  completedReminder: string;
  titleEn: string;
  customTasks: AdminCustomTaskDraft[];
}
