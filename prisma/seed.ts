import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function createDayList(
  totalDays: number,
  titlePrefix: string,
  locationType: "ONLINE" | "HYBRID" = "HYBRID"
): Prisma.ProgramDayCreateWithoutProgramInput[] {
  const days: Prisma.ProgramDayCreateWithoutProgramInput[] = [];
  for (let i = 1; i <= totalDays; i++) {
    const isRest = i % 7 === 4;
    const isMeetup = locationType === "HYBRID" && i % 7 === 0;

    if (isRest) {
      days.push({
        dayNumber: i,
        title: `Day ${i}: Active Restoration & Cellular Recovery`,
        dayType: "REST_DAY",
        sleepRecommendation: "Target 8.5 Jam • Deep Rest & Sleep Restoration",
        restInstructions:
          "Take a 25-minute unhurried outdoor walk in natural daylight, perform gentle foam rolling, and practice 4-7-8 parasympathetic nasal breathing before sleep.",
        mealRecommendation:
          "Hydration protocol: 3 liters of mineral-rich water. Light organic bone broth or vegetable stew for dinner.",
        dayNotificationsJson: [
          {
            time: "08:00",
            label: "Pagi • Active Restoration",
            message: "Hari ini fokus pemulihan sistem saraf. Nikmati jalan santai di ruang terbuka & cukupi hidrasi.",
          },
          {
            time: "20:30",
            label: "Malam • Recovery Diary & Sleep",
            message: "Tuliskan Dear Diary harian Anda & matikan layar 60 menit sebelum tidur.",
          },
        ],
      });
    } else if (isMeetup) {
      days.push({
        dayNumber: i,
        title: `Day ${i}: Cohort Live Circle & Form Review`,
        dayType: "CONNECTION_DAY",
        sleepRecommendation: "Target 8 Jam • Siap untuk Sesi Tatap Muka",
        meetupLink: "https://meet.google.com/wellness-weekly-circle",
        onsiteVenue: "The Sanctuary Wellness Pavilion, Senopati, South Jakarta (Hybrid Live Stream Available)",
        onsiteSchedule: "08:30 – 10:30 WIB • Mat & Organic Refreshments Provided",
        mealRecommendation:
          "Pre-session: Light cold-pressed green juice or warm herbal tea 60 minutes prior to arrival.",
        dayNotificationsJson: [
          {
            time: "08:30",
            label: "Pagi • Live Studio / Zoom Circle",
            message: "Live Community Circle dimulai hari ini. Cek venue atau tautan virtual di dashboard.",
          },
          {
            time: "13:00",
            label: "Siang • Community Reflection",
            message: "Sesi tatap muka selesai. Santap siang bernutrisi & catat refleksi Anda.",
          },
          {
            time: "20:30",
            label: "Malam • Dear Diary & Sleep",
            message: "Catat evaluasi hari ini di Dear Diary & catat target jam tidur sebelum cutoff 23:59.",
          },
        ],
      });
    } else {
      days.push({
        dayNumber: i,
        title: `Day ${i}: ${titlePrefix} (Part ${i})`,
        dayType: "TRAINING_DAY",
        workoutOptionsJson: [
          "Hot Pilates",
          "Strength & Conditioning",
          "Yoga & Mobility Flow",
          "Outdoor Running / Walk",
          "Mat Pilates Core",
        ],
        sleepRecommendation: "Target 8 Jam • Tidur sebelum 22:30 WIB",
        videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
        videoChecklistJson: [
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ],
        mealRecommendation:
          "Breakfast: Rolled oats with chia seeds, wild berries, and Ceylon cinnamon.\nLunch: Grilled organic chicken breast with quinoa and avocado salad.\nDinner: Steamed wild salmon with asparagus and sweet potato.",
        dayNotificationsJson: [
          {
            time: "07:00",
            label: "Pagi • Movement Ritual",
            message: "Modul hari ini telah dibuka. Luangkan 25 menit sesi latihan & catat checklist gerakan Anda.",
          },
          {
            time: "12:30",
            label: "Siang • Clean Nourishment",
            message: "Waktunya santap siang mindful. Cek panduan nutrisi harian & catat kepatuhan makan.",
          },
          {
            time: "20:30",
            label: "Malam • Dear Diary & Cutoff",
            message: "Tuliskan Dear Diary harian, beri rating kebahagiaan, dan catat target tidur sebelum 23:59.",
          },
        ],
      });
    }
  }
  return days;
}

function birthDateYearsAgo(years: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - years, 5, 15));
}

