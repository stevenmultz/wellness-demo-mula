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
  initialHealthProfile?: HealthProfileData | null;
}

export function DashboardClient({
  user,
  myPrograms,
  allPrograms,
  initialHealthProfile,
}: DashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my_plan" | "all_plan" | "notifications">("my_plan");
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
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("20:30");
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
  const currentDay = currentProgram?.days?.[activeDayIndex] || currentProgram?.days?.[0] || null;

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

  const handleToggleChecklist = async (task: string) => {
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
    const allTasksDone = areActiveWorkoutMovementsCompleted(currentDay, updated);

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
    sleepDurationMinutes: number
  ) => {
    if (!currentDay) return;
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
    } else {
      setActionNotice({ type: "success", text: "Sleep log saved successfully." });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleSelectWorkout = async (workout: string) => {
    if (!currentDay) return;
    setDayWorkouts((prev) => ({ ...prev, [currentDay.id]: workout }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(currentDay),
      videoWatched: getVideoWatched(currentDay),
      selectedWorkout: workout,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to select workout discipline." });
      setTimeout(() => setActionNotice(null), 4000);
    } else {
      setActionNotice({ type: "success", text: `Workout selected: ${workout}` });
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  const handleUploadPhoto = async (type: "before" | "after", base64OrUrl: string) => {
    if (!currentDay) return;
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
    } else {
      setActionNotice({
        type: "success",
        text: type === "before" ? "Before photo uploaded successfully." : "After photo uploaded successfully.",
      });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleSaveWorkoutNotes = async (notes: string) => {
    if (!currentDay) return;
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
    } else {
      setActionNotice({ type: "success", text: "Training notes saved successfully." });
      setTimeout(() => setActionNotice(null), 3000);
    }
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

  const handleSaveEventFeedback = async (feedbackText: string) => {
    if (!currentDay) return;
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
      } else {
        setFeedbackSaved(true);
        setActionNotice({ type: "success", text: "Event feedback saved successfully." });
        setTimeout(() => {
          setFeedbackSaved(false);
          setActionNotice(null);
        }, 3000);
      }
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const handleSaveMeal = async (compliance: string, notes: string) => {
    if (!currentDay) return;
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
    } else {
      setActionNotice({ type: "success", text: "Nutrition notes saved successfully." });
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleSaveReflection = async (reflection: string, happinessRate: number) => {
    if (!currentDay) return;
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
    } else {
      setActionNotice({ type: "success", text: "Dear Diary & Daily Fulfillment saved." });
      setTimeout(() => setActionNotice(null), 3000);
    }
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
          "+ BMS • Reminders Activated",
          `Morning Awakening (${morningTime}) and Evening Reflection (${eveningTime}) alerts are now active.`
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

  const handleTestReminder = (type: "morning" | "evening") => {
    const title =
      type === "morning"
        ? "+ BMS • Morning Awakening Protocol"
        : "+ BMS • Evening Reflection & Cutoff";
    const msg =
      type === "morning"
        ? currentDay?.pendingReminder ||
          "Good morning. Daily curriculum, sleep check, and movement sequence are now unlocked."
        : "Evening Check: Complete your movement reps and reflection before the 23:59 cutoff.";

    fireBrowserNotification(title, msg);
    setActionNotice({ type: "success", text: `Dispatched test alert: "${title}"` });
    setTimeout(() => setActionNotice(null), 4500);
  };

  // Realtime Cadence Dispatcher: checks every 5 seconds against current device time (HH:mm)
  const [dispatchedCadenceKeys, setDispatchedCadenceKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkScheduledDispatches = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${hours}:${minutes}`;

      myEnrolledPrograms.forEach((prog) => {
        const todayDay = prog.days.find((d) => d.isCalendarUnlocked && !d.isPast2359);
        if (!todayDay || !todayDay.dayNotifications) return;

        todayDay.dayNotifications.forEach((notif, nIdx) => {
          const key = `${prog.id}-${todayDay.id}-${nIdx}`;
          if (notif.time === currentTimeStr && !dispatchedCadenceKeys[key]) {
            setDispatchedCadenceKeys((prev) => ({ ...prev, [key]: true }));

            const title = `+ BMS • ${prog.title}`;
            const body = `[${notif.time} WIB] ${notif.message}`;
            fireBrowserNotification(title, body);

            setActionNotice({
              type: "success",
              text: `[${notif.time} WIB] ${prog.title}: ${notif.message}`,
            });
            setTimeout(() => setActionNotice(null), 6000);
          }
        });
      });
    };

    checkScheduledDispatches();
    const interval = setInterval(checkScheduledDispatches, 5000);
    return () => clearInterval(interval);
  }, [myEnrolledPrograms, dispatchedCadenceKeys]);

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
    currentProgram?.days?.filter((d) => d.userProgress?.isCompleted).length || 0;
  const skippedDaysCount =
    currentProgram?.days?.filter((d) => d.isSkipped && !d.userProgress?.isCompleted).length || 0;
  const totalDays = currentProgram?.days?.length || 0;
  const currentActiveCalendarDay =
    currentProgram?.days?.find((d) => d.isCalendarUnlocked && !d.isPast2359) ||
    currentProgram?.days?.[0];

  const formatShortDate = (iso: string | Date) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col relative overflow-x-hidden bg-neutral-950 font-mono">
      {/* Top Minimalist Header: Left Avatar, Center '+', Right 'My Plan' Dropdown */}
      <header
        style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
        className={`fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl h-12 px-3 sm:px-4 rounded-full blur-dock flex items-center justify-between border border-white/10 shadow-2xl transition-all duration-300 font-mono ${
          isHeaderVisible ? "translate-y-0 opacity-100" : "-translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        {/* LEFT: User Profile Avatar */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => {
              setIsProfileSidebarOpen(true);
              setProfileActiveDetail(null);
            }}
            className="relative group focus:outline-none"
            title="Open Profile Sidebar"
          >
            <div className="w-8 h-8 rounded-full border border-white/20 bg-zinc-900 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 group-hover:border-white/60 shadow-sm">
              {healthProfile?.photoFrontUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={healthProfile.photoFrontUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-semibold text-white uppercase tracking-wider font-mono">
                  {user.fullName ? user.fullName.charAt(0) : "U"}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* CENTER: Minimalist '+ BMS' Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-1.5 group focus:outline-none" title="Home">
            <span className="font-mono font-light text-xl text-white leading-none tracking-normal group-hover:opacity-80 transition select-none">
              +
            </span>
            <span className="font-geometric font-light text-xs tracking-[0.28em] text-white uppercase">
              BMS
            </span>
          </Link>
        </div>

        {/* RIGHT: Dropdown Menu containing My Plan */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPlanDropdownOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-[10px] font-mono uppercase tracking-wider transition active:scale-95"
          >
            <Calendar className="w-3 h-3 text-zinc-300" />
            <span className="font-semibold">My Plan</span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${
                isPlanDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Floating Dropdown */}
          {isPlanDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                onClick={() => setIsPlanDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 font-mono">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">
                    Enrolled Protocols ({myEnrolledPrograms.length})
                  </span>
                </div>

                <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                  {myEnrolledPrograms.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500 font-light">
                      No active enrolled plans.
                    </div>
                  ) : (
                    myEnrolledPrograms.map((prog) => {
                      const isSelected = selectedProgId === prog.id && isViewingPlanDetail;
                      const completedCount = prog.days.filter((d) => d.userProgress?.isCompleted).length;
                      const progressPct =
                        prog.days.length > 0 ? Math.round((completedCount / prog.days.length) * 100) : 0;
                      return (
                        <button
                          key={prog.id}
                          type="button"
                          onClick={() => {
                            setSelectedProgId(prog.id);
                            const currentIdx = prog.days.findIndex(
                              (d) => d.isCalendarUnlocked && !d.isPast2359
                            );
                            setActiveDayIndex(currentIdx >= 0 ? currentIdx : 0);
                            setIsViewingPlanDetail(true);
                            setActiveTab("my_plan");
                            setIsPlanDropdownOpen(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-2 ${
                            isSelected ? "bg-white text-zinc-950" : "hover:bg-white/5 text-zinc-200"
                          }`}
                        >
                          <div className="space-y-0.5 truncate">
                            <span
                              className={`text-xs block font-light uppercase tracking-tight truncate ${
                                isSelected ? "text-zinc-950 font-medium" : "text-white"
                              }`}
                            >
                              {prog.title}
                            </span>
                            <span
                              className={`text-[10px] block font-mono ${
                                isSelected ? "text-zinc-700" : "text-zinc-400"
                              }`}
                            >
                              Coach {prog.coachName} &bull; {prog.dayCount} Days
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold font-mono ${
                                isSelected ? "text-zinc-950" : "text-zinc-300"
                              }`}
                            >
                              {progressPct}%
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("my_plan");
                      setIsViewingPlanDetail(false);
                      setIsPlanDropdownOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full py-2 px-3 rounded-lg text-center text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 transition font-semibold"
                  >
                    View All Plans Overview &rarr;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Unified Bottom Floating Dock (3 Menus: My Plan, Explore, Alerts) */}
      <nav
        style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-xs h-12 rounded-full blur-dock px-1.5 flex items-center justify-between border border-white/15 bg-neutral-950/85 backdrop-blur-2xl shadow-2xl font-mono"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("my_plan");
            setIsViewingPlanDetail(false);
          }}
          className={`flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
            activeTab === "my_plan"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>My Plan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("all_plan");
            setIsViewingPlanDetail(false);
          }}
          className={`flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
            activeTab === "all_plan"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Explore</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("notifications");
            setIsViewingPlanDetail(false);
          }}
          className={`flex-1 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 ${
            activeTab === "notifications"
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Alerts</span>
        </button>
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

        {/* TAB 1: DAILY CURRICULUM & BENTO GRID (ONLY ENROLLED PROGRAMS) */}
        {activeTab === "my_plan" && (
          <div className="space-y-10 sm:space-y-12 font-mono">
            {!currentProgram ? (
              /* Empty state if user has NOT enrolled in any program yet */
              <div className="relative rounded-3xl overflow-hidden glass-panel border border-zinc-200/70 dark:border-white/10 p-10 sm:p-16 text-center flex flex-col items-center justify-center space-y-6 shadow-2xl min-h-[420px]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Image
                    src="/test.jpg"
                    alt=""
                    fill
                    className="object-cover scale-105 opacity-20 dark:opacity-10"
                  />
                </div>
                <div className="w-16 h-16 rounded-full glass-panel-subtle border border-zinc-200/60 dark:border-white/10 text-zinc-400 flex items-center justify-center relative z-10 shadow-sm">
                  <Calendar className="w-8 h-8" />
                </div>
                <div className="space-y-2.5 max-w-md relative z-10 font-mono">
                  <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-semibold">
                    No Enrolled Program
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
                    You haven&apos;t joined a program yet.
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed font-mono">
                    My Program exclusively displays the protocols you are participating in. Explore our curated active curriculums to unlock your daily movement protocols, whole food plans, and community channel.
                  </p>
                </div>
                <div className="relative z-10 pt-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all_plan")}
                    className="px-7 py-3 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-2 shadow-xl transition duration-200"
                  >
                    <span>Explore Programs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : !isViewingPlanDetail ? (
              /* VIEW 1: DASHBOARD VIEW (Redesigned: Sleep Pattern Graph & Unified Tasks -> Stacked My Plans -> 3 Newly Published Plans) */
              <div className="space-y-10 sm:space-y-14 font-mono">
                {/* Header Welcome Title */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 font-mono pb-2 border-b border-white/10">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-zinc-400">
                      Circadian Telemetry &bull; Daily Protocol
                    </span>
                    <h1 className="text-xl sm:text-3xl font-light tracking-tight text-white uppercase font-geometric">
                      Welcome, <span className="font-normal">{user.fullName.split(" ")[0]}</span>
                    </h1>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* ============================================================= */}
                {/* PART 1: GRAFIK & METRIK POLA TIDUR + UNIFIED DAILY TASKS      */}
                {/* ============================================================= */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                  {/* Left Column: Sleep Patterns Line Graph & Precision Numbers (7 Cols) */}
                  <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-zinc-900/60 border border-white/10 space-y-5 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-white" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white font-mono">
                          Sleep Pattern &bull; 7-Day Circadian
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] uppercase font-bold tracking-wider">
                        88% Restored
                      </span>
                    </div>

                    {/* Prominent Precision Numbers */}
                    <div className="grid grid-cols-3 gap-2 text-center font-mono py-1 border-b border-white/5 pb-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Avg Duration</span>
                        <div className="text-base sm:text-lg font-bold text-white">
                          7.6 <span className="text-[10px] font-normal text-zinc-400">Hours</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Bedtime</span>
                        <div className="text-base sm:text-lg font-bold text-white">
                          22:30 <span className="text-[10px] font-normal text-zinc-400">WIB</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Wake-up</span>
                        <div className="text-base sm:text-lg font-bold text-white">
                          06:15 <span className="text-[10px] font-normal text-zinc-400">WIB</span>
                        </div>
                      </div>
                    </div>

                    {/* Precision Line Graph (Garis & Angka) */}
                    <div className="space-y-3 py-1">
                      <div className="w-full overflow-hidden px-1">
                        <svg
                          viewBox="0 0 320 85"
                          className="w-full h-24 overflow-visible"
                        >
                          <defs>
                            <linearGradient id="sleepAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.00" />
                            </linearGradient>
                          </defs>

                          {/* Target Reference Line at 8.0h (y=28) */}
                          <line
                            x1="10"
                            y1="28"
                            x2="310"
                            y2="28"
                            stroke="rgba(255,255,255,0.18)"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                          <text
                            x="310"
                            y="23"
                            fill="rgba(255,255,255,0.45)"
                            fontSize="7.5"
                            textAnchor="end"
                            fontFamily="monospace"
                          >
                            8.0H TARGET
                          </text>

                          {/* Shaded Area under Line */}
                          <polygon
                            points="20,44 65,32 110,58 155,28 200,40 245,18 290,36 290,75 20,75"
                            fill="url(#sleepAreaGrad)"
                          />

                          {/* Hairline Data Trajectory Line */}
                          <polyline
                            points="20,44 65,32 110,58 155,28 200,40 245,18 290,36"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Data Nodes & Angka (Numbers) */}
                          {[
                            { x: 20, y: 44, val: "7.2h", day: "MON" },
                            { x: 65, y: 32, val: "7.8h", day: "TUE" },
                            { x: 110, y: 58, val: "6.5h", day: "WED" },
                            { x: 155, y: 28, val: "8.0h", day: "THU" },
                            { x: 200, y: 40, val: "7.4h", day: "FRI" },
                            { x: 245, y: 18, val: "8.5h", day: "SAT" },
                            { x: 290, y: 36, val: "7.6h", day: "SUN", isToday: true },
                          ].map((pt, i) => (
                            <g key={i}>
                              {/* Outer ring for today */}
                              {pt.isToday && (
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="5.5"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="1"
                                  opacity="0.8"
                                />
                              )}
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={pt.isToday ? "3" : "2.5"}
                                fill="white"
                              />
                              {/* Exact Number */}
                              <text
                                x={pt.x}
                                y={pt.y - 6}
                                fill={pt.isToday ? "#ffffff" : "rgba(255,255,255,0.75)"}
                                fontSize="7.5"
                                fontWeight={pt.isToday ? "bold" : "normal"}
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {pt.val}
                              </text>
                              {/* Day Label */}
                              <text
                                x={pt.x}
                                y={83}
                                fill={pt.isToday ? "#ffffff" : "rgba(255,255,255,0.4)"}
                                fontSize="7.5"
                                fontWeight={pt.isToday ? "bold" : "normal"}
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {pt.day}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pt-1 border-t border-white/5">
                        <span>Rest Window: 7.5h – 8.5h</span>
                        <span className="text-white font-semibold">Today: 7.6h &bull; Deep REM</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Unified Daily Tasks (Done vs Pending) (5 Cols) */}
                  <div className="lg:col-span-5 rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-zinc-900/60 border border-white/10 space-y-4 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-white" />
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white font-mono">
                          Daily Task Telemetry
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 text-[10px] font-bold tracking-wider">
                        {currentActiveCalendarDay?.userProgress?.isCompleted ? "3 / 3 Complete" : "1 Done • 2 Pending"}
                      </span>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-2 font-mono">
                      {/* Task 1: Workout */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          {currentActiveCalendarDay?.userProgress?.isCompleted || currentActiveCalendarDay?.userProgress?.videoWatched ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <div className="space-y-0.5 truncate">
                            <span className="text-xs text-white font-medium block truncate">
                              {currentActiveCalendarDay?.title || "Morning Mobility Protocol"}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {currentActiveCalendarDay?.dayType === "TRAINING_DAY" ? "Movement Routine (25m)" : "Active Rest"}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0 ${
                          currentActiveCalendarDay?.userProgress?.isCompleted ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}>
                          {currentActiveCalendarDay?.userProgress?.isCompleted ? "Done" : "Pending"}
                        </span>
                      </div>

                      {/* Task 2: Meal Protocol */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          {currentActiveCalendarDay?.userProgress?.mealCompliance ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <div className="space-y-0.5 truncate">
                            <span className="text-xs text-white font-medium block truncate">
                              Whole-Food Nutrition Intake
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              Clean Anti-Inflammatory Fuel
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0 ${
                          currentActiveCalendarDay?.userProgress?.mealCompliance ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}>
                          {currentActiveCalendarDay?.userProgress?.mealCompliance ? "Done" : "Pending"}
                        </span>
                      </div>

                      {/* Task 3: Evening Reflection */}
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          {currentActiveCalendarDay?.userProgress?.dailyReflection ? (
                            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                          )}
                          <div className="space-y-0.5 truncate">
                            <span className="text-xs text-white font-medium block truncate">
                              Circadian Reflection &amp; Vitality
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              Evening Mental Decompression
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0 ${
                          currentActiveCalendarDay?.userProgress?.dailyReflection ? "bg-white text-zinc-950" : "bg-white/5 text-zinc-400 border border-white/10"
                        }`}>
                          {currentActiveCalendarDay?.userProgress?.dailyReflection ? "Done" : "Pending"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Cutoff: 23:59 WIB Daily</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewingPlanDetail(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-white hover:underline flex items-center gap-1 font-semibold uppercase tracking-wider"
                      >
                        <span>Check In Today</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* PART 2: LIST MY PLAN YANG DI STACK                            */}
                {/* ============================================================= */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span className="text-[10px] uppercase font-mono tracking-[0.24em] font-semibold text-zinc-400">
                        Enrolled Protocols
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-lg sm:text-2xl font-light uppercase tracking-tight text-white font-geometric">
                        My Enrolled Plans
                      </h2>
                      <span className="text-xs text-zinc-400 font-mono">
                        {myEnrolledPrograms.length} Active {myEnrolledPrograms.length === 1 ? "Plan" : "Plans"}
                      </span>
                    </div>
                  </div>

                  {/* Stacked Cards */}
                  <div className="space-y-4">
                    {myEnrolledPrograms.map((prog, idx) => {
                      const todayIdx = prog.days.findIndex((d) => d.isCalendarUnlocked && !d.isPast2359);
                      const currentDayForProg = todayIdx >= 0 ? prog.days[todayIdx] : prog.days[0];
                      const completedCount = prog.days.filter((d) => d.userProgress?.isCompleted).length;
                      const progressPct = prog.days.length > 0 ? Math.round((completedCount / prog.days.length) * 100) : 0;

                      return (
                        <div
                          key={prog.id}
                          className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 p-5 sm:p-7 flex flex-col justify-between group shadow-xl bg-zinc-950 transition-all duration-300 hover:border-white/30"
                        >
                          {/* Background Cover with Vignette */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <Image
                              src={prog.coverImage || (idx % 2 === 0 ? "/test.jpg" : "/pic.jpg")}
                              alt={prog.title}
                              fill
                              className="object-cover object-center brightness-[0.45] scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 font-mono">
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 uppercase tracking-wider font-bold text-white">
                                Active Protocol
                              </span>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white text-zinc-950 uppercase tracking-wider font-bold">
                                Day {currentDayForProg?.dayNumber || 1} of {prog.days.length}
                              </span>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 backdrop-blur-md uppercase tracking-wider">
                                {prog.dayCount} Days
                              </span>
                            </div>

                            {prog.communityLink && (
                              <a
                                href={prog.communityLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1 transition"
                              >
                                <span>Circle</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            )}
                          </div>

                          {/* Center Content */}
                          <div className="relative z-10 space-y-2.5 py-5 text-white">
                            <h3 className="text-lg sm:text-2xl font-light tracking-tight text-white uppercase font-geometric">
                              {prog.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300 font-mono">
                              <span>Coach {prog.coachName}</span>
                              <span>&bull;</span>
                              <span>{formatShortDate(prog.startDate)} – {formatShortDate(prog.endDate)}</span>
                            </div>

                            {/* Today's Focus Strip */}
                            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 max-w-lg text-xs text-zinc-200 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 truncate">
                                <Calendar className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                <span className="truncate">
                                  <strong>Day {currentDayForProg?.dayNumber || 1}:</strong> {currentDayForProg?.title || "Movement Sequence"}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                {progressPct}% Done
                              </span>
                            </div>
                          </div>

                          {/* Bottom Action Area */}
                          <div className="relative z-10 pt-3 border-t border-white/15 flex items-center justify-between gap-3 font-mono">
                            <span className="text-[10px] text-zinc-400 font-light">
                              {prog.days.filter((d) => d.userProgress?.isCompleted).length} of {prog.days.length} Daily Sessions Finished
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProgId(prog.id);
                                const currentIdx = prog.days.findIndex(
                                  (d) => d.isCalendarUnlocked && !d.isPast2359
                                );
                                setActiveDayIndex(currentIdx >= 0 ? currentIdx : 0);
                                setIsViewingPlanDetail(true);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="px-5 py-2 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xl transition active:scale-[0.98]"
                            >
                              <span>Open Plan Detail</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ============================================================= */}
                {/* PART 3: 3 NEWLY PUBLISHED PLANS DI BAGIAN BAWAH              */}
                {/* ============================================================= */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span className="text-[10px] uppercase font-mono tracking-[0.24em] font-semibold text-zinc-400">
                        New Releases
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-lg sm:text-2xl font-light uppercase tracking-tight text-white font-geometric">
                        Newly Published Programs
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("all_plan");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono uppercase tracking-wider"
                      >
                        <span>View All ({allPrograms.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 font-light font-mono">
                      Curated cohorts recently opened for registration.
                    </p>
                  </div>

                  {/* 3 Program Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                    {newlyPublishedPrograms.map((prog, idx) => {
                      const enrolled = myPrograms.find((e) => e.programId === prog.id);
                      const isEnrolled = !!enrolled;

                      return (
                        <div
                          key={prog.id}
                          className="relative rounded-2xl overflow-hidden border border-white/15 p-4 flex flex-col justify-between min-h-[300px] group shadow-xl bg-zinc-950"
                        >
                          {/* Background image */}
                          <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <Image
                              src={prog.coverImage || (idx % 2 === 0 ? "/pic.jpg" : "/test.jpg")}
                              alt={prog.title}
                              fill
                              className="object-cover object-center brightness-[0.5] scale-100 group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />

                          {/* Top Badges */}
                          <div className="relative z-10 flex items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[9px] uppercase tracking-wider font-semibold text-white">
                              {prog.dayCount} Days
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[9px] uppercase tracking-wider font-bold">
                              Open Reg.
                            </span>
                          </div>

                          {/* Bottom Content */}
                          <div className="relative z-10 space-y-2 pt-6">
                            <div className="space-y-1">
                              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                                Coach {prog.coachName}
                              </span>
                              <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase leading-snug">
                                {prog.title}
                              </h3>
                            </div>

                            <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Tuition</span>
                                <span className="text-xs font-bold text-white">
                                  Rp {prog.price.toLocaleString("id-ID")}
                                </span>
                              </div>

                              {isEnrolled ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProgId(prog.id);
                                    setIsViewingPlanDetail(true);
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                  }}
                                  className="px-3.5 py-1.5 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-wider"
                                >
                                  Enrolled
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailedProgram(prog);
                                  }}
                                  className="px-3.5 py-1.5 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md transition active:scale-95"
                                >
                                  <span>Details</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW 2: PLAN DETAIL (Hari ini apa saja gitu) */
              <div className="space-y-5 sm:space-y-6 font-mono">
                {/* Top Navigation Bar with Back Button */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewingPlanDetail(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[10px] font-bold uppercase tracking-wider text-zinc-200 hover:text-white transition flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold">
                      {currentProgram.title}
                    </span>
                    <span className="text-[11px] font-semibold text-white">
                      Day {currentDay?.dayNumber || 1} of {totalDays}
                    </span>
                  </div>
                </div>

                {/* Day Selector Timeline */}
                <div className="p-3.5 sm:p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3 shadow-xl font-mono">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold font-mono">
                        Curriculum Track
                      </span>
                      <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
                        Daily Schedule
                      </h3>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      23:59 Cutoff
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono">
                    {currentProgram.days.map((day, idx) => {
                      const isSelected = activeDayIndex === idx;
                      const isCompleted = !!day.userProgress?.isCompleted;
                      const isSkipped = day.isSkipped && !isCompleted;
                      const isLockedFuture = !day.isCalendarUnlocked;
                      const isToday = day.isCalendarUnlocked && !day.isPast2359;

                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setActiveDayIndex(idx)}
                          className={`min-w-[95px] sm:min-w-[110px] p-2.5 sm:p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between shrink-0 gap-2 font-mono ${
                            isSelected
                              ? "bg-white text-zinc-950 border-white shadow-xl scale-[1.02]"
                              : isCompleted
                              ? "bg-white/10 border-white/20 text-zinc-200"
                              : isSkipped
                              ? "bg-white/5 border-white/5 text-zinc-500 opacity-60"
                              : isLockedFuture
                              ? "bg-white/5 border-white/5 text-zinc-500 opacity-60"
                              : "bg-white/5 border-white/10 text-zinc-300 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] uppercase tracking-wider font-bold">
                              Day {day.dayNumber}
                            </span>
                            {isCompleted ? (
                              <CheckCircle className={`w-3 h-3 ${isSelected ? "text-zinc-950" : "text-white"}`} />
                            ) : isSkipped ? (
                              <AlertTriangle className="w-3 h-3 text-zinc-500" />
                            ) : isLockedFuture ? (
                              <Lock className="w-3 h-3 opacity-60" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-zinc-950" : isToday ? "bg-white animate-pulse" : "bg-zinc-500"}`} />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] block truncate font-semibold uppercase">
                              {day.dayType === "TRAINING_DAY"
                                ? "Training"
                                : day.dayType === "REST_DAY"
                                ? "Recovery"
                                : "Connection"}
                            </span>
                            <span className="text-[9px] opacity-70 block font-light">
                              {formatShortDate(day.unlockDate)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Content Bento Grid */}
                {currentDay && (
                  <div className="space-y-4 sm:space-y-6">
                    {/* Day Title Banner */}
                    <div className="rounded-2xl p-4 sm:p-6 bg-zinc-900/60 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400">
                            Day {currentDay.dayNumber} &bull; {formatShortDate(currentDay.unlockDate)}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                            {currentDay.dayType === "TRAINING_DAY"
                              ? "Training Protocol"
                              : currentDay.dayType === "REST_DAY"
                              ? "Recovery Protocol"
                              : "Connection Circle"}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-2xl font-light tracking-tight text-white uppercase font-geometric">
                          {currentDay.title}
                        </h2>
                        {currentDay.dayType !== "REST_DAY" && (currentDay.coachName || currentDay.recommendedFor) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                            {currentDay.coachName && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full chrome-badge text-micro uppercase tracking-wider font-semibold font-mono">
                                Coach: {currentDay.coachName}
                              </span>
                            )}
                            {currentDay.recommendedFor && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 text-micro uppercase tracking-wider font-medium font-mono">
                                Target: {currentDay.recommendedFor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 font-mono">
                        {currentDay.userProgress?.isCompleted ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-900 dark:text-white bg-white/10 border border-white/20 px-4 py-2 rounded-full">
                            <CheckCircle className="w-4 h-4 text-white" /> Day Completed
                          </span>
                        ) : currentDay.isSkipped ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 glass-panel-subtle border border-zinc-200/60 dark:border-white/10 px-4 py-2 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-zinc-400" /> Past Cutoff
                          </span>
                        ) : !currentDay.isCalendarUnlocked ? (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 glass-panel-subtle px-4 py-2 rounded-full">
                            <Lock className="w-3.5 h-3.5" /> Unlocks {formatShortDate(currentDay.unlockDate)} at 00:00
                          </span>
                        ) : null}

                        {hasActiveAccess &&
                          currentDay.isCalendarUnlocked &&
                          !currentDay.isPast2359 && (
                            <button
                              type="button"
                              onClick={handleToggleCompleteDay}
                              disabled={isSavingProgress}
                              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition flex items-center gap-2 font-mono ${
                                currentDay.userProgress?.isCompleted
                                  ? "glass-panel-subtle text-zinc-800 dark:text-zinc-200"
                                  : "chrome-button"
                              }`}
                            >
                              {isSavingProgress ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : currentDay.userProgress?.isCompleted ? (
                                <>Reopen Day</>
                              ) : (
                                <>
                                  Complete Day <CheckCircle className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Today Push Notification Schedule Banner */}
                    {hasActiveAccess && currentDay.isCalendarUnlocked && currentDay.dayNotifications && currentDay.dayNotifications.length > 0 && (
                      <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs border border-zinc-200/60 dark:border-white/10 font-mono">
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                          <Bell className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-900 dark:text-white font-mono">
                            Today&apos;s Dispatch Schedule
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 font-mono">
                          {currentDay.dayNotifications.map((notif, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-full glass-panel-subtle text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-2"
                              title={notif.message}
                            >
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <strong className="text-zinc-900 dark:text-white font-medium">{notif.time}</strong>
                              <span className="truncate max-w-[140px] sm:max-w-[220px] font-light">{notif.message}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GATE 1: Unpaid User */}
                    {!hasActiveAccess ? (
                      <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center space-y-5 border border-zinc-200/70 dark:border-white/10">
                        <div className="w-12 h-12 rounded-full glass-panel-subtle flex items-center justify-center mx-auto text-zinc-400">
                          <Lock className="w-5 h-5 stroke-[1.5]" />
                        </div>
                        <div className="space-y-2">
                          <span className="text-micro uppercase tracking-[0.24em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                            Member Sanctuary Protocol
                          </span>
                          <h3 className="text-xl sm:text-2xl font-light tracking-tight text-zinc-900 dark:text-white">
                            Members-Only Curriculum
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-light">
                            Enroll in this program to unlock daily movement sequences, circadian recovery guidance, and personalized self-assessments.
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenQrisCheckout(currentProgram.id)}
                            disabled={enrollingId === currentProgram.id}
                            className="px-8 py-3.5 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-2.5 shadow-lg"
                          >
                            <QrCode className="w-4 h-4" /> Enroll Now &bull; Rp{" "}
                            {currentProgram.price.toLocaleString("id-ID")}
                          </button>
                        </div>
                      </div>
                    ) : !currentDay.isCalendarUnlocked ? (
                      /* GATE 2: Future Calendar Day */
                      <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center space-y-4 border border-zinc-200/70 dark:border-white/10">
                        <div className="w-12 h-12 rounded-full glass-panel-subtle flex items-center justify-center mx-auto text-zinc-400">
                          <Clock className="w-5 h-5 stroke-[1.5]" />
                        </div>
                        <div className="space-y-2">
                          <span className="text-micro uppercase tracking-[0.24em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                            Temporal Alignment
                          </span>
                          <h3 className="text-xl sm:text-2xl font-light tracking-tight text-zinc-900 dark:text-white">
                            Scheduled for {formatShortDate(currentDay.unlockDate)}
                          </h3>
                          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed font-light">
                            Day {currentDay.dayNumber} unlocks at midnight (00:00 WIB) on{" "}
                            <span className="text-zinc-900 dark:text-white font-medium">
                              {formatShortDate(currentDay.unlockDate)}
                            </span>{" "}
                            in synchronization with your batch schedule.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* UNLOCKED 3-PHASE CURRICULUM LAYOUT */
                      <div className="space-y-5 sm:space-y-6">
                        {/* Phase Switcher Navigation Tabs */}
                        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/80 border border-white/10 font-mono text-[10px] uppercase font-bold tracking-wider">
                          <button
                            type="button"
                            onClick={() => setActiveDetailPhase("movement")}
                            className={`flex-1 py-2 px-2.5 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
                              activeDetailPhase === "movement"
                                ? "bg-white text-zinc-950 shadow-md font-bold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span>01 Movement</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDetailPhase("fuel")}
                            className={`flex-1 py-2 px-2.5 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
                              activeDetailPhase === "fuel"
                                ? "bg-white text-zinc-950 shadow-md font-bold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Utensils className="w-3.5 h-3.5" />
                            <span>02 Fuel &amp; Sleep</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveDetailPhase("recovery")}
                            className={`flex-1 py-2 px-2.5 rounded-xl text-center transition flex items-center justify-center gap-1.5 ${
                              activeDetailPhase === "recovery"
                                ? "bg-white text-zinc-950 shadow-md font-bold"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <Smile className="w-3.5 h-3.5" />
                            <span>03 Recovery</span>
                          </button>
                        </div>

                        {/* PHASE 01: MOVEMENT (TRAINING / REST / CONNECTION) */}
                        {activeDetailPhase === "movement" && (
                          <div className="space-y-5">
                            {currentDay.dayType === "TRAINING_DAY" ? (
                              <div className="space-y-5">
                                <VideoThumbnailLinkCard
                                  title={currentDay.title}
                                  videoUrl={currentDay.videoUrl}
                                  videoWatched={getVideoWatched(currentDay)}
                                  isPast2359={currentDay.isPast2359}
                                  onToggleWatched={handleToggleVideoWatched}
                                />

                                <WorkoutSection
                                  dayNumber={currentDay.dayNumber}
                                  availableOptions={currentDay.workoutOptions || []}
                                  selectedWorkout={dayWorkouts[currentDay.id] || currentDay.userProgress?.selectedWorkout}
                                  photoBeforeUrl={dayPhotosBefore[currentDay.id] || currentDay.userProgress?.photoBeforeUrl}
                                  photoAfterUrl={dayPhotosAfter[currentDay.id] || currentDay.userProgress?.photoAfterUrl}
                                  workoutNotes={dayWorkoutNotes[currentDay.id] !== undefined ? dayWorkoutNotes[currentDay.id] : currentDay.userProgress?.workoutNotes}
                                  checklist={currentDay.videoChecklist || []}
                                  completedChecklist={getCheckedItems(currentDay)}
                                  isPast2359={currentDay.isPast2359}
                                  onSelectWorkout={handleSelectWorkout}
                                  onUploadPhoto={handleUploadPhoto}
                                  onToggleChecklistItem={handleToggleChecklist}
                                  onSaveWorkoutNotes={handleSaveWorkoutNotes}
                                  onUpdateChecklistRep={handleUpdateChecklistRep}
                                />
                              </div>
                            ) : currentDay.dayType === "REST_DAY" ? (
                              <div className="rounded-2xl p-5 sm:p-6 space-y-4 bg-zinc-900/60 border border-white/10 font-mono shadow-lg">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 block">
                                    Phase 01 &bull; Active Recovery
                                  </span>
                                  <h3 className="text-base sm:text-xl font-light tracking-tight text-white uppercase font-geometric">
                                    Rest &amp; Deep Regeneration
                                  </h3>
                                </div>

                                <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light whitespace-pre-line">
                                  {currentDay.restInstructions ||
                                    "Take a gentle 25-minute sunlight walk, practice box breathing, and allow neuromuscular tissues to fully decompress."}
                                </div>
                              </div>
                            ) : (
                              /* CONNECTION_DAY / MEETUP */
                              <div className="rounded-2xl p-5 sm:p-6 space-y-4 bg-zinc-900/60 border border-white/10 font-mono shadow-lg">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-400 block">
                                    Phase 01 &bull; Connection
                                  </span>
                                  <h3 className="text-base sm:text-xl font-light tracking-tight text-white uppercase font-geometric">
                                    {currentDay.eventTitle || "Community & Facetime Circle"}
                                  </h3>
                                </div>

                                <div className="grid sm:grid-cols-2 gap-3">
                                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5" /> Schedule
                                    </span>
                                    <p className="text-xs font-medium text-white">
                                      {currentDay.onsiteSchedule || "09:00 AM – 11:30 AM WIB"}
                                    </p>
                                  </div>

                                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5" /> Venue
                                    </span>
                                    <p className="text-xs font-medium text-white truncate">
                                      {currentDay.onsiteVenue || currentProgram.venueAddress || "The Sanctuary, Jakarta"}
                                    </p>
                                  </div>
                                </div>

                                {currentDay.mapLink && (
                                  <a
                                    href={currentDay.mapLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:opacity-90 transition"
                                  >
                                    <span>Open Google Maps</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                {/* Feedback Note */}
                                <div className="space-y-2 pt-2 border-t border-white/10">
                                  <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold block">
                                    Connect Session Notes
                                  </label>
                                  <textarea
                                    rows={2}
                                    disabled={currentDay.isPast2359}
                                    value={
                                      dayEventFeedback[currentDay.id] !== undefined
                                        ? dayEventFeedback[currentDay.id]
                                        : currentDay.userProgress?.eventFeedback || ""
                                    }
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setDayEventFeedback((p) => ({ ...p, [currentDay.id]: text }));
                                    }}
                                    placeholder="Enter your circle takeaways or meetup reflections..."
                                    className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white leading-relaxed resize-none focus:outline-none focus:border-white/40 placeholder:text-zinc-600"
                                  />
                                  {!currentDay.isPast2359 && (
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        disabled={isSavingFeedback}
                                        onClick={() => {
                                          const val =
                                            dayEventFeedback[currentDay.id] !== undefined
                                              ? dayEventFeedback[currentDay.id]
                                              : currentDay.userProgress?.eventFeedback || "";
                                          handleSaveEventFeedback(val);
                                        }}
                                        className="px-5 py-2 rounded-full chrome-button text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm"
                                      >
                                        {isSavingFeedback ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Saving...</span>
                                          </>
                                        ) : feedbackSaved ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                                            <span>Saved</span>
                                          </>
                                        ) : (
                                          <span>Save Feedback</span>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PHASE 02: FUEL & SLEEP */}
                        {activeDetailPhase === "fuel" && (
                          <div className="space-y-5">
                            <SleepTrackerCard
                              dayNumber={currentDay.dayNumber}
                              sleepRecommendation={currentDay.sleepRecommendation || null}
                              initialBedtime={dayBedtimes[currentDay.id] || currentDay.userProgress?.bedtime || "22:30"}
                              initialWakeTime={dayWakeTimes[currentDay.id] || currentDay.userProgress?.wakeTime || "06:30"}
                              initialSleepMinutes={currentDay.userProgress?.sleepDurationMinutes}
                              isPast2359={currentDay.isPast2359}
                              onSaveSleep={handleSaveSleep}
                            />

                            <MealSection
                              mealRecommendation={currentDay.mealRecommendation}
                              initialCompliance={dayMealCompliance[currentDay.id] || currentDay.userProgress?.mealCompliance || "FULL"}
                              initialNotes={dayMealNotes[currentDay.id] !== undefined ? dayMealNotes[currentDay.id] : currentDay.userProgress?.mealNotes || ""}
                              isPast2359={currentDay.isPast2359}
                              onSaveMeal={handleSaveMeal}
                            />
                          </div>
                        )}

                        {/* PHASE 03: RECOVERY & ASSESSMENT */}
                        {activeDetailPhase === "recovery" && (
                          <div className="space-y-5">
                            {/* Daily Assessment Card */}
                            <div className="rounded-2xl p-4 sm:p-5 space-y-4 bg-zinc-900/60 border border-white/10 shadow-lg font-mono">
                              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                                    Protocol Check
                                  </span>
                                  <h3 className="text-sm sm:text-base font-light tracking-tight text-white uppercase font-geometric">
                                    Daily Assessment
                                  </h3>
                                </div>
                                <span className="text-[10px] px-3 py-1 rounded-full uppercase tracking-wider font-semibold bg-white/10 border border-white/15 text-white">
                                  Day {currentDay.dayNumber}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                                  Assessment Focus
                                </span>
                                <p className="text-xs text-zinc-300 font-light leading-relaxed p-3.5 rounded-xl bg-black/40 border border-white/10">
                                  {currentDay.dailyAssessment ||
                                    "Evaluate neuromuscular fatigue, joint comfort, and physical readiness for upcoming movement."}
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                                  Your Assessment Response
                                </label>
                                <textarea
                                  rows={3}
                                  disabled={currentDay.isPast2359}
                                  value={
                                    dayAssessments[currentDay.id] !== undefined
                                      ? dayAssessments[currentDay.id]
                                      : currentDay.userProgress?.assessmentResponse || ""
                                  }
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    setDayAssessments((p) => ({ ...p, [currentDay.id]: text }));
                                  }}
                                  placeholder="Record assessment scores, sensations, or recovery observations..."
                                  className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs font-light text-white leading-relaxed resize-none focus:outline-none focus:border-white/40 placeholder:text-zinc-600 font-mono"
                                />
                              </div>

                              {!currentDay.isPast2359 && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    disabled={isSavingProgress}
                                    onClick={handleSaveAssessment}
                                    className="px-5 py-2 rounded-full chrome-button text-[11px] font-semibold tracking-wider uppercase flex items-center gap-1.5 shadow-sm font-mono"
                                  >
                                    {isSavingProgress ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />
                                        <span>Save Assessment</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Daily Reflection & Vitality Card */}
                            <DailyReflectionCard
                              dayNumber={currentDay.dayNumber}
                              initialReflection={
                                dayReflections[currentDay.id] !== undefined
                                  ? dayReflections[currentDay.id]
                                  : currentDay.userProgress?.dailyReflection || ""
                              }
                              initialHappinessRate={
                                dayHappiness[currentDay.id] ||
                                currentDay.userProgress?.happinessRate ||
                                5
                              }
                              isPast2359={currentDay.isPast2359}
                              onSaveReflection={handleSaveReflection}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Back Button */}
                <div className="pt-6 border-t border-zinc-200/60 dark:border-white/10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewingPlanDetail(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-6 py-2.5 rounded-full glass-panel-subtle text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard Overview</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: ALL PROGRAMS (SEARCH, FILTER & PAGINATION)                    */}
        {/* ===================================================================== */}
        {activeTab === "all_plan" && (() => {
          const filteredPrograms = allPrograms.filter((prog) => {
            const q = programSearch.trim().toLowerCase();
            const matchesSearch =
              !q ||
              prog.title.toLowerCase().includes(q) ||
              prog.coachName.toLowerCase().includes(q) ||
              (prog.city && prog.city.toLowerCase().includes(q)) ||
              (prog.description && prog.description.toLowerCase().includes(q));

            const matchesFormat =
              formatFilter === "ALL" ||
              (formatFilter === "ONLINE" && (!prog.locationType || prog.locationType === "ONLINE")) ||
              prog.locationType === formatFilter;

            const publicBadge = resolvePublicBadge({
              status: prog.status,
              registrationOpenDate: prog.registrationOpenDate,
              registrationDeadline: prog.registrationDeadline,
              startDate: prog.startDate,
              endDate: prog.endDate,
              maxQuota: prog.maxQuota,
              enrolledCount: prog.enrolledCount,
            }) || "Open Registration";

            const matchesAvailability =
              availabilityFilter === "ALL" ||
              (availabilityFilter === "OPEN" && publicBadge === "Open Registration") ||
              (availabilityFilter === "ACTIVE" && publicBadge === "On going") ||
              (availabilityFilter === "COMING_SOON" && publicBadge === "Coming Soon");

            return matchesSearch && matchesFormat && matchesAvailability;
          });

          const totalProgramPages = Math.max(1, Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE));
          const paginatedPrograms = filteredPrograms.slice(
            (programsPage - 1) * ITEMS_PER_PAGE,
            programsPage * ITEMS_PER_PAGE
          );

          return (
            <div className="space-y-5 sm:space-y-6 font-mono">
              {/* Header */}
              <div className="rounded-2xl p-4 sm:p-6 bg-zinc-900/60 border border-white/10 space-y-1.5 shadow-xl">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-zinc-400">
                    Curated Cohorts
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-light tracking-tight text-white uppercase font-geometric">
                  Available Programs
                </h1>
                <p className="text-xs text-zinc-400 font-light">
                  Precision longevity and movement curriculums. 35-member cohort cap.
                </p>
              </div>

              {/* Search Bar & Filter Controls */}
              <div className="rounded-2xl p-3.5 sm:p-5 bg-zinc-900/60 border border-white/10 space-y-3 shadow-lg">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={programSearch}
                    onChange={(e) => {
                      setProgramSearch(e.target.value);
                      setProgramsPage(1);
                    }}
                    placeholder="Enter keyword to search..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
                  />
                  {programSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProgramSearch("");
                        setProgramsPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs (Format & Availability) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  {/* Format Filters */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1 flex items-center gap-1 font-semibold">
                      <Filter className="w-3 h-3" /> Format:
                    </span>
                    {[
                      { id: "ALL", label: "All" },
                      { id: "ONLINE", label: "Online" },
                      { id: "ONSITE", label: "On-Site" },
                      { id: "HYBRID", label: "Hybrid" },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setFormatFilter(fmt.id as any);
                          setProgramsPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                          formatFilter === fmt.id
                            ? "bg-white text-zinc-950 shadow-sm"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>

                  {/* Status Filters */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 mr-1 font-semibold">Status:</span>
                    {[
                      { id: "ALL", label: "All" },
                      { id: "OPEN", label: "Open" },
                      { id: "ACTIVE", label: "Active" },
                      { id: "COMING_SOON", label: "Soon" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setAvailabilityFilter(st.id as any);
                          setProgramsPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                          availabilityFilter === st.id
                            ? "bg-white text-zinc-950 shadow-sm"
                            : "bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Programs Grid */}
              {paginatedPrograms.length === 0 ? (
                <div className="rounded-2xl p-8 text-center bg-zinc-900/60 border border-white/10 space-y-2">
                  <Compass className="w-6 h-6 text-zinc-500 mx-auto" />
                  <h3 className="text-sm font-semibold text-white">
                    No programs found
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto font-light">
                    Try adjusting your search or filter keywords.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramSearch("");
                      setFormatFilter("ALL");
                      setAvailabilityFilter("ALL");
                      setProgramsPage(1);
                    }}
                    className="px-4 py-1.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider mt-2"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {paginatedPrograms.map((prog, idx) => {
                    const enrolled = myPrograms.find((e) => e.programId === prog.id);
                    const isActive = enrolled?.status === "ACTIVE";
                    const isPending = enrolled?.status === "PENDING";
                    const remainingSlots = Math.max(0, prog.maxQuota - prog.enrolledCount);
                    const publicBadge = resolvePublicBadge({
                      status: prog.status,
                      registrationOpenDate: prog.registrationOpenDate,
                      registrationDeadline: prog.registrationDeadline,
                      startDate: prog.startDate,
                      endDate: prog.endDate,
                      maxQuota: prog.maxQuota,
                      enrolledCount: prog.enrolledCount,
                    }) || "Open Registration";

                    return (
                      <div
                        key={prog.id}
                        className="relative rounded-2xl overflow-hidden border border-white/15 min-h-[320px] sm:min-h-[360px] p-4 sm:p-6 flex flex-col justify-between group shadow-xl bg-zinc-950"
                      >
                        {/* Full Background Image */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <Image
                            src={prog.coverImage || (idx % 2 === 0 ? "/test.jpg" : "/pic.jpg")}
                            alt={prog.title}
                            fill
                            className="object-cover object-center brightness-[0.55] scale-100 group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none" />

                        {/* Top Badges */}
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-1.5 font-mono">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] uppercase tracking-wider font-semibold text-white">
                              {prog.dayCount} Days
                            </span>

                            {prog.locationType === "ONSITE" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-zinc-300" />
                                <span>On-Site &bull; {prog.city || "Studio"}</span>
                              </span>
                            )}

                            {prog.locationType === "HYBRID" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-zinc-300" />
                                <span>Hybrid &bull; {prog.city || "Studio"}</span>
                              </span>
                            )}

                            {(!prog.locationType || prog.locationType === "ONLINE") && (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md">
                                Online
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isActive ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-white text-zinc-950 text-[10px] uppercase tracking-wider font-bold">
                                Enrolled
                              </span>
                            ) : isPending ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-zinc-300 text-[10px] uppercase tracking-wider font-bold">
                                Pending
                              </span>
                            ) : publicBadge === "Open Registration" ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-white text-[10px] uppercase tracking-wider font-bold">
                                Open
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[10px] uppercase tracking-wider font-semibold">
                                {publicBadge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Floating Content Card */}
                        <div className="relative z-10 rounded-xl p-3.5 sm:p-4 space-y-2 text-white border border-white/15 bg-black/60 backdrop-blur-md">
                          <div className="space-y-1 font-mono">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400">
                              <span>{prog.coachName}</span>
                              <span>&bull;</span>
                              <span>Starts {formatShortDate(prog.startDate)}</span>
                            </div>

                            <h3 className="text-base sm:text-lg font-light uppercase tracking-tight text-white font-geometric">
                              {prog.title}
                            </h3>

                            <p className="text-[11px] text-zinc-300 line-clamp-1 font-light font-mono">
                              {prog.description}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-white/15 flex items-center justify-between gap-2 font-mono">
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block">Tuition</span>
                              <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                Rp {prog.price.toLocaleString("id-ID")}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailedProgram(prog)}
                                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
                                title="View Details"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProgId(prog.id);
                                    setActiveDayIndex(0);
                                    setActiveTab("my_plan");
                                    setIsViewingPlanDetail(true);
                                  }}
                                  className="px-5 py-2.5 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
                                >
                                  <span>Open Plan</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : isPending ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenQrisCheckout(prog.id)}
                                  disabled={enrollingId === prog.id}
                                  className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
                                >
                                  {enrollingId === prog.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <QrCode className="w-3.5 h-3.5" />
                                      <span>Complete Payment</span>
                                    </>
                                  )}
                                </button>
                              ) : publicBadge === "Open Registration" ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenQrisCheckout(prog.id)}
                                  disabled={enrollingId === prog.id}
                                  className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
                                >
                                  {enrollingId === prog.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <QrCode className="w-3.5 h-3.5" />
                                      <span>Join Program</span>
                                    </>
                                  )}
                                </button>
                              ) : publicBadge === "Coming Soon" ? (
                                <a
                                  href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Halo Concierge, saya ingin bergabung ke waitlist untuk program: ${prog.title}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Waitlist</span>
                                </a>
                              ) : publicBadge === "Full" ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-white/15 text-zinc-400 text-xs font-semibold tracking-wide cursor-not-allowed"
                                >
                                  <span>Cohort Full</span>
                                </button>
                              ) : publicBadge === "Close Registration" ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-semibold tracking-wide cursor-not-allowed"
                                >
                                  <span>Registration Closed</span>
                                </button>
                              ) : publicBadge === "On going" ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-white/15 text-zinc-400 text-xs font-semibold tracking-wide cursor-not-allowed"
                                >
                                  <span>In Progress</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-semibold tracking-wide cursor-not-allowed"
                                >
                                  <span>Ended</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalProgramPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200/60 dark:border-white/10 text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400 font-light">
                    Showing {Math.min((programsPage - 1) * ITEMS_PER_PAGE + 1, filteredPrograms.length)} –{" "}
                    {Math.min(programsPage * ITEMS_PER_PAGE, filteredPrograms.length)} of {filteredPrograms.length} programs
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={programsPage <= 1}
                      onClick={() => {
                        setProgramsPage((p) => Math.max(1, p - 1));
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className="px-3.5 py-1.5 rounded-xl glass-panel-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <span className="px-3.5 py-1.5 rounded-xl glass-panel text-zinc-900 dark:text-white font-semibold">
                      {programsPage} / {totalProgramPages}
                    </span>

                    <button
                      type="button"
                      disabled={programsPage >= totalProgramPages}
                      onClick={() => {
                        setProgramsPage((p) => Math.min(totalProgramPages, p + 1));
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className="px-3.5 py-1.5 rounded-xl glass-panel-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 hover:text-zinc-950 dark:hover:text-white transition"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ===================================================================== */}
        {/* TAB 3: PROFILE (STACKED MENU -> DEDICATED DETAIL VIEW)                */}
        {/* ===================================================================== */}
        {activeTab === "notifications" && (
          <div className="max-w-2xl mx-auto space-y-5 font-mono">
            {/* Header Card */}
            <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-2 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                  Cadence Sync
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 text-[10px] uppercase font-bold tracking-wider">
                  Push Active
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-light tracking-tight text-white uppercase font-geometric">
                Protocol Alerts &amp; Dispatch
              </h2>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                Scheduled circadian reminders and protocol unlocking cadences for enrolled cohorts.
              </p>
            </div>

            {/* iOS Safari Standalone Guide Banner */}
            {isIosDevice && !isStandalonePwa && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/20 text-white text-xs space-y-2.5 shadow-xl font-mono">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-white">
                  <Smartphone className="w-4 h-4 text-zinc-300" />
                  <span>Syarat Apple iOS (iPhone)</span>
                </div>
                <p className="font-light leading-relaxed text-zinc-300 text-[11px]">
                  Kebijakan resmi Apple: Notifikasi di iPhone <strong>hanya diizinkan masuk saat aplikasi ditutup</strong> jika website telah ditambahkan ke Layar Utama (*Home Screen*).
                </p>
                <div className="bg-black/60 rounded-xl p-3 text-[11px] space-y-1.5 font-mono text-zinc-300 border border-white/10">
                  <p>1. Ketuk ikon <strong className="text-white">Share</strong> (kotak panah ke atas) di bagian bawah Safari.</p>
                  <p>2. Pilih <strong className="text-white">&quot;Add to Home Screen&quot;</strong> (*Tambah ke Layar Utama*).</p>
                  <p>3. Buka ikon <strong className="text-white">+ BMS</strong> dari Home Screen, lalu tekan tombol sinkronisasi di bawah.</p>
                </div>
              </div>
            )}

            {/* Interactive Browser Push Trigger & Test Panel */}
            <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-3.5 shadow-xl font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                  Device Push Handshake
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                    notifPermission === "granted"
                      ? "bg-white text-zinc-950"
                      : "bg-white/10 text-zinc-300 border border-white/15"
                  }`}>
                    {notifPermission === "granted" ? "Permission Active" : "Action Required"}
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                    isPushSubscribed
                      ? "bg-white/20 text-white border border-white/30"
                      : "bg-white/5 text-zinc-500 border border-white/5"
                  }`}>
                    {isPushSubscribed ? "Cloud Synced" : "Unlinked"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-300 font-light leading-relaxed">
                Sync this device with the Vercel Web Push gateway (RFC 8292 / VAPID) so notifications arrive even when the browser or PWA is in the background.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {notifPermission !== "granted" || !isPushSubscribed ? (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={isSubscribingPush}
                    className="px-5 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide uppercase flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isSubscribingPush ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Radio className="w-3.5 h-3.5" />
                    )}
                    <span>{isSubscribingPush ? "Syncing Handshake..." : "Enable & Sync Web Push"}</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleTestReminder("morning")}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Clock className="w-3 h-3 text-zinc-300" />
                      <span>Test Local Awakening (07:00)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestReminder("evening")}
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Moon className="w-3 h-3 text-zinc-300" />
                      <span>Test Local Cutoff (21:30)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEnableNotifications}
                      disabled={isSubscribingPush}
                      className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 text-zinc-400 ${isSubscribingPush ? "animate-spin" : ""}`} />
                      <span>Re-sync Keypair</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Production Cloud Scheduler & Cron Dispatcher */}
            <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-3.5 shadow-xl font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                  Cloud Automation &bull; Vercel Cron
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/15 uppercase font-bold tracking-wider">
                  RFC 8292 Server-Side
                </span>
              </div>

              <p className="text-xs text-zinc-300 font-light leading-relaxed">
                Production architecture: Vercel Cron automatically calls <code className="px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[11px]">/api/cron/dispatch-notifications</code> every minute. You can also manually trigger or simulate any cohort cadence below:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleTriggerCronServer()}
                  disabled={isTriggeringCron}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  {isTriggeringCron ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Server className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                  <span>Run Current Minute Cron</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerCronServer("11:23")}
                  disabled={isTriggeringCron}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Simulate 11:23 (Prog 1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerCronServer("11:25")}
                  disabled={isTriggeringCron}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Simulate 11:25 (Prog 2)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTriggerCronServer("11:27")}
                  disabled={isTriggeringCron}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Simulate 11:27 (Prog 3)</span>
                </button>
              </div>

              {/* Server Response Terminal Viewer */}
              {cronTriggerResult && (
                <div className="mt-3 p-3.5 rounded-xl bg-black/80 border border-white/15 space-y-2 text-[11px] font-mono">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-zinc-400 uppercase tracking-widest text-[9px] font-bold">
                      Server Dispatch Output
                    </span>
                    <button
                      type="button"
                      onClick={() => setCronTriggerResult(null)}
                      className="text-zinc-400 hover:text-white text-[10px] uppercase font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 scrollbar-thin">
                    {JSON.stringify(cronTriggerResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Daily Dispatch Cadence Schedule */}
            <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-3 shadow-xl">
              <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                Standard Cadence
              </span>
              <div className="space-y-2">
                {[
                  { time: "07:00 WIB", label: "Awakening & Sleep Log", desc: "Morning rest logging and circadian alignment" },
                  { time: "12:00 WIB", label: "Daily Movement Unlock", desc: "Access daily training sequence and meal protocol" },
                  { time: "21:30 WIB", label: "Evening Reflection & Assessment", desc: "Log vitality score and daily self-assessment" },
                  { time: "23:59 WIB", label: "Protocol Day Cutoff", desc: "Deadline to complete daily curriculum tasks" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-medium">{item.label}</strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-zinc-300 font-mono">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-light">{item.desc}</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-white shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Program Specific Notification History / Logs */}
            <div className="rounded-2xl p-5 bg-zinc-900/60 border border-white/10 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                  Cohort Dispatch Log &amp; Real-Time Triggers
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Auto-Dispatches at Scheduled Minute
                </span>
              </div>
              {myEnrolledPrograms.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3 text-center">No enrolled programs for alert dispatch.</p>
              ) : (
                <div className="space-y-2">
                  {myEnrolledPrograms.flatMap((prog) =>
                    prog.days.flatMap((day) =>
                      (day.dayNotifications && day.dayNotifications.length > 0
                        ? day.dayNotifications.map((notif, nIdx) => ({
                            id: `${prog.id}-${day.id}-${nIdx}`,
                            programTitle: prog.title,
                            dayNumber: day.dayNumber,
                            time: notif.time,
                            message: notif.message,
                            isPast: day.isPast2359,
                          }))
                        : [
                            {
                              id: `${prog.id}-${day.id}-0`,
                              programTitle: prog.title,
                              dayNumber: day.dayNumber,
                              time: "07:00 WIB",
                              message: `Day ${day.dayNumber} awakening and recovery protocol is ready.`,
                              isPast: day.isPast2359,
                            },
                          ]
                      )
                    )
                  ).slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-wider truncate">
                            {item.programTitle} &bull; Day {item.dayNumber}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 text-white font-mono font-bold shrink-0">
                            {item.time} WIB
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 font-light leading-relaxed">{item.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFireSpecificNotification(item.programTitle, item.time, item.message)}
                          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold uppercase tracking-wider transition active:scale-95 flex items-center gap-1"
                          title="Simulasikan notifikasi ini sekarang"
                        >
                          <Bell className="w-3 h-3 text-zinc-300" />
                          <span>Test Fire</span>
                        </button>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                          dispatchedCadenceKeys[item.id]
                            ? "bg-white text-zinc-950 font-bold"
                            : item.isPast
                            ? "bg-white/5 text-zinc-500 border border-white/5"
                            : "bg-white/10 text-white border border-white/15"
                        }`}>
                          {dispatchedCadenceKeys[item.id] ? "Dispatched" : "Scheduled"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2 font-geometric">
                        <Bell className="w-4 h-4 text-zinc-400" />
                        <span>Daily Reminder Schedule</span>
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                        Synchronize reminders for your morning practice and evening 23:59 checklist cutoff.
                      </p>
                    </div>
                    <span className="text-micro uppercase tracking-[0.18em] font-semibold px-3 py-1 rounded-full glass-panel-subtle shrink-0 text-zinc-700 dark:text-zinc-300">
                      {notifPermission === "granted" ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Morning Routine
                      </label>
                      <input
                        type="time"
                        value={morningTime}
                        onChange={(e) => setMorningTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                        Evening Cutoff (23:59)
                      </label>
                      <input
                        type="time"
                        value={eveningTime}
                        onChange={(e) => setEveningTime(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleEnableNotifications}
                      className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide shadow-sm"
                    >
                      {notifPermission === "granted"
                        ? "Save Schedule"
                        : "Enable Notifications"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestReminder("morning")}
                      className="px-5 py-2.5 rounded-full glass-panel-subtle text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      Test Morning Alert
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestReminder("evening")}
                      className="px-5 py-2.5 rounded-full glass-panel-subtle text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
                    >
                      Test Evening Alert
                    </button>
                  </div>

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

      {/* Program Detail Explanation Modal */}
      {detailedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/55 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200 text-xs">
          <div className="w-full max-w-xl glass-panel rounded-3xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl border border-white/70 dark:border-white/10">
            {/* Modal Header with Full Background Image Header */}
            <div className="relative h-44 w-full bg-zinc-900 overflow-hidden shrink-0">
              <Image
                src={detailedProgram.coverImage || "/image.jpg"}
                alt={detailedProgram.title}
                fill
                className="object-cover scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <button
                type="button"
                onClick={() => setDetailedProgram(null)}
                className="absolute top-4 right-4 p-2 rounded-full glass-image-overlay text-white hover:bg-white/20 transition z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
                <span className="px-2.5 py-0.5 rounded-full glass-image-overlay text-[10px] font-semibold uppercase tracking-wider">
                  {detailedProgram.dayCount} Days Program
                </span>
                <h3 className="text-lg font-bold tracking-tight">
                  {detailedProgram.title}
                </h3>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                  Curriculum Overview
                </span>
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                  {detailedProgram.description}
                </p>
                {detailedProgram.recommendedFor && (
                  <div className="p-4 rounded-2xl glass-panel-subtle text-xs">
                    <span className="text-micro uppercase tracking-wider font-semibold text-zinc-900 dark:text-white block mb-1">
                      Recommended For:
                    </span>
                    <span className="text-zinc-600 dark:text-zinc-300 font-light">
                      {detailedProgram.recommendedFor}
                    </span>
                  </div>
                )}
              </div>

              {/* Program Schedule Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl glass-panel-subtle space-y-1">
                  <span className="text-micro uppercase tracking-wider text-zinc-400 block">
                    Coach / Coaches
                  </span>
                  <strong className="font-medium text-zinc-900 dark:text-white">
                    {detailedProgram.coachName}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl glass-panel-subtle space-y-1">
                  <span className="text-micro uppercase tracking-wider text-zinc-400 block">
                    Tuition Fee
                  </span>
                  <strong className="font-light text-zinc-900 dark:text-white">
                    Rp {detailedProgram.price.toLocaleString("id-ID")}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl glass-panel-subtle space-y-1">
                  <span className="text-micro uppercase tracking-wider text-zinc-400 block">
                    Start Date
                  </span>
                  <strong className="font-medium text-zinc-900 dark:text-white">
                    {new Date(detailedProgram.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </strong>
                </div>

                <div className="p-4 rounded-2xl glass-panel-subtle space-y-1">
                  <span className="text-micro uppercase tracking-wider text-zinc-400 block">
                    Seats Availability
                  </span>
                  <strong className="font-medium text-zinc-900 dark:text-white">
                    {Math.max(0, detailedProgram.maxQuota - detailedProgram.enrolledCount)} of {detailedProgram.maxQuota} Spots Open
                  </strong>
                </div>
              </div>

              {/* Program Blueprint: Target State, Methodology, Benefits, References & Guidelines */}
              {detailedProgram.targetState && (
                <div className="space-y-2">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Target Physical, Mental &amp; Mind Condition
                  </span>
                  <div className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                    {detailedProgram.targetState}
                  </div>
                </div>
              )}

              {detailedProgram.methodology && (
                <div className="space-y-2">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Objectives &amp; Methodology
                  </span>
                  <div className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                    {detailedProgram.methodology}
                  </div>
                </div>
              )}

              {detailedProgram.expectedBenefits && detailedProgram.expectedBenefits.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Expected Benefits &amp; Tangible Outcomes ({detailedProgram.expectedBenefits.length})
                  </span>
                  <div className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10">
                    <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-light">
                      {detailedProgram.expectedBenefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {detailedProgram.scientificReferences && detailedProgram.scientificReferences.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Scientific References &amp; Clinical Basis ({detailedProgram.scientificReferences.length})
                  </span>
                  <div className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10 font-mono">
                    <ol className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300 list-decimal list-inside leading-relaxed font-light">
                      {detailedProgram.scientificReferences.map((ref, idx) => (
                        <li key={idx} className="leading-snug">
                          <span>{ref.title}</span>
                          {ref.url && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 ml-2 text-zinc-900 dark:text-white underline hover:opacity-80"
                            >
                              <span>Source</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {detailedProgram.programGuidelines && detailedProgram.programGuidelines.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Program Guidelines &amp; Daily Principles ({detailedProgram.programGuidelines.length})
                  </span>
                  <div className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10">
                    <ol className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300 list-decimal list-inside leading-relaxed font-light">
                      {detailedProgram.programGuidelines.map((guide, idx) => (
                        <li key={idx} className="leading-snug">
                          {guide}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* What Happens Daily */}
              <div className="space-y-3">
                <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                  Daily Protocol Cadence
                </span>
                <div className="space-y-2.5 font-mono">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl glass-panel-subtle text-xs">
                    <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-zinc-900 dark:text-white block font-mono">
                        00:00 Morning Session Unlock
                      </strong>
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs font-light font-mono">
                        New workout video & anti-inflammatory meal guide ready each day.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl glass-panel-subtle text-xs">
                    <CheckCircle className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold text-zinc-900 dark:text-white block font-mono">
                        23:59 Daily Streak Cutoff
                      </strong>
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs font-light font-mono">
                        Mark your video watched and checklist complete before midnight.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Program Terms & Conditions (Chapters & Sub-bab Clauses) */}
              {(() => {
                const chapters =
                  detailedProgram.termsChapters && detailedProgram.termsChapters.length > 0
                    ? detailedProgram.termsChapters
                    : parseTermsChapters(detailedProgram.customTerms);
                const hasValidChapters = chapters.some(
                  (c) => c.chapter.trim() || c.clauses.some((cl) => cl.trim())
                );
                if (!hasValidChapters) return null;

                return (
                  <div className="space-y-3">
                    <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Program Terms &amp; Conditions ({chapters.length} {chapters.length === 1 ? "Chapter" : "Chapters"})
                    </span>
                    <div className="space-y-3">
                      {chapters.map((ch, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-4 rounded-2xl glass-panel-subtle border border-zinc-200/60 dark:border-white/10 space-y-2.5 font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                              Bab {cIdx + 1}
                            </span>
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">
                              {ch.chapter || `Chapter ${cIdx + 1}`}
                            </h4>
                          </div>
                          <ol className="space-y-1.5 pl-0.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-light">
                            {ch.clauses.map((clause, clIdx) => (
                              <li key={clIdx} className="flex items-start gap-2">
                                <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0 select-none">
                                  {cIdx + 1}.{clIdx + 1}
                                </span>
                                <span className="leading-snug">{clause}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-zinc-200/60 dark:border-white/10 flex items-center justify-between gap-3 bg-white/40 dark:bg-white/[0.02] font-mono">
              <button
                type="button"
                onClick={() => setDetailedProgram(null)}
                className="px-5 py-2.5 rounded-full glass-panel-subtle text-xs font-medium text-zinc-700 dark:text-zinc-300 font-mono"
              >
                Close
              </button>

              {(() => {
                const enrolled = myPrograms.find((e) => e.programId === detailedProgram.id);
                const isActive = enrolled?.status === "ACTIVE";
                const isPending = enrolled?.status === "PENDING";
                const publicBadge = resolvePublicBadge({
                  status: detailedProgram.status,
                  registrationOpenDate: detailedProgram.registrationOpenDate,
                  registrationDeadline: detailedProgram.registrationDeadline,
                  startDate: detailedProgram.startDate,
                  endDate: detailedProgram.endDate,
                  maxQuota: detailedProgram.maxQuota,
                  enrolledCount: detailedProgram.enrolledCount,
                }) || "Open Registration";

                if (isActive) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProgId(detailedProgram.id);
                        setActiveDayIndex(0);
                        setActiveTab("my_plan");
                        setIsViewingPlanDetail(true);
                        setDetailedProgram(null);
                      }}
                      className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2"
                    >
                      Open Daily Plan <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  );
                }

                if (isPending) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const progId = detailedProgram.id;
                        setDetailedProgram(null);
                        handleOpenQrisCheckout(progId);
                      }}
                      className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold tracking-wide flex items-center gap-2"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Complete Payment
                    </button>
                  );
                }

                if (publicBadge === "Coming Soon") {
                  return (
                    <a
                      href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Halo Concierge, saya ingin bergabung ke waitlist untuk program: ${detailedProgram.title}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2 transition font-mono shadow-md"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400" /> Join Waitlist
                    </a>
                  );
                }

                if (publicBadge === "Open Registration") {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const progId = detailedProgram.id;
                        setDetailedProgram(null);
                        handleOpenQrisCheckout(progId);
                      }}
                      className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Enroll Now (Rp {detailedProgram.price.toLocaleString("id-ID")})
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400 text-xs font-semibold tracking-wide cursor-not-allowed"
                  >
                    Registration Closed ({publicBadge})
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
