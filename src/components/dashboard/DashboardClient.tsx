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
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"my_plan" | "all_plan" | "profile">("my_plan");
  const [isViewingPlanDetail, setIsViewingPlanDetail] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState<"personal" | "medical" | "payments" | "account">("personal");

  // Explore (All Programs) Search, Filter, Pagination States
  const [programSearch, setProgramSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<"ALL" | "ONLINE" | "ONSITE" | "HYBRID">("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState<"ALL" | "OPEN" | "ACTIVE" | "COMING_SOON">("ALL");
  const [programsPage, setProgramsPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  // Filter ONLY programs the user has enrolled in
  const enrolledProgramIds = new Set(myPrograms.map((e) => e.programId));
  const myEnrolledPrograms = allPrograms.filter((p) => enrolledProgramIds.has(p.id));

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

  const handleEnableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setActionNotice({
        type: "error",
        text: "Browser notifications are not supported on this device.",
      });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      new Notification("Wellness Reminders Enabled", {
        body: `Morning workout (${morningTime}) & evening checklist (${eveningTime}) reminders are active.`,
        icon: "/image.jpg",
      });
      setActionNotice({
        type: "success",
        text: "Daily reminder notifications enabled.",
      });
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleTestReminder = (type: "morning" | "evening") => {
    const msg =
      type === "morning"
        ? currentDay?.pendingReminder ||
          "Good morning! Today's workout video and meal guide are ready."
        : "Evening Reminder: Complete your workout video and daily checklist before 23:59.";

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification(
        type === "morning" ? "Morning Workout Reminder" : "Evening Checklist Reminder",
        { body: msg, icon: "/image.jpg" }
      );
    }
    setActionNotice({ type: "success", text: msg });
    setTimeout(() => setActionNotice(null), 4500);
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
    <div className="min-h-screen text-zinc-900 dark:text-zinc-100 flex flex-col relative overflow-x-hidden silver-mint-canvas font-mono">
      {/* Top Floating Glassmorphic Navigation Dock */}
      <header
        style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-5xl h-14 px-5 sm:px-6 rounded-full blur-dock flex items-center justify-between border border-zinc-200/70 dark:border-white/15 shadow-xl transition-all duration-300 font-mono"
      >
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="w-2 h-2 rounded-full bg-gradient-to-tr from-zinc-300 via-white to-zinc-500 shadow-sm border border-white/60 group-hover:scale-125 transition-transform" />
          <span className="font-extralight text-xs uppercase tracking-[0.34em] text-zinc-900 dark:text-white font-geometric">
            BMS
          </span>
        </Link>

        {/* Desktop Navigation (3 Menus: My Program, Explore, Profile) */}
        <nav className="hidden sm:flex items-center gap-1.5 shrink-0 text-xs font-mono font-medium">
          <button
            onClick={() => {
              setActiveTab("my_plan");
              setIsViewingPlanDetail(false);
            }}
            className={`px-4 py-1.5 rounded-full text-xs transition duration-200 flex items-center gap-2 ${
              activeTab === "my_plan"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Program</span>
          </button>
          <button
            onClick={() => setActiveTab("all_plan")}
            className={`px-4 py-1.5 rounded-full text-xs transition duration-200 flex items-center gap-2 ${
              activeTab === "all_plan"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-1.5 rounded-full text-xs transition duration-200 flex items-center gap-2 ${
              activeTab === "profile"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <ThemeToggle />

          {user.role === "SUPERADMIN" && (
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-full glass-panel-subtle text-[11px] font-medium text-zinc-900 dark:text-zinc-100 hover:bg-white/60 dark:hover:bg-white/10 transition inline-flex items-center gap-1.5 font-mono"
              title="Admin Console"
            >
              <Shield className="w-3 h-3 text-zinc-300" />
              <span className="hidden md:inline">Admin</span>
            </Link>
          )}

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Mobile-First Bottom Floating Dock (sm:hidden) */}
      <nav
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 sm:hidden w-[92%] max-w-sm h-14 rounded-full blur-dock px-3 flex items-center justify-around border border-zinc-200/70 dark:border-white/15 shadow-2xl font-mono"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("my_plan");
            setIsViewingPlanDetail(false);
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "my_plan"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-[11px]">My Program</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all_plan")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "all_plan"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="text-[11px]">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === "profile"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="text-[11px]">Profile</span>
        </button>
      </nav>

      {/* Main Content Area with Generous Luxury Negative Space */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-28 sm:pt-36 pb-36 sm:pb-32 flex-1 w-full space-y-10 sm:space-y-14">
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
              /* VIEW 1: DASHBOARD VIEW (Metrics & My Plan Hero Card) */
              <div className="space-y-8 sm:space-y-10 font-mono">
                {/* Header Welcome Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500">
                        Member Dashboard
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extralight tracking-tight text-zinc-900 dark:text-white font-geometric">
                      Welcome back, <span className="font-normal">{user.fullName.split(" ")[0]}</span>
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                      Today is {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  {myEnrolledPrograms.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      <span className="text-micro font-semibold text-zinc-400 shrink-0 uppercase tracking-wider">
                        Program:
                      </span>
                      {myEnrolledPrograms.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProgId(p.id);
                            setActiveDayIndex(0);
                          }}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                            p.id === currentProgram.id
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                              : "glass-panel-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4-Box Metrics Bento Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 font-mono">
                  {/* Metric 1: Consistency */}
                  <div className="glass-panel p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-zinc-200/70 dark:border-white/10 shadow-sm">
                    <span className="text-micro text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                      Consistency
                    </span>
                    <div className="my-2">
                      <p className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 dark:text-white">
                        {completedDaysCount}
                        <span className="text-xs text-zinc-400 ml-1">/ {totalDays} Days</span>
                      </p>
                    </div>
                    <span className="text-micro text-zinc-600 dark:text-zinc-300 font-medium">
                      {totalDays > 0 ? Math.round((completedDaysCount / totalDays) * 100) : 0}% Protocol Done
                    </span>
                  </div>

                  {/* Metric 2: Today's Status */}
                  <div className="glass-panel p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-zinc-200/70 dark:border-white/10 shadow-sm">
                    <span className="text-micro text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                      Today&apos;s Protocol
                    </span>
                    <div className="my-2 flex items-center gap-2">
                      {currentActiveCalendarDay?.userProgress?.isCompleted ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <span className="text-sm sm:text-base font-semibold text-emerald-600 dark:text-emerald-400">
                            Completed
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-5 h-5 text-amber-500" />
                          <span className="text-sm sm:text-base font-semibold text-amber-600 dark:text-amber-400">
                            In Progress
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-micro text-zinc-500">
                      23:59 WIB Cutoff
                    </span>
                  </div>

                  {/* Metric 3: Current Day */}
                  <div className="glass-panel p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-zinc-200/70 dark:border-white/10 shadow-sm">
                    <span className="text-micro text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                      Current Day
                    </span>
                    <div className="my-2">
                      <p className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 dark:text-white">
                        Day {currentActiveCalendarDay?.dayNumber || 1}
                        <span className="text-xs font-light text-zinc-400 ml-1">/ {totalDays}</span>
                      </p>
                    </div>
                    <span className="text-micro text-zinc-400">
                      00:00 Daily Unlock
                    </span>
                  </div>

                  {/* Metric 4: Health Baseline */}
                  <div className="glass-panel p-5 sm:p-6 rounded-3xl flex flex-col justify-between border border-zinc-200/70 dark:border-white/10 shadow-sm">
                    <span className="text-micro text-zinc-400 block tracking-[0.2em] uppercase font-semibold">
                      Health Baseline
                    </span>
                    <div className="my-2">
                      <p className="text-xl sm:text-2xl font-light tracking-tight text-zinc-900 dark:text-white">
                        {healthProfile.weightKg && healthProfile.heightCm
                          ? `BMI ${(healthProfile.weightKg / Math.pow(healthProfile.heightCm / 100, 2)).toFixed(1)}`
                          : healthProfile.weightKg
                          ? `${healthProfile.weightKg} kg`
                          : "Baseline Set"}
                      </p>
                    </div>
                    <span className="text-micro text-zinc-600 dark:text-zinc-400 truncate">
                      {healthProfile.dietType || "Omnivore"}
                    </span>
                  </div>
                </div>

                {/* My Plan Hero Card (Click to open Plan Detail) */}
                <div className="relative rounded-3xl overflow-hidden glass-panel border border-zinc-200/70 dark:border-white/10 p-7 sm:p-10 flex flex-col justify-between group shadow-2xl min-h-[380px] font-mono">
                  {/* Full Background Cover Image */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <Image
                      src={currentProgram.coverImage || "/test.jpg"}
                      alt={currentProgram.title}
                      fill
                      className="object-cover object-center scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/35 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-micro px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/25 uppercase tracking-[0.2em] font-semibold text-white">
                        My Plan
                      </span>
                      {hasActiveAccess ? (
                        <span className="text-micro px-3 py-1 rounded-full chrome-badge text-white uppercase tracking-wider font-semibold">
                          Active Access
                        </span>
                      ) : (
                        <span className="text-micro px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40 backdrop-blur-md uppercase tracking-wider font-semibold">
                          Tuition Pending
                        </span>
                      )}
                      {currentProgram.locationType === "ONSITE" && (
                        <span className="text-micro px-3 py-1 rounded-full bg-white/15 text-zinc-200 border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-300" />
                          <span>On-Site • {currentProgram.city || "Studio"}</span>
                        </span>
                      )}
                      {currentProgram.locationType === "HYBRID" && (
                        <span className="text-micro px-3 py-1 rounded-full bg-white/15 text-zinc-200 border border-white/20 backdrop-blur-md flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-zinc-300" />
                          <span>Hybrid • {currentProgram.city || "Studio"}</span>
                        </span>
                      )}
                      {(!currentProgram.locationType || currentProgram.locationType === "ONLINE") && (
                        <span className="text-micro px-3 py-1 rounded-full bg-white/15 text-zinc-200 border border-white/20 backdrop-blur-md">
                          Online Sanctuary
                        </span>
                      )}
                      <span className="text-micro px-3 py-1 rounded-full bg-white/15 text-zinc-200 border border-white/20 backdrop-blur-md">
                        {currentProgram.dayCount} Days
                      </span>
                    </div>

                    {currentProgram.communityLink && hasActiveAccess && (
                      <a
                        href={currentProgram.communityLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-micro flex items-center gap-1.5 transition"
                      >
                        <span>Sanctuary Circle</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    )}
                  </div>

                  {/* Center Content */}
                  <div className="relative z-10 space-y-3 py-8 text-white">
                    <span className="text-micro text-zinc-300 block tracking-[0.24em] uppercase font-semibold">
                      Current Active Program
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight font-geometric">
                      {currentProgram.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-light">
                      {currentProgram.coachName && (
                        <span>Lead Coach: <strong className="font-normal text-white">{currentProgram.coachName}</strong></span>
                      )}
                      <span>•</span>
                      <span>{formatShortDate(currentProgram.startDate)} – {formatShortDate(currentProgram.endDate)}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 max-w-xl text-xs text-zinc-200 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-zinc-300 shrink-0" />
                      <span>
                        <strong>Today&apos;s Focus:</strong> Day {currentActiveCalendarDay?.dayNumber || 1} &bull; {currentActiveCalendarDay?.title || "Movement & Longevity"}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Area */}
                  <div className="relative z-10 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-4">
                    {!hasActiveAccess ? (
                      <button
                        type="button"
                        onClick={() => handleOpenQrisCheckout(currentProgram.id)}
                        disabled={enrollingId === currentProgram.id}
                        className="px-6 py-3 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold tracking-wide flex items-center gap-2 shadow-xl transition"
                      >
                        {enrollingId === currentProgram.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" /> Complete QRIS Payment
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const todayIdx = currentProgram.days.findIndex(
                            (d) => d.isCalendarUnlocked && !d.isPast2359
                          );
                          if (todayIdx >= 0) setActiveDayIndex(todayIdx);
                          setIsViewingPlanDetail(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="px-7 py-3 rounded-full chrome-button text-xs font-bold tracking-wide flex items-center gap-2.5 shadow-2xl transition hover:scale-[1.02]"
                      >
                        <span>View Plan Detail</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    <span className="text-[11px] text-zinc-300 font-light">
                      Tap to open today&apos;s workout video, meal protocol, and daily reflection &rarr;
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* VIEW 2: PLAN DETAIL (Hari ini apa saja gitu) */
              <div className="space-y-8 font-mono">
                {/* Top Navigation Bar with Back Button */}
                <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-white/10 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsViewingPlanDetail(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-4 py-2 rounded-full glass-panel-subtle text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white transition flex items-center gap-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Dashboard</span>
                  </button>

                  <div className="text-right">
                    <span className="text-micro text-zinc-400 uppercase tracking-wider block">
                      {currentProgram.title}
                    </span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Day {currentDay?.dayNumber || 1} of {totalDays}
                    </span>
                  </div>
                </div>

                {/* Day Selector Timeline */}
                <div className="glass-panel p-6 sm:p-7 rounded-3xl space-y-4 border border-zinc-200/70 dark:border-white/10 shadow-xl font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-900/[0.06] dark:border-white/10 pb-4">
                    <div className="space-y-0.5">
                      <span className="text-micro text-zinc-500 dark:text-zinc-400 block tracking-[0.24em] uppercase font-mono">
                        Curriculum Track
                      </span>
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
                        Daily Schedule
                      </h3>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-light font-mono">
                      23:59 Daily Streak Cutoff
                    </span>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none font-mono">
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
                          className={`min-w-[120px] p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between shrink-0 gap-3 font-mono ${
                            isSelected
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border-transparent shadow-xl scale-[1.02]"
                              : isCompleted
                              ? "glass-panel-subtle border-white/30 text-zinc-700 dark:text-zinc-200"
                              : isSkipped
                              ? "glass-panel-subtle border-zinc-300 dark:border-white/10 text-zinc-500 opacity-60"
                              : isLockedFuture
                              ? "glass-panel-subtle border-zinc-200/40 dark:border-white/5 text-zinc-400 opacity-60"
                              : "glass-panel-subtle border-zinc-200/60 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-micro uppercase tracking-wider font-semibold">
                              Day {day.dayNumber}
                            </span>
                            {isCompleted ? (
                              <CheckCircle className={`w-3.5 h-3.5 ${isSelected ? "text-white dark:text-zinc-950" : "text-zinc-200"}`} />
                            ) : isSkipped ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                            ) : isLockedFuture ? (
                              <Lock className="w-3.5 h-3.5 opacity-60" />
                            ) : (
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : isToday ? "bg-white animate-pulse" : "bg-zinc-400"}`} />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[11px] block truncate font-medium">
                              {day.dayType === "TRAINING_DAY"
                                ? "Training"
                                : day.dayType === "REST_DAY"
                                ? "Recovery"
                                : "Connection"}
                            </span>
                            <span className="text-[10px] opacity-70 block font-light">
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
                  <div className="space-y-6 sm:space-y-8">
                    {/* Day Title Banner */}
                    <div className="glass-panel rounded-3xl p-7 sm:p-9 border border-zinc-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500">
                            Day {currentDay.dayNumber} &bull; {formatShortDate(currentDay.unlockDate)}
                          </span>
                          <span className="text-micro uppercase tracking-[0.18em] font-semibold px-3 py-1 rounded-full glass-panel-subtle text-zinc-700 dark:text-zinc-300">
                            {currentDay.dayType === "TRAINING_DAY"
                              ? "Training &bull; Movement Sequence"
                              : currentDay.dayType === "REST_DAY"
                              ? "Recovery &bull; Parasympathetic"
                              : "Connection &bull; Live Circle"}
                          </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 dark:text-white font-geometric">
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
                      <div className="space-y-6 sm:space-y-8">
                        {/* 1. FASE PAGI: SLEEP & RECOVERY LOG */}
                        <SleepTrackerCard
                          dayNumber={currentDay.dayNumber}
                          sleepRecommendation={currentDay.sleepRecommendation || null}
                          initialBedtime={dayBedtimes[currentDay.id] || currentDay.userProgress?.bedtime || "22:30"}
                          initialWakeTime={dayWakeTimes[currentDay.id] || currentDay.userProgress?.wakeTime || "06:30"}
                          initialSleepMinutes={currentDay.userProgress?.sleepDurationMinutes}
                          isPast2359={currentDay.isPast2359}
                          onSaveSleep={handleSaveSleep}
                        />

                        {/* 2. FASE SIANG: MAIN CURRICULUM PROTOCOL (TRAINING / REST / CONNECTION) */}
                        {currentDay.dayType === "TRAINING_DAY" ? (
                          <div className="grid lg:grid-cols-12 gap-6 items-start">
                            {/* Left (7 Columns): Video YouTube Premium Card & Workout Section */}
                            <div className="lg:col-span-7 space-y-6">
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

                            {/* Right (5 Columns): Meal Recommendation & Compliance */}
                            <div className="lg:col-span-5 space-y-6">
                              <MealSection
                                mealRecommendation={currentDay.mealRecommendation}
                                initialCompliance={dayMealCompliance[currentDay.id] || currentDay.userProgress?.mealCompliance || "FULL"}
                                initialNotes={dayMealNotes[currentDay.id] !== undefined ? dayMealNotes[currentDay.id] : currentDay.userProgress?.mealNotes || ""}
                                isPast2359={currentDay.isPast2359}
                                onSaveMeal={handleSaveMeal}
                              />
                            </div>
                          </div>
                        ) : currentDay.dayType === "REST_DAY" ? (
                          <div className="grid lg:grid-cols-12 gap-6 items-start">
                            <div className="lg:col-span-7 space-y-6">
                              <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 group">
                                <div className="space-y-1">
                                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                                    Phase 02 &bull; Parasympathetic Restoration
                                  </span>
                                  <h3 className="text-xl sm:text-2xl font-light tracking-tight text-zinc-900 dark:text-white">
                                    Rest &amp; Deep Recovery
                                  </h3>
                                </div>

                                <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200/80 dark:border-white/10">
                                  <Image
                                    src="/image.jpg"
                                    alt="Rest Day"
                                    fill
                                    className="object-cover scale-110 blur-[1px] group-hover:blur-0 group-hover:scale-105 transition-all duration-700"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                                  <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl glass-image-overlay backdrop-blur-xl border border-white/15">
                                    <span className="text-micro uppercase tracking-[0.2em] text-zinc-300 block mb-0.5">
                                      Circadian Regeneration
                                    </span>
                                    <h4 className="text-sm sm:text-base font-light text-white tracking-tight">
                                      {currentDay.title}
                                    </h4>
                                  </div>
                                </div>

                                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-light whitespace-pre-line">
                                  {currentDay.restInstructions ||
                                    "Take a gentle 25-minute sunlight walk, practice box breathing, and allow somatic tissues to fully decompress."}
                                </p>
                              </div>
                            </div>

                            <div className="lg:col-span-5 space-y-6">
                              <MealSection
                                mealRecommendation={currentDay.mealRecommendation}
                                initialCompliance={dayMealCompliance[currentDay.id] || currentDay.userProgress?.mealCompliance || "FULL"}
                                initialNotes={dayMealNotes[currentDay.id] !== undefined ? dayMealNotes[currentDay.id] : currentDay.userProgress?.mealNotes || ""}
                                isPast2359={currentDay.isPast2359}
                                onSaveMeal={handleSaveMeal}
                              />
                            </div>
                          </div>
                        ) : (
                          /* CONNECTION_DAY / MEETUP_DAY */
                          <div className="grid lg:grid-cols-12 gap-6 items-start">
                            <div className="lg:col-span-7 space-y-6">
                              <div className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 group">
                                <div className="space-y-1">
                                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                                    Phase 02 &bull; Connection Sanctuary
                                  </span>
                                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white font-geometric">
                                    {currentDay.eventTitle || "Community & Facetime Circle"}
                                  </h3>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light font-mono">
                                    In-person immersion, mentor alignment, and community synergy.
                                  </p>
                                </div>

                                <div className="relative h-60 w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200/80 dark:border-white/10">
                                  <Image
                                    src="/image.jpg"
                                    alt="Connection Day"
                                    fill
                                    className="object-cover object-right scale-110 blur-[1px] group-hover:blur-0 group-hover:scale-105 transition-all duration-700"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                                  <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl glass-image-overlay backdrop-blur-xl border border-white/15">
                                    <span className="text-micro uppercase tracking-[0.2em] text-zinc-300 block mb-0.5">
                                      Live Immersion
                                    </span>
                                    <h4 className="text-sm sm:text-base font-light text-white tracking-tight">
                                      {currentDay.title}
                                    </h4>
                                  </div>
                                </div>

                                {/* Event Details 2-Column Grid */}
                                <div className="grid sm:grid-cols-2 gap-4 font-mono">
                                  {/* Schedule */}
                                  <div className="p-4 sm:p-5 rounded-2xl glass-panel-subtle space-y-1 border border-zinc-200/60 dark:border-white/10">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 flex items-center gap-1.5 font-mono">
                                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Session Schedule
                                    </span>
                                    <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white font-mono">
                                      {currentDay.onsiteSchedule || "09:00 AM – 11:30 AM WIB"}
                                    </p>
                                  </div>

                                  {/* Venue */}
                                  <div className="p-4 sm:p-5 rounded-2xl glass-panel-subtle space-y-1 border border-zinc-200/60 dark:border-white/10">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 flex items-center gap-1.5 font-mono">
                                      <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Sanctuary Venue
                                    </span>
                                    <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white font-mono">
                                      {currentDay.onsiteVenue ||
                                        currentProgram.venueAddress ||
                                        "The BMS Sanctuary, Senopati, Jakarta"}
                                    </p>
                                  </div>

                                  {/* Host / Who You Will Meet */}
                                  <div className="p-4 sm:p-5 rounded-2xl glass-panel-subtle space-y-1 border border-zinc-200/60 dark:border-white/10">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 flex items-center gap-1.5 font-mono">
                                      <Users className="w-3.5 h-3.5 text-zinc-400" /> Who You Will Meet
                                    </span>
                                    <p className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-white font-mono">
                                      {currentDay.eventHost || currentDay.coachName || currentProgram.coachName || "Coach & Community Leads"}
                                    </p>
                                  </div>

                                  {/* Google Maps Link */}
                                  <div className="p-4 sm:p-5 rounded-2xl glass-panel-subtle space-y-2 border border-zinc-200/60 dark:border-white/10 flex flex-col justify-between">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 flex items-center gap-1.5 font-mono">
                                      <Compass className="w-3.5 h-3.5 text-zinc-400" /> Venue Navigation
                                    </span>
                                    {currentDay.mapLink ? (
                                      <a
                                        href={currentDay.mapLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:opacity-90 transition w-fit"
                                      >
                                        <span>Open Google Maps</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    ) : (
                                      <span className="text-xs text-zinc-400 font-light">
                                        Location details confirmed via member chat
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Event Rundown / Details */}
                                {currentDay.eventDetails && (
                                  <div className="p-5 rounded-2xl glass-panel-subtle border border-zinc-200/70 dark:border-white/10 space-y-2 font-mono">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 block font-mono">
                                      Event Details &amp; Agenda Rundown
                                    </span>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-light whitespace-pre-line font-mono">
                                      {currentDay.eventDetails}
                                    </p>
                                  </div>
                                )}

                                {/* Virtual Stream Link for Remote Members */}
                                {currentDay.meetupLink && (
                                  <div className="p-5 rounded-2xl glass-panel-subtle border border-zinc-200/70 dark:border-white/10 space-y-3 font-mono">
                                    <div className="flex items-center gap-2 text-micro uppercase tracking-[0.2em] font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                                      <Video className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Virtual Broadcast &bull; Remote Access</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-light font-mono">
                                      For remote members unable to attend the studio physically, access the live high-definition broadcast:
                                    </p>
                                    <a
                                      href={currentDay.meetupLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide shadow-sm font-mono"
                                    >
                                      <span>Join Live Stream</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )}

                                {/* Member Event Feedback Note Input */}
                                <div className="p-6 rounded-2xl glass-panel-subtle border border-zinc-200/70 dark:border-white/10 space-y-3 font-mono">
                                  <div className="space-y-1">
                                    <span className="text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 block font-mono">
                                      Member Event Feedback Note
                                    </span>
                                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                                      How was your Connect Day experience?
                                    </h4>
                                    <p className="text-xs text-zinc-500 font-light">
                                      Share key takeaways, circle highlights, or reflections from today&apos;s session.
                                    </p>
                                  </div>

                                  <textarea
                                    rows={3}
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
                                    placeholder="Enter your gathering feedback or notes..."
                                    className="w-full p-4 rounded-xl glass-input text-xs sm:text-sm font-light text-zinc-900 dark:text-white leading-relaxed resize-none transition focus:ring-1 focus:ring-white/40 font-mono"
                                  />

                                  {!currentDay.isPast2359 && (
                                    <div className="flex justify-end pt-1">
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
                                        className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide flex items-center gap-2 transition duration-200 shadow-md font-mono"
                                      >
                                        {isSavingFeedback ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Saving...</span>
                                          </>
                                        ) : feedbackSaved ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-950" />
                                            <span>Saved</span>
                                          </>
                                        ) : (
                                          <span>Save Event Feedback</span>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-5 space-y-6">
                              <MealSection
                                mealRecommendation={currentDay.mealRecommendation}
                                initialCompliance={dayMealCompliance[currentDay.id] || currentDay.userProgress?.mealCompliance || "FULL"}
                                initialNotes={dayMealNotes[currentDay.id] !== undefined ? dayMealNotes[currentDay.id] : currentDay.userProgress?.mealNotes || ""}
                                isPast2359={currentDay.isPast2359}
                                onSaveMeal={handleSaveMeal}
                              />
                            </div>
                          </div>
                        )}

                        {/* 3. FASE MALAM: DEAR DIARY REFLECTION & HAPPINESS RATE */}
                        <DailyReflectionCard
                          dayNumber={currentDay.dayNumber}
                          initialReflection={dayReflections[currentDay.id] !== undefined ? dayReflections[currentDay.id] : currentDay.userProgress?.dailyReflection || ""}
                          initialHappinessRate={dayHappiness[currentDay.id] || currentDay.userProgress?.happinessRate || 5}
                          isPast2359={currentDay.isPast2359}
                          onSaveReflection={handleSaveReflection}
                        />
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
            <div className="space-y-8 sm:space-y-10 font-mono">
              {/* Editorial Header */}
              <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-zinc-200/70 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                  <span className="text-micro uppercase tracking-[0.24em] font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                    Curated Programs
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extralight tracking-tight text-zinc-900 dark:text-white font-geometric">
                  Longevity &amp; Movement <span className="font-geometric italic text-zinc-500 dark:text-zinc-400 font-light">Protocols</span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl font-light leading-relaxed">
                  Choose your structured longevity and movement protocol. Strictly capped at 35 members per program to preserve intimate coach attention.
                </p>
              </div>

              {/* Search Bar & Filter Controls */}
              <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-zinc-200/70 dark:border-white/10 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={programSearch}
                    onChange={(e) => {
                      setProgramSearch(e.target.value);
                      setProgramsPage(1);
                    }}
                    placeholder="Enter keyword to search programs..."
                    className="w-full pl-11 pr-10 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                  />
                  {programSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setProgramSearch("");
                        setProgramsPage(1);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs (Format & Availability) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Format Filters */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-micro uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Format:
                    </span>
                    {[
                      { id: "ALL", label: "All Formats" },
                      { id: "ONLINE", label: "Online Sanctuary" },
                      { id: "ONSITE", label: "On-Site Studio" },
                      { id: "HYBRID", label: "Hybrid" },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setFormatFilter(fmt.id as any);
                          setProgramsPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs transition ${
                          formatFilter === fmt.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                            : "glass-panel-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>

                  {/* Status Filters */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-micro uppercase tracking-wider text-zinc-400 mr-1">Status:</span>
                    {[
                      { id: "ALL", label: "All Status" },
                      { id: "OPEN", label: "Open Reg." },
                      { id: "ACTIVE", label: "Active" },
                      { id: "COMING_SOON", label: "Coming Soon" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setAvailabilityFilter(st.id as any);
                          setProgramsPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs transition ${
                          availabilityFilter === st.id
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                            : "glass-panel-subtle text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
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
                <div className="glass-panel rounded-3xl p-12 text-center border border-zinc-200/70 dark:border-white/10 space-y-3">
                  <Compass className="w-8 h-8 text-zinc-400 mx-auto opacity-50" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    No programs found
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-light">
                    No programs match your current search and filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramSearch("");
                      setFormatFilter("ALL");
                      setAvailabilityFilter("ALL");
                      setProgramsPage(1);
                    }}
                    className="px-5 py-2 rounded-full glass-panel-subtle text-xs font-semibold text-zinc-900 dark:text-white mt-2"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
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
                        className="relative rounded-3xl overflow-hidden glass-panel border border-zinc-200/70 dark:border-white/10 min-h-[460px] p-7 sm:p-8 flex flex-col justify-between group shadow-xl"
                      >
                        {/* Full Background Image */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                          <Image
                            src={prog.coverImage || (idx % 2 === 0 ? "/test.jpg" : "/pic.jpg")}
                            alt={prog.title}
                            fill
                            className="object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
                          />
                        </div>
                        {/* Luminous light scrim */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

                        {/* Top Badges */}
                        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 font-mono">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1 rounded-full glass-image-overlay text-micro uppercase tracking-[0.2em] font-semibold text-white">
                              {prog.dayCount} Days
                            </span>

                            {prog.locationType === "ONSITE" && (
                              <span className="px-3 py-1 rounded-full glass-image-overlay border border-white/20 text-micro uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-zinc-300" />
                                <span>On-Site &bull; {prog.city || "Studio"}</span>
                              </span>
                            )}

                            {prog.locationType === "HYBRID" && (
                              <span className="px-3 py-1 rounded-full glass-image-overlay border border-white/20 text-micro uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-zinc-300" />
                                <span>Hybrid &bull; {prog.city || "Studio"}</span>
                              </span>
                            )}

                            {(!prog.locationType || prog.locationType === "ONLINE") && (
                              <span className="px-3 py-1 rounded-full glass-image-overlay border border-white/20 text-micro uppercase tracking-wider font-semibold text-zinc-200 backdrop-blur-md">
                                Online Protocol
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <span className="px-3 py-1 rounded-full chrome-badge text-white text-micro uppercase tracking-[0.2em] font-semibold">
                                Active Plan
                              </span>
                            ) : isPending ? (
                              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-micro uppercase tracking-[0.2em] font-semibold">
                                Pending Payment
                              </span>
                            ) : publicBadge === "Coming Soon" ? (
                              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-micro uppercase tracking-[0.2em] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Coming Soon</span>
                              </span>
                            ) : publicBadge === "Full" ? (
                              <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 text-micro uppercase tracking-[0.2em] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                                <span>Full (0 spots)</span>
                              </span>
                            ) : publicBadge === "Close Registration" ? (
                              <span className="px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-600 text-zinc-300 text-micro uppercase tracking-[0.2em] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                                <span>Reg. Closed</span>
                              </span>
                            ) : publicBadge === "On going" ? (
                              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400 text-blue-300 text-micro uppercase tracking-[0.2em] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <span>On Going</span>
                              </span>
                            ) : publicBadge === "End" ? (
                              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-micro uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5">
                                <span>Concluded</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-full glass-image-overlay text-micro uppercase tracking-wider font-medium text-white flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-zinc-300" />
                                <span>{remainingSlots} spots left</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Floating Glassmorphic Content Card */}
                        <div className="relative z-10 glass-image-overlay rounded-2xl p-6 space-y-4 text-white border border-white/15 backdrop-blur-xl">
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center gap-2 text-micro uppercase tracking-[0.18em] text-zinc-300 font-medium">
                              <span>{prog.coachName}</span>
                              <span>&bull;</span>
                              <span>Starts {formatShortDate(prog.startDate)}</span>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-geometric">
                              {prog.title}
                            </h3>

                            <p className="text-xs text-zinc-200/90 line-clamp-2 leading-relaxed font-light font-mono">
                              {prog.description}
                            </p>

                            {prog.locationType !== "ONLINE" && prog.virtualFallbackAvailable && (
                              <div className="pt-1 flex items-center gap-1.5 text-micro uppercase tracking-wider text-zinc-300 font-medium font-mono">
                                <Video className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                                <span>Live streaming broadcast included</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-3 font-mono">
                            <div>
                              <span className="text-micro uppercase tracking-[0.2em] text-zinc-400 block mb-0.5">
                                {publicBadge === "Coming Soon" ? "Registration" : "Tuition"}
                              </span>
                              {publicBadge === "Coming Soon" ? (
                                <span className="text-xs font-medium text-zinc-300">
                                  {prog.registrationOpenDate
                                    ? `Opens ${formatShortDate(prog.registrationOpenDate)}`
                                    : "Announced Soon (TBA)"}
                                </span>
                              ) : (
                                <span className="text-base font-bold text-white tracking-tight">
                                  Rp {prog.price.toLocaleString("id-ID")}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setDetailedProgram(prog)}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition"
                                title="View Overview"
                              >
                                <Info className="w-4 h-4" />
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
                                  className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
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
                                  className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
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
                                  href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Halo BMS Concierge, saya ingin bergabung ke waitlist untuk program: ${prog.title}`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-5 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition shadow"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Waitlist</span>
                                </a>
                              ) : publicBadge === "Full" ? (
                                <button
                                  type="button"
                                  disabled
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-purple-500/30 text-purple-300/80 text-xs font-semibold tracking-wide cursor-not-allowed"
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
                                  className="px-5 py-2.5 rounded-full bg-zinc-900 border border-blue-500/30 text-blue-300/80 text-xs font-semibold tracking-wide cursor-not-allowed"
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
        {/* TAB 3: PROFILE (PERSONAL, MEDICAL, PAYMENTS & ACCOUNT MANAGEMENT)     */}
        {/* ===================================================================== */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10 font-mono">
            {/* Header */}
            <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-zinc-200/70 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                <span className="text-micro uppercase tracking-[0.24em] font-semibold text-zinc-400 dark:text-zinc-500 font-mono">
                  Member Profile
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extralight tracking-tight text-zinc-900 dark:text-white font-geometric">
                Account &amp; <span className="font-geometric italic text-zinc-500 dark:text-zinc-400 font-light">Wellness Profile</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed">
                Manage your personal information, customer-filled medical baseline, payment history, and account credentials.
              </p>
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl glass-panel border border-zinc-200/70 dark:border-white/10 overflow-x-auto scrollbar-none text-xs">
              {[
                { id: "personal", label: "Personal Info", icon: User },
                { id: "medical", label: "Health & Medical", icon: Activity },
                { id: "payments", label: "Payment History", icon: CreditCard },
                { id: "account", label: "Account & Security", icon: Sliders },
              ].map((sub) => {
                const Icon = sub.icon;
                const isSel = profileSubTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setProfileSubTab(sub.id as any)}
                    className={`px-4 py-2 rounded-xl font-medium transition shrink-0 flex items-center gap-2 ${
                      isSel
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-sm"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SUB-TAB 1: PERSONAL INFORMATION */}
            {profileSubTab === "personal" && (
              <form
                onSubmit={handleUpdateProfile}
                className="glass-panel rounded-3xl p-7 sm:p-9 space-y-6 border border-zinc-200/70 dark:border-white/10 shadow-sm"
              >
                <div className="space-y-1">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 block">
                    Identity Details
                  </span>
                  <h3 className="text-lg font-light tracking-tight text-zinc-900 dark:text-white font-geometric">
                    Personal Information
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                    Update your contact details, personal bio, and address.
                  </p>
                </div>

                {profileMsg && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-medium font-mono ${
                      profileMsg.type === "success"
                        ? "bg-white/10 border border-white/20 text-zinc-900 dark:text-white"
                        : "bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300"
                    }`}
                  >
                    {profileMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
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
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full px-4 py-3 rounded-2xl glass-panel-subtle text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 cursor-not-allowed border border-zinc-200/50 dark:border-white/5"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      WhatsApp / Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      placeholder="Enter your age"
                      value={profileForm.age}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, age: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Gender
                    </label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, gender: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm cursor-pointer"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Occupation
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your occupation"
                      value={profileForm.occupation}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, occupation: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your street address"
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, address: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your city"
                      value={profileForm.city}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, city: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Province / State
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your province"
                      value={profileForm.province}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, province: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter emergency contact name"
                      value={profileForm.emergencyContactName}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, emergencyContactName: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-micro uppercase tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 mb-2">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter emergency contact phone"
                      value={profileForm.emergencyContactPhone}
                      onChange={(e) =>
                        setProfileForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-2xl glass-input text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2 text-right">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="px-6 py-2.5 rounded-full chrome-button text-xs font-semibold tracking-wide shadow-sm"
                  >
                    {isUpdatingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 2: HEALTH & BODY ASSESSMENT */}
            {profileSubTab === "medical" && (
              <form
                onSubmit={handleSaveHealthProfile}
                className="glass-panel rounded-3xl p-7 sm:p-9 space-y-8 border border-zinc-200/70 dark:border-white/10 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-micro uppercase tracking-[0.22em] font-semibold text-zinc-400 dark:text-zinc-500 font-mono block">
                      Physical &amp; Lifestyle Baseline
                    </span>
                  </div>
                  <h3 className="text-xl font-light tracking-tight text-zinc-900 dark:text-white font-geometric">
                    Health &amp; Body Assessment
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                    Track your posture baseline photos, anthropometric measurements, dietary style, energy levels, and routine consistency.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/5 dark:bg-white/5 border border-zinc-200/60 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300 font-light flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>
                    This section is exclusively self-managed by you. BMS coaches view this as read-only telemetry to tailor workout adaptations safely.
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

            {/* SUB-TAB 3: PAYMENT HISTORY */}
            {profileSubTab === "payments" && (
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
                                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                      : isPending
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                      : "bg-zinc-500/15 text-zinc-500 border border-zinc-500/20"
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
                                  <span className="text-amber-600 dark:text-amber-400">
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
                                className="px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
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

            {/* SUB-TAB 4: ACCOUNT MANAGEMENT & SECURITY */}
            {profileSubTab === "account" && (
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
                      For native ambient immersion and reliable push alerts, install BMS onto your device home screen:
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
                <div className="glass-panel rounded-3xl p-7 sm:p-9 border border-red-500/20 space-y-4 shadow-sm">
                  <span className="text-micro uppercase tracking-[0.22em] font-semibold text-red-500 block">
                    Irreversible Action
                  </span>
                  <h3 className="text-lg font-light tracking-tight text-red-600 dark:text-red-400">
                    Delete Account
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light">
                    Permanently purge your BMS account, personal logs, streak histories, and active program enrollments. This cannot be reversed.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      className="px-5 py-2.5 rounded-full border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium tracking-wide transition"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                      className="px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold tracking-wide flex items-center gap-2"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Complete Payment
                    </button>
                  );
                }

                if (publicBadge === "Coming Soon") {
                  return (
                    <a
                      href={`https://wa.me/6281290002026?text=${encodeURIComponent(`Halo BMS Concierge, saya ingin bergabung ke waitlist untuk program: ${detailedProgram.title}`)}`}
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
