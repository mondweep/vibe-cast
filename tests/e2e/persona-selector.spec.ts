import { test, expect } from "@playwright/test";

test.describe("Persona selector — acceptance tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/learn");
  });

  test("renders three persona options", async ({ page }) => {
    const options = page.getByRole("radio");
    await expect(options).toHaveCount(3);
  });

  test("selecting a persona shows Continue button", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Continue/i })).not.toBeVisible();
    await page.getByRole("radio", { name: /Student/i }).click();
    await expect(page.getByRole("link", { name: /Continue as student/i })).toBeVisible();
  });
});
