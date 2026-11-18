import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "../src/wellness/db";
import { getSuperadminConfig } from "../src/wellness/config";
import { verifySameOriginRequest } from "../src/wellness/security/csrf";
import { buildOAuthLinkUserUpdate } from "../src/wellness/security/oauth-linking";
import {
  isAdminRole,
  isSuperadminRole,
  sanitizeUserScopeForRole,
} from "../src/wellness/security/roles";
import {
  buildProgramScopeWhere,
  matchesCoachNameToken,
  requireAuth,
  requireSuperadmin,
} from "../src/wellness/security/guards";
import {
  createSessionToken,
  verifySessionToken,
} from "../src/wellness/security/session";
import {
  AdminUpdateCustomerProfileSchema,
  SignUpSchema,
  UpdateProfileSchema,
} from "../src/wellness/validators/auth";
import {
  wellnessConfirmPasswordReset,
  wellnessRequestPasswordReset,
  wellnessSignIn,
  wellnessSignUp,
  wellnessVerifyEmailToken,
} from "../src/wellness/actions/auth";
import {
  wellnessUpdateProfile,
} from "../src/wellness/actions/account";
import {
  wellnessAdminDeleteUser,
  wellnessAdminResetUserPassword,
  wellnessAdminUpdateUserRole,
} from "../src/wellness/actions/admin";
import {
  wellnessCreateProgressShare,
} from "../src/wellness/actions/share-progress";

function makeReq(url: string, headers: Record<string, string>) {
  return new NextRequest(url, { method: "POST", headers });
}

function runPureSecurityChecks() {
  console.log("1. Testing CSRF Same-Origin Guard (F-02)...");
  assert.equal(
    verifySameOriginRequest(
      makeReq("https://app.example.com/api/profile/avatar", {
        host: "app.example.com",
        origin: "https://app.example.com",
        "sec-fetch-site": "same-origin",
      })
    ),
    true
  );
  assert.equal(
    verifySameOriginRequest(
      makeReq("https://app.example.com/api/notifications/tick", {
        host: "app.example.com",
        origin: "https://evil.example.com",
        "sec-fetch-site": "cross-site",
      })
    ),
    false
  );
  assert.equal(
    verifySameOriginRequest(
      makeReq("https://app.example.com/api/upload", {
        host: "app.example.com",
        origin: "https://sub.example.com",
        "sec-fetch-site": "same-site",
      })
    ),
    false
  );
  assert.equal(
    verifySameOriginRequest(
      makeReq("https://app.example.com/api/push/subscribe", {
        host: "app.example.com",
        referer: "https://evil.example.com/form.html",
      })
    ),
    false
  );
  assert.equal(
    verifySameOriginRequest(
      makeReq("http://internal:3000/api/profile/avatar", {
        "x-forwarded-host": "wellness.example.com",
        origin: "https://wellness.example.com",
        "sec-fetch-site": "same-origin",
      })
    ),
    true
  );

  console.log("2. Testing OAuth Pre-Hijacking CWE-287 Guard...");
  const unverifiedUpdate = buildOAuthLinkUserUpdate({ emailVerifiedAt: null });
  assert.ok(unverifiedUpdate);
  assert.equal(unverifiedUpdate.passwordHash, null);
  assert.deepEqual(unverifiedUpdate.tokenVersion, { increment: 1 });
  assert.equal(buildOAuthLinkUserUpdate({ emailVerifiedAt: new Date() }), null);

  console.log("3. Testing RBAC Hierarchy, Scope Sanitization & Fail-Closed Queries...");
  assert.equal(isAdminRole("USER"), false);
  assert.equal(isAdminRole("COACH"), true);
  assert.equal(isAdminRole("PARTNER_ADMIN"), true);
  assert.equal(isAdminRole("SUPERADMIN"), true);
  assert.equal(isSuperadminRole("PARTNER_ADMIN"), false);
  assert.equal(isSuperadminRole("SUPERADMIN"), true);

  assert.deepEqual(
    sanitizeUserScopeForRole("USER", { organizationId: "org1", coachProfileId: "coach1" }),
    { organizationId: null, coachProfileId: null }
  );
  assert.deepEqual(
    sanitizeUserScopeForRole("SUPERADMIN", { organizationId: "org1", coachProfileId: "coach1" }),
    { organizationId: null, coachProfileId: null }
  );
  assert.deepEqual(
    sanitizeUserScopeForRole("PARTNER_ADMIN", { organizationId: "org1", coachProfileId: "coach1" }),
    { organizationId: "org1", coachProfileId: null }
  );
  assert.deepEqual(buildProgramScopeWhere({ role: "PARTNER_ADMIN", organizationId: null }), {
    id: "__unassigned_scope__",
  });
  assert.deepEqual(buildProgramScopeWhere({ role: "COACH", coachProfileId: null }), {
    id: "__unassigned_scope__",
  });
  assert.deepEqual(buildProgramScopeWhere({ role: "PARTNER_ADMIN", organizationId: "org_123" }), {
    deletedAt: null,
    organizationId: "org_123",
  });
  assert.equal(matchesCoachNameToken("Ana Maria, Budi", "Ana"), false);
  assert.equal(matchesCoachNameToken("Ana, Budi", "ana"), true);

  console.log("4. Testing Profile & Signup Input Validation / Mass Assignment Protection...");
  const profileWithMassAssign = UpdateProfileSchema.safeParse({
    fullName: "Test Member",
    phone: "081234567890",
    gender: "Female",
    role: "SUPERADMIN",
    status: "SUSPENDED",
    emailVerifiedAt: "2026-01-01",
    tokenVersion: 99,
    organizationId: "org_hacked",
    emergencyContactPhone: "+62 812-3456-7890",
  });
  assert.equal(profileWithMassAssign.success, true);
  if (profileWithMassAssign.success) {
    const record = profileWithMassAssign.data as Record<string, unknown>;
    assert.equal(record.role, undefined);
    assert.equal(record.status, undefined);
    assert.equal(record.emailVerifiedAt, undefined);
    assert.equal(record.tokenVersion, undefined);
    assert.equal(record.organizationId, undefined);
  }

  assert.equal(
    UpdateProfileSchema.safeParse({
      fullName: "Test Member",
      emergencyContactPhone: "<script>alert(1)</script>",
    }).success,
    false
  );
  assert.equal(
    AdminUpdateCustomerProfileSchema.safeParse({
      userId: "user_1",
      gender: "HACKER_GENDER",
    }).success,
    false
  );
  const signUpParsed = SignUpSchema.safeParse({
    fullName: "Valid Name",
    email: "user@example.com",
    phone: "081234567890",
    password: "Password123",
    role: "SUPERADMIN",
  });
  assert.equal(signUpParsed.success, true);
  if (signUpParsed.success) {
    assert.equal((signUpParsed.data as Record<string, unknown>).role, undefined);
  }
}

