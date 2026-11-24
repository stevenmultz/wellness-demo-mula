"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  AlertCircle,
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
  onSaveWater,
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
  onSaveWater: (waterMl: number, dayId: string) => Promise<void | boolean>;
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
  plans?: PlanOption[];
  selectedProgramId?: string;
  onSelectPlan?: (programId: string) => void;
}) {
  void onOpenDetails;
  const { locale, t } = useLocale();

  const { checks, activities, initialDone, pendingTasksCount } = evaluateDayTaskState(day, checklist);

  const currentDayNumber = day?.dayNumber || plan?.today?.dayNumber || 0;
  // Both HYBRID (from batch start) and ONLINE (from join date) obey WIB calendar drip windows
  const hasCalendarSchedule = Boolean(day?.unlockDate);
  const locked = hasCalendarSchedule
    ? !day || !day.isCalendarUnlocked || day.isPast2359
    : !day;
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
    const w = getWibCalendarDate(getProgramDayDate(day));
    return new Date(w.year, w.month, 1);
  });

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  if (!program) {
    return <MyPlanNoPlanPage onExplore={onExplore} />;
  }

  const currentIndex = Math.max(
    0,
    (plans || []).findIndex((p) => p.programId === (selectedProgramId || program.id))
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
      {/* 0. Program name switcher (infinite loop left/right arrows; tap title to open All My Programs) */}
      <div className="w-full flex items-center justify-between gap-2 rounded-2xl bg-[#ececea] dark:bg-white/[0.04] border border-zinc-200/60 dark:border-white/10 p-1">
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
          className="flex-1 min-w-0 h-8 px-2 rounded-xl hover:bg-zinc-300/40 dark:hover:bg-white/[0.06] flex items-center justify-center transition active:scale-[0.99] cursor-pointer"
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

      {/* 1. Contained Image Banner */}
      <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-white/10 min-h-[195px] sm:min-h-[225px] flex flex-col justify-between p-4 sm:p-6 text-white">
        {program?.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        ) : (
          <div className="absolute inset-0 bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/30" />

        {/* Top Row: Date & Day Type (Left) + Day X/Y (Right) */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const w = getWibCalendarDate(getProgramDayDate(activeSelectedDay));
              setCalendarMonth(new Date(w.year, w.month, 1));
              setShowCalendarModal(true);
            }}
            aria-label="Select date from calendar"
            className="group inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full backdrop-blur-md active:scale-95 transition cursor-pointer text-left border border-white/10 min-w-0"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
          >
            <span className="text-xs font-geometric font-semibold text-white leading-tight whitespace-nowrap">
              {activeFullDateStr}
            </span>
            <span className="text-[10px] font-mono text-white/50 leading-tight select-none">
              •
            </span>
            <span className="text-[11px] font-mono font-medium text-white/85 leading-tight truncate">
              {activeDayTypeLabel}
            </span>

            <ChevronDown className="w-3.5 h-3.5 text-white/80 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>

          {totalProgramDays > 0 && (
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-[11px] font-mono font-semibold text-white/95 tracking-wide tabular-nums shrink-0"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
              title={`Day ${activeDayNum} of ${totalProgramDays}`}
            >
              Day {activeDayNum}/{totalProgramDays}
            </span>
          )}
        </div>

        {/* Bottom Row: Group Chat (Left) + Report (Right) */}
        {program && (
          <div className="relative z-10 flex items-center justify-between gap-2 pt-8">
            <button
              type="button"
              onClick={() => setShowCommunityModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-medium text-white/95 hover:text-white active:scale-95 transition cursor-pointer"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Group Chat</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-medium text-white/85 hover:text-white active:scale-95 transition cursor-pointer"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.42)" }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t.myPlan.report}</span>
            </button>
          </div>
        )}
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
                  programVenueAddress={program.venueAddress}
                  locked={locked}
                  isAnytime={!hasCalendarSchedule}
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

