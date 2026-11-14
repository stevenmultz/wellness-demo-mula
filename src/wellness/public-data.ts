import { getWellnessSession } from "@/wellness/security/session";
import { prisma } from "@/wellness/db";
import { parseTermsList, safeJsonParse } from "@/wellness/utils/json";

export interface PublicSessionUser {
  userId: string;
  email: string;
  fullName: string;
  role: string;
}

export interface PublicProgramItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  equipment?: string | null;
  dailyCommitment?: string | null;
  recommendedFor?: string | null;
  coachName?: string | null;
  coachTitle?: string | null;
  durationDays: number;
  trainingDays: number;
  restDays: number;
  connectionDays: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  maxQuota: number;
  enrolledCount: number;
  isUserEnrolled?: boolean;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
  virtualFallbackAvailable?: boolean | null;
  communityLink?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  registrationOpenDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  status?: string | null;
  isPublished?: boolean;
  dayCount: number;
  termsList?: string[];
}

export interface PublicCoachItem {
  id: string;
  name: string;
  title: string;
  programs: Array<{
    id: string;
    title: string;
    category: string;
    durationDays: number;
    dailyCommitment?: string | null;
    recommendedFor?: string | null;
  }>;
}

export interface PublicCurriculumSample {
  workoutOptions: string[];
  videoChecklist: string[];
  mealRecommendation: string;
  sleepRecommendation: string;
  restInstructions: string;
  connectionVenue: string;
  connectionSchedule: string;
  dayNotifications: Array<{
    time: string;
    label: string;
    message: string;
  }>;
}

