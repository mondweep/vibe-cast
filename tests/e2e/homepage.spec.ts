import { test, expect } from "@playwright/test";

test.describe("Homepage — acceptance tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays course title and call to action", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Master AWS Networking");
    await expect(page.getByRole("link", { name: /Start Learning/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Browse Modules/i })).toBeVisible();
  });

  test("shows all 10 module cards", async ({ page }) => {
    const cards = page.locator("main section").last().locator("a");
    await expect(cards).toHaveCount(10);
  });

  test("clicking Start Learning navigates to /learn", async ({ page }) => {
    await page.getByRole("link", { name: /Start Learning/i }).click();
    await expect(page).toHaveURL("/learn");
  });
});
