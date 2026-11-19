import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    programEnrollment: { updateMany: vi.fn() },
    paymentTransaction: { updateMany: vi.fn() },
    userPasswordResetToken: { deleteMany: vi.fn() },
    userEmailVerificationToken: { deleteMany: vi.fn() },
    rateLimitBucket: { deleteMany: vi.fn() },
    userNotification: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import { runDatabaseRetentionCleanup } from "@/wellness/integrations/dispatch-due-notifications";

describe("Data Hygiene: Database Retention Cleanup Safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it("only expires overdue PENDING invoices and purges stale tokens/read notifications without touching ACTIVE/SETTLEMENT rows", async () => {
    mockPrisma.programEnrollment.updateMany.mockResolvedValueOnce({ count: 3 });
    mockPrisma.paymentTransaction.updateMany.mockResolvedValueOnce({ count: 3 });
    mockPrisma.userPasswordResetToken.deleteMany.mockResolvedValueOnce({ count: 4 });
    mockPrisma.userEmailVerificationToken.deleteMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.rateLimitBucket.deleteMany.mockResolvedValueOnce({ count: 15 });
    mockPrisma.userNotification.deleteMany.mockResolvedValueOnce({ count: 7 });

    const now = new Date("2026-06-15T00:00:00.000Z");
    const summary = await runDatabaseRetentionCleanup(now);

    expect(summary).toEqual({
      expiredEnrollments: 3,
      expiredTransactions: 3,
      purgedTokens: 6,
      purgedRateBuckets: 15,
      purgedOldNotifications: 7,
    });

    // Strictly scoped to PENDING only!
    expect(mockPrisma.programEnrollment.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", invoiceExpiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });
    expect(mockPrisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", expiresAt: { lt: now } },
      data: { status: "EXPIRE" },
    });
    // Only purges READ notifications older than 90 days (never unread!)
    expect(mockPrisma.userNotification.deleteMany).toHaveBeenCalledWith({
      where: { readAt: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
    });
  });
});

describe("PWA Security Contract: public/sw.js Cache & Push Safety", () => {
  const swPath = path.resolve(process.cwd(), "public", "sw.js");
  const swCode = fs.readFileSync(swPath, "utf8");

  it("never caches API routes, non-GET requests, Next.js Server Actions, or private /uploads/ media", () => {
    expect(swCode).toContain('request.method !== "GET"');
    expect(swCode).toContain('url.pathname.startsWith("/api/")');
    expect(swCode).toContain('request.headers.has("next-action")');
    expect(swCode).toContain('!url.pathname.startsWith("/uploads/")');
  });

  it("uses Network-First without caching HTML navigation responses (prevents post-logout /admin or /dashboard leakage)", () => {
    // Extract the navigate block and ensure it never calls cache.put()
    const navStart = swCode.indexOf('if (request.mode === "navigate")');
    const navEnd = swCode.indexOf("return;", navStart);
    expect(navStart).toBeGreaterThan(-1);
    const navBlock = swCode.slice(navStart, navEnd);
    expect(navBlock).not.toContain("cache.put");
  });

  it("restricts Web Push click URLs to relative same-origin paths (blocks open-redirect phishing)", () => {
    expect(swCode).toContain('parsed.url.startsWith("/")');
  });
});
