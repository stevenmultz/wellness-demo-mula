import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockQueryRaw, mockDeleteMany } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

vi.mock("@/wellness/db", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
    rateLimitBucket: {
      deleteMany: mockDeleteMany,
    },
  },
}));

import { verifySameOriginRequest } from "@/wellness/security/csrf";
import {
  checkDistributedRateLimit,
  checkRateLimit,
  getRateLimitStoreSize,
  resetDistributedRateLimit,
  resetRateLimit,
} from "@/wellness/security/rate-limit";

function makeReq(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    method: "POST",
    headers,
  });
}

describe("Security: CSRF Same-Origin Verification", () => {
  const prevAppUrl = process.env.APP_URL;

  beforeEach(() => {
    process.env.APP_URL = "https://zera.id";
  });

  afterEach(() => {
    if (prevAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = prevAppUrl;
  });

  it("allows legitimate same-origin requests via Origin and Sec-Fetch-Site", () => {
    const req = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      origin: "https://zera.id",
      "sec-fetch-site": "same-origin",
    });
    expect(verifySameOriginRequest(req)).toBe(true);
  });

  it("blocks cross-site and sibling-subdomain Sec-Fetch-Site requests", () => {
    const crossSite = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      origin: "https://zera.id",
      "sec-fetch-site": "cross-site",
    });
    const sameSiteSubdomain = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      origin: "https://evil.zera.id",
      "sec-fetch-site": "same-site",
    });
    expect(verifySameOriginRequest(crossSite)).toBe(false);
    expect(verifySameOriginRequest(sameSiteSubdomain)).toBe(false);
  });

  it("blocks mismatched Origin or Referer hosts", () => {
    const badOrigin = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      origin: "https://attacker.example",
    });
    const badReferer = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      referer: "https://attacker.example/phish",
    });
    expect(verifySameOriginRequest(badOrigin)).toBe(false);
    expect(verifySameOriginRequest(badReferer)).toBe(false);
  });

  it("blocks malformed Origin or Referer headers", () => {
    expect(
      verifySameOriginRequest(
        makeReq("https://zera.id/api/upload", { host: "zera.id", origin: "not-a-valid-url" })
      )
    ).toBe(false);
    expect(
      verifySameOriginRequest(
        makeReq("https://zera.id/api/upload", { host: "zera.id", referer: "::::bad" })
      )
    ).toBe(false);
  });

  it("accepts matching x-forwarded-host behind reverse proxy and matching Referer when Origin absent", () => {
    const proxyReq = makeReq("http://127.0.0.1:3000/api/upload", {
      "x-forwarded-host": "app.zera.id, proxy.internal",
      origin: "https://app.zera.id",
    });
    const refererOnly = makeReq("https://zera.id/api/upload", {
      host: "zera.id",
      referer: "https://zera.id/dashboard",
    });
    expect(verifySameOriginRequest(proxyReq)).toBe(true);
    expect(verifySameOriginRequest(refererOnly)).toBe(true);
  });

  it("allows non-browser server requests with no Origin/Referer/Sec-Fetch-Site when host is known", () => {
    const serverReq = makeReq("https://zera.id/api/upload", { host: "zera.id" });
    expect(verifySameOriginRequest(serverReq)).toBe(true);
  });
});

describe("Security: Sliding-Window & Distributed Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRateLimit("test:sliding:ip");
    resetRateLimit("test:reset:user");
    resetRateLimit("test:fallback:key");
  });

  it("enforces maxRequests within sliding window and recovers after expiry", () => {
    const opts = { windowMs: 60_000, maxRequests: 3 };
    const r1 = checkRateLimit("test:sliding:ip", opts);
    const r2 = checkRateLimit("test:sliding:ip", opts);
    const r3 = checkRateLimit("test:sliding:ip", opts);
    const r4 = checkRateLimit("test:sliding:ip", opts);

    expect(r1).toMatchObject({ allowed: true, remaining: 2 });
    expect(r2).toMatchObject({ allowed: true, remaining: 1 });
    expect(r3).toMatchObject({ allowed: true, remaining: 0 });
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetMs).toBeGreaterThan(0);

    // Advance past the 60s window
    vi.advanceTimersByTime(60_001);
    const r5 = checkRateLimit("test:sliding:ip", opts);
    expect(r5).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("clears bucket state on resetRateLimit and tracks store size", () => {
    checkRateLimit("test:reset:user", { windowMs: 60_000, maxRequests: 1 });
    expect(getRateLimitStoreSize()).toBeGreaterThanOrEqual(1);
    expect(checkRateLimit("test:reset:user", { windowMs: 60_000, maxRequests: 1 }).allowed).toBe(
      false
    );

    resetRateLimit("test:reset:user");
    expect(checkRateLimit("test:reset:user", { windowMs: 60_000, maxRequests: 1 }).allowed).toBe(
      true
    );
  });

  it("uses PostgreSQL distributed bucket when available and blocks when hits exceed maxRequests", async () => {
    const expiresAt = new Date(Date.now() + 30_000);
    mockQueryRaw.mockResolvedValueOnce([{ hits: 2, expires_at: expiresAt }]);

    const okRes = await checkDistributedRateLimit("dist:key:1", {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(okRes.allowed).toBe(true);
    expect(okRes.remaining).toBe(3);
    expect(okRes.resetMs).toBe(30_000);

    mockQueryRaw.mockResolvedValueOnce([{ hits: 6, expires_at: expiresAt }]);
    const blockedRes = await checkDistributedRateLimit("dist:key:1", {
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it("falls back gracefully to in-memory limiter when database is unreachable", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("Connection refused"));
    const res1 = await checkDistributedRateLimit("test:fallback:key", {
      windowMs: 60_000,
      maxRequests: 1,
    });
    expect(res1.allowed).toBe(true);

    mockQueryRaw.mockRejectedValueOnce(new Error("Connection refused"));
    const res2 = await checkDistributedRateLimit("test:fallback:key", {
      windowMs: 60_000,
      maxRequests: 1,
    });
    expect(res2.allowed).toBe(false);
  });

  it("deletes both in-memory and DB buckets on resetDistributedRateLimit", async () => {
    mockDeleteMany.mockResolvedValueOnce({ count: 1 });
    await resetDistributedRateLimit("dist:key:cleanup");
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { key: "dist:key:cleanup" } });
  });
});
