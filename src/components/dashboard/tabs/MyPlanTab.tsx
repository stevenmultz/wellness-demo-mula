"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dumbbell,
  ExternalLink,
  Heart,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { TrackingAccessStatusDTO } from "@/wellness/services/tracking-entitlement";
import type { TrackingPassPlanDTO } from "@/wellness/actions/tracking-pass";
import { getWibCalendarDate } from "@/wellness/utils/timezone";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { DailyCheckIn } from "./DailyCheckIn";
import { BodyProgressWidget, type BodyMetricPoint } from "./BodyProgressWidget";
import {
  BrandWordmark,
  EmptyState,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
  type HeaderProfileMenuActions,
  safeHttpUrl,
} from "./shared";
import { MyPlanIndex } from "./my-plan/MyPlanIndex";
import { MyPlanIntro } from "./my-plan/MyPlanIntro";
import { MyPlanNoPlanPage } from "./my-plan/MyPlanNoPlanPage";
import { MyPlanAllPage } from "./my-plan/MyPlanAllPage";
import { MyPlanOngoingPage } from "./my-plan/MyPlanOngoingPage";
import { MyPlanUpcomingPage } from "./my-plan/MyPlanUpcomingPage";
import { MyPlanDonePage } from "./my-plan/MyPlanDonePage";
import { CohortPerformanceCard } from "./my-plan/CohortPerformanceCard";
import { ProgramReportPageView } from "./my-plan/ProgramReportPageView";
import { ProgramPreparationWidgets } from "./my-plan/ProgramPreparationWidgets";
import {
  evaluateDayTaskState,
  formatStartsIn,
  type MyPlanIndexItem,
  type PlanDay,
  type PlanOption,
  type PlanProgramInfo,
  type PlanStats,
  type PlanTaskId,
} from "./my-plan/myPlanUtils";

export type {
  MyPlanIndexItem,
  PlanDay,
  PlanOption,
  PlanProgramInfo,
  PlanStats,
  PlanTaskId,
};
export {
  evaluateDayTaskState,
  MyPlanIndex,
  MyPlanIntro,
  MyPlanNoPlanPage,
  MyPlanAllPage,
  MyPlanOngoingPage,
  MyPlanUpcomingPage,
  MyPlanDonePage,
};

export type MyPlanSubView = "intro" | "all" | "ongoing" | "upcoming" | "done" | "detail";

export function MyPlanHeader({
  visible,
  overlay = false,
  mode = "detail",
  plans: _plans,
  selectedProgramId: _selectedProgramId,
  avatarUrl,
  userName,
  userEmail,
  onSelect: _onSelect,
  onBackToIntro,
  onBackToIndex: _onBackToIndex,
  onExplore: _onExplore,
  onOpenProfile,
  profileMenuActions,
}: {
  visible: boolean;
  overlay?: boolean;
  mode?: MyPlanSubView | "empty" | "home";
  plans: PlanOption[];
  selectedProgramId: string;
  avatarUrl?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  onSelect: (programId: string) => void;
  onBackToIntro?: () => void;
  onBackToIndex?: () => void;
  onExplore: () => void;
  onOpenProfile?: () => void;
  profileMenuActions?: HeaderProfileMenuActions;
}) {
  const { t } = useLocale();
  const isListSubPage =
    mode === "all" ||
    mode === "ongoing" ||
    mode === "upcoming" ||
    mode === "done" ||
    mode === "detail";

  return (
    <FloatingHeader visible={visible} transparent={overlay}>
      {isListSubPage && onBackToIntro ? (
        <HeaderBackButton
          onClick={onBackToIntro}
          ariaLabel={t.common.back}
        />
      ) : (
        <BrandWordmark light={overlay} />
      )}

      <HeaderProfileButton
        avatarUrl={avatarUrl}
        fullName={userName}
        email={userEmail}
        onClick={() => onOpenProfile?.()}
        menuActions={profileMenuActions}
        light={overlay}
      />
    </FloatingHeader>
  );
}