export async function getPublicSanctuaryData(): Promise<{
  sessionUser: PublicSessionUser | null;
  programs: PublicProgramItem[];
  coaches: PublicCoachItem[];
  categories: string[];
  audiences: string[];
  equipments: string[];
  commitments: string[];
  curriculumSample: PublicCurriculumSample;
}> {
  const sessionUser = await getWellnessSession();

  const [
    programs,
    userEnrollments,
    masterCoaches,
    masterCategories,
    masterAudiences,
    masterEquipments,
    masterCommitments,
  ] = await Promise.all([
    prisma.program
      .findMany({
        where: {
          OR: [
            { status: "PUBLISH" },
            { status: "PUBLISHED" },
            { isPublished: true },
          ],
          NOT: {
            status: { in: ["DRAFT", "ARCHIVE"] },
          },
        },
        include: {
          _count: {
            select: {
              days: true,
              enrollments: { where: { status: "ACTIVE" } },
            },
          },
          dailyCommitmentRef: {
            select: { name: true },
          },
          days: {
            select: {
              dayNumber: true,
              dayType: true,
              workoutOptions: true,
              videoChecklist: true,
              mealRecommendation: true,
              sleepRecommendation: true,
              restInstructions: true,
              onsiteVenue: true,
              onsiteSchedule: true,
              dayNotifications: true,
            },
            orderBy: { dayNumber: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
    sessionUser
      ? prisma.programEnrollment
          .findMany({
            where: { userId: sessionUser.userId, status: "ACTIVE" },
            select: { programId: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.masterCoach
      .findMany({
        include: {
          programs: {
            include: {
              program: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  durationDays: true,
                  dailyCommitment: true,
                  recommendedFor: true,
                  status: true,
                  isPublished: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      })
      .catch(() => []),
    prisma.masterCategory
      .findMany({ orderBy: { name: "asc" } })
      .catch(() => []),
    prisma.masterTargetAudience
      .findMany({ orderBy: { name: "asc" } })
      .catch(() => []),
    prisma.masterEquipment
      .findMany({ orderBy: { name: "asc" } })
      .catch(() => []),
    prisma.masterDailyCommitment
      .findMany({ orderBy: { createdAt: "asc" } })
      .catch(() => []),
  ]);

  const userActiveProgramIds = new Set(userEnrollments.map((e) => e.programId));

  const formattedPrograms: PublicProgramItem[] = programs.map((p) => {
    const trainingDays =
      p.days.filter((d) => d.dayType === "TRAINING_DAY").length ||
      p.durationDays;
    const restDays = p.days.filter((d) => d.dayType === "REST_DAY").length;
    const connectionDays = p.days.filter(
      (d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY"
    ).length;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      coverImage: p.coverImage || null,
      difficultyLevel: p.difficultyLevel || "ALL LEVELS",
      category: p.category || "Pilates",
      equipment: p.equipment || "Yoga Mat",
      dailyCommitment:
        p.dailyCommitmentRef?.name || p.dailyCommitment || "25 - 30 Mins / Day",
      recommendedFor: p.recommendedFor || "All Levels",
      coachName: p.coachName,
      coachTitle: p.coachTitle,
      durationDays: p.durationDays,
      trainingDays,
      restDays,
      connectionDays,
      actualPrice: p.actualPrice,
      discountPercentage: p.discountPercentage,
      price: p.price,
      maxQuota: p.maxQuota,
      locationType: p.locationType,
      city: p.city || "Jakarta Selatan",
      venueAddress: p.venueAddress,
      virtualFallbackAvailable: p.virtualFallbackAvailable,
      communityLink: p.communityLink,
      enrolledCount: p._count.enrollments,
      isUserEnrolled: userActiveProgramIds.has(p.id),
      status: p.status,
      isPublished: p.isPublished,
      startDate: p.startDate,
      endDate: p.endDate,
      registrationOpenDate: p.registrationOpenDate,
      registrationDeadline: p.registrationDeadline,
      dayCount: p._count.days || p.durationDays,
      termsList: parseTermsList(p.customTerms),
    };
  });

  // Extract real sample curriculum day fields from published programs
  let sampleTrainingDay = null;
  let sampleRestDay = null;
  let sampleConnectionDay = null;

  for (const p of programs) {
    for (const d of p.days) {
      if (!sampleTrainingDay && d.dayType === "TRAINING_DAY") {
        sampleTrainingDay = d;
      }
      if (!sampleRestDay && d.dayType === "REST_DAY") {
        sampleRestDay = d;
      }
      if (
        !sampleConnectionDay &&
        (d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY")
      ) {
        sampleConnectionDay = d;
      }
    }
  }

  const parsedWorkouts = safeJsonParse<string[]>(
    sampleTrainingDay?.workoutOptions,
    [
      "Hot Pilates",
      "Strength & Conditioning",
      "Yoga & Mobility Flow",
      "Outdoor Running / Walk",
      "Mat Pilates Core",
    ]
  );

  const parsedChecklist = safeJsonParse<string[]>(
    sampleTrainingDay?.videoChecklist,
    [
      "5 min diaphragmatic breathing & posture check",
      "15 min guided mobility & core sequence",
      "5 min gentle fascial cooldown",
    ]
  );

  const parsedNotifications = safeJsonParse<
    Array<{ time: string; label: string; message: string }>
  >(sampleTrainingDay?.dayNotifications, [
    {
      time: "07:00",
      label: "Pagi • Movement Ritual",
      message:
        "Modul hari ini telah dibuka. Luangkan 25 menit sesi latihan & upload foto before-after.",
    },
    {
      time: "12:30",
      label: "Siang • Clean Nourishment",
      message:
        "Waktunya santap siang mindful. Cek panduan nutrisi harian & catat kepatuhan makan.",
    },
    {
      time: "20:30",
      label: "Malam • Dear Diary & Cutoff",
      message:
        "Tuliskan Dear Diary harian, beri rating kebahagiaan, dan catat target tidur sebelum 23:59.",
    },
  ]);

  const curriculumSample: PublicCurriculumSample = {
    workoutOptions: parsedWorkouts,
    videoChecklist: parsedChecklist,
    mealRecommendation:
      sampleTrainingDay?.mealRecommendation ||
      "Breakfast: Rolled oats with chia seeds, wild berries, and Ceylon cinnamon.\nLunch: Grilled organic chicken breast with quinoa and avocado salad.\nDinner: Steamed wild salmon with asparagus and sweet potato.",
    sleepRecommendation:
      sampleTrainingDay?.sleepRecommendation ||
      "Target 8 Jam • Tidur sebelum 22:30 WIB",
    restInstructions:
      sampleRestDay?.restInstructions ||
      "Take a 25-minute unhurried outdoor walk in natural daylight, perform gentle foam rolling, and practice 4-7-8 parasympathetic nasal breathing before sleep.",
    connectionVenue:
      sampleConnectionDay?.onsiteVenue ||
      "The Sanctuary Wellness Pavilion, Senopati, South Jakarta (Hybrid Live Stream Available)",
    connectionSchedule:
      sampleConnectionDay?.onsiteSchedule ||
      "08:30 – 10:30 WIB • Mat & Organic Refreshments Provided",
    dayNotifications: parsedNotifications,
  };

  // Map coaches with their real assigned programs from the database
  const coaches: PublicCoachItem[] = masterCoaches.map((c) => {
    const linkedFromPivot = c.programs
      .map((pc) => pc.program)
      .filter(
        (prog) =>
          prog.status === "PUBLISH" ||
          prog.status === "PUBLISHED" ||
          prog.isPublished
      );

    const linkedByName = formattedPrograms.filter(
      (fp) =>
        fp.coachName?.toLowerCase() === c.name.toLowerCase() &&
        !linkedFromPivot.some((lp) => lp.id === fp.id)
    );

    const mergedPrograms = [
      ...linkedFromPivot.map((lp) => ({
        id: lp.id,
        title: lp.title,
        category: lp.category,
        durationDays: lp.durationDays,
        dailyCommitment: lp.dailyCommitment,
        recommendedFor: lp.recommendedFor,
      })),
      ...linkedByName.map((fp) => ({
        id: fp.id,
        title: fp.title,
        category: fp.category || "Pilates",
        durationDays: fp.durationDays,
        dailyCommitment: fp.dailyCommitment,
        recommendedFor: fp.recommendedFor,
      })),
    ];

    return {
      id: c.id,
      name: c.name,
      title: c.title,
      programs: mergedPrograms,
    };
  });

  return {
    sessionUser,
    programs: formattedPrograms,
    coaches,
    categories:
      masterCategories.length > 0
        ? masterCategories.map((c) => c.name)
        : [
            "Pilates",
            "Mobility & Longevity",
            "Nutrition & Gut Health",
            "Breathwork & Sleep",
            "Strength & Conditioning",
          ],
    audiences:
      masterAudiences.length > 0
        ? masterAudiences.map((a) => a.name)
        : [
            "Desk Professionals & Sedentary Workers",
            "Founders & High-Performance Executives",
            "All Levels & Beginners",
          ],
    equipments:
      masterEquipments.length > 0
        ? masterEquipments.map((e) => e.name)
        : ["Yoga Mat", "Resistance Bands", "No Equipment (Bodyweight)"],
    commitments:
      masterCommitments.length > 0
        ? masterCommitments.map((m) => m.name)
        : ["15 - 20 Mins / Day", "25 - 30 Mins / Day", "45 Mins / Day"],
    curriculumSample,
  };
}
