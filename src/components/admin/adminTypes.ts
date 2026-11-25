import type { MasterDataPayload } from "@/wellness/actions/master";
import type { ProgramTemplateDTO } from "@/wellness/actions/templates";
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
        label: "Evening • Recovery & Sleep",
        message:
          "Complete your daily check-in and align your sleep schedule for deep cellular recovery before 23:59 WIB.",
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
        label: "Afternoon • Clean Nourishment",
        message:
          "Thank you for connecting! Nourish mindfully and log your nutrition compliance for today.",
      },
      {
        time: "20:30",
        label: "Evening • Sleep & Cutoff Reminder",
        message:
          "Make sure all today's tasks and sleep tracking are logged before the 23:59 WIB cutoff.",
      },
    ];
  }
  return [
    {
      time: "07:00",
      label: "Morning • Movement Ritual",
      message:
        "Today's movement sequence is live. Dedicate 25 minutes for practice and complete your daily check-in.",
    },
    {
      time: "12:30",
      label: "Afternoon • Clean Nourishment",
      message:
        "Time for mindful midday fuel. Review your coach's meal protocol and log your dietary compliance.",
    },
    {
      time: "20:30",
      label: "Evening • Daily Cutoff Reminder",
      message:
        "Complete all your daily tasks and custom checkpoints prior to the 23:59 WIB cutoff.",
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
  meetupLink: string | null;
  mapLink?: string | null;
  onsiteVenue: string | null;
  onsiteSchedule: string | null;
  eventTitle?: string | null;
  eventHost?: string | null;
  eventDetails?: string | null;
  restInstructions: string | null;
  customTasks?: ProgramDayCustomTaskDTO[];
  responseCount?: number;
}

export interface AdminProgram {
  id: string;
  title: string;
  batchNumber?: number | null;
  slug: string;
  description: string;
  coverImage?: string | null;
  introVideoUrl?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  equipment?: string | null;
  dailyCommitment?: string | null;
  coachName: string;
  coachTitle?: string | null;
  organizationId?: string | null;
  organizationCache?: string | null;
  durationDays: number;
  bonusTrackingDays?: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  minQuota?: number;
  maxQuota: number;
  communityLink: string | null;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  customTerms?: string | null;
  termsList?: string[];
  targetState?: string | null;
  methodology?: string | null;
  expectedBenefits?: string[];
  scientificReferences?: ProgramReferenceItem[];
  programGuidelines?: string[];
  startDate: Date | string | null;
  endDate: Date | string | null;
  registrationOpenDate?: Date | string | null;
  registrationDeadline: Date | string | null;
  status?: string;
  isPublished: boolean;
  dayCount: number;
  activeSubscribers: number;
  pendingSubscribers: number;
  submissionCount?: number;
  days: AdminProgramDay[];
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
  trackingAccessUntil?: Date | string | null;
  createdAt: Date | string;
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
    customSubmissions?: {
      id: string;
      customTaskId: string;
      title: string;
      taskType: string;
      values: Record<string, unknown>;
    }[];
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
  menu: AdminMenuKey;
  programId?: string | null;
  isCreating?: boolean;
  programTab?: "info" | "schedule" | "responses";
  day?: number;
  masterTab?:
    | "coaches"
    | "organizations"
    | "categories"
    | "equipment"
    | "commitments";
  customerId?: string | null;
  customerTab?: "overview" | "responses" | "profile" | "notes";
}

export interface AdminSupportRequestItem {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userPhone: string | null;
  programId: string;
  programTitle: string;
  enrollmentId: string | null;
  requestType: "QUIT_COHORT" | "REPORT_ISSUE";
  reasonCode: string;
  note: string;
  status: "OPEN" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminClientProps {
  initialUsers: AdminUserItem[];
  initialPrograms: AdminProgram[];
  initialMasterData: MasterDataPayload;
  initialTemplates?: ProgramTemplateDTO[];
  initialSupportRequests?: AdminSupportRequestItem[];
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

export type AdminMenuKey =
  | "dashboard"
  | "programs"
  | "master"
  | "members"
  | "payments"
  | "team"
  | "community";

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

export interface ProgramHeaderFormState {
  title: string;
  batchNumber: number | null;
  description: string;
  targetState: string;
  methodology: string;
  expectedBenefits: string[];
  scientificReferences: ProgramReferenceItem[];
  programGuidelines: string[];
  coverImage: string;
  introVideoUrl: string;
  difficultyLevel: string;
  category: string;
  equipment: string;
  dailyCommitment: string;
  coachName: string;
  coachTitle: string;
  organizationId: string;
  organizationCache: string;
  durationDays: number;
  bonusTrackingDays: number;
  startDate: string;
  endDate: string;
  registrationOpenDate: string;
  registrationDeadline: string;
  actualPrice: number;
  discountPercentage: number;
  price: number;
  minQuota?: number;
  maxQuota: number;
  communityLink: string;
  locationType: "ONLINE" | "HYBRID";
  city: string;
  venueAddress: string;
  customTerms: string;
  termsList: string[];
  termsChapters: ProgramTermChapter[];
  status: "DRAFT" | "PUBLISHED";
}

export interface AdminDayFormState {
  title: string;
  dayType: "TRAINING_DAY" | "REST_DAY" | "CONNECTION_DAY" | "MEETUP_DAY";
  videoUrl: string;
  videoLinks: DayVideoLinkItem[];
  workoutGroups: WorkoutOptionGroup[];
  videoChecklist: string[];
  mealRecommendation: string;
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
  customTasks: AdminCustomTaskDraft[];
}
