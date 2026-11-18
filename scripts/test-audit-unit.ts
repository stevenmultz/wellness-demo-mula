import assert from "assert";
import crypto from "crypto";
import { safeHttpUrl, safeMediaUrl, isSafePhotoUrl } from "../src/wellness/utils/url-safety";
import { escapeHtml } from "../src/wellness/integrations/email-service";
import { extractYouTubeId, normalizeVideoEmbed } from "../src/wellness/integrations/video-provider";
import { AdminUpdateCustomerProfileSchema, calculateAgeFromDob } from "../src/wellness/validators/auth";
import { verifyMidtransWebhookSignature } from "../src/wellness/integrations/payment-gateway";
import { formatStorageUri, parseStorageUri } from "../src/wellness/integrations/supabase-storage";
import {
  CreateProgramSchema,
  CustomTaskFieldInputSchema,
  isProgramHeaderComplete,
  ProgramDayInputSchema,
  SubmitDayProgressSchema,
  UpdateProgramMetaSchema,
} from "../src/wellness/validators/program";
import { sanitizeCustomTaskSubmission } from "../src/wellness/utils/custom-tasks";
import { getProgramDayWibWindow, calculateSleepDuration } from "../src/wellness/utils/timezone";
import { resolvePublicBadge } from "../src/wellness/utils/timeline";
import { evaluateFreeIntroRequirement } from "../src/wellness/security/program-rules";
import { resolveProgramDailyPlan } from "../src/wellness/utils/daily-tasks";
import {
  FORMAT_OPTIONS,
  intensityOf,
  scheduleOf,
  splitCoachTokens,
  type ExploreProgram,
} from "../src/components/dashboard/tabs/explore/exploreFilters";
import { BRAND, buildConciergeWhatsAppUrl } from "../src/wellness/brand";
import {
  SESSION_COOKIE_NAME,
  MAX_UPLOAD_BYTES,
  MAX_AVATAR_BYTES,
  getAppUrl,
  getPaymentProvider,
} from "../src/wellness/config";

