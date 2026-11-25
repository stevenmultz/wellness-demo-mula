import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockQueryRaw, mockDispatchDue, mockRetentionCleanup, mockTrackingReminders } = vi.hoisted(
  () => ({
    mockQueryRaw: vi.fn(),
    mockDispatchDue: vi.fn(),
    mockRetentionCleanup: vi.fn(),
    mockTrackingReminders: vi.fn(),
  })
);

vi.mock("@/wellness/db", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

vi.mock("@/wellness/integrations/dispatch-due-notifications", () => ({
  dispatchDueNotifications: mockDispatchDue,
  runDatabaseRetentionCleanup: mockRetentionCleanup,
  dispatchTrackingExpiryReminders: mockTrackingReminders,
}));

import { GET as healthGet } from "@/app/api/health/route";
import { GET as cronGet, POST as cronPost } from "@/app/api/cron/dispatch-notifications/route";

describe("API Route: GET /api/health", () => {
  beforeEach(() => {
    mockQueryRaw.mockReset();
  });

  it("returns 200 ok with no-store header when database responds", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    const res = await healthGet();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(json).toMatchObject({ status: "ok", db: "up" });
    expect(typeof json.latencyMs).toBe("number");
  });

  it("returns 503 degraded without leaking sensitive DB error details when database fails", async () => {
    mockQueryRaw.mockRejectedValueOnce(
      new Error("postgresql://admin:supersecret@db.internal:5432/prod refused")
    );
    const res = await healthGet();
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json).toMatchObject({ status: "degraded", db: "down" });
    expect(JSON.stringify(json)).not.toContain("supersecret");
  });
});

describe("API Route: /api/cron/dispatch-notifications", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockDispatchDue.mockReset();
    mockRetentionCleanup.mockReset();
    mockTrackingReminders.mockReset();
    mockTrackingReminders.mockResolvedValue({ remindersSent: 0 });
    process.env.CRON_SECRET = "cron_super_secret_token_2026";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("returns 401 when Authorization secret is missing or wrong", async () => {
    const noAuth = await cronGet(new NextRequest("https://zera.id/api/cron/dispatch-notifications"));
    expect(noAuth.status).toBe(401);

    const wrongAuth = await cronGet(
      new NextRequest("https://zera.id/api/cron/dispatch-notifications", {
        headers: { authorization: "Bearer wrong_secret" },
      })
    );
    expect(wrongAuth.status).toBe(401);
  });

  it("rejects secret in URL query parameter during production to prevent log leakage", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await cronGet(
      new NextRequest(
        "https://zera.id/api/cron/dispatch-notifications?secret=cron_super_secret_token_2026"
      )
    );
    expect(res.status).toBe(401);
  });

  it("returns 413 for oversized POST payload and 400 for invalid simulateTime", async () => {
    const huge = await cronPost(
      new NextRequest("https://zera.id/api/cron/dispatch-notifications", {
        method: "POST",
        headers: {
          authorization: "Bearer cron_super_secret_token_2026",
          "content-length": "99999",
        },
        body: "{}",
      })
    );
    expect(huge.status).toBe(413);

    const badTime = await cronPost(
      new NextRequest("https://zera.id/api/cron/dispatch-notifications", {
        method: "POST",
        headers: {
          authorization: "Bearer cron_super_secret_token_2026",
          "content-type": "application/json",
        },
        body: JSON.stringify({ simulateTime: "99:99" }),
      })
    );
    expect(badTime.status).toBe(400);
  });

  it("dispatches due notifications and runs retention cleanup with clamped lookback when authorized", async () => {
    mockDispatchDue.mockResolvedValueOnce({ sentCount: 4, skippedCount: 1 });
    mockRetentionCleanup.mockResolvedValueOnce({ deletedRateLimits: 12 });

    const res = await cronPost(
      new NextRequest("https://zera.id/api/cron/dispatch-notifications", {
        method: "POST",
        headers: {
          authorization: "Bearer cron_super_secret_token_2026",
          "content-type": "application/json",
        },
        body: JSON.stringify({ simulateTime: "07:00", lookbackMinutes: 999 }),
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({
      success: true,
      sentCount: 4,
      retentionCleanup: { deletedRateLimits: 12 },
    });
    // Lookback is strictly clamped to 120 max
    expect(mockDispatchDue).toHaveBeenCalledWith({
      lookbackMinutes: 120,
      simulateTime: "07:00",
    });
  });
});
