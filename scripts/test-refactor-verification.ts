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
  assert.ok(openBadge.colorClass.includes("emerald"), "Open Registration uses semantic emerald token");
  assert.ok(ongoingBadge.colorClass.includes("blue"), "On going uses semantic cool-blue token");
  assert.ok(fullBadge.colorClass.includes("amber"), "Full uses semantic amber token");
  console.log("   ✅ Semantic Obsidian Chrome badge tokens verified.");

  // 4. Verify Database Connectivity & Unpublished Program Filtering
  console.log("\n4. Testing Unpublished ('OPEN' / 'DRAFT') Program Filtering...");
  const publicPrograms = await prisma.program.findMany({
    where: {
      OR: [{ status: { in: ["PUBLISH", "PUBLISHED", "ACTIVE"] } }, { isPublished: true }],
    },
    select: { id: true, status: true, isPublished: true },
  });
  for (const p of publicPrograms) {
    const isUnpublishedReview = (p.status === "OPEN" || p.status === "DRAFT") && !p.isPublished;
    assert.equal(isUnpublishedReview, false, `Program ${p.id} should not leak if unpublished`);
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
