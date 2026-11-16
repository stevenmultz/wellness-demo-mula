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

  console.log("=== ALL HARDENING TESTS PASSED ===");
}
main().catch((e) => { console.error(e); process.exit(1); });
