import { redirect } from "next/navigation";
import { getWellnessSession, isAdminRole } from "@/wellness/security/session";
import { buildProgramScopeWhere } from "@/wellness/security/guards";
import { prisma } from "@/wellness/db";
import { AdminClient, AdminInitialRoute } from "@/components/admin/AdminClient";
import { parseCustomTaskFields } from "@/wellness/utils/custom-tasks";
import {
  safeJsonParse,
  parseTermsList,
  parseStringList,
  parseReferencesList,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
} from "@/wellness/utils/json";
import { wellnessGetMasterData } from "@/wellness/actions/master";
import { wellnessGetProgramTemplates } from "@/wellness/actions/templates";
import {
  PROGRAM_TAXONOMY_INCLUDE,
  serializeProgramTaxonomy,
} from "@/wellness/services/program-taxonomy";
import { calculateAgeFromDob } from "@/wellness/validators/auth";

function toClientMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("sb://")) {
    return `/api/media/signed?path=${encodeURIComponent(pathOrUrl)}`;
  }
  return pathOrUrl;
}

function toJsonString(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AdminCatchAllPageProps {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams?: Promise<{
    tab?: string;
    day?: string;
  }>;
}

export default async function AdminPage(props: AdminCatchAllPageProps) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  // 1. Strict Real-Time Database Session & Role Verification on EVERY Route Load / Refresh
  const session = await getWellnessSession();

  if (!session || !isAdminRole(session.role) || session.status !== "ACTIVE") {
    redirect("/?auth=signin&target=admin");
  }

  const programScopeWhere = buildProgramScopeWhere(session);

  // 2. Parse & Validate Route Segments (/admin, /admin/programs, /admin/programs/new, /admin/programs/[id], /admin/directories, /admin/customers, /admin/payments)
  const slugSegments = params?.slug || [];
  const primarySegment = slugSegments[0]?.toLowerCase() || "";
  const secondarySegment = slugSegments[1] || "";

  let activeMenu: AdminInitialRoute["menu"] = "dashboard";
  let isCreatingProgram = false;
  let requestedProgramIdentifier: string | null = null;
  let requestedCustomerIdentifier: string | null = null;

  if (!primarySegment || primarySegment === "overview" || primarySegment === "dashboard") {
    if (slugSegments.length > 1) {
      redirect("/admin");
    }
    activeMenu = "dashboard";
  } else if (primarySegment === "programs" || primarySegment === "program") {
    activeMenu = "programs";
    if (secondarySegment === "new" || secondarySegment === "create") {
      isCreatingProgram = true;
    } else if (secondarySegment) {
      requestedProgramIdentifier = secondarySegment;
    }
  } else if (primarySegment === "directories" || primarySegment === "master") {
    if (session.role !== "SUPERADMIN") {
      redirect("/admin");
    }
    activeMenu = "master";
  } else if (primarySegment === "customers" || primarySegment === "members") {
    activeMenu = "members";
    if (secondarySegment) {
      requestedCustomerIdentifier = secondarySegment;
    }
  } else if (primarySegment === "community" || primarySegment === "profile") {
    if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
      redirect("/admin");
    }
    activeMenu = "community";
  } else if (primarySegment === "team" || primarySegment === "coaches") {
    if (session.role !== "SUPERADMIN" && session.role !== "PARTNER_ADMIN") {
      redirect("/admin");
    }
    activeMenu = "team";
  } else if (primarySegment === "payments") {
    if (session.role !== "SUPERADMIN") {
      redirect("/admin");
    }
    activeMenu = "payments";
  } else {
    // Unknown sub-route -> redirect safely to /admin
    redirect("/admin");
  }

  // 3. Authoritative Parallel Database Queries (Fresh Single Source of Truth on every route navigation & refresh)
  const [
    usersRaw,
    programsData,
    enrollmentStats,
    masterDataResult,
    templatesResult,
    supportRequestsRaw,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(session.role === "SUPERADMIN"
          ? {}
          : {
              enrollments: {
                some: { program: programScopeWhere },
              },
            }),
      },
      take: 200,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        birthDate: true,
        gender: true,
        occupation: true,
        address: true,
        city: true,
        province: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        role: true,
        status: true,
        organizationId: true,
        coachProfileId: true,
        createdAt: true,
        enrollments: {
          where:
            session.role === "SUPERADMIN"
              ? {}
              : { program: programScopeWhere },
          select: {
            id: true,
            status: true,
            attendanceMode: true,
            paymentReference: true,
            paidAt: true,
            validUntilAt: true,
            termsAgreedAt: true,
            program: {
              select: {
                id: true,
                title: true,
                price: true,
                locationType: true,
                city: true,
                venueAddress: true,
                _count: { select: { days: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.program.findMany({
      where: {
        deletedAt: null,
        ...programScopeWhere,
      },
      take: 200,
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        days: {
          orderBy: { dayNumber: "asc" },
          include: {
            customTasks: {
              orderBy: { sortOrder: "asc" },
            },
            _count: {
              select: { progresses: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.programEnrollment.groupBy({
      by: ["programId", "status"],
      where: session.role === "SUPERADMIN" ? undefined : { program: programScopeWhere },
      _count: { id: true },
    }),
    wellnessGetMasterData(),
    wellnessGetProgramTemplates(),
    session.role === "SUPERADMIN"
      ? prisma.cohortSupportRequest.findMany({
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
            program: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  // Build O(1) subscriber count lookup map from SQL group-by
  const statsMap: Record<string, { active: number; pending: number }> = {};
  for (const stat of enrollmentStats) {
    if (!statsMap[stat.programId]) {
      statsMap[stat.programId] = { active: 0, pending: 0 };
    }
    if (stat.status === "ACTIVE") {
      statsMap[stat.programId].active = stat._count.id;
    } else if (stat.status === "PENDING") {
      statsMap[stat.programId].pending = stat._count.id;
    }
  }

  const programs = programsData.map((p) => {
    const tax = serializeProgramTaxonomy(p);
    return {
      id: p.id,
      title: p.title,
      batchNumber: p.batchNumber ?? null,
      slug: p.slug,
      description: p.description,
      coverImage: toClientMediaUrl(p.coverImagePath),
      introVideoUrl: p.introVideoUrl || null,
      difficultyLevel: p.difficultyLevel || "INTERMEDIATE",
      category: tax.category || "Pilates",
      equipment: tax.equipment || null,
      dailyCommitment: tax.dailyCommitment || null,
      coachName: tax.coachName,
      coachTitle: tax.coachTitle || null,
      organizationId: p.organizationId || null,
      organizationCache: tax.organizationName || null,
      durationDays: p.durationDays,
      actualPrice: p.actualPrice,
      discountPercentage: p.discountPercentage,
      price: p.price,
      minQuota: p.minQuota,
      maxQuota: p.maxQuota,
      locationType: p.locationType,
      city: p.city,
      venueAddress: p.venueAddress,
      customTerms: p.customTerms || null,
      termsList: parseTermsList(p.customTerms),
      targetState: p.targetState || DEFAULT_TARGET_STATE,
      methodology: p.methodology || DEFAULT_METHODOLOGY,
      expectedBenefits: parseStringList(p.expectedBenefitsJson, DEFAULT_PROGRAM_BENEFITS),
      scientificReferences: parseReferencesList(p.scientificReferencesJson, DEFAULT_PROGRAM_REFERENCES),
      programGuidelines: parseStringList(p.programGuidelinesJson, DEFAULT_PROGRAM_GUIDELINES),
      communityLink: p.communityLink,
      startDate: p.startAt,
      endDate: p.endAt,
      registrationOpenDate: p.registrationOpenAt,
      registrationDeadline: p.registrationDeadlineAt,
      status: p.status,
      isPublished: p.status === "PUBLISHED",
      dayCount: p.days.length,
      activeSubscribers: statsMap[p.id]?.active || 0,
      pendingSubscribers: statsMap[p.id]?.pending || 0,
      submissionCount: p.days.reduce((acc, d) => acc + (d._count?.progresses || 0), 0),
      days: p.days.map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        title: d.title,
        dayType: d.dayType,
        responseCount: d._count?.progresses || 0,
        workoutOptions: safeJsonParse<string[]>(d.workoutOptionsJson, []),
        sleepRecommendation: d.sleepRecommendation,
        dayNotifications: safeJsonParse<Array<{ time: string; message: string; label?: string }>>(d.dayNotificationsJson, []),
        videoUrl: d.videoUrl,
        videoChecklist: safeJsonParse<string[]>(d.videoChecklistJson, []),
        mealRecommendation: d.mealRecommendation,
        meetupLink: d.meetupLink,
        mapLink: d.mapLink,
        onsiteVenue: d.onsiteVenue,
        onsiteSchedule: d.onsiteSchedule,
        eventTitle: d.eventTitle,
        eventHost: d.eventHost,
        eventDetails: d.eventDetails,
        restInstructions: d.restInstructions,
        customTasks: d.customTasks.map((ct) => ({
          id: ct.id,
          programDayId: ct.programDayId,
          sortOrder: ct.sortOrder,
          taskType: ct.taskType as any,
          title: ct.title,
          instructions: ct.instructions,
          isRequired: ct.isRequired,
          fields: parseCustomTaskFields(ct.fieldsSchemaJson),
          translations: toJsonString(ct.translationsJson),
        })),
      })),
    };
  });

  // 4. Resolve specific program if URL is /admin/programs/[programIdOrSlug]
  let resolvedProgramId: string | null = null;
  if (activeMenu === "programs" && requestedProgramIdentifier) {
    const matched = programs.find(
      (p) => p.id === requestedProgramIdentifier || p.slug === requestedProgramIdentifier
    );
    if (!matched) {
      redirect("/admin/programs");
    }
    resolvedProgramId = matched.id;
  }

  // 5. Resolve specific customer if URL is /admin/customers/[customerId]
  // Load full dayProgress + photos on demand for the inspected customer only (avoids eager multi-MB query for all 200 users)
  let resolvedCustomerId: string | null = null;
  let inspectedDayProgress: Array<{
    id: string;
    videoWatched: boolean;
    isCompleted: boolean;
    checklistCompleted: string | null;
    selectedWorkout: string | null;
    workoutNotes: string | null;
    eventFeedback: string | null;
    mealCompliance: string | null;
    mealNotes: string | null;
    dailyReflection: string | null;
    happinessRate: number | null;
    bedtime: string | null;
    wakeTime: string | null;
    sleepDurationMinutes: number | null;
    assessmentResponse: string | null;
    completedAt: Date | null;
    updatedAt: Date;
    programDay: {
      id: string;
      dayNumber: number;
      title: string;
      dayType: string;
      programId: string;
      program: { id: string; title: string };
    };
  }> = [];

  if (activeMenu === "members" && requestedCustomerIdentifier) {
    const matchedCustomer = usersRaw.find(
      (u) =>
        u.id === requestedCustomerIdentifier ||
        u.email.toLowerCase() === requestedCustomerIdentifier.toLowerCase()
    );
    if (!matchedCustomer) {
      redirect("/admin/customers");
    }
    resolvedCustomerId = matchedCustomer.id;
    const rawProgress = await prisma.programDayProgress.findMany({
      where: {
        userId: matchedCustomer.id,
        ...(session.role === "SUPERADMIN"
          ? {}
          : { programDay: { program: programScopeWhere } }),
      },
      take: 200,
      select: {
        id: true,
        isVideoWatched: true,
        isCompleted: true,
        checklistCompletedJson: true,
        selectedWorkout: true,
        workoutNotes: true,
        eventFeedback: true,
        mealCompliance: true,
        mealNotes: true,
        dailyReflection: true,
        happinessRate: true,
        bedtime: true,
        wakeTime: true,
        sleepDurationMinutes: true,
        assessmentResponse: true,
        completedAt: true,
        updatedAt: true,
        programDay: {
          select: {
            id: true,
            dayNumber: true,
            title: true,
            dayType: true,
            programId: true,
            program: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });
    inspectedDayProgress = rawProgress.map((dp) => ({
      ...dp,
      videoWatched: dp.isVideoWatched,
      checklistCompleted: toJsonString(dp.checklistCompletedJson),
    }));
  }

  const users = usersRaw.map((u) => {
    const baseUser = {
      ...u,
      age: u.birthDate ? calculateAgeFromDob(u.birthDate) : null,
      enrollments: u.enrollments.map((e) => ({
        ...e,
        validUntil: e.validUntilAt,
      })),
    };
    return u.id === resolvedCustomerId
      ? { ...baseUser, dayProgress: inspectedDayProgress }
      : baseUser;
  });

  const supportRequests = supportRequestsRaw.map((sr) => ({
    id: sr.id,
    userId: sr.userId,
    userFullName: sr.user.fullName,
    userEmail: sr.user.email,
    userPhone: sr.user.phone,
    programId: sr.programId,
    programTitle: sr.program.title,
    enrollmentId: sr.enrollmentId,
    requestType: sr.requestType,
    reasonCode: sr.reasonCode,
    note: sr.note,
    status: sr.status,
    adminNote: sr.adminNote,
    resolvedAt: sr.resolvedAt ? sr.resolvedAt.toISOString() : null,
    createdAt: sr.createdAt.toISOString(),
  }));

  const rawTab = searchParams?.tab?.toLowerCase();
  const programDetailTab: "info" | "schedule" | "responses" =
    rawTab === "info" ? "info" : rawTab === "responses" ? "responses" : "schedule";

  const validCustomerTabs = [
    "overview",
    "responses",
    "notes",
  ] as const;
  const customerTab = validCustomerTabs.includes(
    rawTab as (typeof validCustomerTabs)[number]
  )
    ? (rawTab as (typeof validCustomerTabs)[number])
    : "overview";

  const parsedDay = searchParams?.day ? parseInt(searchParams.day, 10) : undefined;
  const selectedDayNum =
    parsedDay && !Number.isNaN(parsedDay) && parsedDay >= 1 ? parsedDay : undefined;

  const validMasterTabs = ["coaches", "organizations", "categories", "equipment", "commitments"] as const;
  const masterTab = validMasterTabs.includes(rawTab as (typeof validMasterTabs)[number])
    ? (rawTab as (typeof validMasterTabs)[number])
    : "coaches";

  const initialRoute: AdminInitialRoute = {
    menu: activeMenu,
    programId: resolvedProgramId,
    isCreating: isCreatingProgram,
    programTab: programDetailTab,
    day: selectedDayNum,
    masterTab,
    customerId: resolvedCustomerId,
    customerTab,
  };

  return (
    <AdminClient
      initialUsers={users}
      initialPrograms={programs}
      initialMasterData={masterDataResult.data}
      initialTemplates={templatesResult.data || []}
      initialSupportRequests={supportRequests}
      currentAdminId={session.userId}
      currentAdminRole={session.role}
      currentAdminOrgId={session.organizationId}
      currentAdminCoachId={session.coachProfileId}
      initialRoute={initialRoute}
    />
  );
}
