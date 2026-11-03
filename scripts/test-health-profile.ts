import { prisma } from "../src/wellness/db";

async function main() {
  console.log("🧪 Testing Customer Health & Lifestyle Baseline Profile...");

  // 1. Find a test user or the first user
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error("No user found in database to test.");
  }

  console.log(`👤 Using user: ${user.fullName} (${user.email})`);

  // 2. Upsert customer health profile
  const upserted = await prisma.customerHealthProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      photoFrontUrl: "/uploads/workouts/sample-front.jpg",
      photoSideUrl: "/uploads/workouts/sample-side.jpg",
      photoBackUrl: "/uploads/workouts/sample-back.jpg",
      weightKg: 68.5,
      heightCm: 175.0,
      waistCm: 79.0,
      chestCm: 94.0,
      hipsCm: 97.0,
      currentMood: "Focused & Driven",
      energyLevel: 8,
      routineConfidence: 4,
      workoutFrequency: "3 - 4 days / week",
      averageBedtime: "22:30",
      averageWakeTime: "06:30",
      sleepQualityNotes: "7.5h deep sleep, waking refreshed",
      eatingPatterns: "Intermittent Fasting 16:8, Whole Foods, High Protein",
    },
    update: {
      photoFrontUrl: "/uploads/workouts/sample-front.jpg",
      photoSideUrl: "/uploads/workouts/sample-side.jpg",
      photoBackUrl: "/uploads/workouts/sample-back.jpg",
      weightKg: 68.5,
      heightCm: 175.0,
      waistCm: 79.0,
      chestCm: 94.0,
      hipsCm: 97.0,
      currentMood: "Focused & Driven",
      energyLevel: 8,
      routineConfidence: 4,
      workoutFrequency: "3 - 4 days / week",
      averageBedtime: "22:30",
      averageWakeTime: "06:30",
      sleepQualityNotes: "7.5h deep sleep, waking refreshed",
      eatingPatterns: "Intermittent Fasting 16:8, Whole Foods, High Protein",
    },
  });

  console.log("✅ Successfully saved Health Profile:", {
    id: upserted.id,
    userId: upserted.userId,
    weightKg: upserted.weightKg,
    heightCm: upserted.heightCm,
    bmi: (upserted.weightKg! / Math.pow(upserted.heightCm! / 100, 2)).toFixed(1),
    mood: upserted.currentMood,
    energy: upserted.energyLevel,
    confidence: upserted.routineConfidence,
    frequency: upserted.workoutFrequency,
    photos: {
      front: upserted.photoFrontUrl,
      side: upserted.photoSideUrl,
      back: upserted.photoBackUrl,
    },
  });

  // 3. Query user through the relation to verify eager loading
  const fetchedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      healthProfile: true,
    },
  });

  if (!fetchedUser?.healthProfile) {
    throw new Error("Health profile relation query failed!");
  }

  console.log("✅ User with Health Profile relation verified successfully!");
  console.log("🎉 All Health Profile integration checks passed 100%!");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
