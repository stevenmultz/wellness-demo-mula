import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockLockProgramRow,
  mockRateLimit,
  mockCreateQrisAdapter,
  mockCreateNotifications,
  mockDeleteStorageObjects,
  mockCleanupLocalFiles,
  mockRecordAuditLog,
  mockSetSessionCookie,
  mockClearSessionCookie,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    user: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    program: { findFirst: vi.fn() },
    programEnrollment: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentTransaction: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    userIdentity: { deleteMany: vi.fn() },
    userPushSubscription: { deleteMany: vi.fn() },
    userPasswordResetToken: { deleteMany: vi.fn(), updateMany: vi.fn() },
    userEmailVerificationToken: { deleteMany: vi.fn() },
    userProgressShare: { updateMany: vi.fn() },
  };
  const prisma = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    program: { findFirst: vi.fn() },
    programEnrollment: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    paymentTransaction: { update: vi.fn(), updateMany: vi.fn() },
    userPasswordResetToken: { updateMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") return (arg as (client: typeof tx) => unknown)(tx);
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    }),
  };
  return {
    mockRequireAuth: vi.fn(),
    mockLockProgramRow: vi.fn(),
    mockRateLimit: vi.fn(),
    mockCreateQrisAdapter: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockDeleteStorageObjects: vi.fn(),
    mockCleanupLocalFiles: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockSetSessionCookie: vi.fn(),
    mockClearSessionCookie: vi.fn(),
    mockTx: tx,
    mockPrisma: prisma,
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/wellness/security/guards", () => ({
  requireAuth: mockRequireAuth,
}));

vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
}));

vi.mock("@/wellness/security/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/security/session")>();
  return {
    ...actual,
    setSessionCookie: mockSetSessionCookie,
    clearSessionCookie: mockClearSessionCookie,
  };
});

vi.mock("@/wellness/integrations/payment-gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/payment-gateway")>();
  return {
    ...actual,
    createQrisInvoiceAdapter: mockCreateQrisAdapter,
  };
});

vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));

vi.mock("@/wellness/integrations/supabase-storage", () => ({
  deleteStorageObjects: mockDeleteStorageObjects,
}));

vi.mock("@/wellness/utils/image-processor", () => ({
  cleanupUserUploadedFiles: mockCleanupLocalFiles,
}));

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

vi.mock("@/wellness/db", () => ({
  prisma: mockPrisma,
  lockProgramRow: mockLockProgramRow,
}));

import {
  wellnessChangePassword,
  wellnessCompleteOnboarding,
  wellnessConfirmQrisPayment,
  wellnessDeleteAccount,
  wellnessEnrollProgram,
  wellnessGetProfile,
  wellnessUpdateProfile,
} from "@/wellness/actions/account";
import { hashPassword } from "@/wellness/security/password";

