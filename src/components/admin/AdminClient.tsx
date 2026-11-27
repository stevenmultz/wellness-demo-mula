"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { MasterDataPayload } from "@/wellness/actions/master";
import {
  wellnessDeleteProgramTemplate,
  wellnessSaveProgramTemplate,
  type DayRoutineTemplatePayload,
  type ProgramHeaderTemplatePayload,
  type ProgramTemplateDTO,
} from "@/wellness/actions/templates";
import { wellnessSignOut } from "@/wellness/actions/auth";
import { wellnessAdminUpdateSupportRequest } from "@/wellness/actions/support";
import {
  calculateProgramMemoryFootprint,
  type ProgramDatabaseStatus,
} from "@/wellness/utils/timeline";
import {
  DIFFICULTY_LEVELS,
  getDefaultNotificationsForType,
  type AdminClientProps,
  type AdminFeedbackMessage,
  type AdminInitialRoute,
  type AdminMenuKey,
  type AdminProgram,
  type AdminProgramDay,
  type AdminSupportRequestItem,
  type AdminUserItem,
  type DayNotificationState,
} from "./adminTypes";
import { isDayFilled } from "./adminUtils";
import {
  buildAdminBreadcrumbs,
  extractPendingEnrollments,
  filterAndSortAdminMembers,
  filterAndSortAdminPrograms,
  type AdminMemberFilterKey,
  type AdminMemberSortKey,
  type AdminProgramSortKey,
} from "./adminListUtils";
import { AdminSidebar } from "./sections/AdminSidebar";
import { AdminWorkspaceHeader } from "./sections/AdminWorkspaceHeader";
import { AdminDashboardOverview } from "./sections/AdminDashboardOverview";
import { AdminCustomersList } from "./sections/AdminCustomersList";
import { AdminPaymentsView } from "./sections/AdminPaymentsView";
import { AdminModals } from "./sections/AdminModals";
import { AdminProgramsList } from "./sections/AdminProgramsList";
import {
  AdminMasterDirectories,
  type MasterDirectoryTabKey,
} from "./sections/AdminMasterDirectories";
import { AdminProgramCreateView } from "./sections/AdminProgramCreateView";
import { AdminProgramDetailView } from "./sections/AdminProgramDetailView";
import { AdminProgramInfoTab } from "./sections/AdminProgramInfoTab";
import { AdminDayCurriculumTab } from "./sections/AdminDayCurriculumTab";
import { AdminProgramSubmissionsTab } from "./sections/AdminProgramSubmissionsTab";
import { AdminCustomerDetailView } from "./sections/AdminCustomerDetailView";
import { AdminTeamView } from "./sections/AdminTeamView";
import { AdminOrganizationsManager } from "./AdminOrganizationsManager";
import {
  useMasterDirectoryActions,
  type StandardMasterTab,
} from "./hooks/useMasterDirectoryActions";
import { useAdminCustomerActions } from "./hooks/useAdminCustomerActions";
import { useAdminDayActions } from "./hooks/useAdminDayActions";
import { useAdminProgramActions } from "./hooks/useAdminProgramActions";
import { useProgramSubmissions } from "./hooks/useProgramSubmissions";

export {
  DIFFICULTY_LEVELS,
  getDefaultNotificationsForType,
  type DayNotificationState,
  type AdminProgramDay,
  type AdminProgram,
  type AdminSupportRequestItem,
  type AdminUserItem,
  type AdminInitialRoute,
  type AdminClientProps,
};

const PROGRAM_PAGE_SIZE = 5;
const MEMBER_PAGE_SIZE = 10;
const QRIS_PAGE_SIZE = 5;

