import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession } from "@/wellness/security/session";
import {
  getPublicBadgeMeta,
  normalizeProgramStatus,
  resolvePublicBadge,
} from "@/wellness/utils/timeline";
import {
  PROGRAM_TAXONOMY_INCLUDE,
  serializeProgramTaxonomy,
} from "@/wellness/services/program-taxonomy";
import { reportServerError } from "@/wellness/observability";

export const dynamic = "force-dynamic";

function toClientMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("sb://")) {
    return `/api/media/signed?path=${encodeURIComponent(pathOrUrl)}`;
  }
  return pathOrUrl;
}

interface ExploreProgramItem {
  id: string;
  title: string;
  batchNumber: number | null;
  coverImage: string | null;
  introVideoUrl: string | null;
  coachName: string;
  organizationName: string | null;
  organizationLogo: string | null;
  organizationVerified: boolean;
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
  price: number;
  actualPrice: number;
  discountPercentage: number;
  durationDays: number;
  locationType: string;
  city: string | null;
  minQuota: number;
  maxQuota: number;
  seatsLeft: number;
  badge: string;
  canEnroll: boolean;
  enrollmentStatus: "ACTIVE" | "PENDING" | null;
  difficultyLevel: string;
  category: string;
  dailyCommitment: string | null;
  trainingDaysTotal: number;
  connectDaysTotal: number;
  restDaysTotal: number;
}

/**
 * GET /api/explore/programs?q=&comingSoon=1&openRegistration=1&sort=date|price&dir=asc|desc&page=1&limit=50
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
    const page = Math.max(1, Number.parseInt(sp.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get("limit") || "50", 10) || 50));

    const [programs, enrollments] = await Promise.all([
      prisma.program.findMany({
        take: 100,
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
        },
        include: {
          ...PROGRAM_TAXONOMY_INCLUDE,
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
          days: { select: { dayType: true } },
        },
        orderBy: sort === "price" ? { price: dir } : [{ startAt: dir }, { createdAt: "desc" }],
      }),
      prisma.programEnrollment.findMany({
        where: { userId: session.userId },
        select: { programId: true, status: true },
      }),
    ]);

    const enrollmentByProgram = new Map(enrollments.map((e) => [e.programId, e.status]));
    const alreadyFollowed = new Set(["ACTIVE", "EXPIRED", "COMPLETED", "FINISHED"]);
    const now = new Date();
    const qLower = q.toLowerCase();

    let items: ExploreProgramItem[] = programs
      .filter((p) => normalizeProgramStatus(p.status) === "PUBLISH")
      .filter((p) => !qLower || p.title.toLowerCase().includes(qLower))
      // Enrolled or finished programs come from program_enrollments, not a client-side hide.
      // PENDING stays visible so an unpaid invoice can still be completed.
      .filter((p) => !alreadyFollowed.has((enrollmentByProgram.get(p.id) || "").toUpperCase()))
      .map((p) => {
        const tax = serializeProgramTaxonomy(p);
        const badge =
          resolvePublicBadge({
            status: p.status,
            locationType: p.locationType,
            registrationOpenDate: p.registrationOpenAt,
            registrationDeadline: p.registrationDeadlineAt,
            startDate: p.startAt,
            endDate: p.endAt,
            maxQuota: p.maxQuota,
            enrolledCount: p._count.enrollments,
            now,
          }) ?? "Open Registration";
        const enrollStatus = enrollmentByProgram.get(p.id);
        const enrollmentStatus =
          enrollStatus === "ACTIVE" || enrollStatus === "PENDING" ? enrollStatus : null;

        const trainingDaysTotal = p.days.filter((d) => d.dayType === "TRAINING_DAY").length;
        const restDaysTotal = p.days.filter((d) => d.dayType === "REST_DAY").length;
        const connectDaysTotal =
          p.locationType === "HYBRID"
            ? p.days.filter((d) => d.dayType !== "TRAINING_DAY" && d.dayType !== "REST_DAY").length
            : 0;

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
          batchNumber: p.batchNumber ?? null,
          coverImage: toClientMediaUrl(p.coverImagePath),
          introVideoUrl: p.introVideoUrl || null,
          coachName: tax.coachName,
          organizationName: tax.organizationName || null,
          organizationLogo: toClientMediaUrl(tax.organizationLogoPath),
          organizationVerified: tax.organizationVerified ?? false,
          startDate: p.locationType === "HYBRID" && p.startAt ? p.startAt.toISOString() : null,
          endDate: p.locationType === "HYBRID" && p.endAt ? p.endAt.toISOString() : null,
          registrationDeadline:
            p.locationType === "HYBRID" && p.registrationDeadlineAt
              ? p.registrationDeadlineAt.toISOString()
              : null,
          price: p.price,
          actualPrice: effectiveActualPrice,
          discountPercentage: effectiveDiscount,
          durationDays: p.durationDays,
          locationType: p.locationType,
          city: p.city,
          minQuota: p.minQuota,
          maxQuota: p.maxQuota,
          seatsLeft: Math.max(0, p.maxQuota - p._count.enrollments),
          badge,
          canEnroll: getPublicBadgeMeta(badge as Parameters<typeof getPublicBadgeMeta>[0]).canEnroll,
          enrollmentStatus,
          difficultyLevel: p.difficultyLevel,
          category: tax.category,
          dailyCommitment: tax.dailyCommitment || null,
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
    const sortDateMs = (d: string | null) => (d ? new Date(d).getTime() : Number.MAX_SAFE_INTEGER);
    items.sort((a, b) => {
      const primary =
        sort === "price"
          ? a.price - b.price
          : sortDateMs(a.startDate) - sortDateMs(b.startDate);
      if (primary !== 0) return primary * factor;
      return (
        sortDateMs(a.startDate) - sortDateMs(b.startDate) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id)
      );
    });

    const total = items.length;
    const offset = (page - 1) * limit;
    const pagedItems = items.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        programs: pagedItems,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + pagedItems.length < total,
        },
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    reportServerError("program", "explore_programs", error, { userId: session.userId });
    return NextResponse.json(
      { success: false, message: "Failed to load programs." },
      { status: 500 }
    );
  }
}
