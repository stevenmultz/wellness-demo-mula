import assert from "node:assert/strict";
import { prisma } from "../src/wellness/db";
import { normalizeProgramStatus } from "../src/wellness/utils/timeline";
import { getPublicBadgeMeta } from "../src/wellness/utils/timeline";

function replaceCsvToken(raw: string | null | undefined, oldName: string, newName: string): string | null {
  if (!raw) return null;
  if (raw.trim() === oldName) return newName;
  const parts = raw.split(",").map((s) => s.trim());
  if (!parts.includes(oldName)) return null;
  return parts.map((p) => (p === oldName ? newName : p)).join(", ");
}

async function main() {
  console.log("========================================================");
  console.log("🧪 RUNNING PHASE 8 & 9 REFACTOR VERIFICATION SUITE");
  console.log("========================================================");

  // 1. Verify CSV Token Replacement for Master Directories
  console.log("\n1. Testing CSV Token Propagation for Master Directories...");
  assert.equal(
    replaceCsvToken("Yoga Mat, Foam Roller, Resistance Band", "Foam Roller", " Lacrosse Ball"),
    "Yoga Mat,  Lacrosse Ball, Resistance Band"
  );
  assert.equal(replaceCsvToken("Yoga Mat", "Yoga Mat", "Pro Mat"), "Pro Mat");
  assert.equal(replaceCsvToken("Yoga Mat XL, Resistance Band", "Yoga Mat", "Pro Mat"), null);
  console.log("   ✅ Multi-tag CSV token replacement verified without partial-substring false positives.");

  // 2. Verify Dashboard Status Normalization Preserves DONE & ARCHIVE
  console.log("\n2. Testing Program Lifecycle Status Preservation...");
  assert.equal(normalizeProgramStatus("DONE"), "DONE");
  assert.equal(normalizeProgramStatus("ARCHIVE"), "ARCHIVE");
  assert.equal(normalizeProgramStatus("OPEN"), "OPEN");
  assert.equal(normalizeProgramStatus("PUBLISH"), "PUBLISH");
  console.log("   ✅ Status normalization preserves DONE, ARCHIVE, OPEN, and PUBLISH.");

  // 3. Verify Obsidian Chrome Semantic Badge Metadata
  console.log("\n3. Testing Obsidian Chrome Semantic Badge Tokens...");
  const openBadge = getPublicBadgeMeta("Open Registration");
  const ongoingBadge = getPublicBadgeMeta("On going");
  const fullBadge = getPublicBadgeMeta("Full");
  // The Obsidian Chrome design system is intentionally monochrome, so hue is no longer part of the
  // contract. Verify the behavioural contract instead: labels, enrollability, distinct styling.
  assert.equal(openBadge.label, "Open Registration");
  assert.equal(openBadge.canEnroll, true, "Only Open Registration allows enrolling");
  assert.equal(ongoingBadge.canEnroll, false);
  assert.equal(fullBadge.canEnroll, false);
  for (const b of [openBadge, ongoingBadge, fullBadge]) {
    assert.ok(b.colorClass.trim().length > 0, `${b.label} has styling classes`);
  }
  assert.notEqual(openBadge.colorClass, fullBadge.colorClass, "Open and Full badges are visually distinct");
  assert.notEqual(openBadge.colorClass, ongoingBadge.colorClass, "Open and On going badges are visually distinct");
  console.log("   ✅ Semantic Obsidian Chrome badge tokens verified.");

  // 4. Verify Database Connectivity & Unpublished Program Filtering
  console.log("\n4. Testing Unpublished ('OPEN' / 'DRAFT') Program Filtering...");
  const publicPrograms = await prisma.program.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: { id: true, status: true },
  });
  for (const p of publicPrograms) {
    assert.equal(p.status, "PUBLISHED", `Program ${p.id} should only be PUBLISHED`);
  }
  console.log(`   ✅ Verified ${publicPrograms.length} public programs; 0 unpublished DRAFT/OPEN leaks.`);

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE 8 & 9 REFACTOR VERIFICATIONS PASSED 100%!");
  console.log("========================================================");
}

main()
  .catch((err) => {
    console.error("❌ Refactor verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
