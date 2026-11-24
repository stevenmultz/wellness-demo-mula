"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import {
  evaluateDayTaskState,
  MyPlanAllPage,
  MyPlanDonePage,
  MyPlanHeader,
  MyPlanIntro,
  MyPlanNoPlanPage,
  MyPlanOngoingPage,
  MyPlanOverview,
  MyPlanUpcomingPage,
  type MyPlanSubView,
} from "./tabs/MyPlanTab";
import { ExplorePlanTab, type ExploreViewMode } from "./tabs/ExplorePlanTab";
import { NotificationsHistoryTab } from "./tabs/NotificationsHistoryTab";
import { ProfileTab } from "./tabs/ProfileTab";
import type { HeaderProfileMenuActions } from "./tabs/shared";
import type { ProfileView } from "./tabs/profile/ProfileSectionForms";
import { ProgramDetailView } from "./tabs/ProgramDetailView";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { FirstTimeAppTour } from "./FirstTimeAppTour";
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
import {
  FillChatIcon,
  FillCompassIcon,
  FillHomeIcon,
  FillUserIcon,
} from "./tabs/sharedFillIcons";

export type {
  EnrollmentItem,
  ProgramDayItem,
  ProgramItem,
  UserProfile,
};

function isCohortEnded(
  startDate?: string | Date | null,
  endDate?: string | Date | null,
  dayCount?: number,
  locationType?: string | null,
  days?: ProgramItem["days"]
) {
  void locationType;
  if (days && days.length > 0 && days.every((d) => !!d.userProgress?.isCompleted)) {
    return true;
  }
  if (!startDate && !endDate) {
    return false;
  }
  const nowMs = Date.now();
  if (endDate) {
    const { year, month, date } = getWibCalendarDate(endDate);
    const endWibCutoffMs = Date.UTC(year, month, date, 23, 59, 59, 999) - WIB_OFFSET_MS;
    return nowMs > endWibCutoffMs;
  }
  if (startDate && dayCount) {
    const { year, month, date } = getWibCalendarDate(startDate);
    const endWibCutoffMs = Date.UTC(year, month, date + Math.max(0, dayCount - 1), 23, 59, 59, 999) - WIB_OFFSET_MS;
    return nowMs > endWibCutoffMs;
  }
  return false;
}

function findCurrentProgramDayIndex(days: ProgramItem["days"] | undefined): number {
  if (!days || days.length === 0) return -1;
  const hasCalendarSchedule = days.some((d) => Boolean(d.unlockDate));
  if (hasCalendarSchedule) {
    const liveIdx = days.findIndex((d) => d.isCalendarUnlocked && !d.isPast2359);
    if (liveIdx >= 0) return liveIdx;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].isCalendarUnlocked) return i;
    }
    return 0;
  }
  const incompleteIdx = days.findIndex((d) => !d.userProgress?.isCompleted);
  return incompleteIdx >= 0 ? incompleteIdx : days.length - 1;
}

