import { test, expect } from '@playwright/test';

test.describe('Rhythm Tapper Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/rhythm');
    });

    test('renders Rhythm Tapper heading', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Rhythm Tapper');
    });

    test('displays subtitle with tap instruction', async ({ page }) => {
        await expect(page.locator('.page__subtitle')).toContainText('Tap in time with the beat');
    });

    test('displays metronome controls', async ({ page }) => {
        const slider = page.locator('input[type="range"]');
        await expect(slider).toBeVisible();

        const toggleButton = page.getByRole('button', { name: /start|play/i });
        await expect(toggleButton).toBeVisible();
    });

    test('displays beat indicator', async ({ page }) => {
        await expect(page.locator('.beat-indicator')).toBeVisible();
    });

    test('displays tap zone', async ({ page }) => {
        await expect(page.locator('.tap-zone')).toBeVisible();
    });

    test('shows initial rhythm stats at zero', async ({ page }) => {
        const stats = page.locator('.rhythm-stats');
        await expect(stats).toContainText('Accuracy: 0%');
        await expect(stats).toContainText('Taps: 0');
        await expect(stats).toContainText('Silence Violations: 0');
    });

    test('start button starts the metronome', async ({ page }) => {
        await page.getByRole('button', { name: /start|play/i }).click();
        await expect(page.getByRole('button', { name: /stop/i })).toBeVisible();
    });

    test('tapping the tap zone registers a tap', async ({ page }) => {
        // Start the metronome first
        await page.getByRole('button', { name: /start|play/i }).click();

        // Wait a moment for the metronome to start
        await page.waitForTimeout(200);

        // Tap the tap zone
        await page.locator('.tap-zone').click();

        // Taps count should increase
        const stats = page.locator('.rhythm-stats');
        await expect(stats).toContainText('Taps: 1');
    });

    test('reset button appears after stopping with taps', async ({ page }) => {
        // Start metronome
        await page.getByRole('button', { name: /start|play/i }).click();
        await page.waitForTimeout(200);

        // Tap
        await page.locator('.tap-zone').click();

        // Stop metronome
        await page.getByRole('button', { name: /stop/i }).click();

        // Reset button should appear
        await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    });
});
