import { calculateSleepDuration } from "../src/wellness/utils/timezone";
import { isProgramDayComplete } from "../src/wellness/validators/program";
import { prisma } from "../src/wellness/db";

async function runFeatureTests() {
  console.log("\n========================================================");
  console.log("🧪 TESTING FITUR BARU: SLEEP, WORKOUT, MEAL, DIARY & DAY TYPES");
  console.log("========================================================\n");

  // 1. Test Sleep Duration Across Midnight
  console.log("1. Menguji Formula Kalkulasi Durasi Tidur Lintas Tengah Malam...");
  const sleep1 = calculateSleepDuration("23:00", "06:30");
  console.log("   - Tidur 23:00, Bangun 06:30 ->", sleep1?.formatted, `(${sleep1?.totalMinutes} menit)`);
  if (!sleep1 || sleep1.totalMinutes !== 450 || sleep1.formatted !== "7h 30m") {
    throw new Error("Gagal kalkulasi tidur lintas tengah malam!");
  }

  const sleep2 = calculateSleepDuration("00:45", "08:15");
  console.log("   - Tidur 00:45, Bangun 08:15 ->", sleep2?.formatted, `(${sleep2?.totalMinutes} menit)`);
  if (!sleep2 || sleep2.totalMinutes !== 450 || sleep2.formatted !== "7h 30m") {
    throw new Error("Gagal kalkulasi tidur dini hari!");
  }
  console.log("   ✅ Kalkulasi jam tidur lintas malam 100% akurat!");

  // 2. Test 3 Kategori Hari Validasi
  console.log("\n2. Menguji Kelengkapan 3 Kategori Hari (isProgramDayComplete)...");
  const trainingComplete = isProgramDayComplete({
    title: "Day 1 Training",
    dayType: "TRAINING_DAY",
    videoUrl: "https://youtube.com/watch?v=xxx",
    videoChecklist: ["Task 1"],
  });
  const restComplete = isProgramDayComplete({
    title: "Day 2 Rest",
    dayType: "REST_DAY",
    restInstructions: "Rest and recover properly",
  });
  const connectionComplete = isProgramDayComplete({
    title: "Day 3 Connection",
    dayType: "CONNECTION_DAY",
    meetupLink: "https://meet.google.com/xyz",
  });

  console.log("   - Training Day Lengkap:", trainingComplete);
  console.log("   - Rest Day Lengkap:", restComplete);
  console.log("   - Connection Day Lengkap:", connectionComplete);
  if (!trainingComplete || !restComplete || !connectionComplete) {
    throw new Error("Gagal validasi 3 kategori hari!");
  }
  console.log("   ✅ Validasi 3 kategori hari 100% akurat!");

  // 3. Test Database Field Persistence
  console.log("\n3. Menguji Penyimpanan Progres Baru ke Database SQLite...");
  const user = await prisma.user.findFirst({ where: { role: "USER" } });
  const program = await prisma.program.findFirst({ include: { days: true } });
  if (!user || !program || program.days.length === 0) {
    throw new Error("User atau Program tidak ditemukan di database!");
  }

  const day = program.days[0];
  const testProgress = await prisma.programDayProgress.upsert({
    where: {
      userId_programDayId: {
        userId: user.id,
        programDayId: day.id,
      },
    },
    update: {
      selectedWorkout: "Hot Pilates",
      photoBeforeUrl: "/test.jpg",
      photoAfterUrl: "/pic.jpg",
      mealCompliance: "FULL",
      mealNotes: "Salad quinoa dan salmon kukus",
      dailyReflection: "Dear Diary: Hari ini energi saya meningkat drastis setelah hot pilates.",
      happinessRate: 5,
      bedtime: "22:45",
      wakeTime: "06:30",
      sleepDurationMinutes: 465,
    },
    create: {
      userId: user.id,
      programDayId: day.id,
      selectedWorkout: "Hot Pilates",
      photoBeforeUrl: "/test.jpg",
      photoAfterUrl: "/pic.jpg",
      mealCompliance: "FULL",
      mealNotes: "Salad quinoa dan salmon kukus",
      dailyReflection: "Dear Diary: Hari ini energi saya meningkat drastis setelah hot pilates.",
      happinessRate: 5,
      bedtime: "22:45",
      wakeTime: "06:30",
      sleepDurationMinutes: 465,
    },
  });

  console.log("   - Progres tersimpan ID:", testProgress.id);
  console.log("   - Workout:", testProgress.selectedWorkout);
  console.log("   - Meal Compliance:", testProgress.mealCompliance);
  console.log("   - Happiness Rate:", testProgress.happinessRate, "/ 5");
  console.log("   - Sleep Log:", testProgress.bedtime, "s/d", testProgress.wakeTime, `(${testProgress.sleepDurationMinutes} mins)`);
  console.log("   - Dear Diary:", testProgress.dailyReflection?.slice(0, 35) + "...");

  if (
    testProgress.selectedWorkout !== "Hot Pilates" ||
    testProgress.mealCompliance !== "FULL" ||
    testProgress.happinessRate !== 5 ||
    testProgress.sleepDurationMinutes !== 465
  ) {
    throw new Error("Gagal validasi persistensi data progres!");
  }

  console.log("   ✅ Seluruh field baru tersimpan dan tervalidasi dengan sempurna!");

  console.log("\n========================================================");
  console.log("🎉 SELURUH PENGUJIAN FITUR BARU 100% SUKSES!");
  console.log("========================================================\n");
}

runFeatureTests().catch((err) => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
