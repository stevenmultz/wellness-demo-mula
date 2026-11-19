import { expect, test } from "@playwright/test";

test.describe("Desktop Auth Redirects & Public Navigation", () => {
  test("redirects unauthenticated desktop user from /admin and /dashboard to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/\?auth=signin&target=admin/);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/\?auth=signin&target=dashboard/);
  });

  test("renders public marketing pages (/about, /programs) and Auth modal tabs without error", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const aboutRes = await page.goto("/about", { waitUntil: "domcontentloaded" });
    expect(aboutRes?.status()).toBe(200);

    const programsRes = await page.goto("/programs", { waitUntil: "domcontentloaded" });
    expect(programsRes?.status()).toBe(200);

    // Open sign-in screen via query param and verify the clean 2-button Email / Google entry
    await page.goto("/?auth=signin", { waitUntil: "networkidle" });
    await expect(page.locator("[data-theme-mounted='true']")).toBeAttached({ timeout: 15_000 });
    const emailSignInBtn = page.getByRole("button", { name: /sign in with email/i });
    const googleSignInLink = page.getByRole("link", { name: /sign in with google/i });
    await expect(emailSignInBtn).toBeVisible();
    await expect(googleSignInLink).toBeVisible();

    // Tapping "Sign in with Email" reveals the email input
    await emailSignInBtn.click();
    await expect(page.getByPlaceholder("Enter your email")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test("blocks unauthenticated access to protected APIs (/api/explore/programs, /api/media/signed)", async ({
    request,
  }) => {
    const exploreRes = await request.get("/api/explore/programs");
    expect(exploreRes.status()).toBe(401);

    const mediaRes = await request.get(
      `/api/media/signed?path=${encodeURIComponent("sb://workout-media/u1/private.webp")}`
    );
    expect([401, 500]).toContain(mediaRes.status());
    expect(mediaRes.status()).not.toBe(200);
    expect(mediaRes.status()).not.toBe(302);
  });
});
