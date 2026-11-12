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
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ my_plan: true });

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);
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

  const isCohortEnded = (startDate?: string | Date | null, endDate?: string | Date | null, dayCount?: number) => {
    const n = new Date();
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return n.getTime() > end.getTime();
    }
    if (startDate && dayCount) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + dayCount);
      end.setHours(23, 59, 59, 999);
      return n.getTime() > end.getTime();
    }
    return false;
  };

  const isCohortUpcoming = (startDate?: string | Date | null) => {
    if (!startDate) return false;
    const n = new Date();
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return n.getTime() < start.getTime();
  };

  const allActiveEnrollments = myPrograms.filter((e) => e.status === "ACTIVE");
  const ongoingOrUpcomingEnrollment = allActiveEnrollments.find(
    (e) => !isCohortEnded(e.startDate, e.endDate, e.dayCount)
  );
  const defaultProgramId = ongoingOrUpcomingEnrollment?.programId || allActiveEnrollments[0]?.programId || "";
  const [selectedProgId, setSelectedProgId] = useState<string>(defaultProgramId);

  const initialProg =
    myEnrolledPrograms.find((p) => p.id === defaultProgramId) ||
    myEnrolledPrograms.find((p) => !isCohortEnded(p.startDate, p.endDate, p.dayCount)) ||
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

  const handleSelectWorkout = async (workout: string, dayId?: string, resetChecklist?: boolean): Promise<boolean> => {
    const currentDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!currentDay) return false;
    setDayWorkouts((prev) => ({ ...prev, [currentDay.id]: workout }));
    const nextChecklist = resetChecklist ? [] : getCheckedItems(currentDay);
    if (resetChecklist) {
      setDayChecklists((prev) => ({ ...prev, [currentDay.id]: [] }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: currentDay.id,
      isCompleted: !!currentDay.userProgress?.isCompleted,
      checklistCompleted: nextChecklist,
      videoWatched: getVideoWatched(currentDay),
      selectedWorkout: workout,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to select workout." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    // Optimistic client state is already updated; do NOT call router.refresh() here to prevent full-screen loading splash
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

  const handleCompleteProgramDay = async (dayId: string): Promise<boolean> => {
    const target = currentProgram?.days.find((d) => d.id === dayId);
    if (!target) return false;
    const res = await wellnessUserSubmitDayProgress({
      programDayId: target.id,
      isCompleted: true,
      checklistCompleted: getCheckedItems(target),
      videoWatched: getVideoWatched(target),
    });
    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Could not complete the day." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: `Day ${target.dayNumber} completed.` });
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

  // Separate completed/ended cohorts from active/upcoming cohorts
  const completedEnrollments = allActiveEnrollments.filter((e) =>
    isCohortEnded(e.startDate, e.endDate, e.dayCount)
  );

  // My Plan tab: strictly contains active ongoing or upcoming programs (completed are archived in History)
  const activeEnrollments = allActiveEnrollments.filter(
    (e) => !isCohortEnded(e.startDate, e.endDate, e.dayCount)
  );
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
    <div className="min-h-screen flex flex-col relative overflow-x-hidden font-sans bg-[#f6f6f4] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
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
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md h-12 rounded-full px-2 flex items-center justify-between gap-1 border border-zinc-200 dark:border-white/15 bg-white/80 dark:bg-neutral-950/85 backdrop-blur-2xl shadow-xl font-mono"
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
            aria-label={label}
            title={label}
            aria-current={activeTab === key ? "page" : undefined}
            onClick={() => {
              setActiveTab(key);
              setIsViewingPlanDetail(false);
              window.scrollTo({ top: 0 });
            }}
            className={`flex-1 h-9 rounded-full transition flex items-center justify-center ${
              activeTab === key
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </nav>

      {/* Main Content Area with safe-area spacing */}
      <main
        style={{ paddingTop: "max(6rem, calc(4.75rem + env(safe-area-inset-top)))" }}
        className="max-w-5xl mx-auto px-4 sm:px-8 pb-32 sm:pb-36 flex-1 w-full"
      >
        {actionNotice && (
          <div
            className={`mb-4 glass-panel p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in border shadow-sm font-mono ${
              actionNotice.type === "error"
                ? "border-red-500/30 text-red-700 dark:text-red-300"
                : "border-zinc-300 dark:border-white/25 text-zinc-900 dark:text-white"
            }`}
          >
            {actionNotice.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-zinc-800 dark:text-zinc-200 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        )}

        <div className={activeTab === "my_plan" ? "block" : "hidden"} hidden={activeTab !== "my_plan"}>
          <MyPlanOverview
            program={
              overviewEnrollment && currentProgram
                ? {
                    title: currentProgram.title,
                    coachName: currentProgram.coachName,
                    coachTitle: currentProgram.coachTitle,
                    category: currentProgram.category,
                    difficultyLevel: currentProgram.difficultyLevel,
                    description: currentProgram.description,
                    locationType: currentProgram.locationType,
                    city: currentProgram.city,
                    venueAddress: currentProgram.venueAddress,
                    equipment: currentProgram.equipment,
                    durationDays: currentProgram.durationDays,
                    coverImage: currentProgram.coverImage || overviewEnrollment.coverImage || null,
                    startDate: overviewEnrollment.startDate,
                    endDate: overviewEnrollment.endDate,
                    communityLink: overviewEnrollment.communityLink,
                    scientificReferences: currentProgram.scientificReferences || [],
                    totalDays: currentProgram.days.length || currentProgram.durationDays || 0,
                    isUpcoming: isCohortUpcoming(overviewEnrollment.startDate || currentProgram.startDate),
                    targetState: currentProgram.targetState || null,
                    methodology: currentProgram.methodology || null,
                    expectedBenefits: currentProgram.expectedBenefits || [],
                    programGuidelines: currentProgram.programGuidelines || [],
                    recommendedFor: currentProgram.recommendedFor || null,
                    audience: currentProgram.audience || null,
                    dailyCommitment: currentProgram.dailyCommitment || null,
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
            allProgramDays={(currentProgram?.days || []).map(overlayDay)}
            checklist={currentDay ? dayChecklists[currentDay.id] : undefined}
            onSelectWorkout={handleSelectWorkout}
            onOpenVideo={handleOpenVideo}
            onExplore={() => {
              setActiveTab("all_plan");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onViewHistory={() => {
              setActiveTab("notifications");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onToggleCheck={handleToggleChecklist}
            onSaveSleep={handleSaveSleep}
            onSaveMeal={handleSaveMeal}
            onSaveReflection={handleSaveReflection}
            onSaveAttendance={handleSaveEventFeedback}
            onCompleteDay={handleCompleteProgramDay}
          />
        </div>

        {/* TAB 2: EXPLORE PLAN (kept alive once visited) */}
        {(visitedTabs.all_plan || activeTab === "all_plan") && (
          <div className={activeTab === "all_plan" ? "block" : "hidden"} hidden={activeTab !== "all_plan"}>
            <ExplorePlanTab
              headerVisible={isHeaderVisible}
              isActive={activeTab === "all_plan"}
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
          </div>
        )}

        {/* TAB 3: NOTIFICATION & HISTORY (kept alive once visited) */}
        {(visitedTabs.notifications || activeTab === "notifications") && (
          <div className={activeTab === "notifications" ? "block" : "hidden"} hidden={activeTab !== "notifications"}>
            <NotificationsHistoryTab
              headerVisible={isHeaderVisible}
              isActive={activeTab === "notifications"}
              completedPrograms={completedEnrollments.map((e) => ({
                programId: e.programId,
                title: e.title,
                coachName: e.coachName,
                coverImage: e.coverImage,
                startDate: e.startDate,
                endDate: e.endDate,
                dayCount: e.dayCount,
              }))}
              onOpenProgramDetail={(progId) => {
                const prog = allPrograms.find((p) => p.id === progId);
                if (prog) setDetailedProgram(prog);
              }}
            />
          </div>
        )}

        {/* TAB 4: PROFILE & SETTINGS (kept alive once visited) */}
        {(visitedTabs.profile || activeTab === "profile") && (
          <div className={activeTab === "profile" ? "block" : "hidden"} hidden={activeTab !== "profile"}>
            <ProfileTab
              user={user}
              health={healthProfile}
              headerVisible={isHeaderVisible}
              onLogout={handleSignOut}
              onDeleteAccount={() => setDeleteModalOpen(true)}
            />
          </div>
        )}
      </main>
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
                  aria-label={peekDeletePass ? "Hide password" : "Show password"}
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
          hideHeaderAction={activeTab === "all_plan"}
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
