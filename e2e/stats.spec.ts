import { test, expect } from '@playwright/test';

test.describe('Stats Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/stats');
    });

    test('renders Practice Stats heading', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Practice Stats');
    });

    test('displays current streak', async ({ page }) => {
        const streakSection = page.locator('.stats-page__streak');
        await expect(streakSection).toBeVisible();

        await expect(page.locator('.stats-page__streak-current')).toBeVisible();
        await expect(page.locator('.stats-page__streak-current .stats-page__streak-label')).toHaveText('Current Streak');
    });

    test('displays best streak', async ({ page }) => {
        await expect(page.locator('.stats-page__streak-best')).toBeVisible();
        await expect(page.locator('.stats-page__streak-best .stats-page__streak-label')).toHaveText('Best Streak');
    });

    test('streak numbers are visible', async ({ page }) => {
        const currentNumber = page.locator('.stats-page__streak-current .stats-page__streak-number');
        const bestNumber = page.locator('.stats-page__streak-best .stats-page__streak-number');

        await expect(currentNumber).toBeVisible();
        await expect(bestNumber).toBeVisible();

        // Values should be numbers (0 or more)
        const currentText = await currentNumber.textContent();
        const bestText = await bestNumber.textContent();
        expect(Number(currentText)).toBeGreaterThanOrEqual(0);
        expect(Number(bestText)).toBeGreaterThanOrEqual(0);
    });

    test('displays daily progress section', async ({ page }) => {
        await expect(page.locator('.daily-progress')).toBeVisible();
    });
});
