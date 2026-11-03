import { normalizeProgramStatus, resolvePublicBadge, resolveProgramStatus } from "../src/wellness/utils/timeline";
import { prisma } from "../src/wellness/db";

async function main() {
  console.log("========================================================");
  console.log("🧪 TESTING PROGRAM LIFECYCLE (5 DB STATUSES & 6 DYNAMIC BADGES)");
  console.log("========================================================");

  // 1. Test status normalization
  console.log("\n1. Testing Status Normalization...");
  const tests = [
    { in: "draft", expected: "DRAFT" },
    { in: "open", expected: "OPEN" },
    { in: "READY", expected: "OPEN" },
    { in: "publish", expected: "PUBLISH" },
    { in: "PUBLISHED", expected: "PUBLISH" },
    { in: "active", expected: "PUBLISH" },
    { in: "done", expected: "DONE" },
    { in: "FINISHED", expected: "DONE" },
    { in: "archive", expected: "ARCHIVE" },
    { in: "NOT_SHOW", expected: "ARCHIVE" },
  ];

  for (const t of tests) {
    const res = normalizeProgramStatus(t.in);
    if (res !== t.expected) {
      throw new Error(`Normalization failed for ${t.in}: got ${res}, expected ${t.expected}`);
    }
  }
  console.log("   ✅ Normalization for all 10 legacy/new variants passed!");

  // 2. Test Dynamic Badges when status === "PUBLISH"
  console.log("\n2. Testing 6 Dynamic Badges when status === 'PUBLISH'...");
  const baseNow = new Date("2026-10-30T10:00:00Z");

  // Badge 1: Coming Soon (now < regOpen)
  const badge1 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-11-05T00:00:00Z"),
    registrationDeadline: new Date("2026-11-15T00:00:00Z"),
    startDate: new Date("2026-11-20T00:00:00Z"),
    endDate: new Date("2026-12-10T00:00:00Z"),
    now: baseNow,
  });
  console.log(`   - Coming Soon condition -> ${badge1}`);
  if (badge1 !== "Coming Soon") throw new Error("Expected Coming Soon");

  // Badge 2: Open Registration (regOpen <= now <= regDeadline && enrolled < quota)
  const badge2 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-10-25T00:00:00Z"),
    registrationDeadline: new Date("2026-11-05T00:00:00Z"),
    startDate: new Date("2026-11-10T00:00:00Z"),
    endDate: new Date("2026-12-01T00:00:00Z"),
    maxQuota: 25,
    enrolledCount: 10,
    now: baseNow,
  });
  console.log(`   - Open Registration condition -> ${badge2}`);
  if (badge2 !== "Open Registration") throw new Error("Expected Open Registration");

  // Badge 3: Full (enrolled >= quota && now <= regDeadline)
  const badge3 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-10-25T00:00:00Z"),
    registrationDeadline: new Date("2026-11-05T00:00:00Z"),
    startDate: new Date("2026-11-10T00:00:00Z"),
    endDate: new Date("2026-12-01T00:00:00Z"),
    maxQuota: 20,
    enrolledCount: 20,
    now: baseNow,
  });
  console.log(`   - Full (Sold Out) condition -> ${badge3}`);
  if (badge3 !== "Full") throw new Error("Expected Full");

  // Badge 4: Close Registration (regDeadline < now < startDate)
  const badge4 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-10-15T00:00:00Z"),
    registrationDeadline: new Date("2026-10-28T00:00:00Z"),
    startDate: new Date("2026-11-02T00:00:00Z"),
    endDate: new Date("2026-11-23T00:00:00Z"),
    maxQuota: 30,
    enrolledCount: 15,
    now: baseNow,
  });
  console.log(`   - Close Registration condition -> ${badge4}`);
  if (badge4 !== "Close Registration") throw new Error("Expected Close Registration");

  // Badge 5: On going (startDate <= now <= endDate)
  const badge5 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-10-10T00:00:00Z"),
    registrationDeadline: new Date("2026-10-20T00:00:00Z"),
    startDate: new Date("2026-10-25T00:00:00Z"),
    endDate: new Date("2026-11-15T00:00:00Z"),
    maxQuota: 35,
    enrolledCount: 20,
    now: baseNow,
  });
  console.log(`   - On going condition -> ${badge5}`);
  if (badge5 !== "On going") throw new Error("Expected On going");

  // Badge 6: End (now > endDate)
  const badge6 = resolvePublicBadge({
    status: "PUBLISH",
    registrationOpenDate: new Date("2026-09-01T00:00:00Z"),
    registrationDeadline: new Date("2026-09-10T00:00:00Z"),
    startDate: new Date("2026-09-15T00:00:00Z"),
    endDate: new Date("2026-10-06T00:00:00Z"),
    maxQuota: 35,
    enrolledCount: 35,
    now: baseNow,
  });
  console.log(`   - End condition -> ${badge6}`);
  if (badge6 !== "End") throw new Error("Expected End");

  // 3. Test Seeded Programs in Database
  console.log("\n3. Testing Database Seeded Program Query Resolution...");
  const programs = await prisma.program.findMany({
    include: {
      _count: {
        select: { enrollments: { where: { status: "ACTIVE" } }, days: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`   Found ${programs.length} programs in database:`);
  for (const p of programs) {
    const res = resolveProgramStatus({
      status: p.status,
      isPublished: p.isPublished,
      registrationOpenDate: p.registrationOpenDate,
      registrationDeadline: p.registrationDeadline,
      startDate: p.startDate,
      endDate: p.endDate,
      maxQuota: p.maxQuota,
      enrolledCount: p._count.enrollments,
    });
    console.log(`   - [DB: ${res.dbStatus}] [Public: ${res.publicBadge || "N/A"}] "${p.title}" (Days: ${p._count.days}, Active Members: ${p._count.enrollments})`);
  }

  console.log("\n========================================================");
  console.log("🎉 ALL PROGRAM LIFECYCLE & DYNAMIC BADGE TESTS PASSED 100%!");
  console.log("========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
