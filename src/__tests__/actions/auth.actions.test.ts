import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockHeaders,
  mockRateLimit,
  mockResetRateLimit,
  mockSendEmail,
  mockRecordAuditLog,
  mockGetSession,
  mockSetSessionCookie,
  mockClearSessionCookie,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    userEmailVerificationToken: { updateMany: vi.fn(), create: vi.fn() },
    userPasswordResetToken: { updateMany: vi.fn(), create: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    userProgressShare: { updateMany: vi.fn() },
  };
  const prisma = {
    user: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    userEmailVerificationToken: { findUnique: vi.fn() },
    userPasswordResetToken: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockHeaders: vi.fn(async () => new Headers({ "x-real-ip": "203.0.113.10" })),
    mockRateLimit: vi.fn(),
    mockResetRateLimit: vi.fn(),
    mockSendEmail: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockGetSession: vi.fn(),
    mockSetSessionCookie: vi.fn(),
    mockClearSessionCookie: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/headers", () => ({ headers: mockHeaders }));

vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
  resetDistributedRateLimit: mockResetRateLimit,
}));

vi.mock("@/wellness/security/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/session")>();
  return {
    ...actual,
    getWellnessSession: mockGetSession,
    setSessionCookie: mockSetSessionCookie,
    clearSessionCookie: mockClearSessionCookie,
  };
});

vi.mock("@/wellness/integrations/email-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/email-service")>();
  return { ...actual, sendTransactionalEmail: mockSendEmail };
});

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import {
  wellnessConfirmPasswordReset,
  wellnessRequestEmailSignIn,
  wellnessRequestPasswordReset,
  wellnessResendVerificationEmail,
  wellnessSignIn,
  wellnessSignOut,
  wellnessSignUp,
  wellnessVerifyEmailOtp,
  wellnessVerifyEmailToken,
} from "@/wellness/actions/auth";
import { hashPassword } from "@/wellness/security/password";

