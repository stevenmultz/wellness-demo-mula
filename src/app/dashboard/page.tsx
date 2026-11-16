import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
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

export const dynamic = "force-dynamic";

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

  const locale = getServerLocale(session.preferredLocale);

  // Fetch enrollments, published programs, health profile, and body metric logs concurrently
  const [enrollments, allProgramsData, healthProfile, bodyMetricLogsRaw] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { userId: session.userId },
      include: {
        program: {
          include: {
            _count: { select: { days: true } },
            organization: { select: { name: true, logoUrl: true, isVerified: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.program.findMany({
      take: 100,
      where: {
        OR: [
          { status: { in: ["PUBLISH", "PUBLISHED", "ACTIVE", "COMING_SOON"] } },
          { isPublished: true },
          { enrollments: { some: { userId: session.userId } } },
        ],
        NOT: {
          status: { in: ["ARCHIVE", "DRAFT"] },
        },
      },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
        organization: { select: { name: true, logoUrl: true, isVerified: true } },
        days: {
          include: {
            progress: {
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
    }),
    prisma.customerHealthProfile.findUnique({
      where: { userId: session.userId },
    }),
    prisma.userBodyMetricLog
      .findMany({
        where: { userId: session.userId },
        orderBy: { recordedAt: "desc" },
        take: 100,
      })
      .then((rows) => rows.reverse()),
  ]);

  const userActiveProgramIds = new Set(
    enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.program.id)
  );

  const myPrograms = enrollments.map((e) => ({
    enrollmentId: e.id,
    programId: e.program.id,
    title: resolveLocalizedField(e.program.title, e.program.translations, locale, "title"),
    slug: e.program.slug,
    description: resolveLocalizedField(
      e.program.description,
      e.program.translations,
      locale,
      "description"
    ),
    coverImage: e.program.coverImage || null,
    coachName: e.program.coachName,
    organizationName: e.program.organization?.name || e.program.organizationCache || null,
    organizationLogo: e.program.organization?.logoUrl || null,
    organizationVerified: e.program.organization?.isVerified ?? false,
    language: e.program.language || "id",
    price: e.program.price,
    maxQuota: e.program.maxQuota,
    locationType: e.program.locationType,
    city: e.program.city,
    venueAddress: e.program.venueAddress,
    virtualFallbackAvailable: e.program.virtualFallbackAvailable,
    communityLink: e.program.communityLink,
    dayCount: e.program._count.days,
    startDate: e.program.startDate,
    endDate: e.program.endDate,
    registrationDeadline: e.program.registrationDeadline,
    status: e.status,
    attendanceMode: e.attendanceMode,
    paymentReference: e.paymentReference,
    invoiceExpiresAt: e.invoiceExpiresAt,
    paidAt: e.paidAt,
    validUntil: e.validUntil,
    termsList: parseTermsList(e.program.customTerms),
  }));

  const now = new Date();

  // Today's / tomorrow's tasks per ACTIVE program, resolved on the server in WIB (app timezone)
  const dailyPlans: ProgramDailyPlan[] = allProgramsData
    .filter((p) => userActiveProgramIds.has(p.id))
    .map((p) =>
      resolveProgramDailyPlan(
        p.id,
        p.startDate,
        p.days.map((d) => {
          const prog = d.progress[0] || null;
          return {
            id: d.id,
            dayNumber: d.dayNumber,
            title: resolveLocalizedField(d.title, d.translations, locale, "title"),
            dayType: d.dayType,
            videoUrl: d.videoUrl,
            mealRecommendation: resolveLocalizedField(
              d.mealRecommendation,
              d.translations,
              locale,
              "mealRecommendation"
            ) || null,
            restInstructions: resolveLocalizedField(
              d.restInstructions,
              d.translations,
              locale,
              "restInstructions"
            ) || null,
            eventTitle: d.eventTitle,
            eventDetails: d.eventDetails,
            customTasks: d.customTasks.map((ct) => ({
              id: ct.id,
              title: resolveLocalizedField(ct.title, ct.translations, locale, "title"),
              instructions: resolveLocalizedField(
                ct.instructions,
                ct.translations,
                locale,
                "instructions"
              ) || null,
              isDone: ct.submissions.length > 0,
            })),
            progress: prog
              ? {
                  videoWatched: prog.videoWatched,
                  isCompleted: prog.isCompleted,
                  mealCompliance: prog.mealCompliance,
                  dailyReflection: prog.dailyReflection,
                  bedtime: prog.bedtime,
                  wakeTime: prog.wakeTime,
                  eventFeedback: prog.eventFeedback,
                  checklistCompleted: prog.checklistCompleted,
                }
              : null,
          };
        }),
        now
      )
    );

  const allPrograms = allProgramsData.map((p) => {
    const isPaidMember = userActiveProgramIds.has(p.id);
    const normalizedStatus =
      p.status === "COMING_SOON" || p.status === "DONE" || p.status === "ARCHIVE"
        ? p.status
        : p.isPublished || p.status === "ACTIVE" || p.status === "PUBLISHED" || p.status === "PUBLISH"
        ? "ACTIVE"
        : "COMING_SOON";

    return {
      id: p.id,
      title: resolveLocalizedField(p.title, p.translations, locale, "title"),
      slug: p.slug,
      description: resolveLocalizedField(p.description, p.translations, locale, "description"),
      coverImage: p.coverImage || null,
      recommendedFor: p.recommendedFor,
      coachName: p.coachName,
      coachTitle: p.coachTitle,
      organizationName: p.organization?.name || p.organizationCache || null,
      organizationLogo: p.organization?.logoUrl || null,
      organizationVerified: p.organization?.isVerified ?? false,
      language: p.language || "id",
      category: p.category,
      difficultyLevel: p.difficultyLevel,
      dailyCommitment: p.dailyCommitment,
      durationDays: p.durationDays,
      actualPrice: p.actualPrice ?? p.price,
      discountPercentage: p.discountPercentage ?? 0,
      price: p.price,
      maxQuota: p.maxQuota,
      equipment: p.equipment || p.equipmentCache || "No Equipment",
      audience: p.audienceCache || p.recommendedFor || "All Levels",
      termsType: p.termsType || "STANDARD",
      locationType: p.locationType,
      city: p.city,
      venueAddress: p.venueAddress,
      virtualFallbackAvailable: p.virtualFallbackAvailable,
      enrolledCount: p._count.enrollments,
      communityLink: p.communityLink,
      status: normalizedStatus,
      startDate: p.startDate,
      endDate: p.endDate,
      registrationOpenDate: p.registrationOpenDate,
      registrationDeadline: p.registrationDeadline,
      dayCount: p.days.length,
      customTerms: p.customTerms,
      termsChapters: parseTermsChapters(p.customTerms),
      termsList: parseTermsList(p.customTerms),
      targetState: p.targetState || DEFAULT_TARGET_STATE,
      methodology: p.methodology || DEFAULT_METHODOLOGY,
      expectedBenefits: parseStringList(p.expectedBenefits, DEFAULT_PROGRAM_BENEFITS),
      scientificReferences: parseReferencesList(p.scientificReferences, DEFAULT_PROGRAM_REFERENCES),
      programGuidelines: parseStringList(p.programGuidelines, DEFAULT_PROGRAM_GUIDELINES),
      days: p.days.map((d) => {
        // SOW 5.3 Strict Calendar Drip Content normalized to Western Indonesia Time (WIB / UTC+7):
        // Day N unlocks at 00:00 WIB on batchStart + (dayNumber - 1) days
        const { unlockDate, deadline2359, isCalendarUnlocked, isPast2359 } =
          getProgramDayWibWindow(p.startDate, d.dayNumber, now);

        const progRecord = d.progress[0] || null;
        const checklistItems: string[] = safeJsonParse<string[]>(d.videoChecklist, []);
        const completedChecklist: string[] = safeJsonParse<string[]>(progRecord?.checklistCompleted, []);

        const videoDone =
          d.dayType !== "TRAINING_DAY" || !d.videoUrl
            ? true
            : !!progRecord?.videoWatched || !!progRecord?.isCompleted;
        let checklistDone = checklistItems.length === 0 || !!progRecord?.isCompleted;
        if (!checklistDone && d.dayType === "TRAINING_DAY") {
          const groups = parseWorkoutOptionGroups(
            safeJsonParse<string[]>(d.workoutOptions, []),
            checklistItems
          );
          const selectedOpt = progRecord?.selectedWorkout || groups[0]?.optionName || "Workout";
          const activeGroup =
            groups.find((g) => g.optionName.trim().toLowerCase() === selectedOpt.trim().toLowerCase()) ||
            groups[0];

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

        const requiredCustomTasks = d.customTasks.filter((ct) => ct.isRequired);
        const allRequiredCustomDone = requiredCustomTasks.every(
          (ct) => ct.submissions.length > 0
        );

        const isFullyCompleted =
          (!!progRecord?.isCompleted ||
            (!!progRecord &&
              videoDone &&
              checklistDone &&
              (checklistItems.length === 0 || completedChecklist.length > 0))) &&
          allRequiredCustomDone;

        // SOW 5.3 Skip Day Logic:
        // Automatically recorded as "Skipped Day" if user has not completed both workout video & daily assessment checklist by 23:59 on that day
        const isSkipped = isPast2359 && !isFullyCompleted;

        // SOW 5.7 Content & Video Protection:
        // Restrict media URLs strictly to verified paying members on unlocked calendar days
        const canAccessMedia = isPaidMember && isCalendarUnlocked;

        return {
          id: d.id,
          dayNumber: d.dayNumber,
          title: resolveLocalizedField(d.title, d.translations, locale, "title"),
          dayType: d.dayType,
          workoutOptions: canAccessMedia ? safeJsonParse<string[]>(d.workoutOptions, []) : [],
          sleepRecommendation: canAccessMedia
            ? d.sleepRecommendation || "Target 8 Hours • Wind down before 22:30 WIB"
            : null,
          dayNotifications: canAccessMedia
            ? safeJsonParse<Array<{ time: string; message: string; label?: string }>>(d.dayNotifications, [])
            : [],
          unlockDate: unlockDate.toISOString(),
          isCalendarUnlocked,
          isPast2359,
          isSkipped,
          videoUrl: canAccessMedia ? d.videoUrl : null,
          videoChecklist: canAccessMedia ? checklistItems : [],
          mealRecommendation:
            resolveLocalizedField(d.mealRecommendation, d.translations, locale, "mealRecommendation") || null,
          dailyAssessment: canAccessMedia ? d.dailyAssessment : null,
          pendingReminder: canAccessMedia ? d.pendingReminder : null,
          completedReminder: canAccessMedia ? d.completedReminder : null,
          meetupLink: isPaidMember ? d.meetupLink : null,
          mapLink: d.mapLink,
          eventTitle: d.eventTitle,
          eventHost: d.eventHost,
          eventDetails: isPaidMember ? d.eventDetails : null,
          onsiteVenue: d.onsiteVenue,
          onsiteSchedule: d.onsiteSchedule,
          restInstructions: canAccessMedia
            ? resolveLocalizedField(d.restInstructions, d.translations, locale, "restInstructions") || null
            : null,
          coachName: d.coachName,
          recommendedFor: d.recommendedFor,
          customTasks: canAccessMedia
            ? d.customTasks.map((ct) => {
                const sub = ct.submissions[0] || null;
                return {
                  id: ct.id,
                  programDayId: ct.programDayId,
                  sortOrder: ct.sortOrder,
                  taskType: ct.taskType as any,
                  title: resolveLocalizedField(ct.title, ct.translations, locale, "title"),
                  instructions:
                    resolveLocalizedField(ct.instructions, ct.translations, locale, "instructions") || null,
                  isRequired: ct.isRequired,
                  fields: parseCustomTaskFields(ct.fieldsSchema),
                  translations: ct.translations,
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
                videoWatched: progRecord.videoWatched,
                isCompleted: isFullyCompleted,
                checklistCompleted: progRecord.checklistCompleted,
                selectedWorkout: progRecord.selectedWorkout,
                photoBeforeUrl: progRecord.photoBeforeUrl,
                photoAfterUrl: progRecord.photoAfterUrl,
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
      }),
    };
  });

  const user = {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    phone: session.phone,
    age: session.age,
    dateOfBirth: session.dateOfBirth ? session.dateOfBirth.toISOString().slice(0, 10) : null,
    avatarUrl: session.avatarUrl,
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
      initialHealthProfile={healthProfile}
      initialBodyMetricLogs={bodyMetricLogs}
    />
  );
}