describe("Server Actions: Checkout, Seat-Hold Quota, Production Payment Guard & Account Deletion", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      userId: "u_member",
      email: "member@zera.id",
      fullName: "Budi",
      role: "USER",
    });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 5, resetMs: 60_000 });
    mockCreateNotifications.mockResolvedValue(undefined);
    mockDeleteStorageObjects.mockResolvedValue(undefined);
    mockCleanupLocalFiles.mockResolvedValue(0);
    mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") return (arg as (client: typeof mockTx) => unknown)(mockTx);
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg;
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("blocks enrolling in DRAFT, Full, or already-ACTIVE cohorts and activates free cohorts atomically", async () => {
    // 1. DRAFT cohort blocked
    mockPrisma.program.findFirst.mockResolvedValueOnce({
      id: "p_draft",
      title: "Draft Cohort",
      status: "DRAFT",
      price: 0,
      maxQuota: 10,
      locationType: "ONLINE",
      _count: { enrollments: 0 },
    });
    expect((await wellnessEnrollProgram("p_draft")).success).toBe(false);

    // 2. Full cohort blocked
    mockPrisma.program.findFirst.mockResolvedValueOnce({
      id: "p_full",
      title: "Full Cohort",
      status: "PUBLISHED",
      price: 0,
      maxQuota: 10,
      locationType: "ONLINE",
      _count: { enrollments: 10 },
    });
    const fullRes = await wellnessEnrollProgram("p_full");
    expect(fullRes.success).toBe(false);
    expect(fullRes.message).toContain("maximum quota");

    // 3. Free ONLINE program forces VIRTUAL attendance and activates atomically with row lock
    mockPrisma.program.findFirst.mockResolvedValueOnce({
      id: "p_free",
      title: "Free Breathwork",
      status: "PUBLISHED",
      price: 0,
      maxQuota: 30,
      locationType: "ONLINE",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      _count: { enrollments: 2 },
    });
    mockTx.program.findFirst.mockResolvedValueOnce({ maxQuota: 30, price: 0 });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce(null);
    mockTx.programEnrollment.count.mockResolvedValueOnce(2);
    mockTx.programEnrollment.create.mockResolvedValueOnce({
      id: "enr_free_1",
      status: "ACTIVE",
      attendanceMode: "VIRTUAL",
      paymentReference: "FREE-ABC",
    });

    const freeRes = await wellnessEnrollProgram("p_free", "IN_PERSON");
    expect(freeRes.success).toBe(true);
    expect(mockLockProgramRow).toHaveBeenCalledWith(mockTx, "p_free");
    expect(mockTx.programEnrollment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE", attendanceMode: "VIRTUAL" }),
      })
    );
    expect(mockTx.paymentTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grossAmount: 0, status: "SETTLEMENT", provider: "FREE" }),
      })
    );
  });

  it("enforces 15-minute checkout seat holds and rolls back PENDING ledger when Midtrans gateway fails", async () => {
    const paidProgram = {
      id: "p_paid",
      title: "Paid Pilates",
      status: "PUBLISHED",
      price: 250_000,
      maxQuota: 10,
      locationType: "ONLINE",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      _count: { enrollments: 8 },
    };

    // 1. 8 ACTIVE + 2 active PENDING holds by other users = 10/10 -> must refuse checkout!
    mockPrisma.program.findFirst.mockResolvedValueOnce(paidProgram);
    mockTx.program.findFirst.mockResolvedValueOnce({ maxQuota: 10, price: 250_000 });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce(null);
    mockTx.programEnrollment.count.mockResolvedValueOnce(10);

    const holdFullRes = await wellnessEnrollProgram("p_paid");
    expect(holdFullRes.success).toBe(false);
    expect(holdFullRes.message).toContain("active checkout holds");

    // 2. Gateway charge throws -> compensating rollback cancels PENDING tx & enrollment so seat isn't leaked!
    mockPrisma.program.findFirst.mockResolvedValueOnce(paidProgram);
    mockTx.program.findFirst.mockResolvedValueOnce({ maxQuota: 10, price: 250_000 });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce(null);
    mockTx.programEnrollment.count.mockResolvedValueOnce(5);
    mockTx.programEnrollment.create.mockResolvedValueOnce({
      id: "enr_paid_1",
      status: "PENDING",
      attendanceMode: "VIRTUAL",
      invoiceExpiresAt: new Date(Date.now() + 900_000),
    });
    mockTx.paymentTransaction.create.mockResolvedValueOnce({
      id: "tx_paid_1",
      orderId: "QRIS-TEST-01",
      expiresAt: new Date(Date.now() + 900_000),
      qrisStringOrUrl: null,
    });
    mockCreateQrisAdapter.mockRejectedValueOnce(new Error("Midtrans 502 Bad Gateway"));

    const failedGw = await wellnessEnrollProgram("p_paid");
    expect(failedGw.success).toBe(false);
    expect(failedGw.message).toContain("Midtrans 502");
    expect(mockPrisma.paymentTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "tx_paid_1" }, data: { status: "CANCEL" } })
    );
    expect(mockPrisma.programEnrollment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "enr_paid_1", status: "PENDING" }),
        data: { status: "CANCELLED" },
      })
    );
  });

  it("CRITICAL: blocks client-side payment self-confirmation in production and enforces expiry/IDOR/terms", async () => {
    // 1. Unagreed terms rejected
    expect((await wellnessConfirmQrisPayment("enr_1", false)).success).toBe(false);

    // 2. IDOR: another user's enrollment rejected
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_other",
      userId: "someone_else",
      status: "PENDING",
      program: { title: "Core", locationType: "ONLINE" },
    });
    expect((await wellnessConfirmQrisPayment("enr_other", true)).success).toBe(false);

    // 3. PRODUCTION KILL-SWITCH: ALLOW_PAYMENT_SIMULATION unset & NODE_ENV=production MUST DENY!
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ALLOW_PAYMENT_SIMULATION;
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_prod",
      userId: "u_member",
      status: "PENDING",
      program: { title: "Core", locationType: "ONLINE" },
    });
    const prodBlocked = await wellnessConfirmQrisPayment("enr_prod", true);
    expect(prodBlocked.success).toBe(false);
    expect(prodBlocked.message).toContain("disabled in production");

    // 4. Expired 15-minute invoice marks EXPIRED/EXPIRE and blocks activation
    process.env.ALLOW_PAYMENT_SIMULATION = "true";
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_exp",
      userId: "u_member",
      status: "PENDING",
      invoiceExpiresAt: new Date(Date.now() - 60_000),
      program: { title: "Core", locationType: "ONLINE", registrationDeadlineAt: null },
    });
    const expRes = await wellnessConfirmQrisPayment("enr_exp", true);
    expect(expRes.success).toBe(false);
    expect(expRes.message).toContain("expired");
    expect(mockPrisma.programEnrollment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } })
    );
  });

  it("anonymizes PII on self-deletion, protects sole SUPERADMIN, preserves financial ledger, and rotates sessions on password change", async () => {
    const currentHash = await hashPassword("OldPass123!");

    // 1. Wrong password blocks account deletion
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u_member",
      deletedAt: null,
      passwordHash: currentHash,
      avatarPath: "sb://avatars/u_member/a.webp",
    });
    const badPwdDel = await wellnessDeleteAccount({ password: "WrongPassword1!" });
    expect(badPwdDel.success).toBe(false);
    expect(badPwdDel.message).toContain("Incorrect password");

    // 2. Sole SUPERADMIN cannot delete themselves
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u_member",
      deletedAt: null,
      passwordHash: currentHash,
      avatarPath: null,
    });
    mockTx.user.findUnique.mockResolvedValueOnce({ role: "SUPERADMIN", deletedAt: null });
    mockTx.user.count.mockResolvedValueOnce(1);
    const soleAdminDel = await wellnessDeleteAccount({ password: "OldPass123!" });
    expect(soleAdminDel.success).toBe(false);
    expect(soleAdminDel.message).toContain("sole Superadmin");

    // 3. Valid member self-deletion soft-deletes & anonymizes PII while cancelling active enrollments & revoking shares
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u_member",
      deletedAt: null,
      passwordHash: currentHash,
      avatarPath: "sb://avatars/u_member/a.webp",
    });
    mockTx.user.findUnique.mockResolvedValueOnce({ role: "USER", deletedAt: null });

    const delOk = await wellnessDeleteAccount({ password: "OldPass123!" });
    expect(delOk.success).toBe(true);
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: "Deleted User",
          status: "SUSPENDED",
          passwordHash: null,
          tokenVersion: { increment: 1 },
        }),
      })
    );
    expect(mockTx.userProgressShare.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REVOKED" }) })
    );
    expect(mockDeleteStorageObjects).toHaveBeenCalledWith(["sb://avatars/u_member/a.webp"]);
    expect(mockClearSessionCookie).toHaveBeenCalledOnce();

    // 4. Password change bumps tokenVersion, invalidates reset tokens, and sets fresh JWT cookie
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      passwordHash: currentHash,
      tokenVersion: 4,
      email: "member@zera.id",
      role: "USER",
    });
    const pwdOk = await wellnessChangePassword({
      currentPassword: "OldPass123!",
      newPassword: "NewStrongPass9!",
      confirmPassword: "NewStrongPass9!",
    });
    expect(pwdOk.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tokenVersion: 5 }) })
    );
    expect(mockSetSessionCookie).toHaveBeenCalledOnce();
  });

  it("handles profile read/update, paid invoice reuse + gateway success, and simulation confirmation happy path", async () => {
    // 1. Get profile & update profile
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: "u_member",
      email: "member@zera.id",
      fullName: "Budi",
      phone: "081234567890",
      role: "USER",
      status: "ACTIVE",
      createdAt: new Date(),
    });
    expect((await wellnessGetProfile()).id).toBe("u_member");

    mockTx.user.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: "u_member",
      email: "member@zera.id",
      fullName: "Budi Santoso",
      phone: "081234567890",
      birthDate: new Date("1995-05-20T00:00:00.000Z"),
      gender: "Male",
      occupation: "Engineer",
      address: "Jl. Sudirman",
      city: "Jakarta",
      province: "DKI Jakarta",
      emergencyContactName: "Siti",
      emergencyContactPhone: "081299990000",
    });
    const profRes = await wellnessUpdateProfile({
      fullName: "Budi Santoso",
      phone: "081234567890",
      dateOfBirth: "1995-05-20",
      gender: "Male",
      city: "Jakarta",
    });
    expect(profRes.success).toBe(true);

    // 2. Paid checkout success with gateway invoice creation
    const paidProgram = {
      id: "p_paid_ok",
      title: "Paid Pilates",
      status: "PUBLISHED",
      price: 250_000,
      maxQuota: 20,
      locationType: "ONLINE",
      startAt: null,
      endAt: null,
      registrationOpenAt: null,
      registrationDeadlineAt: null,
      _count: { enrollments: 2 },
    };
    const futureExp = new Date(Date.now() + 900_000);
    mockPrisma.program.findFirst.mockResolvedValueOnce(paidProgram);
    mockTx.program.findFirst.mockResolvedValueOnce({ maxQuota: 20, price: 250_000 });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce(null);
    mockTx.programEnrollment.count.mockResolvedValueOnce(2);
    mockTx.programEnrollment.create.mockResolvedValueOnce({
      id: "enr_ok_1",
      status: "PENDING",
      attendanceMode: "VIRTUAL",
      invoiceExpiresAt: futureExp,
    });
    mockTx.paymentTransaction.create.mockResolvedValueOnce({
      id: "tx_ok_1",
      orderId: "QRIS-OK-1",
      expiresAt: futureExp,
      qrisStringOrUrl: null,
    });
    mockCreateQrisAdapter.mockResolvedValueOnce({
      orderId: "QRIS-OK-1",
      paymentReference: "QRIS-OK-1",
      gatewayTransactionId: "mid_99",
      qrStringOrUrl: "https://qr.midtrans.test/1",
      invoiceExpiresAt: futureExp,
      providerMode: "INTERNAL_SIMULATION",
    });

    const enrollOk = await wellnessEnrollProgram("p_paid_ok");
    expect(enrollOk.success).toBe(true);
    expect(enrollOk.data?.qrStringOrUrl).toBe("https://qr.midtrans.test/1");

    // 3. Reusing valid PENDING invoice skips redundant gateway call
    mockPrisma.program.findFirst.mockResolvedValueOnce(paidProgram);
    mockTx.program.findFirst.mockResolvedValueOnce({ maxQuota: 20, price: 250_000 });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_ok_1",
      status: "PENDING",
      invoiceExpiresAt: futureExp,
      transactions: [
        {
          id: "tx_ok_1",
          orderId: "QRIS-OK-1",
          grossAmount: 250_000,
          expiresAt: futureExp,
          qrisStringOrUrl: "https://qr.midtrans.test/1",
        },
      ],
    });
    mockTx.programEnrollment.count.mockResolvedValueOnce(2);
    mockTx.programEnrollment.update.mockResolvedValueOnce({
      id: "enr_ok_1",
      status: "PENDING",
      attendanceMode: "VIRTUAL",
      invoiceExpiresAt: futureExp,
    });
    const reuseRes = await wellnessEnrollProgram("p_paid_ok");
    expect(reuseRes.success).toBe(true);
    expect(reuseRes.message).toContain("ready");

    // 4. Simulation confirmation happy path (in dev/simulation mode)
    process.env.ALLOW_PAYMENT_SIMULATION = "true";
    mockPrisma.programEnrollment.findUnique.mockResolvedValueOnce({
      id: "enr_ok_1",
      userId: "u_member",
      programId: "p_paid_ok",
      status: "PENDING",
      invoiceExpiresAt: futureExp,
      program: {
        id: "p_paid_ok",
        title: "Paid Pilates",
        maxQuota: 20,
        locationType: "ONLINE",
        endAt: null,
        registrationDeadlineAt: null,
      },
    });
    mockTx.programEnrollment.findUnique.mockResolvedValueOnce({
      status: "PENDING",
      paymentReference: "QRIS-OK-1",
    });
    mockTx.programEnrollment.count.mockResolvedValueOnce(3);
    mockTx.programEnrollment.update.mockResolvedValueOnce({ id: "enr_ok_1", status: "ACTIVE" });

    const confirmOk = await wellnessConfirmQrisPayment("enr_ok_1", true);
    expect(confirmOk.success).toBe(true);
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PAYMENT_SIMULATION_CONFIRMED" }),
      mockTx
    );
  });

  it("completes sequential member onboarding and writes ONBOARDING_COMPLETED audit log", async () => {
    const invalid = await wellnessCompleteOnboarding({
      fullName: "A",
      dateOfBirth: "1999-06-15",
      gender: "Male",
      phone: "123",
      city: "",
    });
    expect(invalid.success).toBe(false);

    mockTx.user.updateMany.mockResolvedValueOnce({ count: 1 });
    const ok = await wellnessCompleteOnboarding({
      fullName: "Steven Mulya",
      dateOfBirth: "1999-06-15",
      gender: "Male",
      phone: "+6281290001122",
      city: "Jakarta Selatan",
    });
    expect(ok.success).toBe(true);
    expect(mockTx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: "Steven Mulya",
          gender: "Male",
          phone: "+6281290001122",
          city: "Jakarta Selatan",
        }),
      })
    );
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ONBOARDING_COMPLETED" }),
      mockTx
    );
  });
});
