import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function createDayList(totalDays: number, titlePrefix: string) {
  const days = [];
  for (let i = 1; i <= totalDays; i++) {
    const isRest = i % 7 === 4;
    const isMeetup = i % 7 === 0;

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
        dailyAssessment:
          "Did you complete your 25-minute outdoor restorative walk and meet your hydration target today?",
        pendingReminder:
          "Rest Day Protocol: Recovery is where physiological adaptation occurs. Log your rest checklist before 23:59.",
        completedReminder:
          "Rest day logged. Your nervous system is primed for the next movement block.",
        dayNotifications: JSON.stringify([
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
        ]),
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
        dailyAssessment:
          "What was the most impactful posture adjustment or insight you received during today's circle?",
        pendingReminder:
          "Live Session Today: Review venue details and arrive 15 minutes before start.",
        completedReminder:
          "Thank you for attending the community circle! Connect with peers in the WhatsApp group.",
        dayNotifications: JSON.stringify([
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
        ]),
      });
    } else {
      days.push({
        dayNumber: i,
        title: `Day ${i}: ${titlePrefix} (Part ${i})`,
        dayType: "TRAINING_DAY",
        workoutOptions: JSON.stringify([
          "Hot Pilates",
          "Strength & Conditioning",
          "Yoga & Mobility Flow",
          "Outdoor Running / Walk",
          "Mat Pilates Core",
        ]),
        sleepRecommendation: "Target 8 Jam • Tidur sebelum 22:30 WIB",
        videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
        videoChecklist: JSON.stringify([
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ]),
        mealRecommendation:
          "Breakfast: Rolled oats with chia seeds, wild berries, and Ceylon cinnamon.\nLunch: Grilled organic chicken breast with quinoa and avocado salad.\nDinner: Steamed wild salmon with asparagus and sweet potato.",
        dailyAssessment:
          "How did your body feel throughout the movement sequence? Rate your energy level from 1 to 10.",
        pendingReminder:
          "Daily Curriculum Unlocked: Dedicate 25 focused minutes to your body before 23:59 tonight.",
        completedReminder:
          "Training day logged and verified. Your posture and core resilience are improving.",
        dayNotifications: JSON.stringify([
          {
            time: "07:00",
            label: "Pagi • Movement Ritual",
            message: "Modul hari ini telah dibuka. Luangkan 25 menit sesi latihan & upload foto before-after.",
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
        ]),
      });
    }
  }
  return days;
}