async function runSessionAndFailClosedChecks() {
  console.log("5. Testing JWT Verification & Fail-Closed Server Action Guards...");
  const jwt = await createSessionToken({
    userId: "u_test",
    email: "u_test@security-qa.invalid",
    role: "USER",
    tokenVersion: 3,
  });
  const verified = await verifySessionToken(jwt);
  assert.equal(verified?.userId, "u_test");
  assert.equal(verified?.tokenVersion, 3);
  assert.equal(await verifySessionToken(`${jwt}tamper`), null);

  await assert.rejects(() => requireAuth(), /sign in/i);
  await assert.rejects(() => requireSuperadmin(), /sign in/i);
  await assert.rejects(() => wellnessUpdateProfile({ fullName: "Unauthenticated" }), /sign in/i);
  await assert.rejects(() => wellnessCreateProgressShare({ viewerEmail: "a@b.com" }), /sign in/i);
  await assert.rejects(
    () => wellnessAdminUpdateUserRole("user_1", "PARTNER_ADMIN"),
    /sign in/i
  );
  await assert.rejects(() => wellnessAdminDeleteUser("user_1"), /sign in/i);
  await assert.rejects(() => wellnessAdminResetUserPassword("user_1"), /sign in/i);
}

async function runDatabaseSecurityChecks() {
  console.log("6. Testing Auth Flows, Pre-Hijacking & Data Integrity Against DB...");
  const runTag = crypto.randomBytes(4).toString("hex");
  const syntheticEmail = `secqa_${runTag}@security-qa.invalid`;
  const ownerEmail = `secqa_owner_${runTag}@security-qa.invalid`;
  const createdIds: string[] = [];

  try {
    const superadminEnv = getSuperadminConfig();
    if (superadminEnv.email) {
      const saSignup = await wellnessSignUp({
        fullName: "Fake Superadmin",
        email: superadminEnv.email,
        phone: "081234567890",
        password: "Password123!",
      });
      assert.equal(saSignup.success, false);
    }

    const signUpRes = await wellnessSignUp({
      fullName: "Security QA User",
      email: syntheticEmail,
      phone: "081234567890",
      password: "Password123!",
    });
    assert.equal(signUpRes.success, true);
    assert.equal(signUpRes.requiresVerification, true);

    const createdUser = await prisma.user.findUnique({
      where: { email: syntheticEmail },
      select: { id: true, emailVerifiedAt: true, role: true, tokenVersion: true },
    });
    assert.ok(createdUser);
    createdIds.push(createdUser.id);
    assert.equal(createdUser.emailVerifiedAt, null, "Must NEVER auto-verify ordinary signups");
    assert.equal(createdUser.role, "USER");

    const unverifiedSignIn = await wellnessSignIn({
      email: syntheticEmail,
      password: "Password123!",
    });
    assert.equal(unverifiedSignIn.success, false);
    assert.equal(unverifiedSignIn.requiresVerification, true);

    // Owner creates share to syntheticEmail BEFORE syntheticEmail is verified
    const ownerUser = await prisma.user.create({
      data: {
        email: ownerEmail,
        fullName: "Share Owner QA",
        emailVerifiedAt: new Date(),
        role: "USER",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    createdIds.push(ownerUser.id);

    await prisma.userProgressShare.create({
      data: {
        ownerUserId: ownerUser.id,
        viewerEmail: syntheticEmail,
        viewerUserId: null,
        status: "ACTIVE",
      },
    });

    // Verify email token atomically -> must stamp emailVerifiedAt AND backfill viewerUserId
    const rawVerifyToken =
      signUpRes.devVerifyUrl ? new URL(signUpRes.devVerifyUrl).searchParams.get("token") : null;
    assert.ok(rawVerifyToken);
    const verifyRes = await wellnessVerifyEmailToken(rawVerifyToken);
    assert.equal(verifyRes.success, true);

    const verifiedRow = await prisma.user.findUnique({
      where: { id: createdUser.id },
      select: { emailVerifiedAt: true },
    });
    assert.ok(verifiedRow?.emailVerifiedAt);

    const backfilledShare = await prisma.userProgressShare.findFirst({
      where: { ownerUserId: ownerUser.id, viewerEmail: syntheticEmail },
      select: { viewerUserId: true },
    });
    assert.equal(backfilledShare?.viewerUserId, createdUser.id);

    // Request password reset -> confirm reset -> tokenVersion increments & replay fails
    const resetReq = await wellnessRequestPasswordReset({ email: syntheticEmail });
    assert.equal(resetReq.success, true);
    const resetToken = resetReq.devResetUrl
      ? new URL(resetReq.devResetUrl).searchParams.get("token")
      : null;
    assert.ok(resetToken);

    const confirm1 = await wellnessConfirmPasswordReset({
      token: resetToken,
      newPassword: "NewStrongPass99!",
      confirmPassword: "NewStrongPass99!",
    });
    assert.equal(confirm1.success, true);

    const confirmReplay = await wellnessConfirmPasswordReset({
      token: resetToken,
      newPassword: "AnotherStrongPass99!",
      confirmPassword: "AnotherStrongPass99!",
    });
    assert.equal(confirmReplay.success, false);

    const afterReset = await prisma.user.findUnique({
      where: { id: createdUser.id },
      select: { tokenVersion: true },
    });
    assert.equal(afterReset?.tokenVersion, createdUser.tokenVersion + 1);
  } finally {
    if (createdIds.length > 0) {
      await prisma.userProgressShare.deleteMany({
        where: { OR: [{ ownerUserId: { in: createdIds } }, { viewerUserId: { in: createdIds } }] },
      });
      await prisma.userEmailVerificationToken.deleteMany({ where: { userId: { in: createdIds } } });
      await prisma.userPasswordResetToken.deleteMany({ where: { userId: { in: createdIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
  }
}

async function main() {
  console.log("\n========================================================");
  console.log("🛡️  ENTERPRISE PRE-PRODUCTION SECURITY QA SUITE");
  console.log("========================================================\n");

  runPureSecurityChecks();
  await runSessionAndFailClosedChecks();
  await runDatabaseSecurityChecks();

  console.log("\n✅ ALL SECURITY QA ASSERTIONS PASSED CLEANLY!\n");
}

main()
  .catch((err) => {
    console.error("\n❌ SECURITY QA FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
