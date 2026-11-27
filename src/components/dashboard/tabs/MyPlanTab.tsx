"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Dumbbell,
  ExternalLink,
  Heart,
  Loader2,
  Lock,
  MessageCircle,
  Shield,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
import type { TrackingAccessStatusDTO } from "@/wellness/services/tracking-entitlement";
import type { TrackingPassPlanDTO } from "@/wellness/actions/tracking-pass";
import { getWibCalendarDate } from "@/wellness/utils/timezone";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import { DailyCheckIn } from "./DailyCheckIn";
import {
  FillDumbbellIcon,
  FillHeartIcon,
  FillLockIcon,
  FillUsersIcon,
} from "./sharedFillIcons";
import { BodyProgressWidget, type BodyMetricPoint } from "./BodyProgressWidget";
import {
  BrandWordmark,
  EmptyState,
  FloatingHeader,
  HeaderBackButton,
  HeaderProfileButton,
  type HeaderProfileMenuActions,
  getModalPortalRoot,
  safeHttpUrl,
} from "./shared";
import { MyPlanIndex } from "./my-plan/MyPlanIndex";
import { BodyChatHero } from "./my-plan/BodyChatHero";
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
  deriveBodySignals,
  evaluateDayTaskState,
  formatStartsIn,
  type BodySignal,
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
  onOpenProgramTask,
  onBackToHome,
  autoOpenTaskNonce,
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
    extra?: { selectedWorkout?: string; checklistCompleted?: string[]; videoWatched?: boolean }
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
  onOpenProgramTask?: (programId: string) => void;
  onBackToHome?: () => void;
  autoOpenTaskNonce?: number;
}) {
  const { locale, t } = useLocale();
  const isId = locale === "id";
  const activeEnrolledPrograms = enrolledPrograms.filter((p) => !p.isCompleted);
  const isFeatureLocked = isStandalone && !isSubscribed && activeEnrolledPrograms.length === 0;
  const primaryPassPlan = trackingPassPlans[0] ?? null;

  const { checks, activities, initialDone, pendingTasksCount: rawPendingCount } = evaluateDayTaskState(day, checklist);
  const programTodayTotalTasks = activeEnrolledPrograms.reduce(
    (acc, p) => acc + (p.todayTotalTasksCount ?? 0),
    0
  );
  const programTodayCompletedTasks = activeEnrolledPrograms.reduce(
    (acc, p) => acc + (p.todayCompletedTasksCount ?? 0),
    0
  );
  const programTodayPendingTasks = Math.max(0, programTodayTotalTasks - programTodayCompletedTasks);
  const standalonePendingCount =
    (initialDone[0] ? 0 : 1) +
    (initialDone[2] ? 0 : 1) +
    (initialDone[3] ? 0 : 1) +
    ((day?.userProgress?.stepsCount ?? 0) > 0 ? 0 : 1) +
    programTodayPendingTasks;
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
  const [datePageOffset, setDatePageOffset] = useState<number>(0);
  const dateStripTouchXRef = useRef<number | null>(null);
  const [programTypeFilter, setProgramTypeFilter] = useState<"all" | "online" | "hybrid">("all");
  const [programStatusFilter, setProgramStatusFilter] = useState<"todo" | "done">("todo");
  const [habitOpenRequest, setHabitOpenRequest] = useState<{
    habit: "sleep" | "meal" | "water" | "steps";
    nonce: number;
  } | null>(null);
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

  const localeTag = locale === "id" ? "id-ID" : "en-GB";

  // Build 5-dates-per-page chunks aligned so offset 0 always shows the 5 most recent days ending on Today
  const homeDatePages = useMemo(() => {
    const DAYS_PER_PAGE = 5;
    const sourceDays: PlanDay[] =
      sortedProgramDays.length > 0
        ? sortedProgramDays
        : Array.from({ length: DAYS_PER_PAGE }, (_, idx) => {
            const dt = new Date(Date.now() - (DAYS_PER_PAGE - 1 - idx) * 86400000);
            const w = getWibCalendarDate(dt);
            const key = `${w.year}-${String(w.month + 1).padStart(2, "0")}-${String(w.date).padStart(2, "0")}`;
            return {
              id: `fallback-${key}`,
              dayNumber: idx + 1,
              title: "Daily Wellness",
              dayType: "REST_DAY",
              unlockDate: dt.toISOString(),
              isCalendarUnlocked: true,
              isPast2359: idx < DAYS_PER_PAGE - 1,
              videoUrl: null,
              videoChecklist: [],
              mealRecommendation: null,
              meetupLink: null,
              onsiteVenue: null,
              onsiteSchedule: null,
              restInstructions: null,
              customTasks: [],
              userProgress: null,
            } as PlanDay;
          });

    const pages: PlanDay[][] = [];
    for (let end = sourceDays.length; end > 0; end -= DAYS_PER_PAGE) {
      const start = Math.max(0, end - DAYS_PER_PAGE);
      pages.push(sourceDays.slice(start, end));
    }
    return pages; // index 0 = newest 5 days, index 1 = previous 5 days, ...
  }, [sortedProgramDays]);

  const maxDatePageOffset = Math.max(0, homeDatePages.length - 1);
  const safeDatePageOffset = Math.min(datePageOffset, maxDatePageOffset);
  const visibleHomeDates = homeDatePages[safeDatePageOffset] ?? [];

  const bannerRefDay = isStandalone ? activeSelectedDay : day || activeSelectedDay;
  const activeDayNum = bannerRefDay?.dayNumber || baseTodayDayNum;
  const activeDayTypeLabel =
    bannerRefDay?.dayType === "TRAINING_DAY"
      ? locale === "id"
        ? "Hari Latihan"
        : "Training Day"
      : bannerRefDay?.dayType === "REST_DAY"
        ? locale === "id"
          ? "Hari Istirahat"
          : "Rest Day"
        : locale === "id"
          ? "Hari Pertemuan"
          : "Meetup Day";
  void activeDayTypeLabel;

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
      ? ([{ index: 0 as const, label: "Info", count: 0 }] as const)
      : ([
          { index: 1 as const, label: t.myPlan.subtabTasks, count: pendingTasksCount },
          { index: 0 as const, label: "Info", count: 0 },
        ] as const);

  const bannerTodayFocusTitle =
    bannerRefDay?.title?.trim() ||
    (bannerRefDay?.dayType === "TRAINING_DAY"
      ? isId
        ? "Latihan Terjadwal & Pemulihan Aktif"
        : "Scheduled Training & Active Conditioning"
      : activeSelectedDay?.dayType === "REST_DAY"
        ? isId
          ? "Pemulihan Tubuh, Tidur & Nutrisi"
          : "Full Body Recovery, Sleep & Nutrition"
        : isId
          ? "Sesi Komunitas & Evaluasi Bersama"
          : "Community Session & Cohort Check-In");

  const filteredActivePrograms = activeEnrolledPrograms.filter((prog) => {
    if (programTypeFilter !== "all") {
      const loc = (prog.locationType || "ONLINE").toUpperCase();
      if (programTypeFilter === "online" && loc !== "ONLINE") return false;
      if (programTypeFilter === "hybrid" && loc !== "HYBRID" && loc !== "ONSITE") return false;
    }
    const hasPending = !prog.isUpcoming && (prog.pendingTasksCount ?? 0) > 0;
    const isDoneToday = !prog.isUpcoming && !hasPending && (prog.currentDayNumber || 0) > 0;
    if (programStatusFilter === "done") return isDoneToday;
    return !isDoneToday;
  });

  const displayName = (userName || "Member").trim() || "Member";
  const totalProgramDays = program?.totalDays || program?.durationDays || fullProgramDays.length || 0;
  const displayDayNumber = currentDayNumber > 0 ? currentDayNumber : 1;

  const bodySignals = deriveBodySignals({
    day: activeSelectedDay,
    activePrograms: activeEnrolledPrograms,
    isFeatureLocked,
    isId,
    totalPendingTasks: pendingTasksCount,
  });

  const handleTriggerBodySignal = (signal: BodySignal) => {
    if (isFeatureLocked) return;
    if (signal.action === "program" && signal.programId) {
      onOpenProgram?.(signal.programId);
      return;
    }
    if (signal.action === "training" && signal.programId) {
      (onOpenProgramTask || onOpenProgram)?.(signal.programId);
      return;
    }
    if (
      signal.action === "sleep" ||
      signal.action === "water" ||
      signal.action === "meal" ||
      signal.action === "steps"
    ) {
      setWidgetIndex(1);
      setHabitOpenRequest({ habit: signal.action, nonce: Date.now() });
    }
  };



  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* 0. Home Top 5-Dates-Per-Page Strip (Strictly stacked: Year -> Month -> Date) */}
      {isStandalone && (
        <div
          onTouchStart={(e) => {
            e.stopPropagation();
            if (isFeatureLocked) return;
            dateStripTouchXRef.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (isFeatureLocked || dateStripTouchXRef.current === null) return;
            const dx = e.changedTouches[0].clientX - dateStripTouchXRef.current;
            dateStripTouchXRef.current = null;
            if (dx > 50 && safeDatePageOffset < maxDatePageOffset) {
              setDatePageOffset((p) => Math.min(maxDatePageOffset, p + 1));
            } else if (dx < -50 && safeDatePageOffset > 0) {
              setDatePageOffset((p) => Math.max(0, p - 1));
            }
          }}
          className={`w-full flex items-center gap-1 sm:gap-2 select-none ${
            isFeatureLocked ? "opacity-65 pointer-events-none" : ""
          }`}
        >
          <button
            type="button"
            disabled={isFeatureLocked || safeDatePageOffset >= maxDatePageOffset}
            onClick={() => setDatePageOffset((p) => Math.min(maxDatePageOffset, p + 1))}
            aria-label={isId ? "5 tanggal sebelumnya" : "Previous 5 dates"}
            className="w-8 h-12 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white disabled:opacity-25 transition cursor-pointer disabled:cursor-default shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 grid grid-cols-5 gap-1 sm:gap-2">
            {visibleHomeDates.map((dItem) => {
              const itemDate = getProgramDayDate(dItem);
              const yearStr = new Intl.DateTimeFormat(localeTag, {
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }).format(itemDate);
              const monthStr = new Intl.DateTimeFormat(localeTag, {
                month: "short",
                timeZone: "Asia/Jakarta",
              }).format(itemDate);
              const dayDateStr = new Intl.DateTimeFormat(localeTag, {
                day: "2-digit",
                timeZone: "Asia/Jakarta",
              }).format(itemDate);
              const isSelected = dItem.id === activeSelectedDay?.id;

              return (
                <button
                  key={dItem.id}
                  type="button"
                  disabled={isFeatureLocked}
                  onClick={() => setSelectedDayId(dItem.id)}
                  aria-pressed={isSelected}
                  aria-label={`${yearStr} ${monthStr} ${dayDateStr}`}
                  className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center text-center transition cursor-pointer disabled:cursor-default ${
                    isSelected
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "bg-transparent hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] text-zinc-950 dark:text-white active:scale-95"
                  }`}
                >
                  <span
                    className={`text-[10px] font-geometric font-medium tabular-nums leading-none ${
                      isSelected
                        ? "text-white/70 dark:text-zinc-500"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    {yearStr}
                  </span>
                  <span
                    className={`text-[11px] font-geometric font-semibold uppercase tracking-[0.06em] leading-none mt-1 ${
                      isSelected
                        ? "text-white/90 dark:text-zinc-700"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {monthStr}
                  </span>
                  <span
                    className={`text-lg sm:text-xl font-geometric font-semibold tabular-nums leading-none mt-1 ${
                      isSelected
                        ? "text-white dark:text-zinc-950"
                        : "text-zinc-950 dark:text-white"
                    }`}
                  >
                    {dayDateStr}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isFeatureLocked || safeDatePageOffset <= 0}
            onClick={() => setDatePageOffset((p) => Math.max(0, p - 1))}
            aria-label={isId ? "5 tanggal berikutnya" : "Next 5 dates"}
            className="w-8 h-12 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white disabled:opacity-25 transition cursor-pointer disabled:cursor-default shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Hero Visual: Interactive "Listen to your body" Silhouette + Signals (Home) vs Program Cover Banner (Program Detail) */}
      {isStandalone ? (
        <BodyChatHero
          signals={bodySignals}
          isId={isId}
          isFeatureLocked={isFeatureLocked}
          onAccept={handleTriggerBodySignal}
        />
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

          {/* Top Row: Community Profile/Logo (Date removed per clean Program Banner design) */}
          <div className="relative z-10 flex items-center justify-start gap-2">
            <div
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-white/15 max-w-[80%] min-w-0"
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

          {/* Bottom Row: Today's Focus + Day X of Y Progress Bar */}
          <div className="relative z-20 flex flex-col items-start gap-2.5 pt-7 w-full">
            <div className="space-y-0.5 max-w-full">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/70 block">
                {isId ? "Fokus Hari Ini" : "Today's Focus"}
              </span>
              <h2 className="text-base sm:text-lg font-geometric font-semibold text-white leading-snug line-clamp-2">
                {bannerTodayFocusTitle}
              </h2>
            </div>

            {(() => {
              const total = Math.max(totalProgramDays, activeDayNum, 1);
              const pct = Math.min(100, Math.max(0, Math.round((activeDayNum / total) * 100)));
              return (
                <div className="w-full space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-white/85">
                    <span>
                      {isId ? `Hari ${activeDayNum} dari ${total}` : `Day ${activeDayNum} of ${total}`}
                    </span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Program progress Day ${activeDayNum} of ${total}`}
                    className="w-full h-1.5 rounded-full bg-white/25 overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-white transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}
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
                onOpenCommunity={() => setShowCommunityModal(true)}
              />
            </div>
          )}

          {!isUpcoming && (
            <>
              <div className={activeWidget === 1 ? "block space-y-5" : "hidden"}>
                {/* 1 & 2. Daily Tasks Progress / day + Sleep, Meal, Water, Steps (or Program-only tasks in detail view) */}
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
                    extraTotalTasks={isStandalone ? programTodayTotalTasks : 0}
                    extraCompletedTasks={isStandalone ? programTodayCompletedTasks : 0}
                    autoOpenProgramTaskNonce={!isStandalone ? autoOpenTaskNonce : 0}
                    autoOpenHabitRequest={isStandalone ? habitOpenRequest : null}
                    nextPendingProgram={
                      isStandalone
                        ? (() => {
                            const nextProg = activeEnrolledPrograms.find(
                              (p) => !p.isUpcoming && !p.isCompleted && !p.todayCoreTaskDone
                            );
                            if (!nextProg) return null;
                            const dt = (nextProg.todayDayType || "").toUpperCase();
                            const taskTitle =
                              dt === "REST_DAY"
                                ? "Rest Activity"
                                : dt && dt !== "TRAINING_DAY"
                                  ? "Connect"
                                  : "Online Training";
                            return {
                              programId: nextProg.programId,
                              title: nextProg.title,
                              taskTitle,
                            };
                          })()
                        : null
                    }
                    onOpenProgramTask={onOpenProgramTask || onOpenProgram}
                    onBackToHome={!isStandalone ? onBackToHome : undefined}
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

                {/* 3. Enrolled Programs List with inline Mode (All/Online/Hybrid) & Status (All/To Do/Done) filters */}
                {isStandalone && (
                  <div className="space-y-3 pt-1">
                    {activeEnrolledPrograms.length > 0 && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div
                          role="tablist"
                          aria-label="Filter programs by mode"
                          className="inline-flex items-center gap-1 rounded-xl p-1 bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10"
                        >
                          {(
                            [
                              { key: "all", label: isId ? "Semua" : "All" },
                              { key: "online", label: "Online" },
                              { key: "hybrid", label: "Hybrid" },
                            ] as const
                          ).map(({ key, label }) => {
                            const active = programTypeFilter === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setProgramTypeFilter(key)}
                                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer ${
                                  active
                                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        <div
                          role="tablist"
                          aria-label="Filter programs by status"
                          className="inline-flex items-center gap-1 rounded-xl p-1 bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10"
                        >
                          {(
                            [
                              { key: "todo", label: isId ? "Belum" : "To Do" },
                              { key: "done", label: isId ? "Selesai" : "Done" },
                            ] as const
                          ).map(({ key, label }) => {
                            const active = programStatusFilter === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setProgramStatusFilter(key)}
                                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold transition active:scale-[0.98] cursor-pointer ${
                                  active
                                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeEnrolledPrograms.length > 0 ? (
                      filteredActivePrograms.length > 0 ? (
                        <div className="space-y-3">
                          {filteredActivePrograms.map((prog) => {
                            const dayType = (prog.todayDayType || "").toUpperCase();
                            const isRest = dayType === "REST_DAY";
                            const isConnect =
                              dayType !== "TRAINING_DAY" &&
                              dayType !== "REST_DAY" &&
                              Boolean(dayType);
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
                            const locLabel =
                              (prog.locationType || "ONLINE").toUpperCase() === "HYBRID"
                                ? "Hybrid"
                                : (prog.locationType || "").toUpperCase() === "ONSITE"
                                  ? "Onsite"
                                  : "Online";
                            const orgLabel = prog.organizationName || prog.coachName || "Community";
                            const metaLine = [orgLabel, prog.category || null, locLabel]
                              .filter(Boolean)
                              .join(" · ");
                            const isCoreDone = Boolean(prog.todayCoreTaskDone);
                            const isCorePending = !prog.isUpcoming && !isCoreDone;
                            const TaskFillIcon = prog.isUpcoming
                              ? FillLockIcon
                              : isRest
                                ? FillHeartIcon
                                : isConnect
                                  ? FillUsersIcon
                                  : FillDumbbellIcon;
                            const taskWidgetTitle = prog.isUpcoming
                              ? isId
                                ? "Segera"
                                : "Upcoming"
                              : isRest
                                ? "Rest Activity"
                                : isConnect
                                  ? "Connect"
                                  : "Online Training";
                            const taskWidgetDuration = prog.isUpcoming
                              ? isId
                                ? "Terkunci"
                                : "Locked"
                              : isRest || isConnect
                                ? "2 min"
                                : "15 min";

                            return (
                              <div
                                key={prog.programId}
                                className="relative w-full rounded-2xl overflow-hidden bg-zinc-900"
                              >
                                {/* Shared Full-Bleed Cover Image Background across both sides (bright, natural legibility scrim) */}
                                <div className="absolute inset-0 pointer-events-none">
                                  {prog.coverImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={prog.coverImage}
                                      alt=""
                                      className="w-full h-full object-cover object-center"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900" />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/10" />
                                </div>

                                <div className="relative z-10 grid grid-cols-[1fr_118px] sm:grid-cols-[1fr_144px] items-stretch gap-2.5 p-3 sm:p-3.5 min-h-[128px] sm:min-h-[136px]">
                                  {/* Left Side: Spacious Program Overview (Opens Program Detail) */}
                                  <button
                                    type="button"
                                    onClick={() => onOpenProgram?.(prog.programId)}
                                    className="group p-1 sm:p-1.5 flex flex-col justify-between text-left text-white min-w-0 transition active:opacity-85 cursor-pointer"
                                  >
                                    <span className="text-[11px] font-mono font-medium text-white/95 drop-shadow-xs truncate w-full">
                                      {prog.isUpcoming
                                        ? dayTypeLabel
                                        : `${isId ? "Hari" : "Day"} ${prog.currentDayNumber || 1}/${Math.max(prog.totalDays || prog.dayCount || 1, prog.currentDayNumber || 1)} · ${dayTypeLabel}`}
                                    </span>

                                    <div className="pt-4 w-full min-w-0 space-y-0.5">
                                      <p className="text-sm sm:text-base font-geometric font-semibold text-white drop-shadow-xs leading-snug line-clamp-2 group-hover:opacity-95">
                                        {prog.title}
                                      </p>
                                      <p className="text-[11px] font-sans text-white/85 drop-shadow-xs truncate">
                                        {metaLine}
                                      </p>
                                    </div>
                                  </button>

                                  {/* Right Side: Inset Today's Task Action Pod (1-Tap Direct Launch, no arrow) */}
                                  <button
                                    type="button"
                                    disabled={prog.isUpcoming}
                                    onClick={() =>
                                      (onOpenProgramTask || onOpenProgram)?.(prog.programId)
                                    }
                                    aria-label={`${taskWidgetTitle} - ${prog.title}`}
                                    className={`group relative w-full h-full rounded-xl p-3 flex flex-col justify-between text-left transition cursor-pointer disabled:cursor-default ${
                                      prog.isUpcoming
                                        ? "bg-black/45 text-white/65 opacity-80"
                                        : isCoreDone
                                          ? "bg-black/50 hover:bg-black/60 text-white active:scale-[0.98]"
                                          : "bg-[#f6f6f4] hover:bg-white text-zinc-950 active:scale-[0.98]"
                                    }`}
                                  >
                                    <div className="w-full flex items-center justify-start">
                                      <span className="relative inline-flex items-center justify-center shrink-0">
                                        <TaskFillIcon className="w-5 h-5" />
                                        {isCorePending && (
                                          <span
                                            aria-label="Not completed"
                                            className="semantic-badge-box absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[var(--semantic-red-dot)] ring-2 ring-[#f6f6f4]"
                                          />
                                        )}
                                        {isCoreDone && (
                                          <span
                                            aria-label="Completed"
                                            className="semantic-badge-box absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[var(--semantic-green)] text-white ring-2 ring-black/60 flex items-center justify-center"
                                          >
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          </span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="pt-2.5 w-full min-w-0 space-y-0.5">
                                      <span
                                        className={`block text-xs font-geometric font-semibold leading-tight truncate w-full ${
                                          prog.isUpcoming
                                            ? "text-white/75"
                                            : isCoreDone
                                              ? "text-white"
                                              : "text-zinc-950"
                                        }`}
                                      >
                                        {taskWidgetTitle}
                                      </span>
                                      <span
                                        className={`block text-[10px] font-mono leading-normal truncate ${
                                          prog.isUpcoming
                                            ? "text-white/50"
                                            : isCoreDone
                                              ? "text-white/70"
                                              : "text-zinc-500"
                                        }`}
                                      >
                                        {isCoreDone
                                          ? isId
                                            ? "Selesai"
                                            : "Done"
                                          : taskWidgetDuration}
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full rounded-2xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10 p-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          {isId
                            ? "Tidak ada program yang sesuai filter."
                            : "No programs match the selected filter."}
                        </div>
                      )
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
          getModalPortalRoot()
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

