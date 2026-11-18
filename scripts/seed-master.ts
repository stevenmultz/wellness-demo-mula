import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding master directories...");
  const coachSeed = [
    { name: "Coach Sarah Jenkins, CPT", title: "Senior Mobility & Pilates Specialist" },
    { name: "Dr. Marcus Vance, ND", title: "Director of Longevity Nutrition" },
    { name: "Coach Julian Thorne", title: "Neuro-Breathwork & Sleep Specialist" },
    { name: "Coach Elena Rostova", title: "Fascial Release & Posture Director" },
  ];
  for (const c of coachSeed) {
    const existing = await prisma.masterCoach.findFirst({ where: { name: c.name } });
    if (existing) {
      await prisma.masterCoach.update({ where: { id: existing.id }, data: { title: c.title } });
    } else {
      await prisma.masterCoach.create({ data: c });
    }
  }

  const categorySeed = [
    { name: "Pilates" },
    { name: "Volleyball" },
    { name: "Mobility & Longevity" },
    { name: "Nutrition & Gut Health" },
    { name: "Breathwork & Sleep" },
    { name: "Strength & Conditioning" },
  ];
  for (const cat of categorySeed) {
    await prisma.masterCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log("Seeded master directories successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