export function MyPlanOverview({
  program,
  plan,
  day,
  checklist,
  historyDays,
  allProgramDays,
  onExplore,
  onViewHistory,
  onOpenDetails: _onOpenDetails,
  onToggleCheck,
  onSyncChecklist,
  onSelectWorkout,
  onOpenVideo,
  onSaveSleep,
  onSaveMeal,
  onSaveWater,
  onSaveSteps,
  onLogSelfBodyWeight,
  onAddExtraWorkout,
  onUpdateExtraWorkout,
  onDeleteExtraWorkout,
  overlappingTrainingCount,
  onSaveReflection,
  onSaveAttendance,
  onSaveWorkoutNotes,
  onCompleteDay,
  bodyMetricLogs = [],
  onCustomTaskSubmitted,
  userName,
  userAvatarUrl,
  userSubtitle,
  userEmail,
  userGender,
  userAge,
  onOpenGrowthAnalytics,
  plans,
  selectedProgramId,
  onSelectPlan,
  onViewAllPrograms,
  isStandalone = false,
  isSubscribed = true,
  trackingAccess,
  trackingPassPlans = [],
  onSelectTrackingPass,
  checkoutLoadingPlanId,
  globalMonthlyDays,
  enrolledPrograms = [],
  onOpenProgram,
}: {
  program: PlanProgramInfo | null;
  plan: ProgramDailyPlan | null;
  day: PlanDay | null;
  stats: PlanStats;
  checklist: string[] | undefined;
  onExplore: () => void;
  onViewHistory?: () => void;
  onViewAllPrograms?: () => void;
  onOpenDetails: () => void;
  historyDays: PlanDay[];
  allProgramDays?: PlanDay[];
  onToggleCheck: (task: string, dayId: string, isRepUpdate?: boolean) => Promise<void> | void;
  onSyncChecklist?: (tasks: string[], dayId: string) => Promise<boolean>;
  onSelectWorkout: (workout: string, dayId: string, resetChecklist?: boolean) => Promise<void | boolean>;
  onOpenVideo: (dayId: string) => Promise<void | boolean>;
  onSaveSleep: (bedtime: string, wakeTime: string, minutes: number, dayId: string, sleepFeeling?: string) => Promise<void | boolean>;
  onSaveMeal: (compliance: string, notes: string, dayId: string) => Promise<void | boolean>;
  onSaveWater: (waterMl: number, dayId: string) => Promise<void | boolean>;
  onSaveSteps?: (stepsCount: number, dayId: string) => Promise<void | boolean>;
  onLogSelfBodyWeight?: (weightKg: number, waistCm?: number | null) => Promise<boolean>;
  onAddExtraWorkout?: (payload: {
    logDate: string;
    activityType: "run" | "strength" | "hiit" | "mobility" | "cycling" | "swim" | "custom";
    title: string;
    durationMinutes: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
  }) => Promise<void | boolean>;
  onUpdateExtraWorkout?: (payload: {
    id: string;
    logDate: string;
    title?: string;
    durationMinutes?: number;
    customKcal?: number | null;
    excludeFromNetBurn?: boolean;
    notes?: string | null;
  }) => Promise<void | boolean>;
  onDeleteExtraWorkout?: (id: string, logDate: string) => Promise<void | boolean>;
  overlappingTrainingCount?: number;
  onSaveReflection?: (reflection: string, happiness: number, dayId: string) => Promise<void | boolean>;
  onSaveAttendance: (notes: string, dayId: string) => Promise<void | boolean>;
  onSaveWorkoutNotes: (
    notes: string,
    dayId: string,
    extra?: { selectedWorkout?: string; checklistCompleted?: string[] }
  ) => Promise<void | boolean>;
  onCompleteDay: (dayId: string) => Promise<void | boolean>;
  bodyMetricLogs?: BodyMetricPoint[];
  onCustomTaskSubmitted?: (
    dayId: string,
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>,
    dayCompleted?: boolean
  ) => void;
  userName?: string | null;
  userAvatarUrl?: string | null;
  userSubtitle?: string | null;
  userEmail?: string | null;
  userGender?: string | null;
  userAge?: number | null;
  onOpenGrowthAnalytics?: () => void;
  plans?: PlanOption[];
  selectedProgramId?: string;
  onSelectPlan?: (programId: string) => void;
  isStandalone?: boolean;
  isSubscribed?: boolean;
  trackingAccess?: TrackingAccessStatusDTO;
  trackingPassPlans?: TrackingPassPlanDTO[];
  onSelectTrackingPass?: (planId: string) => void;
  checkoutLoadingPlanId?: string | null;
  globalMonthlyDays?: PlanDay[];
  enrolledPrograms?: MyPlanIndexItem[];
  onOpenProgram?: (programId: string) => void;
}) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const activeEnrolledPrograms = enrolledPrograms.filter((p) => !p.isCompleted);
  const isFeatureLocked = isStandalone && !isSubscribed && activeEnrolledPrograms.length === 0;
  const primaryPassPlan = trackingPassPlans[0] ?? null;

  const { checks, activities, initialDone, pendingTasksCount: rawPendingCount } = evaluateDayTaskState(day, checklist);
  const standalonePendingCount =
    (initialDone[0] ? 0 : 1) +
    (initialDone[2] ? 0 : 1) +
    (initialDone[3] ? 0 : 1) +
    ((day?.userProgress?.stepsCount ?? 0) > 0 ? 0 : 1);
  const programTrainingPendingCount =
    (day && !initialDone[1] ? 1 : 0) +
    (day?.customTasks ?? []).filter((ct) => !ct.submission).length;
  const pendingTasksCount = isStandalone
    ? isFeatureLocked
      ? 0
      : standalonePendingCount
    : programTrainingPendingCount;
  void rawPendingCount;

  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  // Both HYBRID (from batch start) and ONLINE (from join date) obey WIB calendar drip windows
  const hasCalendarSchedule = Boolean(day?.unlockDate);
  const locked = hasCalendarSchedule
    ? !day || !day.isCalendarUnlocked || day.isPast2359
    : !day;
  const fullProgramDays = allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays;

  void _onOpenDetails;
  const [widgetIndex, setWidgetIndex] = useState<0 | 1 | 2>(1);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string>(() => day?.id || "");
  useEffect(() => {
    if (day?.id) {
      setSelectedDayId(day.id);
    }
  }, [day?.id]);

  const sortedProgramDays = useMemo(() => {
    const list =
      fullProgramDays && fullProgramDays.length > 0
        ? fullProgramDays
        : day
        ? [day]
        : [];
    return [...list].sort((a, b) => a.dayNumber - b.dayNumber);
  }, [fullProgramDays, day]);

  const activeSelectedDay = useMemo(
    () =>
      sortedProgramDays.find((d) => d.id === selectedDayId) ||
      day ||
      sortedProgramDays[0] ||
      null,
    [sortedProgramDays, selectedDayId, day]
  );

  const baseTodayDayNum = currentDayNumber > 0 ? currentDayNumber : 1;
  const getProgramDayDate = (d: PlanDay | null | undefined): Date => {
    if (d?.unlockDate) {
      const parsed = new Date(d.unlockDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const dayNum = d?.dayNumber || baseTodayDayNum;
    const diffDays = dayNum - baseTodayDayNum;
    return new Date(Date.now() + diffDays * 86400000);
  };

  const activeBannerDate = getProgramDayDate(activeSelectedDay);
  const localeTag = locale === "id" ? "id-ID" : "en-GB";
  const activeFullDateStr = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(activeBannerDate);
  const activeDayNum = activeSelectedDay?.dayNumber || baseTodayDayNum;
  const activeDayTypeLabel =
    activeSelectedDay?.dayType === "TRAINING_DAY"
      ? locale === "id"
        ? "Hari Latihan"
        : "Training Day"
      : activeSelectedDay?.dayType === "REST_DAY"
        ? locale === "id"
          ? "Hari Istirahat"
          : "Rest Day"
        : locale === "id"
          ? "Hari Pertemuan"
          : "Meetup Day";

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const w = getWibCalendarDate(getProgramDayDate(day));
    return new Date(w.year, w.month, 1);
  });

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  if (!program && !isStandalone) {
    return <MyPlanNoPlanPage onExplore={onExplore} />;
  }

  const currentIndex = Math.max(
    0,
    (plans || []).findIndex((p) => p.programId === (selectedProgramId || program?.id || ""))
  );
  const totalPlans = plans && plans.length > 0 ? plans.length : 1;

  const handlePrevPlan = () => {
    if (plans && plans.length > 1) {
      const prevIdx = (currentIndex - 1 + plans.length) % plans.length;
      if (plans[prevIdx]) {
        onSelectPlan?.(plans[prevIdx].programId);
      }
    }
  };

  const handleNextPlan = () => {
    if (plans && plans.length > 1) {
      const nextIdx = (currentIndex + 1) % plans.length;
      if (plans[nextIdx]) {
        onSelectPlan?.(plans[nextIdx].programId);
      }
    }
  };

  const communityUrl = safeHttpUrl(program?.communityLink);
  const destinationCommunityUrl =
    communityUrl ||
    buildConciergeWhatsAppUrl(
      `Hello Concierge, I would like to join the community group for: ${program?.title || "Program"}`
    );

  const handleConfirmCommunityProceed = () => {
    setShowCommunityModal(false);
    if (typeof window !== "undefined") {
      window.open(destinationCommunityUrl, "_blank", "noopener,noreferrer");
    }
  };

  const isUpcoming = !isStandalone && !!program?.isUpcoming;
  const activeWidget: 0 | 1 | 2 = isStandalone
    ? widgetIndex === 0
      ? 1
      : widgetIndex
    : isUpcoming
      ? 0
      : widgetIndex;

  const handleWidgetTouchStart = (e: React.TouchEvent) => {
    if (isFeatureLocked) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleWidgetTouchEnd = (e: React.TouchEvent) => {
    if (isFeatureLocked || isUpcoming || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    // Only switch tabs on clear, deliberate horizontal swipes (not vertical scrolling)
    const minTab = isStandalone ? 1 : 0;
    const maxTab = isStandalone ? 2 : 1;
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      if (deltaX < -80) {
        setWidgetIndex((prev) => (prev < maxTab ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else if (deltaX > 80) {
        setWidgetIndex((prev) => (prev > minTab ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }
  };

  const showSubtabs = isStandalone || !!program;
  const subtabs = isStandalone
    ? ([
        { index: 1 as const, label: t.myPlan.subtabTasks, count: pendingTasksCount },
        { index: 2 as const, label: t.myPlan.subtabMetrics, count: 0 },
      ] as const)
    : isUpcoming
      ? ([{ index: 0 as const, label: t.myPlan.subtabGuides, count: 0 }] as const)
      : ([
          { index: 1 as const, label: isId ? "Latihan" : "Training", count: pendingTasksCount },
          { index: 0 as const, label: t.myPlan.subtabGuides, count: 0 },
        ] as const);

  const displayName = (userName || "Member").trim() || "Member";
  const totalProgramDays = program?.totalDays || program?.durationDays || fullProgramDays.length || 0;
  const displayDayNumber = currentDayNumber > 0 ? currentDayNumber : 1;

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* 0. Top Control Bar: Program Index Switcher (when active) side-by-side with Date Picker */}
      <div className="w-full flex items-center justify-between gap-2">
        {!isStandalone && program ? (
          <div className="flex-1 min-w-0 flex items-center justify-between gap-1 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10 p-1">
            <button
              type="button"
              onClick={handlePrevPlan}
              disabled={!plans || plans.length <= 1}
              aria-label="Previous program"
              className="w-8 h-8 rounded-xl hover:bg-zinc-300/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center justify-center shrink-0 disabled:opacity-25 transition active:scale-95 cursor-pointer disabled:cursor-default"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onViewAllPrograms || onExplore}
              title="All my programs"
              className="flex-1 min-w-0 h-8 px-1.5 rounded-xl hover:bg-zinc-300/40 dark:hover:bg-white/[0.06] flex items-center justify-center transition active:scale-[0.99] cursor-pointer"
            >
              <span className="text-xs sm:text-sm font-geometric font-semibold text-zinc-950 dark:text-white truncate leading-normal">
                {program.title}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNextPlan}
              disabled={!plans || plans.length <= 1}
              aria-label="Next program"
              className="w-8 h-8 rounded-xl hover:bg-zinc-300/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center justify-center shrink-0 disabled:opacity-25 transition active:scale-95 cursor-pointer disabled:cursor-default"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Date Picker Box (side-by-side with Program Index, always accessible even when no program) */}
        {!isStandalone || isSubscribed ? (
          <button
            type="button"
            onClick={() => {
              const w = getWibCalendarDate(getProgramDayDate(activeSelectedDay));
              setCalendarMonth(new Date(w.year, w.month, 1));
              setShowCalendarModal(true);
            }}
            aria-label="Select date from calendar"
            className="group h-10 px-3 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] hover:bg-zinc-300/60 dark:hover:bg-white/[0.08] border border-zinc-200/60 dark:border-white/10 inline-flex items-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
            <span className="text-xs font-geometric font-semibold text-zinc-950 dark:text-white leading-tight whitespace-nowrap">
              {activeFullDateStr}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        ) : (
          <span className="h-10 px-3 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10 inline-flex items-center gap-1.5 text-xs font-geometric font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 whitespace-nowrap opacity-65">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{activeFullDateStr}</span>
          </span>
        )}
      </div>

      {/* 1. Hero Visual: Simple Human Body Visual (Home) vs Program Cover Banner (Program Detail) */}
      {isStandalone ? (
        <section className="relative w-full rounded-3xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/70 dark:border-white/10 min-h-[195px] sm:min-h-[215px] flex items-center justify-center p-5 sm:p-6 overflow-hidden">
          {/* Subtle minimal concentric ring backdrop */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-full border border-zinc-300/60 dark:border-white/[0.08]" />
            <div className="absolute w-52 h-52 sm:w-56 sm:h-56 rounded-full border border-zinc-300/35 dark:border-white/[0.04]" />
          </div>

          {/* Minimalist Subscription / Active Badge (Top-Left) */}
          <div className="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 dark:bg-white/[0.07] border border-zinc-200/70 dark:border-white/10">
            {!isFeatureLocked ? (
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <span className="text-[10px] font-mono font-semibold text-zinc-700 dark:text-zinc-200 leading-none">
              {!isFeatureLocked
                ? activeEnrolledPrograms.length > 0
                  ? isId
                    ? `${activeEnrolledPrograms.length} Program Aktif`
                    : `${activeEnrolledPrograms.length} Active ${activeEnrolledPrograms.length === 1 ? "Plan" : "Plans"}`
                  : isId
                    ? `Pass Aktif · ${trackingAccess?.daysRemaining ?? 0}h`
                    : `Active Pass · ${trackingAccess?.daysRemaining ?? 0}d`
                : isId
                  ? "Belum Berlangganan"
                  : "Not Subscribed"}
            </span>
          </div>

          {/* Clean Minimalist Human Body Silhouette (SVG) */}
          <svg
            viewBox="0 0 120 220"
            className="relative z-10 h-40 sm:h-44 w-auto text-zinc-900 dark:text-white/90"
            fill="none"
            role="img"
            aria-label={isId ? "Visual tubuh" : "Body visual"}
          >
            {/* Head */}
            <circle
              cx="60"
              cy="28"
              r="14"
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeWidth="2.4"
            />
            {/* Neck & Shoulders + Torso + Arms + Legs (minimal continuous silhouette) */}
            <path
              d="M52 44 C52 47 48 49 41 51 C32 53 26 60 24 70 L18 112 C17 117 20 120 24 120 C27 120 30 117 31 112 L36 78 L38 78 L37 118 L34 196 C34 202 38 206 43 206 C48 206 51 202 52 196 L57 136 L63 136 L68 196 C69 202 72 206 77 206 C82 206 86 202 86 196 L83 118 L82 78 L84 78 L89 112 C90 117 93 120 96 120 C100 120 103 117 102 112 L96 70 C94 60 88 53 79 51 C72 49 68 47 68 44"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Subtle center alignment line */}
            <line
              x1="60"
              y1="56"
              x2="60"
              y2="122"
              stroke="currentColor"
              strokeOpacity="0.22"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              strokeLinecap="round"
            />
          </svg>
        </section>
      ) : (
        <section className="relative w-full rounded-3xl bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-white/10 min-h-[195px] sm:min-h-[225px] flex flex-col justify-between p-4 sm:p-6 text-white">
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            {program?.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={program.coverImage} alt="" className="w-full h-full object-cover object-center" />
            ) : (
              <div className="w-full h-full bg-zinc-800" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />
          </div>

          {/* Top Row: Community Profile/Logo */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-white/15 max-w-[75%] min-w-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
            >
              {program?.organizationLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={program.organizationLogo}
                  alt={program.organizationName || "Community"}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white">
                  <Users className="w-3 h-3" />
                </span>
              )}
              <span className="text-xs font-semibold text-white truncate leading-tight">
                {program?.organizationName || program?.coachName || "Community"}
              </span>
            </div>
          </div>

          {/* Bottom Row: Type + Sports + Boxed Day X of Y (Left) & Menu Button (Right) */}
          <div className="relative z-20 flex items-end justify-between gap-2 pt-8">
            <div className="flex flex-col items-start gap-2 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15 text-[11px] font-mono font-semibold text-white/95 tracking-wide shrink-0"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
                >
                  {(program?.locationType || "ONLINE").toUpperCase() === "HYBRID"
                    ? "Hybrid"
                    : (program?.locationType || "").toUpperCase() === "ONSITE"
                      ? "Onsite"
                      : "Online"}
                </span>

                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15 text-[11px] font-mono font-semibold text-white/95 tracking-wide shrink-0"
                  style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
                >
                  {program?.category || (locale === "id" ? "Olahraga" : "Sports")}
                </span>
              </div>

              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15 text-[11px] font-mono font-semibold text-white/95 tracking-wide max-w-full"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
              >
                <span className="whitespace-nowrap">
                  {locale === "id"
                    ? `Hari ke-${activeDayNum} dari ${Math.max(totalProgramDays, activeDayNum)}`
                    : `Day ${activeDayNum} of ${Math.max(totalProgramDays, activeDayNum)}`}
                </span>
                <span className="text-white/50 select-none">·</span>
                <span className="truncate">{activeDayTypeLabel}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Subscription Lock Notice (shown only when standalone & not subscribed) */}
      {isFeatureLocked && (
        <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.05] border border-zinc-300/70 dark:border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </span>
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white">
                {isId ? "Berlangganan untuk Membuka Semua Fitur" : "Subscribe to Unlock All Features"}
              </p>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {isId
                  ? "Sleep, Meal, Water, Daily Steps, More Training & Metrics dapat digunakan setelah berlangganan Tracking Pass atau mengikuti Program Coach."
                  : "Sleep, Meal, Water, Daily Steps, More Training & Metrics unlock once you subscribe to Tracking Pass or join a Coach Program."}
              </p>
            </div>
          </div>

          {primaryPassPlan && onSelectTrackingPass ? (
            <button
              type="button"
              disabled={checkoutLoadingPlanId === primaryPassPlan.id}
              onClick={() => onSelectTrackingPass(primaryPassPlan.id)}
              className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {checkoutLoadingPlanId === primaryPassPlan.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isId ? "Aktifkan Langganan" : "Subscribe Now"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExplore}
              className="px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isId ? "Explore Program" : "Explore Programs"}</span>
            </button>
          )}
        </div>
      )}

      {/* 3 & 4. Subtabs + Content Widgets (Dimmed & Non-Interactive when not subscribed in standalone mode) */}
      <div
        aria-disabled={isFeatureLocked || undefined}
        className={
          isFeatureLocked
            ? "space-y-4 sm:space-y-5 opacity-45 grayscale-[25%] select-none pointer-events-none"
            : "space-y-4 sm:space-y-5"
        }
      >
        {showSubtabs && (
          <div
            role="tablist"
            aria-label="Program sections"
            className={`rounded-xl p-1 bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10 grid gap-1 ${
              isUpcoming ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            {subtabs.map(({ index, label, count }) => {
              const active = activeWidget === index;
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={isFeatureLocked}
                  tabIndex={isFeatureLocked ? -1 : undefined}
                  onClick={() => {
                    if (isFeatureLocked) return;
                    setWidgetIndex(index);
                  }}
                  className={`h-9 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed ${
                    active
                      ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      aria-label="Incomplete tasks"
                      className="semantic-badge-box w-2 h-2 rounded-full bg-[var(--semantic-red-dot)] shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* 4. Respective content widgets */}
        <div
          onTouchStart={handleWidgetTouchStart}
          onTouchEnd={handleWidgetTouchEnd}
          className="transition-all duration-200"
        >
          {!isStandalone && program && (
            <div className={activeWidget === 0 ? "block" : "hidden"}>
              <ProgramPreparationWidgets
                program={program}
                days={fullProgramDays}
                currentDayId={day?.id}
                onSwitchWidget={setWidgetIndex}
                onOpenReport={() => setShowReportModal(true)}
              />
            </div>
          )}

          {!isUpcoming && (
            <>
              <div className={activeWidget === 1 ? "block space-y-5" : "hidden"}>
                {/* Home Training Section: 1 widget card per enrolled program (or Explore CTA if none) */}
                {isStandalone && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <span className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                        {isId ? "Latihan Program" : "Training"}
                      </span>
                      {enrolledPrograms.length > 0 && onViewAllPrograms && (
                        <button
                          type="button"
                          onClick={onViewAllPrograms}
                          className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-0.5 transition cursor-pointer"
                        >
                          <span>{isId ? "Semua" : "All"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {activeEnrolledPrograms.length > 0 ? (
                      <div className="space-y-2.5">
                        {activeEnrolledPrograms.map((prog) => {
                          const dayType = (prog.todayDayType || "").toUpperCase();
                          const isRest = dayType === "REST_DAY";
                          const isConnect = dayType !== "TRAINING_DAY" && dayType !== "REST_DAY" && Boolean(dayType);
                          const DayIcon = isRest ? Heart : isConnect ? Users : Dumbbell;
                          const dayTypeLabel = prog.isUpcoming
                            ? isId
                              ? "Segera Dimulai"
                              : "Upcoming"
                            : isRest
                              ? isId
                                ? "Hari Istirahat"
                                : "Rest Day"
                              : isConnect
                                ? isId
                                  ? "Hari Pertemuan"
                                  : "Connect Day"
                                : isId
                                  ? "Hari Latihan"
                                  : "Training Day";
                          const hasPending = !prog.isUpcoming && (prog.pendingTasksCount ?? 0) > 0;
                          const isDoneToday = !prog.isUpcoming && !hasPending && (prog.currentDayNumber || 0) > 0;

                          return (
                            <button
                              key={prog.programId}
                              type="button"
                              onClick={() => onOpenProgram?.(prog.programId)}
                              className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] hover:bg-[#e5e5e2] dark:hover:bg-white/[0.07] border border-zinc-200/60 dark:border-white/10 p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left transition active:scale-[0.99] cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 dark:bg-white/10 text-white shrink-0 flex items-center justify-center">
                                  {prog.coverImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={prog.coverImage}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <DayIcon className="w-5 h-5" />
                                  )}
                                  {hasPending && (
                                    <span
                                      aria-label="Pending training"
                                      className="semantic-badge-box absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[var(--semantic-red-dot)] ring-2 ring-[#ececea] dark:ring-[#18181b]"
                                    />
                                  )}
                                  {isDoneToday && (
                                    <span
                                      aria-label="Completed"
                                      className="semantic-badge-box absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--semantic-green)] text-white flex items-center justify-center"
                                    >
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </span>
                                  )}
                                </div>

                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-sm font-semibold text-zinc-950 dark:text-white truncate leading-snug">
                                    {prog.title}
                                  </p>
                                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                                    {prog.isUpcoming
                                      ? dayTypeLabel
                                      : `${isId ? "Hari" : "Day"} ${prog.currentDayNumber || 1}/${Math.max(prog.totalDays || prog.dayCount || 1, prog.currentDayNumber || 1)} · ${dayTypeLabel}`}
                                  </p>
                                </div>
                              </div>

                              <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onExplore}
                        className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] hover:bg-[#e5e5e2] dark:hover:bg-white/[0.07] border border-zinc-200/60 dark:border-white/10 p-4 flex items-center justify-between gap-3 text-left transition active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-10 h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4" />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-xs sm:text-sm font-semibold text-zinc-950 dark:text-white truncate">
                              {isId ? "Jelajahi Program Training" : "Explore Training Programs"}
                            </p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {isId
                                ? "Belum ada program aktif · Ikuti program coach pilihan"
                                : "No active programs · Discover guided coach cohorts"}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                      </button>
                    )}
                  </div>
                )}

                {isStandalone && (
                  <div className="px-0.5 pt-1">
                    <span className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                      {isId ? "Kebiasaan Harian" : "Daily Habits"}
                    </span>
                  </div>
                )}

                {day ? (
                  <DailyCheckIn
                    key={day.id}
                    day={day}
                    pastDays={historyDays}
                    allProgramDays={allProgramDays}
                    communityLink={program?.communityLink}
                    coachName={program?.coachName}
                    onOpenCommunity={() => setShowCommunityModal(true)}
                    programTitle={program?.title || "Daily Wellness"}
                    programVenueAddress={program?.venueAddress}
                    locked={isFeatureLocked ? true : locked}
                    isAnytime={!hasCalendarSchedule}
                    isStandalone={isStandalone}
                    isProgramOnly={!isStandalone}
                    isFeatureLocked={isFeatureLocked}
                    activities={activities}
                    checks={checks}
                    initialDone={initialDone}
                    onToggleCheck={onToggleCheck}
                    onSyncChecklist={onSyncChecklist}
                    onSelectWorkout={onSelectWorkout}
                    onOpenVideo={onOpenVideo}
                    onSaveSleep={onSaveSleep}
                    onSaveAttendance={onSaveAttendance}
                    onSaveWorkoutNotes={onSaveWorkoutNotes}
                    onSaveMeal={onSaveMeal}
                    onSaveWater={onSaveWater}
                    onSaveSteps={onSaveSteps}
                    onLogSelfBodyWeight={onLogSelfBodyWeight}
                    latestWeightKg={
                      [...bodyMetricLogs]
                        .filter((m) => typeof m.weightKg === "number" && m.weightKg > 20 && m.weightKg < 300)
                        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]
                        ?.weightKg ?? null
                    }
                    onAddExtraWorkout={onAddExtraWorkout}
                    onUpdateExtraWorkout={onUpdateExtraWorkout}
                    onDeleteExtraWorkout={onDeleteExtraWorkout}
                    overlappingTrainingCount={overlappingTrainingCount}
                    onSaveReflection={onSaveReflection}
                    onCompleteDay={onCompleteDay}
                    onCustomTaskSubmitted={onCustomTaskSubmitted}
                    widgetIndex={widgetIndex}
                    onSwitchWidget={setWidgetIndex}
                    selectedDayId={selectedDayId}
                    onSelectDayId={setSelectedDayId}
                  />
                ) : (
                  <EmptyState title={t.myPlan.noTasksToday} description={t.myPlan.noTasksTodayDesc} />
                )}
              </div>

              <div className={activeWidget === 2 ? "block space-y-5" : "hidden"}>
                <CohortPerformanceCard
                  days={fullProgramDays}
                  globalMonthlyDays={globalMonthlyDays}
                  currentDayNumber={currentDayNumber}
                  bodyMetricLogs={bodyMetricLogs}
                  programId={program?.id || "standalone-wellness"}
                  userGender={userGender}
                  userAge={userAge}
                  onOpenGrowthAnalytics={onOpenGrowthAnalytics}
                  onSwitchWidget={setWidgetIndex}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Calendar Date Picker Modal (Triggered by clicking date on Image Banner) */}
      {showCalendarModal &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const viewYear = calendarMonth.getFullYear();
            const viewMonth = calendarMonth.getMonth();
            const monthLabel = new Intl.DateTimeFormat(
              locale === "id" ? "id-ID" : "en-US",
              { month: "long", year: "numeric" }
            ).format(calendarMonth);

            const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

            const dayByYmd = new Map<string, PlanDay>();
            for (const pd of sortedProgramDays) {
              const w = getWibCalendarDate(getProgramDayDate(pd));
              const key = `${w.year}-${w.month}-${w.date}`;
              if (!dayByYmd.has(key)) {
                dayByYmd.set(key, pd);
              }
            }

            return (
              <div
                onClick={() => setShowCalendarModal(false)}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Select program date"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-3xl bg-[#f6f6f4] dark:bg-[#161616] border border-zinc-200 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
                >
                  {/* Header: Month Navigation + Today & Close */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth(new Date(viewYear, viewMonth - 1, 1))
                        }
                        aria-label="Previous month"
                        className="w-8 h-8 rounded-xl bg-[#ececea] dark:bg-white/10 hover:bg-zinc-300/70 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-2 text-sm font-geometric font-semibold text-zinc-950 dark:text-white">
                        {monthLabel}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarMonth(new Date(viewYear, viewMonth + 1, 1))
                        }
                        aria-label="Next month"
                        className="w-8 h-8 rounded-xl bg-[#ececea] dark:bg-white/10 hover:bg-zinc-300/70 dark:hover:bg-white/15 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {day && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDayId(day.id);
                            setShowCalendarModal(false);
                          }}
                          className="h-8 px-2.5 rounded-xl bg-[#ececea] dark:bg-white/10 hover:bg-zinc-300/70 text-[11px] font-mono font-semibold text-zinc-900 dark:text-white transition cursor-pointer"
                        >
                          Today
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCalendarModal(false)}
                        aria-label="Close calendar"
                        className="w-8 h-8 rounded-xl bg-[#ececea] dark:bg-white/10 hover:bg-zinc-300/70 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Column Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>

                  {/* 7-Column Month Dates Grid */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: totalCells }, (_, idx) => {
                      const dateNum = idx - firstWeekday + 1;
                      if (dateNum < 1 || dateNum > daysInMonth) {
                        return <div key={`empty-${idx}`} className="h-11 rounded-xl" />;
                      }

                      const key = `${viewYear}-${viewMonth}-${dateNum}`;
                      const matchedDay = dayByYmd.get(key);
                      const isSelected =
                        !!matchedDay && matchedDay.id === activeSelectedDay?.id;
                      const isTodayCell = !!matchedDay && matchedDay.id === day?.id;

                      if (!matchedDay) {
                        return (
                          <div
                            key={key}
                            className="h-10 rounded-xl flex items-center justify-center text-xs font-mono text-zinc-300 dark:text-zinc-700 select-none"
                          >
                            <span>{dateNum}</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setSelectedDayId(matchedDay.id);
                            setShowCalendarModal(false);
                          }}
                          className={`h-10 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer relative ${
                            isSelected
                              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-semibold shadow-xs"
                              : isTodayCell
                              ? "bg-zinc-300/80 dark:bg-white/20 text-zinc-950 dark:text-white font-semibold"
                              : "bg-[#ececea] dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-200 hover:bg-zinc-300/60 dark:hover:bg-white/10"
                          }`}
                        >
                          <span className="text-xs font-mono leading-none">
                            {dateNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })(),
          document.body
        )}

      {/* External Community Disclaimer Modal */}
      {showCommunityModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div className="relative w-full max-w-sm bg-white dark:bg-[#161616] border border-zinc-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-white/10 border border-zinc-200 dark:border-white/15 text-zinc-950 dark:text-white flex items-center justify-center mx-auto shadow-2xs">
                <Shield className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {t.myPlan.communityModalTitle}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {t.myPlan.communityModalDesc}
                </p>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/70 dark:border-white/10 text-left text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {t.myPlan.communityModalNote} {BRAND.name}.
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmCommunityProceed}
                  className="w-full h-10 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold active:scale-[0.98] transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>{t.myPlan.continueExternal}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCommunityModal(false)}
                  className="w-full h-9 rounded-xl text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition"
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {showReportModal && (
        <ProgramReportPageView
          programId={program?.id}
          programTitle={program?.title}
          communityLink={program?.communityLink}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}