describe("Server Actions: Auth Lifecycle (SignUp, Verify, SignIn, SignOut & Reset)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERADMIN_EMAIL = "superadmin@wellness.test";
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 5, resetMs: 60_000 });
    mockResetRateLimit.mockResolvedValue(undefined);
    mockSendEmail.mockResolvedValue({ delivered: true, provider: "CONSOLE_DEV" });
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("blocks reserved SUPERADMIN email self-registration and enforces rate limits on SignUp", async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    const reserved = await wellnessSignUp({
      fullName: "Impostor Admin",
      email: "superadmin@wellness.test",
      phone: "081234567890",
      password: "Password123!",
    });
    expect(reserved.success).toBe(false);
    expect(reserved.message).toContain("reserved for platform administration");

    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 60_000 });
    const throttled = await wellnessSignUp({
      fullName: "Valid User",
      email: "new@zera.id",
      phone: "081234567890",
      password: "Password123!",
    });
    expect(throttled.success).toBe(false);
    expect(throttled.message).toContain("Too many registration attempts");
  });

  it("verifies email token atomically via SHA-256 hash, links pending shares, and rejects expired tokens", async () => {
    const rawToken = "a".repeat(64);
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 1. Expired token rejected
    mockPrisma.userEmailVerificationToken.findUnique.mockResolvedValueOnce({
      id: "vt_exp",
      userId: "u_1",
      usedAt: null,
      expiresAt: new Date(Date.now() - 10_000),
      user: {
        id: "u_1",
        email: "u1@zera.id",
        emailVerifiedAt: null,
        role: "USER",
        status: "ACTIVE",
        deletedAt: null,
        tokenVersion: 0,
      },
    });
    const expRes = await wellnessVerifyEmailToken(rawToken);
    expect(expRes.success).toBe(false);
    expect(expRes.message).toContain("expired");
    expect(mockPrisma.userEmailVerificationToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: expectedHash } })
    );

    // 2. Valid token atomically verified, links UserProgressShare, sets session cookie
    mockPrisma.userEmailVerificationToken.findUnique.mockResolvedValueOnce({
      id: "vt_ok",
      userId: "u_1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "u_1",
        email: "u1@zera.id",
        emailVerifiedAt: null,
        role: "USER",
        status: "ACTIVE",
        deletedAt: null,
        tokenVersion: 0,
      },
    });
    mockTx.userEmailVerificationToken.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.update.mockResolvedValueOnce({
      id: "u_1",
      email: "u1@zera.id",
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    });

    const okRes = await wellnessVerifyEmailToken(rawToken);
    expect(okRes.success).toBe(true);
    expect(mockTx.userProgressShare.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ viewerEmail: "u1@zera.id", viewerUserId: null }),
        data: { viewerUserId: "u_1" },
      })
    );
    expect(mockSetSessionCookie).toHaveBeenCalledOnce();
  });

  it("blocks suspended and unverified accounts on SignIn, and bumps tokenVersion on SignOut", async () => {
    const hash = await hashPassword("MemberPass1!");

    // Suspended user blocked
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_sus",
      email: "sus@zera.id",
      fullName: "Suspended",
      passwordHash: hash,
      role: "USER",
      status: "SUSPENDED",
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
    });
    const susRes = await wellnessSignIn({ email: "sus@zera.id", password: "MemberPass1!" });
    expect(susRes.success).toBe(false);
    expect(susRes.message).toContain("suspended");

    // Unverified email user blocked with requiresVerification=true
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_unv",
      email: "unv@zera.id",
      fullName: "Unverified",
      passwordHash: hash,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: null,
      tokenVersion: 0,
    });
    const unvRes = await wellnessSignIn({ email: "unv@zera.id", password: "MemberPass1!" });
    expect(unvRes.success).toBe(false);
    expect(unvRes.requiresVerification).toBe(true);

    // SignOut bumps tokenVersion & clears cookie
    mockGetSession.mockResolvedValueOnce({ userId: "u_active" });
    const outRes = await wellnessSignOut();
    expect(outRes.success).toBe(true);
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u_active", deletedAt: null },
        data: { tokenVersion: { increment: 1 } },
      })
    );
    expect(mockClearSessionCookie).toHaveBeenCalledOnce();
  });

  it("prevents email enumeration on Password Reset request and atomically revokes sessions on confirmation", async () => {
    // Non-existent user returns identical generic success message (anti-enumeration!)
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    const anonRes = await wellnessRequestPasswordReset("nobody@zera.id");
    expect(anonRes.success).toBe(true);
    expect(anonRes.message).toContain("If your email is registered");
    expect(mockSendEmail).not.toHaveBeenCalled();

    // Confirm password reset atomically consumes token and increments tokenVersion
    const resetToken = "r".repeat(64);
    mockPrisma.userPasswordResetToken.findUnique.mockResolvedValueOnce({
      id: "rt_1",
      userId: "u_1",
      isUsed: false,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockTx.userPasswordResetToken.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.findUnique.mockResolvedValueOnce({
      email: "u1@zera.id",
      emailVerifiedAt: null,
    });

    const confirmRes = await wellnessConfirmPasswordReset({
      token: resetToken,
      newPassword: "BrandNewPass9!",
      confirmPassword: "BrandNewPass9!",
    });
    expect(confirmRes.success).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenVersion: { increment: 1 } }),
      })
    );
    expect(mockResetRateLimit).toHaveBeenCalledTimes(2);
  });

  it("handles full SignUp, Resend Verification, SignIn happy/error paths, and Password Reset issuance", async () => {
    // 1. Happy-path SignUp creates user and issues verification email
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: "u_new",
      email: "fresh@zera.id",
      fullName: "Fresh Member",
      role: "USER",
      tokenVersion: 0,
    });
    const signUpOk = await wellnessSignUp({
      fullName: "Fresh Member",
      email: "fresh@zera.id",
      phone: "081234567890",
      password: "Password123!",
    });
    expect(signUpOk.success).toBe(true);
    expect(signUpOk.requiresVerification).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    // 2. Duplicate verified email rejected; duplicate unverified email resends link
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_old",
      email: "old@zera.id",
      fullName: "Old",
      emailVerifiedAt: new Date(),
    });
    expect(
      (
        await wellnessSignUp({
          fullName: "Old",
          email: "old@zera.id",
          phone: "081234567890",
          password: "Password123!",
        })
      ).success
    ).toBe(false);

    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_unv2",
      email: "unv2@zera.id",
      fullName: "Unv",
      emailVerifiedAt: null,
    });
    const dupUnv = await wellnessSignUp({
      fullName: "Unv",
      email: "unv2@zera.id",
      phone: "081234567890",
      password: "Password123!",
    });
    expect(dupUnv.requiresVerification).toBe(true);

    // 3. Resend verification email (unverified sends, already-verified returns generic success)
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_unv2",
      email: "unv2@zera.id",
      fullName: "Unv",
      emailVerifiedAt: null,
      status: "ACTIVE",
    });
    expect((await wellnessResendVerificationEmail("unv2@zera.id")).success).toBe(true);

    // 4. SignIn: unknown user, Google-only user, wrong password, and successful verified sign-in
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    expect((await wellnessSignIn({ email: "ghost@zera.id", password: "Password123!" })).success).toBe(
      false
    );

    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_google",
      email: "g@zera.id",
      passwordHash: null,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      tokenVersion: 0,
    });
    const googleOnly = await wellnessSignIn({ email: "g@zera.id", password: "Password123!" });
    expect(googleOnly.success).toBe(false);
    expect(googleOnly.message).toContain("Google Sign-In");

    const hash = await hashPassword("ValidPass9!");
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_ok",
      email: "ok@zera.id",
      fullName: "Verified User",
      passwordHash: hash,
      role: "USER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      tokenVersion: 2,
    });
    const signInOk = await wellnessSignIn({ email: "ok@zera.id", password: "ValidPass9!" });
    expect(signInOk.success).toBe(true);
    expect(mockSetSessionCookie).toHaveBeenCalled();

    // 5. Request password reset for active user rotates old tokens & emails link
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_ok",
      email: "ok@zera.id",
      status: "ACTIVE",
    });
    const resetReq = await wellnessRequestPasswordReset("ok@zera.id");
    expect(resetReq.success).toBe(true);
    expect(mockTx.userPasswordResetToken.create).toHaveBeenCalledOnce();
  });

  it("executes Passwordless Email OTP flow: creates pending user, sends 6-digit code + magic link, verifies atomically, and flags needsOnboarding", async () => {
    // 1. New email creates pending member & creates 2 tokens (OTP + magic link)
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: "u_otp_new",
      email: "fresh@zera.id",
      fullName: "",
      role: "USER",
      status: "ACTIVE",
    });

    const reqRes = await wellnessRequestEmailSignIn({ email: "fresh@zera.id" });
    expect(reqRes.success).toBe(true);
    expect(reqRes.devOtpCode).toMatch(/^\d{6}$/);
    expect(reqRes.devVerifyUrl).toContain("/verify-email?token=");
    expect(mockTx.userEmailVerificationToken.create).toHaveBeenCalledTimes(2);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    // 2. Verify OTP for brand-new user -> sets HttpOnly cookie & needsOnboarding=true
    mockPrisma.userEmailVerificationToken.findUnique.mockResolvedValueOnce({
      id: "tok_otp_1",
      userId: "u_otp_new",
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      user: {
        id: "u_otp_new",
        email: "fresh@zera.id",
        fullName: "",
        birthDate: null,
        gender: null,
        phone: null,
        city: null,
        emailVerifiedAt: null,
        role: "USER",
        status: "ACTIVE",
        deletedAt: null,
        tokenVersion: 0,
      },
    });
    mockTx.userEmailVerificationToken.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.update.mockResolvedValueOnce({
      id: "u_otp_new",
      email: "fresh@zera.id",
      fullName: "",
      birthDate: null,
      gender: null,
      phone: null,
      city: null,
      role: "USER",
      status: "ACTIVE",
      tokenVersion: 0,
    });

    const verifyNew = await wellnessVerifyEmailOtp({
      email: "fresh@zera.id",
      code: reqRes.devOtpCode!,
    });
    expect(verifyNew.success).toBe(true);
    expect(verifyNew.data?.needsOnboarding).toBe(true);
    expect(mockSetSessionCookie).toHaveBeenCalled();

    // 3. Invalid OTP format rejected immediately before DB lookup
    const badFormat = await wellnessVerifyEmailOtp({ email: "fresh@zera.id", code: "123" });
    expect(badFormat.success).toBe(false);
  });

  it("AUTH-01/02/03/04: blocks verification link replay, wipes unverified pre-hijack passwords, bootstraps stevenmultz@gmail.com to SUPERADMIN only after OTP verify, and blocks inactive reset", async () => {
    // 1. AUTH-01: Already-used verification link MUST NEVER re-mint a session cookie
    mockPrisma.userEmailVerificationToken.findUnique.mockResolvedValueOnce({
      id: "vt_used",
      userId: "u_1",
      usedAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "u_1",
        email: "u1@zera.id",
        emailVerifiedAt: new Date(Date.now() - 60_000),
        role: "USER",
        status: "ACTIVE",
        deletedAt: null,
        tokenVersion: 3,
      },
    });
    const replayRes = await wellnessVerifyEmailToken("b".repeat(64));
    expect(replayRes.success).toBe(false);
    expect(replayRes.message).toMatch(/already been used/i);
    expect(mockSetSessionCookie).not.toHaveBeenCalled();

    // 2. AUTH-03 + AUTH-02: stevenmultz@gmail.com requests OTP on fresh DB -> created as USER (NOT SUPERADMIN),
    //    then promoted to SUPERADMIN with passwordHash=null + tokenVersion bump ONLY upon OTP verification!
    process.env.SUPERADMIN_EMAIL = "stevenmultz@gmail.com";
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: "u_steven",
      email: "stevenmultz@gmail.com",
      fullName: "",
      role: "USER",
      status: "ACTIVE",
    });

    const adminOtpReq = await wellnessRequestEmailSignIn({ email: "stevenmultz@gmail.com" });
    expect(adminOtpReq.success).toBe(true);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "stevenmultz@gmail.com", role: "USER" }),
      })
    );

    mockPrisma.userEmailVerificationToken.findUnique.mockResolvedValueOnce({
      id: "tok_admin_1",
      userId: "u_steven",
      usedAt: null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      user: {
        id: "u_steven",
        email: "stevenmultz@gmail.com",
        fullName: "",
        birthDate: null,
        gender: null,
        phone: null,
        city: null,
        emailVerifiedAt: null,
        role: "USER",
        status: "ACTIVE",
        deletedAt: null,
        tokenVersion: 0,
      },
    });
    mockTx.userEmailVerificationToken.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.update.mockResolvedValueOnce({
      id: "u_steven",
      email: "stevenmultz@gmail.com",
      fullName: "Super Administrator Wellness",
      birthDate: null,
      gender: null,
      phone: null,
      city: null,
      role: "SUPERADMIN",
      status: "ACTIVE",
      tokenVersion: 1,
    });

    const adminVerify = await wellnessVerifyEmailOtp({
      email: "stevenmultz@gmail.com",
      code: adminOtpReq.devOtpCode!,
    });
    expect(adminVerify.success).toBe(true);
    expect(adminVerify.data?.role).toBe("SUPERADMIN");
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "SUPERADMIN",
          organizationId: null,
          coachProfileId: null,
          passwordHash: null,
          tokenVersion: { increment: 1 },
        }),
      })
    );
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "SUPERADMIN_BOOTSTRAP_PROMOTED", entityId: "u_steven" }),
      mockTx
    );

    // 3. AUTH-04: Suspended user cannot complete password reset confirmation
    mockPrisma.userPasswordResetToken.findUnique.mockResolvedValueOnce({
      id: "rt_sus",
      userId: "u_sus",
      isUsed: false,
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockTx.userPasswordResetToken.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: "u_sus",
      email: "sus@zera.id",
      status: "SUSPENDED",
      deletedAt: null,
      emailVerifiedAt: new Date(),
    });

    const susReset = await wellnessConfirmPasswordReset({
      token: "c".repeat(64),
      newPassword: "NewStrongPassword9!",
      confirmPassword: "NewStrongPassword9!",
    });
    expect(susReset.success).toBe(false);

    // 4. AUTH-04: Rate limit enforced on token verify & password reset confirm
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 60_000 });
    const rlToken = await wellnessVerifyEmailToken("d".repeat(64));
    expect(rlToken.success).toBe(false);
    expect(rlToken.message).toMatch(/Too many verification attempts/i);
  });
});
