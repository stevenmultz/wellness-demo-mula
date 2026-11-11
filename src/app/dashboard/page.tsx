import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getWellnessSession } from "@/wellness/security/session";
import { prisma } from "@/wellness/db";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { BmsLogoLoading } from "@/components/common/BmsLogoLoading";
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

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense fallback={<BmsLogoLoading />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await getWellnessSession();
  if (!session) {
    redirect("/?auth=signin&target=dashboard");
  }

  // Fetch full user details, enrollments, published programs, and health profile concurrently
  const [dbUser, enrollments, allProgramsData, healthProfile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        age: true,
        dateOfBirth: true,
        avatarUrl: true,
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
      },
    }),
    prisma.programEnrollment.findMany({
      where: { userId: session.userId },
      include: {
        program: {
          include: {
            _count: { select: { days: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.program.findMany({
      where: {
        OR: [
          { status: { in: ["PUBLISH", "PUBLISHED", "ACTIVE", "COMING_SOON", "OPEN"] } },
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
        days: {
          include: {
            progress: {
              where: { userId: session.userId },
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
  ]);

  const userActiveProgramIds = new Set(
    enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.program.id)
  );

  const myPrograms = enrollments.map((e) => ({
    enrollmentId: e.id,
    programId: e.program.id,
    title: e.program.title,
    slug: e.program.slug,
    description: e.program.description,
    coverImage: e.program.coverImage || null,
    coachName: e.program.coachName,
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
            title: d.title,
            dayType: d.dayType,
            videoUrl: d.videoUrl,
            mealRecommendation: d.mealRecommendation,
            restInstructions: d.restInstructions,
            eventTitle: d.eventTitle,
            eventDetails: d.eventDetails,
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
      p.status === "COMING_SOON"
        ? "COMING_SOON"
        : p.isPublished || p.status === "ACTIVE" || p.status === "PUBLISHED"
        ? "ACTIVE"
        : "COMING_SOON";

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      coverImage: p.coverImage || null,
      recommendedFor: p.recommendedFor,
      coachName: p.coachName,
      coachTitle: p.coachTitle,
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

        const isFullyCompleted =
          !!progRecord?.isCompleted ||
          (!!progRecord &&
            videoDone &&
            checklistDone &&
            (checklistItems.length === 0 || completedChecklist.length > 0));

        // SOW 5.3 Skip Day Logic:
        // Automatically recorded as "Skipped Day" if user has not completed both workout video & daily assessment checklist by 23:59 on that day
        const isSkipped = isPast2359 && !isFullyCompleted;

        // SOW 5.7 Content & Video Protection:
        // Restrict media URLs strictly to verified paying members on unlocked calendar days
        const canAccessMedia = isPaidMember && isCalendarUnlocked;

        return {
          id: d.id,
          dayNumber: d.dayNumber,
          title: d.title,
          dayType: d.dayType,
          workoutOptions: safeJsonParse<string[]>(d.workoutOptions, []),
          sleepRecommendation: d.sleepRecommendation || "Target 8 Hours • Wind down before 22:30 WIB",
          dayNotifications: safeJsonParse<Array<{ time: string; message: string; label?: string }>>(d.dayNotifications, []),
          unlockDate: unlockDate.toISOString(),
          isCalendarUnlocked,
          isPast2359,
          isSkipped,
          videoUrl: canAccessMedia ? d.videoUrl : null,
          videoChecklist: checklistItems,
          mealRecommendation: isPaidMember ? d.mealRecommendation : null,
          dailyAssessment: d.dailyAssessment,
          pendingReminder: d.pendingReminder,
          completedReminder: d.completedReminder,
          meetupLink: isPaidMember ? d.meetupLink : null,
          mapLink: d.mapLink,
          eventTitle: d.eventTitle,
          eventHost: d.eventHost,
          eventDetails: d.eventDetails,
          onsiteVenue: d.onsiteVenue,
          onsiteSchedule: d.onsiteSchedule,
          restInstructions: d.restInstructions,
          coachName: d.coachName,
          recommendedFor: d.recommendedFor,
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

  const user = dbUser
    ? {
        ...dbUser,
        dateOfBirth: dbUser.dateOfBirth ? dbUser.dateOfBirth.toISOString().slice(0, 10) : null,
      }
    : {
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        phone: session.phone,
        age: null,
        dateOfBirth: null,
        avatarUrl: null,
        gender: null,
        occupation: null,
        address: null,
        city: null,
        province: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        role: session.role,
        status: session.status,
        createdAt: session.createdAt,
      };

  return (
    <DashboardClient
      user={user}
      myPrograms={myPrograms}
      allPrograms={allPrograms}
      dailyPlans={dailyPlans}
      initialHealthProfile={healthProfile}
    />
  );
}
