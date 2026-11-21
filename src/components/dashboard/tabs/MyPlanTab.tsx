"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND, buildConciergeWhatsAppUrl } from "@/wellness/brand";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Shield,
  User as UserIcon,
  Users,
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
  plans,
  selectedProgramId,
  avatarUrl: _avatarUrl,
  userName: _userName,
  userEmail: _userEmail,
  onSelect,
  onBackToIntro,
  onBackToIndex: _onBackToIndex,
  onExplore: _onExplore,
  onOpenProfile: _onOpenProfile,
  profileMenuActions: _profileMenuActions,
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
  const currentIndex = Math.max(
    0,
    plans.findIndex((p) => p.programId === selectedProgramId)
  );
  const totalPlans = plans.length;
  const isListSubPage =
    mode === "all" || mode === "ongoing" || mode === "upcoming" || mode === "done";

  const handlePrev = () => {
    if (currentIndex > 0 && plans[currentIndex - 1]) {
      onSelect(plans[currentIndex - 1].programId);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalPlans - 1 && plans[currentIndex + 1]) {
      onSelect(plans[currentIndex + 1].programId);
    }
  };

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

      <div className="relative min-w-0">
        {totalPlans > 0 ? (
          totalPlans > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous plan"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition active:scale-95 disabled:opacity-30 cursor-pointer ${
                  overlay
                    ? "bg-black/45 backdrop-blur-md border border-white/20 text-white hover:bg-black/60"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelect(plans[(currentIndex + 1) % totalPlans].programId)}
                data-testid="header-plan-index"
                title="Switch plan"
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tabular-nums transition active:scale-95 cursor-pointer ${
                  overlay
                    ? "bg-black/45 backdrop-blur-md border border-white/20 text-white hover:bg-black/60"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/15 text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-50"
                }`}
              >
                {currentIndex + 1} / {totalPlans}
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= totalPlans - 1}
                aria-label="Next plan"
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition active:scale-95 disabled:opacity-30 cursor-pointer ${
                  overlay
                    ? "bg-black/45 backdrop-blur-md border border-white/20 text-white hover:bg-black/60"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/15 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span
              data-testid="header-plan-index"
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold tabular-nums ${
                overlay
                  ? "bg-black/45 backdrop-blur-md border border-white/20 text-white"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/15 text-zinc-800 dark:text-zinc-200 shadow-2xs"
              }`}
            >
              1 / 1
            </span>
          )
        ) : null}
      </div>
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
}: {
  program: PlanProgramInfo | null;
  plan: ProgramDailyPlan | null;
  day: PlanDay | null;
  stats: PlanStats;
  checklist: string[] | undefined;
  onExplore: () => void;
  onViewHistory?: () => void;
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
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

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

  return (
    <div>
      <section className="relative left-1/2 -translate-x-1/2 w-screen overflow-hidden bg-zinc-900">
        <div className="relative w-full flex flex-col justify-end min-h-[270px] sm:min-h-[300px]">
          {program?.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={program.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
          ) : (
            <div className="absolute inset-0 bg-zinc-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/85" />

          <div
            style={{ paddingTop: "calc(5.25rem + env(safe-area-inset-top))" }}
            className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-8 pb-10 space-y-5 text-white"
          >
            {/* User profile photo + user name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-white/30 bg-zinc-700 flex items-center justify-center">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-white/70" />
                )}
              </div>
              <span className="text-sm font-geometric font-medium text-white truncate">
                {displayName}
              </span>
            </div>

            {/* Program title */}
            <div>
              <h1 className="text-xl sm:text-2xl font-geometric font-semibold tracking-tight text-white leading-tight">
                {program?.title || t.myPlan.noActivePlanTitle}
              </h1>
            </div>

            {/* Action buttons (Join Community & Report) */}
            {program && (
              <div className="flex items-center gap-5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowCommunityModal(true)}
                  className="py-1 text-xs font-medium text-white/95 hover:text-white inline-flex items-center gap-1.5 active:scale-95 transition drop-shadow-xs cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t.myPlan.joinCommunity}</span>
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

            {showSubtabs && (
              <div
                role="tablist"
                aria-label="Program sections"
                className={`rounded-xl p-1 bg-black/45 backdrop-blur-md border border-white/15 grid gap-1 ${
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
                      className={`h-8 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] ${
                        active
                          ? "bg-white text-zinc-950 shadow-sm"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{label}</span>
                      {count > 0 && (
                        <span
                          className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                            active
                              ? "bg-zinc-950/15 text-zinc-950 font-bold"
                              : "bg-white/20 text-white font-semibold"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="relative left-1/2 -translate-x-1/2 w-screen -mt-6 z-20 rounded-t-[32px] bg-[#f6f6f4] dark:bg-[#0e0e0e] pt-7 pb-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 space-y-5">
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
                    />
                  ) : (
                    <EmptyState title={t.myPlan.noTasksToday} description={t.myPlan.noTasksTodayDesc} />
                  )}
                </div>

                <div className={activeWidget === 2 ? "block space-y-5" : "hidden"}>
                  <BodyProgressWidget logs={bodyMetricLogs} programId={program.id} />
                  <CohortPerformanceCard
                    days={fullProgramDays}
                    currentDayNumber={currentDayNumber}
                    onSwitchWidget={setWidgetIndex}
                  />
                </div>
              </>
            )}
          </div>
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

