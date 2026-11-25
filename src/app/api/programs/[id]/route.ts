import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/wellness/db";
import { getWellnessSession, isAdminRole } from "@/wellness/security/session";
import {
  DEFAULT_METHODOLOGY,
  DEFAULT_PROGRAM_BENEFITS,
  DEFAULT_PROGRAM_GUIDELINES,
  DEFAULT_PROGRAM_REFERENCES,
  DEFAULT_TARGET_STATE,
  parseReferencesList,
  parseStringList,
  parseTermsChapters,
  parseTermsList,
} from "@/wellness/utils/json";
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

/**
 * GET /api/programs/[id]
 * On-demand program detail payload for Explore preview & checkout modals,
 * eliminating the need to query & serialize 150 catalog programs on /dashboard boot.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getWellnessSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Please sign in." },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const programId = (id || "").trim();
    if (!programId) {
      return NextResponse.json(
        { success: false, message: "Program ID is required." },
        { status: 400 }
      );
    }

    const [p, userEnrollment] = await Promise.all([
      prisma.program.findFirst({
        where: {
          id: programId,
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
      }),
      prisma.programEnrollment.findUnique({
        where: {
          userId_programId: { userId: session.userId, programId },
        },
        select: { status: true },
      }),
    ]);

    if (!p) {
      return NextResponse.json(
        { success: false, message: "Program not found." },
        { status: 404 }
      );
    }

    const canViewPrivateCommunityLink =
      userEnrollment?.status === "ACTIVE" || isAdminRole(session.role);

    const tax = serializeProgramTaxonomy(p);
    const normalizedStatus =
      p.status === "DONE" || p.status === "ARCHIVED"
        ? p.status
        : p.status === "PUBLISHED" || p.status === "OPEN"
          ? "ACTIVE"
          : "COMING_SOON";

    const program = {
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
      bonusTrackingDays: p.bonusTrackingDays ?? 0,
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
      communityLink: canViewPrivateCommunityLink ? p.communityLink : null,
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
      expectedBenefits: parseStringList(
        p.expectedBenefitsJson,
        DEFAULT_PROGRAM_BENEFITS
      ),
      scientificReferences: parseReferencesList(
        p.scientificReferencesJson,
        DEFAULT_PROGRAM_REFERENCES
      ),
      programGuidelines: parseStringList(
        p.programGuidelinesJson,
        DEFAULT_PROGRAM_GUIDELINES
      ),
      days: p.days.map((d) => {
        const normalizedDayType =
          p.locationType === "ONLINE" &&
          (d.dayType === "CONNECTION_DAY" ||
            (d.dayType as string) === "MEETUP_DAY")
            ? ("REST_DAY" as const)
            : d.dayType;
        return {
          id: d.id,
          dayNumber: d.dayNumber,
          title: d.title,
          dayType: normalizedDayType,
          workoutOptions: [] as string[],
          sleepRecommendation: null,
          dayNotifications: [] as Array<{
            time: string;
            message: string;
            label?: string;
          }>,
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
      }),
    };

    return NextResponse.json(
      { success: true, program },
      {
        headers: {
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (err) {
    reportServerError("program", "program_detail", err, {
      userId: session.userId,
    });
    return NextResponse.json(
      { success: false, message: "Failed to load program details." },
      { status: 500 }
    );
  }
}
