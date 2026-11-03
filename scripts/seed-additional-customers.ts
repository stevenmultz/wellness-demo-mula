import bcrypt from "bcryptjs";
import { prisma } from "../src/wellness/db";

async function main() {
  console.log("🌱 Adding additional realistic customers to database...");

  const defaultPassword = await bcrypt.hash("UserBudi123!", 12);

  const additionalCustomers = [
    {
      fullName: "Reza Pratama",
      email: "reza.pratama@wellness.test",
      phone: "+6281298761001",
      age: 29,
      cover: "/coach.jpg",
      weightKg: 74,
      heightCm: 180,
      mood: "Focused & Energized",
    },
    {
      fullName: "Nadia Safitri",
      email: "nadia.safitri@wellness.test",
      phone: "+6281312345602",
      age: 25,
      cover: "/coach2.jpg",
      weightKg: 52,
      heightCm: 162,
      mood: "Balanced & Calm",
    },
    {
      fullName: "Dimas Anggara",
      email: "dimas.anggara@wellness.test",
      phone: "+6281723456703",
      age: 34,
      cover: "/coach3.jpg",
      weightKg: 78,
      heightCm: 176,
      mood: "High Stamina",
    },
    {
      fullName: "Maya Indah",
      email: "maya.indah@wellness.test",
      phone: "+6281834567804",
      age: 27,
      cover: "/pic.jpg",
      weightKg: 55,
      heightCm: 165,
      mood: "Relaxed & Restored",
    },
    {
      fullName: "Ari Wibowo",
      email: "ari.wibowo@wellness.test",
      phone: "+6281945678905",
      age: 38,
      cover: "/test.jpg",
      weightKg: 82,
      heightCm: 179,
      mood: "Steady & Consistent",
    },
    {
      fullName: "Gita Gutawa",
      email: "gita.gutawa@wellness.test",
      phone: "+6282156789006",
      age: 24,
      cover: "/image.jpg",
      weightKg: 49,
      heightCm: 160,
      mood: "Optimistic & Joyful",
    },
    {
      fullName: "Kevin Sanjaya",
      email: "kevin.sanjaya@wellness.test",
      phone: "+6282267890107",
      age: 28,
      cover: "/coach.jpg",
      weightKg: 70,
      heightCm: 173,
      mood: "Agile & Motivated",
    },
    {
      fullName: "Rina Nose",
      email: "rina.nose@wellness.test",
      phone: "+6282378901208",
      age: 33,
      cover: "/coach2.jpg",
      weightKg: 56,
      heightCm: 163,
      mood: "Grounded & Light",
    },
    {
      fullName: "Fajar Alfian",
      email: "fajar.alfian@wellness.test",
      phone: "+6285289012309",
      age: 30,
      cover: "/coach3.jpg",
      weightKg: 73,
      heightCm: 177,
      mood: "Resilient & Driven",
    },
    {
      fullName: "Amanda Manopo",
      email: "amanda.manopo@wellness.test",
      phone: "+6285390123410",
      age: 26,
      cover: "/pic.jpg",
      weightKg: 53,
      heightCm: 166,
      mood: "Vibrant & Mindful",
    },
    {
      fullName: "Rizky Febian",
      email: "rizky.febian@wellness.test",
      phone: "+6285601234511",
      age: 27,
      cover: "/test.jpg",
      weightKg: 69,
      heightCm: 175,
      mood: "Harmonious & Fresh",
    },
    {
      fullName: "Chelsea Islan",
      email: "chelsea.islan@wellness.test",
      phone: "+6285712345612",
      age: 29,
      cover: "/image.jpg",
      weightKg: 54,
      heightCm: 167,
      mood: "Peaceful & Strong",
    },
  ];

  // Also get programs to enroll some users
  const programs = await prisma.program.findMany({ take: 3 });

  for (let i = 0; i < additionalCustomers.length; i++) {
    const cust = additionalCustomers[i];
    const created = await prisma.user.upsert({
      where: { email: cust.email },
      create: {
        fullName: cust.fullName,
        email: cust.email,
        phone: cust.phone,
        age: cust.age,
        passwordHash: defaultPassword,
        role: "USER",
        status: "ACTIVE",
        tokenVersion: 0,
        createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 24), // staggered joined dates
        healthProfile: {
          create: {
            photoFrontUrl: cust.cover,
            photoSideUrl: "/coach2.jpg",
            photoBackUrl: "/coach3.jpg",
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
      update: {
        fullName: cust.fullName,
        phone: cust.phone,
        age: cust.age,
      },
    });

    // Optionally enroll in a program
    if (programs.length > 0 && i % 2 === 0) {
      const prog = programs[i % programs.length];
      await prisma.programEnrollment.upsert({
        where: {
          userId_programId: {
            userId: created.id,
            programId: prog.id,
          },
        },
        create: {
          userId: created.id,
          programId: prog.id,
          status: "ACTIVE",
          paidAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 12),
          createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 12),
        },
        update: {},
      });
    }
  }

  const totalUsers = await prisma.user.count();
  const superadminCount = await prisma.user.count({ where: { role: "SUPERADMIN" } });
  const customerCount = await prisma.user.count({ where: { role: "USER" } });

  console.log(`✅ Customer population complete!`);
  console.log(`   Total Users: ${totalUsers}`);
  console.log(`   Superadmin Count: ${superadminCount} (Strictly 1 Superadmin)`);
  console.log(`   Customer (USER) Count: ${customerCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
