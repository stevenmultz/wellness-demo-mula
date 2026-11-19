import { expect, test } from "@playwright/test";

test.describe("Mobile PWA Admin Desktop-Required Guard", () => {
  test("redirects mobile devices visiting /admin to /admin/desktop-required without redirect loop", async ({
    page,
  }) => {
    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/admin\/desktop-required$/);
    await expect(page.getByRole("heading", { name: /desktop browser required/i })).toBeVisible();
    await expect(page.locator('a[href="/admin?forceDesktop=true"]')).toBeVisible();
  });
});
