import { expect, test, type Page } from "@playwright/test";

const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL || "budi@wellness.test";
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD || "UserBudi123!";
const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || "superadmin@wellness.test";
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";

async function signInViaForm(page: Page, path: string, email: string, password: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  // Wait for client hydration so React button clicks and controlled inputs work reliably
  await expect(page.locator("[data-theme-mounted='true']")).toBeAttached({ timeout: 15_000 });

  const emailChoiceBtn = page.getByRole("button", { name: /sign in with email/i });
  await expect(emailChoiceBtn).toBeVisible({ timeout: 15_000 });
  await emailChoiceBtn.click();

  const usePasswordBtn = page.getByRole("button", { name: /use password instead|gunakan kata sandi/i });
  await expect(usePasswordBtn).toBeVisible({ timeout: 10_000 });
  await usePasswordBtn.click();

  const emailInput = page.getByPlaceholder("Enter your email");
  const passwordInput = page.getByPlaceholder("Enter your password");
  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  await expect(passwordInput).toHaveValue(password);
  await page.locator('form button[type="submit"]').first().click();
}

test.describe("Authenticated Full Journeys (Real Cookie, RBAC & Live SSR)", () => {
  test.describe.configure({ mode: "serial", timeout: 45_000 });

  test.beforeEach(async ({ request }) => {
    let dbUp = false;
    for (let attempt = 0; attempt < 2 && !dbUp; attempt++) {
      const health = await request.get("/api/health");
      const json = (await health.json().catch(() => null)) as { db?: string } | null;
      if (json?.db === "up") dbUp = true;
    }
    if (!dbUp) {
      if (process.env.E2E_REQUIRE_DB === "true") {
        throw new Error("E2E_REQUIRE_DB=true but /api/health reported database is down.");
      }
      test.skip(true, "Skipping live-DB authenticated E2E because local database is offline.");
    }
  });

  test("Member login sets HttpOnly cookie, loads /dashboard, allows /api/explore/programs, and blocks /admin escalation", async ({
    page,
    context,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await signInViaForm(page, "/?auth=signin", MEMBER_EMAIL, MEMBER_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    // Verify real HttpOnly session cookie (must exist in browser jar, must NOT be readable by JS)
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "wellness_session");
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);

    const jsReadableCookies = await page.evaluate(() => document.cookie);
    expect(jsReadableCookies).not.toContain("wellness_session");

    // Authenticated API succeeds
    const exploreRes = await page.request.get("/api/explore/programs");
    expect(exploreRes.status()).toBe(200);
    const exploreJson = await exploreRes.json();
    expect(exploreJson.success).toBe(true);

    // Reloading /dashboard preserves authenticated session
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard/);

    // Privilege Escalation Check: Regular USER visiting /admin MUST be bounced back to /dashboard
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\?error=unauthorized_admin/);

    expect(pageErrors).toEqual([]);
  });

  test("Superadmin login loads /admin Desktop Console with strict anti-cache headers and locks out after session clear", async ({
    page,
    context,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await signInViaForm(page, "/?auth=signin&target=admin", ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });

    // Re-request /admin directly and verify anti-cache & security headers on live response
    const adminRes = await page.goto("/admin", { waitUntil: "domcontentloaded" });
    expect(adminRes?.status()).toBe(200);
    expect(adminRes?.headers()["cache-control"]).toContain("no-store");
    expect(adminRes?.headers()["x-frame-options"]).toBe("DENY");

    // Verify cookie is HttpOnly
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "wellness_session");
    expect(sessionCookie?.httpOnly).toBe(true);

    // Clearing cookies immediately revokes access to /admin
    await context.clearCookies();
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/\?auth=signin&target=admin/);

    expect(pageErrors).toEqual([]);
  });
});
