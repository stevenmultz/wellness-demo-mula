import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import {
  getPublicBadgeMeta,
  normalizeProgramStatus,
  resolvePublicBadge,
} from "@/wellness/utils/timeline";

export const dynamic = "force-dynamic";

interface ExploreProgramItem {
  id: string;
  title: string;
  coverImage: string | null;
  coachName: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  price: number;
  actualPrice: number;
  discountPercentage: number;
  durationDays: number;
  locationType: string;
  city: string | null;
  maxQuota: number;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  difficultyLevel: string;
  category: string;
  recommendedFor: string;
  dailyCommitment: string | null;
  trainingDaysTotal: number;
  connectDaysTotal: number;
  restDaysTotal: number;
}

const PUBLISHED_STATUSES = ["PUBLISH", "PUBLISHED", "ACTIVE"];

/**
 * GET /api/explore/programs?q=&comingSoon=1&openRegistration=1&sort=date|price&dir=asc|desc
 * Only published programs are ever returned (business rule); search, filters and sorting are
 * applied server-side on real data so they can be combined freely.
 */
export async function GET(req: NextRequest) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized. Please sign in." }, { status: 401 });
  }

  try {
    const sp = new URL(req.url).searchParams;
    const q = (sp.get("q") || "").trim().slice(0, 100);
    const wantComingSoon = sp.get("comingSoon") === "1";
    const wantOpen = sp.get("openRegistration") === "1";
    const sort = sp.get("sort") === "price" ? "price" : "date";
    const dir = sp.get("dir") === "desc" ? "desc" : "asc";

    const [programs, enrollments] = await Promise.all([
      prisma.program.findMany({
        take: 100, // Enforce maximum upper boundary to prevent unbounded query memory spikes
        where: {
          status: { in: PUBLISHED_STATUSES },
          ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
        },
        include: {
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          days: { select: { dayType: true } },
        },
      }),
      prisma.programEnrollment.findMany({
        where: { userId: session.userId },
        select: { programId: true, status: true },
      }),
    ]);

    const enrollmentByProgram = new Map(enrollments.map((e) => [e.programId, e.status]));
    const alreadyFollowed = new Set(["ACTIVE", "EXPIRED", "COMPLETED", "FINISHED"]);
    const now = new Date();

    let items: ExploreProgramItem[] = programs
      .filter((p) => normalizeProgramStatus(p.status) === "PUBLISH")
      // Enrolled or finished programs come from program_enrollments, not a client-side hide.
      // PENDING stays visible so an unpaid invoice can still be completed.
      .filter((p) => !alreadyFollowed.has((enrollmentByProgram.get(p.id) || "").toUpperCase()))
      .map((p) => {
        const badge =
          resolvePublicBadge({
            status: p.status,
            registrationOpenDate: p.registrationOpenDate,
            registrationDeadline: p.registrationDeadline,
            startDate: p.startDate,
            endDate: p.endDate,
            maxQuota: p.maxQuota,
            enrolledCount: p._count.enrollments,
            now,
          }) ?? "Coming Soon";
        const enrollStatus = enrollmentByProgram.get(p.id);
        const enrollmentStatus =
          enrollStatus === "ACTIVE" || enrollStatus === "PENDING" ? enrollStatus : null;

        const trainingDaysTotal = p.days.filter((d) => d.dayType === "TRAINING_DAY").length;
        const restDaysTotal = p.days.filter((d) => d.dayType === "REST_DAY").length;
        const connectDaysTotal = p.days.filter(
          (d) => d.dayType !== "TRAINING_DAY" && d.dayType !== "REST_DAY"
        ).length;

        const effectiveActualPrice = p.actualPrice && p.actualPrice > p.price ? p.actualPrice : p.price;
        const effectiveDiscount =
          p.discountPercentage > 0
            ? p.discountPercentage
            : effectiveActualPrice > p.price && effectiveActualPrice > 0
              ? Math.round(((effectiveActualPrice - p.price) / effectiveActualPrice) * 100)
              : 0;

        return {
          id: p.id,
          title: p.title,
          coverImage: p.coverImage,
          coachName: p.coachName,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          registrationDeadline: p.registrationDeadline.toISOString(),
          price: p.price,
          actualPrice: effectiveActualPrice,
          discountPercentage: effectiveDiscount,
          durationDays: p.durationDays,
          locationType: p.locationType,
          city: p.city,
          maxQuota: p.maxQuota,
          seatsLeft: Math.max(0, p.maxQuota - p._count.enrollments),
          badge,
          canEnroll: getPublicBadgeMeta(badge as Parameters<typeof getPublicBadgeMeta>[0]).canEnroll,
          enrollmentStatus,
          difficultyLevel: p.difficultyLevel,
          category: p.category,
          recommendedFor: p.recommendedFor,
          dailyCommitment: p.dailyCommitment,
          trainingDaysTotal,
          connectDaysTotal,
          restDaysTotal,
        };
      });

    if (wantComingSoon || wantOpen) {
      items = items.filter(
        (i) =>
          (wantComingSoon && i.badge === "Coming Soon") ||
          (wantOpen && i.badge === "Open Registration")
      );
    }

    const factor = dir === "desc" ? -1 : 1;
    items.sort((a, b) => {
      const primary =
        sort === "price"
          ? a.price - b.price
          : new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (primary !== 0) return primary * factor;
      // Stable, deterministic tie-breakers so ordering is consistent between requests
      return (
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime() ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id)
      );
    });

    return NextResponse.json({ success: true, programs: items });
  } catch (error) {
    console.error("[Explore Programs Error]:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load programs." },
      { status: 500 }
    );
  }
}
