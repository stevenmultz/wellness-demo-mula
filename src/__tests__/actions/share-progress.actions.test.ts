import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockRequireAuth,
  mockRateLimit,
  mockSendEmail,
  mockCreateNotifications,
  mockRecordAuditLog,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    userProgressShare: { upsert: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    userProgressShare: {
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    programDayProgress: { findMany: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  };
  return {
    mockRequireAuth: vi.fn(),
    mockRateLimit: vi.fn(),
    mockSendEmail: vi.fn(),
    mockCreateNotifications: vi.fn(),
    mockRecordAuditLog: vi.fn(),
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

vi.mock("@/wellness/integrations/email-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/wellness/integrations/email-service")>();
  return { ...actual, sendTransactionalEmail: mockSendEmail };
});

vi.mock("@/wellness/integrations/user-notifications", () => ({
  createUserNotifications: mockCreateNotifications,
}));

vi.mock("@/wellness/integrations/audit-log", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import {
  wellnessCreateProgressShare,
  wellnessGetShareProgressOverview,
  wellnessRemoveIncomingShare,
  wellnessRevokeProgressShare,
} from "@/wellness/actions/share-progress";

describe("Server Actions: Share Progress Privacy & Access Control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({
      userId: "u_owner",
      email: "owner@zera.id",
      fullName: "Nadia",
      emailVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 9, resetMs: 60_000 });
    mockSendEmail.mockResolvedValue({ delivered: true, provider: "CONSOLE_DEV" });
    mockCreateNotifications.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) =>
      cb(mockTx)
    );
  });

  it("never exposes incoming health progress to users with unverified emails", async () => {
    mockRequireAuth.mockResolvedValueOnce({
      userId: "u_unverified",
      email: "victim@zera.id",
      fullName: "Unverified",
      emailVerifiedAt: null,
    });
    mockPrisma.userProgressShare.findMany.mockResolvedValueOnce([]);

    const res = await wellnessGetShareProgressOverview();
    expect(res.success).toBe(true);
    expect(res.data?.incoming).toEqual([]);
    // findMany only called ONCE (for outgoing), NEVER queried incoming shares!
    expect(mockPrisma.userProgressShare.findMany).toHaveBeenCalledTimes(1);
  });

  it("blocks unverified owners, self-sharing, rate-limit bursts, and >20 active shares cap", async () => {
    // 1. Unverified email owner
    mockRequireAuth.mockResolvedValueOnce({
      userId: "u_1",
      email: "a@zera.id",
      fullName: "A",
      emailVerifiedAt: null,
    });
    expect(
      (await wellnessCreateProgressShare({ viewerEmail: "b@zera.id" })).success
    ).toBe(false);

    // 2. Self-sharing
    const selfRes = await wellnessCreateProgressShare({ viewerEmail: "OWNER@zera.id" });
    expect(selfRes.success).toBe(false);
    expect(selfRes.message).toContain("own email");

    // 3. Rate limit exceeded
    mockRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetMs: 60_000 });
    expect((await wellnessCreateProgressShare({ viewerEmail: "friend@zera.id" })).success).toBe(
      false
    );

    // 4. Max 20 shares cap
    mockPrisma.userProgressShare.count.mockResolvedValueOnce(20);
    const capRes = await wellnessCreateProgressShare({ viewerEmail: "friend@zera.id" });
    expect(capRes.success).toBe(false);
    expect(capRes.message).toContain("Maximum 20");
  });

  it("grants share, records audit log, and revokes strictly scoped to owner/viewer", async () => {
    mockPrisma.userProgressShare.count.mockResolvedValueOnce(2);
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: "u_viewer",
      fullName: "Coach Mentor",
      emailVerifiedAt: new Date(),
    });
    const now = new Date();
    mockTx.userProgressShare.upsert.mockResolvedValueOnce({
      id: "share_1",
      viewerEmail: "mentor@zera.id",
      label: "Mentor",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    const createRes = await wellnessCreateProgressShare({
      viewerEmail: "mentor@zera.id",
      label: "Mentor",
    });
    expect(createRes.success).toBe(true);
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "PROGRESS_SHARE_GRANTED" }),
      mockTx
    );
    expect(mockCreateNotifications).toHaveBeenCalledOnce();

    // Revoke non-owned share returns failure
    mockTx.userProgressShare.findFirst.mockResolvedValueOnce(null);
    expect((await wellnessRevokeProgressShare("share_other_user")).success).toBe(false);

    // Owner revokes own share cleanly
    mockTx.userProgressShare.findFirst.mockResolvedValueOnce({
      id: "share_1",
      viewerEmail: "mentor@zera.id",
    });
    const revokeRes = await wellnessRevokeProgressShare("share_1");
    expect(revokeRes.success).toBe(true);
    expect(mockTx.userProgressShare.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REVOKED" }) })
    );

    // Viewer dismisses incoming share
    mockPrisma.userProgressShare.updateMany.mockResolvedValueOnce({ count: 1 });
    expect((await wellnessRemoveIncomingShare("share_1")).success).toBe(true);
  });
});