async function main() {
  console.log("==========================================================");
  console.log("🌱 STARTING DATABASE RESET & SEEDING (WELLNESS PLATFORM)");
  console.log("==========================================================");

  // 1. Wipe all existing data in strict foreign-key order
  console.log("🧹 Wiping existing database records...");
  await prisma.programDayProgress.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.programEnrollment.deleteMany();
  await prisma.programCategory.deleteMany();
  await prisma.programCoach.deleteMany();
  await prisma.programAudience.deleteMany();
  await prisma.programEquipment.deleteMany();
  await prisma.programDay.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
  await prisma.masterCategory.deleteMany();
  await prisma.masterCoach.deleteMany();
  await prisma.masterTargetAudience.deleteMany();
  await prisma.masterEquipment.deleteMany();
  await prisma.masterDailyCommitment.deleteMany();
  console.log("✅ All tables cleanly wiped.");

  // 2. Hash default passwords
  const superadminPassword = await bcrypt.hash("SuperAdmin123!", 12);
  const userPassword = await bcrypt.hash("UserBudi123!", 12);

  // 3. Seed Master Data
  console.log("📦 Seeding Master Directories...");
  const catPilates = await prisma.masterCategory.create({ data: { name: "Pilates" } });
  const catMobility = await prisma.masterCategory.create({ data: { name: "Mobility & Longevity" } });
  const catNutrition = await prisma.masterCategory.create({ data: { name: "Nutrition & Gut Health" } });
  const catBreathwork = await prisma.masterCategory.create({ data: { name: "Breathwork & Sleep" } });
  const catStrength = await prisma.masterCategory.create({ data: { name: "Strength & Conditioning" } });

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

  const audDesk = await prisma.masterTargetAudience.create({ data: { name: "Desk Professionals & Sedentary Workers" } });
  const audFounders = await prisma.masterTargetAudience.create({ data: { name: "Founders & High-Performance Executives" } });
  const audAll = await prisma.masterTargetAudience.create({ data: { name: "All Levels & Beginners" } });

  const eqMat = await prisma.masterEquipment.create({ data: { name: "Yoga Mat" } });
  const eqBands = await prisma.masterEquipment.create({ data: { name: "Resistance Bands" } });
  const eqNone = await prisma.masterEquipment.create({ data: { name: "No Equipment (Bodyweight)" } });

  const commit15 = await prisma.masterDailyCommitment.create({ data: { name: "15 - 20 Mins / Day" } });
  const commit30 = await prisma.masterDailyCommitment.create({ data: { name: "25 - 30 Mins / Day" } });
  const commit45 = await prisma.masterDailyCommitment.create({ data: { name: "45 Mins / Day" } });

  console.log("✅ Master data successfully seeded.");

  // 4. Seed Users
  console.log("👤 Seeding Users...");
  const superadmin = await prisma.user.create({
    data: {
      email: "superadmin@wellness.test",
      fullName: "Super Administrator Wellness",
      age: 32,
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
      fullName: "Budi Santoso",
      age: 28,
      phone: "+6289876543210",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
      healthProfile: {
        create: {
          photoFrontUrl: "/coach.webp",
          photoSideUrl: "/coach2.webp",
          photoBackUrl: "/coach3.webp",
          age: 28,
          weightKg: 72.5,
          heightCm: 178,
          waistCm: 81,
          chestCm: 98,
          hipsCm: 99,
          currentMood: "Energetic & Focused",
          energyLevel: 8,
          routineConfidence: 4,
          workoutFrequency: "4 - 5 days / week",
          averageBedtime: "22:30",
          averageWakeTime: "06:00",
          sleepQualityNotes: "Deep, uninterrupted 7.5 hours sleep",
          eatingPatterns: "High protein, whole foods, caloric balance",
        },
      },
    },
  });

  const userSiti = await prisma.user.create({
    data: {
      email: "siti@wellness.test",
      fullName: "Siti Rahmawati",
      age: 26,
      phone: "+6281112223334",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
      healthProfile: {
        create: {
          photoFrontUrl: "/coach2.webp",
          photoSideUrl: "/coach3.webp",
          photoBackUrl: "/coach.webp",
          age: 26,
          weightKg: 54.0,
          heightCm: 164,
          waistCm: 68,
          chestCm: 85,
          hipsCm: 92,
          currentMood: "Calm & Mindful",
          energyLevel: 7,
          routineConfidence: 5,
          workoutFrequency: "3 - 4 days / week",
          averageBedtime: "22:00",
          averageWakeTime: "06:30",
          sleepQualityNotes: "Consistent 8 hours, waking light and refreshed",
          eatingPatterns: "Plant-forward Mediterranean, intuitive eating",
        },
      },
    },
  });

  const userDewi = await prisma.user.create({
    data: {
      email: "dewi@wellness.test",
      fullName: "Dewi Lestari",
      age: 31,
      phone: "+6285556667778",
      passwordHash: userPassword,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
      healthProfile: {
        create: {
          photoFrontUrl: "/coach3.webp",
          photoSideUrl: "/pic.webp",
          photoBackUrl: "/test.webp",
          age: 31,
          weightKg: 58.5,
          heightCm: 168,
          waistCm: 70,
          chestCm: 88,
          hipsCm: 94,
          currentMood: "Resilient & Restoring",
          energyLevel: 9,
          routineConfidence: 4,
          workoutFrequency: "5 days / week",
          averageBedtime: "23:00",
          averageWakeTime: "06:30",
          sleepQualityNotes: "Sound sleep, minimal waking",
          eatingPatterns: "Balanced macros, hydration priority",
        },
      },
    },
  });

  const additionalSeedMembers = [
    { fullName: "Reza Pratama", email: "reza.pratama@wellness.test", phone: "+6281298761001", age: 29, cover: "/coach.webp", weightKg: 74, heightCm: 180, mood: "Focused & Energized" },
    { fullName: "Nadia Safitri", email: "nadia.safitri@wellness.test", phone: "+6281312345602", age: 25, cover: "/coach2.webp", weightKg: 52, heightCm: 162, mood: "Balanced & Calm" },
    { fullName: "Dimas Anggara", email: "dimas.anggara@wellness.test", phone: "+6281723456703", age: 34, cover: "/coach3.webp", weightKg: 78, heightCm: 176, mood: "High Stamina" },
    { fullName: "Maya Indah", email: "maya.indah@wellness.test", phone: "+6281834567804", age: 27, cover: "/pic.webp", weightKg: 55, heightCm: 165, mood: "Relaxed & Restored" },
    { fullName: "Ari Wibowo", email: "ari.wibowo@wellness.test", phone: "+6281945678905", age: 38, cover: "/test.webp", weightKg: 82, heightCm: 179, mood: "Steady & Consistent" },
    { fullName: "Gita Gutawa", email: "gita.gutawa@wellness.test", phone: "+6282156789006", age: 24, cover: "/image.webp", weightKg: 49, heightCm: 160, mood: "Optimistic & Joyful" },
    { fullName: "Kevin Sanjaya", email: "kevin.sanjaya@wellness.test", phone: "+6282267890107", age: 28, cover: "/coach.webp", weightKg: 70, heightCm: 173, mood: "Agile & Motivated" },
    { fullName: "Rina Nose", email: "rina.nose@wellness.test", phone: "+6282378901208", age: 33, cover: "/coach2.webp", weightKg: 56, heightCm: 163, mood: "Grounded & Light" },
    { fullName: "Fajar Alfian", email: "fajar.alfian@wellness.test", phone: "+6285289012309", age: 30, cover: "/coach3.webp", weightKg: 73, heightCm: 177, mood: "Resilient & Driven" },
    { fullName: "Amanda Manopo", email: "amanda.manopo@wellness.test", phone: "+6285390123410", age: 26, cover: "/pic.webp", weightKg: 53, heightCm: 166, mood: "Vibrant & Mindful" },
    { fullName: "Rizky Febian", email: "rizky.febian@wellness.test", phone: "+6285601234511", age: 27, cover: "/test.webp", weightKg: 69, heightCm: 175, mood: "Harmonious & Fresh" },
    { fullName: "Chelsea Islan", email: "chelsea.islan@wellness.test", phone: "+6285712345612", age: 29, cover: "/image.webp", weightKg: 54, heightCm: 167, mood: "Peaceful & Strong" },
  ];

  for (let idx = 0; idx < additionalSeedMembers.length; idx++) {
    const cust = additionalSeedMembers[idx];
    await prisma.user.create({
      data: {
        email: cust.email,
        fullName: cust.fullName,
        phone: cust.phone,
        age: cust.age,
        passwordHash: userPassword,
        role: "USER",
        status: "ACTIVE",
        tokenVersion: 0,
        createdAt: new Date(Date.now() - (idx + 1) * 3600 * 1000 * 24),
        healthProfile: {
          create: {
            photoFrontUrl: cust.cover,
            photoSideUrl: "/coach2.webp",
            photoBackUrl: "/coach3.webp",
            age: cust.age,
            weightKg: cust.weightKg,
            heightCm: cust.heightCm,
            waistCm: Math.round(cust.weightKg * 1.1),
            chestCm: Math.round(cust.heightCm * 0.55),
            hipsCm: Math.round(cust.weightKg * 1.3),
            currentMood: cust.mood,
            energyLevel: 8,
            routineConfidence: 4,
            workoutFrequency: "3 - 5 days / week",
            averageBedtime: "22:30",
            averageWakeTime: "06:30",
            sleepQualityNotes: "Restful and deep sleep",
            eatingPatterns: "Whole foods, balanced nutrients",
          },
        },
      },
    });
  }

  console.log("✅ Users seeded (1 Superadmin, 15 Members with Health Profiles).");

  // Normalized anchor date: today at 00:00:00
  const now = new Date();
  const today00 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const oneDayMs = 24 * 60 * 60 * 1000;

  // 5. Seed Programs Covering ALL 5 Database Statuses & ALL 6 Dynamic Badges
  console.log("🏋️ Seeding Programs across Lifecycle & Dynamic Badges...");

  // --------------------------------------------------------------------------
  // PROGRAM 1: DB "PUBLISH" -> Dynamic Badge "On going"
  // (Started 3 days ago, ends in 18 days. Day 1 & Day 2 completed by Budi, Day 3 is today)
  // --------------------------------------------------------------------------
  const prog1Start = new Date(today00.getTime() - 2 * oneDayMs); // 2 days ago = Day 1 was 2 days ago, Day 2 yesterday, Day 3 today
  const prog1End = new Date(prog1Start.getTime() + 21 * oneDayMs);
  const prog1RegClose = new Date(prog1Start.getTime() - 3 * oneDayMs);
  const prog1RegOpen = new Date(prog1Start.getTime() - 14 * oneDayMs);

  const prog1 = await prisma.program.create({
    data: {
      title: "21-Day Holistic Movement & Spinal Longevity",
      slug: "holistic-movement-spinal-longevity",
      description:
        "Structured progressive cohort regimen focusing on thoracic mobility, pelvic stability, core bracing, and anti-inflammatory restorative habits.",
      category: "Pilates, Mobility & Longevity",
      equipment: "Yoga Mat, Resistance Bands",
      dailyCommitment: "25 - 30 Mins / Day",
      recommendedFor: "Desk Professionals & Sedentary Workers",
      coachName: coachSarah.name,
      coachTitle: coachSarah.title,
      coverImage: "/test.webp",
      durationDays: 21,
      actualPrice: 450000,
      discountPercentage: 20,
      price: 360000,
      maxQuota: 35,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "The Sanctuary Wellness Pavilion, Senopati",
      virtualFallbackAvailable: true,
      communityLink: "https://chat.whatsapp.com/wellness-spinal-longevity",
      startDate: prog1Start,
      endDate: prog1End,
      registrationOpenDate: prog1RegOpen,
      registrationDeadline: prog1RegClose,
      status: "PUBLISH",
      isPublished: true,
      dailyCommitmentId: commit30.id,
      days: {
        create: createDayList(21, "Spinal Alignment & Deep Core"),
      },
    },
    include: { days: true },
  });

  // Pivot taxonomy links for Program 1
  await prisma.programCategory.createMany({
    data: [
      { programId: prog1.id, categoryId: catPilates.id },
      { programId: prog1.id, categoryId: catMobility.id },
    ],
  });
  await prisma.programCoach.create({ data: { programId: prog1.id, coachId: coachSarah.id } });
  await prisma.programAudience.create({ data: { programId: prog1.id, audienceId: audDesk.id } });
  await prisma.programEquipment.create({ data: { programId: prog1.id, equipmentId: eqMat.id } });

  // Enroll Budi as ACTIVE participant in Program 1
  await prisma.programEnrollment.create({
    data: {
      userId: userBudi.id,
      programId: prog1.id,
      status: "ACTIVE",
      paymentReference: "QRIS-WLS-10001",
      paidAt: new Date(prog1Start.getTime() - 2 * oneDayMs),
      validUntil: prog1End,
    },
  });

  // Seed Day 1 completion for Budi
  const p1Day1 = prog1.days.find((d) => d.dayNumber === 1);
  if (p1Day1) {
    await prisma.programDayProgress.create({
      data: {
        userId: userBudi.id,
        programDayId: p1Day1.id,
        videoWatched: true,
        isCompleted: true,
        selectedWorkout: "Hot Pilates",
        photoBeforeUrl: "/test.webp",
        photoAfterUrl: "/pic.webp",
        mealCompliance: "FULL",
        mealNotes: "Santap siang salad quinoa dan salmon kukus sesuai rekomendasi.",
        dailyReflection: "Punggung bawah terasa jauh lebih nyaman setelah latihan hari pertama.",
        happinessRate: 5,
        bedtime: "22:30",
        wakeTime: "06:15",
        sleepDurationMinutes: 465,
        checklistCompleted: JSON.stringify([
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ]),
        completedAt: new Date(prog1Start.getTime() + 10 * 3600 * 1000),
      },
    });
  }

  // Seed Day 2 completion for Budi
  const p1Day2 = prog1.days.find((d) => d.dayNumber === 2);
  if (p1Day2) {
    await prisma.programDayProgress.create({
      data: {
        userId: userBudi.id,
        programDayId: p1Day2.id,
        videoWatched: true,
        isCompleted: true,
        selectedWorkout: "Strength & Conditioning",
        photoBeforeUrl: "/test.webp",
        photoAfterUrl: "/pic.webp",
        mealCompliance: "FULL",
        mealNotes: "Sarapan oatmeal chia seeds dan ayam panggang.",
        dailyReflection: "Kestabilan panggul dan core bracing terasa semakin solid.",
        happinessRate: 5,
        bedtime: "22:45",
        wakeTime: "06:30",
        sleepDurationMinutes: 465,
        checklistCompleted: JSON.stringify([
          "5 min diaphragmatic breathing & posture check",
          "15 min guided mobility & core sequence",
          "5 min gentle fascial cooldown",
        ]),
        completedAt: new Date(prog1Start.getTime() + 34 * 3600 * 1000),
      },
    });
  }

  // --------------------------------------------------------------------------
  // PROGRAM 2: DB "PUBLISH" -> Dynamic Badge "Open Registration"
  // (Reg opens 5 days ago, reg deadline in 7 days, starts in 10 days. Siti enrolled)
  // --------------------------------------------------------------------------
  const prog2RegOpen = new Date(today00.getTime() - 5 * oneDayMs);
  const prog2RegDeadline = new Date(today00.getTime() + 7 * oneDayMs);
  const prog2Start = new Date(today00.getTime() + 10 * oneDayMs);
  const prog2End = new Date(prog2Start.getTime() + 14 * oneDayMs);

  const prog2 = await prisma.program.create({
    data: {
      title: "14-Day Anti-Inflammatory Nutrition & Gut Reset",
      slug: "anti-inflammatory-nutrition-gut-reset",
      description:
        "Evidence-based whole-food nutritional protocols to balance gut microbiome, eliminate systemic bloating, and stabilize afternoon energy.",
      category: "Nutrition & Gut Health",
      equipment: "No Equipment (Bodyweight)",
      dailyCommitment: "15 - 20 Mins / Day",
      recommendedFor: "All Levels & Beginners",
      coachName: coachMarcus.name,
      coachTitle: coachMarcus.title,
      coverImage: "/pic.webp",
      durationDays: 14,
      actualPrice: 350000,
      discountPercentage: 15,
      price: 297500,
      maxQuota: 25,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      communityLink: "https://chat.whatsapp.com/wellness-nutrition-gut-reset",
      startDate: prog2Start,
      endDate: prog2End,
      registrationOpenDate: prog2RegOpen,
      registrationDeadline: prog2RegDeadline,
      status: "PUBLISH",
      isPublished: true,
      dailyCommitmentId: commit15.id,
      days: {
        create: createDayList(14, "Pantry Audit & Microbial Nourishment"),
      },
    },
  });

  await prisma.programCategory.create({ data: { programId: prog2.id, categoryId: catNutrition.id } });
  await prisma.programCoach.create({ data: { programId: prog2.id, coachId: coachMarcus.id } });
  await prisma.programAudience.create({ data: { programId: prog2.id, audienceId: audAll.id } });
  await prisma.programEquipment.create({ data: { programId: prog2.id, equipmentId: eqNone.id } });

  // Enroll Siti as ACTIVE in Program 2
  await prisma.programEnrollment.create({
    data: {
      userId: userSiti.id,
      programId: prog2.id,
      status: "ACTIVE",
      paymentReference: "QRIS-WLS-20002",
      paidAt: new Date(today00.getTime() - 2 * oneDayMs),
      validUntil: prog2End,
    },
  });

  // Enroll Dewi as PENDING (15-min countdown QRIS invoice)
  await prisma.programEnrollment.create({
    data: {
      userId: userDewi.id,
      programId: prog2.id,
      status: "PENDING",
      paymentReference: "QRIS-WLS-20003",
      invoiceExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  // --------------------------------------------------------------------------
  // PROGRAM 3: DB "PUBLISH" -> Dynamic Badge "Full"
  // (Reg open, maxQuota = 3, and exactly 3 members enrolled before deadline!)
  // --------------------------------------------------------------------------
  const prog3RegOpen = new Date(today00.getTime() - 7 * oneDayMs);
  const prog3RegDeadline = new Date(today00.getTime() + 5 * oneDayMs);
  const prog3Start = new Date(today00.getTime() + 8 * oneDayMs);
  const prog3End = new Date(prog3Start.getTime() + 7 * oneDayMs);

  const prog3 = await prisma.program.create({
    data: {
      title: "Executive Deep Sleep & Parasympathetic Breathwork",
      slug: "executive-deep-sleep-parasympathetic-breathwork",
      description:
        "Intimate executive protocol strictly capped to preserve private coach feedback: circadian alignment, guided CO2 tolerance, and nervous system down-regulation.",
      category: "Breathwork & Sleep",
      equipment: "No Equipment (Bodyweight)",
      dailyCommitment: "15 - 20 Mins / Day",
      recommendedFor: "Founders & High-Performance Executives",
      coachName: coachJulian.name,
      coachTitle: coachJulian.title,
      coverImage: "/image.webp",
      durationDays: 7,
      actualPrice: 500000,
      discountPercentage: 0,
      price: 500000,
      maxQuota: 3, // Capped at 3 to demonstrate FULL badge!
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      communityLink: "https://chat.whatsapp.com/wellness-deep-sleep",
      startDate: prog3Start,
      endDate: prog3End,
      registrationOpenDate: prog3RegOpen,
      registrationDeadline: prog3RegDeadline,
      status: "PUBLISH",
      isPublished: true,
      dailyCommitmentId: commit15.id,
      days: {
        create: createDayList(7, "Parasympathetic Respiration & Light Hygiene"),
      },
    },
  });

  await prisma.programCategory.create({ data: { programId: prog3.id, categoryId: catBreathwork.id } });
  await prisma.programCoach.create({ data: { programId: prog3.id, coachId: coachJulian.id } });
  await prisma.programAudience.create({ data: { programId: prog3.id, audienceId: audFounders.id } });

  // Fill all 3 seats: Budi, Siti, Dewi
  await prisma.programEnrollment.createMany({
    data: [
      {
        userId: userBudi.id,
        programId: prog3.id,
        status: "ACTIVE",
        paymentReference: "QRIS-WLS-30001",
        paidAt: new Date(today00.getTime() - 3 * oneDayMs),
        validUntil: prog3End,
      },
      {
        userId: userSiti.id,
        programId: prog3.id,
        status: "ACTIVE",
        paymentReference: "QRIS-WLS-30002",
        paidAt: new Date(today00.getTime() - 2 * oneDayMs),
        validUntil: prog3End,
      },
      {
        userId: userDewi.id,
        programId: prog3.id,
        status: "ACTIVE",
        paymentReference: "QRIS-WLS-30003",
        paidAt: new Date(today00.getTime() - 1 * oneDayMs),
        validUntil: prog3End,
      },
    ],
  });

  // --------------------------------------------------------------------------
  // PROGRAM 4: DB "PUBLISH" -> Dynamic Badge "Coming Soon"
  // (Reg opens in 10 days, deadline in 20 days, starts in 25 days)
  // --------------------------------------------------------------------------
  const prog4RegOpen = new Date(today00.getTime() + 10 * oneDayMs);
  const prog4RegDeadline = new Date(today00.getTime() + 20 * oneDayMs);
  const prog4Start = new Date(today00.getTime() + 25 * oneDayMs);
  const prog4End = new Date(prog4Start.getTime() + 30 * oneDayMs);

  const prog4 = await prisma.program.create({
    data: {
      title: "30-Day Hot/Cold Thermogenesis & Cellular Vitality",
      slug: "hot-cold-thermogenesis-cellular-vitality",
      description:
        "Comprehensive cellular mitochondrial rejuvenation: contrast therapy, brown adipose activation, and advanced longevity biomarkers.",
      category: "Mobility & Longevity, Strength & Conditioning",
      equipment: "Yoga Mat",
      dailyCommitment: "45 Mins / Day",
      recommendedFor: "All Levels & Beginners",
      coachName: coachElena.name,
      coachTitle: coachElena.title,
      coverImage: "/coach2.webp",
      durationDays: 30,
      actualPrice: 750000,
      discountPercentage: 10,
      price: 675000,
      maxQuota: 20,
      locationType: "ONSITE",
      city: "Jakarta Selatan",
      venueAddress: "BMS Sanctuary Studio, Senopati",
      virtualFallbackAvailable: false,
      startDate: prog4Start,
      endDate: prog4End,
      registrationOpenDate: prog4RegOpen,
      registrationDeadline: prog4RegDeadline,
      status: "PUBLISH",
      isPublished: true,
      dailyCommitmentId: commit45.id,
      days: {
        create: createDayList(30, "Thermal Shock & Cellular Longevity"),
      },
    },
  });

  await prisma.programCategory.createMany({
    data: [
      { programId: prog4.id, categoryId: catMobility.id },
      { programId: prog4.id, categoryId: catStrength.id },
    ],
  });
  await prisma.programCoach.create({ data: { programId: prog4.id, coachId: coachElena.id } });

  // --------------------------------------------------------------------------
  // PROGRAM 5: DB "PUBLISH" -> Dynamic Badge "Close Registration"
  // (Reg opened 14 days ago, closed yesterday, batch starts in 2 days)
  // --------------------------------------------------------------------------
  const prog5RegOpen = new Date(today00.getTime() - 14 * oneDayMs);
  const prog5RegDeadline = new Date(today00.getTime() - 1 * oneDayMs);
  const prog5Start = new Date(today00.getTime() + 2 * oneDayMs);
  const prog5End = new Date(prog5Start.getTime() + 7 * oneDayMs);

  const prog5 = await prisma.program.create({
    data: {
      title: "Mindful Reformer & Pelvic Core Intensive",
      slug: "mindful-reformer-pelvic-core-intensive",
      description:
        "High-precision rehabilitation and athletic reformer sequences for postpartum recovery and lower-back decompressive resilience.",
      category: "Pilates",
      equipment: "Yoga Mat, Resistance Bands",
      dailyCommitment: "25 - 30 Mins / Day",
      recommendedFor: "Desk Professionals & Sedentary Workers",
      coachName: coachSarah.name,
      coachTitle: coachSarah.title,
      coverImage: "/coach.webp",
      durationDays: 7,
      actualPrice: 400000,
      discountPercentage: 0,
      price: 400000,
      maxQuota: 15,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "The Sanctuary Wellness Pavilion, Senopati",
      virtualFallbackAvailable: true,
      communityLink: "https://chat.whatsapp.com/wellness-reformer-intensive",
      startDate: prog5Start,
      endDate: prog5End,
      registrationOpenDate: prog5RegOpen,
      registrationDeadline: prog5RegDeadline,
      status: "PUBLISH",
      isPublished: true,
      dailyCommitmentId: commit30.id,
      days: {
        create: createDayList(7, "Reformer Precision & Pelvic Alignment"),
      },
    },
  });

  await prisma.programCategory.create({ data: { programId: prog5.id, categoryId: catPilates.id } });
  await prisma.programCoach.create({ data: { programId: prog5.id, coachId: coachSarah.id } });

  // --------------------------------------------------------------------------
  // PROGRAM 6: DB "DONE" -> Concluded Cohort
  // (Started 40 days ago, concluded 19 days ago)
  // --------------------------------------------------------------------------
  const prog6Start = new Date(today00.getTime() - 40 * oneDayMs);
  const prog6End = new Date(today00.getTime() - 19 * oneDayMs);
  const prog6RegDeadline = new Date(today00.getTime() - 42 * oneDayMs);

  const prog6 = await prisma.program.create({
    data: {
      title: "Summer Posture Awakening & Mobility (Batch 1)",
      slug: "summer-posture-awakening-batch-1",
      description:
        "The inaugural cohort that helped 35 executives eliminate chronic lower back tightness through progressive myofascial decompressive routines.",
      category: "Pilates, Mobility & Longevity",
      equipment: "Yoga Mat",
      dailyCommitment: "25 - 30 Mins / Day",
      recommendedFor: "Desk Professionals & Sedentary Workers",
      coachName: coachSarah.name,
      coachTitle: coachSarah.title,
      coverImage: "/test.webp",
      durationDays: 21,
      price: 350000,
      maxQuota: 35,
      locationType: "ONLINE",
      startDate: prog6Start,
      endDate: prog6End,
      registrationDeadline: prog6RegDeadline,
      status: "DONE",
      isPublished: false,
      dailyCommitmentId: commit30.id,
      days: {
        create: createDayList(21, "Posture Foundation & Myofascial Flow"),
      },
    },
  });

  await prisma.programCategory.create({ data: { programId: prog6.id, categoryId: catPilates.id } });

  // --------------------------------------------------------------------------
  // PROGRAM 7: DB "OPEN" -> 100% Header & 100% Days Ready to Broadcast!
  // (Curriculum 100% filled, admin can one-click publish)
  // --------------------------------------------------------------------------
  const prog7Start = new Date(today00.getTime() + 30 * oneDayMs);
  const prog7End = new Date(prog7Start.getTime() + 21 * oneDayMs);
  const prog7RegDeadline = new Date(today00.getTime() + 28 * oneDayMs);

  const prog7 = await prisma.program.create({
    data: {
      title: "21-Day Hormonal Health & Circadian Rhythm Mastery",
      slug: "hormonal-health-circadian-mastery",
      description:
        "Curriculum fully authored and complete: cortisol optimization, insulin sensitivity protocols, and chronobiology movement scheduling.",
      category: "Nutrition & Gut Health, Breathwork & Sleep",
      equipment: "No Equipment (Bodyweight)",
      dailyCommitment: "25 - 30 Mins / Day",
      recommendedFor: "Founders & High-Performance Executives",
      coachName: coachMarcus.name,
      coachTitle: coachMarcus.title,
      coverImage: "/pic.webp",
      durationDays: 21,
      actualPrice: 450000,
      discountPercentage: 10,
      price: 405000,
      maxQuota: 30,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: prog7Start,
      endDate: prog7End,
      registrationDeadline: prog7RegDeadline,
      status: "OPEN",
      isPublished: false,
      dailyCommitmentId: commit30.id,
      days: {
        create: createDayList(21, "Endocrine Balance & Melatonin Timing"),
      },
    },
  });

  await prisma.programCategory.createMany({
    data: [
      { programId: prog7.id, categoryId: catNutrition.id },
      { programId: prog7.id, categoryId: catBreathwork.id },
    ],
  });

  // --------------------------------------------------------------------------
  // PROGRAM 8: DB "DRAFT" -> Concept In Progress
  // (Duration is 14 days, but only Day 1 & Day 2 drafted)
  // --------------------------------------------------------------------------
  const prog8 = await prisma.program.create({
    data: {
      title: "Biohacking & Intermittent Fasting Fundamentals",
      slug: "biohacking-intermittent-fasting-fundamentals",
      description:
        "Concept draft in development: exploration of cellular autophagy windows and ketone elevation strategies.",
      category: "Nutrition & Gut Health",
      equipment: "No Equipment (Bodyweight)",
      dailyCommitment: "15 - 20 Mins / Day",
      recommendedFor: "All Levels & Beginners",
      coachName: coachMarcus.name,
      coachTitle: coachMarcus.title,
      coverImage: "/image.webp",
      durationDays: 14,
      price: 250000,
      maxQuota: 25,
      locationType: "ONLINE",
      status: "DRAFT",
      isPublished: false,
      days: {
        create: [
          {
            dayNumber: 1,
            title: "Day 1: Baseline Metabolic Markers & Ketone Overview",
            dayType: "TRAINING_DAY",
            videoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
            videoChecklist: JSON.stringify(["Check fasting glucose", "10-min breathwork"]),
          },
          {
            dayNumber: 2,
            title: "Day 2: 12-Hour Circadian Fasting Window",
            dayType: "REST_DAY",
            restInstructions: "Hydrate with electrolyte mineral water during fasting.",
          },
        ],
      },
    },
  });

  // --------------------------------------------------------------------------
  // PROGRAM 9: DB "ARCHIVE" -> Legacy Cohort Hidden from Catalog
  // --------------------------------------------------------------------------
  const prog9 = await prisma.program.create({
    data: {
      title: "Legacy High-Intensity Core Bootcamp 2024",
      slug: "legacy-high-intensity-core-bootcamp-2024",
      description: "Archived legacy program from previous season. Preserved for historical database records.",
      category: "Strength & Conditioning",
      equipment: "Resistance Bands",
      dailyCommitment: "45 Mins / Day",
      recommendedFor: "All Levels & Beginners",
      coachName: coachElena.name,
      coachTitle: coachElena.title,
      coverImage: "/coach.webp",
      durationDays: 14,
      price: 300000,
      maxQuota: 20,
      locationType: "ONLINE",
      status: "ARCHIVE",
      isPublished: false,
      days: {
        create: createDayList(14, "Legacy High-Intensity Core"),
      },
    },
  });

  console.log("==========================================================");
  console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("==========================================================");
  console.log("Seeded 9 Programs across all 5 Authoritative DB Statuses:");
  console.log("  1. [PUBLISH -> 'On going']           : " + prog1.title);
  console.log("  2. [PUBLISH -> 'Open Registration']  : " + prog2.title);
  console.log("  3. [PUBLISH -> 'Full']               : " + prog3.title);
  console.log("  4. [PUBLISH -> 'Coming Soon']        : " + prog4.title);
  console.log("  5. [PUBLISH -> 'Close Registration'] : " + prog5.title);
  console.log("  6. [DONE]                            : " + prog6.title);
  console.log("  7. [OPEN] (Ready to Publish)         : " + prog7.title);
  console.log("  8. [DRAFT] (Curriculum Incomplete)   : " + prog8.title);
  console.log("  9. [ARCHIVE] (Archived & Hidden)     : " + prog9.title);
  console.log("----------------------------------------------------------");
  console.log("Default Credentials:");
  console.log("  Superadmin : superadmin@wellness.test / SuperAdmin123!");
  console.log("  Member     : budi@wellness.test       / UserBudi123!");
  console.log("  Member     : siti@wellness.test       / UserBudi123!");
  console.log("  Member     : dewi@wellness.test       / UserBudi123!");
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Fatal error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
