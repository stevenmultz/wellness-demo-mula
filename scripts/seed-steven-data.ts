import bcrypt from "bcryptjs";
import { prisma } from "../src/wellness/db";

async function main() {
  console.log("🚀 Starting seed script for steven@gmail.com and requested programs...");

  // 1. Create or update user steven@gmail.com
  const email = "steven@gmail.com";
  const plainPassword = "P@ssw0rd";
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: "Steven",
      passwordHash,
      phone: "+6281298765432",
      role: "USER",
      status: "ACTIVE",
      age: 28,
      gender: "Male",
      occupation: "Software Engineer",
      address: "Jl. Senopati No. 45, Kebayoran Baru",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      emergencyContactName: "Amanda Putri",
      emergencyContactPhone: "+6281299887766",
    },
    create: {
      email,
      fullName: "Steven",
      passwordHash,
      phone: "+6281298765432",
      role: "USER",
      status: "ACTIVE",
      age: 28,
      gender: "Male",
      occupation: "Software Engineer",
      address: "Jl. Senopati No. 45, Kebayoran Baru",
      city: "Jakarta Selatan",
      province: "DKI Jakarta",
      emergencyContactName: "Amanda Putri",
      emergencyContactPhone: "+6281299887766",
    },
  });

  console.log(`✅ User ${user.email} (ID: ${user.id}) created / updated with password: ${plainPassword}`);

  // Create health profile for Steven if not exists
  await prisma.customerHealthProfile.upsert({
    where: { userId: user.id },
    update: {
      weightKg: 70.5,
      heightCm: 175,
      waistCm: 80,
      chestCm: 96,
      hipsCm: 98,
      dietType: "Vegetarian",
      foodAllergies: "None",
      injuriesOrConditions: "Mild lower back stiffness from sitting",
      primaryGoal: "Improve spinal mobility, core stability and parasympathetic sleep quality",
      currentMood: "Focused & Driven",
      energyLevel: 8,
      routineConfidence: 4,
      workoutFrequency: "3 - 4 days / week",
      averageBedtime: "22:30",
      averageWakeTime: "06:30",
      sleepQualityNotes: "Good deep sleep, looking to optimize sleep latency",
      eatingPatterns: "Whole Foods, Plant-based, Intermittent Fasting 16:8",
    },
    create: {
      userId: user.id,
      weightKg: 70.5,
      heightCm: 175,
      waistCm: 80,
      chestCm: 96,
      hipsCm: 98,
      dietType: "Vegetarian",
      foodAllergies: "None",
      injuriesOrConditions: "Mild lower back stiffness from sitting",
      primaryGoal: "Improve spinal mobility, core stability and parasympathetic sleep quality",
      currentMood: "Focused & Driven",
      energyLevel: 8,
      routineConfidence: 4,
      workoutFrequency: "3 - 4 days / week",
      averageBedtime: "22:30",
      averageWakeTime: "06:30",
      sleepQualityNotes: "Good deep sleep, looking to optimize sleep latency",
      eatingPatterns: "Whole Foods, Plant-based, Intermittent Fasting 16:8",
    },
  });
  console.log("✅ Customer health profile linked for Steven.");

  // Base timestamps (Today is 2026-11-03)
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
  const threeDaysEnd = new Date(todayStart.getTime() + 3 * 24 * 60 * 60 * 1000 - 1000);
  const ninetyDaysValid = new Date(todayStart.getTime() + 90 * 24 * 60 * 60 * 1000);

  // -------------------------------------------------------------
  // PROGRAM 1: Training -> Rest -> Connect (Enrolled)
  // -------------------------------------------------------------
  const p1Slug = "3-day-posture-core-reset";
  const prog1 = await prisma.program.upsert({
    where: { slug: p1Slug },
    update: {
      title: "3-Day Posture & Core Reset",
      description: "A compact 3-day holistic reset designed to awaken deep postural stabilizers, restore parasympathetic recovery, and connect with fellow practitioners.",
      coverImage: "/coach.jpg",
      durationDays: 3,
      actualPrice: 900000,
      discountPercentage: 15,
      price: 750000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Coach Marcus Thorne",
      coachTitle: "Head of Movement Science & Spinal Alignment",
      recommendedFor: "Sedentary Professionals & Posture Awakening",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-1",
      targetState: "Decompressed lumbar spine, activated transversus abdominis, calm parasympathetic state.",
      methodology: "Progressive functional core patterning paired with restorative down-regulation.",
      expectedBenefits: JSON.stringify([
        "Noticeable relief in thoracic and lower back tension",
        "Deep core activation and improved pelvic stability",
        "Higher sleep efficiency and heart rate variability",
      ]),
      programGuidelines: JSON.stringify([
        "Complete movement session before noon for peak cortisol rhythm synchronization",
        "Stay hydrated with mineral-rich water during the 3 days",
        "Log your daily reflection each evening before 23:59 WIB",
      ]),
    },
    create: {
      title: "3-Day Posture & Core Reset",
      slug: p1Slug,
      description: "A compact 3-day holistic reset designed to awaken deep postural stabilizers, restore parasympathetic recovery, and connect with fellow practitioners.",
      coverImage: "/coach.jpg",
      durationDays: 3,
      actualPrice: 900000,
      discountPercentage: 15,
      price: 750000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Coach Marcus Thorne",
      coachTitle: "Head of Movement Science & Spinal Alignment",
      recommendedFor: "Sedentary Professionals & Posture Awakening",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-1",
      targetState: "Decompressed lumbar spine, activated transversus abdominis, calm parasympathetic state.",
      methodology: "Progressive functional core patterning paired with restorative down-regulation.",
      expectedBenefits: JSON.stringify([
        "Noticeable relief in thoracic and lower back tension",
        "Deep core activation and improved pelvic stability",
        "Higher sleep efficiency and heart rate variability",
      ]),
      programGuidelines: JSON.stringify([
        "Complete movement session before noon for peak cortisol rhythm synchronization",
        "Stay hydrated with mineral-rich water during the 3 days",
        "Log your daily reflection each evening before 23:59 WIB",
      ]),
    },
  });

  // Days for Program 1: Day 1 (TRAINING), Day 2 (REST), Day 3 (CONNECTION)
  await prisma.programDay.deleteMany({ where: { programId: prog1.id } });
  await prisma.programDay.createMany({
    data: [
      {
        programId: prog1.id,
        dayNumber: 1,
        title: "Deep Core Alignment & Posture Awakening",
        dayType: "TRAINING_DAY",
        dayNotifications: JSON.stringify([
          {
            time: "16:40",
            message: "Posture & Core Reset: Waktunya aktivasi deep spinal stabilizers dan wall holds.",
            label: "Movement Protocol",
          },
        ]),
        videoUrl: "https://www.youtube.com/watch?v=inpok4MKVLM",
        videoChecklist: JSON.stringify([
          "Thoracic Spine Mobilization & Cat-Cow Drills",
          "Deep Transversus Abdominis Wall Holds",
          "Glute Bridge & Pelvic Stability Flow",
          "Cooling Diaphragmatic Breathwork",
        ]),
        workoutOptions: JSON.stringify(["Core Alignment & Stability", "Gentle Mat Flow"]),
        mealRecommendation: "Anti-inflammatory green smoothie with spinach, chia seeds, and ginger, followed by a nourishing salmon or tempeh quinoa bowl.",
        sleepRecommendation: "Turn off artificial screens 60 minutes before bed. Aim for 8 hours in a dark, quiet sanctuary.",
        coachName: "Coach Marcus Thorne",
        recommendedFor: "Lower back relief & postural alignment",
      },
      {
        programId: prog1.id,
        dayNumber: 2,
        title: "Cellular Decompression & Tissue Repair",
        dayType: "REST_DAY",
        restInstructions: "Take a 30-minute restorative outdoor walk without digital devices. Complete 10 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold).",
        mealRecommendation: "Light digestive rest: Slow-simmered mineral bone broth or organic miso soup with steamed greens and fermented kimchi.",
        sleepRecommendation: "Prioritize magnesium glycinate and 8.5 hours of uninterrupted cellular restorative sleep.",
        coachName: "Coach Marcus Thorne",
        recommendedFor: "Parasympathetic nervous system recharge",
      },
      {
        programId: prog1.id,
        dayNumber: 3,
        title: "Sanctuary Circle & Milestone Integration",
        dayType: "CONNECTION_DAY",
        meetupLink: "https://zoom.us/j/bms-sanctuary-circle-1",
        eventTitle: "Live Coach Q&A: Long-term Spinal Health & Habit Locking",
        eventHost: "Coach Marcus Thorne & Wellness Director",
        eventDetails: "Interactive video circle with our coaching team. Bring your reflection notes and posture questions.",
        restInstructions: "Connect with fellow members in the Sanctuary Circle and log your 3-day reflection breakthrough.",
        mealRecommendation: "Nourishing celebration feast: Colorful Mediterranean salad with extra virgin olive oil and avocado.",
        coachName: "Coach Marcus Thorne",
        recommendedFor: "Community celebration and lifestyle commitment",
      },
    ],
  });

  // Enroll Steven in Program 1
  await prisma.programEnrollment.upsert({
    where: { userId_programId: { userId: user.id, programId: prog1.id } },
    update: {
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-001",
      attendanceMode: "VIRTUAL",
    },
    create: {
      userId: user.id,
      programId: prog1.id,
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-001",
      attendanceMode: "VIRTUAL",
    },
  });
  console.log("✅ Program 1 created (Training -> Rest -> Connect) and Steven enrolled (ACTIVE).");

  // -------------------------------------------------------------
  // PROGRAM 2: Rest -> Training -> Connect (Enrolled)
  // -------------------------------------------------------------
  const p2Slug = "3-day-parasympathetic-metabolic-surge";
  const prog2 = await prisma.program.upsert({
    where: { slug: p2Slug },
    update: {
      title: "3-Day Parasympathetic Metabolic Surge",
      description: "Strategic 3-day micro-cycle starting with deep nervous system recovery, followed by high-yield functional movement and a community integration circle.",
      coverImage: "/coach2.jpg",
      durationDays: 3,
      actualPrice: 1100000,
      discountPercentage: 10,
      price: 950000,
      maxQuota: 30,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Elena Vance, MS",
      coachTitle: "Exercise Physiologist & Biohacking Specialist",
      recommendedFor: "Stress Reduction & Metabolic Reset",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-2",
      targetState: "Reset cortisol baseline, peak muscular recruitment, and community synergy.",
    },
    create: {
      title: "3-Day Parasympathetic Metabolic Surge",
      slug: p2Slug,
      description: "Strategic 3-day micro-cycle starting with deep nervous system recovery, followed by high-yield functional movement and a community integration circle.",
      coverImage: "/coach2.jpg",
      durationDays: 3,
      actualPrice: 1100000,
      discountPercentage: 10,
      price: 950000,
      maxQuota: 30,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Elena Vance, MS",
      coachTitle: "Exercise Physiologist & Biohacking Specialist",
      recommendedFor: "Stress Reduction & Metabolic Reset",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-2",
      targetState: "Reset cortisol baseline, peak muscular recruitment, and community synergy.",
    },
  });

  // Days for Program 2: Day 1 (REST), Day 2 (TRAINING), Day 3 (CONNECTION)
  await prisma.programDay.deleteMany({ where: { programId: prog2.id } });
  await prisma.programDay.createMany({
    data: [
      {
        programId: prog2.id,
        dayNumber: 1,
        title: "Vagus Nerve Activation & Systemic Calming",
        dayType: "REST_DAY",
        dayNotifications: JSON.stringify([
          {
            time: "16:50",
            message: "Parasympathetic Surge: Waktunya dekompresi syaraf dan istirahat NSDR 10 menit.",
            label: "Recovery Alert",
          },
        ]),
        restInstructions: "Complete 15 minutes of non-sleep deep rest (NSDR). Take a warm magnesium bath or foot soak to down-regulate sympathetic tone.",
        mealRecommendation: "Warm digestive broth with steamed pumpkin, sweet potato, and fresh herbal tea.",
        sleepRecommendation: "Target 8 hours in a dark, quiet room at 19°C. Elevate legs for 10 minutes prior to sleep.",
        coachName: "Elena Vance, MS",
        recommendedFor: "Adrenal recovery and systemic stress relief",
      },
      {
        programId: prog2.id,
        dayNumber: 2,
        title: "Full-Body Functional Movement & Power",
        dayType: "TRAINING_DAY",
        videoUrl: "https://www.youtube.com/watch?v=ml6cT4AZdqI",
        videoChecklist: JSON.stringify([
          "Dynamic Hip & Ankle Joint Warmup",
          "Compound Goblet Squats & Hinge Sequence",
          "Posterior Chain Band Pull-Aparts",
          "Vagal Cooling Down-Regulation",
        ]),
        workoutOptions: JSON.stringify(["Functional Strength & Core", "Kettlebell Movement Progression"]),
        mealRecommendation: "Clean protein replenishment: Grilled organic chicken breast or steamed tempeh with roasted root vegetables.",
        sleepRecommendation: "8 hours sleep. No caffeine after 14:00 WIB.",
        coachName: "Elena Vance, MS",
        recommendedFor: "Metabolic rate boost and muscular recruitment",
      },
      {
        programId: prog2.id,
        dayNumber: 3,
        title: "Studio Gathering & Community Flow",
        dayType: "CONNECTION_DAY",
        meetupLink: "https://zoom.us/j/bms-sanctuary-circle-2",
        onsiteVenue: "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
        onsiteSchedule: "19:00 - 20:30 WIB",
        eventTitle: "Live Studio Gathering & Group Biohacking Discussion",
        eventHost: "Elena Vance, MS",
        eventDetails: "In-person or virtual gathering discussing circadian rhythms, fasting protocols, and peer support.",
        restInstructions: "Engage with your peers in person or on Zoom, and share your metabolic insights.",
        mealRecommendation: "Shared harvest bowl: Mixed greens, roasted chickpeas, pumpkin seeds, and tahini dressing.",
        coachName: "Elena Vance, MS",
        recommendedFor: "Holistic integration & communal support",
      },
    ],
  });

  // Enroll Steven in Program 2
  await prisma.programEnrollment.upsert({
    where: { userId_programId: { userId: user.id, programId: prog2.id } },
    update: {
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-002",
      attendanceMode: "IN_PERSON",
    },
    create: {
      userId: user.id,
      programId: prog2.id,
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-002",
      attendanceMode: "IN_PERSON",
    },
  });
  console.log("✅ Program 2 created (Rest -> Training -> Connect) and Steven enrolled (ACTIVE).");

  // -------------------------------------------------------------
  // PROGRAM 3: Connect -> Training -> Rest (Enrolled)
  // -------------------------------------------------------------
  const p3Slug = "3-day-breath-longevity-immersion";
  const prog3 = await prisma.program.upsert({
    where: { slug: p3Slug },
    update: {
      title: "3-Day Breath & Longevity Immersion",
      description: "Initiate with a live opening cohort circle, progress into an invigorating longevity movement session, and close with restorative cellular replenishment.",
      coverImage: "/coach3.jpg",
      durationDays: 3,
      actualPrice: 1000000,
      discountPercentage: 15,
      price: 850000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Dr. Julian Sterling",
      coachTitle: "Longevity Medicine & Breathwork Coach",
      recommendedFor: "Cellular Energy, Nitric Oxide & Deep Breathing",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-3",
      targetState: "Optimized CO2 tolerance, thoracic ribcage expansion, and parasympathetic balance.",
    },
    create: {
      title: "3-Day Breath & Longevity Immersion",
      slug: p3Slug,
      description: "Initiate with a live opening cohort circle, progress into an invigorating longevity movement session, and close with restorative cellular replenishment.",
      coverImage: "/coach3.jpg",
      durationDays: 3,
      actualPrice: 1000000,
      discountPercentage: 15,
      price: 850000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: todayStart,
      endDate: threeDaysEnd,
      registrationOpenDate: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000),
      registrationDeadline: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1000),
      status: "PUBLISH",
      isPublished: true,
      coachName: "Dr. Julian Sterling",
      coachTitle: "Longevity Medicine & Breathwork Coach",
      recommendedFor: "Cellular Energy, Nitric Oxide & Deep Breathing",
      communityLink: "https://chat.whatsapp.com/sample-sanctuary-circle-3",
      targetState: "Optimized CO2 tolerance, thoracic ribcage expansion, and parasympathetic balance.",
    },
  });

  // Days for Program 3: Day 1 (CONNECTION), Day 2 (TRAINING), Day 3 (REST)
  await prisma.programDay.deleteMany({ where: { programId: prog3.id } });
  await prisma.programDay.createMany({
    data: [
      {
        programId: prog3.id,
        dayNumber: 1,
        title: "Cohort Orientation & Longevity Visioning",
        dayType: "CONNECTION_DAY",
        dayNotifications: JSON.stringify([
          {
            time: "17:00",
            message: "Breath & Longevity: Sesi Live Opening Circle bersama Dr. Julian dimulai pukul 17.00 WIB.",
            label: "Sanctuary Circle",
          },
        ]),
        meetupLink: "https://zoom.us/j/bms-sanctuary-circle-3",
        eventTitle: "Live Opening Circle: Setting Your Longevity Intention",
        eventHost: "Dr. Julian Sterling",
        eventDetails: "Meet your peers and lead coach. We will establish your personal movement baseline and wellness metrics.",
        restInstructions: "Record your 3-day goals in the Daily Reflection card before midnight cutoff.",
        mealRecommendation: "Warm restorative dinner: Vegetable soup with extra virgin olive oil and warm lemon water.",
        coachName: "Dr. Julian Sterling",
        recommendedFor: "Cohort onboarding and intention setting",
      },
      {
        programId: prog3.id,
        dayNumber: 2,
        title: "Hypoxic Breath & Isometric Core Endurance",
        dayType: "TRAINING_DAY",
        videoUrl: "https://www.youtube.com/watch?v=gC_L9qAHVJ8",
        videoChecklist: JSON.stringify([
          "Nasal Breath Hold Warmup",
          "Isometric Hollow Body & Plank Drills",
          "Thoracic Spine Rotational Flow",
          "Coherence Breathing Calldown",
        ]),
        workoutOptions: JSON.stringify(["Breath-Enhanced Core Strength", "Low-Impact Longevity Flow"]),
        mealRecommendation: "Metabolic replenishment: Steamed wild salmon or organic tofu with quinoa and broccoli florets.",
        sleepRecommendation: "Sleep with mouth tape or nasal strips for optimal nasal breathing and nitric oxide release.",
        coachName: "Dr. Julian Sterling",
        recommendedFor: "Endurance, lung capacity and trunk stabilization",
      },
      {
        programId: prog3.id,
        dayNumber: 3,
        title: "Full Body Stillness & Parasympathetic Recovery",
        dayType: "REST_DAY",
        restInstructions: "Practice 20 minutes of barefoot grounding or gentle foam rolling. Disconnect from digital inputs for the afternoon.",
        mealRecommendation: "Hydrating clean foods: Coconut water, dark leafy greens with fresh lemon juice, and bone broth.",
        sleepRecommendation: "Target 9 hours of healing sleep with no alarm if your schedule permits.",
        coachName: "Dr. Julian Sterling",
        recommendedFor: "Mitochondrial regeneration and restful sleep",
      },
    ],
  });

  // Enroll Steven in Program 3
  await prisma.programEnrollment.upsert({
    where: { userId_programId: { userId: user.id, programId: prog3.id } },
    update: {
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-003",
      attendanceMode: "VIRTUAL",
    },
    create: {
      userId: user.id,
      programId: prog3.id,
      status: "ACTIVE",
      paidAt: now,
      validUntil: ninetyDaysValid,
      paymentReference: "QRIS-STV-003",
      attendanceMode: "VIRTUAL",
    },
  });
  console.log("✅ Program 3 created (Connect -> Training -> Rest) and Steven enrolled (ACTIVE).");

  // -------------------------------------------------------------
  // 3 OTHER PROGRAMS: OPEN REGISTRATION (For Explore Tab 2)
  // -------------------------------------------------------------
  const futureStart1 = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);
  const futureDeadline1 = new Date(todayStart.getTime() + 10 * 24 * 60 * 60 * 1000);
  const futureEnd1 = new Date(futureStart1.getTime() + 21 * 24 * 60 * 60 * 1000);

  const futureStart2 = new Date(todayStart.getTime() + 20 * 24 * 60 * 60 * 1000);
  const futureDeadline2 = new Date(todayStart.getTime() + 16 * 24 * 60 * 60 * 1000);
  const futureEnd2 = new Date(futureStart2.getTime() + 14 * 24 * 60 * 60 * 1000);

  const futureStart3 = new Date(todayStart.getTime() + 25 * 24 * 60 * 60 * 1000);
  const futureDeadline3 = new Date(todayStart.getTime() + 21 * 24 * 60 * 60 * 1000);
  const futureEnd3 = new Date(futureStart3.getTime() + 21 * 24 * 60 * 60 * 1000);

  const regOpenPast = new Date(todayStart.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Open Program 1
  const p4 = await prisma.program.upsert({
    where: { slug: "21-day-spinal-longevity-pelvic-alignment" },
    update: {
      title: "21-Day Spinal Longevity & Pelvic Alignment",
      description: "Master comprehensive spinal decompression, deep pelvic stability, and pain-free biomechanics with daily guided video coaching.",
      coverImage: "/pic.jpg",
      durationDays: 21,
      actualPrice: 1950000,
      discountPercentage: 15,
      price: 1650000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: futureStart1,
      endDate: futureEnd1,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline1,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Sarah Jenkins, PT",
      coachTitle: "Lead Physical Therapist & Alignment Coach",
      recommendedFor: "All Levels • Posture Rehabilitation & Core",
    },
    create: {
      title: "21-Day Spinal Longevity & Pelvic Alignment",
      slug: "21-day-spinal-longevity-pelvic-alignment",
      description: "Master comprehensive spinal decompression, deep pelvic stability, and pain-free biomechanics with daily guided video coaching.",
      coverImage: "/pic.jpg",
      durationDays: 21,
      actualPrice: 1950000,
      discountPercentage: 15,
      price: 1650000,
      maxQuota: 35,
      locationType: "ONLINE",
      virtualFallbackAvailable: true,
      startDate: futureStart1,
      endDate: futureEnd1,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline1,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Sarah Jenkins, PT",
      coachTitle: "Lead Physical Therapist & Alignment Coach",
      recommendedFor: "All Levels • Posture Rehabilitation & Core",
    },
  });

  // Open Program 2
  const p5 = await prisma.program.upsert({
    where: { slug: "14-day-cellular-fasting-autophagy-blueprint" },
    update: {
      title: "14-Day Cellular Fasting & Autophagy Blueprint",
      description: "Structured intermittent fasting, metabolic flexibility protocols, and whole-food refeeding strategies tailored to reset insulin sensitivity.",
      coverImage: "/coach.jpg",
      durationDays: 14,
      actualPrice: 1500000,
      discountPercentage: 15,
      price: 1250000,
      maxQuota: 30,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
      virtualFallbackAvailable: true,
      startDate: futureStart2,
      endDate: futureEnd2,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline2,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Dr. Julian Sterling & Chef Aris",
      coachTitle: "Integrative Metabolic Health Specialists",
      recommendedFor: "Metabolic Health, Gut Restoration & Fasting",
    },
    create: {
      title: "14-Day Cellular Fasting & Autophagy Blueprint",
      slug: "14-day-cellular-fasting-autophagy-blueprint",
      description: "Structured intermittent fasting, metabolic flexibility protocols, and whole-food refeeding strategies tailored to reset insulin sensitivity.",
      coverImage: "/coach.jpg",
      durationDays: 14,
      actualPrice: 1500000,
      discountPercentage: 15,
      price: 1250000,
      maxQuota: 30,
      locationType: "HYBRID",
      city: "Jakarta Selatan",
      venueAddress: "BMS Sanctuary Studio, Senopati, Jakarta Selatan",
      virtualFallbackAvailable: true,
      startDate: futureStart2,
      endDate: futureEnd2,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline2,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Dr. Julian Sterling & Chef Aris",
      coachTitle: "Integrative Metabolic Health Specialists",
      recommendedFor: "Metabolic Health, Gut Restoration & Fasting",
    },
  });

  // Open Program 3
  const p6 = await prisma.program.upsert({
    where: { slug: "30-day-primal-movement-cold-thermogenesis" },
    update: {
      title: "30-Day Primal Movement & Cold Thermogenesis",
      description: "Elevate mitochondrial density and dopamine resilience through controlled cold exposure, breathwork, and primal mobility flows.",
      coverImage: "/coach3.jpg",
      durationDays: 30,
      actualPrice: 2800000,
      discountPercentage: 15,
      price: 2400000,
      maxQuota: 25,
      locationType: "ONSITE",
      city: "Bali",
      venueAddress: "BMS Wellness Sanctuary, Canggu, Bali",
      virtualFallbackAvailable: true,
      startDate: futureStart3,
      endDate: futureEnd3,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline3,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Coach Marcus Thorne",
      coachTitle: "High Performance & Cold Immersion Specialist",
      recommendedFor: "Athletes, Biohackers & Peak Endurance",
    },
    create: {
      title: "30-Day Primal Movement & Cold Thermogenesis",
      slug: "30-day-primal-movement-cold-thermogenesis",
      description: "Elevate mitochondrial density and dopamine resilience through controlled cold exposure, breathwork, and primal mobility flows.",
      coverImage: "/coach3.jpg",
      durationDays: 30,
      actualPrice: 2800000,
      discountPercentage: 15,
      price: 2400000,
      maxQuota: 25,
      locationType: "ONSITE",
      city: "Bali",
      venueAddress: "BMS Wellness Sanctuary, Canggu, Bali",
      virtualFallbackAvailable: true,
      startDate: futureStart3,
      endDate: futureEnd3,
      registrationOpenDate: regOpenPast,
      registrationDeadline: futureDeadline3,
      status: "PUBLISH",
      isPublished: true,
      coachName: "Coach Marcus Thorne",
      coachTitle: "High Performance & Cold Immersion Specialist",
      recommendedFor: "Athletes, Biohackers & Peak Endurance",
    },
  });

  console.log("✅ 3 Open Registration programs verified in catalog:");
  console.log(`   - ${p4.title} (ID: ${p4.id})`);
  console.log(`   - ${p5.title} (ID: ${p5.id})`);
  console.log(`   - ${p6.title} (ID: ${p6.id})`);

  console.log("\n🎉 All requested user data and program fixtures seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
