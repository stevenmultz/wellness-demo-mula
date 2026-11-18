import { getWellnessSession } from "@/wellness/security/session";
import { prisma } from "@/wellness/db";
import { parseTermsList, safeJsonParse } from "@/wellness/utils/json";
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
  batchNumber?: number | null;
  description: string;
  coverImage?: string | null;
  introVideoUrl?: string | null;
  difficultyLevel?: string | null;
  category?: string | null;
  equipment?: string | null;
  dailyCommitment?: string | null;
  coachName?: string | null;
  coachTitle?: string | null;
  organizationName?: string | null;
  organizationLogo?: string | null;
  organizationVerified?: boolean;
  durationDays: number;
  trainingDays: number;
  restDays: number;
  connectionDays: number;
  actualPrice?: number;
  discountPercentage?: number;
  price: number;
  minQuota?: number;
  maxQuota: number;
  enrolledCount: number;
  isUserEnrolled?: boolean;
  locationType?: string | null;
  city?: string | null;
  venueAddress?: string | null;
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
    masterEquipments,
    masterCommitments,
    sampleTrainingDay,
    sampleRestDay,
    sampleConnectionDay,
  ] = await Promise.all([
    prisma.program
      .findMany({
        take: 100,
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
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
              dayType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    sessionUser
      ? prisma.programEnrollment
          .findMany({
            take: 200,
            where: { userId: sessionUser.userId, status: "ACTIVE" },
            select: { programId: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.masterCoach
      .findMany({
        take: 100,
        include: {
          programs: {
            include: {
              program: {
                select: {
                  id: true,
                  title: true,
                  durationDays: true,
                  status: true,
                  deletedAt: true,
                  ...PROGRAM_TAXONOMY_INCLUDE,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => []),
    prisma.masterCategory
      .findMany({ take: 200, orderBy: { name: "asc" } })
      .catch(() => []),
    prisma.masterEquipment
      .findMany({ take: 200, orderBy: { name: "asc" } })
      .catch(() => []),
    prisma.masterDailyCommitment
      .findMany({ take: 100, orderBy: { createdAt: "asc" } })
      .catch(() => []),
    prisma.programDay
      .findFirst({
        where: {
          dayType: "TRAINING_DAY",
          program: { status: "PUBLISHED", deletedAt: null },
        },
        select: {
          workoutOptionsJson: true,
          videoChecklistJson: true,
          mealRecommendation: true,
          sleepRecommendation: true,
          dayNotificationsJson: true,
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null),
    prisma.programDay
      .findFirst({
        where: {
          dayType: "REST_DAY",
          program: { status: "PUBLISHED", deletedAt: null },
        },
        select: {
          restInstructions: true,
          mealRecommendation: true,
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null),
    prisma.programDay
      .findFirst({
        where: {
          dayType: { in: ["CONNECTION_DAY", "MEETUP_DAY"] },
          program: { status: "PUBLISHED", deletedAt: null },
        },
        select: {
          onsiteVenue: true,
          onsiteSchedule: true,
          mealRecommendation: true,
        },
        orderBy: { createdAt: "desc" },
      })
      .catch(() => null),
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

    const tax = serializeProgramTaxonomy(p);

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      batchNumber: p.batchNumber ?? null,
      description: p.description,
      coverImage: toClientMediaUrl(p.coverImagePath),
      introVideoUrl: p.introVideoUrl || null,
      difficultyLevel: p.difficultyLevel || "ALL LEVELS",
      category: tax.category || "Pilates",
      equipment: tax.equipment || "Yoga Mat",
      dailyCommitment: tax.dailyCommitment || "25 - 30 Mins / Day",
      coachName: tax.coachName,
      coachTitle: tax.coachTitle,
      organizationName: tax.organizationName || null,
      organizationLogo: toClientMediaUrl(tax.organizationLogoPath),
      organizationVerified: tax.organizationVerified ?? false,
      durationDays: p.durationDays,
      trainingDays,
      restDays,
      connectionDays,
      actualPrice: p.actualPrice,
      discountPercentage: p.discountPercentage,
      price: p.price,
      minQuota: p.minQuota,
      maxQuota: p.maxQuota,
      locationType: p.locationType,
      city: p.city || null,
      venueAddress: p.venueAddress,
      communityLink: p.communityLink,
      enrolledCount: p._count.enrollments,
      isUserEnrolled: userActiveProgramIds.has(p.id),
      status: p.status,
      isPublished: p.status === "PUBLISHED",
      startDate: p.startAt,
      endDate: p.endAt,
      registrationOpenDate: p.registrationOpenAt,
      registrationDeadline: p.registrationDeadlineAt,
      dayCount: p._count.days || p.durationDays,
      termsList: parseTermsList(p.customTerms),
    };
  });

  const parsedWorkouts = safeJsonParse<string[]>(
    sampleTrainingDay?.workoutOptionsJson,
    [
      "Hot Pilates",
      "Strength & Conditioning",
      "Yoga & Mobility Flow",
      "Outdoor Running / Walk",
      "Mat Pilates Core",
    ]
  );

  const parsedChecklist = safeJsonParse<string[]>(
    sampleTrainingDay?.videoChecklistJson,
    [
      "5 min diaphragmatic breathing & posture check",
      "15 min guided mobility & core sequence",
      "5 min gentle fascial cooldown",
    ]
  );

  const parsedNotifications = safeJsonParse<
    Array<{ time: string; label: string; message: string }>
  >(sampleTrainingDay?.dayNotificationsJson, [
    {
      time: "07:00",
      label: "Pagi • Movement Ritual",
      message:
        "Modul hari ini telah dibuka. Luangkan 25 menit sesi latihan & catat checklist aktivitas harianmu.",
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
      .filter((prog) => prog.status === "PUBLISHED" && !prog.deletedAt);

    const mergedPrograms = linkedFromPivot.map((lp) => {
      const lpTax = serializeProgramTaxonomy(lp);
      return {
        id: lp.id,
        title: lp.title,
        category: lpTax.category || "Pilates",
        durationDays: lp.durationDays,
        dailyCommitment: lpTax.dailyCommitment || null,
      };
    });

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
