import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Looking up user steven@gmail.com...");
  let user = await prisma.user.findUnique({
    where: { email: "steven@gmail.com" },
  });

  if (!user) {
    console.log("User steven@gmail.com not found. Creating user...");
    user = await prisma.user.create({
      data: {
        email: "steven@gmail.com",
        fullName: "Steven",
        role: "MEMBER",
        status: "ACTIVE",
        phone: "+628123456789",
        passwordHash: "$2b$10$demoHashForStevenSeedScriptOnlyXXXXXXXXXXXXXX",
      },
    });
    console.log("Created user:", user.id);
  } else {
    console.log("Found user:", user.id, user.email);
  }

  // Current reference date: 2026-11-10
  const now = new Date();

  // Helper to build dates
  const addDays = (d: Date, days: number) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    return res;
  };

  const programsData = [
    // 2 UPCOMING PROGRAMS (Registered by steven@gmail.com, not yet started)
    {
      title: "Mindful Spinal Longevity & Mat Protocol",
      slug: "mindful-spinal-longevity-2026",
      description: "A 21-day restorative spine decompression and mobility curriculum designed for deep postural alignment and nervous system down-regulation.",
      coverImage: "/coach.jpg",
      category: "Pilates",
      recommendedFor: "Desk Professionals & Sedentary Workers",
      coachName: "Coach Sarah Jenkins, CPT",
      coachTitle: "Senior Mobility & Pilates Specialist",
      difficultyLevel: "BEGINNER",
      durationDays: 21,
      price: 1250000,
      actualPrice: 1500000,
      discountPercentage: 15,
      maxQuota: 35,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "BMS Studio Senopati, Jl. Suryo No. 28",
      startDate: addDays(now, 5), // Starts in 5 days
      endDate: addDays(now, 26),
      registrationDeadline: addDays(now, 4),
      status: "PUBLISHED",
      isPublished: true,
      communityLink: "https://chat.whatsapp.com/demo-spinal-longevity",
    },
    {
      title: "Neuro-Breathwork & Circadian Restoration",
      slug: "neuro-breathwork-circadian-2026",
      description: "Curated 14-day protocol focusing on parasympathetic activation, deep sleep latency reduction, and morning circadian anchoring.",
      coverImage: "/coach3.jpg",
      category: "Breathwork & Sleep",
      recommendedFor: "Founders & High-Performance Executives",
      coachName: "Coach Julian Thorne",
      coachTitle: "Neuro-Breathwork & Sleep Specialist",
      difficultyLevel: "MODERATE",
      durationDays: 14,
      price: 980000,
      actualPrice: 1200000,
      discountPercentage: 18,
      maxQuota: 30,
      locationType: "ONLINE",
      city: "Jakarta",
      startDate: addDays(now, 9), // Starts in 9 days
      endDate: addDays(now, 23),
      registrationDeadline: addDays(now, 8),
      status: "PUBLISHED",
      isPublished: true,
      communityLink: "https://chat.whatsapp.com/demo-neuro-breathwork",
    },

    // 3 ACTIVE ONGOING PROGRAMS (Started recently, currently running)
    {
      title: "Core Foundations: Precision Reformer & Mat",
      slug: "core-foundations-reformer-2026",
      description: "Structured daily reformer and mat sequence emphasizing pelvic floor activation, transverse abdominal control, and scapular stability.",
      coverImage: "/coach2.jpg",
      category: "Pilates",
      recommendedFor: "All Levels & Beginners",
      coachName: "Coach Elena Rostova",
      coachTitle: "Fascial Release & Posture Director",
      difficultyLevel: "INTERMEDIATE",
      durationDays: 21,
      price: 1450000,
      actualPrice: 1750000,
      discountPercentage: 15,
      maxQuota: 40,
      locationType: "HYBRID",
      city: "Jakarta Pusat",
      venueAddress: "BMS Studio Menteng, Jl. Teuku Umar No. 12",
      startDate: addDays(now, -3), // Started 3 days ago -> ACTIVE
      endDate: addDays(now, 18),
      registrationDeadline: addDays(now, -4),
      status: "PUBLISHED",
      isPublished: true,
      communityLink: "https://chat.whatsapp.com/demo-core-foundations",
    },
    {
      title: "Metabolic Longevity & Anti-Inflammatory Fasting",
      slug: "metabolic-longevity-fasting-2026",
      description: "Clinical protocol for metabolic flexibility, mitochondrial biogenesis, and clean nutrient sequencing for sustainable high cognitive energy.",
      coverImage: "/coach.jpg",
      category: "Nutrition & Gut Health",
      recommendedFor: "Founders & High-Performance Executives",
      coachName: "Dr. Marcus Vance, ND",
      coachTitle: "Director of Longevity Nutrition",
      difficultyLevel: "INTERMEDIATE",
      durationDays: 21,
      price: 1350000,
      actualPrice: 1600000,
      discountPercentage: 15,
      maxQuota: 35,
      locationType: "ONLINE",
      city: "Jakarta",
      startDate: addDays(now, -5), // Started 5 days ago -> ACTIVE
      endDate: addDays(now, 16),
      registrationDeadline: addDays(now, -6),
      status: "PUBLISHED",
      isPublished: true,
      communityLink: "https://chat.whatsapp.com/demo-metabolic-longevity",
    },
    {
      title: "Postural Realignment & Athletic Mobility",
      slug: "postural-realignment-mobility-2026",
      description: "Targeted myofascial release, thoracic spine rotation, and hip capsule unlocking for athletic longevity and pain-free biomechanics.",
      coverImage: "/coach3.jpg",
      category: "Mobility & Longevity",
      recommendedFor: "Desk Professionals & Sedentary Workers",
      coachName: "Coach Sarah Jenkins, CPT",
      coachTitle: "Senior Mobility & Pilates Specialist",
      difficultyLevel: "ADVANCED",
      durationDays: 21,
      price: 1550000,
      actualPrice: 1850000,
      discountPercentage: 15,
      maxQuota: 25,
      locationType: "ONSITE",
      city: "Jakarta Selatan",
      venueAddress: "BMS Studio SCBD, Lot 8",
      startDate: addDays(now, -7), // Started 7 days ago -> ACTIVE
      endDate: addDays(now, 14),
      registrationDeadline: addDays(now, -8),
      status: "PUBLISHED",
      isPublished: true,
      communityLink: "https://chat.whatsapp.com/demo-postural-realignment",
    },
  ];

  for (const pData of programsData) {
    const existing = await prisma.program.findUnique({
      where: { slug: pData.slug },
    });

    let prog = existing;
    if (!existing) {
      console.log(`Creating program: ${pData.title}...`);
      prog = await prisma.program.create({
        data: pData,
      });
    } else {
      console.log(`Updating program: ${pData.title}...`);
      prog = await prisma.program.update({
        where: { id: existing.id },
        data: pData,
      });
    }

    // Ensure program days exist (Day 1..durationDays)
    const dayCount = await prisma.programDay.count({
      where: { programId: prog.id },
    });

    if (dayCount < prog.durationDays) {
      console.log(`Generating ${prog.durationDays} curriculum days for ${prog.title}...`);
      const daysToCreate = [];
      for (let d = dayCount + 1; d <= prog.durationDays; d++) {
        const isRest = d % 7 === 0;
        const isMeetup = d === 1 || d === Math.floor(prog.durationDays / 2);
        const dayType = isMeetup
          ? "MEETUP_DAY"
          : isRest
          ? "REST_DAY"
          : "TRAINING_DAY";

        daysToCreate.push({
          programId: prog.id,
          dayNumber: d,
          title: `Day ${d} • ${
            dayType === "MEETUP_DAY"
              ? "Cohort Gathering & Biomechanics Check"
              : dayType === "REST_DAY"
              ? "Deep Fascial Rest & Parasympathetic Recovery"
              : "Kinetic Flow & Daily Sequence"
          }`,
          dayType,
          videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          mealRecommendation: "Clean botanical meal with 35g protein and omega-3 fatty acids.",
          restInstructions: "20 minutes light outdoor walk, foam rolling, and 4-7-8 breathing sequence.",
          videoChecklist: JSON.stringify([
            "5-min diaphragmatic warmup",
            "Main movement protocol (20 mins)",
            "Postural cool-down check",
          ]),
        });
      }

      await prisma.programDay.createMany({
        data: daysToCreate,
        skipDuplicates: true,
      });
    }

    // Ensure steven@gmail.com is enrolled with status ACTIVE
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: user.id,
        programId: prog.id,
      },
    });

    if (!existingEnrollment) {
      console.log(`Enrolling steven@gmail.com into ${prog.title}...`);
      await prisma.programEnrollment.create({
        data: {
          userId: user.id,
          programId: prog.id,
          status: "ACTIVE",
          attendanceMode: prog.locationType === "ONLINE" ? "VIRTUAL" : "IN_PERSON",
          paidAt: new Date(),
          validUntil: prog.endDate,
          termsAgreedAt: new Date(),
          paymentReference: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        },
      });
    } else if (existingEnrollment.status !== "ACTIVE") {
      console.log(`Updating enrollment status to ACTIVE for ${prog.title}...`);
      await prisma.programEnrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          status: "ACTIVE",
          paidAt: new Date(),
          validUntil: prog.endDate,
        },
      });
    } else {
      console.log(`steven@gmail.com already actively enrolled in ${prog.title}.`);
    }
  }

  console.log("Successfully seeded 5 programs and enrolled steven@gmail.com in all 5!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
