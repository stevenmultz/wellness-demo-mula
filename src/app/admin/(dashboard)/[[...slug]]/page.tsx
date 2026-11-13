import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
import { prisma } from "@/wellness/db";
import { AdminClient, AdminInitialRoute } from "@/components/admin/AdminClient";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AdminCatchAllPageProps {
  params: {
    slug?: string[];
  };
  searchParams?: {
    tab?: string;
    day?: string;
  };
}

export default async function AdminPage({
  params,
  searchParams,
}: AdminCatchAllPageProps) {
  // 1. Strict Real-Time Database Session & Role Verification on EVERY Route Load / Refresh
  const session = await getWellnessSession();

  if (!session || session.role !== "SUPERADMIN" || session.status !== "ACTIVE") {
    redirect("/?auth=signin&target=admin");
  }

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
    activeMenu = "master";
  } else if (primarySegment === "customers" || primarySegment === "members") {
    activeMenu = "members";
    if (secondarySegment) {
      requestedCustomerIdentifier = secondarySegment;
    }
  } else if (primarySegment === "payments") {
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
  ] = await Promise.all([
    prisma.user.findMany({
      take: 200,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        age: true,
        gender: true,
        occupation: true,
        address: true,
        city: true,
        province: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        role: true,
        status: true,
        createdAt: true,
        healthProfile: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            attendanceMode: true,
            paymentReference: true,
            paidAt: true,
            validUntil: true,
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
      include: {
        days: {
          orderBy: { dayNumber: "asc" },
          include: {
            _count: {
              select: { progress: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.programEnrollment.groupBy({
      by: ["programId", "status"],
      _count: { id: true },
    }),
    wellnessGetMasterData(),
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

  const programs = programsData.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    coverImage: p.coverImage || null,
    difficultyLevel: p.difficultyLevel || "INTERMEDIATE",
    category: p.category || "Pilates",
    equipment: p.equipment || null,
    dailyCommitment: p.dailyCommitment || null,
    recommendedFor: p.recommendedFor,
    coachName: p.coachName,
    coachTitle: p.coachTitle || null,
    durationDays: p.durationDays,
    actualPrice: p.actualPrice,
    discountPercentage: p.discountPercentage,
    price: p.price,
    maxQuota: p.maxQuota,
    locationType: p.locationType,
    city: p.city,
    venueAddress: p.venueAddress,
    virtualFallbackAvailable: p.virtualFallbackAvailable,
    termsType: ((p.termsType as "STANDARD" | "CUSTOM") || "CUSTOM"),
    customTerms: p.customTerms || null,
    termsList: parseTermsList(p.customTerms),
    targetState: p.targetState || DEFAULT_TARGET_STATE,
    methodology: p.methodology || DEFAULT_METHODOLOGY,
    expectedBenefits: parseStringList(p.expectedBenefits, DEFAULT_PROGRAM_BENEFITS),
    scientificReferences: parseReferencesList(p.scientificReferences, DEFAULT_PROGRAM_REFERENCES),
    programGuidelines: parseStringList(p.programGuidelines, DEFAULT_PROGRAM_GUIDELINES),
    communityLink: p.communityLink,
    startDate: p.startDate,
    endDate: p.endDate,
    registrationOpenDate: p.registrationOpenDate,
    registrationDeadline: p.registrationDeadline,
    status: ((p.status as "NOT_SHOW" | "COMING_SOON" | "ACTIVE" | "DRAFT" | "PUBLISHED") || (p.isPublished ? "PUBLISHED" : "DRAFT")),
    isPublished: p.isPublished,
    dayCount: p.days.length,
    activeSubscribers: statsMap[p.id]?.active || 0,
    pendingSubscribers: statsMap[p.id]?.pending || 0,
    submissionCount: p.days.reduce((acc, d) => acc + (d._count?.progress || 0), 0),
    days: p.days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      title: d.title,
      dayType: d.dayType,
      responseCount: d._count?.progress || 0,
      workoutOptions: safeJsonParse<string[]>(d.workoutOptions, []),
      sleepRecommendation: d.sleepRecommendation,
      dayNotifications: safeJsonParse<Array<{ time: string; message: string; label?: string }>>(d.dayNotifications, []),
      videoUrl: d.videoUrl,
      videoChecklist: safeJsonParse<string[]>(d.videoChecklist, []),
      mealRecommendation: d.mealRecommendation,
      dailyAssessment: d.dailyAssessment,
      pendingReminder: d.pendingReminder,
      completedReminder: d.completedReminder,
      meetupLink: d.meetupLink,
      mapLink: d.mapLink,
      onsiteVenue: d.onsiteVenue,
      onsiteSchedule: d.onsiteSchedule,
      eventTitle: d.eventTitle,
      eventHost: d.eventHost,
      eventDetails: d.eventDetails,
      restInstructions: d.restInstructions,
      coachName: d.coachName,
      recommendedFor: d.recommendedFor,
    })),
  }));

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
    photoBeforeUrl: string | null;
    photoAfterUrl: string | null;
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
    inspectedDayProgress = await prisma.programDayProgress.findMany({
      where: { userId: matchedCustomer.id },
      select: {
        id: true,
        videoWatched: true,
        isCompleted: true,
        checklistCompleted: true,
        selectedWorkout: true,
        photoBeforeUrl: true,
        photoAfterUrl: true,
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
  }

  const users = usersRaw.map((u) =>
    u.id === resolvedCustomerId ? { ...u, dayProgress: inspectedDayProgress } : u
  );

  const rawTab = searchParams?.tab?.toLowerCase();
  const programDetailTab: "info" | "schedule" | "responses" =
    rawTab === "info" ? "info" : rawTab === "responses" ? "responses" : "schedule";

  const validCustomerTabs = [
    "overview",
    "responses",
    "health",
    "medical",
    "lifestyle",
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

  const validMasterTabs = ["coaches", "audience", "categories", "equipment", "commitments"] as const;
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
      currentAdminId={session.userId}
      initialRoute={initialRoute}
    />
  );
}
