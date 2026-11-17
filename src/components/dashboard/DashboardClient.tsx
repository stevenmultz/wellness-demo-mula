"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QrisCheckoutModal, QrisInvoiceData } from "@/components/checkout/QrisCheckoutModal";
import { wellnessEnrollProgram } from "@/wellness/actions/account";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { resolvePublicBadge } from "@/wellness/utils/timeline";
import { WIB_OFFSET_MS, getWibCalendarDate } from "@/wellness/utils/timezone";
import type { ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { extractBodyMetricsFromValues } from "@/wellness/utils/custom-tasks";
import { useLocale } from "@/wellness/i18n/LocaleContext";
import type { BodyMetricPoint } from "./tabs/BodyProgressWidget";
import { evaluateDayTaskState, MyPlanHeader, MyPlanIndex, MyPlanIntro, MyPlanOverview } from "./tabs/MyPlanTab";
import { ExplorePlanTab } from "./tabs/ExplorePlanTab";
import { NotificationsHistoryTab } from "./tabs/NotificationsHistoryTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { ProgramDetailView } from "./tabs/ProgramDetailView";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { useDashboardProgress } from "./useDashboardProgress";
import type {
  EnrollmentItem,
  ProgramDayItem,
  ProgramItem,
  UserProfile,
} from "./types";
import {
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export type {
  EnrollmentItem,
  ProgramDayItem,
  ProgramItem,
  UserProfile,
};

function isCohortEnded(startDate?: string | Date | null, endDate?: string | Date | null, dayCount?: number) {
  const nowMs = Date.now();
  if (endDate) {
    const { year, month, date } = getWibCalendarDate(endDate);
    const endWibCutoffMs = Date.UTC(year, month, date, 23, 59, 59, 999) - WIB_OFFSET_MS;
    return nowMs > endWibCutoffMs;
  }
  if (startDate && dayCount) {
    const { year, month, date } = getWibCalendarDate(startDate);
    const endWibCutoffMs = Date.UTC(year, month, date + dayCount, 23, 59, 59, 999) - WIB_OFFSET_MS;
    return nowMs > endWibCutoffMs;
  }
  return false;
}

function isCohortUpcoming(startDate?: string | Date | null) {
  if (!startDate) return false;
  const { year, month, date } = getWibCalendarDate(startDate);
  const startWibMs = Date.UTC(year, month, date, 0, 0, 0, 0) - WIB_OFFSET_MS;
  return Date.now() < startWibMs;
}

interface DashboardProps {
  user: UserProfile;
  myPrograms: EnrollmentItem[];
  allPrograms: ProgramItem[];
  dailyPlans: ProgramDailyPlan[];
  initialBodyMetricLogs?: BodyMetricPoint[];
}

export function DashboardClient({
  user,
  myPrograms,
  allPrograms,
  dailyPlans,
  initialBodyMetricLogs = [],
}: DashboardProps) {
  const router = useRouter();
  const { t } = useLocale();
  const hasInitialActivePlan = myPrograms.some(
    (e) => e.status === "ACTIVE" && !isCohortEnded(e.startDate, e.endDate, e.dayCount)
  );
  const [activeTab, setActiveTab] = useState<"my_plan" | "all_plan" | "notifications" | "profile">(
    hasInitialActivePlan ? "my_plan" : "all_plan"
  );
  const [myPlanView, setMyPlanView] = useState<"intro" | "index" | "detail">("intro");
  const [myPlanFilter, setMyPlanFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [exploreView, setExploreView] = useState<"intro" | "catalog" | "coaches" | "organizations">("intro");
  const [historyView, setHistoryView] = useState<"intro" | "feed">("intro");
  const [profileViewMode, setProfileViewMode] = useState<"intro" | "menu">("intro");
  const [historySection, setHistorySection] = useState<"notifications" | "history">("notifications");
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    [hasInitialActivePlan ? "my_plan" : "all_plan"]: true,
  });

  useEffect(() => {
    setVisitedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);

  // Scroll Hide / Show for Top Header (Scroll down hides, scroll up reveals)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isOverHero, setIsOverHero] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const nextOverHero = currentScrollY < 160;
      setIsOverHero((prev) => (prev === nextOverHero ? prev : nextOverHero));
      if (currentScrollY > lastScrollYRef.current && currentScrollY > 40) {
        setIsHeaderVisible((prev) => (prev ? false : prev));
      } else {
        setIsHeaderVisible((prev) => (prev ? prev : true));
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter ONLY programs the user has enrolled in
  const enrolledProgramIds = new Set(myPrograms.map((e) => e.programId));
  const myEnrolledPrograms = allPrograms.filter((p) => enrolledProgramIds.has(p.id));

  const allActiveEnrollments = myPrograms.filter((e) => e.status === "ACTIVE");
  const ongoingOrUpcomingEnrollment = allActiveEnrollments.find(
    (e) => !isCohortEnded(e.startDate, e.endDate, e.dayCount)
  );
  const defaultProgramId = ongoingOrUpcomingEnrollment?.programId || allActiveEnrollments[0]?.programId || "";
  const [selectedProgId, setSelectedProgId] = useState<string>(defaultProgramId);
  const [bodyMetricLogs, setBodyMetricLogs] = useState<BodyMetricPoint[]>(initialBodyMetricLogs);
  const [actionNotice, setActionNoticeState] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActionNotice = useCallback(
    (next: { type: "success" | "error"; text: string } | null, autoDismissMs?: number) => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
      setActionNoticeState(next);
      if (next && autoDismissMs) {
        noticeTimerRef.current = setTimeout(() => {
          setActionNoticeState(null);
          noticeTimerRef.current = null;
        }, autoDismissMs);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const [qrisInvoice, setQrisInvoice] = useState<QrisInvoiceData | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

  const {
    dayChecklists,
    overlayDay,
    setCustomSubmissionsByTaskId,
    handleOpenVideo,
    handleSyncChecklist,
    handleToggleChecklist,
    handleSaveSleep,
    handleSelectWorkout,
    handleSaveWorkoutNotes,
    handleSaveEventFeedback,
    handleSaveMeal,
    handleSaveReflection,
    handleCompleteProgramDay,
  } = useDashboardProgress({
    currentProgram,
    calendarDay,
    setActionNotice,
    onRefresh: () => router.refresh(),
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
        p.isCompleted
      );
    })
    .map(overlayDay);

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
          text: `Registration is not open for this plan (Status: ${publicBadge}).`,
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
          setActionNotice(
            {
              type: "success",
              text: `[${sent.scheduledTime} WIB] ${sent.programTitle}: ${sent.message}`,
            },
            6000
          );
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
  }, [setActionNotice]);

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
  const myPlanIndexItems = activeEnrollments.map((e) => {
    const fullProg = myEnrolledPrograms.find((p) => p.id === e.programId);
    const days = fullProg?.days || [];
    const totalDays = days.length || e.dayCount || 0;
    const completedDays = days.filter((d) => !!d.userProgress?.isCompleted).length;
    const liveIdx = days.findIndex((d) => d.isCalendarUnlocked && !d.isPast2359);
    const liveDay = liveIdx >= 0 ? days[liveIdx] : null;
    const currentDayNumber = liveDay?.dayNumber || 0;
    const isUpcoming = isCohortUpcoming(e.startDate || fullProg?.startDate);
    const pendingTasksCount = !isUpcoming && liveDay ? evaluateDayTaskState(liveDay).pendingTasksCount : 0;
    return {
      programId: e.programId,
      title: e.title,
      coachName: e.coachName || fullProg?.coachName || "",
      organizationName: e.organizationName || fullProg?.organizationName || null,
      coverImage: fullProg?.coverImage || e.coverImage || null,
      dayCount: e.dayCount,
      startDate: e.startDate,
      endDate: e.endDate,
      locationType: e.locationType || fullProg?.locationType,
      city: e.city || fullProg?.city || null,
      isUpcoming,
      completedDays,
      totalDays,
      currentDayNumber,
      dailyCommitment: fullProg?.dailyCommitment || "15–20 Mins / Day",
      todayDayType: !isUpcoming && liveDay ? liveDay.dayType : null,
      pendingTasksCount,
    };
  });
  const overviewEnrollment =
    activeEnrollments.find((e) => e.programId === selectedProgId) || activeEnrollments[0] || null;
  const overviewPlan = overviewEnrollment
    ? dailyPlans.find((p) => p.programId === overviewEnrollment.programId) ?? null
    : null;

  const isFullBleedFirstPage =
    (activeTab === "my_plan" && myPlanView === "intro") ||
    (activeTab === "all_plan" && exploreView === "intro") ||
    (activeTab === "notifications" && historyView === "intro") ||
    (activeTab === "profile" && profileViewMode === "intro");

  const openProfileFromHeader = () => {
    setActiveTab("profile");
    setProfileViewMode("menu");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="member-dashboard-unboxed min-h-screen flex flex-col relative overflow-x-clip font-sans bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Per-tab header: My Plan renders it here; the other tabs render their own */}
      {activeTab === "my_plan" && (
        <MyPlanHeader
          visible={isHeaderVisible}
          overlay={myPlanView === "detail" ? isOverHero : false}
          mode={myPlanView}
          plans={planOptions}
          selectedProgramId={overviewEnrollment?.programId ?? ""}
          avatarUrl={user.avatarUrl}
          userName={user.fullName}
          onSelect={(id) => {
            setSelectedProgId(id);
            setMyPlanView("detail");
          }}
          onBackToIntro={() => {
            setMyPlanView("intro");
            setIsOverHero(true);
            window.scrollTo({ top: 0 });
          }}
          onBackToIndex={() => {
            setMyPlanView("index");
            setIsOverHero(true);
            window.scrollTo({ top: 0 });
          }}
          onExplore={() => {
            setExploreView("catalog");
            setActiveTab("all_plan");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenProfile={openProfileFromHeader}
        />
      )}

      {/* Bottom Navigation: fixed uniform geometry across all tabs & detail pages; border box strictly on active tab button */}
      <nav
        aria-label="Primary"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        className={`dashboard-nav-boxed fixed bottom-0 left-0 right-0 z-50 font-geometric transition-colors duration-200 ${
          isFullBleedFirstPage
            ? "bg-transparent"
            : "bg-[#f6f6f4]/95 dark:bg-[#0e0e0e]/95 backdrop-blur-md"
        }`}
      >
        <div className="max-w-md mx-auto px-4">
          <div className="h-14 flex items-center gap-1.5">
            {(
              [
                { key: "my_plan", label: t.nav.myPlan },
                { key: "all_plan", label: t.nav.explore },
                { key: "notifications", label: t.nav.activity },
                { key: "profile", label: t.nav.profile },
              ] as const
            ).map(({ key, label }) => {
              const active = activeTab === key;
              const btnStateClass = isFullBleedFirstPage
                ? active
                  ? "border-white/50 bg-white/20 text-white font-semibold"
                  : "border-transparent bg-transparent text-white/75 hover:text-white font-medium"
                : active
                  ? "border-zinc-300 dark:border-white/25 bg-white dark:bg-white/15 text-zinc-950 dark:text-white font-semibold shadow-xs"
                  : "border-transparent bg-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium";

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setActiveTab(key);
                    if (key === "my_plan") {
                      setMyPlanView("intro");
                    } else if (key === "all_plan") {
                      setExploreView("intro");
                    } else if (key === "notifications") {
                      setHistoryView("intro");
                    } else if (key === "profile") {
                      setProfileViewMode("intro");
                    }
                    setIsOverHero(true);
                    window.scrollTo({ top: 0 });
                  }}
                  className={`flex-1 h-10 px-2 rounded-xl border flex items-center justify-center gap-1 text-xs whitespace-nowrap tracking-wide transition active:scale-95 ${btnStateClass}`}
                >
                  <span>{label}</span>
                  {key === "my_plan" && activeEnrollments.length > 0 && (
                    <span className="text-[10px] font-mono tabular-nums opacity-75">
                      {activeEnrollments.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area with safe-area spacing below seamless top header and above bottom dock */}
      <main
        style={{
          paddingTop:
            (activeTab === "my_plan" && myPlanView === "detail") || isFullBleedFirstPage
              ? "0px"
              : "calc(4.5rem + env(safe-area-inset-top))",
          paddingBottom: isFullBleedFirstPage
            ? "0px"
            : "calc(5.5rem + env(safe-area-inset-bottom))",
        }}
        className="max-w-5xl mx-auto px-4 sm:px-8 flex-1 w-full flex flex-col"
      >
        {actionNotice && (
          <div
            style={{
              top:
                activeTab === "my_plan" && myPlanView === "detail"
                  ? "calc(4.25rem + env(safe-area-inset-top))"
                  : undefined,
            }}
            className={`${
              activeTab === "my_plan" && myPlanView === "detail"
                ? "fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md shadow-xl"
                : "mb-4"
            } bg-zinc-200/80 dark:bg-white/10 p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-in fade-in font-mono ${
              actionNotice.type === "error"
                ? "text-red-700 dark:text-red-300"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {actionNotice.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
        )}

        <div className={activeTab === "my_plan" ? "flex-1 flex flex-col" : "hidden"} hidden={activeTab !== "my_plan"}>
          {myPlanView === "intro" ? (
            <MyPlanIntro
              userName={user.fullName}
              totalCount={myPlanIndexItems.length}
              ongoingCount={myPlanIndexItems.filter((p) => !p.isUpcoming).length}
              upcomingCount={myPlanIndexItems.filter((p) => p.isUpcoming).length}
              completedCount={completedEnrollments.length}
              onSelectFilter={(filter) => {
                setMyPlanFilter(filter);
                setMyPlanView("index");
                setIsOverHero(true);
                window.scrollTo({ top: 0 });
              }}
              onExplore={() => {
                setExploreView("catalog");
                setActiveTab("all_plan");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onViewHistory={() => {
                setHistorySection("history");
                setHistoryView("feed");
                setActiveTab("notifications");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : myPlanView === "index" ? (
            <MyPlanIndex
              userName={user.fullName}
              plans={myPlanIndexItems}
              completedCount={completedEnrollments.length}
              planFilter={myPlanFilter}
              onChangePlanFilter={setMyPlanFilter}
              onSelectPlan={(programId) => {
                setSelectedProgId(programId);
                setMyPlanView("detail");
                setIsOverHero(true);
                window.scrollTo({ top: 0 });
              }}
              onExplore={() => {
                setExploreView("catalog");
                setActiveTab("all_plan");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onViewHistory={() => {
                setHistorySection("history");
                setHistoryView("feed");
                setActiveTab("notifications");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : (
            <MyPlanOverview
              program={
                overviewEnrollment && currentProgram
                  ? {
                      id: currentProgram.id,
                      title: currentProgram.title,
                      coachName: currentProgram.coachName,
                      coachTitle: currentProgram.coachTitle,
                      organizationName: currentProgram.organizationName,
                      organizationLogo: currentProgram.organizationLogo,
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
              onSaveWorkoutNotes={handleSaveWorkoutNotes}
              historyDays={historyDays}
              allProgramDays={(currentProgram?.days || []).map(overlayDay)}
              checklist={currentDay ? dayChecklists[currentDay.id] : undefined}
              onSelectWorkout={handleSelectWorkout}
              onOpenVideo={handleOpenVideo}
              onExplore={() => {
                setExploreView("catalog");
                setActiveTab("all_plan");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onViewHistory={() => {
                setHistorySection("history");
                setHistoryView("feed");
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
              bodyMetricLogs={bodyMetricLogs}
              onCustomTaskSubmitted={(dayId, customTaskId, submission) => {
                setCustomSubmissionsByTaskId((prev) => ({
                  ...prev,
                  [customTaskId]: submission,
                }));
                const metrics = extractBodyMetricsFromValues(submission.values);
                if (metrics && currentProgram) {
                  setBodyMetricLogs((prev) => {
                    const idx = prev.findIndex(
                      (m) => m.programDayId === dayId && m.source === "CUSTOM_TASK"
                    );
                    const nextPoint: BodyMetricPoint = {
                      id: idx >= 0 ? prev[idx].id : `local-${dayId}`,
                      programId: currentProgram.id,
                      programDayId: dayId,
                      source: "CUSTOM_TASK",
                      weightKg: metrics.weightKg ?? null,
                      heightCm: metrics.heightCm ?? null,
                      waistCm: metrics.waistCm ?? null,
                      chestCm: metrics.chestCm ?? null,
                      hipsCm: metrics.hipsCm ?? null,
                      bodyFatPct: metrics.bodyFatPct ?? null,
                      restingHr: metrics.restingHr ?? null,
                      notes: metrics.notes ?? null,
                      recordedAt: submission.updatedAt || new Date().toISOString(),
                    };
                    if (idx >= 0) {
                      return prev.map((m, i) => (i === idx ? nextPoint : m));
                    }
                    return [...prev, nextPoint];
                  });
                }
              }}
            />
          )}
        </div>

        {/* TAB 2: EXPLORE PLAN (kept alive once visited) */}
        {(visitedTabs.all_plan || activeTab === "all_plan") && (
          <div className={activeTab === "all_plan" ? "flex-1 flex flex-col" : "hidden"} hidden={activeTab !== "all_plan"}>
            <ExplorePlanTab
              headerVisible={isHeaderVisible}
              isActive={activeTab === "all_plan"}
              viewMode={exploreView}
              onChangeViewMode={setExploreView}
              registeringId={enrollingId}
              profileAvatarUrl={user.avatarUrl}
              profileName={user.fullName}
              onOpenProfile={openProfileFromHeader}
              onRegister={(id) => handleOpenQrisCheckout(id)}
              onViewDetails={(id) => {
                const prog = allPrograms.find((p) => p.id === id);
                if (prog) setDetailedProgram(prog);
              }}
              onOpenPlan={(id) => {
                setSelectedProgId(id);
                setMyPlanView("detail");
                setActiveTab("my_plan");
                setIsOverHero(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}

        {/* TAB 3: NOTIFICATION & HISTORY (kept alive once visited) */}
        {(visitedTabs.notifications || activeTab === "notifications") && (
          <div className={activeTab === "notifications" ? "flex-1 flex flex-col" : "hidden"} hidden={activeTab !== "notifications"}>
            <NotificationsHistoryTab
              headerVisible={isHeaderVisible}
              isActive={activeTab === "notifications"}
              viewMode={historyView}
              onChangeViewMode={setHistoryView}
              initialSection={historySection}
              profileAvatarUrl={user.avatarUrl}
              profileName={user.fullName}
              onOpenProfile={openProfileFromHeader}
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
          <div className={activeTab === "profile" ? "flex-1 flex flex-col" : "hidden"} hidden={activeTab !== "profile"}>
            <ProfileTab
              user={user}
              bodyMetricLogs={bodyMetricLogs}
              headerVisible={isHeaderVisible}
              viewMode={profileViewMode}
              onChangeViewMode={setProfileViewMode}
              onLogout={handleSignOut}
              onDeleteAccount={() => setDeleteModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => router.push("/?deleted=true")}
      />

      <QrisCheckoutModal
        isOpen={!!qrisInvoice}
        invoice={qrisInvoice}
        onClose={() => setQrisInvoice(null)}
        onSuccess={(progId) => {
          setQrisInvoice(null);
          setSelectedProgId(progId);
          setMyPlanView("detail");
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
            setMyPlanView("detail");
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