async function runAuditUnitTests() {
  console.log("=== AUDIT REMEDIATION & PURE LOGIC UNIT TESTS ===\n");

  // 1. URL Safety Checks (XSS / Protocol Restriction)
  assert.strictEqual(safeHttpUrl("https://example.com/meet"), "https://example.com/meet");
  assert.strictEqual(safeHttpUrl("http://localhost:3000/test"), "http://localhost:3000/test");
  assert.strictEqual(safeHttpUrl("javascript:alert(1)"), null);
  assert.strictEqual(safeHttpUrl("  JaVaScRiPt:alert(document.cookie) "), null);
  assert.strictEqual(safeHttpUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.strictEqual(safeHttpUrl("/relative/path"), null);

  assert.strictEqual(safeMediaUrl("/uploads/workouts/123-abc.webp"), "/uploads/workouts/123-abc.webp");
  assert.strictEqual(safeMediaUrl("/api/media/workouts/u1-before-123-abc.webp"), "/api/media/workouts/u1-before-123-abc.webp");
  assert.strictEqual(safeMediaUrl("/uploads/../etc/passwd"), null);
  assert.strictEqual(safeMediaUrl("/api/media/../etc/passwd"), null);
  assert.strictEqual(
    safeMediaUrl("data:image/png;base64,iVBORw0KGgo="),
    "data:image/png;base64,iVBORw0KGgo="
  );
  assert.strictEqual(safeMediaUrl("data:image/svg+xml;base64,PHN2Zz4="), null);
  assert.strictEqual(safeMediaUrl("javascript:alert(1)"), null);
  assert.strictEqual(safeMediaUrl("sb://avatars/user1/avatar.webp"), "sb://avatars/user1/avatar.webp");
  assert.strictEqual(safeMediaUrl("/api/media/signed?path=sb%3A%2F%2Favatars%2Fuser1%2Favatar.webp"), "/api/media/signed?path=sb%3A%2F%2Favatars%2Fuser1%2Favatar.webp");
  assert.strictEqual(isSafePhotoUrl(""), true);
  assert.strictEqual(isSafePhotoUrl(null), true);
  assert.strictEqual(isSafePhotoUrl("javascript:alert(1)"), false);
  assert.deepStrictEqual(parseStorageUri("sb://avatars/u1/file.webp"), { bucket: "avatars", objectPath: "u1/file.webp" });
  assert.strictEqual(formatStorageUri("workout-media", "u1/day1/pic.webp"), "sb://workout-media/u1/day1/pic.webp");
  console.log("  [PASS] 1. URL & Supabase storage URI helpers enforce safety and traversal guards");

  // 2. Video Provider Hostname & Protocol Hardening
  assert.strictEqual(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.strictEqual(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.strictEqual(extractYouTubeId("https://www.youtube.com/watch?v=../../evil"), null);
  assert.strictEqual(extractYouTubeId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.strictEqual(extractYouTubeId("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ"), null);
  assert.strictEqual(
    escapeHtml('<img src=x onerror="alert(1)">'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
  );

  const badVideo = normalizeVideoEmbed("javascript:alert(1)");
  assert.strictEqual(badVideo.provider, "UNKNOWN");
  assert.strictEqual(badVideo.embedUrl, null);

  const spoofStream = normalizeVideoEmbed("https://evil-cloudflarestream.com/abc");
  assert.strictEqual(spoofStream.provider, "DIRECT");

  const validStream = normalizeVideoEmbed("https://customer-123.cloudflarestream.com/abc/iframe");
  assert.strictEqual(validStream.provider, "CLOUDFLARE_STREAM");
  console.log("  [PASS] 2. Video provider rejects spoofed hostnames and javascript: URLs");

  // 3. Zod Validators + Computed Age + Midtrans SHA512 Webhook Signature
  const invalidProgress = SubmitDayProgressSchema.safeParse({
    programDayId: "day-1",
    isCompleted: true,
    happinessRate: 99,
  });
  assert.strictEqual(invalidProgress.success, false);

  const validProgress = SubmitDayProgressSchema.safeParse({
    programDayId: "day-1",
    isCompleted: true,
    checklistCompleted: ["[Hot Pilates] Roll-ups"],
  });
  assert.strictEqual(validProgress.success, true);

  assert.strictEqual(calculateAgeFromDob(new Date("1995-01-01T00:00:00Z"))! >= 30, true);

  const testServerKey = "SB-Mid-server-TESTKEY";
  const expectedSig = crypto
    .createHash("sha512")
    .update(`QRIS-ORDER-1200250000.00${testServerKey}`)
    .digest("hex");
  assert.strictEqual(
    verifyMidtransWebhookSignature({
      orderId: "QRIS-ORDER-1",
      statusCode: "200",
      grossAmount: "250000.00",
      serverKey: testServerKey,
      signatureKey: expectedSig,
    }),
    true
  );
  assert.strictEqual(
    verifyMidtransWebhookSignature({
      orderId: "QRIS-ORDER-1",
      statusCode: "200",
      grossAmount: "1000.00",
      serverKey: testServerKey,
      signatureKey: expectedSig,
    }),
    false
  );
  console.log("  [PASS] 3. Progress schema, derived DOB age, and Midtrans SHA512 webhook verification pass");

  // 4. WIB Timezone & Sleep Calculation
  const day1 = getProgramDayWibWindow("2026-06-01T00:00:00.000Z", 1, new Date("2026-06-01T00:00:00.000Z"));
  assert.strictEqual(day1.isCalendarUnlocked, true);
  assert.strictEqual(day1.isPast2359, false);

  const sleep = calculateSleepDuration("23:00", "06:30");
  assert.ok(sleep);
  assert.strictEqual(sleep?.totalMinutes, 450);
  console.log("  [PASS] 4. WIB timezone window and cross-midnight sleep calculation verified");

  // 5. Admin Customer Profile Update Schema
  const invalidAdminProfile = AdminUpdateCustomerProfileSchema.safeParse({
    userId: "",
    phone: "1",
  });
  assert.strictEqual(invalidAdminProfile.success, false);

  const validAdminProfile = AdminUpdateCustomerProfileSchema.safeParse({
    userId: "user_123",
    city: "Jakarta",
    gender: "Female",
    dateOfBirth: "1994-05-12",
  });
  assert.strictEqual(validAdminProfile.success, true);
  console.log("  [PASS] 5. AdminUpdateCustomerProfileSchema rejects invalid ranges and accepts valid payloads");

  // 6. Program & Custom Task Schema Hardening (URL safety, prototype keys, bounds)
  assert.strictEqual(
    CreateProgramSchema.safeParse({
      title: "Test Cohort",
      coverImage: "javascript:alert(1)",
    }).success,
    false
  );
  assert.strictEqual(
    CreateProgramSchema.safeParse({
      title: "Test Cohort",
      communityLink: "javascript:alert(1)",
    }).success,
    false
  );
  assert.strictEqual(
    ProgramDayInputSchema.safeParse({
      dayNumber: 1,
      title: "Day 1",
      dayType: "TRAINING_DAY",
      videoUrl: "javascript:alert(1)",
      meetupLink: "https://meet.google.com/abc",
    }).success,
    false
  );
  assert.strictEqual(
    CustomTaskFieldInputSchema.safeParse({
      key: "__proto__",
      label: "Proto",
      type: "text",
    }).success,
    false
  );
  assert.strictEqual(
    SubmitDayProgressSchema.safeParse({
      programDayId: "day-1",
      isCompleted: true,
      sleepDurationMinutes: 2000,
    }).success,
    false
  );

  // 7. Custom Task Submission Field Sanitization
  const badPhotoTask = sanitizeCustomTaskSubmission(
    [{ key: "photoUrl", label: "Photo", type: "photo", required: true }],
    { photoUrl: "javascript:alert(1)" }
  );
  assert.strictEqual(badPhotoTask.ok, false);

  const outOfRangeNum = sanitizeCustomTaskSubmission(
    [{ key: "weightKg", label: "Weight", type: "number", min: 20, max: 300, required: true }],
    { weightKg: 999 }
  );
  assert.strictEqual(outOfRangeNum.ok, false);

  const validCustom = sanitizeCustomTaskSubmission(
    [
      { key: "weightKg", label: "Weight", type: "number", min: 20, max: 300, required: true },
      { key: "photoUrl", label: "Photo", type: "photo", required: false },
    ],
    { weightKg: "65.5", photoUrl: "/api/media/workouts/u1-custom-1-ab.webp", __proto__: { admin: true } }
  );
  assert.strictEqual(validCustom.ok, true);
  if (validCustom.ok) {
    assert.strictEqual(validCustom.values.weightKg, 65.5);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(validCustom.values, "__proto__"), false);
  }
  console.log("  [PASS] 6. Program & custom task validators + sanitization enforce bounds, URL safety, and prototype safety");

  // 8. Centralized Config & Brand URL Helpers
  assert.strictEqual(SESSION_COOKIE_NAME, "wellness_session");
  assert.ok(MAX_UPLOAD_BYTES > MAX_AVATAR_BYTES);
  assert.ok(getAppUrl().startsWith("http"));
  assert.ok(["INTERNAL_SIMULATION", "MIDTRANS", "XENDIT"].includes(getPaymentProvider()));
  const waHref = buildConciergeWhatsAppUrl("Hello zera.id");
  assert.ok(waHref.startsWith(`https://wa.me/${BRAND.conciergeWhatsApp}?text=Hello%20zera.id`));
  console.log("  [PASS] 7. Centralized config and concierge WhatsApp URL helper verified");

  // 9. Hybrid & Full Online Two-Mode Rules + Intro Video URL + Explore Filters
  assert.strictEqual(
    CreateProgramSchema.safeParse({
      title: "Legacy Onsite Test",
      locationType: "ONSITE",
    }).success,
    false
  );
  assert.strictEqual(
    CreateProgramSchema.safeParse({
      title: "Bad Intro Video",
      locationType: "ONLINE",
      introVideoUrl: "javascript:alert(1)",
    }).success,
    false
  );
  assert.strictEqual(
    UpdateProgramMetaSchema.safeParse({
      programId: "prog-online-1",
      title: "Anytime Flexibility",
      description: "Full online cohort without dates",
      coachName: "Coach Julian",
      category: "Volleyball",
      locationType: "ONLINE",
      introVideoUrl: "https://www.youtube.com/watch?v=sTANio_2E0Q",
      startDate: null,
      endDate: null,
      registrationDeadline: null,
      maxQuota: 30,
      price: 150000,
    }).success,
    true
  );

  assert.strictEqual(
    CreateProgramSchema.safeParse({
      title: "Voli Core Training",
      batchNumber: 2,
      category: "Volleyball",
      locationType: "HYBRID",
    }).success,
    true
  );

  const onlineComplete = isProgramHeaderComplete({
    title: "Online Breathwork",
    description: "Anytime nervous system reset",
    difficultyLevel: "BEGINNER",
    category: "Breathwork",
    dailyCommitment: "15 mins/day",
    coachName: "Coach Julian",
    locationType: "ONLINE",
    startDate: null,
    endDate: null,
    registrationDeadline: null,
    maxQuota: 30,
    price: 0,
    communityLink: "https://chat.whatsapp.com/test",
    termsList: ["Follow safely"],
  });
  assert.strictEqual(onlineComplete.isComplete, true);

  const hybridMissingDates = isProgramHeaderComplete({
    title: "Hybrid Core",
    description: "In-studio + online hybrid",
    difficultyLevel: "INTERMEDIATE",
    category: "Pilates",
    dailyCommitment: "30 mins/day",
    coachName: "Coach Sarah",
    locationType: "HYBRID",
    startDate: null,
    endDate: null,
    registrationDeadline: null,
    city: "Jakarta",
    venueAddress: "Senopati",
    maxQuota: 20,
    price: 250000,
    communityLink: "https://chat.whatsapp.com/test",
    termsList: ["Arrive 10m early"],
  });
  assert.strictEqual(hybridMissingDates.isComplete, false);

  assert.strictEqual(
    resolvePublicBadge({ status: "PUBLISH", locationType: "ONLINE", maxQuota: 10, enrolledCount: 2 }),
    "Open Registration"
  );
  assert.strictEqual(
    resolvePublicBadge({ status: "PUBLISH", locationType: "ONLINE", maxQuota: 10, enrolledCount: 10 }),
    "Full"
  );

  const onlineDaily = resolveProgramDailyPlan(
    "prog-online-test",
    null,
    [
      {
        id: "d1",
        dayNumber: 1,
        title: "Day 1",
        dayType: "TRAINING_DAY",
        videoUrl: null,
        mealRecommendation: null,
        restInstructions: null,
        eventTitle: null,
        eventDetails: null,
        progress: {
          videoWatched: true,
          isCompleted: true,
          mealCompliance: "FULL",
          dailyReflection: "Done",
        },
      },
      {
        id: "d2",
        dayNumber: 2,
        title: "Day 2",
        dayType: "TRAINING_DAY",
        videoUrl: null,
        mealRecommendation: null,
        restInstructions: null,
        eventTitle: null,
        eventDetails: null,
        progress: null,
      },
      {
        id: "d3",
        dayNumber: 3,
        title: "Day 3",
        dayType: "REST_DAY",
        videoUrl: null,
        mealRecommendation: null,
        restInstructions: "Walk",
        eventTitle: null,
        eventDetails: null,
        progress: null,
      },
    ],
    new Date(),
    "ONLINE"
  );
  assert.strictEqual(onlineDaily.today?.dayNumber, 2);
  assert.strictEqual(onlineDaily.tomorrow?.dayNumber, 3);

  assert.deepStrictEqual(
    FORMAT_OPTIONS.map((o) => o.id),
    ["ONLINE", "HYBRID"]
  );
  assert.strictEqual(intensityOf("MODERATE"), "Moderate");
  assert.strictEqual(intensityOf("INTERMEDIATE"), "Moderate");
  assert.strictEqual(intensityOf("ADVANCED"), "High");
  assert.strictEqual(intensityOf("HIGH_INTENSITY"), "Very High");
  assert.deepStrictEqual(splitCoachTokens("Coach Sarah, Coach Julian, coach sarah"), [
    "Coach Sarah",
    "Coach Julian",
  ]);
  const sampleExplore: ExploreProgram = {
    id: "p1",
    title: "Test",
    coverImage: null,
    coachName: "Coach Julian",
    startDate: null,
    endDate: null,
    registrationDeadline: null,
    price: 0,
    durationDays: 7,
    locationType: "ONLINE",
    city: null,
    seatsLeft: 10,
    badge: "Open Registration",
    canEnroll: true,
    enrollmentStatus: null,
    difficultyLevel: "INTERMEDIATE",
    category: "Breathwork",
    dailyCommitment: "15 mins/day",
  };
  assert.strictEqual(scheduleOf(sampleExplore), "Flexible Schedule");
  assert.strictEqual(scheduleOf({ ...sampleExplore, locationType: "HYBRID" }), "Fixed Schedule");

  // Minimal header without Blueprint Section 2 or targetAudience still passes
  const minimalOnline = isProgramHeaderComplete({
    title: "Voli Core Conditioning",
    description: "Self-paced volleyball conditioning modules",
    difficultyLevel: "INTERMEDIATE",
    category: "Volleyball",
    dailyCommitment: "20 mins/day",
    coachName: "Coach Sarah",
    locationType: "ONLINE",
    maxQuota: 40,
    price: 0,
    communityLink: "https://chat.whatsapp.com/voli",
    termsList: ["Listen to your body"],
  });
  assert.strictEqual(minimalOnline.isComplete, true);

  // Community / Coach publishing no longer requires 2 free intro programs
  assert.strictEqual(
    evaluateFreeIntroRequirement({
      callerRole: "PARTNER_ADMIN",
      action: "PUBLISH",
      programPrice: 250000,
      isCurrentlyPublished: false,
      otherPublishedFreeCount: 0,
      otherPublishedPaidCount: 0,
    }).allowed,
    true
  );
  console.log("  [PASS] 8. Hybrid/Online two-mode validation, batchNumber, Sports, Community publish & Explore filters pass");

  console.log("\n=== ALL AUDIT UNIT TESTS PASSED ===");
}

runAuditUnitTests().catch((err) => {
  console.error("UNIT TEST FAILED:", err);
  process.exit(1);
});