async function main() {
  console.log("==========================================================");
  console.log("🌱 STARTING DATABASE RESET & SEEDING (WELLNESS PLATFORM)");
  console.log("==========================================================");

  // 1. Wipe all existing data in strict foreign-key order (Restrict tables first)
  console.log("🧹 Wiping existing database records...");
  await prisma.auditLog.deleteMany();
  await prisma.rateLimitBucket.deleteMany();
  await prisma.cohortSupportRequest.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.programDayCustomSubmission.deleteMany();
  await prisma.programDayCustomTask.deleteMany();
  await prisma.programDayProgress.deleteMany();
  await prisma.userBodyMetricLog.deleteMany();
  await prisma.userNotification.deleteMany();
  await prisma.userPushSubscription.deleteMany();
  await prisma.userEmailVerificationToken.deleteMany();
  await prisma.userPasswordResetToken.deleteMany();
  await prisma.userIdentity.deleteMany();
  await prisma.programEnrollment.deleteMany();
  await prisma.programCategory.deleteMany();
  await prisma.programCoach.deleteMany();
  await prisma.programEquipment.deleteMany();
  await prisma.programDay.deleteMany();
  await prisma.program.deleteMany();
  await prisma.programTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.masterCategory.deleteMany();
  await prisma.masterCoach.deleteMany();
  await prisma.masterOrganization.deleteMany();
  await prisma.masterEquipment.deleteMany();
  await prisma.masterDailyCommitment.deleteMany();
  console.log("✅ All tables cleanly wiped.");

  // 2. Hash default passwords (Superadmin reads from SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in .env)
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || "superadmin@wellness.test").trim().toLowerCase();
  const superadminRawPassword = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";
  const superadminPassword = await bcrypt.hash(superadminRawPassword, 12);
  const userPassword = await bcrypt.hash("UserBudi123!", 12);
  const stevenPassword = await bcrypt.hash("P@ssw0rd", 12);

  // 3. Seed Master Data
  console.log("📦 Seeding Master Directories (Sports, Coaches, Communities, Equipment)...");
  const catPilates = await prisma.masterCategory.create({ data: { name: "Pilates" } });
  const catVolleyball = await prisma.masterCategory.create({ data: { name: "Volleyball" } });
  const catMobility = await prisma.masterCategory.create({ data: { name: "Mobility & Longevity" } });
  const catNutrition = await prisma.masterCategory.create({ data: { name: "Nutrition & Gut Health" } });
  const catBreathwork = await prisma.masterCategory.create({ data: { name: "Breathwork & Sleep" } });
  const catStrength = await prisma.masterCategory.create({ data: { name: "Strength & Conditioning" } });
  void catVolleyball;

  const coachSarah = await prisma.masterCoach.create({
    data: { name: "Coach Sarah Jenkins, CPT", title: "Senior Mobility & Pilates Specialist" },
  });
  const coachMarcus = await prisma.masterCoach.create({
    data: { name: "Dr. Marcus Vance, ND", title: "Director of Longevity Nutrition" },
  });
  const coachJulian = await prisma.masterCoach.create({
    data: { name: "Coach Julian Thorne", title: "Neuro-Breathwork & Sleep Specialist" },
  });
  const coachElena = await prisma.masterCoach.create({
    data: { name: "Coach Elena Rostova", title: "Fascial Release & Posture Director" },
  });

  const orgZera = await prisma.masterOrganization.create({
    data: {
      name: "ZERA Sanctuary",
      slug: "zera-sanctuary",
      tagline: "Integrated Longevity & Mindful Movement",
      logoPath: "/image.webp",
      isVerified: true,
    },
  });

  const eqMat = await prisma.masterEquipment.create({ data: { name: "Yoga Mat" } });
  const eqBands = await prisma.masterEquipment.create({ data: { name: "Resistance Bands" } });
  const eqNone = await prisma.masterEquipment.create({ data: { name: "No Equipment (Bodyweight)" } });

  const commit15 = await prisma.masterDailyCommitment.create({ data: { name: "15 - 20 Mins / Day" } });
  const commit30 = await prisma.masterDailyCommitment.create({ data: { name: "25 - 30 Mins / Day" } });
  const commit45 = await prisma.masterDailyCommitment.create({ data: { name: "45 Mins / Day" } });

  await prisma.programTemplate.createMany({
    data: [
      {
        organizationId: null,
        templateType: "PROGRAM_HEADER",
        name: "Standard Wellness Blueprint & Terms",
        description: "Reusable methodology, benefits, and standard terms.",
        payloadJson: {
          difficultyLevel: "INTERMEDIATE",
          category: "Pilates",
          equipment: "Yoga Mat",
          dailyCommitment: "25 - 30 Mins / Day",
          targetState: "Improved mobility, core stability, and circadian energy.",
          methodology: "Progressive daily micro-sessions with guided tracking.",
          expectedBenefits: ["Stronger core stability", "Better sleep rhythm"],
        },
      },
      {
        organizationId: null,
        templateType: "DAY_ROUTINE",
        name: "Standard Training Day & WIB Reminders",
        description: "Morning movement, midday nutrition, evening diary.",
        payloadJson: {
          dayType: "TRAINING_DAY",
          sleepRecommendation: "Target 8 Hours • Wind down before 22:30 WIB",
          dayNotifications: [
            {
              time: "07:00",
              label: "Morning • Movement Ritual",
              message: "Today's module is ready! Take 25 minutes for your practice.",
            },
            {
              time: "19:30",
              label: "Evening • Check-in Reminder",
              message: "Complete your meal, reflection, and sleep log tonight.",
            },
          ],
        },
      },
    ],
  });

  console.log("✅ Master data successfully seeded.");

  // 4. Seed Users (All verified for testing)
  console.log("👤 Seeding Users...");
  const verifiedNow = new Date();
  await prisma.user.create({
    data: {
      email: superadminEmail,
      emailVerifiedAt: verifiedNow,
      fullName: "Super Administrator Wellness",
      birthDate: birthDateYearsAgo(32),
      phone: "+6281234567890",
      passwordHash: superadminPassword,
      role: "SUPERADMIN",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  const userBudi = await prisma.user.create({
    data: {
      email: "budi@wellness.test",
      emailVerifiedAt: verifiedNow,
      fullName: "Budi Santoso",
      birthDate: birthDateYearsAgo(28),
      gender: "Male",
      phone: "+6289876543210",
      city: "Jakarta Selatan",
      avatarPath: "/coach.webp",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  const userSiti = await prisma.user.create({
    data: {
      email: "siti@wellness.test",
      emailVerifiedAt: verifiedNow,
      fullName: "Siti Rahmawati",
      birthDate: birthDateYearsAgo(26),
      gender: "Female",
      phone: "+6281112223334",
      city: "Jakarta Pusat",
      avatarPath: "/coach2.webp",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  const userDewi = await prisma.user.create({
    data: {
      email: "dewi@wellness.test",
      emailVerifiedAt: verifiedNow,
      fullName: "Dewi Lestari",
      birthDate: birthDateYearsAgo(31),
      gender: "Female",
      phone: "+6285556667778",
      city: "Bandung",
      avatarPath: "/coach3.webp",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  const userSteven = await prisma.user.create({
    data: {
      email: "steven@gmail.com",
      emailVerifiedAt: verifiedNow,
      fullName: "Steven Mulya",
      birthDate: birthDateYearsAgo(27),
      gender: "Male",
      phone: "+6281290001122",
      city: "Jakarta Selatan",
      avatarPath: "/coach.webp",
      passwordHash: stevenPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    },
  });

  const additionalSeedMembers = [
    { fullName: "Reza Pratama", email: "reza.pratama@wellness.test", phone: "+6281298761001", age: 29, cover: "/coach.webp", weightKg: 74, heightCm: 180 },
    { fullName: "Nadia Safitri", email: "nadia.safitri@wellness.test", phone: "+6281312345602", age: 25, cover: "/coach2.webp", weightKg: 52, heightCm: 162 },
    { fullName: "Dimas Anggara", email: "dimas.anggara@wellness.test", phone: "+6281723456703", age: 34, cover: "/coach3.webp", weightKg: 78, heightCm: 176 },
    { fullName: "Maya Indah", email: "maya.indah@wellness.test", phone: "+6281834567804", age: 27, cover: "/pic.webp", weightKg: 55, heightCm: 165 },
    { fullName: "Ari Wibowo", email: "ari.wibowo@wellness.test", phone: "+6281945678905", age: 38, cover: "/test.webp", weightKg: 82, heightCm: 179 },
    { fullName: "Gita Gutawa", email: "gita.gutawa@wellness.test", phone: "+6282156789006", age: 24, cover: "/image.webp", weightKg: 49, heightCm: 160 },
    { fullName: "Kevin Sanjaya", email: "kevin.sanjaya@wellness.test", phone: "+6282267890107", age: 28, cover: "/coach.webp", weightKg: 70, heightCm: 173 },
    { fullName: "Rina Nose", email: "rina.nose@wellness.test", phone: "+6282378901208", age: 33, cover: "/coach2.webp", weightKg: 56, heightCm: 163 },
    { fullName: "Fajar Alfian", email: "fajar.alfian@wellness.test", phone: "+6285289012309", age: 30, cover: "/coach3.webp", weightKg: 73, heightCm: 177 },
    { fullName: "Amanda Manopo", email: "amanda.manopo@wellness.test", phone: "+6285390123410", age: 26, cover: "/pic.webp", weightKg: 53, heightCm: 166 },
    { fullName: "Rizky Febian", email: "rizky.febian@wellness.test", phone: "+6285601234511", age: 27, cover: "/test.webp", weightKg: 69, heightCm: 175 },
    { fullName: "Chelsea Islan", email: "chelsea.islan@wellness.test", phone: "+6285712345612", age: 29, cover: "/image.webp", weightKg: 54, heightCm: 167 },
  ];

  for (let idx = 0; idx < additionalSeedMembers.length; idx++) {
    const cust = additionalSeedMembers[idx];
    const u = await prisma.user.create({
      data: {
        email: cust.email,
        emailVerifiedAt: verifiedNow,
        fullName: cust.fullName,
        phone: cust.phone,
        birthDate: birthDateYearsAgo(cust.age),
        gender: idx % 2 === 0 ? "Male" : "Female",
        city: "Jakarta Selatan",
        avatarPath: cust.cover,
        passwordHash: userPassword,
        role: "USER",
        status: "ACTIVE",
        tokenVersion: 0,
        createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 24),
      },
    });
    await prisma.userBodyMetricLog.create({
      data: {
        userId: u.id,
        source: "SELF",
        weightKg: cust.weightKg,
        heightCm: cust.heightCm,
      },
    });
  }

  // Body metric baseline logs for Budi, Siti, Dewi
  await prisma.userBodyMetricLog.createMany({
    data: [
      { userId: userBudi.id, source: "SELF", weightKg: 72.5, heightCm: 178, waistCm: 81, chestCm: 98, hipsCm: 99 },
      { userId: userSiti.id, source: "SELF", weightKg: 54.0, heightCm: 164, waistCm: 68, chestCm: 85, hipsCm: 92 },
      { userId: userDewi.id, source: "SELF", weightKg: 58.5, heightCm: 168, waistCm: 70, chestCm: 88, hipsCm: 94 },
      { userId: userSteven.id, source: "SELF", weightKg: 71.0, heightCm: 175, waistCm: 80, chestCm: 96, hipsCm: 94 },
    ],
  });

  console.log("✅ Users & Body Metric Logs seeded (1 Superadmin, 15 Verified Members).");

  const now = new Date();
  const today00 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;

  console.log("🏋️ Seeding 9 Programs across Normalized Statuses & Full 3NF Pivots...");

  // 1. PUBLISHED -> On going
  const prog1Start = new Date(today00.getTime() - 2 * oneDayMs);
  const prog1End = new Date(prog1Start.getTime() + 21 * oneDayMs);
  const prog1RegClose = new Date(prog1Start.getTime() - 3 * oneDayMs);
  const prog1RegOpen = new Date(prog1Start.getTime() - 14 * oneDayMs);

  const prog1 = await prisma.program.create({
    data: {
      title: "21-Day Holistic Movement & Spinal Longevity",
      batchNumber: 1,
      slug: "holistic-movement-spinal-longevity",
      description:
        "Structured progressive cohort regimen focusing on thoracic mobility, pelvic stability, core bracing, and anti-inflammatory restorative habits.",
      coverImagePath: "/test.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 21,
      actualPrice: 450000,
      discountPercentage: 20,
      price: 360000,
      maxQuota: 35,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "The Sanctuary Wellness Pavilion, Senopati",
      communityLink: "https://chat.whatsapp.com/wellness-spinal-longevity",
      startAt: prog1Start,
      endAt: prog1End,
      registrationOpenAt: prog1RegOpen,
      registrationDeadlineAt: prog1RegClose,
      status: "PUBLISHED",
      dailyCommitmentId: commit30.id,
      organizationId: orgZera.id,
      days: { create: createDayList(21, "Spinal Alignment & Deep Core", "HYBRID") },
      categories: { create: [{ categoryId: catPilates.id }, { categoryId: catMobility.id }] },
      coaches: { create: [{ coachId: coachSarah.id }] },
      equipments: { create: [{ equipmentId: eqMat.id }, { equipmentId: eqBands.id }] },
    },
    include: { days: true },
  });

  const enrollBudi1 = await prisma.programEnrollment.create({
    data: {
      userId: userBudi.id,
      programId: prog1.id,
      status: "ACTIVE",
      paymentReference: "QRIS-WLS-10001",
      paidAt: new Date(prog1Start.getTime() - 2 * oneDayMs),
      validUntilAt: prog1End,
      termsAgreedAt: new Date(prog1Start.getTime() - 2 * oneDayMs),
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      enrollmentId: enrollBudi1.id,
      userId: userBudi.id,
      programId: prog1.id,
      orderId: "QRIS-WLS-10001",
      provider: "SEED",
      grossAmount: prog1.price,
      status: "SETTLEMENT",
      settledAt: enrollBudi1.paidAt,
    },
  });

  const p1Day1 = prog1.days.find((d) => d.dayNumber === 1);
  if (p1Day1) {
    await prisma.programDayProgress.create({
      data: {
        userId: userBudi.id,
        programDayId: p1Day1.id,
        isVideoWatched: true,
        isCompleted: true,
        selectedWorkout: "Hot Pilates",
        mealCompliance: "FULL",
        mealNotes: "Santap siang salad quinoa dan salmon kukus sesuai rekomendasi.",
        dailyReflection: "Punggung bawah terasa jauh lebih nyaman setelah latihan hari pertama.",
        happinessRate: 5,
        bedtime: "22:30",
        wakeTime: "06:15",
        sleepDurationMinutes: 465,
        checklistCompletedJson: [
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ],
        completedAt: new Date(prog1Start.getTime() + 10 * 3600 * 1000),
      },
    });
  }

  const p1Day2 = prog1.days.find((d) => d.dayNumber === 2);
  if (p1Day2) {
    await prisma.programDayProgress.create({
      data: {
        userId: userBudi.id,
        programDayId: p1Day2.id,
        isVideoWatched: true,
        isCompleted: true,
        selectedWorkout: "Strength & Conditioning",
        mealCompliance: "FULL",
        mealNotes: "Sarapan oatmeal chia seeds dan ayam panggang.",
        dailyReflection: "Kestabilan panggul dan core bracing terasa semakin solid.",
        happinessRate: 5,
        bedtime: "22:45",
        wakeTime: "06:30",
        sleepDurationMinutes: 465,
        checklistCompletedJson: [
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ],
        completedAt: new Date(prog1Start.getTime() + 34 * 3600 * 1000),
      },
    });
  }

  // 2. PUBLISHED -> Open Registration (Full Online · Anytime Access)
  const prog2 = await prisma.program.create({
    data: {
      title: "14-Day Anti-Inflammatory Nutrition & Gut Reset",
      slug: "anti-inflammatory-nutrition-gut-reset",
      description:
        "Evidence-based whole-food nutritional protocols to balance gut microbiome, eliminate systemic bloating, and stabilize afternoon energy.",
      coverImagePath: "/pic.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 14,
      actualPrice: 350000,
      discountPercentage: 15,
      price: 297500,
      maxQuota: 25,
      locationType: "ONLINE",
      communityLink: "https://chat.whatsapp.com/wellness-nutrition-gut-reset",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      status: "PUBLISHED",
      dailyCommitmentId: commit15.id,
      organizationId: orgZera.id,
      days: { create: createDayList(14, "Pantry Audit & Microbial Nourishment", "ONLINE") },
      categories: { create: [{ categoryId: catNutrition.id }] },
      coaches: { create: [{ coachId: coachMarcus.id }] },
      equipments: { create: [{ equipmentId: eqNone.id }] },
    },
  });

  const enrollSiti2 = await prisma.programEnrollment.create({
    data: {
      userId: userSiti.id,
      programId: prog2.id,
      status: "ACTIVE",
      paymentReference: "QRIS-WLS-20002",
      paidAt: new Date(today00.getTime() - 2 * oneDayMs),
      validUntilAt: null,
      termsAgreedAt: new Date(today00.getTime() - 2 * oneDayMs),
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      enrollmentId: enrollSiti2.id,
      userId: userSiti.id,
      programId: prog2.id,
      orderId: "QRIS-WLS-20002",
      provider: "SEED",
      grossAmount: prog2.price,
      status: "SETTLEMENT",
      settledAt: enrollSiti2.paidAt,
    },
  });

  const enrollDewi2 = await prisma.programEnrollment.create({
    data: {
      userId: userDewi.id,
      programId: prog2.id,
      status: "PENDING",
      paymentReference: "QRIS-WLS-20003",
      invoiceExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      termsAgreedAt: new Date(),
    },
  });
  await prisma.paymentTransaction.create({
    data: {
      enrollmentId: enrollDewi2.id,
      userId: userDewi.id,
      programId: prog2.id,
      orderId: "QRIS-WLS-20003",
      provider: "SEED",
      grossAmount: prog2.price,
      status: "PENDING",
      expiresAt: enrollDewi2.invoiceExpiresAt,
    },
  });

  // 3. PUBLISHED -> Full (Full Online · Anytime Access)
  const prog3 = await prisma.program.create({
    data: {
      title: "Executive Deep Sleep & Parasympathetic Breathwork",
      slug: "executive-deep-sleep-parasympathetic-breathwork",
      description:
        "Intimate executive protocol strictly capped to preserve private coach feedback: circadian alignment, guided CO2 tolerance, and nervous system down-regulation.",
      coverImagePath: "/image.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 7,
      actualPrice: 500000,
      discountPercentage: 0,
      price: 500000,
      maxQuota: 3,
      locationType: "ONLINE",
      communityLink: "https://chat.whatsapp.com/wellness-deep-sleep",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      status: "PUBLISHED",
      dailyCommitmentId: commit15.id,
      organizationId: orgZera.id,
      days: { create: createDayList(7, "Parasympathetic Respiration & Light Hygiene", "ONLINE") },
      categories: { create: [{ categoryId: catBreathwork.id }] },
      coaches: { create: [{ coachId: coachJulian.id }] },
      equipments: { create: [{ equipmentId: eqNone.id }] },
    },
  });

  for (const item of [
    { userId: userBudi.id, ref: "QRIS-WLS-30001", offsetDays: 3 },
    { userId: userSiti.id, ref: "QRIS-WLS-30002", offsetDays: 2 },
    { userId: userDewi.id, ref: "QRIS-WLS-30003", offsetDays: 1 },
  ]) {
    const paidAt = new Date(today00.getTime() - item.offsetDays * oneDayMs);
    const enr = await prisma.programEnrollment.create({
      data: {
        userId: item.userId,
        programId: prog3.id,
        status: "ACTIVE",
        paymentReference: item.ref,
        paidAt,
        validUntilAt: null,
        termsAgreedAt: paidAt,
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        enrollmentId: enr.id,
        userId: item.userId,
        programId: prog3.id,
        orderId: item.ref,
        provider: "SEED",
        grossAmount: prog3.price,
        status: "SETTLEMENT",
        settledAt: paidAt,
      },
    });
  }

  // 4. PUBLISHED -> Coming Soon
  const prog4RegOpen = new Date(today00.getTime() + 10 * oneDayMs);
  const prog4RegDeadline = new Date(today00.getTime() + 20 * oneDayMs);
  const prog4Start = new Date(today00.getTime() + 25 * oneDayMs);
  const prog4End = new Date(prog4Start.getTime() + 30 * oneDayMs);

  const prog4 = await prisma.program.create({
    data: {
      title: "30-Day Hot/Cold Thermogenesis & Cellular Vitality",
      batchNumber: 1,
      slug: "hot-cold-thermogenesis-cellular-vitality",
      description:
        "Comprehensive cellular mitochondrial rejuvenation: contrast therapy, brown adipose activation, and advanced longevity biomarkers.",
      coverImagePath: "/coach2.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 30,
      actualPrice: 750000,
      discountPercentage: 10,
      price: 675000,
      maxQuota: 20,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "ZERA + Sanctuary Studio, Senopati",
      startAt: prog4Start,
      endAt: prog4End,
      registrationOpenAt: prog4RegOpen,
      registrationDeadlineAt: prog4RegDeadline,
      status: "PUBLISHED",
      dailyCommitmentId: commit45.id,
      organizationId: orgZera.id,
      days: { create: createDayList(30, "Thermal Shock & Cellular Longevity", "HYBRID") },
      categories: { create: [{ categoryId: catMobility.id }, { categoryId: catStrength.id }] },
      coaches: { create: [{ coachId: coachElena.id }] },
      equipments: { create: [{ equipmentId: eqMat.id }] },
    },
  });

  // 5. PUBLISHED -> Close Registration
  const prog5RegOpen = new Date(today00.getTime() - 14 * oneDayMs);
  const prog5RegDeadline = new Date(today00.getTime() - 1 * oneDayMs);
  const prog5Start = new Date(today00.getTime() + 2 * oneDayMs);
  const prog5End = new Date(prog5Start.getTime() + 7 * oneDayMs);

  const prog5 = await prisma.program.create({
    data: {
      title: "Mindful Reformer & Pelvic Core Intensive",
      batchNumber: 1,
      slug: "mindful-reformer-pelvic-core-intensive",
      description:
        "High-precision rehabilitation and athletic reformer sequences for postpartum recovery and lower-back decompressive resilience.",
      coverImagePath: "/coach.webp",
      durationDays: 7,
      actualPrice: 400000,
      discountPercentage: 0,
      price: 400000,
      maxQuota: 15,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "The Sanctuary Wellness Pavilion, Senopati",
      communityLink: "https://chat.whatsapp.com/wellness-reformer-intensive",
      startAt: prog5Start,
      endAt: prog5End,
      registrationOpenAt: prog5RegOpen,
      registrationDeadlineAt: prog5RegDeadline,
      status: "PUBLISHED",
      dailyCommitmentId: commit30.id,
      organizationId: orgZera.id,
      days: { create: createDayList(7, "Reformer Precision & Pelvic Alignment") },
      categories: { create: [{ categoryId: catPilates.id }] },
      coaches: { create: [{ coachId: coachSarah.id }] },
      equipments: { create: [{ equipmentId: eqMat.id }, { equipmentId: eqBands.id }] },
    },
  });

  // 6. DONE
  const prog6 = await prisma.program.create({
    data: {
      title: "Summer Posture Awakening & Mobility (Batch 1)",
      slug: "summer-posture-awakening-batch-1",
      description:
        "The inaugural cohort that helped 35 executives eliminate chronic lower back tightness through progressive myofascial decompressive routines.",
      coverImagePath: "/test.webp",
      durationDays: 21,
      actualPrice: 350000,
      discountPercentage: 0,
      price: 350000,
      maxQuota: 35,
      locationType: "ONLINE",
      startAt: null,
      endAt: null,
      registrationDeadlineAt: null,
      status: "DONE",
      dailyCommitmentId: commit30.id,
      organizationId: orgZera.id,
      days: { create: createDayList(21, "Posture Foundation & Myofascial Flow", "ONLINE") },
      categories: { create: [{ categoryId: catPilates.id }, { categoryId: catMobility.id }] },
      coaches: { create: [{ coachId: coachSarah.id }] },
      equipments: { create: [{ equipmentId: eqMat.id }] },
    },
  });

  // 7. OPEN (100% ready to publish)
  const prog7 = await prisma.program.create({
    data: {
      title: "21-Day Hormonal Health & Circadian Rhythm Mastery",
      slug: "hormonal-health-circadian-mastery",
      description:
        "Curriculum fully authored and complete: cortisol optimization, insulin sensitivity protocols, and chronobiology movement scheduling.",
      coverImagePath: "/pic.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 21,
      actualPrice: 450000,
      discountPercentage: 10,
      price: 405000,
      maxQuota: 30,
      locationType: "ONLINE",
      startAt: null,
      endAt: null,
      registrationDeadlineAt: null,
      status: "OPEN",
      dailyCommitmentId: commit30.id,
      organizationId: orgZera.id,
      days: { create: createDayList(21, "Endocrine Balance & Melatonin Timing", "ONLINE") },
      categories: { create: [{ categoryId: catNutrition.id }, { categoryId: catBreathwork.id }] },
      coaches: { create: [{ coachId: coachMarcus.id }] },
      equipments: { create: [{ equipmentId: eqNone.id }] },
    },
  });

  // 8. DRAFT (full 3NF pivots too!)
  const prog8 = await prisma.program.create({
    data: {
      title: "Biohacking & Intermittent Fasting Fundamentals",
      slug: "biohacking-intermittent-fasting-fundamentals",
      description:
        "Concept draft in development: exploration of cellular autophagy windows and ketone elevation strategies.",
      coverImagePath: "/image.webp",
      durationDays: 2,
      actualPrice: 250000,
      discountPercentage: 0,
      price: 250000,
      maxQuota: 25,
      locationType: "ONLINE",
      status: "DRAFT",
      dailyCommitmentId: commit15.id,
      organizationId: orgZera.id,
      days: {
        create: [
          {
            dayNumber: 1,
            title: "Day 1: Baseline Metabolic Markers & Ketone Overview",
            dayType: "TRAINING_DAY",
            videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
            videoChecklistJson: ["Check fasting glucose", "10-min breathwork"],
          },
          {
            dayNumber: 2,
            title: "Day 2: 12-Hour Circadian Fasting Window",
            dayType: "REST_DAY",
            restInstructions: "Hydrate with electrolyte mineral water during fasting.",
          },
        ],
      },
      categories: { create: [{ categoryId: catNutrition.id }] },
      coaches: { create: [{ coachId: coachMarcus.id }] },
      equipments: { create: [{ equipmentId: eqNone.id }] },
    },
  });

  // 9. ARCHIVED (full 3NF pivots too!)
  const prog9 = await prisma.program.create({
    data: {
      title: "Legacy High-Intensity Core Bootcamp 2024",
      slug: "legacy-high-intensity-core-bootcamp-2024",
      description: "Archived legacy program from previous season. Preserved for historical database records.",
      coverImagePath: "/coach.webp",
      durationDays: 14,
      actualPrice: 300000,
      discountPercentage: 0,
      price: 300000,
      maxQuota: 20,
      locationType: "ONLINE",
      status: "ARCHIVED",
      dailyCommitmentId: commit45.id,
      organizationId: orgZera.id,
      days: { create: createDayList(14, "Legacy High-Intensity Core", "ONLINE") },
      categories: { create: [{ categoryId: catStrength.id }] },
      coaches: { create: [{ coachId: coachElena.id }] },
      equipments: { create: [{ equipmentId: eqBands.id }] },
    },
  });

  // 10-12. Additional Active PUBLISHED Cohorts for steven@gmail.com
  const prog10 = await prisma.program.create({
    data: {
      title: "14-Day Core Bracing & Desk Posture Reset",
      slug: "core-bracing-desk-posture-reset",
      description:
        "Targeted daily biomechanical decompression for desk professionals: thoracic extension, deep core activation, and neck release.",
      coverImagePath: "/coach3.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 14,
      actualPrice: 320000,
      discountPercentage: 10,
      price: 288000,
      maxQuota: 30,
      locationType: "ONLINE",
      communityLink: "https://chat.whatsapp.com/wellness-core-posture",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      status: "PUBLISHED",
      dailyCommitmentId: commit15.id,
      organizationId: orgZera.id,
      days: { create: createDayList(14, "Posture Alignment & Deep Core", "ONLINE") },
      categories: { create: [{ categoryId: catPilates.id }, { categoryId: catMobility.id }] },
      coaches: { create: [{ coachId: coachElena.id }] },
      equipments: { create: [{ equipmentId: eqMat.id }] },
    },
    include: { days: true },
  });

  const prog11Start = new Date(today00.getTime() - 4 * oneDayMs);
  const prog11End = new Date(prog11Start.getTime() + 21 * oneDayMs);
  const prog11 = await prisma.program.create({
    data: {
      title: "21-Day Morning Mobility & Joint Elasticity",
      batchNumber: 1,
      slug: "morning-mobility-joint-elasticity",
      description:
        "Progressive morning CARs, hip flexor opening, and scapular stability flow designed to elevate daily movement energy.",
      coverImagePath: "/coach.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 21,
      actualPrice: 400000,
      discountPercentage: 15,
      price: 340000,
      maxQuota: 25,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "The Sanctuary Wellness Pavilion, Senopati",
      communityLink: "https://chat.whatsapp.com/wellness-morning-mobility",
      startAt: prog11Start,
      endAt: prog11End,
      registrationOpenAt: new Date(prog11Start.getTime() - 12 * oneDayMs),
      registrationDeadlineAt: new Date(prog11Start.getTime() - 2 * oneDayMs),
      status: "PUBLISHED",
      dailyCommitmentId: commit30.id,
      organizationId: orgZera.id,
      days: { create: createDayList(21, "Morning Joint Elasticity", "HYBRID") },
      categories: { create: [{ categoryId: catMobility.id }] },
      coaches: { create: [{ coachId: coachSarah.id }] },
      equipments: { create: [{ equipmentId: eqBands.id }] },
    },
    include: { days: true },
  });

  const prog12 = await prisma.program.create({
    data: {
      title: "14-Day Parasympathetic Breathwork & Sleep Hygiene",
      slug: "parasympathetic-breathwork-sleep-hygiene",
      description:
        "Evening vagal toning, nasal CO2 tolerance drills, and digital sunset protocols for restorative deep sleep.",
      coverImagePath: "/image.webp",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      durationDays: 14,
      actualPrice: 280000,
      discountPercentage: 0,
      price: 280000,
      maxQuota: 30,
      locationType: "ONLINE",
      communityLink: "https://chat.whatsapp.com/wellness-sleep-breathwork",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      status: "PUBLISHED",
      dailyCommitmentId: commit15.id,
      organizationId: orgZera.id,
      days: { create: createDayList(14, "Vagal Toning & Sleep Recovery", "ONLINE") },
      categories: { create: [{ categoryId: catBreathwork.id }] },
      coaches: { create: [{ coachId: coachJulian.id }] },
      equipments: { create: [{ equipmentId: eqNone.id }] },
    },
    include: { days: true },
  });

  // Enroll steven@gmail.com: ACTIVE plans across Hybrid + Online anytime access
  const stevenEnrollSpecs = [
    { program: prog1, days: prog1.days, endAt: prog1End, ref: "QRIS-STV-10001", paidOffsetDays: 4, completedDays: 2 },
    { program: prog10, days: prog10.days, endAt: null, ref: "QRIS-STV-10002", paidOffsetDays: 5, completedDays: 2 },
    { program: prog11, days: prog11.days, endAt: prog11End, ref: "QRIS-STV-10003", paidOffsetDays: 6, completedDays: 3 },
    { program: prog12, days: prog12.days, endAt: null, ref: "QRIS-STV-10004", paidOffsetDays: 3, completedDays: 1 },
    { program: prog5, days: [], endAt: prog5End, ref: "QRIS-STV-10005", paidOffsetDays: 1, completedDays: 0 },
    { program: prog2, days: [], endAt: null, ref: "QRIS-STV-10006", paidOffsetDays: 1, completedDays: 0 },
  ];

  for (const spec of stevenEnrollSpecs) {
    const paidAt = new Date(today00.getTime() - spec.paidOffsetDays * oneDayMs);
    const enr = await prisma.programEnrollment.create({
      data: {
        userId: userSteven.id,
        programId: spec.program.id,
        status: "ACTIVE",
        paymentReference: spec.ref,
        paidAt,
        validUntilAt: spec.endAt,
        termsAgreedAt: paidAt,
      },
    });
    await prisma.paymentTransaction.create({
      data: {
        enrollmentId: enr.id,
        userId: userSteven.id,
        programId: spec.program.id,
        orderId: spec.ref,
        provider: "SEED",
        grossAmount: spec.program.price,
        status: "SETTLEMENT",
        settledAt: paidAt,
      },
    });

    if (spec.completedDays > 0 && spec.days.length > 0) {
      const daysToComplete = spec.days
        .filter((d) => d.dayNumber <= spec.completedDays)
        .sort((a, b) => a.dayNumber - b.dayNumber);

      for (const day of daysToComplete) {
        const baseCompletedMs = spec.program.startAt
          ? spec.program.startAt.getTime()
          : paidAt.getTime();
        await prisma.programDayProgress.create({
          data: {
            userId: userSteven.id,
            programDayId: day.id,
            isVideoWatched: true,
            isCompleted: true,
            selectedWorkout: "Hot Pilates",
            mealCompliance: "FULL",
            mealNotes: "Mengikuti panduan nutrisi seimbang harian.",
            dailyReflection: `Menyelesaikan Day ${day.dayNumber} dengan ritme fokus dan napas terjaga.`,
            happinessRate: 5,
            bedtime: "22:30",
            wakeTime: "06:15",
            sleepDurationMinutes: 465,
            checklistCompletedJson: [
              "5 min diaphragmatic breathing & posture check",
              "15 min guided mobility & core sequence",
              "5 min gentle fascial cooldown",
            ],
            completedAt: new Date(
              baseCompletedMs + (day.dayNumber - 1) * oneDayMs + 10 * 3600 * 1000
            ),
          },
        });
      }
    }
  }

  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("  Seeded 12 Programs:", [prog1.slug, prog2.slug, prog3.slug, prog4.slug, prog5.slug, prog6.slug, prog7.slug, prog8.slug, prog9.slug, prog10.slug, prog11.slug, prog12.slug].join(", "));
  console.log("  Default Credentials (all pre-verified):");
  console.log("    Superadmin : superadmin@wellness.test / SuperAdmin123!");
  console.log("    Member     : budi@wellness.test       / UserBudi123!");
  console.log("    Member     : steven@gmail.com         / P@ssw0rd (4 On Progress + 2 Incoming)");
}

main()
  .catch((e) => {
    console.error("❌ Fatal error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
