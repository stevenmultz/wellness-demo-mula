"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { QrisCheckoutModal, QrisInvoiceData } from "@/components/checkout/QrisCheckoutModal";
import {
  wellnessUpdateProfile,
  wellnessChangePassword,
  wellnessEnrollProgram,
  wellnessDeleteAccount,
  wellnessUpdateHealthProfile,
} from "@/wellness/actions/account";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { wellnessUserSubmitDayProgress } from "@/wellness/actions/program";
import { normalizeVideoEmbed } from "@/wellness/integrations/video-provider";
import { parseWorkoutOptionGroups, parseTermsChapters, ProgramTermChapter } from "@/wellness/utils/json";
import { resolvePublicBadge, PublicProgramBadge } from "@/wellness/utils/timeline";
import { SleepTrackerCard } from "./SleepTrackerCard";
import { VideoThumbnailLinkCard } from "./VideoThumbnailLinkCard";
import { WorkoutSection } from "./WorkoutSection";
import { MealSection } from "./MealSection";
import { DailyReflectionCard } from "./DailyReflectionCard";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { MyPlanHeader, MyPlanOverview } from "./tabs/MyPlanTab";
import { ExplorePlanTab } from "./tabs/ExplorePlanTab";
import { NotificationsHistoryTab } from "./tabs/NotificationsHistoryTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { ProgramDetailView } from "./tabs/ProgramDetailView";
import {
  CheckCircle,
  CheckCircle2,
  Clock,
  Lock,
  Loader2,
  Shield,
  LogOut,
  Eye,
  EyeOff,
  Video,
  Utensils,
  CheckSquare,
  Square,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Play,
  AlertTriangle,
  MessageCircle,
  MapPin,
  Bell,
  Smartphone,
  QrCode,
  ShieldCheck,
  X,
  Sparkles,
  Info,
  Calendar,
  Compass,
  Sliders,
  User,
  Users,
  Camera,
  Scale,
  Activity,
  Heart,
  Moon,
  Smile,
  Dumbbell,
  Upload,
  Trash2,
  Award,
  Server,
  RefreshCw,
  Radio,
} from "lucide-react";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BNWi5lDIv-G3f7GRj22k8hNtW2wAJXJNReSHFHlUddSELpcCyuDwKZQmC7p1Bpm_NpbBw41VZhJr-_b4BpNwvSs";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

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
  category?: string;
  difficultyLevel?: string;
  dailyCommitment?: string | null;
  durationDays?: number;
  price: number;
  maxQuota: number;
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

interface DashboardProps {
  user: UserProfile;
  myPrograms: EnrollmentItem[];
  allPrograms: ProgramItem[];
  dailyPlans: ProgramDailyPlan[];
  initialHealthProfile?: HealthProfileData | null;
}

