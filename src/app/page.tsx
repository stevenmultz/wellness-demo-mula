import { Suspense } from "react";
import { getWellnessSession } from "@/wellness/security/session";
import { prisma } from "@/wellness/db";
import { LandingClient } from "@/components/home/LandingClient";
import { parseTermsList } from "@/wellness/utils/json";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessionUser = await getWellnessSession();

  // Optimized parallel queries: Fetch published cohorts for the landing page
  const [programs, userEnrollments] = await Promise.all([
    prisma.program.findMany({
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
        days: {
          select: {
            dayType: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    sessionUser
      ? prisma.programEnrollment.findMany({
          where: { userId: sessionUser.userId, status: "ACTIVE" },
          select: { programId: true },
        })
      : Promise.resolve([]),
  ]);

  const userActiveProgramIds = new Set(userEnrollments.map((e) => e.programId));

  const formattedPrograms = programs.map((p) => {
    const trainingDays =
      p.days.filter((d) => d.dayType === "TRAINING_DAY").length || p.durationDays;
    const connectionDays =
      p.days.filter(
        (d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY"
      ).length || 2;

    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      description: p.description,
      coverImage: p.coverImage || null,
      category: p.category || "Pilates",
      recommendedFor: p.recommendedFor || "All Levels",
      coachName: p.coachName,
      coachTitle: p.coachTitle,
      durationDays: p.durationDays,
      trainingDays,
      connectionDays,
      actualPrice: p.actualPrice,
      discountPercentage: p.discountPercentage,
      price: p.price,
      maxQuota: p.maxQuota,
      locationType: p.locationType,
      city: p.city || "Jakarta",
      venueAddress: p.venueAddress,
      virtualFallbackAvailable: p.virtualFallbackAvailable,
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

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LandingClient
        sessionUser={sessionUser}
        programs={formattedPrograms}
      />
    </Suspense>
  );
}
