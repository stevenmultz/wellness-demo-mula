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

  // Fetch enrollments, published programs, and body metric logs concurrently
  const [enrollments, allProgramsData, bodyMetricLogsRaw] = await Promise.all([
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
      take: 250,
      where: {
        deletedAt: null,
        OR: [
          { status: "PUBLISHED" },
          {
            enrollments: {
              some: {
                userId: session.userId,
                status: "ACTIVE",
              },
            },
          },
        ],
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

  const myPrograms = enrollments.map((e) => {
    const tax = serializeProgramTaxonomy(e.program);
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
      startDate: e.program.startAt,
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
  const dailyPlans: ProgramDailyPlan[] = allProgramsData
    .filter((p) => userActiveProgramIds.has(p.id))
    .map((p) =>
      resolveProgramDailyPlan(
        p.id,
        p.startAt,
        p.days.map((d) => {
          const prog = d.progresses[0] || null;
          return {
            id: d.id,
            dayNumber: d.dayNumber,
            title: d.title,
            dayType: d.dayType,
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
      )
    );

  const allPrograms = allProgramsData.map((p) => {
    const isPaidMember = userActiveProgramIds.has(p.id);
    const tax = serializeProgramTaxonomy(p);
    const normalizedStatus =
      p.status === "DONE" || p.status === "ARCHIVED"
        ? p.status
        : p.status === "PUBLISHED" || p.status === "OPEN"
        ? "ACTIVE"
        : "COMING_SOON";

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
      scientificReferences: parseReferencesList(p.scientificReferencesJson, DEFAULT_PROGRAM_REFERENCES),
      programGuidelines: parseStringList(p.programGuidelinesJson, DEFAULT_PROGRAM_GUIDELINES),
      days: p.days.map((d) => {
        const isAnytime = p.locationType === "ONLINE" || !p.startAt;
        // HYBRID cohorts use strict WIB calendar drip (00:00 WIB on batchStart + (dayNumber - 1) days).
        // Full ONLINE programs have no date range and unlock all days immediately for anytime access.
        const { unlockDate, isCalendarUnlocked, isPast2359 } = isAnytime
          ? { unlockDate: null, isCalendarUnlocked: true, isPast2359: false }
          : getProgramDayWibWindow(p.startAt!, d.dayNumber, now);

        const progRecord = d.progresses[0] || null;
        const checklistItems: string[] = safeJsonParse<string[]>(d.videoChecklistJson, []);
        const completedChecklist: string[] = safeJsonParse<string[]>(progRecord?.checklistCompletedJson, []);

        const videoDone =
          d.dayType !== "TRAINING_DAY" || !d.videoUrl
            ? true
            : !!progRecord?.isVideoWatched || !!progRecord?.isCompleted;
        let checklistDone = checklistItems.length === 0 || !!progRecord?.isCompleted;
        if (!checklistDone && d.dayType === "TRAINING_DAY") {
          const groups = parseWorkoutOptionGroups(
            safeJsonParse<string[]>(d.workoutOptionsJson, []),
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

        // SOW 5.3 Skip Day Logic (HYBRID scheduled cohorts only; ONLINE is anytime)
        const isSkipped = !isAnytime && isPast2359 && !isFullyCompleted;

        // SOW 5.7 Content & Video Protection:
        // Restrict media URLs strictly to verified paying members on unlocked days
        const canAccessMedia = isPaidMember && isCalendarUnlocked;

        return {
          id: d.id,
          dayNumber: d.dayNumber,
          title: d.title,
          dayType: d.dayType,
          workoutOptions: canAccessMedia ? safeJsonParse<string[]>(d.workoutOptionsJson, []) : [],
          sleepRecommendation: canAccessMedia ? d.sleepRecommendation || null : null,
          dayNotifications: canAccessMedia
            ? safeJsonParse<Array<{ time: string; message: string; label?: string }>>(d.dayNotificationsJson, [])
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
                    resolveLocalizedField(ct.instructions, ct.translationsJson, locale, "instructions") || null,
                  isRequired: ct.isRequired,
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