export function AdminClient({
  initialUsers,
  initialPrograms,
  initialMasterData,
  initialTemplates = [],
  initialSupportRequests = [],
  currentAdminId,
  currentAdminRole = "USER",
  currentAdminOrgId = null,
  currentAdminCoachId = null,
  initialRoute,
}: AdminClientProps) {
  const router = useRouter();
  const isSuperadminUser = currentAdminRole === "SUPERADMIN";
  const canManagePrograms = isSuperadminUser || currentAdminRole === "ADMIN";
  void currentAdminCoachId;

  const [activeMenu, setActiveMenu] = useState<AdminMenuKey>(
    initialRoute?.menu || "dashboard"
  );
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [programs, setPrograms] = useState<AdminProgram[]>(initialPrograms);
  const [templates, setTemplates] = useState<ProgramTemplateDTO[]>(initialTemplates);
  const [supportRequests, setSupportRequests] = useState<AdminSupportRequestItem[]>(
    initialSupportRequests
  );
  const [resolvingSupportId, setResolvingSupportId] = useState<string | null>(null);
  const [masterData, setMasterData] = useState<MasterDataPayload>(
    initialMasterData || {
      coaches: [],
      categories: [],
      equipment: [],
      dailyCommitments: [],
      organizations: [],
    }
  );
  const [feedback, setFeedback] = useState<AdminFeedbackMessage | null>(null);

  const [isCreatingProgram, setIsCreatingProgram] = useState(
    Boolean(initialRoute?.isCreating && canManagePrograms)
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    initialRoute?.programId || null
  );
  const [programDetailTab, setProgramDetailTab] = useState<
    "info" | "schedule" | "responses"
  >(initialRoute?.programTab || "info");

  const [masterTab, setMasterTab] = useState<MasterDirectoryTabKey>(
    initialRoute?.masterTab &&
      initialRoute.masterTab !== ("all" as MasterDirectoryTabKey)
      ? (initialRoute.masterTab as MasterDirectoryTabKey)
      : "coaches"
  );

  // List filter/sort/pagination state
  const [programSearch, setProgramSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<"ALL" | ProgramDatabaseStatus>(
    "ALL"
  );
  const [programSort, setProgramSort] = useState<AdminProgramSortKey>("NEWEST");
  const [programPage, setProgramPage] = useState(1);

  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<AdminMemberFilterKey>("ALL");
  const [memberSort, setMemberSort] = useState<AdminMemberSortKey>("NEWEST");
  const [memberPage, setMemberPage] = useState(1);

  const [qrisSearch, setQrisSearch] = useState("");
  const [qrisPage, setQrisPage] = useState(1);

  const selectedProgram = programs.find((p) => p.id === selectedProgramId) || null;
  const currentAdmin = users.find((u) => u.id === currentAdminId);

  // Feature hooks
  const masterDirectoryActions = useMasterDirectoryActions({
    setMasterData,
    setFeedback,
  });

  const submissionsActions = useProgramSubmissions();

  const customerActions = useAdminCustomerActions({
    initialUsers,
    initialRoute,
    setUsers,
    setPrograms,
    setFeedback,
  });

  const dayActions = useAdminDayActions({
    initialRoute,
    programs,
    setPrograms,
    setFeedback,
  });

  const programActions = useAdminProgramActions({
    currentAdminOrgId,
    masterData,
    selectedProgramId,
    setSelectedProgramId,
    setIsCreatingProgram,
    setPrograms,
    setFeedback,
  });

  const handleApplyHeaderTemplate = (
    tpl: ProgramTemplateDTO,
    target: "create" | "edit"
  ) => {
    if (tpl.templateType !== "PROGRAM_HEADER") return;
    const p = (tpl.payload || {}) as ProgramHeaderTemplatePayload;
    const updater = target === "create" ? programActions.setCreateForm : programActions.setMetaForm;
    updater((prev) => ({
      ...prev,
      ...(typeof p.difficultyLevel === "string" ? { difficultyLevel: p.difficultyLevel } : {}),
      ...(typeof p.category === "string" ? { category: p.category } : {}),
      ...(typeof p.equipment === "string" ? { equipment: p.equipment } : {}),
      ...(typeof p.dailyCommitment === "string" ? { dailyCommitment: p.dailyCommitment } : {}),
      ...(typeof p.targetState === "string" ? { targetState: p.targetState } : {}),
      ...(typeof p.methodology === "string" ? { methodology: p.methodology } : {}),
      ...(Array.isArray(p.expectedBenefits) ? { expectedBenefits: p.expectedBenefits as string[] } : {}),
      ...(Array.isArray(p.scientificReferences)
        ? { scientificReferences: p.scientificReferences as typeof prev.scientificReferences }
        : {}),
      ...(Array.isArray(p.programGuidelines) ? { programGuidelines: p.programGuidelines as string[] } : {}),
      ...(typeof p.communityLink === "string" ? { communityLink: p.communityLink } : {}),
      ...(typeof p.customTerms === "string" ? { customTerms: p.customTerms } : {}),
      ...(Array.isArray(p.termsList) ? { termsList: p.termsList as string[] } : {}),
      ...(Array.isArray(p.termsChapters)
        ? { termsChapters: p.termsChapters as typeof prev.termsChapters }
        : {}),
    }));
    setFeedback({ type: "success", text: `Applied template "${tpl.name}".` });
  };

  const handleSaveHeaderTemplate = async (
    name: string,
    form: typeof programActions.createForm
  ): Promise<boolean> => {
    const res = await wellnessSaveProgramTemplate({
      templateType: "PROGRAM_HEADER",
      name,
      organizationId: form.organizationId || currentAdminOrgId || null,
      payload: {
        difficultyLevel: form.difficultyLevel,
        category: form.category,
        equipment: form.equipment,
        dailyCommitment: form.dailyCommitment,
        targetState: form.targetState,
        methodology: form.methodology,
        expectedBenefits: form.expectedBenefits,
        scientificReferences: form.scientificReferences,
        programGuidelines: form.programGuidelines,
        communityLink: form.communityLink,
        customTerms: form.customTerms,
        termsList: form.termsList,
        termsChapters: form.termsChapters,
      },
    });
    if (res.success && res.data) {
      setTemplates((prev) => [res.data!, ...prev.filter((t) => t.id !== res.data!.id)]);
      setFeedback({ type: "success", text: `Saved header template "${res.data.name}".` });
      return true;
    }
    setFeedback({ type: "error", text: res.message || "Failed to save template." });
    return false;
  };

  const handleApplyDayTemplate = (tpl: ProgramTemplateDTO) => {
    if (tpl.templateType !== "DAY_ROUTINE") return;
    const p = (tpl.payload || {}) as DayRoutineTemplatePayload;
    dayActions.setDayForm((prev) => ({
      ...prev,
      ...(typeof p.dayType === "string" ? { dayType: p.dayType as typeof prev.dayType } : {}),
      ...(typeof p.sleepRecommendation === "string" ? { sleepRecommendation: p.sleepRecommendation } : {}),
      ...(typeof p.mealRecommendation === "string" ? { mealRecommendation: p.mealRecommendation } : {}),
      ...(typeof p.restInstructions === "string" ? { restInstructions: p.restInstructions } : {}),
      ...(typeof p.onsiteVenue === "string" ? { onsiteVenue: p.onsiteVenue } : {}),
      ...(typeof p.onsiteSchedule === "string" ? { onsiteSchedule: p.onsiteSchedule } : {}),
      ...(typeof p.meetupLink === "string" ? { meetupLink: p.meetupLink } : {}),
      ...(typeof p.mapLink === "string" ? { mapLink: p.mapLink } : {}),
      ...(typeof p.eventTitle === "string" ? { eventTitle: p.eventTitle } : {}),
      ...(typeof p.eventHost === "string" ? { eventHost: p.eventHost } : {}),
      ...(typeof p.eventDetails === "string" ? { eventDetails: p.eventDetails } : {}),
      ...(Array.isArray(p.videoLinks) && p.videoLinks.length > 0
        ? { videoLinks: p.videoLinks as typeof prev.videoLinks }
        : {}),
      ...(Array.isArray(p.dayNotifications)
        ? { dayNotifications: p.dayNotifications as typeof prev.dayNotifications }
        : {}),
      ...(Array.isArray(p.workoutGroups)
        ? { workoutGroups: p.workoutGroups as typeof prev.workoutGroups }
        : {}),
      ...(Array.isArray(p.customTasks)
        ? {
            customTasks: p.customTasks.map((ct, idx) => ({
              sortOrder: idx,
              taskType: ct.taskType as typeof prev.customTasks[number]["taskType"],
              title: ct.title,
              instructions: ct.instructions || "",
              isRequired: true,
              fields: (ct.fields || []) as unknown as typeof prev.customTasks[number]["fields"],
              translations: ct.translations ?? null,
            })),
          }
        : {}),
    }));
    setFeedback({ type: "success", text: `Applied routine template "${tpl.name}".` });
  };

  const handleSaveDayTemplate = async (
    name: string,
    dayForm: typeof dayActions.dayForm
  ): Promise<boolean> => {
    const res = await wellnessSaveProgramTemplate({
      templateType: "DAY_ROUTINE",
      name,
      organizationId: selectedProgram?.organizationId || currentAdminOrgId || null,
      payload: {
        dayType: dayForm.dayType,
        sleepRecommendation: dayForm.sleepRecommendation,
        mealRecommendation: dayForm.mealRecommendation,
        restInstructions: dayForm.restInstructions,
        videoLinks: dayForm.videoLinks,
        onsiteVenue: dayForm.onsiteVenue,
        onsiteSchedule: dayForm.onsiteSchedule,
        meetupLink: dayForm.meetupLink,
        mapLink: dayForm.mapLink,
        eventTitle: dayForm.eventTitle,
        eventHost: dayForm.eventHost,
        eventDetails: dayForm.eventDetails,
        dayNotifications: dayForm.dayNotifications,
        workoutGroups: dayForm.workoutGroups,
        customTasks: dayForm.customTasks.map((ct, idx) => ({
          sortOrder: idx,
          taskType: ct.taskType,
          title: ct.title,
          instructions: ct.instructions,
          isRequired: true,
          fields: ct.fields,
          translations: ct.translations ?? null,
        })),
      },
    });
    if (res.success && res.data) {
      setTemplates((prev) => [res.data!, ...prev.filter((t) => t.id !== res.data!.id)]);
      setFeedback({ type: "success", text: `Saved day routine template "${res.data.name}".` });
      return true;
    }
    setFeedback({ type: "error", text: res.message || "Failed to save routine template." });
    return false;
  };

  const handleDeleteTemplate = async (id: string) => {
    const res = await wellnessDeleteProgramTemplate(id);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setFeedback({ type: "success", text: "Template deleted." });
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to delete template." });
    }
  };

  const navigateToDirectory = (tab: StandardMasterTab) => {
    setActiveMenu("master");
    setMasterTab(tab);
    masterDirectoryActions.openAddModal(tab);
    router.push(`/admin/directories?tab=${tab}`);
  };

  const openProgramDetail = (
    prog: AdminProgram,
    initialDay?: number,
    tab: "info" | "schedule" | "responses" = "info"
  ) => {
    setSelectedProgramId(prog.id);
    setIsCreatingProgram(false);
    setActiveMenu("programs");
    setFeedback(null);
    programActions.setAllDetailSections(false);
    dayActions.setAllDaySections(false);
    programActions.loadMetaIntoForm(prog);

    if (tab === "responses") {
      submissionsActions.loadProgramSubmissions(prog.id);
    }

    const targetDay =
      initialDay ??
      (() => {
        for (let d = 1; d <= (prog.durationDays || 21); d++) {
          const found = prog.days.find((x) => x.dayNumber === d);
          if (!isDayFilled(found)) return d;
        }
        return 1;
      })();

    dayActions.setSelectedDayNum(targetDay);
    dayActions.loadDayIntoForm(prog, targetDay);
    setProgramDetailTab(tab);
    router.push(`/admin/programs/${prog.id}?tab=${tab}&day=${targetDay}`);
  };

  const handleCreateProgramAndOpen = async (e: FormEvent) => {
    const created = await programActions.handleCreateProgramSubmit(e);
    if (created) {
      openProgramDetail(created, 1);
    }
  };

  // Sync authoritative server state & URL route on route navigation/refresh
  useEffect(() => {
    setUsers(initialUsers);
    customerActions.setInspectingUserHealth((prev) => {
      if (initialRoute?.menu === "members" && initialRoute.customerId) {
        return initialUsers.find((u) => u.id === initialRoute.customerId) || prev;
      }
      return prev ? initialUsers.find((u) => u.id === prev.id) || prev : null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUsers, initialRoute?.menu, initialRoute?.customerId]);

  useEffect(() => {
    setPrograms(initialPrograms);
  }, [initialPrograms]);

  useEffect(() => {
    if (initialMasterData) {
      setMasterData(initialMasterData);
    }
  }, [initialMasterData]);

  useEffect(() => {
    if (!initialRoute) return;
    setActiveMenu(initialRoute.menu);
    setIsCreatingProgram(Boolean(initialRoute.isCreating));
    if (initialRoute.masterTab) {
      if ((initialRoute.masterTab as string) === "all") {
        setMasterTab("coaches");
      } else {
        setMasterTab(initialRoute.masterTab);
      }
    }
    if (initialRoute.menu === "programs" && initialRoute.programId) {
      const targetProg = initialPrograms.find((p) => p.id === initialRoute.programId);
      if (targetProg) {
        setSelectedProgramId(targetProg.id);
        programActions.loadMetaIntoForm(targetProg);
        const resolvedTab = initialRoute.programTab || "info";
        setProgramDetailTab(resolvedTab);
        if (resolvedTab === "responses") {
          submissionsActions.loadProgramSubmissions(targetProg.id);
        }
        const resolvedDay =
          initialRoute.day ??
          (() => {
            for (let d = 1; d <= (targetProg.durationDays || 21); d++) {
              const found = targetProg.days.find((x) => x.dayNumber === d);
              if (!isDayFilled(found)) return d;
            }
            return 1;
          })();
        const clampedDay = Math.min(
          Math.max(1, resolvedDay),
          targetProg.durationDays || 21
        );
        dayActions.setSelectedDayNum(clampedDay);
        dayActions.loadDayIntoForm(targetProg, clampedDay);
      }
    } else if (initialRoute.menu !== "programs" || !initialRoute.programId) {
      setSelectedProgramId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialRoute?.menu,
    initialRoute?.programId,
    initialRoute?.isCreating,
    initialRoute?.programTab,
    initialRoute?.day,
    initialRoute?.masterTab,
  ]);

  const handleSignOut = async () => {
    await wellnessSignOut();
    router.push("/");
    router.refresh();
  };

  // Derived metrics & filtered lists
  const pendingEnrollments = extractPendingEnrollments(users);
  const liveProgramsCount = programs.filter((p) => p.isPublished).length;
  const draftProgramsCount = programs.length - liveProgramsCount;

  const approvedEnrollments = users.flatMap((u) =>
    u.enrollments.filter((e) => e.status === "ACTIVE")
  );
  const approvedRevenue = approvedEnrollments.reduce(
    (sum, e) => sum + (e.program.price || 0),
    0
  );
  const pendingRevenue = pendingEnrollments.reduce(
    (sum, e) => sum + (e.amountPaid || 0),
    0
  );

  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsersCount = users.filter((u) => u.status === "SUSPENDED").length;
  const enrolledUsersCount = users.filter((u) => u.enrollments.length > 0).length;

  const totalProgramsMemoryBytes = programs.reduce(
    (acc, p) => acc + calculateProgramMemoryFootprint(p).bytes,
    0
  );

  const filteredPrograms = filterAndSortAdminPrograms(
    programs,
    programSearch,
    programFilter,
    programSort
  );
  const totalProgramPages = Math.max(
    1,
    Math.ceil(filteredPrograms.length / PROGRAM_PAGE_SIZE)
  );
  const safeProgramPage = Math.min(programPage, totalProgramPages);
  const paginatedPrograms = filteredPrograms.slice(
    (safeProgramPage - 1) * PROGRAM_PAGE_SIZE,
    safeProgramPage * PROGRAM_PAGE_SIZE
  );

  const filteredMembers = filterAndSortAdminMembers(
    users,
    memberSearch,
    memberFilter,
    memberSort
  );
  const totalMemberPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / MEMBER_PAGE_SIZE)
  );
  const safeMemberPage = Math.min(memberPage, totalMemberPages);
  const paginatedMembers = filteredMembers.slice(
    (safeMemberPage - 1) * MEMBER_PAGE_SIZE,
    safeMemberPage * MEMBER_PAGE_SIZE
  );

  const qrisQuery = qrisSearch.toLowerCase();
  const filteredQris = pendingEnrollments.filter(
    (q) =>
      q.userFullName.toLowerCase().includes(qrisQuery) ||
      q.userEmail.toLowerCase().includes(qrisQuery) ||
      q.programTitle.toLowerCase().includes(qrisQuery)
  );
  const totalQrisPages = Math.max(1, Math.ceil(filteredQris.length / QRIS_PAGE_SIZE));
  const safeQrisPage = Math.min(qrisPage, totalQrisPages);
  const paginatedQris = filteredQris.slice(
    (safeQrisPage - 1) * QRIS_PAGE_SIZE,
    safeQrisPage * QRIS_PAGE_SIZE
  );

  const breadcrumbItems = buildAdminBreadcrumbs({
    activeMenu,
    isCreatingProgram,
    selectedProgram,
    programDetailTab,
    masterTab,
    inspectingUserHealth: customerActions.inspectingUserHealth,
    customerModalTab: customerActions.customerModalTab,
    onGoRoot: () => {
      setActiveMenu("dashboard");
      setSelectedProgramId(null);
      setIsCreatingProgram(false);
      customerActions.setInspectingUserHealth(null);
      router.push("/admin");
    },
    onGoPrograms: () => {
      setSelectedProgramId(null);
      setIsCreatingProgram(false);
      router.push("/admin/programs");
    },
    onSelectScheduleTab: () => setProgramDetailTab("schedule"),
    onGoDirectoriesCoaches: () => {
      setMasterTab("coaches");
      router.push("/admin/directories?tab=coaches");
    },
    onCloseCustomerDetail: customerActions.closeCustomerDetail,
    onSwitchCustomerOverview: () => customerActions.switchCustomerTab("overview"),
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-xs font-sans selection:bg-zinc-800 selection:text-white bg-zinc-100/70 dark:bg-zinc-950">
      <AdminSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        setSelectedProgramId={setSelectedProgramId}
        setIsCreatingProgram={setIsCreatingProgram}
        setInspectingUserHealth={customerActions.setInspectingUserHealth}
        setMasterTab={setMasterTab}
        setFeedback={setFeedback}
        currentAdmin={currentAdmin}
        currentAdminRole={currentAdminRole}
        isSuperadminUser={isSuperadminUser}
        programs={programs}
        handleSignOut={handleSignOut}
      />

      <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
        <AdminWorkspaceHeader
          breadcrumbItems={breadcrumbItems}
          activeMenu={activeMenu}
          isCreatingProgram={isCreatingProgram}
          selectedProgram={selectedProgram}
          programs={programs}
          users={users}
          pendingEnrollments={pendingEnrollments}
          approvedEnrollmentsCount={approvedEnrollments.length}
          approvedRevenue={approvedRevenue}
          pendingRevenue={pendingRevenue}
          liveProgramsCount={liveProgramsCount}
          draftProgramsCount={draftProgramsCount}
          totalProgramsMemoryBytes={totalProgramsMemoryBytes}
          masterData={masterData}
          activeUsersCount={activeUsersCount}
          suspendedUsersCount={suspendedUsersCount}
          enrolledUsersCount={enrolledUsersCount}
          isSuperadminUser={isSuperadminUser}
          currentAdminRole={currentAdminRole}
          feedback={feedback}
          setFeedback={setFeedback}
        />

        {activeMenu === "dashboard" && (
          <AdminDashboardOverview
            programs={programs}
            users={users}
            pendingEnrollments={pendingEnrollments}
            approvingId={customerActions.approvingId}
            isSuperadminUser={isSuperadminUser}
            canManagePrograms={canManagePrograms}
            setActiveMenu={setActiveMenu}
            setSelectedProgramId={setSelectedProgramId}
            setIsCreatingProgram={setIsCreatingProgram}
            resetCreateForm={programActions.resetCreateForm}
            openProgramDetail={openProgramDetail}
            handleApprovePayment={customerActions.handleApprovePayment}
          />
        )}

        {activeMenu === "programs" && !selectedProgram && !isCreatingProgram && (
          <AdminProgramsList
            programs={programs}
            filteredPrograms={filteredPrograms}
            paginatedPrograms={paginatedPrograms}
            programSearch={programSearch}
            setProgramSearch={setProgramSearch}
            programFilter={programFilter}
            setProgramFilter={setProgramFilter}
            programSort={programSort}
            setProgramSort={setProgramSort}
            setProgramPage={setProgramPage}
            safeProgramPage={safeProgramPage}
            totalProgramPages={totalProgramPages}
            programPageSize={PROGRAM_PAGE_SIZE}
            resetCreateForm={programActions.resetCreateForm}
            setIsCreatingProgram={setIsCreatingProgram}
            setSelectedProgramId={setSelectedProgramId}
            isSuperadminUser={isSuperadminUser}
            canManagePrograms={canManagePrograms}
            duplicatingId={programActions.duplicatingId}
            handleDuplicateProgram={programActions.handleDuplicateProgram}
            openProgramDetail={openProgramDetail}
          />
        )}

        {activeMenu === "programs" && isCreatingProgram && canManagePrograms && (
          <AdminProgramCreateView
            createForm={programActions.createForm}
            setCreateForm={programActions.setCreateForm}
            expandedCreateSections={programActions.expandedCreateSections}
            toggleCreateSection={programActions.toggleCreateSection}
            setAllCreateSections={programActions.setAllCreateSections}
            masterData={masterData}
            isSuperadminUser={canManagePrograms}
            currentAdminOrgId={currentAdminOrgId}
            navigateToDirectory={navigateToDirectory}
            setIsCreatingProgram={setIsCreatingProgram}
            handleCreateProgramSubmit={handleCreateProgramAndOpen}
            creatingLoading={programActions.creatingLoading}
            createError={programActions.createError}
            templates={templates}
            onApplyHeaderTemplate={handleApplyHeaderTemplate}
            onSaveHeaderTemplate={handleSaveHeaderTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {activeMenu === "master" && canManagePrograms && (
          <AdminMasterDirectories
            masterData={masterData}
            setMasterData={setMasterData}
            masterTab={masterTab}
            setMasterTab={setMasterTab}
            isSuperadminUser={canManagePrograms}
            setFeedback={setFeedback}
            masterActionLoading={masterDirectoryActions.masterActionLoading}
            activeDirectoryModal={masterDirectoryActions.activeDirectoryModal}
            modalFormName={masterDirectoryActions.modalFormName}
            setModalFormName={masterDirectoryActions.setModalFormName}
            modalFormTitle={masterDirectoryActions.modalFormTitle}
            setModalFormTitle={masterDirectoryActions.setModalFormTitle}
            openAddModal={masterDirectoryActions.openAddModal}
            openEditModal={masterDirectoryActions.openEditModal}
            closeModal={masterDirectoryActions.closeModal}
            handleDeleteDirectoryItem={masterDirectoryActions.handleDeleteDirectoryItem}
            handleSubmitDirectoryModal={masterDirectoryActions.handleSubmitDirectoryModal}
          />
        )}

        {activeMenu === "programs" && selectedProgram && (
          <AdminProgramDetailView
            selectedProgram={selectedProgram}
            setSelectedProgramId={setSelectedProgramId}
            programDetailTab={programDetailTab}
            setProgramDetailTab={setProgramDetailTab}
            selectedDayNum={dayActions.selectedDayNum}
            publishingId={programActions.publishingId}
            duplicatingId={programActions.duplicatingId}
            deletingProgId={programActions.deletingProgId}
            handleInitiatePublish={programActions.handleInitiatePublish}
            handleDuplicateProgram={programActions.handleDuplicateProgram}
            handleDeleteProgram={programActions.handleDeleteProgram}
            loadProgramSubmissions={submissionsActions.loadProgramSubmissions}
            submissionsCount={submissionsActions.programSubmissions.length}
            canManagePrograms={canManagePrograms}
          >
            {programDetailTab === "info" && (
              <AdminProgramInfoTab
                selectedProgram={selectedProgram}
                metaForm={programActions.metaForm}
                setMetaForm={programActions.setMetaForm}
                expandedDetailSections={programActions.expandedDetailSections}
                toggleDetailSection={programActions.toggleDetailSection}
                setAllDetailSections={programActions.setAllDetailSections}
                masterData={masterData}
                isSuperadminUser={isSuperadminUser}
                canManagePrograms={canManagePrograms}
                currentAdminOrgId={currentAdminOrgId}
                navigateToDirectory={navigateToDirectory}
                handleInitiatePublish={programActions.handleInitiatePublish}
                publishingId={programActions.publishingId}
                handleSaveMeta={programActions.handleSaveMeta}
                savingMeta={programActions.savingMeta}
                metaError={programActions.metaError}
                templates={templates}
                onApplyHeaderTemplate={handleApplyHeaderTemplate}
                onSaveHeaderTemplate={handleSaveHeaderTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}

            {programDetailTab === "schedule" && (
              <AdminDayCurriculumTab
                selectedProgram={selectedProgram}
                selectedDayNum={dayActions.selectedDayNum}
                dayForm={dayActions.dayForm}
                setDayForm={dayActions.setDayForm}
                expandedDaySections={dayActions.expandedDaySections}
                toggleDaySection={dayActions.toggleDaySection}
                masterData={masterData}
                handleSelectDay={dayActions.handleSelectDay}
                handleClearDay={dayActions.handleClearDay}
                handleSaveDay={dayActions.handleSaveDay}
                savingDay={dayActions.savingDay}
                dayError={dayActions.dayError}
                templates={templates}
                canManagePrograms={canManagePrograms}
                onApplyDayTemplate={handleApplyDayTemplate}
                onSaveDayTemplate={handleSaveDayTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}

            {programDetailTab === "responses" && (
              <AdminProgramSubmissionsTab
                selectedProgram={selectedProgram}
                programSubmissions={submissionsActions.programSubmissions}
                filteredSubmissions={submissionsActions.filteredSubmissions}
                submissionsLoading={submissionsActions.submissionsLoading}
                submissionsError={submissionsActions.submissionsError}
                submissionStats={submissionsActions.submissionStats}
                submissionDayFilter={submissionsActions.submissionDayFilter}
                setSubmissionDayFilter={submissionsActions.setSubmissionDayFilter}
                submissionMemberFilter={submissionsActions.submissionMemberFilter}
                setSubmissionMemberFilter={submissionsActions.setSubmissionMemberFilter}
                submissionSearch={submissionsActions.submissionSearch}
                setSubmissionSearch={submissionsActions.setSubmissionSearch}
                loadProgramSubmissions={submissionsActions.loadProgramSubmissions}
              />
            )}
          </AdminProgramDetailView>
        )}

        {activeMenu === "members" && customerActions.inspectingUserHealth && (
          <AdminCustomerDetailView
            u={customerActions.inspectingUserHealth}
            currentAdminId={currentAdminId}
            masterData={masterData}
            setUsers={setUsers}
            setInspectingUserHealth={customerActions.setInspectingUserHealth}
            setFeedback={setFeedback}
            isSuperadminUser={isSuperadminUser}
            userActionLoading={customerActions.userActionLoading}
            setUserActionLoading={customerActions.setUserActionLoading}
            customerModalTab={customerActions.customerModalTab}
            switchCustomerTab={customerActions.switchCustomerTab}
            closeCustomerDetail={customerActions.closeCustomerDetail}
            handleResetPassword={customerActions.handleResetPassword}
            handleToggleUserStatus={customerActions.handleToggleUserStatus}
            handleDeleteUser={customerActions.handleDeleteUser}
            selectedCustomerProgramId={customerActions.selectedCustomerProgramId}
            setSelectedCustomerProgramId={customerActions.setSelectedCustomerProgramId}
            customerResponseStatusFilter={customerActions.customerResponseStatusFilter}
            setCustomerResponseStatusFilter={
              customerActions.setCustomerResponseStatusFilter
            }
            customerResponseSearch={customerActions.customerResponseSearch}
            setCustomerResponseSearch={customerActions.setCustomerResponseSearch}
            expandedResponseIds={customerActions.expandedResponseIds}
            setExpandedResponseIds={customerActions.setExpandedResponseIds}
          />
        )}

        {activeMenu === "members" && !customerActions.inspectingUserHealth && (
          <AdminCustomersList
            users={users}
            filteredMembers={filteredMembers}
            paginatedMembers={paginatedMembers}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            memberFilter={memberFilter}
            setMemberFilter={setMemberFilter}
            memberSort={memberSort}
            setMemberSort={setMemberSort}
            setMemberPage={setMemberPage}
            safeMemberPage={safeMemberPage}
            totalMemberPages={totalMemberPages}
            memberPageSize={MEMBER_PAGE_SIZE}
            currentAdminId={currentAdminId}
            isSuperadminUser={isSuperadminUser}
            userActionLoading={customerActions.userActionLoading}
            openCustomerDetail={customerActions.openCustomerDetail}
            handleResetPassword={customerActions.handleResetPassword}
            handleToggleUserStatus={customerActions.handleToggleUserStatus}
            handleDeleteUser={customerActions.handleDeleteUser}
          />
        )}

        {activeMenu === "community" && (canManagePrograms || currentAdminRole === "PARTNER_ADMIN") && (
          <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-6 border border-zinc-200/80 dark:border-white/10 shadow-xs space-y-6">
            <AdminOrganizationsManager
              organizations={masterData.organizations || []}
              isSuperadmin={canManagePrograms}
              currentAdminOrgId={currentAdminOrgId}
              onUpdated={(next) =>
                setMasterData((prev) => ({ ...prev, organizations: next }))
              }
              onNotify={setFeedback}
            />
          </div>
        )}

        {activeMenu === "team" && (canManagePrograms || currentAdminRole === "PARTNER_ADMIN") && (
          <AdminTeamView
            currentAdminRole={currentAdminRole}
            currentAdminOrgId={currentAdminOrgId}
            setFeedback={setFeedback}
          />
        )}

        {activeMenu === "payments" && isSuperadminUser && (
          <AdminPaymentsView
            qrisSearch={qrisSearch}
            setQrisSearch={setQrisSearch}
            setQrisPage={setQrisPage}
            pendingEnrollmentsCount={pendingEnrollments.length}
            paginatedQris={paginatedQris}
            filteredQrisCount={filteredQris.length}
            safeQrisPage={safeQrisPage}
            totalQrisPages={totalQrisPages}
            qrisPageSize={QRIS_PAGE_SIZE}
            approvingId={customerActions.approvingId}
            handleApprovePayment={customerActions.handleApprovePayment}
            setFeedback={setFeedback}
            supportRequests={supportRequests}
            resolvingSupportId={resolvingSupportId}
            onResolveSupportRequest={async (id, status) => {
              setResolvingSupportId(id);
              try {
                const res = await wellnessAdminUpdateSupportRequest({ id, status });
                if (res.success) {
                  setSupportRequests((prev) =>
                    prev.map((item) =>
                      item.id === id
                        ? { ...item, status, resolvedAt: new Date().toISOString() }
                        : item
                    )
                  );
                  setFeedback({ type: "success", text: res.message || "Support request updated." });
                } else {
                  setFeedback({ type: "error", text: res.message || "Failed to update support request." });
                }
              } finally {
                setResolvingSupportId(null);
              }
            }}
          />
        )}
      </main>

      <AdminModals
        publishModal={programActions.publishModal}
        setPublishModal={programActions.setPublishModal}
        selectedProgram={selectedProgram}
        publishingId={programActions.publishingId}
        setProgramDetailTab={setProgramDetailTab}
        handleSelectDay={dayActions.handleSelectDay}
        handleTogglePublish={programActions.handleTogglePublish}
      />
    </div>
  );
}
