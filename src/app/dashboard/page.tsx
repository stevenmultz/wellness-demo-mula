import type { Viewport } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
import { isUserOnboardingComplete } from "@/wellness/validators/auth";
import { prisma } from "@/wellness/db";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { ZeraLogoLoading } from "@/components/common/ZeraLogoLoading";
import {
  safeJsonParse,
  parseTermsList,
  parseTermsChapters,
  parseStringList,
  parseReferencesList,
  parseWorkoutOptionGroups,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  DEFAULT_METHODOLOGY,
} from "@/wellness/utils/json";
import { getProgramDayWibWindow } from "@/wellness/utils/timezone";
import { resolveProgramDailyPlan, ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { getServerLocale } from "@/wellness/i18n/server";
import { resolveLocalizedField } from "@/wellness/i18n/types";
import { parseCustomTaskFields, parseCustomSubmissionValues } from "@/wellness/utils/custom-tasks";
import {
  PROGRAM_TAXONOMY_INCLUDE,
  serializeProgramTaxonomy,
} from "@/wellness/services/program-taxonomy";

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

export const viewport: Viewport = {
  themeColor: "#f6f6f4",
  colorScheme: "light",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<ZeraLogoLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await getWellnessSession();
  if (!session) {
    redirect("/?auth=signin&target=dashboard");
  }
  if (!isUserOnboardingComplete(session)) {
    redirect("/onboarding");
  }

  const locale = await getServerLocale(session.preferredLocale);

  // Stage 1: Fetch enrollments, lightweight published catalog metadata, and body metrics concurrently
  const [enrollments, catalogProgramsData, bodyMetricLogsRaw] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId: session.userId },
      include: {
        program: {
          include: {
            ...PROGRAM_TAXONOMY_INCLUDE,
            _count: { select: { days: true } },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { qrisStringOrUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.program.findMany({
      take: 150,
      where: {
        deletedAt: null,
        status: "PUBLISHED",
      },
      include: {
        ...PROGRAM_TAXONOMY_INCLUDE,
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
        // Lightweight syllabus fields only for non-enrolled catalog preview (zero progresses/customTasks/JSON bloat)
        days: {
          select: {
            id: true,
            dayNumber: true,
            title: true,
            dayType: true,
            mapLink: true,
            eventTitle: true,
            eventHost: true,
            onsiteVenue: true,
            onsiteSchedule: true,
          },
          orderBy: { dayNumber: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userBodyMetricLog
      .findMany({
        where: { userId: session.userId },
        orderBy: { recordedAt: "desc" },
        take: 100,
      })
      .then((rows) => rows.reverse()),
  ]);

  const activeEnrollmentByProgramId = new Map(
    enrollments.filter((e) => e.status === "ACTIVE").map((e) => [e.program.id, e])
  );
  const userActiveProgramIds = new Set(activeEnrollmentByProgramId.keys());

  // Stage 2: Load full curriculum, progresses, customTasks & submissions ONLY for the user's ACTIVE enrolled programs
  const activeProgramIdsList = Array.from(userActiveProgramIds);
  const activeProgramsFull =
    activeProgramIdsList.length > 0
      ? await prisma.program.findMany({
          where: {
            id: { in: activeProgramIdsList },
            deletedAt: null,
          },
          include: {
            ...PROGRAM_TAXONOMY_INCLUDE,
            _count: {
              select: {
                enrollments: { where: { status: "ACTIVE" } },
              },
            },
            days: {
              include: {
                progresses: {
                  where: { userId: session.userId },
                },
                customTasks: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    submissions: {
                      where: { userId: session.userId },
                    },
                  },
                },
              },
              orderBy: { dayNumber: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const activeFullById = new Map(activeProgramsFull.map((p) => [p.id, p]));
  const combinedProgramIds = new Set<string>();
  const allProgramsList: Array<
    | { kind: "active"; program: (typeof activeProgramsFull)[number] }
    | { kind: "catalog"; program: (typeof catalogProgramsData)[number] }
  > = [];

  for (const p of activeProgramsFull) {
    combinedProgramIds.add(p.id);
    allProgramsList.push({ kind: "active", program: p });
  }
  for (const p of catalogProgramsData) {
    if (combinedProgramIds.has(p.id)) continue;
    combinedProgramIds.add(p.id);
    allProgramsList.push({ kind: "catalog", program: p });
  }

  const myPrograms = enrollments.map((e) => {
    const tax = serializeProgramTaxonomy(e.program);
    const effectiveStart =
      e.program.locationType === "ONLINE"
        ? e.paidAt ?? e.approvedAt ?? e.createdAt ?? e.program.startAt
        : e.program.startAt;
    return {
      enrollmentId: e.id,
      programId: e.program.id,
      title: e.program.title,
      batchNumber: e.program.batchNumber ?? null,
      slug: e.program.slug,
      description: e.program.description,
      coverImage: toClientMediaUrl(e.program.coverImagePath),
      introVideoUrl: e.program.introVideoUrl || null,
      coachName: tax.coachName,
      organizationName: tax.organizationName || null,
      organizationLogo: toClientMediaUrl(tax.organizationLogoPath),
      organizationVerified: tax.organizationVerified ?? false,
      price: e.program.price,
      maxQuota: e.program.maxQuota,
      locationType: e.program.locationType,
      city: e.program.city,
      venueAddress: e.program.venueAddress,
      communityLink: e.program.communityLink,
      dayCount: e.program._count.days,
      startDate: effectiveStart,
      endDate: e.program.endAt,
      registrationDeadline: e.program.registrationDeadlineAt,
      status: e.status,
      attendanceMode: e.attendanceMode,
      paymentReference: e.paymentReference,
      qrStringOrUrl: e.transactions[0]?.qrisStringOrUrl ?? null,
      invoiceExpiresAt: e.invoiceExpiresAt,
      paidAt: e.paidAt,
      validUntil: e.validUntilAt,
      termsList: parseTermsList(e.program.customTerms),
    };
  });

  const now = new Date();

  // Today's / tomorrow's tasks per ACTIVE program, resolved on the server in WIB (app timezone)
  const dailyPlans: ProgramDailyPlan[] = activeProgramsFull
    .map((p) => {
      const enr = activeEnrollmentByProgramId.get(p.id);
      const effectiveStart =
        p.locationType === "ONLINE"
          ? enr?.paidAt ?? enr?.approvedAt ?? enr?.createdAt ?? p.startAt
          : p.startAt;
      return resolveProgramDailyPlan(
        p.id,
        effectiveStart,
        p.days.map((d) => {
          const prog = d.progresses[0] || null;
          const normalizedDayType =
            p.locationType === "ONLINE" &&
            (d.dayType === "CONNECTION_DAY" || (d.dayType as string) === "MEETUP_DAY")
              ? "REST_DAY"
              : d.dayType;
          return {
            id: d.id,
            dayNumber: d.dayNumber,
            title: d.title,
            dayType: normalizedDayType,
            videoUrl: d.videoUrl,
            mealRecommendation: d.mealRecommendation || null,
            restInstructions: d.restInstructions || null,
            eventTitle: d.eventTitle,
            eventDetails: d.eventDetails,
            customTasks: d.customTasks.map((ct) => ({
              id: ct.id,
              title: resolveLocalizedField(ct.title, ct.translationsJson, locale, "title"),
              instructions: resolveLocalizedField(
                ct.instructions,
                ct.translationsJson,
                locale,
                "instructions"
              ) || null,
              isDone: ct.submissions.length > 0,
            })),
            progress: prog
              ? {
                  videoWatched: prog.isVideoWatched,
                  isCompleted: prog.isCompleted,
                  mealCompliance: prog.mealCompliance,
                  mealNotes: prog.mealNotes,
                  dailyReflection: prog.dailyReflection,
                  bedtime: prog.bedtime,
                  wakeTime: prog.wakeTime,
                  eventFeedback: prog.eventFeedback,
                  checklistCompleted: toJsonString(prog.checklistCompletedJson),
                  workoutNotes: prog.workoutNotes,
                  selectedWorkout: prog.selectedWorkout,
                }
              : null,
          };
        }),
        now,
        p.locationType
      );
    });

  void activeFullById;

  const allPrograms = allProgramsList.map((entry) => {
    const p = entry.program;
    const isPaidMember = entry.kind === "active";
    const activeEnrollment = activeEnrollmentByProgramId.get(p.id);
    const effectiveStartAt =
      p.locationType === "ONLINE"
        ? activeEnrollment?.paidAt ??
          activeEnrollment?.approvedAt ??
          activeEnrollment?.createdAt ??
          p.startAt
        : p.startAt;
    const tax = serializeProgramTaxonomy(p);
    const normalizedStatus =
      p.status === "DONE" || p.status === "ARCHIVED"
        ? p.status
        : p.status === "PUBLISHED" || p.status === "OPEN"
        ? "ACTIVE"
        : "COMING_SOON";

    const mappedDays =
      entry.kind === "catalog"
        ? entry.program.days.map((d) => {
            const normalizedDayType =
              p.locationType === "ONLINE" &&
              (d.dayType === "CONNECTION_DAY" || (d.dayType as string) === "MEETUP_DAY")
                ? ("REST_DAY" as const)
                : d.dayType;
            return {
              id: d.id,
              dayNumber: d.dayNumber,
              title: d.title,
              dayType: normalizedDayType,
              workoutOptions: [] as string[],
              sleepRecommendation: null,
              dayNotifications: [] as Array<{ time: string; message: string; label?: string }>,
              unlockDate: "",
              isCalendarUnlocked: false,
              isPast2359: false,
              isSkipped: false,
              videoUrl: null,
              videoChecklist: [] as string[],
              mealRecommendation: null,
              meetupLink: null,
              mapLink: d.mapLink,
              eventTitle: d.eventTitle,
              eventHost: d.eventHost,
              eventDetails: null,
              onsiteVenue: d.onsiteVenue,
              onsiteSchedule: d.onsiteSchedule,
              restInstructions: null,
              customTasks: [],
              userProgress: null,
            };
          })
        : entry.program.days.map((d) => {
            const normalizedDayType =
              p.locationType === "ONLINE" &&
              (d.dayType === "CONNECTION_DAY" || (d.dayType as string) === "MEETUP_DAY")
                ? ("REST_DAY" as const)
                : d.dayType;
            const hasScheduleStart = Boolean(effectiveStartAt);
            const { unlockDate, isCalendarUnlocked, isPast2359 } = !hasScheduleStart
              ? { unlockDate: null, isCalendarUnlocked: true, isPast2359: false }
              : getProgramDayWibWindow(effectiveStartAt!, d.dayNumber, now);

            const progRecord = d.progresses[0] || null;
            const checklistItems: string[] = safeJsonParse<string[]>(d.videoChecklistJson, []);
            const completedChecklist: string[] = safeJsonParse<string[]>(
              progRecord?.checklistCompletedJson,
              []
            );

            const videoDone =
              normalizedDayType !== "TRAINING_DAY" || !d.videoUrl
                ? true
                : !!progRecord?.isVideoWatched || !!progRecord?.isCompleted;
            let checklistDone = checklistItems.length === 0 || !!progRecord?.isCompleted;
            if (!checklistDone && normalizedDayType === "TRAINING_DAY") {
              const groups = parseWorkoutOptionGroups(
                safeJsonParse<string[]>(d.workoutOptionsJson, []),
                checklistItems
              );
              const selectedOpt = progRecord?.selectedWorkout || groups[0]?.optionName || "Workout";
              const activeGroup =
                groups.find(
                  (g) => g.optionName.trim().toLowerCase() === selectedOpt.trim().toLowerCase()
                ) || groups[0];

              if (activeGroup && activeGroup.movements.length > 0) {
                const checkedKeys = new Set(
                  completedChecklist.map((item) =>
                    (item.includes("=") ? item.split("=")[0] : item).trim().toLowerCase()
                  )
                );
                checklistDone = activeGroup.movements.every((m) => {
                  const scopedKey = `[${activeGroup.optionName.trim()}] ${m.name.trim()}`.toLowerCase();
                  const plainKey = m.name.trim().toLowerCase();
                  return checkedKeys.has(scopedKey) || checkedKeys.has(plainKey);
                });
              } else {
                checklistDone = checklistItems.every((item) => completedChecklist.includes(item));
              }
            }

            // ALL custom tasks on the day are required (no optional custom tasks)
            const allCustomDone = d.customTasks.every((ct) => ct.submissions.length > 0);

            const sleepDone = Boolean(
              progRecord?.bedtime &&
                progRecord?.wakeTime &&
                progRecord.bedtime !== "SKIPPED" &&
                progRecord.wakeTime !== "SKIPPED"
            );
            const mealDone = Boolean(
              progRecord?.mealCompliance && progRecord.mealCompliance !== "SKIPPED"
            );
            const activityDone =
              normalizedDayType === "TRAINING_DAY"
                ? videoDone &&
                  checklistDone &&
                  Boolean(
                    progRecord?.isCompleted ||
                      progRecord?.isVideoWatched ||
                      (progRecord?.workoutNotes && progRecord.workoutNotes !== "SKIPPED") ||
                      (progRecord?.selectedWorkout && progRecord.selectedWorkout !== "SKIPPED") ||
                      completedChecklist.length > 0
                  )
                : normalizedDayType === "REST_DAY"
                  ? Boolean(
                      progRecord?.isCompleted ||
                        (progRecord?.workoutNotes && progRecord.workoutNotes !== "SKIPPED") ||
                        completedChecklist.length > 0
                    )
                  : Boolean(
                      progRecord?.isCompleted ||
                        (progRecord?.eventFeedback && progRecord.eventFeedback !== "SKIPPED")
                    );

            // Daily Reflection removed: 3 core tasks (Sleep + Activity + Meal) + ALL custom tasks
            const isFullyCompleted =
              (!!progRecord?.isCompleted ||
                (!!progRecord && sleepDone && activityDone && mealDone)) &&
              allCustomDone;

            const isSkipped = hasScheduleStart && isPast2359 && !isFullyCompleted;
            const canAccessMedia = isPaidMember && isCalendarUnlocked;

            return {
              id: d.id,
              dayNumber: d.dayNumber,
              title: d.title,
              dayType: normalizedDayType,
              workoutOptions: canAccessMedia ? safeJsonParse<string[]>(d.workoutOptionsJson, []) : [],
              sleepRecommendation: canAccessMedia ? d.sleepRecommendation || null : null,
              dayNotifications: canAccessMedia
                ? safeJsonParse<Array<{ time: string; message: string; label?: string }>>(
                    d.dayNotificationsJson,
                    []
                  )
                : [],
              unlockDate: unlockDate ? unlockDate.toISOString() : "",
              isCalendarUnlocked,
              isPast2359,
              isSkipped,
              videoUrl: canAccessMedia ? d.videoUrl : null,
              videoChecklist: canAccessMedia ? checklistItems : [],
              mealRecommendation: d.mealRecommendation || null,
              meetupLink: isPaidMember ? d.meetupLink : null,
              mapLink: d.mapLink,
              eventTitle: d.eventTitle,
              eventHost: d.eventHost,
              eventDetails: isPaidMember ? d.eventDetails : null,
              onsiteVenue: d.onsiteVenue,
              onsiteSchedule: d.onsiteSchedule,
              restInstructions: canAccessMedia ? d.restInstructions || null : null,
              customTasks: canAccessMedia
                ? d.customTasks.map((ct) => {
                    const sub = ct.submissions[0] || null;
                    return {
                      id: ct.id,
                      programDayId: ct.programDayId,
                      sortOrder: ct.sortOrder,
                      taskType: ct.taskType as any,
                      title: resolveLocalizedField(ct.title, ct.translationsJson, locale, "title"),
                      instructions:
                        resolveLocalizedField(
                          ct.instructions,
                          ct.translationsJson,
                          locale,
                          "instructions"
                        ) || null,
                      isRequired: true,
                      fields: parseCustomTaskFields(ct.fieldsSchemaJson),
                      translations: toJsonString(ct.translationsJson),
                      submission: sub
                        ? {
                            id: sub.id,
                            values: parseCustomSubmissionValues(sub.valuesJson),
                            submittedAt: sub.submittedAt.toISOString(),
                            updatedAt: sub.updatedAt.toISOString(),
                          }
                        : null,
                    };
                  })
                : [],
              userProgress: progRecord
                ? {
                    id: progRecord.id,
                    videoWatched: progRecord.isVideoWatched,
                    isCompleted: isFullyCompleted,
                    checklistCompleted: toJsonString(progRecord.checklistCompletedJson),
                    selectedWorkout: progRecord.selectedWorkout,
                    workoutNotes: progRecord.workoutNotes,
                    eventFeedback: progRecord.eventFeedback,
                    mealCompliance: progRecord.mealCompliance,
                    mealNotes: progRecord.mealNotes,
                    dailyReflection: progRecord.dailyReflection,
                    happinessRate: progRecord.happinessRate,
                    bedtime: progRecord.bedtime,
                    wakeTime: progRecord.wakeTime,
                    sleepDurationMinutes: progRecord.sleepDurationMinutes,
                    assessmentResponse: progRecord.assessmentResponse,
                  }
                : null,
            };
          });

    return {
      id: p.id,
      title: p.title,
      batchNumber: p.batchNumber ?? null,
      slug: p.slug,
      description: p.description,
      coverImage: toClientMediaUrl(p.coverImagePath),
      introVideoUrl: p.introVideoUrl || null,
      coachName: tax.coachName,
      coachTitle: tax.coachTitle,
      organizationName: tax.organizationName || null,
      organizationLogo: toClientMediaUrl(tax.organizationLogoPath),
      organizationVerified: tax.organizationVerified ?? false,
      category: tax.category,
      difficultyLevel: p.difficultyLevel,
      dailyCommitment: tax.dailyCommitment,
      durationDays: p.durationDays,
      actualPrice: p.actualPrice ?? p.price,
      discountPercentage: p.discountPercentage ?? 0,
      price: p.price,
      minQuota: p.minQuota,
      maxQuota: p.maxQuota,
      equipment: tax.equipment || "No Equipment",
      locationType: p.locationType,
      city: p.city,
      venueAddress: p.venueAddress,
      enrolledCount: p._count.enrollments,
      communityLink: p.communityLink,
      status: normalizedStatus,
      startDate: p.startAt,
      endDate: p.endAt,
      registrationOpenDate: p.registrationOpenAt,
      registrationDeadline: p.registrationDeadlineAt,
      dayCount: p.days.length,
      customTerms: p.customTerms,
      termsChapters: parseTermsChapters(p.customTerms),
      termsList: parseTermsList(p.customTerms),
      targetState: p.targetState || DEFAULT_TARGET_STATE,
      methodology: p.methodology || DEFAULT_METHODOLOGY,
      expectedBenefits: parseStringList(p.expectedBenefitsJson, DEFAULT_PROGRAM_BENEFITS),
      scientificReferences: parseReferencesList(
        p.scientificReferencesJson,
        DEFAULT_PROGRAM_REFERENCES
      ),
      programGuidelines: parseStringList(p.programGuidelinesJson, DEFAULT_PROGRAM_GUIDELINES),
      days: mappedDays,
    };
  });

  const user = {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    phone: session.phone,
    age: session.age,
    dateOfBirth: session.dateOfBirth ? session.dateOfBirth.toISOString().slice(0, 10) : null,
    avatarUrl: toClientMediaUrl(session.avatarPath),
    gender: session.gender,
    occupation: session.occupation,
    address: session.address,
    city: session.city,
    province: session.province,
    emergencyContactName: session.emergencyContactName,
    emergencyContactPhone: session.emergencyContactPhone,
    role: session.role,
    status: session.status,
    createdAt: session.createdAt,
  };

  const bodyMetricLogs = bodyMetricLogsRaw.map((m) => ({
    id: m.id,
    programId: m.programId,
    programDayId: m.programDayId,
    source: m.source,
    weightKg: m.weightKg,
    heightCm: m.heightCm,
    waistCm: m.waistCm,
    chestCm: m.chestCm,
    hipsCm: m.hipsCm,
    bodyFatPct: m.bodyFatPct,
    restingHr: m.restingHr,
    notes: m.notes,
    recordedAt: m.recordedAt.toISOString(),
  }));

  return (
    <DashboardClient
      user={user}
      myPrograms={myPrograms}
      allPrograms={allPrograms}
      dailyPlans={dailyPlans}
      initialBodyMetricLogs={bodyMetricLogs}
    />
  );
}
