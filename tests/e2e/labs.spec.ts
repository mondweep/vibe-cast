import { test, expect } from "@playwright/test";

test.describe("Labs page — acceptance tests", () => {
  test("loads the labs page with three tabs", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByText("VPC Builder")).toBeVisible();
    await expect(page.getByText("BGP Simulator")).toBeVisible();
    await expect(page.getByText("Scenario Exercises")).toBeVisible();
  });

  test("VPC Builder shows default subnets", async ({ page }) => {
    await page.goto("/labs");
    await expect(page.getByText("public-1a")).toBeVisible();
    await expect(page.getByText("private-1a")).toBeVisible();
  });

  test("BGP Simulator selects a winner after running", async ({ page }) => {
    await page.goto("/labs");
    await page.getByText("BGP Simulator").click();
    await page.getByRole("button", { name: /Run BGP/i }).click();
    await expect(page.getByText("BEST PATH")).toBeVisible();
  });
});
