import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Ensuring 5 well-defined cohorts with 3 training days & 2 connections in Jakarta...");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const cohortDefinitions = [
    {
      slug: "holistic-yoga-core-vitality",
      title: "21-Day Holistic Yoga & Core Vitality",
      description: "Structured progressive cohort regimen focusing on thoracic mobility, core stability, and anti-inflammatory lifestyle habits.",
      recommendedFor: "Desk Professionals, Sedentary Workers & Spinal Mobility",
      coachName: "Coach Sarah Jenkins, CPT",
      durationDays: 21,
      price: 299000,
      maxQuota: 35,
      city: "Jakarta",
      locationType: "ONSITE",
      venueAddress: "The Sanctuary Pavilion, Senopati, South Jakarta",
      status: "ACTIVE",
      isPublished: true,
      startDate: new Date(todayStart.getTime() - 2 * 24 * 60 * 60 * 1000),
      endDate: new Date(todayStart.getTime() + 19 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 10 * 24 * 60 * 60 * 1000),
      days: [
        { dayNumber: 1, title: "Thoracic Mobility & Spinal Wave Flow", dayType: "TRAINING_DAY" },
        { dayNumber: 2, title: "Transverse Core & Pelvic Alignment", dayType: "TRAINING_DAY" },
        { dayNumber: 3, title: "Dynamic Kinetic Flexibility", dayType: "TRAINING_DAY" },
        { dayNumber: 4, title: "Cohort Community Circle & Partner Work", dayType: "CONNECTION_DAY" },
        { dayNumber: 5, title: "On-Site Studio Clinic & Masterclass", dayType: "MEETUP_DAY" },
      ],
    },
    {
      slug: "anti-inflammatory-gut-reset",
      title: "14-Day Anti-Inflammatory Nutrition & Gut Reset",
      description: "Scientifically validated whole-food nutritional protocols to reduce systemic inflammation, optimize gut microbiota, and enhance sleep depth.",
      recommendedFor: "Corporate Workers, Energy Dips & Gut Microbiome Reset",
      coachName: "Dr. Marcus Vance, ND",
      durationDays: 14,
      price: 199000,
      maxQuota: 35,
      city: "Jakarta",
      locationType: "HYBRID",
      venueAddress: "Senopati Kitchen Sanctuary, Jakarta Selatan",
      status: "ACTIVE",
      isPublished: true,
      startDate: new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(todayStart.getTime() + 17 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000),
      days: [
        { dayNumber: 1, title: "Kitchen Audit & Anti-Inflammatory Pantry Setup", dayType: "TRAINING_DAY" },
        { dayNumber: 2, title: "Cellular Nutrition & Nutrient Density", dayType: "TRAINING_DAY" },
        { dayNumber: 3, title: "Microbiome Diversity & Fermented Nutrition", dayType: "TRAINING_DAY" },
        { dayNumber: 4, title: "Jakarta Healthy Food Crawl & Tasting", dayType: "CONNECTION_DAY" },
        { dayNumber: 5, title: "Live Cohort Cooking Immersion", dayType: "MEETUP_DAY" },
      ],
    },
    {
      slug: "parasympathetic-breathwork-sleep-sanctuary",
      title: "7-Day Parasympathetic Breathwork & Sleep Sanctuary",
      description: "Evening nervous system down-regulation, guided nasal breathwork, and circadian light hygiene for restorative deep sleep.",
      recommendedFor: "High-Stress Founders, Shift Workers & Deep Rest",
      coachName: "Coach Julian Thorne",
      durationDays: 7,
      price: 249000,
      maxQuota: 30,
      city: "Jakarta",
      locationType: "ONLINE",
      venueAddress: "Live Zoom Studio & Sound Bath Jakarta",
      status: "COMING_SOON",
      isPublished: false,
      startDate: new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 6 * 24 * 60 * 60 * 1000),
      registrationOpenDate: new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000),
      days: [
        { dayNumber: 1, title: "Evening Cadence & Box Breathing Foundation", dayType: "TRAINING_DAY" },
        { dayNumber: 2, title: "Vagal Nerve Stimulation & Humming Respiration", dayType: "TRAINING_DAY" },
        { dayNumber: 3, title: "Holotropic Wind-Down Technique", dayType: "TRAINING_DAY" },
        { dayNumber: 4, title: "Jakarta Virtual Circle: Sleep Hygiene Sharing", dayType: "CONNECTION_DAY" },
        { dayNumber: 5, title: "Sound Bath & Group Decompression Meetup", dayType: "MEETUP_DAY" },
      ],
    },
    {
      slug: "kinetic-posture-ergonomic-realignment",
      title: "10-Day Kinetic Posture & Ergonomic Re-Alignment",
      description: "Targeted myofascial release, scapular retraction exercises, and workspace ergonomic redesign for desk workers.",
      recommendedFor: "Office Workers, Chronic Neck Strain & Shoulder Mobility",
      coachName: "Coach Maya Lin, MPT",
      durationDays: 10,
      price: 349000,
      maxQuota: 35,
      city: "Jakarta",
      locationType: "ONSITE",
      venueAddress: "ZERA + Kinetic Studio, SCBD Jakarta",
      status: "ACTIVE",
      isPublished: true,
      startDate: new Date(todayStart.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(todayStart.getTime() + 15 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 4 * 24 * 60 * 60 * 1000),
      days: [
        { dayNumber: 1, title: "Cervical & Upper Cross Syndrome Assessment", dayType: "TRAINING_DAY" },
        { dayNumber: 2, title: "Scapular Stability & Pectoral Decompression", dayType: "TRAINING_DAY" },
        { dayNumber: 3, title: "Hip Flexor Release & Glute Activation", dayType: "TRAINING_DAY" },
        { dayNumber: 4, title: "Jakarta SCBD Ergonomic Workshop & Partner Check", dayType: "CONNECTION_DAY" },
        { dayNumber: 5, title: "Live Clinic: Posture Correction Immersion", dayType: "MEETUP_DAY" },
      ],
    },
    {
      slug: "executive-longevity-metabolic-conditioning",
      title: "30-Day Executive Longevity & Metabolic Conditioning",
      description: "Advanced protocol combining zone 2 cardiovascular conditioning, cold thermogenesis, and cellular autophagy optimization.",
      recommendedFor: "Senior Executives, Sedentary Professionals & Metabolic Health",
      coachName: "Elena Rostova",
      durationDays: 30,
      price: 499000,
      maxQuota: 25,
      city: "Jakarta",
      locationType: "HYBRID",
      venueAddress: "ZERA + Biohacking Lounge, Kuningan, Jakarta",
      status: "COMING_SOON",
      isPublished: false,
      startDate: new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(todayStart.getTime() + 44 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 12 * 24 * 60 * 60 * 1000),
      registrationOpenDate: new Date(todayStart.getTime() + 8 * 24 * 60 * 60 * 1000),
      days: [
        { dayNumber: 1, title: "Zone 2 Baseline & Metabolic Testing", dayType: "TRAINING_DAY" },
        { dayNumber: 2, title: "Cold Thermogenesis & Microcirculation", dayType: "TRAINING_DAY" },
        { dayNumber: 3, title: "Mitochondrial Biogenesis Protocol", dayType: "TRAINING_DAY" },
        { dayNumber: 4, title: "Executive Round Table: Longevity Bio-markers", dayType: "CONNECTION_DAY" },
        { dayNumber: 5, title: "Ice Bath & Sauna Immersion in Jakarta", dayType: "MEETUP_DAY" },
      ],
    },
  ];

  for (const def of cohortDefinitions) {
    const existing = await prisma.program.findUnique({
      where: { slug: def.slug },
      include: { days: true },
    });

    if (existing) {
      await prisma.program.update({
        where: { id: existing.id },
        data: {
          title: def.title,
          description: def.description,
          recommendedFor: def.recommendedFor,
          coachName: def.coachName,
          durationDays: def.durationDays,
          price: def.price,
          maxQuota: def.maxQuota,
          city: def.city,
          locationType: def.locationType,
          venueAddress: def.venueAddress,
          status: def.status,
          isPublished: def.isPublished,
          startDate: def.startDate,
          endDate: def.endDate,
          registrationDeadline: def.registrationDeadline,
          registrationOpenDate: def.registrationOpenDate || null,
        },
      });

      // Update or create days
      for (const d of def.days) {
        const existingDay = existing.days.find((day) => day.dayNumber === d.dayNumber);
        if (existingDay) {
          await prisma.programDay.update({
            where: { id: existingDay.id },
            data: {
              title: d.title,
              dayType: d.dayType,
            },
          });
        } else {
          await prisma.programDay.create({
            data: {
              programId: existing.id,
              dayNumber: d.dayNumber,
              title: d.title,
              dayType: d.dayType,
              videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
            },
          });
        }
      }
      console.log(`✅ Updated cohort: ${def.title}`);
    } else {
      const created = await prisma.program.create({
        data: {
          title: def.title,
          slug: def.slug,
          description: def.description,
          recommendedFor: def.recommendedFor,
          coachName: def.coachName,
          durationDays: def.durationDays,
          price: def.price,
          maxQuota: def.maxQuota,
          city: def.city,
          locationType: def.locationType,
          venueAddress: def.venueAddress,
          status: def.status,
          isPublished: def.isPublished,
          startDate: def.startDate,
          endDate: def.endDate,
          registrationDeadline: def.registrationDeadline,
          registrationOpenDate: def.registrationOpenDate || null,
          days: {
            create: def.days.map((d) => ({
              dayNumber: d.dayNumber,
              title: d.title,
              dayType: d.dayType,
              videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
            })),
          },
        },
      });
      console.log(`✨ Created cohort: ${created.title}`);
    }
  }

  const allCohorts = await prisma.program.findMany({
    where: { status: { in: ["ACTIVE", "COMING_SOON"] } },
    include: { days: { select: { dayType: true } } },
  });

  console.log(`\n🎉 Total active/coming soon cohorts: ${allCohorts.length}`);
  for (const c of allCohorts) {
    const trainingDays = c.days.filter((d) => d.dayType === "TRAINING_DAY").length;
    const connectionDays = c.days.filter((d) => d.dayType === "CONNECTION_DAY" || d.dayType === "MEETUP_DAY").length;
    console.log(`- [${c.status}] ${c.title} -> ${trainingDays} Training Days, ${connectionDays} Connections in ${c.city}, Rp ${c.price}`);
  }
}

main()
  .catch((e) => {
    console.error("Error ensuring 5 cohorts:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
