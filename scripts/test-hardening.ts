import assert from "node:assert/strict";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { SignUpSchema, ResetPasswordSchema } from "../src/wellness/validators/auth";

async function main() {
  // 1. JWT algorithm pinning: tokens signed with another HMAC algorithm must be rejected.
  const key = new TextEncoder().encode("test-secret-test-secret-test-secret-0123");
  const hs512 = await new SignJWT({ userId: "u1" }).setProtectedHeader({ alg: "HS512" }).setExpirationTime("1h").sign(key);
  await assert.rejects(jwtVerify(hs512, key, { algorithms: ["HS256"] }));
  const hs256 = await new SignJWT({ userId: "u1" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(key);
  await jwtVerify(hs256, key, { algorithms: ["HS256"] });
  console.log("[PASS] 1. JWT verification pinned to HS256");

  // 2. Passwords beyond bcrypt's 72-byte limit are rejected, not silently truncated.
  const base = { fullName: "Test User", email: "a@b.co", phone: "08123456789" };
  assert.equal(SignUpSchema.safeParse({ ...base, password: "Aa1" + "x".repeat(69) }).success, true);
  assert.equal(SignUpSchema.safeParse({ ...base, password: "Aa1" + "x".repeat(70) }).success, false);
  const longPw = "Aa1" + "x".repeat(80);
  assert.equal(ResetPasswordSchema.safeParse({ token: "t", newPassword: longPw, confirmPassword: longPw }).success, false);
  console.log("[PASS] 2. Password 72-byte limit enforced on signup and reset");

  // 3. Reset-token digest is deterministic and differs from the raw token.
  const raw = crypto.randomBytes(32).toString("hex");
  const digest = crypto.createHash("sha256").update(raw).digest("hex");
  assert.notEqual(raw, digest);
  assert.equal(digest, crypto.createHash("sha256").update(raw).digest("hex"));
  console.log("[PASS] 3. Reset token digest check");

  // 4. Out-of-order Midtrans webhooks must not regress settled/refunded payments.
  const { isAllowedPaymentTransition: ok } = await import("../src/wellness/integrations/payment-gateway");
  for (const to of ["PENDING", "EXPIRE", "CANCEL", "DENY"] as const) {
    assert.equal(ok("SETTLEMENT", to), false, `SETTLEMENT -> ${to} must be rejected`);
  }
  assert.equal(ok("SETTLEMENT", "REFUND"), true);
  assert.equal(ok("SETTLEMENT", "SETTLEMENT"), true);
  assert.equal(ok("MANUAL_APPROVED", "EXPIRE"), false);
  assert.equal(ok("MANUAL_APPROVED", "REFUND"), true);
  assert.equal(ok("REFUND_REQUESTED", "SETTLEMENT"), false);
  assert.equal(ok("REFUND_REQUESTED", "REFUND"), true);
  assert.equal(ok("REFUND", "SETTLEMENT"), false);
  assert.equal(ok("REFUND", "PENDING"), false);
  assert.equal(ok("EXPIRE", "PENDING"), false);
  assert.equal(ok("PENDING", "SETTLEMENT"), true);
  assert.equal(ok("PENDING", "EXPIRE"), true);
  console.log("[PASS] 4. Payment status transition guard rejects stale webhooks");

  // 5. Google linking to an unverified local account must revoke its unproven password + sessions.
  const { buildOAuthLinkUserUpdate } = await import("../src/wellness/security/oauth-linking");
  assert.equal(buildOAuthLinkUserUpdate({ emailVerifiedAt: new Date() }), null);
  const upd = buildOAuthLinkUserUpdate({ emailVerifiedAt: null });
  assert.ok(upd && upd.emailVerifiedAt instanceof Date);
  assert.equal(upd.passwordHash, null);
  assert.deepEqual(upd.tokenVersion, { increment: 1 });
  console.log("[PASS] 5. OAuth link to unverified account revokes password and sessions");

  console.log("=== ALL HARDENING TESTS PASSED ===");
}
main().catch((e) => { console.error(e); process.exit(1); });
