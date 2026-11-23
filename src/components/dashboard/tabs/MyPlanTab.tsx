"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  MessageSquare,
  Shield,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import type { ProgramDayCustomTaskDTO } from "@/wellness/utils/custom-tasks";
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
    mode === "all" || mode === "ongoing" || mode === "upcoming" || mode === "done";

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
  onOpenDetails,
  onToggleCheck,
  onSyncChecklist,
  onSelectWorkout,
  onOpenVideo,
  onSaveSleep,
  onSaveMeal,
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
  plans,
  selectedProgramId,
  onSelectPlan,
  onViewAllPrograms,
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
  onSaveReflection: (reflection: string, happiness: number, dayId: string) => Promise<void | boolean>;
  onSaveAttendance: (notes: string, dayId: string) => Promise<void | boolean>;
  onSaveWorkoutNotes: (notes: string, dayId: string) => Promise<void | boolean>;
  onCompleteDay: (dayId: string) => Promise<void | boolean>;
  bodyMetricLogs?: BodyMetricPoint[];
  onCustomTaskSubmitted?: (
    dayId: string,
    customTaskId: string,
    submission: NonNullable<ProgramDayCustomTaskDTO["submission"]>
  ) => void;
  userName?: string | null;
  userAvatarUrl?: string | null;
  userSubtitle?: string | null;
  userEmail?: string | null;
  plans?: PlanOption[];
  selectedProgramId?: string;
  onSelectPlan?: (programId: string) => void;
}) {
  void onOpenDetails;
  const { locale, t } = useLocale();

  if (!program) {
    return <MyPlanNoPlanPage onExplore={onExplore} />;
  }

  const { checks, activities, initialDone, pendingTasksCount } = evaluateDayTaskState(day, checklist);

  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  const isOnlineProgram = (program?.locationType || "ONLINE").toUpperCase() === "ONLINE";
  const locked = isOnlineProgram ? false : !day || !day.isCalendarUnlocked || day.isPast2359;
  const fullProgramDays = allProgramDays && allProgramDays.length > 0 ? allProgramDays : historyDays;

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
  const activeDayTypeLabel =
    activeSelectedDay?.dayType === "REST_DAY"
      ? "Rest"
      : activeSelectedDay?.dayType === "TRAINING_DAY"
      ? "Training"
      : "Connect";
  const activeDayNum = activeSelectedDay?.dayNumber || baseTodayDayNum;

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = getProgramDayDate(day);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const currentIndex = Math.max(
    0,
    (plans || []).findIndex((p) => p.programId === (selectedProgramId || program.id))
  );
  const totalPlans = plans && plans.length > 0 ? plans.length : 1;

  const handlePrevPlan = () => {
    if (plans && currentIndex > 0 && plans[currentIndex - 1]) {
      onSelectPlan?.(plans[currentIndex - 1].programId);
    }
  };

  const handleNextPlan = () => {
    if (plans && currentIndex < totalPlans - 1 && plans[currentIndex + 1]) {
      onSelectPlan?.(plans[currentIndex + 1].programId);
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

  const isUpcoming = !!program?.isUpcoming;
  const activeWidget: 0 | 1 | 2 = isUpcoming ? 0 : widgetIndex;

  const handleWidgetTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleWidgetTouchEnd = (e: React.TouchEvent) => {
    if (isUpcoming || touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    // Only switch tabs on clear, deliberate horizontal swipes (not vertical scrolling)
    if (Math.abs(deltaX) > 80 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      if (deltaX < -80) {
        setWidgetIndex((prev) => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      } else if (deltaX > 80) {
        setWidgetIndex((prev) => (prev > 0 ? ((prev - 1) as 0 | 1 | 2) : prev));
      }
    }
  };

  const showSubtabs = !!program;
  const subtabs = isUpcoming
    ? ([{ index: 0, label: t.myPlan.subtabGuides, count: 0 }] as const)
    : ([
        { index: 0, label: t.myPlan.subtabGuides, count: 0 },
        { index: 1, label: t.myPlan.subtabTasks, count: pendingTasksCount },
        { index: 2, label: t.myPlan.subtabMetrics, count: 0 },
      ] as const);

  const displayName = (userName || "Member").trim() || "Member";
  const totalProgramDays = program?.totalDays || program?.durationDays || fullProgramDays.length || 0;
  const displayDayNumber = currentDayNumber > 0 ? currentDayNumber : 1;

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-16">
      {/* 0. See all my programs button + Previous/Next index */}
      <div className="w-full flex items-center justify-between gap-2 pb-0.5 px-0.5">
        {/* See all my programs button */}
        <button
          type="button"
          onClick={onViewAllPrograms || onExplore}
          className="h-8 px-3.5 rounded-xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-300/80 dark:border-white/10 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-[#e4e4e1] dark:hover:bg-white/[0.08] shadow-xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
        >
          <span>See all my programs</span>
        </button>

        {/* Index previous / next controller */}
        {plans && plans.length > 0 && (
          <div className="inline-flex items-center gap-1 bg-[#ececea] dark:bg-white/[0.04] p-0.5 rounded-xl border border-zinc-300/80 dark:border-white/10 shadow-xs">
            <button
              type="button"
              onClick={handlePrevPlan}
              disabled={currentIndex === 0 || plans.length <= 1}
              aria-label="Previous plan"
              className="w-6 h-6 rounded-lg hover:bg-zinc-300/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center justify-center disabled:opacity-25 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span
              data-testid="home-program-index"
              className="px-2 text-[11px] font-mono font-medium text-zinc-900 dark:text-white tabular-nums select-none"
            >
              {currentIndex + 1} / {totalPlans}
            </span>
            <button
              type="button"
              onClick={handleNextPlan}
              disabled={currentIndex >= totalPlans - 1 || plans.length <= 1}
              aria-label="Next plan"
              className="w-6 h-6 rounded-lg hover:bg-zinc-300/50 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center justify-center disabled:opacity-25 transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 1. Contained Image Banner */}
      <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-white/10 min-h-[215px] sm:min-h-[245px] flex flex-col justify-between p-5 sm:p-7 text-white">
        {program?.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />

        {/* Top Row: Simple Editorial Date & Day Type Button */}
        <div className="relative z-10 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              const dDate = getProgramDayDate(activeSelectedDay);
              setCalendarMonth(new Date(dDate.getFullYear(), dDate.getMonth(), 1));
              setShowCalendarModal(true);
            }}
            aria-label="Select date from calendar"
            className="group inline-flex items-center gap-2.5 p-1.5 pr-3.5 rounded-2xl backdrop-blur-md active:scale-95 transition cursor-pointer text-left"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: "#ffffff", color: "#09090b" }}
            >
              <Calendar className="w-4 h-4 shrink-0" />
            </span>

            <span className="flex flex-col min-w-0">
              <span className="text-xs font-geometric font-semibold text-white leading-tight">
                {activeFullDateStr}
              </span>
              <span className="text-[10px] font-mono text-white/80 leading-tight mt-0.5">
                {activeDayTypeLabel}
              </span>
            </span>

            <ChevronDown className="w-3.5 h-3.5 text-white/80 shrink-0 ml-0.5 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>
        </div>

        {/* Bottom Content: Title, Action Buttons, and Day X/Y + Progress Bar */}
        <div className="relative z-10 space-y-2.5 pt-6">
          {/* Program title */}
          <h1 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight text-white leading-tight">
            {program?.title || t.myPlan.noActivePlanTitle}
          </h1>

          {/* Action buttons (Community & Report - without "Join") */}
          {program && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowCommunityModal(true)}
                className="py-1 text-xs font-medium text-white/95 hover:text-white inline-flex items-center gap-1.5 active:scale-95 transition drop-shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Group Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="py-1 text-xs font-medium text-white/80 hover:text-white inline-flex items-center gap-1.5 active:scale-95 transition drop-shadow-xs cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{t.myPlan.report}</span>
              </button>
            </div>
          )}

          {/* Day X/Y on the left + Progress bar on the right */}
          {totalProgramDays > 0 && (
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[11px] sm:text-xs font-mono font-semibold text-white/95 tracking-wider tabular-nums shrink-0">
                Day {activeDayNum}/{totalProgramDays}
              </span>
              <div
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.28)" }}
                role="progressbar"
                aria-valuenow={activeDayNum}
                aria-valuemin={1}
                aria-valuemax={totalProgramDays}
                title={`Day ${activeDayNum} of ${totalProgramDays}`}
              >
                <span
                  className="block h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(5, Math.round((activeDayNum / totalProgramDays) * 100))
                    )}%`,
                    backgroundColor: "#ffffff",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Subtabs */}
      {showSubtabs && (
        <div
          role="tablist"
          aria-label="Program sections"
          className={`rounded-xl p-1 bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/10 grid gap-1 ${
            isUpcoming ? "grid-cols-1" : "grid-cols-3"
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
                onClick={() => setWidgetIndex(index)}
                className={`h-9 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer ${
                  active
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className="semantic-badge-box font-mono text-[10px] leading-none tabular-nums px-1.5 py-0.5 rounded-md border border-[#B03244] bg-[#9E2A3A] dark:border-[#C95B6B] dark:bg-[#9E2A3A] text-[#f6f6f4] font-bold">
                    {count}
                  </span>
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
        <div className={activeWidget === 0 ? "block" : "hidden"}>
          <ProgramPreparationWidgets
            program={program}
            days={fullProgramDays}
            currentDayId={day?.id}
            onSwitchWidget={setWidgetIndex}
          />
        </div>

        {!isUpcoming && (
          <>
            <div className={activeWidget === 1 ? "block" : "hidden"}>
              {day ? (
                <DailyCheckIn
                  key={day.id}
                  day={day}
                  pastDays={historyDays}
                  allProgramDays={allProgramDays}
                  communityLink={program.communityLink}
                  programTitle={program.title}
                  locked={locked}
                  isAnytime={isOnlineProgram}
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
                currentDayNumber={currentDayNumber}
                bodyMetricLogs={bodyMetricLogs}
                programId={program.id}
                onSwitchWidget={setWidgetIndex}
              />
            </div>
          </>
        )}
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
              const dt = getProgramDayDate(pd);
              const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
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

