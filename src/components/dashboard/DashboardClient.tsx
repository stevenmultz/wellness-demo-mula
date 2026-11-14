"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrisCheckoutModal, QrisInvoiceData } from "@/components/checkout/QrisCheckoutModal";
import {
  wellnessEnrollProgram,
  wellnessDeleteAccount,
} from "@/wellness/actions/account";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { wellnessUserSubmitDayProgress } from "@/wellness/actions/program";
import { parseWorkoutOptionGroups, ProgramTermChapter } from "@/wellness/utils/json";
import { resolvePublicBadge } from "@/wellness/utils/timeline";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { MyPlanHeader, MyPlanOverview } from "./tabs/MyPlanTab";
import { ExplorePlanTab } from "./tabs/ExplorePlanTab";
import { NotificationsHistoryTab } from "./tabs/NotificationsHistoryTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { ProgramDetailView } from "./tabs/ProgramDetailView";
import {
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Bell,
  Calendar,
  Compass,
  User,
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

  // Scroll Hide / Show for Top Header (Scroll down hides, scroll up reveals)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isOverHero, setIsOverHero] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsOverHero(currentScrollY < 160);
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

  // Filter ONLY programs the user has enrolled in
  const enrolledProgramIds = new Set(myPrograms.map((e) => e.programId));
  const myEnrolledPrograms = allPrograms.filter((p) => enrolledProgramIds.has(p.id));

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
  const [dayReflections, setDayReflections] = useState<Record<string, string>>({});
  const [dayHappiness, setDayHappiness] = useState<Record<string, number>>({});
  const [dayBedtimes, setDayBedtimes] = useState<Record<string, string>>({});
  const [dayWakeTimes, setDayWakeTimes] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [qrisInvoice, setQrisInvoice] = useState<QrisInvoiceData | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // Health & Body Baseline Profile State (passed to ProfileTab)
  const [healthProfile] = useState<HealthProfileData>(() => ({
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
      assessmentResponse: dayAssessments[day.id] ?? day.userProgress?.assessmentResponse,
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
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay || getVideoWatched(targetDay)) return true;
    setDayVideoWatched((prev) => ({ ...prev, [targetDay.id]: true }));
    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      videoWatched: true,
      checklistCompleted: getCheckedItems(targetDay),
      isCompleted: !!targetDay.userProgress?.isCompleted,
    });
    if (!res.success) {
      setDayVideoWatched((prev) => ({ ...prev, [targetDay.id]: false }));
      return false;
    }
    return true;
  };

  const handleSyncChecklist = async (
    updated: string[],
    dayId?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    const existing = getCheckedItems(targetDay);
    setDayChecklists((prev) => ({ ...prev, [targetDay.id]: updated }));

    const videoDone =
      targetDay.dayType !== "TRAINING_DAY" || !targetDay.videoUrl
        ? true
        : getVideoWatched(targetDay);
    const restItems = (targetDay.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);
    const allTasksDone =
      targetDay.dayType === "REST_DAY"
        ? restItems.length === 0 || restItems.every((name) => updated.includes(name))
        : areActiveWorkoutMovementsCompleted(targetDay, updated);
    const autoComplete = videoDone && allTasksDone;

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      videoWatched: getVideoWatched(targetDay),
      checklistCompleted: updated,
      isCompleted: autoComplete || !!targetDay.userProgress?.isCompleted,
      selectedWorkout: dayWorkouts[targetDay.id] || targetDay.userProgress?.selectedWorkout || undefined,
      photoBeforeUrl: dayPhotosBefore[targetDay.id] || targetDay.userProgress?.photoBeforeUrl || undefined,
      photoAfterUrl: dayPhotosAfter[targetDay.id] || targetDay.userProgress?.photoAfterUrl || undefined,
      mealCompliance: dayMealCompliance[targetDay.id] || targetDay.userProgress?.mealCompliance || undefined,
      mealNotes: dayMealNotes[targetDay.id] !== undefined ? dayMealNotes[targetDay.id] : targetDay.userProgress?.mealNotes || undefined,
      dailyReflection: dayReflections[targetDay.id] !== undefined ? dayReflections[targetDay.id] : targetDay.userProgress?.dailyReflection || undefined,
      happinessRate: dayHappiness[targetDay.id] || targetDay.userProgress?.happinessRate || undefined,
      bedtime: dayBedtimes[targetDay.id] || targetDay.userProgress?.bedtime || undefined,
      wakeTime: dayWakeTimes[targetDay.id] || targetDay.userProgress?.wakeTime || undefined,
      assessmentResponse:
        dayAssessments[targetDay.id] !== undefined
          ? dayAssessments[targetDay.id]
          : targetDay.userProgress?.assessmentResponse || "",
    });

    if (!res.success) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: existing }));
      setActionNotice({
        type: "error",
        text: res.message || "Failed to save checklist progress.",
      });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }

    if (autoComplete) {
      setActionNotice({
        type: "success",
        text: `Day ${targetDay.dayNumber} checklist completed.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    }
    return true;
  };

  const handleToggleChecklist = async (
    task: string,
    dayId?: string,
    isRepUpdate = false
  ) => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return;
    const existing = getCheckedItems(targetDay);
    const getBaseKey = (item: string) =>
      (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase();
    const targetBase = getBaseKey(task);
    const alreadyExists = existing.some((t) => getBaseKey(t) === targetBase);

    const updated = isRepUpdate
      ? alreadyExists
        ? existing.map((t) => (getBaseKey(t) === targetBase ? task : t))
        : [...existing, task]
      : alreadyExists
        ? existing.filter((t) => getBaseKey(t) !== targetBase)
        : [...existing, task];

    setDayChecklists((prev) => ({ ...prev, [targetDay.id]: updated }));

    const videoDone =
      targetDay.dayType !== "TRAINING_DAY" || !targetDay.videoUrl
        ? true
        : getVideoWatched(targetDay);
    const restItems = (targetDay.restInstructions || "")
      .split(/\n|•|·/)
      .map((line) => line.replace(/^[\s\-*–—\d.)]+/, "").trim())
      .filter((line) => line.length > 1);
    const allTasksDone =
      targetDay.dayType === "REST_DAY"
        ? restItems.length === 0 || restItems.every((name) => updated.includes(name))
        : areActiveWorkoutMovementsCompleted(targetDay, updated);

    const autoComplete = videoDone && allTasksDone;

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      videoWatched: getVideoWatched(targetDay),
      checklistCompleted: updated,
      isCompleted: autoComplete,
      selectedWorkout: dayWorkouts[targetDay.id] || targetDay.userProgress?.selectedWorkout || undefined,
      photoBeforeUrl: dayPhotosBefore[targetDay.id] || targetDay.userProgress?.photoBeforeUrl || undefined,
      photoAfterUrl: dayPhotosAfter[targetDay.id] || targetDay.userProgress?.photoAfterUrl || undefined,
      mealCompliance: dayMealCompliance[targetDay.id] || targetDay.userProgress?.mealCompliance || undefined,
      mealNotes: dayMealNotes[targetDay.id] !== undefined ? dayMealNotes[targetDay.id] : targetDay.userProgress?.mealNotes || undefined,
      dailyReflection: dayReflections[targetDay.id] !== undefined ? dayReflections[targetDay.id] : targetDay.userProgress?.dailyReflection || undefined,
      happinessRate: dayHappiness[targetDay.id] || targetDay.userProgress?.happinessRate || undefined,
      bedtime: dayBedtimes[targetDay.id] || targetDay.userProgress?.bedtime || undefined,
      wakeTime: dayWakeTimes[targetDay.id] || targetDay.userProgress?.wakeTime || undefined,
      assessmentResponse:
        dayAssessments[targetDay.id] !== undefined
          ? dayAssessments[targetDay.id]
          : targetDay.userProgress?.assessmentResponse || "",
    });

    if (!res.success) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: existing }));
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
        text: `Day ${targetDay.dayNumber} checklist completed.`,
      });
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const handleSaveSleep = async (
    bedtime: string,
    wakeTime: string,
    sleepDurationMinutes: number,
    dayId?: string,
    sleepFeeling?: string
  ): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    const formattedAssessment =
      bedtime === "SKIPPED"
        ? ""
        : sleepFeeling
          ? `Sleep Feeling: ${sleepFeeling}`
          : undefined;
    setDayBedtimes((prev) => ({ ...prev, [targetDay.id]: bedtime }));
    setDayWakeTimes((prev) => ({ ...prev, [targetDay.id]: wakeTime }));
    if (formattedAssessment !== undefined) {
      setDayAssessments((prev) => ({ ...prev, [targetDay.id]: formattedAssessment }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      bedtime,
      wakeTime,
      sleepDurationMinutes,
      ...(formattedAssessment !== undefined ? { assessmentResponse: formattedAssessment } : {}),
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save sleep log." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    setActionNotice({ type: "success", text: "Sleep log saved successfully." });
    setTimeout(() => setActionNotice(null), 3000);
    return true;
  };

  const handleSelectWorkout = async (workout: string, dayId?: string, resetChecklist?: boolean): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    setDayWorkouts((prev) => ({ ...prev, [targetDay.id]: workout }));
    const nextChecklist = resetChecklist ? [] : getCheckedItems(targetDay);
    if (resetChecklist) {
      setDayChecklists((prev) => ({ ...prev, [targetDay.id]: [] }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: nextChecklist,
      videoWatched: getVideoWatched(targetDay),
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
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    if (type === "before") {
      setDayPhotosBefore((prev) => ({ ...prev, [targetDay.id]: base64OrUrl }));
    } else {
      setDayPhotosAfter((prev) => ({ ...prev, [targetDay.id]: base64OrUrl }));
    }

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
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
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    setDayWorkoutNotes((prev) => ({ ...prev, [targetDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
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

  const handleSaveEventFeedback = async (feedbackText: string, dayId?: string): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    setDayEventFeedback((prev) => ({ ...prev, [targetDay.id]: feedbackText }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
      eventFeedback: feedbackText,
    });

    if (!res.success) {
      setActionNotice({ type: "error", text: res.message || "Failed to save event feedback." });
      setTimeout(() => setActionNotice(null), 4000);
      return false;
    }
    router.refresh();
    return true;
  };

  const handleSaveMeal = async (compliance: string, notes: string, dayId?: string): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    setDayMealCompliance((prev) => ({ ...prev, [targetDay.id]: compliance }));
    setDayMealNotes((prev) => ({ ...prev, [targetDay.id]: notes }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
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
    return true;
  };

  const handleSaveReflection = async (reflection: string, happinessRate: number, dayId?: string): Promise<boolean> => {
    const targetDay = dayId ? currentProgram?.days.find((d) => d.id === dayId) || null : calendarDay;
    if (!targetDay) return false;
    setDayReflections((prev) => ({ ...prev, [targetDay.id]: reflection }));
    setDayHappiness((prev) => ({ ...prev, [targetDay.id]: happinessRate }));

    const res = await wellnessUserSubmitDayProgress({
      programDayId: targetDay.id,
      isCompleted: !!targetDay.userProgress?.isCompleted,
      checklistCompleted: getCheckedItems(targetDay),
      videoWatched: getVideoWatched(targetDay),
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
          text: `Registration is not open for this program (Status: ${publicBadge}).`,
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

  // Hobby cron runs once a day. While this session is visible in foreground, ask the server (WIB clock) for due alerts.
  useEffect(() => {
    let lastMinute = "";
    let stopped = false;
    const tick = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
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
        // The next visible minute retries cleanly without wasting background battery.
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };
    void tick();
    const interval = setInterval(() => void tick(), 30000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-clip font-sans bg-[#F4F6F9] dark:bg-[#0B0D10] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Per-tab header: My Plan renders it here; the other tabs render their own */}
      {activeTab === "my_plan" && (
        <MyPlanHeader
          visible={isHeaderVisible}
          overlay={isOverHero}
          plans={planOptions}
          selectedProgramId={overviewEnrollment?.programId ?? ""}
          onSelect={(id) => {
            setSelectedProgId(id);
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
        style={{ bottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}
        className="fixed left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md h-12 rounded-2xl px-2 flex items-center justify-between gap-1 border border-zinc-200 dark:border-zinc-700/80 bg-white/95 dark:bg-[#171C22]/95 backdrop-blur-2xl shadow-xl font-mono"
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
              setIsOverHero(true);
              window.scrollTo({ top: 0 });
            }}
            className={`flex-1 h-9 rounded-xl transition flex items-center justify-center ${
              activeTab === key
                ? "chrome-button shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </nav>

      {/* Main Content Area with safe-area spacing below seamless top header and above bottom dock */}
      <main
        style={{
          paddingTop: activeTab === "my_plan" ? "0px" : "calc(4.5rem + env(safe-area-inset-top))",
          paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))",
        }}
        className="max-w-5xl mx-auto px-4 sm:px-8 flex-1 w-full"
      >
        {actionNotice && (
          <div
            style={{
              top: activeTab === "my_plan" ? "calc(4.25rem + env(safe-area-inset-top))" : undefined,
            }}
            className={`${
              activeTab === "my_plan"
                ? "fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md shadow-xl"
                : "mb-4 shadow-sm"
            } glass-panel p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in border font-mono ${
              actionNotice.type === "error"
                ? "border-red-500/35 text-red-700 dark:text-red-300"
                : "border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
            }`}
          >
            {actionNotice.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
            onSyncChecklist={handleSyncChecklist}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-[#0B0D10]/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Delete Your Account
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Please enter your password to confirm permanent account deletion.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-700 dark:text-red-300 text-xs">
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
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
                  className="px-4 py-2 rounded-xl graphite-button text-xs font-medium"
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
            setActiveTab("my_plan");
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
