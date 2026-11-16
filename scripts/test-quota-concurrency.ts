/**
 * Concurrency test for the cohort-quota row lock (lockProgramRow).
 *
 * Requires a DISPOSABLE PostgreSQL database with the schema applied (`prisma db push`):
 *   $env:TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/wellness_test"
 *   npx tsx scripts/test-quota-concurrency.ts
 *
 * Refuses to run unless the database name contains "test". Creates and removes its own rows.
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { lockProgramRow } from "../src/wellness/db";

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.log("SKIPPED: TEST_DATABASE_URL not set.");
  process.exit(0);
}
const dbName = new URL(url).pathname.replace("/", "");
if (!/test/i.test(dbName)) {
  console.error(`Refusing to run against database "${dbName}": name must contain "test".`);
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: url });
const CONTENDERS = 12;
const QUOTA = 3;

async function activateOne(programId: string, enrollmentId: string, useLock: boolean) {
  return prisma.$transaction(async (tx) => {
    if (useLock) await lockProgramRow(tx, programId);
    const active = await tx.programEnrollment.count({ where: { programId, status: "ACTIVE" } });
    if (active >= QUOTA) return false;
    // widen the race window so the unlocked variant reliably interleaves
    await new Promise((r) => setTimeout(r, 40));
    await tx.programEnrollment.update({ where: { id: enrollmentId }, data: { status: "ACTIVE", paidAt: new Date() } });
    return true;
  }, { timeout: 20_000, maxWait: 20_000 });
}

async function scenario(useLock: boolean): Promise<number> {
  const tag = `qc-${Date.now()}-${useLock ? "lock" : "nolock"}`;
  const program = await prisma.program.create({
    data: { title: tag, slug: tag, description: "concurrency test", maxQuota: QUOTA },
  });
  const users = await Promise.all(
    Array.from({ length: CONTENDERS }, (_, i) =>
      prisma.user.create({ data: { email: `${tag}-${i}@test.invalid`, passwordHash: "x", fullName: `QC ${i}` } })
    )
  );
  try {
    const enrollments = await Promise.all(
      users.map((u) => prisma.programEnrollment.create({ data: { userId: u.id, programId: program.id, status: "PENDING" } }))
    );
    await Promise.allSettled(enrollments.map((e) => activateOne(program.id, e.id, useLock)));
    return prisma.programEnrollment.count({ where: { programId: program.id, status: "ACTIVE" } });
  } finally {
    await prisma.program.delete({ where: { id: program.id } }); // cascades enrollments
    await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
}

async function main() {
  const unlocked = await scenario(false);
  console.log(`Without lock: ${unlocked} ACTIVE for quota ${QUOTA} (race demonstration, informational)`);
  const locked = await scenario(true);
  assert.equal(locked, QUOTA, `With lock expected exactly ${QUOTA} ACTIVE, got ${locked}`);
  console.log(`[PASS] With lock: exactly ${locked}/${QUOTA} ACTIVE under ${CONTENDERS} concurrent activations`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
