import { expect, test } from "@playwright/test";

test.describe("PWA, Security Headers & Live SSR Smoke", () => {
  test("serves landing page with strict security headers and zero uncaught runtime errors", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    const headers = response!.headers();
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();

    await expect(page.locator("body")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("serves valid PWA manifest.json, instant white pwa-launch.html shell, uncached sw.js, and offline.html fallback", async ({
    request,
  }) => {
    const manifestRes = await request.get("/manifest.json");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toContain("/dashboard");
    expect(manifest.background_color).toBe("#ffffff");
    expect(manifest.theme_color).toBe("#ffffff");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const launchRes = await request.get("/pwa-launch.html");
    expect(launchRes.status()).toBe(200);
    const launchHtml = await launchRes.text();
    expect(launchHtml).toContain("background-color: #ffffff");
    expect(launchHtml).toContain("color-scheme: only light");
    expect(launchHtml).toContain("apple-touch-startup-image");
    expect(launchHtml).toContain("prefers-color-scheme: dark");
    expect(launchHtml).toContain("zera");
    expect(launchHtml).toContain(".id");

    const swRes = await request.get("/sw.js");
    expect(swRes.status()).toBe(200);
    expect(swRes.headers()["cache-control"]).toContain("no-store");

    const offlineRes = await request.get("/offline.html");
    expect(offlineRes.status()).toBe(200);
    expect(await offlineRes.text()).toContain("html");
  });

  test("exposes /api/health readiness endpoint with no-store header", async ({ request }) => {
    const healthRes = await request.get("/api/health");
    expect([200, 503]).toContain(healthRes.status());
    expect(healthRes.headers()["cache-control"]).toContain("no-store");
    const body = await healthRes.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["up", "down"]).toContain(body.db);
    expect(typeof body.latencyMs).toBe("number");
  });

  test("registers Service Worker in real Chromium without ever caching /api, /admin, or /dashboard", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Trigger API & protected route requests so SW fetch listener observes them
    await page.request.get("/api/health");
    await page.goto("/admin", { waitUntil: "domcontentloaded" });

    // Wait briefly for SW activation if supported on localhost/127.0.0.1
    const cachedUrls = await page.evaluate(async () => {
      if ("serviceWorker" in navigator) {
        try {
          await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(resolve, 2500)),
          ]);
        } catch {
          // Ignore SW registration timing in restricted environments
        }
      }
      if (!("caches" in window)) return [];
      const names = await caches.keys();
      const urls: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        const reqs = await cache.keys();
        for (const req of reqs) {
          urls.push(new URL(req.url).pathname);
        }
      }
      return urls;
    });

    for (const pathname of cachedUrls) {
      expect(pathname.startsWith("/api/")).toBe(false);
      expect(pathname.startsWith("/admin")).toBe(false);
      expect(pathname.startsWith("/dashboard")).toBe(false);
      expect(pathname.startsWith("/uploads/")).toBe(false);
    }
  });
});