function isCohortUpcoming(startDate?: string | Date | null, locationType?: string | null) {
  if (locationType === "ONLINE" || !startDate) return false;
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
  const [extraProgramsById, setExtraProgramsById] = useState<Record<string, ProgramItem>>({});
  const programById = useMemo(() => {
    const map = new Map<string, ProgramItem>(allPrograms.map((p) => [p.id, p]));
    for (const [id, prog] of Object.entries(extraProgramsById)) {
      if (!map.has(id)) map.set(id, prog);
    }
    return map;
  }, [allPrograms, extraProgramsById]);

  const resolveProgramDetail = useCallback(
    async (programId: string): Promise<ProgramItem | null> => {
      const cached = programById.get(programId);
      if (cached) return cached;
      try {
        const res = await fetch(`/api/programs/${encodeURIComponent(programId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { success?: boolean; program?: ProgramItem };
        if (json.success && json.program) {
          setExtraProgramsById((prev) => ({
            ...prev,
            [programId]: json.program as ProgramItem,
          }));
          return json.program;
        }
      } catch {
        // Ignore transient network errors
      }
      return null;
    },
    [programById]
  );
  const hasInitialActivePlan = myPrograms.some((e) => {
    const fullProg = programById.get(e.programId);
    return (
      e.status === "ACTIVE" &&
      !isCohortEnded(
        e.startDate,
        e.endDate,
        e.dayCount,
        e.locationType || fullProg?.locationType,
        fullProg?.days
      )
    );
  });
  const [activeTab, setActiveTab] = useState<"my_plan" | "all_plan" | "notifications" | "profile">(
    hasInitialActivePlan ? "my_plan" : "all_plan"
  );
  const [myPlanView, setMyPlanView] = useState<MyPlanSubView>("intro");
  const [lastMyPlanPage, setLastMyPlanPage] = useState<"intro" | "all" | "ongoing" | "upcoming" | "done">("intro");
  const [exploreView, setExploreView] = useState<ExploreViewMode>("intro");
  const [historyView, setHistoryView] = useState<"intro" | "feed">("intro");
  const [profileViewMode, setProfileViewMode] = useState<"intro" | "menu">("intro");
  const [profileTargetSection, setProfileTargetSection] = useState<{
    view: ProfileView;
    nonce: number;
  } | null>(null);
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
  const ongoingOrUpcomingEnrollment = allActiveEnrollments.find((e) => {
    const fullProg = programById.get(e.programId);
    return !isCohortEnded(
      e.startDate,
      e.endDate,
      e.dayCount,
      e.locationType || fullProg?.locationType,
      fullProg?.days
    );
  });
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
  const [showFirstTimeTour, setShowFirstTimeTour] = useState(false);

  // Program Detail Explanation Modal
  const [detailedProgram, setDetailedProgram] = useState<ProgramItem | null>(null);
  const detailRequestIdRef = useRef(0);

  const openProgramDetailById = (programId: string) => {
    const cached = programById.get(programId);
    if (cached) {
      detailRequestIdRef.current += 1;
      setDetailedProgram(cached);
      return;
    }
    const reqId = ++detailRequestIdRef.current;
    void resolveProgramDetail(programId).then((prog) => {
      if (detailRequestIdRef.current !== reqId) return;
      if (prog) {
        setDetailedProgram(prog);
      } else {
        setActionNotice(
          { type: "error", text: "Unable to load program details. Please try again." },
          4000
        );
      }
    });
  };

  const handleSignOut = async () => {
    await wellnessSignOut();
    router.push("/");
    router.refresh();
  };

  const handleAddAccount = async () => {
    await wellnessSignOut();
    router.push("/?auth=signin");
    router.refresh();
  };

  const currentProgram =
    myEnrolledPrograms.find((p) => p.id === selectedProgId) ||
    myEnrolledPrograms[0] ||
    null;
  const todayIndex = findCurrentProgramDayIndex(currentProgram?.days);
  const currentDay = todayIndex >= 0 ? currentProgram?.days?.[todayIndex] || null : null;
  const calendarDay = currentDay;

  const {
    dayChecklists,
    overlayDay,
    setDayCompletedOverride,
    setCustomSubmissionsByTaskId,
    handleOpenVideo,
    handleSyncChecklist,
    handleToggleChecklist,
    handleSaveSleep,
    handleSelectWorkout,
    handleSaveWorkoutNotes,
    handleSaveEventFeedback,
    handleSaveMeal,
    handleSaveWater,
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
    setEnrollingId(programId);
    try {
      const targetProg = programById.get(programId) || (await resolveProgramDetail(programId));
      if (targetProg) {
        const publicBadge = resolvePublicBadge({
          status: targetProg.status,
          locationType: targetProg.locationType,
          registrationOpenDate: targetProg.registrationOpenDate,
          registrationDeadline: targetProg.registrationDeadline,
          startDate: targetProg.startDate,
          endDate: targetProg.endDate,
          maxQuota: targetProg.maxQuota,
          enrolledCount: targetProg.enrolledCount,
        });

        if (publicBadge && publicBadge !== "Open Registration") {
          setActionNotice(
            {
              type: "error",
              text: `Registration is not open for this program (Status: ${publicBadge}).`,
            },
            4000
          );
          return;
        }
      }

      const res = await wellnessEnrollProgram(programId, mode);
      if (res.success && res.data) {
        setQrisInvoice(res.data);
      } else {
        setActionNotice(
          { type: "error", text: res.message || "Enrollment failed." },
          4000
        );
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
        text: "Access denied: Admin privileges required to access the Admin Console.",
      });
      setTimeout(() => setActionNotice(null), 5000);
    }
    const enrollId = searchParams.get("enroll");
    if (enrollId) {
      handleOpenQrisCheckout(enrollId);
    }
    const welcomeParam = searchParams.get("welcome");
    try {
      const tourKey = `zera_app_tour_v1:${user.id}`;
      const seenTour = localStorage.getItem(tourKey) === "done";
      if (welcomeParam === "1" || (!seenTour && myPrograms.length === 0)) {
        setShowFirstTimeTour(true);
      }
    } catch {
      if (welcomeParam === "1") {
        setShowFirstTimeTour(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleFinishFirstTimeTour = (
    targetTab?: "my_plan" | "all_plan" | "notifications" | "profile"
  ) => {
    setShowFirstTimeTour(false);
    try {
      localStorage.setItem(`zera_app_tour_v1:${user.id}`, "done");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (url.searchParams.has("welcome")) {
          url.searchParams.delete("welcome");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
      }
    } catch {
      // Ignore storage or history errors
    }
    if (targetTab && !hasInitialActivePlan) {
      setActiveTab(targetTab);
    }
  };

  // Hobby cron runs once a day. While this session is visible in foreground and user has active programs, ask the server (WIB clock) for due alerts.
  useEffect(() => {
    if (allActiveEnrollments.length === 0) return;
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
    const interval = setInterval(() => void tick(), 60000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [setActionNotice, allActiveEnrollments.length]);

  const completedDaysCount =
    currentProgram?.days?.filter(
      (d) => !!d.userProgress?.isCompleted || (d.isPast2359 && !d.isSkipped)
    ).length || 0;
  const skippedDaysCount =
    currentProgram?.days?.filter((d) => d.isSkipped && !d.userProgress?.isCompleted).length || 0;

  // Separate completed/ended cohorts from active/upcoming cohorts
  const completedEnrollments = allActiveEnrollments.filter((e) => {
    const fullProg = programById.get(e.programId);
    return isCohortEnded(
      e.startDate,
      e.endDate,
      e.dayCount,
      e.locationType || fullProg?.locationType,
      fullProg?.days
    );
  });

  // My Plan tab: includes all active-status enrollments (ongoing, upcoming, and completed)
  const activeEnrollments = allActiveEnrollments.filter((e) => {
    const fullProg = programById.get(e.programId);
    return !isCohortEnded(
      e.startDate,
      e.endDate,
      e.dayCount,
      e.locationType || fullProg?.locationType,
      fullProg?.days
    );
  });
  const planOptions = allActiveEnrollments.map((e) => ({ programId: e.programId, title: e.title }));
  const myPlanIndexItems = allActiveEnrollments.map((e) => {
    const fullProg = programById.get(e.programId);
    const days = fullProg?.days || [];
    const totalDays = days.length || e.dayCount || 0;
    const completedDays = days.filter((d) => !!d.userProgress?.isCompleted).length;
    const locType = e.locationType || fullProg?.locationType;
    const liveIdx = findCurrentProgramDayIndex(days);
    const liveDay = liveIdx >= 0 ? days[liveIdx] : null;
    const currentDayNumber = liveDay?.dayNumber || 0;
    const isCompleted = isCohortEnded(
      e.startDate,
      e.endDate,
      e.dayCount,
      locType,
      days
    );
    const isUpcoming =
      !isCompleted && isCohortUpcoming(e.startDate || fullProg?.startDate, locType);
    const pendingTasksCount =
      !isCompleted && !isUpcoming && liveDay ? evaluateDayTaskState(liveDay).pendingTasksCount : 0;
    return {
      programId: e.programId,
      title: e.title,
      batchNumber: e.batchNumber ?? fullProg?.batchNumber ?? null,
      coachName: e.coachName || fullProg?.coachName || "",
      organizationName: e.organizationName || fullProg?.organizationName || null,
      organizationLogo: e.organizationLogo || fullProg?.organizationLogo || null,
      coverImage: fullProg?.coverImage || e.coverImage || null,
      dayCount: e.dayCount,
      startDate: e.startDate,
      endDate: e.endDate,
      locationType: e.locationType || fullProg?.locationType,
      city: e.city || fullProg?.city || null,
      isUpcoming,
      isCompleted,
      completedDays,
      totalDays,
      currentDayNumber,
      dailyCommitment: fullProg?.dailyCommitment || "15–20 Mins / Day",
      todayDayType: !isCompleted && !isUpcoming && liveDay ? liveDay.dayType : null,
      pendingTasksCount,
    };
  });
  const overviewEnrollment =
    allActiveEnrollments.find((e) => e.programId === selectedProgId) ||
    activeEnrollments[0] ||
    allActiveEnrollments[0] ||
    null;
  const overviewPlan = overviewEnrollment
    ? dailyPlans.find((p) => p.programId === overviewEnrollment.programId) ?? null
    : null;

  const isFullBleedFirstPage =
    (activeTab === "all_plan" && exploreView === "intro") ||
    (activeTab === "notifications" && historyView === "intro") ||
    (activeTab === "profile" && profileViewMode === "intro");

  const openProfileFromHeader = () => {
    setActiveTab("profile");
    setProfileViewMode("menu");
    setProfileTargetSection(null);
    window.scrollTo({ top: 0 });
  };

  const profileMenuActions: HeaderProfileMenuActions = {
    onEditProfile: () => {
      setActiveTab("profile");
      setProfileViewMode("menu");
      setProfileTargetSection({ view: "basic", nonce: Date.now() });
      window.scrollTo({ top: 0 });
    },
    onShareProgress: () => {
      setActiveTab("profile");
      setProfileViewMode("menu");
      setProfileTargetSection({ view: "share_progress", nonce: Date.now() });
      window.scrollTo({ top: 0 });
    },
    onAddAccount: handleAddAccount,
    onLogout: handleSignOut,
  };

  return (
    <div className="member-dashboard-unboxed min-h-screen flex flex-col relative overflow-x-clip font-sans bg-[#f6f6f4] dark:bg-[#0e0e0e] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Per-tab header: My Plan renders it here; the other tabs render their own */}
      {activeTab === "my_plan" && (
        <MyPlanHeader
          visible={isHeaderVisible}
          overlay={false}
          mode={allActiveEnrollments.length === 0 ? "empty" : myPlanView}
          plans={planOptions}
          selectedProgramId={overviewEnrollment?.programId ?? ""}
          avatarUrl={user.avatarUrl}
          userName={user.fullName}
          userEmail={user.email}
          onSelect={(id) => {
            setSelectedProgId(id);
            setIsOverHero(true);
            window.scrollTo({ top: 0 });
          }}
          onBackToIntro={() => {
            setMyPlanView("intro");
            setIsOverHero(true);
            window.scrollTo({ top: 0 });
          }}
          onBackToIndex={() => {
            setMyPlanView(lastMyPlanPage);
            setIsOverHero(true);
            window.scrollTo({ top: 0 });
          }}
          onExplore={() => {
            setExploreView("catalog");
            setActiveTab("all_plan");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onOpenProfile={openProfileFromHeader}
          profileMenuActions={profileMenuActions}
        />
      )}

      {/* Bottom Navigation: fixed uniform icon-only dock across all tabs & detail pages; clean Light Theme surface */}
      <nav
        aria-label="Primary"
        style={{
          paddingBottom: "max(calc(env(safe-area-inset-bottom) - 16px), 2px)",
        }}
        className="dashboard-nav-boxed fixed bottom-0 left-0 right-0 z-50 font-geometric transition-colors duration-200 bg-[#f6f6f4]/95 backdrop-blur-md border-t border-zinc-200/70"
      >
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-0.5">
          <div className="h-10 flex items-center gap-1.5">
            {(
              [
                { key: "my_plan", label: "Home", Icon: FillHomeIcon },
                { key: "all_plan", label: t.nav.explore, Icon: FillCompassIcon },
                { key: "notifications", label: "Message", Icon: FillChatIcon },
                { key: "profile", label: t.nav.profile, Icon: FillUserIcon },
              ] as const
            ).map(({ key, label, Icon }) => {
              const active = activeTab === key;
              const btnStateClass = active
                ? "border-zinc-300 bg-white text-zinc-950 shadow-xs"
                : "border-transparent bg-transparent text-zinc-400 hover:text-zinc-900";

              return (
                <button
                  key={key}
                  type="button"
                  aria-label={label}
                  title={label}
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
                  className={`flex-1 h-9 rounded-xl border flex items-center justify-center transition active:scale-95 ${btnStateClass}`}
                >
                  <Icon className="w-5 h-5" />
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
            : "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
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
          {allActiveEnrollments.length === 0 ? (
            <MyPlanNoPlanPage
              onExplore={() => {
                setExploreView("catalog");
                setActiveTab("all_plan");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : myPlanView === "all" ? (
            <MyPlanAllPage
              plans={myPlanIndexItems}
              onSelectPlan={(programId) => {
                setLastMyPlanPage("all");
                setSelectedProgId(programId);
                setMyPlanView("detail");
                setIsOverHero(true);
                window.scrollTo({ top: 0 });
              }}
              onOpenSection={(sec) => {
                const targetPage = sec === "completed" ? "done" : sec;
                setLastMyPlanPage(targetPage);
                setMyPlanView(targetPage);
                window.scrollTo({ top: 0 });
              }}
              onExplore={() => {
                setExploreView("catalog");
                setActiveTab("all_plan");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ) : myPlanView === "ongoing" ? (
            <MyPlanOngoingPage
              plans={myPlanIndexItems}
              onSelectPlan={(programId) => {
                setLastMyPlanPage("ongoing");
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
            />
          ) : myPlanView === "upcoming" ? (
            <MyPlanUpcomingPage
              plans={myPlanIndexItems}
              onSelectPlan={(programId) => {
                setLastMyPlanPage("upcoming");
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
            />
          ) : myPlanView === "done" ? (
            <MyPlanDonePage
              plans={myPlanIndexItems}
              onSelectPlan={(programId) => {
                setLastMyPlanPage("done");
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
            />
          ) : (
            <MyPlanOverview
              program={
                overviewEnrollment && currentProgram
                  ? {
                      id: currentProgram.id,
                      title: currentProgram.title,
                      batchNumber: currentProgram.batchNumber ?? overviewEnrollment.batchNumber ?? null,
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
                      introVideoUrl: currentProgram.introVideoUrl || null,
                      startDate: overviewEnrollment.startDate,
                      endDate: overviewEnrollment.endDate,
                      communityLink: overviewEnrollment.communityLink,
                      scientificReferences: currentProgram.scientificReferences || [],
                      totalDays: currentProgram.days.length || currentProgram.durationDays || 0,
                      isCompleted: isCohortEnded(
                        overviewEnrollment.startDate,
                        overviewEnrollment.endDate,
                        overviewEnrollment.dayCount,
                        overviewEnrollment.locationType || currentProgram.locationType,
                        currentProgram.days
                      ),
                      isUpcoming:
                        !isCohortEnded(
                          overviewEnrollment.startDate,
                          overviewEnrollment.endDate,
                          overviewEnrollment.dayCount,
                          overviewEnrollment.locationType || currentProgram.locationType,
                          currentProgram.days
                        ) &&
                        isCohortUpcoming(
                          overviewEnrollment.startDate || currentProgram.startDate,
                          overviewEnrollment.locationType || currentProgram.locationType
                        ),
                      targetState: currentProgram.targetState || null,
                      methodology: currentProgram.methodology || null,
                      expectedBenefits: currentProgram.expectedBenefits || [],
                      programGuidelines: currentProgram.programGuidelines || [],
                      dailyCommitment: currentProgram.dailyCommitment || null,
                    }
                  : null
              }
              plan={overviewPlan}
              day={liveDay}
              stats={{
                completed: completedDaysCount,
                skipped: skippedDaysCount,
                remaining:
                  currentProgram?.days.filter((d) => !d.isPast2359 && !d.userProgress?.isCompleted)
                    .length || 0,
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
                const prog = overviewEnrollment?.programId
                  ? programById.get(overviewEnrollment.programId)
                  : undefined;
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
              onSaveWater={handleSaveWater}
              onSaveReflection={handleSaveReflection}
              onSaveAttendance={handleSaveEventFeedback}
              onCompleteDay={handleCompleteProgramDay}
              bodyMetricLogs={bodyMetricLogs}
              userName={user.fullName}
              userAvatarUrl={user.avatarUrl}
              userEmail={user.email}
              plans={planOptions}
              selectedProgramId={overviewEnrollment?.programId ?? ""}
              onViewAllPrograms={() => {
                setLastMyPlanPage("all");
                setMyPlanView("all");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onSelectPlan={(id) => {
                setSelectedProgId(id);
                setIsOverHero(true);
                window.scrollTo({ top: 0 });
              }}
              onCustomTaskSubmitted={(dayId, customTaskId, submission, dayCompleted) => {
                setCustomSubmissionsByTaskId((prev) => ({
                  ...prev,
                  [customTaskId]: submission,
                }));
                if (typeof dayCompleted === "boolean") {
                  setDayCompletedOverride((prev) => ({
                    ...prev,
                    [dayId]: dayCompleted,
                  }));
                }
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
              profileEmail={user.email}
              onOpenProfile={openProfileFromHeader}
              profileMenuActions={profileMenuActions}
              onRegister={(id) => handleOpenQrisCheckout(id)}
              onViewDetails={openProgramDetailById}
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
              profileEmail={user.email}
              onOpenProfile={openProfileFromHeader}
              profileMenuActions={profileMenuActions}
              completedPrograms={completedEnrollments.map((e) => ({
                programId: e.programId,
                title: e.title,
                coachName: e.coachName,
                coverImage: e.coverImage,
                startDate: e.startDate,
                endDate: e.endDate,
                dayCount: e.dayCount,
              }))}
              onOpenProgramDetail={openProgramDetailById}
            />
          </div>
        )}

        {/* TAB 4: PROFILE & SETTINGS (kept alive once visited) */}
        {(visitedTabs.profile || activeTab === "profile") && (
          <div className={activeTab === "profile" ? "flex-1 flex flex-col" : "hidden"} hidden={activeTab !== "profile"}>
            <ProfileTab
              user={user}
              headerVisible={isHeaderVisible}
              viewMode={profileViewMode}
              onChangeViewMode={setProfileViewMode}
              targetSection={profileTargetSection}
              profileMenuActions={profileMenuActions}
              onLogout={handleSignOut}
              onDeleteAccount={() => setDeleteModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* First-Time App Walkthrough Tutorial */}
      <FirstTimeAppTour
        isOpen={showFirstTimeTour}
        userName={user.fullName}
        onFinish={handleFinishFirstTimeTour}
      />

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
          qrisInvoice?.programId
            ? programById.get(qrisInvoice.programId)?.locationType
            : undefined
        }
        programVenue={
          qrisInvoice?.programId
            ? programById.get(qrisInvoice.programId)?.venueAddress
            : undefined
        }
        programTerms={
          qrisInvoice?.programId
            ? programById.get(qrisInvoice.programId)?.termsList
            : undefined
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
