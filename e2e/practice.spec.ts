import { test, expect } from '@playwright/test';

test.describe('Practice Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('renders Practice Mode heading and subtitle', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Practice Mode');
        await expect(page.locator('.page__subtitle')).toContainText('Metronome + chord progression synchronized');
    });

    test('displays metronome controls', async ({ page }) => {
        // BPM display/input should be visible
        const bpmInput = page.locator('input[type="range"]');
        await expect(bpmInput).toBeVisible();

        // Start/Play button should be visible
        const toggleButton = page.getByRole('button', { name: /start|play/i });
        await expect(toggleButton).toBeVisible();
    });

    test('default BPM is 80', async ({ page }) => {
        // Look for text showing the BPM value
        await expect(page.locator('.metronome-controls')).toContainText('80');
    });

    test('BPM slider changes displayed BPM', async ({ page }) => {
        const slider = page.locator('input[type="range"]');
        await slider.fill('120');
        await expect(page.locator('.metronome-controls')).toContainText('120');
    });

    test('start/stop button toggles metronome state', async ({ page }) => {
        const toggleButton = page.getByRole('button', { name: /start|play/i });
        await toggleButton.click();
        // After clicking, button text should change to Stop
        await expect(page.getByRole('button', { name: /stop/i })).toBeVisible();

        // Click again to stop
        await page.getByRole('button', { name: /stop/i }).click();
        await expect(page.getByRole('button', { name: /start|play/i })).toBeVisible();
    });

    test('beat indicator is present', async ({ page }) => {
        await expect(page.locator('.beat-indicator')).toBeVisible();
    });

    test('chord progression display is present', async ({ page }) => {
        await expect(page.locator('.progression-display')).toBeVisible();
    });
});