export function DashboardClient({
  user,
  myPrograms,
  allPrograms,
  dailyPlans,
  initialHealthProfile,
}: DashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my_plan" | "all_plan" | "notifications" | "profile">("my_plan");
  const [isViewingPlanDetail, setIsViewingPlanDetail] = useState(false);
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [activeDetailPhase, setActiveDetailPhase] = useState<"movement" | "fuel" | "recovery">("movement");
  const [profileActiveDetail, setProfileActiveDetail] = useState<null | "personal" | "medical" | "payments" | "account">(null);

  // Scroll Hide / Show for Top Header (Scroll down hides, scroll up reveals)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 40) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Explore (All Programs) Search, Filter, Pagination States
  const [programSearch, setProgramSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<"ALL" | "ONLINE" | "ONSITE" | "HYBRID">("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "OPEN" | "ACTIVE" | "COMING_SOON">("ALL");
  const [programsPage, setProgramsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  // Filter ONLY programs the user has enrolled in
  const enrolledProgramIds = new Set(myPrograms.map((e) => e.programId));
  const myEnrolledPrograms = allPrograms.filter((p) => enrolledProgramIds.has(p.id));

  // 3 Newly Published Programs for Dashboard discovery section (excluding already enrolled if possible)
  const newlyPublishedPrograms = allPrograms
    .filter((p) => !enrolledProgramIds.has(p.id) || myEnrolledPrograms.length === 0)
    .slice(0, 3);

  const activeEnrollment = myPrograms.find((e) => e.status === "ACTIVE") || myPrograms[0];
  const defaultProgramId = activeEnrollment?.programId || myEnrolledPrograms[0]?.id || "";
  const [selectedProgId, setSelectedProgId] = useState<string>(defaultProgramId);

  const initialProg =
    myEnrolledPrograms.find((p) => p.id === defaultProgramId) ||
    myEnrolledPrograms[0] ||
    null;
  const initialTodayIdx = initialProg
    ? Math.max(
        0,
        initialProg.days.reduce(
          (acc, d, idx) => (d.isCalendarUnlocked && !d.isPast2359 ? idx : acc),
          0
        )
      )
    : 0;
  const [activeDayIndex, setActiveDayIndex] = useState<number>(initialTodayIdx);

  const [dayChecklists, setDayChecklists] = useState<Record<string, string[]>>({});
  const [dayVideoWatched, setDayVideoWatched] = useState<Record<string, boolean>>({});
  const [dayAssessments, setDayAssessments] = useState<Record<string, string>>({});
  const [dayWorkouts, setDayWorkouts] = useState<Record<string, string>>({});
  const [dayPhotosBefore, setDayPhotosBefore] = useState<Record<string, string>>({});
  const [dayPhotosAfter, setDayPhotosAfter] = useState<Record<string, string>>({});
  const [dayMealCompliance, setDayMealCompliance] = useState<Record<string, string>>({});
  const [dayMealNotes, setDayMealNotes] = useState<Record<string, string>>({});
  const [dayWorkoutNotes, setDayWorkoutNotes] = useState<Record<string, string>>({});
  const [dayEventFeedback, setDayEventFeedback] = useState<Record<string, string>>({});
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [dayReflections, setDayReflections] = useState<Record<string, string>>({});
  const [dayHappiness, setDayHappiness] = useState<Record<string, number>>({});
  const [dayBedtimes, setDayBedtimes] = useState<Record<string, string>>({});
  const [dayWakeTimes, setDayWakeTimes] = useState<Record<string, string>>({});
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [qrisInvoice, setQrisInvoice] = useState<QrisInvoiceData | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [cronTriggerResult, setCronTriggerResult] = useState<Record<string, unknown> | null>(null);
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsIosDevice(isIos);
      setIsStandalonePwa(isStandalone);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready
          .then((reg) => {
            return reg.pushManager ? reg.pushManager.getSubscription() : null;
          })
          .then((sub) => {
            if (sub) {
              setIsPushSubscribed(true);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // Profile Settings States
  const [profileForm, setProfileForm] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
    age: user.age ? String(user.age) : "",
    gender: user.gender || "",
    occupation: user.occupation || "",
    address: user.address || "",
    city: user.city || "",
    province: user.province || "",
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactPhone: user.emergencyContactPhone || "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Health & Body Baseline Profile States
  const [healthProfile, setHealthProfile] = useState<HealthProfileData>(() => ({
    photoFrontUrl: initialHealthProfile?.photoFrontUrl || null,
    photoSideUrl: initialHealthProfile?.photoSideUrl || null,
    photoBackUrl: initialHealthProfile?.photoBackUrl || null,
    weightKg: initialHealthProfile?.weightKg ?? null,
    heightCm: initialHealthProfile?.heightCm ?? null,
    waistCm: initialHealthProfile?.waistCm ?? null,
    chestCm: initialHealthProfile?.chestCm ?? null,
    hipsCm: initialHealthProfile?.hipsCm ?? null,
    dietType: initialHealthProfile?.dietType || "Omnivore",
    foodAllergies: initialHealthProfile?.foodAllergies || "",
    injuriesOrConditions: initialHealthProfile?.injuriesOrConditions || "",
    primaryGoal: initialHealthProfile?.primaryGoal || "",
    currentMood: initialHealthProfile?.currentMood || "",
    energyLevel: initialHealthProfile?.energyLevel ?? 7,
    routineConfidence: initialHealthProfile?.routineConfidence ?? 3,
    workoutFrequency: initialHealthProfile?.workoutFrequency || "3 - 4 days / week",
    averageBedtime: initialHealthProfile?.averageBedtime || "22:30",
    averageWakeTime: initialHealthProfile?.averageWakeTime || "06:30",
    sleepQualityNotes: initialHealthProfile?.sleepQualityNotes || "",
    eatingPatterns: initialHealthProfile?.eatingPatterns || "",
  }));
  const [isUpdatingHealth, setIsUpdatingHealth] = useState(false);
  const [healthMsg, setHealthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState<"front" | "side" | "back" | null>(null);

  const handlePhotoUpload = async (key: "front" | "side" | "back", file: File) => {
    setUploadingPhotoKey(key);
    try {
      const compressed = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.onload = (e) => {
          const raw = e.target?.result as string;
          if (!raw) return reject(new Error("Empty data"));
          const img = new window.Image();
          img.onerror = () => resolve(raw);
          img.onload = () => {
            const maxDim = 1080;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(raw);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.78));
          };
          img.src = raw;
        };
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: compressed, type: key }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        const fieldName = key === "front" ? "photoFrontUrl" : key === "side" ? "photoSideUrl" : "photoBackUrl";
        setHealthProfile((prev) => ({ ...prev, [fieldName]: data.url }));
        setHealthMsg({ type: "success", text: `${key.toUpperCase()} photo uploaded. Remember to click 'Save Health Profile'.` });
      } else {
        setHealthMsg({ type: "error", text: data.message || "Failed to upload photo." });
      }
    } catch {
      setHealthMsg({ type: "error", text: "Photo upload failed. Please try again." });
    } finally {
      setUploadingPhotoKey(null);
    }
  };

  const handleSaveHealthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingHealth(true);
    setHealthMsg(null);
    try {
      const res = await wellnessUpdateHealthProfile(healthProfile);
      if (res.success) {
        setHealthMsg({ type: "success", text: "Health & lifestyle baseline profile saved successfully." });
        setTimeout(() => setHealthMsg(null), 4000);
      } else {
        setHealthMsg({ type: "error", text: res.message || "Failed to save health profile." });
      }
    } catch {
      setHealthMsg({ type: "error", text: "Network error occurred." });
    } finally {
      setIsUpdatingHealth(false);
    }
  };

  // Password Form States & Peek
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [peekCurrentPass, setPeekCurrentPass] = useState(false);
  const [peekNewPass, setPeekNewPass] = useState(false);
  const [peekConfirmPass, setPeekConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Delete Account States & Peek
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [peekDeletePass, setPeekDeletePass] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Program Detail Explanation Modal
  const [detailedProgram, setDetailedProgram] = useState<ProgramItem | null>(null);

  const handleSignOut = async () => {
    await wellnessSignOut();
    router.push("/");
    router.refresh();
  };

  const currentProgram =
    myEnrolledPrograms.find((p) => p.id === selectedProgId) ||
    myEnrolledPrograms[0] ||
    null;
  const currentEnrollment = currentProgram
    ? myPrograms.find((e) => e.programId === currentProgram.id)
    : null;
  const hasActiveAccess = currentEnrollment?.status === "ACTIVE";
  const todayIndex = currentProgram?.days?.findIndex((d) => d.isCalendarUnlocked && !d.isPast2359) ?? -1;
  const currentDay = todayIndex >= 0 ? currentProgram?.days?.[todayIndex] || null : null;
  const calendarDay = currentDay;
  const overlayDay = (day: ProgramDayItem): ProgramDayItem => ({
    ...day,
    userProgress: {
      ...(day.userProgress || {
        id: "",
        videoWatched: false,
        isCompleted: false,
        checklistCompleted: null,
      }),
      videoWatched: dayVideoWatched[day.id] ?? !!day.userProgress?.videoWatched,
      checklistCompleted:
        dayChecklists[day.id] !== undefined
          ? JSON.stringify(dayChecklists[day.id])
          : day.userProgress?.checklistCompleted || null,
      eventFeedback: dayEventFeedback[day.id] ?? day.userProgress?.eventFeedback,
      mealCompliance: dayMealCompliance[day.id] ?? day.userProgress?.mealCompliance,
      mealNotes: dayMealNotes[day.id] !== undefined ? dayMealNotes[day.id] : day.userProgress?.mealNotes,
      dailyReflection: dayReflections[day.id] !== undefined ? dayReflections[day.id] : day.userProgress?.dailyReflection,
      happinessRate: dayHappiness[day.id] ?? day.userProgress?.happinessRate,
      bedtime: dayBedtimes[day.id] ?? day.userProgress?.bedtime,
      wakeTime: dayWakeTimes[day.id] ?? day.userProgress?.wakeTime,
      photoBeforeUrl: dayPhotosBefore[day.id] ?? day.userProgress?.photoBeforeUrl,
      photoAfterUrl: dayPhotosAfter[day.id] ?? day.userProgress?.photoAfterUrl,
      workoutNotes: dayWorkoutNotes[day.id] ?? day.userProgress?.workoutNotes,
      selectedWorkout: dayWorkouts[day.id] ?? day.userProgress?.selectedWorkout,
    },
  });
  const liveDay = currentDay ? overlayDay(currentDay) : null;
  const historyDays = (currentProgram?.days || [])
    .filter((d) => {
      const p = d.userProgress;
      if (!p) return false;
      return !!(
        p.bedtime ||
        p.wakeTime ||
        p.mealCompliance ||
        p.dailyReflection ||
        p.checklistCompleted ||
        p.eventFeedback ||
        p.workoutNotes ||
        p.photoBeforeUrl ||
        p.photoAfterUrl ||
        p.isCompleted
      );
    })
    .map(overlayDay);

  const getCheckedItems = (day: ProgramDayItem): string[] => {
    if (dayChecklists[day.id] !== undefined) {
      return dayChecklists[day.id];
    }
    if (day.userProgress?.checklistCompleted) {
      try {
        return JSON.parse(day.userProgress.checklistCompleted);
      } catch {
        return [];
      }
    }
    return [];
  };

  const getVideoWatched = (day: ProgramDayItem): boolean => {
    if (dayVideoWatched[day.id] !== undefined) {
      return dayVideoWatched[day.id];
    }
    return !!day.userProgress?.videoWatched || !!day.userProgress?.isCompleted;
  };

  const areActiveWorkoutMovementsCompleted = (
    day: ProgramDayItem,
    checkedList: string[]
  ): boolean => {
    if (day.dayType !== "TRAINING_DAY" || !day.videoChecklist || day.videoChecklist.length === 0) {
      return true;
    }
    const groups = parseWorkoutOptionGroups(day.workoutOptions, day.videoChecklist);
    const selectedOpt =
      dayWorkouts[day.id] ||
      day.userProgress?.selectedWorkout ||
      groups[0]?.optionName ||
      "Workout";
    const activeGroup =
      groups.find((g) => g.optionName.trim().toLowerCase() === selectedOpt.trim().toLowerCase()) ||
      groups[0];
    if (!activeGroup || activeGroup.movements.length === 0) return true;

    const checkedKeys = new Set(
      checkedList.map((item) =>
        (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
      )
    );

    return activeGroup.movements.every((m) => {
      const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
      const plainKey = m.name.trim().toLowerCase();
      return checkedKeys.has(scopedKey) || checkedKeys.has(plainKey);
    });
  };

  const handleOpenVideo = async (dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay || getVideoWatched(currentDay)) return true;
    setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: true }));
    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      videoWatched: true,
      checklistCompleted: getCheckedItems(currentDay),
      isCompleted: !!currentDay.userProgress?.isCompleted,
    });
    if (!res.success) {
      setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: false }));
      return false;
    }
    return true;
  };

  const handleToggleVideoWatched = async () => {
    if (!currentDay) return;
    const prevVideo = getVideoWatched(currentDay);
    const nextVideo = !prevVideo;
    setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: nextVideo }));

    const checked = getCheckedItems(currentDay);
    const allTasksDone = areActiveWorkoutMovementsCompleted(currentDay, checked);
    const autoComplete = nextVideo && allTasksDone;

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      videoWatched: nextVideo,
      checklistCompleted: checked,
      isCompleted: autoComplete,
      assessmentResponse:
        dayAssessments[currentDay.id] !== undefined
          ? dayAssessments[currentDay.id]
          : currentDay.userProgress?.assessmentResponse || "",
    });

    if (!res.success) {
      // Rollback optimistic state
      setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: prevVideo }));
      setActionNotice({
        type: "error",
        text: res.message || "Failed to save video progress.",
      });
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    if (autoComplete) {
      setActionNotice({
        type: "success",
        text: `Day ${currentDay.dayNumber} completed.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    }
    router.refresh();
  };

  const handleToggleChecklist = async (task: string, dayId?: string) => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return;
    const existing = getCheckedItems(currentDay);
    const updated = existing.includes(task)
      ? existing.filter((t) => t !== task)
      : [...existing, task];

    setDayChecklists((prev) => ({ ...prev, [currentDay.id]: updated }));

    const videoDone =
      currentDay.dayType !== "TRAINING_DAY" || !currentDay.videoUrl
        ? true
        : getVideoWatched(currentDay);
    const restItems = (currentDay.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);
    const allTasksDone =
      currentDay.dayType === "REST_DAY"
        ? restItems.length === 0 || restItems.every((name) => updated.includes(name))
        : areActiveWorkoutMovementsCompleted(currentDay, updated);

    const autoComplete = videoDone && allTasksDone;

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      videoWatched: getVideoWatched(currentDay),
      checklistCompleted: updated,
      isCompleted: autoComplete,
      selectedWorkout: dayWorkouts[currentDay.id] || currentDay.userProgress?.selectedWorkout || undefined,
      photoBeforeUrl: dayPhotosBefore[currentDay.id] || currentDay.userProgress?.photoBeforeUrl || undefined,
      photoAfterUrl: dayPhotosAfter[currentDay.id] || currentDay.userProgress?.photoAfterUrl || undefined,
      mealCompliance: dayMealCompliance[currentDay.id] || currentDay.userProgress?.mealCompliance || undefined,
      mealNotes: dayMealNotes[currentDay.id] !== undefined ? dayMealNotes[currentDay.id] : currentDay.userProgress?.mealNotes || undefined,
      dailyReflection: dayReflections[currentDay.id] !== undefined ? dayReflections[currentDay.id] : currentDay.userProgress?.dailyReflection || undefined,
      happinessRate: dayHappiness[currentDay.id] || currentDay.userProgress?.happinessRate || undefined,
      bedtime: dayBedtimes[currentDay.id] || currentDay.userProgress?.bedtime || undefined,
      wakeTime: dayWakeTimes[currentDay.id] || currentDay.userProgress?.wakeTime || undefined,
      assessmentResponse:
        dayAssessments[currentDay.id] !== undefined
          ? dayAssessments[currentDay.id]
          : currentDay.userProgress?.assessmentResponse || "",
    });

    if (!res.success) {
      // Rollback optimistic state
      setDayChecklists((prev) => ({ ...prev, [currentDay.id]: existing }));
      setActionNotice({
        type: "error",
        text: res.message || "Failed to update checklist item.",
      });
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }

    if (autoComplete) {
      setActionNotice({
        type: "success",
        text: `Day ${currentDay.dayNumber} checklist completed.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleSaveSleep = async (
    bedtime: string,
    wakeTime: string,
    sleepDurationMinutes: number,
    dayId?: string
  ): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayBedtimes((prev) => ({ ...prev, [currentDay.id]: bedtime }));
    setDayWakeTimes((prev) => ({ ...prev, [currentDay.id]: wakeTime }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      bedtime,
      wakeTime,
      sleepDurationMinutes,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save sleep log." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: "Sleep log saved successfully." });
    setTimeout(() => setActionNotice(null), 3000);
    router.refresh();
    return true;
  };

  const handleSelectWorkout = async (workout: string, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayWorkouts((prev) => ({ ...prev, [currentDay.id]: workout }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      selectedWorkout: workout,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to select workout." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    return true;
  };

  const handleUploadPhoto = async (type: "before" | "after", base64OrUrl: string, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    if (type === "before") {
      setDayPhotosBefore((prev) => ({ ...prev, [currentDay.id]: base64OrUrl }));
    } else {
      setDayPhotosAfter((prev) => ({ ...prev, [currentDay.id]: base64OrUrl }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      photoBeforeUrl: type === "before" ? base64OrUrl : undefined,
      photoAfterUrl: type === "after" ? base64OrUrl : undefined,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to upload progress photo." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({
      type: "success",
      text: type === "before" ? "Before photo uploaded successfully." : "After photo uploaded successfully.",
    });
    setTimeout(() => setActionNotice(null), 3000);
    return true;
  };

  const handleSaveWorkoutNotes = async (notes: string, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayWorkoutNotes((prev) => ({ ...prev, [currentDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      workoutNotes: notes,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save workout notes." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: "Training notes saved successfully." });
    setTimeout(() => setActionNotice(null), 3000);
    return true;
  };

  const handleUpdateChecklistRep = async (task: string, repVal: string) => {
    if (!currentDay) return;
    const taskName = task.includes("=") ? task.split("=")[0].trim() : task.trim();
    const currentList = getCheckedItems(currentDay);

    const filtered = currentList.filter((item) => {
      const iName = item.includes("=") ? item.split("=")[0].trim() : item.trim();
      return iName.toLowerCase() !== taskName.toLowerCase() && item !== task;
    });

    const formattedItem = repVal.trim() ? `${taskName} = ${repVal.trim()}` : task;
    const nextList = [...filtered, formattedItem];
    setDayChecklists((prev) => ({ ...prev, [currentDay.id]: nextList }));

    const videoDone =
      currentDay.dayType !== "TRAINING_DAY" || !currentDay.videoUrl
        ? true
        : getVideoWatched(currentDay);
    const allTasksDone = areActiveWorkoutMovementsCompleted(currentDay, nextList);
    const autoComplete = videoDone && allTasksDone;

    await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: autoComplete || !!currentDay.userProgress?.isCompleted,
      checklistCompleted: nextList,
      videoWatched: getVideoWatched(currentDay),
      selectedWorkout:
        dayWorkouts[currentDay.id] || currentDay.userProgress?.selectedWorkout || undefined,
    });
  };

  const handleSaveEventFeedback = async (feedbackText: string, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setIsSavingFeedback(true);
    setFeedbackSaved(false);
    try {
      setDayEventFeedback((prev) => ({ ...prev, [currentDay.id]: feedbackText }));

      const res = await wellnessUserSubmitDayProgress({
        programDayId: currentDay.id,
        isCompleted: !!currentDay.userProgress?.isCompleted,
        checklistCompleted: getCheckedItems(currentDay),
        videoWatched: getVideoWatched(currentDay),
        eventFeedback: feedbackText,
      });

      if (!res.success) {
        setActionNotice({ type: "error", text: res.message || "Failed to save event feedback." });
        setTimeout(() => setActionNotice(null), 4000);
        return false;
      }
      setFeedbackSaved(true);
      router.refresh();
      setTimeout(() => setFeedbackSaved(false), 3000);
      return true;
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleSaveMeal = async (compliance: string, notes: string, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayMealCompliance((prev) => ({ ...prev, [currentDay.id]: compliance }));
    setDayMealNotes((prev) => ({ ...prev, [currentDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      mealCompliance: compliance,
      mealNotes: notes,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save nutrition notes." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: "Nutrition notes saved successfully." });
    setTimeout(() => setActionNotice(null), 3000);
    router.refresh();
    return true;
  };

  const handleSaveReflection = async (reflection: string, happinessRate: number, dayId?: string): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayReflections((prev) => ({ ...prev, [currentDay.id]: reflection }));
    setDayHappiness((prev) => ({ ...prev, [currentDay.id]: happinessRate }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      dailyReflection: reflection,
      happinessRate,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save Dear Diary reflection." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: "Daily reflection saved." });
    setTimeout(() => setActionNotice(null), 3000);
    router.refresh();
    return true;
  };

  const handleSaveAssessment = async () => {
    if (!currentDay) return;
    const responseText =
      dayAssessments[currentDay.id] !== undefined
        ? dayAssessments[currentDay.id]
        : currentDay.userProgress?.assessmentResponse || "";

    setIsSavingProgress(true);
    try {
      const res = await wellnessUserSubmitDayProgress({
        programDayId: currentDay.id,
        videoWatched: getVideoWatched(currentDay),
        assessmentResponse: responseText,
        checklistCompleted: getCheckedItems(currentDay),
        isCompleted: currentDay.userProgress?.isCompleted || false,
      });

      if (res.success) {
        setActionNotice({ type: "success", text: "Daily note saved." });
        setTimeout(() => setActionNotice(null), 3000);
      } else {
        setActionNotice({
          type: "error",
          text: res.message || "Failed to save daily note.",
        });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleToggleCompleteDay = async () => {
    if (!currentDay) return;
    const currentCompleted = !!currentDay.userProgress?.isCompleted;
    const nextCompleted = !currentCompleted;

    const nextChecklist = nextCompleted
      ? currentDay.videoChecklist
      : getCheckedItems(currentDay);

    const prevVideo = getVideoWatched(currentDay);
    const prevChecklist = getCheckedItems(currentDay);

    setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: nextCompleted }));
    if (nextCompleted) {
      setDayChecklists((prev) => ({ ...prev, [currentDay.id]: currentDay.videoChecklist }));
    }

    setIsSavingProgress(true);
    try {
      const res = await wellnessUserSubmitDayProgress({
        programDayId: currentDay.id,
        videoWatched: nextCompleted,
        isCompleted: nextCompleted,
        checklistCompleted: nextChecklist,
        assessmentResponse:
          dayAssessments[currentDay.id] !== undefined
            ? dayAssessments[currentDay.id]
            : currentDay.userProgress?.assessmentResponse || "",
      });

      if (res.success) {
        setActionNotice({
          type: "success",
          text: nextCompleted
            ? `Day ${currentDay.dayNumber} marked as completed.`
            : `Day ${currentDay.dayNumber} reopened.`,
        });
        setTimeout(() => setActionNotice(null), 3000);
        router.refresh();
      } else {
        // Rollback
        setDayVideoWatched((prev) => ({ ...prev, [currentDay.id]: prevVideo }));
        setDayChecklists((prev) => ({ ...prev, [currentDay.id]: prevChecklist }));
        setActionNotice({
          type: "error",
          text: res.message || "Unable to update completion state.",
        });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleOpenQrisCheckout = async (
    programId: string,
    mode: "IN_PERSON" | "VIRTUAL" = "VIRTUAL"
  ) => {
    const targetProg = allPrograms.find((p) => p.id === programId);
    if (targetProg) {
      const publicBadge = resolvePublicBadge({
        status: targetProg.status,
        registrationOpenDate: targetProg.registrationOpenDate,
        registrationDeadline: targetProg.registrationDeadline,
        startDate: targetProg.startDate,
        endDate: targetProg.endDate,
        maxQuota: targetProg.maxQuota,
        enrolledCount: targetProg.enrolledCount,
      });

      if (publicBadge && publicBadge !== "Open Registration") {
        setActionNotice({
          type: "error",
          text: `Pendaftaran tidak dibuka untuk program ini (Status: ${publicBadge}).`,
        });
        setTimeout(() => setActionNotice(null), 4000);
        return;
      }
    }

    setEnrollingId(programId);
    try {
      const res = await wellnessEnrollProgram(programId, mode);
      if (res.success && res.data) {
        setQrisInvoice(res.data);
      } else {
        setActionNotice({ type: "error", text: res.message || "Enrollment failed." });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized_admin") {
      setActionNotice({
        type: "error",
        text: "Access denied: Superadmin privileges required to access the Admin Console.",
      });
      setTimeout(() => setActionNotice(null), 5000);
    }
    const enrollId = searchParams.get("enroll");
    if (enrollId) {
      handleOpenQrisCheckout(enrollId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fireBrowserNotification = (title: string, body: string) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
          vibrate: [100, 50, 100],
          data: { url: "/dashboard" },
        } as NotificationOptions).catch(() => {
          try {
            new Notification(title, { body, icon: "/favicon.svg" });
          } catch {}
        });
      });
    } else {
      try {
        new Notification(title, { body, icon: "/favicon.svg" });
      } catch (err) {
        console.warn("Notification error:", err);
      }
    }
  };

  const handleEnableNotifications = async () => {
    if (typeof window === "undefined") return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isIos && !isStandalone) {
      setActionNotice({
        type: "error",
        text: "Syarat iPhone: Ketuk ikon Share (kotak panah) di Safari > 'Add to Home Screen' lalu buka dari Home Screen untuk mengaktifkan notifikasi saat layar mati.",
      });
      setTimeout(() => setActionNotice(null), 8000);
      return;
    }

    if (!("Notification" in window)) {
      setActionNotice({
        type: "error",
        text: "Browser notifications are not supported on this device.",
      });
      return;
    }
    setIsSubscribingPush(true);
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm !== "granted") {
        setActionNotice({
          type: "error",
          text: "Notification permission was not granted.",
        });
        setTimeout(() => setActionNotice(null), 3500);
        return;
      }

      // Handshake Web Push Subscription with Service Worker
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.pushManager) {
          throw new Error("PushManager is not available in this browser context.");
        }

        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
          const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }

        if (sub) {
          const subJson = sub.toJSON();
          const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: sub.endpoint,
              keys: {
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
              },
            }),
          });
          const data = await res.json();
          if (data.success) {
            setIsPushSubscribed(true);
            setActionNotice({
              type: "success",
              text: "+ BMS Web Push activated & synced with server dispatcher.",
            });
            setTimeout(() => setActionNotice(null), 4000);
          } else {
            setActionNotice({
              type: "error",
              text: data.message || "Failed to register push subscription on server.",
            });
            setTimeout(() => setActionNotice(null), 4000);
          }
        }
      } else {
        fireBrowserNotification(
          "Notifications on",
          "Reminders follow your program schedule in WIB."
        );
        setActionNotice({
          type: "success",
          text: "Push notification alert enabled locally.",
        });
        setTimeout(() => setActionNotice(null), 3500);
      }
    } catch (err: unknown) {
      console.warn("Failed to subscribe push:", err);
      const errorMsg = err instanceof Error ? err.message : "Subscription failed";
      setActionNotice({
        type: "error",
        text: `Push subscription notice: ${errorMsg}`,
      });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleTriggerCronServer = async (simulateTime?: string) => {
    setIsTriggeringCron(true);
    setCronTriggerResult(null);
    try {
      let clientSub: { endpoint: string; p256dh: string; auth: string } | null = null;
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg.pushManager) {
            let s = await reg.pushManager.getSubscription();
            if (!s) {
              const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
              s = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey,
              });
            }
            if (s) {
              const sJson = s.toJSON();
              if (sJson.keys?.p256dh && sJson.keys?.auth) {
                clientSub = {
                  endpoint: s.endpoint,
                  p256dh: sJson.keys.p256dh,
                  auth: sJson.keys.auth,
                };
              }
            }
          }
        } catch (err) {
          console.warn("[Cron] Could not read active client subscription:", err);
        }
      }

      const res = await fetch("/api/cron/dispatch-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          simulateTime,
          bypass: true,
          clientSubscription: clientSub,
        }),
      });
      const data = await res.json();
      setCronTriggerResult(data);
      if (data.success) {
        setActionNotice({
          type: "success",
          text: `Server Cron: ${data.notificationsTriggered} alert(s) triggered, ${data.totalDispatched} push notification(s) sent.`,
        });
        setTimeout(() => setActionNotice(null), 5000);
      } else {
        setActionNotice({
          type: "error",
          text: data.error || data.message || "Failed to trigger server cron dispatcher.",
        });
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cron request failed";
      setActionNotice({ type: "error", text: msg });
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsTriggeringCron(false);
    }
  };

  // Hobby cron runs once a day. While this session is open, ask the server (WIB clock) to send whatever is due.
  useEffect(() => {
    let lastMinute = "";
    let stopped = false;
    const tick = async () => {
      const wibNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const minute = wibNow.toISOString().slice(0, 16);
      if (minute === lastMinute) return;
      lastMinute = minute;
      try {
        const res = await fetch("/api/notifications/tick", { method: "POST" });
        const data = await res.json().catch(() => null);
        const sent = data?.dispatchedDetails?.[0];
        if (!stopped && res.ok && sent?.message) {
          setActionNotice({
            type: "success",
            text: `[${sent.scheduledTime} WIB] ${sent.programTitle}: ${sent.message}`,
          });
          setTimeout(() => setActionNotice(null), 6000);
        }
      } catch {
        // The next minute retries. A failed tick does not invent a message.
      }
    };
    tick();
    const interval = setInterval(tick, 20000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);

  const handleFireSpecificNotification = (progTitle: string, time: string, message: string) => {
    const title = `+ BMS • ${progTitle}`;
    fireBrowserNotification(title, `[${time} WIB] ${message}`);
    setActionNotice({
      type: "success",
      text: `[${time} WIB] ${progTitle}: ${message}`,
    });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);
    try {
      const res = await wellnessUpdateProfile({
        fullName: profileForm.fullName,
        phone: profileForm.phone || undefined,
        age: profileForm.age ? parseInt(profileForm.age, 10) : null,
        gender: profileForm.gender || null,
        occupation: profileForm.occupation || null,
        address: profileForm.address || null,
        city: profileForm.city || null,
        province: profileForm.province || null,
        emergencyContactName: profileForm.emergencyContactName || null,
        emergencyContactPhone: profileForm.emergencyContactPhone || null,
      });
      if (res.success) {
        setProfileMsg({ type: "success", text: "Profile updated successfully." });
        router.refresh();
      } else {
        setProfileMsg({ type: "error", text: res.message || "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Connection error." });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (
      passwordForm.newPassword.length < 8 ||
      !/[A-Z]/.test(passwordForm.newPassword) ||
      !/\d/.test(passwordForm.newPassword)
    ) {
      setPasswordMsg({
        type: "error",
        text: "New password must be at least 8 characters with at least 1 uppercase letter and 1 number.",
      });
      return;
    }
    setIsChangingPass(true);
    setPasswordMsg(null);
    try {
      const res = await wellnessChangePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      if (res.success) {
        setPasswordMsg({ type: "success", text: "Password updated successfully." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMsg({ type: "error", text: res.message || "Failed to update password." });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Connection error." });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await wellnessDeleteAccount({ password: deletePassword });
      if (res.success) {
        router.push("/?deleted=true");
      } else {
        setDeleteError(res.message || "Incorrect password.");
      }
    } catch {
      setDeleteError("Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const completedDaysCount =
    currentProgram?.days?.filter(
      (d) => !!d.userProgress?.isCompleted || (d.isPast2359 && !d.isSkipped)
    ).length || 0;
  const skippedDaysCount =
    currentProgram?.days?.filter((d) => d.isSkipped && !d.userProgress?.isCompleted).length || 0;
  const totalDays = currentProgram?.days?.length || 0;
  const currentActiveCalendarDay =
    currentProgram?.days?.find((d) => d.isCalendarUnlocked && !d.isPast2359) ||
    currentProgram?.days?.[0];

  const isWorkoutDone = !!(
    currentActiveCalendarDay?.userProgress?.isCompleted ||
    currentActiveCalendarDay?.userProgress?.videoWatched
  );
  const isMealDone = !!currentActiveCalendarDay?.userProgress?.mealCompliance;
  const isReflectionDone = !!currentActiveCalendarDay?.userProgress?.dailyReflection;
  const completedTasksCount = (isWorkoutDone ? 1 : 0) + (isMealDone ? 1 : 0) + (isReflectionDone ? 1 : 0);

  const formatShortDate = (iso: string | Date) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // My Plan tab: only plans the user actually holds (ACTIVE enrollments)
  const activeEnrollments = myPrograms.filter((e) => e.status === "ACTIVE");
  const planOptions = activeEnrollments.map((e) => ({ programId: e.programId, title: e.title }));
  const overviewEnrollment =
    activeEnrollments.find((e) => e.programId === selectedProgId) || activeEnrollments[0] || null;
  const overviewPlan = overviewEnrollment
    ? dailyPlans.find((p) => p.programId === overviewEnrollment.programId) ?? null
    : null;

  const handleOpenToday = () => {
    if (!overviewEnrollment) return;
    const prog = myEnrolledPrograms.find((p) => p.id === overviewEnrollment.programId);
    if (!prog) return;
    const todayNo = overviewPlan?.today?.dayNumber;
    const idx = todayNo ? prog.days.findIndex((d) => d.dayNumber === todayNo) : -1;
    setSelectedProgId(prog.id);
    setActiveDayIndex(idx >= 0 ? idx : 0);
    setIsViewingPlanDetail(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden font-mono bg-zinc-50 dark:bg-[#070709] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Per-tab header: My Plan renders it here; the other tabs render their own */}
      {activeTab === "my_plan" && (
        <MyPlanHeader
          visible={isHeaderVisible}
          plans={planOptions}
          selectedProgramId={overviewEnrollment?.programId ?? ""}
          onSelect={(id) => {
            setSelectedProgId(id);
            const prog = myEnrolledPrograms.find((p) => p.id === id);
            const idx = prog ? prog.days.findIndex((d) => d.isCalendarUnlocked && !d.isPast2359) : -1;
            setActiveDayIndex(idx >= 0 ? idx : 0);
            setIsViewingPlanDetail(false);
          }}
          onExplore={() => {
            setActiveTab("all_plan");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Unified Bottom Floating Dock (4 Menus: My Plan, Explore, Alerts, Profile) */}
      <nav
        aria-label="Primary"
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md h-12 rounded-full px-1.5 flex items-center justify-between gap-1 border border-zinc-200 dark:border-white/15 bg-white/80 dark:bg-neutral-950/85 backdrop-blur-2xl shadow-xl font-mono"
      >
        {(
          [
            { key: "my_plan", label: "My Plan", Icon: Calendar },
            { key: "all_plan", label: "Explore", Icon: Compass },
            { key: "notifications", label: "Alerts", Icon: Bell },
            { key: "profile", label: "Profile", Icon: User },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            aria-current={activeTab === key ? "page" : undefined}
            onClick={() => {
              setActiveTab(key);
              setIsViewingPlanDetail(false);
              window.scrollTo({ top: 0 });
            }}
            className={`flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
              activeTab === key
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Main Content Area with safe-area spacing */}
      <main
        style={{ paddingTop: "max(6rem, calc(4.75rem + env(safe-area-inset-top)))" }}
        className="max-w-5xl mx-auto px-3.5 sm:px-8 pb-28 sm:pb-32 flex-1 w-full space-y-6 sm:space-y-8"
      >
        {actionNotice && (
          <div
            className={`glass-panel p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in border shadow-lg ${
              actionNotice.type === "error"
                ? "border-red-500/30 text-red-700 dark:text-red-300"
                : "border-white/30 text-zinc-900 dark:text-white"
            }`}
          >
            {actionNotice.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-zinc-200 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        )}

        {activeTab === "my_plan" && (
          <MyPlanOverview
            program={
              overviewEnrollment && currentProgram
                ? {
                    title: currentProgram.title,
                    coachName: currentProgram.coachName,
                    coverImage: currentProgram.coverImage || overviewEnrollment.coverImage || null,
                    startDate: overviewEnrollment.startDate,
                    endDate: overviewEnrollment.endDate,
                    communityLink: overviewEnrollment.communityLink,
                    totalDays: currentProgram.days.length,
                  }
                : null
            }
            plan={overviewPlan}
            day={liveDay}
            stats={{
              completed: completedDaysCount,
              skipped: skippedDaysCount,
              remaining: currentProgram?.days.filter((d) => !d.isPast2359 && !d.userProgress?.isCompleted).length || 0,
              segments: (currentProgram?.days || []).map((d) =>
                d.userProgress?.isCompleted
                  ? ("done" as const)
                  : d.isCalendarUnlocked && !d.isPast2359
                    ? ("today" as const)
                    : d.isPast2359
                      ? ("skipped" as const)
                      : ("upcoming" as const)
              ),
            }}
            onOpenDetails={() => {
              const prog = allPrograms.find((p) => p.id === overviewEnrollment?.programId);
              if (prog) setDetailedProgram(prog);
            }}
            onUploadPhoto={handleUploadPhoto}
            onSaveWorkoutNotes={handleSaveWorkoutNotes}
            historyDays={historyDays}
            checklist={currentDay ? dayChecklists[currentDay.id] : undefined}
            onSelectWorkout={handleSelectWorkout}
            onOpenVideo={handleOpenVideo}
            onExplore={() => {
              setActiveTab("all_plan");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onToggleCheck={handleToggleChecklist}
            onSaveSleep={handleSaveSleep}
            onSaveMeal={handleSaveMeal}
            onSaveReflection={handleSaveReflection}
            onSaveAttendance={handleSaveEventFeedback}
          />
        )}

        {/* TAB 2: EXPLORE PLAN */}
        {activeTab === "all_plan" && (
          <ExplorePlanTab
            headerVisible={isHeaderVisible}
            registeringId={enrollingId}
            onRegister={(id) => handleOpenQrisCheckout(id)}
            onViewDetails={(id) => {
              const prog = allPrograms.find((p) => p.id === id);
              if (prog) setDetailedProgram(prog);
            }}
            onOpenPlan={(id) => {
              setSelectedProgId(id);
              setIsViewingPlanDetail(false);
              setActiveTab("my_plan");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}

        {/* TAB 3: NOTIFICATION & HISTORY */}
        {activeTab === "notifications" && <NotificationsHistoryTab headerVisible={isHeaderVisible} />}

        {/* TAB 4: PROFILE & SETTINGS */}
        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            health={healthProfile}
            headerVisible={isHeaderVisible}
            onLogout={handleSignOut}
            onDeleteAccount={() => setDeleteModalOpen(true)}
          />
        )}
      </main>
      {/* ===================================================================== */}
      {/* PROFILE SIDEBAR DRAWER (SLIDE-OVER MENU & DETAIL VIEW)                */}
      {/* ===================================================================== */}
      {isProfileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-mono">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setIsProfileSidebarOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 w-full max-w-lg bg-neutral-950/98 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col h-full overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Top Bar */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur-xl z-20">
              <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                Member Profile
              </span>
              <button
                type="button"
                onClick={() => setIsProfileSidebarOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-4 sm:p-6 space-y-4 flex-1">
              {profileActiveDetail === null ? (
              /* VIEW 1: STACKED MENU OVERVIEW (MOBILE & DESKTOP STACK) */
              <div className="space-y-4">
                {/* Header User Identity Card */}
                <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-3 shadow-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full border border-white/20 bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {healthProfile?.photoFrontUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={healthProfile.photoFrontUrl}
                          alt={user.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-semibold text-white uppercase font-mono">
                          {user.fullName ? user.fullName.charAt(0) : "U"}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h2 className="text-base font-light tracking-tight text-white uppercase font-geometric truncate">
                        {user.fullName}
                      </h2>
                      <span className="text-xs text-zinc-400 font-mono block truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                    <span>Role: {user.role || "MEMBER"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/15 uppercase font-bold tracking-wider">
                      Active Member
                    </span>
                  </div>
                </div>

                {/* The Clean Stack of Profile Sections */}
                <div className="space-y-2.5 font-mono">
                  {/* Item 1: Personal Info */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileActiveDetail("personal");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 transition flex items-center justify-between group active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 truncate">
                        <span className="text-xs font-semibold text-white block uppercase tracking-wide">
                          Personal Information
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {profileForm.fullName || user.fullName} &bull; {profileForm.phone || "No phone added"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition group-hover:translate-x-0.5 shrink-0" />
                  </button>

                  {/* Item 2: Medical & Lifestyle Baseline */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileActiveDetail("medical");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 transition flex items-center justify-between group active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 truncate">
                        <span className="text-xs font-semibold text-white block uppercase tracking-wide">
                          Medical &amp; Lifestyle Baseline
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {healthProfile.weightKg ? `${healthProfile.weightKg}kg` : "Weight pending"} &bull; {healthProfile.heightCm ? `${healthProfile.heightCm}cm` : "Height pending"} &bull; {healthProfile.dietType || "Diet"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition group-hover:translate-x-0.5 shrink-0" />
                  </button>

                  {/* Item 3: Payment History */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileActiveDetail("payments");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 transition flex items-center justify-between group active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 truncate">
                        <span className="text-xs font-semibold text-white block uppercase tracking-wide">
                          Payment History
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          {myPrograms.length} {myPrograms.length === 1 ? "Transaction record" : "Transaction records"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition group-hover:translate-x-0.5 shrink-0" />
                  </button>

                  {/* Item 4: Security & Account */}
                  <button
                    type="button"
                    onClick={() => {
                      setProfileActiveDetail("account");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/10 transition flex items-center justify-between group active:scale-[0.99] shadow-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/10 transition">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 truncate">
                        <span className="text-xs font-semibold text-white block uppercase tracking-wide">
                          Security &amp; Account Settings
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          Password update, home screen PWA, delete account
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition group-hover:translate-x-0.5 shrink-0" />
                  </button>
                </div>

                {/* Quick Sign Out Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold uppercase tracking-wider text-zinc-300 hover:text-white transition flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-zinc-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW 2: DEDICATED DETAIL VIEW WITH BACK BUTTON */
              <div className="space-y-4">
                {/* Top Back Navigation Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileActiveDetail(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-mono uppercase tracking-wider text-white transition flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Profile</span>
                  </button>
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">
                    {profileActiveDetail === "personal"
                      ? "Personal Information"
                      : profileActiveDetail === "medical"
                      ? "Medical Baseline"
                      : profileActiveDetail === "payments"
                      ? "Payment History"
                      : "Security & Account"}
                  </span>
                </div>

                {/* DETAIL 1: PERSONAL INFORMATION */}
                {profileActiveDetail === "personal" && (
                  <form
                    onSubmit={handleUpdateProfile}
                    className="rounded-2xl p-4 sm:p-6 bg-zinc-900/60 border border-white/10 space-y-4 shadow-sm"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 block">
                        Identity Details
                      </span>
                      <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
                        Personal Information
                      </h3>
                    </div>

                {profileMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium font-mono border ${
                      profileMsg.type === "success"
                        ? "bg-white/10 border-white/20 text-white"
                        : "bg-white/5 border-white/10 text-zinc-300"
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, fullName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 text-xs text-zinc-500 cursor-not-allowed border border-white/5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      WhatsApp / Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      placeholder="Enter your age"
                      value={profileForm.age}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, age: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Gender
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, gender: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white cursor-pointer focus:outline-none focus:border-white/30"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Occupation
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your occupation"
                      value={profileForm.occupation}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, occupation: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your street address"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, address: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your city"
                      value={profileForm.city}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, city: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Province / State
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your province"
                      value={profileForm.province}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, province: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter emergency contact name"
                      value={profileForm.emergencyContactName}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, emergencyContactName: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter emergency contact phone"
                      value={profileForm.emergencyContactPhone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-5 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-[0.98]"
                  >
                    {isUpdatingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

                {/* DETAIL 2: HEALTH & BODY ASSESSMENT */}
                {profileActiveDetail === "medical" && (
                  <form
                    onSubmit={handleSaveHealthProfile}
                    className="rounded-2xl p-4 sm:p-6 bg-zinc-900/60 border border-white/10 space-y-5 shadow-sm"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-zinc-400 font-mono block">
                      Physical Baseline
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
                    Health &amp; Body Telemetry
                  </h3>
                  <p className="text-xs text-zinc-400 font-light">
                    Measurements, dietary preferences, and posture baselines.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 font-light flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>
                    Self-managed by you. Coaches view as read-only telemetry.
                  </span>
                </div>

                {healthMsg && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-medium font-mono ${
                      healthMsg.type === "success"
                        ? "bg-white/10 border border-white/20 text-zinc-900 dark:text-white"
                        : "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {healthMsg.text}
                  </div>
                )}

                {/* SECTION A: Front, Side, Back Photos */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Posture &amp; Progress Photos</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                        Three-angle baseline capture for coach analysis and personal milestone comparison.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                    {(
                      [
                        { key: "front", label: "Front View", field: "photoFrontUrl" as const },
                        { key: "side", label: "Side View", field: "photoSideUrl" as const },
                        { key: "back", label: "Back View", field: "photoBackUrl" as const },
                      ] as const
                    ).map(({ key, label, field }) => {
                      const photoUrl = healthProfile[field];
                      const isUploading = uploadingPhotoKey === key;

                      return (
                        <div
                          key={key}
                          className="relative rounded-2xl border border-zinc-200/80 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] p-3 text-center flex flex-col justify-between group overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                              {label}
                            </span>
                            {photoUrl && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                                Logged
                              </span>
                            )}
                          </div>

                          {photoUrl ? (
                            <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 group">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={photoUrl}
                                alt={label}
                                className="w-full h-full object-cover object-center"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 backdrop-blur-xs">
                                <label className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-[10px] font-semibold cursor-pointer hover:bg-zinc-200 transition">
                                  Change
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isUploading}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handlePhotoUpload(key, f);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setHealthProfile((p) => ({ ...p, [field]: null }))}
                                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-[10px] hover:bg-white/20 transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="relative aspect-[3/4] w-full rounded-xl border border-dashed border-zinc-300 dark:border-white/20 hover:border-zinc-500 dark:hover:border-white/40 bg-zinc-100/50 dark:bg-white/[0.01] hover:bg-zinc-100 dark:hover:bg-white/[0.04] transition flex flex-col items-center justify-center gap-2 cursor-pointer p-4">
                              {isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                              ) : (
                                <>
                                  <div className="w-9 h-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center">
                                    <Camera className="w-4 h-4 text-zinc-400" />
                                  </div>
                                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                                    Upload {label}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-mono">
                                    JPG, PNG up to 5MB
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handlePhotoUpload(key, f);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION B: Body Measurements */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Body Measurements</span>
                      </h4>
                      <p className="text-[11px] text-zinc-400 font-light mt-0.5">
                        Key anthropometric data. Height and weight calculate your baseline BMI.
                      </p>
                    </div>
                    {healthProfile.weightKg && healthProfile.heightCm && (
                      <span className="font-mono text-[11px] px-3 py-1 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white border border-zinc-200/60 dark:border-white/15">
                        BMI: {(healthProfile.weightKg / Math.pow(healthProfile.heightCm / 100, 2)).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5">
                        Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Enter weight in kg"
                        value={healthProfile.weightKg ?? ""}
                        onChange={(e) =>
                          setHealthProfile((p) => ({
                            ...p,
                            weightKg: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Enter height in cm"
                        value={healthProfile.heightCm ?? ""}
                        onChange={(e) =>
                          setHealthProfile((p) => ({
                            ...p,
                            heightCm: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5">
                        Waist (cm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Enter waist in cm"
                        value={healthProfile.waistCm ?? ""}
                        onChange={(e) =>
                          setHealthProfile((p) => ({
                            ...p,
                            waistCm: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5">
                        Chest (cm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Enter chest in cm"
                        value={healthProfile.chestCm ?? ""}
                        onChange={(e) =>
                          setHealthProfile((p) => ({
                            ...p,
                            chestCm: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-1.5">
                        Hips (cm)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Enter hips in cm"
                        value={healthProfile.hipsCm ?? ""}
                        onChange={(e) =>
                          setHealthProfile((p) => ({
                            ...p,
                            hipsCm: e.target.value ? parseFloat(e.target.value) : null,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION C: Dietary Style & Medical Notes */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dietary Style &amp; Medical Conditions</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Primary Diet Type
                      </label>
                      <select
                        value={healthProfile.dietType || "Omnivore"}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, dietType: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-medium cursor-pointer"
                      >
                        <option value="Omnivore">Omnivore (Balanced Whole Foods)</option>
                        <option value="Vegetarian">Vegetarian (Plant-based + Dairy/Eggs)</option>
                        <option value="Vegan">Vegan (100% Plant-based)</option>
                        <option value="Pescatarian">Pescatarian (Fish & Seafood)</option>
                        <option value="Ketogenic">Ketogenic / Low-Carb High-Fat</option>
                        <option value="Halal">Halal Diet</option>
                        <option value="Gluten-Free">Gluten-Free</option>
                        <option value="Other">Other Dietary Style</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Food Allergies / Intolerances
                      </label>
                      <input
                        type="text"
                        placeholder="Enter food allergies or none"
                        value={healthProfile.foodAllergies || ""}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, foodAllergies: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Injuries, Joint Limitations &amp; Medical Conditions
                      </label>
                      <input
                        type="text"
                        placeholder="Enter injuries or medical conditions or none"
                        value={healthProfile.injuriesOrConditions || ""}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, injuriesOrConditions: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Primary Longevity Goal
                      </label>
                      <input
                        type="text"
                        placeholder="Enter primary health or fitness goal"
                        value={healthProfile.primaryGoal || ""}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, primaryGoal: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION D: Mood & Vital Energy */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Current Mood &amp; Vital Energy</span>
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Primary Mental State
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          "Calm & Centered",
                          "Focused & Driven",
                          "High Energy",
                          "Fatigued / Sleepy",
                          "Stressed / Anxious",
                          "Grateful & Balanced",
                        ].map((m) => {
                          const isSelected = healthProfile.currentMood === m;
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setHealthProfile((p) => ({ ...p, currentMood: m }))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                                isSelected
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400 border border-transparent"
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500">
                          Energy Level
                        </label>
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {healthProfile.energyLevel ?? 7} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={healthProfile.energyLevel ?? 7}
                        onChange={(e) =>
                          setHealthProfile((p) => ({ ...p, energyLevel: parseInt(e.target.value, 10) }))
                        }
                        className="w-full accent-zinc-900 dark:accent-white cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION E: Routine Confidence & Workout Frequency */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Routine Confidence &amp; Workout Frequency</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Confidence in Current Routine
                      </label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { score: 1, label: "Struggling" },
                          { score: 2, label: "Inconsistent" },
                          { score: 3, label: "Moderate" },
                          { score: 4, label: "Solid" },
                          { score: 5, label: "Peak Flow" },
                        ].map(({ score, label }) => {
                          const isSelected = (healthProfile.routineConfidence ?? 3) === score;
                          return (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setHealthProfile((p) => ({ ...p, routineConfidence: score }))}
                              className={`p-2 rounded-xl text-center transition flex flex-col items-center gap-1 ${
                                isSelected
                                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs"
                                  : "bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <span className="text-xs font-mono font-bold">{score}</span>
                              <span className="text-[9px] truncate max-w-full">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Current Workout Frequency
                      </label>
                      <select
                        value={healthProfile.workoutFrequency || "3 - 4 days / week"}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, workoutFrequency: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl glass-input text-xs font-medium cursor-pointer"
                      >
                        <option value="Sedentary (0 days/week)">Sedentary (0 days / week)</option>
                        <option value="1 - 2 days / week">1 - 2 days / week</option>
                        <option value="3 - 4 days / week">3 - 4 days / week</option>
                        <option value="5+ days / week">5+ days / week</option>
                        <option value="Daily Athlete / Intensive">Daily Athlete / Intensive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION F: Sleep Routine & Eating Patterns */}
                <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-white/10">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-white font-mono flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Sleep Routine &amp; Nutrition Patterns</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500">
                        Sleep Schedule &amp; Quality
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Target Bedtime</span>
                          <input
                            type="text"
                            placeholder="Enter target bedtime (HH:MM)"
                            value={healthProfile.averageBedtime || ""}
                            onChange={(e) => setHealthProfile((p) => ({ ...p, averageBedtime: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Target Wake Time</span>
                          <input
                            type="text"
                            placeholder="Enter target wake time (HH:MM)"
                            value={healthProfile.averageWakeTime || ""}
                            onChange={(e) => setHealthProfile((p) => ({ ...p, averageWakeTime: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter sleep quality notes"
                        value={healthProfile.sleepQualityNotes || ""}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, sleepQualityNotes: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl glass-input text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500">
                        Eating Habits &amp; Dietary Style
                      </label>
                      <input
                        type="text"
                        placeholder="Enter eating patterns and dietary style"
                        value={healthProfile.eatingPatterns || ""}
                        onChange={(e) => setHealthProfile((p) => ({ ...p, eatingPatterns: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl glass-input text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Intermittent Fasting", "Whole Foods", "High Protein", "Plant Based", "Halal Diet"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setHealthProfile((p) => {
                                const curr = p.eatingPatterns || "";
                                if (curr.includes(tag)) return p;
                                return { ...p, eatingPatterns: curr ? `${curr}, ${tag}` : tag };
                              })
                            }
                            className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition font-mono"
                          >
                            +{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 text-right border-t border-zinc-100 dark:border-white/10">
                  <button
                    type="submit"
                    disabled={isUpdatingHealth}
                    className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide shadow-sm flex items-center gap-2 ml-auto"
                  >
                    {isUpdatingHealth && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isUpdatingHealth ? "Saving Profile..." : "Save Health Profile"}</span>
                  </button>
                </div>
              </form>
            )}

                {/* DETAIL 3: PAYMENT HISTORY */}
                {profileActiveDetail === "payments" && (
                  <div className="space-y-6">
                    <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-4 border border-zinc-200/70 dark:border-white/10 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                            Billing &amp; Transactions
                          </span>
                          <h3 className="text-lg font-light tracking-tight text-zinc-900 dark:text-white font-geometric">
                            Payment History
                          </h3>
                        </div>
                        <span className="text-micro font-semibold px-3 py-1 rounded-full glass-panel-subtle text-zinc-600 dark:text-zinc-300">
                          {myPrograms.length} Invoices
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                        Review your program tuitions, QRIS invoice status, and receipt history.
                      </p>
                    </div>

                    {myPrograms.length === 0 ? (
                      <div className="glass-panel rounded-3xl p-12 text-center border border-zinc-200/70 dark:border-white/10 space-y-4">
                        <CreditCard className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                          No Payment Records Found
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-light">
                          You haven&apos;t enrolled in any paid programs yet. Explore our longevity protocols to begin.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("all_plan")}
                          className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-2"
                        >
                          <span>Explore Programs</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myPrograms.map((enr) => {
                          const isPaid = enr.status === "ACTIVE";
                          const isPending = enr.status === "PENDING";

                          return (
                            <div
                              key={enr.enrollmentId}
                              className="glass-panel rounded-2xl p-5 sm:p-6 border border-zinc-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 bg-zinc-900 border border-zinc-200/50 dark:border-white/10">
                                  <Image
                                    src={enr.coverImage || "/test.jpg"}
                                    alt={enr.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                      {enr.title}
                                    </h4>
                                    <span
                                      className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full ${
                                        isPaid
                                          ? "bg-white text-zinc-950 font-bold border border-white"
                                          : isPending
                                          ? "bg-white/10 text-white border border-white/20"
                                          : "bg-zinc-800 text-zinc-400 border border-white/10"
                                      }`}
                                    >
                                      {isPaid ? "Paid & Active" : isPending ? "Payment Pending" : enr.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                                    Coach: {enr.coachName} &bull; Ref: {enr.paymentReference || enr.enrollmentId.slice(-8).toUpperCase()}
                                  </p>
                                  <div className="text-[11px] text-zinc-400 font-mono pt-0.5">
                                    {isPaid && enr.paidAt && (
                                      <span>Paid on {new Date(enr.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                    )}
                                    {isPending && enr.invoiceExpiresAt && (
                                      <span className="text-zinc-400">
                                        Expires {new Date(enr.invoiceExpiresAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-white/5">
                                <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                                  Rp {enr.price.toLocaleString("id-ID")}
                                </span>

                                {isPending && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQrisCheckout(enr.programId)}
                                    className="px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                                  >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Pay with QRIS</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

                {/* DETAIL 4: ACCOUNT MANAGEMENT & SECURITY */}
                {profileActiveDetail === "account" && (
              <div className="space-y-8">
                {/* 1. Daily Push Reminders */}
                <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                        Circadian Push Notifications
                      </span>
                      <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-4 h-4 text-zinc-400" />
                        <span>Notifications</span>
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Message and delivery time follow the program schedule in WIB (Asia/Jakarta).
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-zinc-200 dark:border-white/15 shrink-0 text-zinc-700 dark:text-zinc-300">
                      {notifPermission === "granted" ? "On" : "Off"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="px-4 py-2 rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold"
                  >
                    {notifPermission === "granted" ? "Notifications on" : "Turn on notifications"}
                  </button>

                  {/* PWA Home Screen Guide */}
                  <div className="pt-5 border-t border-zinc-200/60 dark:border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-micro uppercase tracking-[0.2em] font-semibold text-zinc-900 dark:text-white font-mono">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Install on Home Screen (PWA Sanctuary)</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                      For native ambient immersion and reliable push alerts, install onto your device home screen:
                    </p>
                    <ol className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400 list-decimal list-inside font-light">
                      <li>In <strong>Safari (iOS)</strong>, tap Share &rarr; &ldquo;Add to Home Screen&rdquo;.</li>
                      <li>In <strong>Chrome (Android)</strong>, tap Menu (3 dots) &rarr; &ldquo;Install app&rdquo;.</li>
                    </ol>
                  </div>
                </div>

                {/* 2. Change Password */}
                <form
                  onSubmit={handleChangePassword}
                  className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 shadow-sm"
                >
                  <div className="space-y-1">
                    <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Access Security
                    </span>
                    <h3 className="text-lg font-light tracking-tight text-zinc-900 dark:text-white font-geometric">
                      Change Password
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                      Ensure your account is protected with a resilient credentials passphrase.
                    </p>
                  </div>

                  {passwordMsg && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-medium font-mono ${
                        passwordMsg.type === "success"
                          ? "bg-white/10 border border-white/20 text-zinc-900 dark:text-white"
                          : "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {passwordMsg.text}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={peekCurrentPass ? "text" : "password"}
                          required
                          placeholder="Enter current password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                          }
                          className="w-full pl-4 pr-12 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setPeekCurrentPass(!peekCurrentPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          {peekCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={peekNewPass ? "text" : "password"}
                          required
                          minLength={8}
                          placeholder="Enter new password (min. 8 characters)"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                          }
                          className="w-full pl-4 pr-12 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setPeekNewPass(!peekNewPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          {peekNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={peekConfirmPass ? "text" : "password"}
                          required
                          minLength={8}
                          placeholder="Confirm new password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                          }
                          className="w-full pl-4 pr-12 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setPeekConfirmPass(!peekConfirmPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          {peekConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 text-right">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide shadow-sm"
                    >
                      {isChangingPass ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>

                {/* 3. Danger Zone */}
                <div className="glass-panel rounded-3xl p-7 sm:p-9 border border-white/10 space-y-4 shadow-sm">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 block">
                    Irreversible Action
                  </span>
                  <h3 className="text-lg font-light tracking-tight text-white font-geometric">
                    Delete Account
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Permanently purge your account, personal logs, streak histories, and active program enrollments. This cannot be reversed.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      className="px-5 py-2.5 rounded-full border border-white/20 text-zinc-300 hover:bg-white/10 hover:text-white text-xs font-medium tracking-wide transition"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
            </div>
          </div>
        </div>
      )}


      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Delete Your Account
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Please enter your password to confirm permanent account deletion.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="relative">
                <input
                  type={peekDeletePass ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl glass-input text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPeekDeletePass(!peekDeletePass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  {peekDeletePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="px-4 py-2 rounded-xl glass-panel-subtle text-zinc-800 dark:text-zinc-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition"
                >
                  {isDeletingAccount ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QrisCheckoutModal
        isOpen={!!qrisInvoice}
        invoice={qrisInvoice}
        onClose={() => setQrisInvoice(null)}
        onSuccess={(progId) => {
          setQrisInvoice(null);
          setSelectedProgId(progId);
          setActiveTab("my_plan");
          router.refresh();
        }}
        programLocationType={
          allPrograms.find((p) => p.id === qrisInvoice?.programId)?.locationType
        }
        programVenue={
          allPrograms.find((p) => p.id === qrisInvoice?.programId)?.venueAddress
        }
        programTerms={
          allPrograms.find((p) => p.id === qrisInvoice?.programId)?.termsList
        }
      />

      {detailedProgram && (
        <ProgramDetailView
          program={detailedProgram}
          enrollmentStatus={(() => {
            const enrolled = myPrograms.find((e) => e.programId === detailedProgram.id);
            return enrolled?.status === "ACTIVE" || enrolled?.status === "PENDING" ? enrolled.status : null;
          })()}
          onClose={() => setDetailedProgram(null)}
          onOpenPlan={() => {
            setSelectedProgId(detailedProgram.id);
            const prog = myEnrolledPrograms.find((item) => item.id === detailedProgram.id);
            const idx = prog ? prog.days.findIndex((day) => day.isCalendarUnlocked && !day.isPast2359) : -1;
            setActiveDayIndex(idx >= 0 ? idx : 0);
            setActiveTab("my_plan");
            setIsViewingPlanDetail(false);
            setDetailedProgram(null);
            window.scrollTo({ top: 0 });
          }}
          onEnroll={() => {
            const progId = detailedProgram.id;
            setDetailedProgram(null);
            handleOpenQrisCheckout(progId);
          }}
        />
      )}

    </div>
  );
}
