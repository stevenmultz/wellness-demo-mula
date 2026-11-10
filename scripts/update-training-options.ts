import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating training days with multi-choice workout options and distinct checklists...");
  const trainingDays = await prisma.programDay.findMany({
    where: { dayType: "TRAINING_DAY" },
  });

  console.log(`Found ${trainingDays.length} training days.`);

  for (const td of trainingDays) {
    const options = [
      "Option A: Kinetic Pilates & Mat",
      "Option B: Deep Fascial Mobility",
      "Option C: Core & Postural Power",
    ];

    const checklist = [
      "[Option A: Kinetic Pilates & Mat] Hundred Prep Flow = 15 reps",
      "[Option A: Kinetic Pilates & Mat] Single Leg Stretch Sequence = 12 reps",
      "[Option A: Kinetic Pilates & Mat] Scapular Alignment Wall Slide = 10 reps",
      "[Option B: Deep Fascial Mobility] Thoracic Spine Wave = 12 reps",
      "[Option B: Deep Fascial Mobility] 90/90 Hip Capsule Release = 10 reps",
      "[Option B: Deep Fascial Mobility] Psoas Decompression Hold = 45 secs",
      "[Option C: Core & Postural Power] Deadbug Contralateral Control = 12 reps",
      "[Option C: Core & Postural Power] Bird Dog Isometric Alignment = 10 reps",
      "[Option C: Core & Postural Power] Low Plank Tension Hold = 45 secs",
    ];

    await prisma.programDay.update({
      where: { id: td.id },
      data: {
        workoutOptions: JSON.stringify(options),
        videoChecklist: JSON.stringify(checklist),
      },
    });
  }

  console.log("All training days updated successfully with 3 distinct workout choices and separate checklists!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
