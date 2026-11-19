import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetSession,
  mockVerifySameOrigin,
  mockRateLimit,
  mockSendWebPush,
  mockPrisma,
} = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockVerifySameOrigin: vi.fn(),
  mockRateLimit: vi.fn(),
  mockSendWebPush: vi.fn(),
  mockPrisma: {
    userPushSubscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/wellness/security/session", () => ({
  getWellnessSession: mockGetSession,
}));

vi.mock("@/wellness/security/csrf", () => ({
  verifySameOriginRequest: mockVerifySameOrigin,
}));

vi.mock("@/wellness/security/rate-limit", () => ({
  checkDistributedRateLimit: mockRateLimit,
}));

vi.mock("@/wellness/integrations/web-push", () => ({
  sendWebPushNotification: mockSendWebPush,
  VAPID_PUBLIC_KEY: "test_vapid_public_key",
}));

vi.mock("@/wellness/db", () => ({ prisma: mockPrisma }));

import { DELETE as pushDelete, GET as pushGet, POST as pushPost } from "@/app/api/push/subscribe/route";

function makePushPost(body: unknown) {
  const raw = JSON.stringify(body);
  return new NextRequest("https://zera.id/api/push/subscribe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(raw)),
    },
    body: raw,
  });
}

describe("API Route: /api/push/subscribe (SSRF Prevention, Endpoint Hijacking & Quota Eviction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySameOrigin.mockReturnValue(true);
    mockGetSession.mockResolvedValue({ userId: "user_A", role: "USER" });
    mockRateLimit.mockResolvedValue({ allowed: true, remaining: 11, resetMs: 60_000 });
    mockSendWebPush.mockResolvedValue({ ok: true });
  });

  it("blocks SSRF endpoints (AWS metadata IP, arbitrary domains, custom ports, credentials, HTTP)", async () => {
    const validKeys = { p256dh: "key_p256dh", auth: "key_auth" };
    const maliciousEndpoints = [
      "https://169.254.169.254/latest/meta-data/",
      "https://internal.corp.local/admin",
      "https://fcm.googleapis.com:8443/fcm/send/abc",
      "https://user:pass@fcm.googleapis.com/fcm/send/abc",
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://evil-fcm.googleapis.com.attacker.test/send",
    ];

    for (const endpoint of maliciousEndpoints) {
      const res = await pushPost(makePushPost({ endpoint, keys: validKeys }));
      expect(res.status, `Expected 400 for SSRF endpoint ${endpoint}`).toBe(400);
    }
    expect(mockPrisma.userPushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("prevents endpoint hijacking (403) when push endpoint belongs to another account", async () => {
    mockPrisma.userPushSubscription.findUnique.mockResolvedValueOnce({ userId: "user_VICTIM" });

    const res = await pushPost(
      makePushPost({
        endpoint: "https://fcm.googleapis.com/fcm/send/shared-token",
        keys: { p256dh: "p", auth: "a" },
      })
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.userPushSubscription.upsert).not.toHaveBeenCalled();
  });

  it("accepts official push providers, evicts oldest subscription at cap (10), and scopes DELETE to current user", async () => {
    mockPrisma.userPushSubscription.findUnique.mockResolvedValueOnce(null);
    mockPrisma.userPushSubscription.count.mockResolvedValueOnce(10);
    mockPrisma.userPushSubscription.findFirst.mockResolvedValueOnce({ id: "sub_oldest" });
    mockPrisma.userPushSubscription.delete.mockResolvedValueOnce({ id: "sub_oldest" });
    mockPrisma.userPushSubscription.upsert.mockResolvedValueOnce({
      id: "sub_new",
      endpoint: "https://web.push.apple.com/token123",
      p256dh: "p",
      auth: "a",
    });

    const postRes = await pushPost(
      makePushPost({
        endpoint: "https://web.push.apple.com/token123",
        keys: { p256dh: "p", auth: "a" },
      })
    );
    expect(postRes.status).toBe(200);
    expect(mockPrisma.userPushSubscription.delete).toHaveBeenCalledWith({
      where: { id: "sub_oldest" },
    });

    // GET checks scoped ownership
    mockPrisma.userPushSubscription.findFirst.mockResolvedValueOnce({ id: "sub_new" });
    const getRes = await pushGet(
      new NextRequest(
        "https://zera.id/api/push/subscribe?endpoint=https%3A%2F%2Fweb.push.apple.com%2Ftoken123"
      )
    );
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toMatchObject({ subscribed: true, publicKey: "test_vapid_public_key" });

    // DELETE strictly scopes where { endpoint, userId } so User A cannot delete User B's subscription
    const delRes = await pushDelete(
      new NextRequest("https://zera.id/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: "https://web.push.apple.com/token123" }),
      })
    );
    expect(delRes.status).toBe(200);
    expect(mockPrisma.userPushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { endpoint: "https://web.push.apple.com/token123", userId: "user_A" },
    });
  });
});
