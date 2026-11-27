import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractBunnyStreamIds,
  extractVideoThumbnail,
  extractYouTubeId,
  normalizeVideoEmbed,
} from "@/wellness/integrations/video-provider";
import {
  signProgramDayVideoField,
  signSingleVideoUrl,
} from "@/wellness/integrations/video-signing";
import { escapeHtml, sendTransactionalEmail } from "@/wellness/integrations/email-service";
import {
  STORAGE_BUCKETS,
  formatStorageUri,
  parseStorageUri,
  resolveMediaUrlForClient,
} from "@/wellness/integrations/supabase-storage";

describe("Integrations: Video Provider Hardening", () => {
  it("extracts YouTube IDs across standard, short, embed, shorts, nocookie, and JSON array formats", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(
      extractYouTubeId(JSON.stringify([{ title: "Warmup", url: "https://youtu.be/dQw4w9WgXcQ" }]))
    ).toBe("dQw4w9WgXcQ");
  });

  it("rejects spoofed YouTube hostnames and path traversal video IDs", () => {
    expect(extractYouTubeId("https://evil-youtube.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(extractYouTubeId("https://www.youtube.com/watch?v=../../evil")).toBeNull();
  });

  it("normalizes YouTube, Vimeo, Cloudflare Stream, direct URLs, and rejects unsafe schemes", () => {
    expect(normalizeVideoEmbed("https://youtu.be/sTANio_2E0Q")).toEqual({
      provider: "YOUTUBE",
      videoId: "sTANio_2E0Q",
      embedUrl: "https://www.youtube.com/embed/sTANio_2E0Q?modestbranding=1&rel=0&playsinline=1",
    });

    expect(normalizeVideoEmbed("https://vimeo.com/987654321")).toEqual({
      provider: "VIMEO",
      videoId: "987654321",
      embedUrl: "https://player.vimeo.com/video/987654321?byline=0&portrait=0&dnt=1",
    });

    expect(
      normalizeVideoEmbed("https://customer-xyz.cloudflarestream.com/abc/iframe").provider
    ).toBe("CLOUDFLARE_STREAM");

    // Spoofed cloudflarestream suffix must NOT be classified as CLOUDFLARE_STREAM
    expect(normalizeVideoEmbed("https://evil-cloudflarestream.com/abc").provider).toBe("DIRECT");

    // Unsafe protocol rejected
    expect(normalizeVideoEmbed("javascript:alert(1)")).toEqual({
      provider: "UNKNOWN",
      embedUrl: null,
      videoId: null,
    });
    expect(normalizeVideoEmbed("")).toEqual({ provider: "UNKNOWN", embedUrl: null, videoId: null });

    // Thumbnails
    expect(extractVideoThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
    expect(extractVideoThumbnail("https://vimeo.com/123", "/fallback.webp")).toBe("/fallback.webp");
  });

  it("normalizes and signs Bunny.net Stream URLs (single & JSON array) with expiring SHA-256 token", () => {
    expect(
      extractBunnyStreamIds("https://iframe.mediadelivery.net/play/295102/550e8400-e29b-41d4-a716-446655440000")
    ).toEqual({
      libraryId: "295102",
      videoId: "550e8400-e29b-41d4-a716-446655440000",
      token: null,
      expires: null,
    });

    const signed = signSingleVideoUrl(
      "bunny://295102/550e8400-e29b-41d4-a716-446655440000",
      {
        nowSec: 1700000000,
        ttlSeconds: 3600,
        bunnyTokenKeyOverride: "zera_secret_key",
      }
    );
    expect(signed).toContain(
      "https://iframe.mediadelivery.net/embed/295102/550e8400-e29b-41d4-a716-446655440000?"
    );
    expect(signed).toContain("expires=1700003600");
    expect(signed).toMatch(/token=[a-f0-9]{64}/);

    const normalized = normalizeVideoEmbed(signed);
    expect(normalized.provider).toBe("BUNNY_STREAM");
    expect(normalized.embedUrl).toContain("token=");
    expect(normalized.embedUrl).toContain("expires=1700003600");

    const signedJson = signProgramDayVideoField(
      JSON.stringify([{ title: "Option A", url: "bunny://295102/550e8400-e29b-41d4-a716-446655440000" }])
    );
    expect(signedJson).toContain("iframe.mediadelivery.net/embed/295102/");
  });
});

describe("Integrations: Transactional Email Service", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("escapes all 5 dangerous HTML characters to prevent email template XSS", () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;"
    );
    expect(escapeHtml(null)).toBe("");
  });

  it("uses CONSOLE_DEV in development and fails safely as UNCONFIGURED in production", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    process.env.EMAIL_PROVIDER = "CONSOLE_DEV";
    vi.stubEnv("NODE_ENV", "development");
    const devRes = await sendTransactionalEmail({
      to: "user@zera.id",
      subject: "Verify Email",
      html: "<p>Hello</p>",
    });
    expect(devRes).toEqual({ delivered: true, provider: "CONSOLE_DEV" });
    expect(logSpy).toHaveBeenCalled();

    vi.stubEnv("NODE_ENV", "production");
    const prodUnconfigured = await sendTransactionalEmail({
      to: "user@zera.id",
      subject: "Verify Email",
      html: "<p>Hello</p>",
    });
    expect(prodUnconfigured).toEqual({ delivered: false, provider: "UNCONFIGURED" });
    expect(errSpy).toHaveBeenCalled();
  });

  it("retries Resend on transient 5xx failure and does not retry non-retryable 4xx", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.EMAIL_PROVIDER = "RESEND";
    process.env.RESEND_API_KEY = "re_test_key";

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Service Unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));

    const retryOk = await sendTransactionalEmail({
      to: "member@zera.id",
      subject: "Receipt",
      html: "<p>Confirmed</p>",
      text: "Confirmed",
    });
    expect(retryOk).toEqual({ delivered: true, provider: "RESEND" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 400 Bad Request should NOT retry
    const badReqSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("Invalid recipient", { status: 400 }));
    const badRes = await sendTransactionalEmail({
      to: "bad",
      subject: "Test",
      html: "<p>x</p>",
    });
    expect(badRes).toEqual({ delivered: false, provider: "RESEND" });
    expect(badReqSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Integrations: Supabase Storage URI Helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("formats and parses private sb:// URIs while rejecting traversal and malformed URIs", () => {
    expect(formatStorageUri(STORAGE_BUCKETS.AVATARS, "/u1/avatar.webp")).toBe(
      "sb://avatars/u1/avatar.webp"
    );
    expect(parseStorageUri("sb://workout-media/u1/day1/pic.webp")).toEqual({
      bucket: "workout-media",
      objectPath: "u1/day1/pic.webp",
    });

    expect(parseStorageUri("sb://avatars/../secret.webp")).toBeNull();
    expect(parseStorageUri("sb://avatars/")).toBeNull();
    expect(parseStorageUri("https://example.com/pic.webp")).toBeNull();
    expect(parseStorageUri(null)).toBeNull();
  });

  it("resolves non-storage media URLs through safeMediaUrl and returns null for unconfigured sb://", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(await resolveMediaUrlForClient("/coach.webp")).toBe("/coach.webp");
    expect(await resolveMediaUrlForClient("javascript:alert(1)")).toBeNull();
    expect(await resolveMediaUrlForClient("sb://avatars/u1/pic.webp")).toBeNull();
    expect(await resolveMediaUrlForClient("")).toBeNull();
  });
});
