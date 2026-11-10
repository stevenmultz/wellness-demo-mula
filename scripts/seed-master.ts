import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding master directories...");
  const coaches = await prisma.masterCoach.createMany({
    data: [
      { name: "Coach Sarah Jenkins, CPT", title: "Senior Mobility & Pilates Specialist" },
      { name: "Dr. Marcus Vance, ND", title: "Director of Longevity Nutrition" },
      { name: "Coach Julian Thorne", title: "Neuro-Breathwork & Sleep Specialist" },
      { name: "Coach Elena Rostova", title: "Fascial Release & Posture Director" },
    ],
    skipDuplicates: true,
  });

  const categories = await prisma.masterCategory.createMany({
    data: [
      { name: "Pilates" },
      { name: "Mobility & Longevity" },
      { name: "Nutrition & Gut Health" },
      { name: "Breathwork & Sleep" },
      { name: "Strength & Conditioning" },
    ],
    skipDuplicates: true,
  });

  const audiences = await prisma.masterTargetAudience.createMany({
    data: [
      { name: "Desk Professionals & Sedentary Workers" },
      { name: "Founders & High-Performance Executives" },
      { name: "All Levels & Beginners" },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded:", { coaches, categories, audiences });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
