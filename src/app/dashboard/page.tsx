import type { Viewport } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWellnessSession, peekVerifiedSessionUserId } from "@/wellness/security/session";
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
import {
  addWibDays,
  computeProgramEndWibCutoffMs,
  formatWibDateKey,
  getProgramDayWibWindow,
  toWibDateOnly,
} from "@/wellness/utils/timezone";
import { extractNutritionFromMealNotes, extractWaterMl } from "@/wellness/utils/nutrition";
import {
  mapMealQualityToProgramCompliance,
  computeStepsBurnedKcal,
} from "@/wellness/utils/wellness-metrics";
import { serializeDailyLog, type DailyLogDTO } from "@/wellness/services/daily-log";
import {
  resolveTrackingAccessStatus,
} from "@/wellness/services/tracking-entitlement";
import { resolveProgramDailyPlan, ProgramDailyPlan } from "@/wellness/utils/daily-tasks";
import { getServerLocale } from "@/wellness/i18n/server";
import { resolveLocalizedField } from "@/wellness/i18n/types";
import { parseCustomTaskFields, parseCustomSubmissionValues } from "@/wellness/utils/custom-tasks";
import {
  PROGRAM_TAXONOMY_INCLUDE,
  serializeProgramTaxonomy,
} from "@/wellness/services/program-taxonomy";
import { resolveEffectiveProgramStart } from "@/wellness/services/daily-log-hydration";
import { normalizeProgramDayType } from "@/wellness/utils/day-completion";

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
  const canPeekSession = typeof peekVerifiedSessionUserId === "function";
  const peekedUserId = canPeekSession ? await peekVerifiedSessionUserId() : null;

  if (canPeekSession && !peekedUserId) {
    redirect("/?auth=signin&target=dashboard");
  }

  const preSession = canPeekSession ? null : await getWellnessSession();
  const targetUserId = peekedUserId ?? preSession?.userId ?? null;
  if (!targetUserId) {
    redirect("/?auth=signin&target=dashboard");
  }

  const now = new Date();
  const todayDateOnly = toWibDateOnly(now);
  // Keep initial SSR lightweight (recent 14 days only — older dates are fetched on demand in 5-day slices when selected in the Home calendar).
  const recentLogsStart = addWibDays(todayDateOnly, -13);

  // True single-wave parallel DB round-trip (Session + Active Programs + Lightweight Past/Pending Enrollments + Metrics + Logs):
  const [
    session,
    activeEnrollmentsRaw,
    otherEnrollmentsRaw,
    bodyMetricLogsRaw,
    dailyLogsRaw,
    trackingPassPlansRaw,
  ] = await Promise.all([
    preSession ? Promise.resolve(preSession) : getWellnessSession(),
    prisma.programEnrollment.findMany({
      where: { userId: targetUserId, status: "ACTIVE" },
      include: {
        program: {
          include: {
            ...PROGRAM_TAXONOMY_INCLUDE,
            _count: {
              select: {
                days: true,
                enrollments: { where: { status: "ACTIVE" } },
              },
            },
            days: {
              include: {
                progresses: {
                  where: { userId: targetUserId },
                },
                customTasks: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    submissions: {
                      where: { userId: targetUserId },
                    },
                  },
                },
              },
              orderBy: { dayNumber: "asc" },
            },
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
    prisma.programEnrollment.findMany({
      where: { userId: targetUserId, status: { not: "ACTIVE" } },
      include: {
        program: {
          include: {
            ...PROGRAM_TAXONOMY_INCLUDE,
            _count: {
              select: {
                days: true,
                enrollments: { where: { status: "ACTIVE" } },
              },
            },
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
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { qrisStringOrUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userBodyMetricLog
      .findMany({
        where: { userId: targetUserId },
        orderBy: { recordedAt: "desc" },
        take: 60,
      })
      .then((rows) => rows.reverse()),
    prisma.userDailyLog.findMany({
      where: {
        userId: targetUserId,
        logDate: { gte: recentLogsStart },
      },
      include: {
        extraWorkouts: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { logDate: "asc" },
      take: 15,
    }),
    prisma.trackingPassPlan.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
  ]);

  if (!session) {
    redirect("/?auth=signin&target=dashboard");
  }
  if (!isUserOnboardingComplete(session)) {
    redirect("/onboarding");
  }

  const locale = await getServerLocale(session.preferredLocale);

  const normalizedOtherEnrollments: typeof activeEnrollmentsRaw = otherEnrollmentsRaw.map(
    (e) =>
      ({
        ...e,
        program: e.program
          ? {
              ...e.program,
              days: e.program.days.map((d) => ({
                ...d,
                programId: e.program.id,
                version: 1,
                workoutOptionsJson: null,
                sleepRecommendation: null,
                dayNotificationsJson: null,
                videoUrl: null,
                videoChecklistJson: null,
                mealRecommendation: null,
                meetupLink: null,
                eventDetails: null,
                restInstructions: null,
                createdAt: e.program.createdAt,
                updatedAt: e.program.updatedAt,
                progresses: [],
                customTasks: [],
              })),
            }
          : e.program,
      }) as (typeof activeEnrollmentsRaw)[number]
  );

  const enrollments = [...activeEnrollmentsRaw, ...normalizedOtherEnrollments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const initialDailyLogs: DailyLogDTO[] = dailyLogsRaw.map(serializeDailyLog);
  const dailyLogByDateKey = new Map<string, DailyLogDTO>(
    initialDailyLogs.map((l) => [l.logDate, l])
  );

  const validEnrollments = enrollments.filter(
    (e) => e.program && e.program.deletedAt === null
  );

  const activeEnrollmentByProgramId = new Map(
    validEnrollments
      .filter((e) => e.status === "ACTIVE")
      .map((e) => [e.program.id, e])
  );

  // Deduplicate enrolled programs (preferring ACTIVE enrollment metadata when multiple exist)
  const enrolledProgramEntries = new Map<
    string,
    {
      isActive: boolean;
      program: (typeof validEnrollments)[number]["program"];
    }
  >();
  for (const e of validEnrollments) {
    const isActive = e.status === "ACTIVE";
    const existing = enrolledProgramEntries.get(e.program.id);
    if (!existing || (isActive && !existing.isActive)) {
      enrolledProgramEntries.set(e.program.id, {
        isActive,
        program: e.program,
      });
    }
  }

  const activeProgramsFull = Array.from(enrolledProgramEntries.values())
    .filter((entry) => entry.isActive)
    .map((entry) => entry.program);

  const allProgramsList = Array.from(enrolledProgramEntries.values());

  const myPrograms = validEnrollments.map((e) => {
    const tax = serializeProgramTaxonomy(e.program);
    const effectiveStart = resolveEffectiveProgramStart(e.program, e);
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

  // Today's / tomorrow's tasks per ACTIVE program, resolved on the server in WIB (app timezone)
  const dailyPlans: ProgramDailyPlan[] = activeProgramsFull
    .map((p) => {
      const enr = activeEnrollmentByProgramId.get(p.id);
      const effectiveStart = resolveEffectiveProgramStart(p, enr);
      return resolveProgramDailyPlan(
        p.id,
        effectiveStart,
        p.days.map((d) => {
          const prog = d.progresses[0] || null;
          const dayUnlock = effectiveStart
            ? getProgramDayWibWindow(effectiveStart, d.dayNumber, now).unlockDate
            : null;
          const dateKey = dayUnlock ? formatWibDateKey(dayUnlock) : null;
          const gLog = dateKey ? dailyLogByDateKey.get(dateKey) ?? null : null;
          const normalizedDayType = normalizeProgramDayType(p.locationType, d.dayType);
          const effectiveMealComp =
            prog?.mealCompliance ?? mapMealQualityToProgramCompliance(gLog?.mealQualityMode);
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
            progress:
              prog || gLog
                ? {
                    videoWatched: prog?.isVideoWatched ?? false,
                    isCompleted: prog?.isCompleted ?? false,
                    mealCompliance: effectiveMealComp ?? null,
                    mealNotes: prog?.mealNotes ?? null,
                    dailyReflection: prog?.dailyReflection ?? null,
                    bedtime: gLog?.bedtime ?? prog?.bedtime ?? null,
                    wakeTime: gLog?.wakeTime ?? prog?.wakeTime ?? null,
                    eventFeedback: prog?.eventFeedback ?? null,
                    checklistCompleted: toJsonString(prog?.checklistCompletedJson),
                    workoutNotes: prog?.workoutNotes ?? null,
                    selectedWorkout: prog?.selectedWorkout ?? null,
                    waterMl: gLog?.waterMl ?? extractWaterMl(prog?.mealNotes),
                    stepsCount: gLog?.stepsCount ?? 0,
                  }
                : null,
          };
        }),
        now,
        p.locationType
      );
    });

  const allPrograms = allProgramsList.map((entry) => {
    const p = entry.program;
    const isPaidMember = entry.isActive;
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

    const mappedDays = !isPaidMember
      ? p.days.map((d) => {
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
      : p.days.map((d) => {
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
            const wibDateKey = unlockDate ? formatWibDateKey(unlockDate) : formatWibDateKey(now);
            const gLog = dailyLogByDateKey.get(wibDateKey) ?? null;

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

            const effectiveBedtime = gLog?.bedtime ?? progRecord?.bedtime ?? null;
            const effectiveWakeTime = gLog?.wakeTime ?? progRecord?.wakeTime ?? null;
            const effectiveSleepMins =
              gLog?.sleepDurationMinutes ?? progRecord?.sleepDurationMinutes ?? null;
            const effectiveAssessment =
              progRecord?.assessmentResponse ??
              (gLog?.sleepFeeling ? `Sleep Feeling: ${gLog.sleepFeeling}` : null);
            const legacyNutr = extractNutritionFromMealNotes(progRecord?.mealNotes);
            const effectiveWaterMl =
              gLog && gLog.waterMl > 0 ? gLog.waterMl : legacyNutr.waterMl;
            const effectiveStepsCount = gLog?.stepsCount ?? 0;
            const effectiveStepsBurned =
              gLog?.stepsBurnedKcal ?? computeStepsBurnedKcal(effectiveStepsCount);
            const effectiveCaloriesKcal =
              gLog && gLog.caloriesKcal > 0 ? gLog.caloriesKcal : legacyNutr.calories;
            const effectiveCarbsG =
              gLog && gLog.carbsG > 0 ? gLog.carbsG : legacyNutr.carbsG;
            const effectiveProteinG =
              gLog && gLog.proteinG > 0 ? gLog.proteinG : legacyNutr.proteinG;
            const effectiveFatG =
              gLog && gLog.fatG > 0 ? gLog.fatG : legacyNutr.fatG;
            const inheritedCompliance = mapMealQualityToProgramCompliance(gLog?.mealQualityMode);
            const effectiveMealCompliance =
              progRecord?.mealCompliance ?? inheritedCompliance ?? null;
            const mealSyncedFromDailyLog = Boolean(
              !progRecord?.mealCompliance && inheritedCompliance
            );

            const sleepDone = Boolean(
              effectiveBedtime &&
                effectiveWakeTime &&
                effectiveBedtime !== "SKIPPED" &&
                effectiveWakeTime !== "SKIPPED"
            );
            const mealDone = Boolean(
              effectiveMealCompliance && effectiveMealCompliance !== "SKIPPED"
            );
            const waterDone = effectiveWaterMl > 0;
            const stepsDone = effectiveStepsCount > 0;
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

            // Unified 5 Core Tasks (Sleep + Activity + Meal + Water + Steps) + ALL custom tasks
            // Legacy guard: past rows already marked isCompleted=true in DB are preserved
            const isFullyCompleted =
              (!!progRecord?.isCompleted ||
                (sleepDone && activityDone && mealDone && waterDone && stepsDone)) &&
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
              wibDateKey,
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
              userProgress:
                progRecord || gLog
                  ? {
                      id: progRecord?.id ?? "",
                      videoWatched: progRecord?.isVideoWatched ?? false,
                      isCompleted: isFullyCompleted,
                      checklistCompleted: toJsonString(progRecord?.checklistCompletedJson),
                      selectedWorkout: progRecord?.selectedWorkout ?? null,
                      workoutNotes: progRecord?.workoutNotes ?? null,
                      eventFeedback: progRecord?.eventFeedback ?? null,
                      mealCompliance: effectiveMealCompliance,
                      mealNotes: progRecord?.mealNotes ?? null,
                      dailyReflection: progRecord?.dailyReflection ?? null,
                      happinessRate: progRecord?.happinessRate ?? null,
                      bedtime: effectiveBedtime,
                      wakeTime: effectiveWakeTime,
                      sleepDurationMinutes: effectiveSleepMins,
                      assessmentResponse: effectiveAssessment,
                      waterMl: effectiveWaterMl,
                      stepsCount: effectiveStepsCount,
                      stepsBurnedKcal: effectiveStepsBurned,
                      caloriesKcal: effectiveCaloriesKcal,
                      carbsG: effectiveCarbsG,
                      proteinG: effectiveProteinG,
                      fatG: effectiveFatG,
                      mealQualityMode: gLog?.mealQualityMode ?? null,
                      extraWorkouts: gLog?.extraWorkouts ?? [],
                      mealSyncedFromDailyLog,
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
    trackingAccessUntil: session.trackingAccessUntil
      ? session.trackingAccessUntil.toISOString()
      : null,
    createdAt: session.createdAt,
  };

  const mappedProgramById = new Map(allPrograms.map((p) => [p.id, p]));
  const hasActiveNonEndedCohort = validEnrollments.some((e) => {
    if (e.status !== "ACTIVE") return false;
    const mappedProg = mappedProgramById.get(e.programId);
    if (
      mappedProg &&
      mappedProg.days.length > 0 &&
      mappedProg.days.every((d) => Boolean(d.userProgress?.isCompleted))
    ) {
      return false;
    }
    const endCutoffMs = computeProgramEndWibCutoffMs({
      locationType: e.program.locationType,
      endAt: e.program.endAt,
      startAt: e.program.startAt,
      durationDays: e.program.durationDays,
      paidAt: e.paidAt ?? e.approvedAt ?? e.createdAt,
    });
    return endCutoffMs === null || now.getTime() <= endCutoffMs;
  });

  const trackingAccess = resolveTrackingAccessStatus({
    trackingAccessUntil: session.trackingAccessUntil,
    hasActiveCohort: hasActiveNonEndedCohort,
    hasAnyEnrollmentOrLog:
      validEnrollments.length > 0 || initialDailyLogs.length > 0 || bodyMetricLogsRaw.length > 0,
    now,
  });

  const trackingPassPlans = trackingPassPlansRaw.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    durationDays: p.durationDays,
    actualPrice: p.actualPrice,
    discountPercentage: p.discountPercentage,
    price: p.price,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    customTerms: p.customTerms,
  }));

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
      initialDailyLogs={initialDailyLogs}
      trackingAccess={trackingAccess}
      trackingPassPlans={trackingPassPlans}
    />
  );
}
