import { test, expect } from "@playwright/test";

test.describe("Dashboard — acceptance tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("radio", { name: /Student/i }).click();
    await page.getByRole("button", { name: /Start as student/i }).click();
    await page.waitForURL("/dashboard");
  });

  test("shows module grid with 10 modules", async ({ page }) => {
    const cards = page.locator("a[href^='/modules/']");
    await expect(cards).toHaveCount(10);
  });

  test("shows overall progress bar", async ({ page }) => {
    await expect(page.locator("text=Course completion")).toBeVisible();
  });

  test("shows continue CTA for first module", async ({ page }) => {
    await expect(page.getByText("Continue where you left off")).toBeVisible();
  });
});
