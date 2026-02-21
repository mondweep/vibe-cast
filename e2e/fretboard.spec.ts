import { test, expect } from '@playwright/test';

test.describe('Fretboard Drill Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/fretboard');
    });

    test('renders Fretboard Drill heading', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Fretboard Drill');
    });

    test('shows default target chord Am', async ({ page }) => {
        await expect(page.locator('.page__subtitle')).toContainText('Am');
    });

    test('displays chord selector buttons', async ({ page }) => {
        const chordNames = ['Am', 'Am9', 'C', 'D', 'Fmaj7', 'G'];
        const chordSelect = page.locator('[role="radiogroup"]');
        await expect(chordSelect).toBeVisible();

        for (const chord of chordNames) {
            await expect(chordSelect.getByRole('button', { name: chord, exact: true })).toBeVisible();
        }
    });

    test('Am button is initially active', async ({ page }) => {
        const amButton = page.locator('[role="radiogroup"] button', { hasText: 'Am' }).first();
        await expect(amButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('selecting a different chord updates target label', async ({ page }) => {
        await page.locator('[role="radiogroup"]').getByRole('button', { name: 'C', exact: true }).click();
        await expect(page.locator('.page__subtitle strong')).toHaveText('C');
    });

    test('Check Answer button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Check Answer' })).toBeVisible();
    });

    test('Reset button is present', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    });

    test('submitting empty answer shows drill result', async ({ page }) => {
        await page.getByRole('button', { name: 'Check Answer' }).click();

        const result = page.locator('.drill-result');
        await expect(result).toBeVisible();
        await expect(result).toContainText('Score:');
        await expect(result).toContainText('Correct:');
        await expect(result).toContainText('Missed:');
    });

    test('after submitting, Check Answer becomes Next Chord', async ({ page }) => {
        await page.getByRole('button', { name: 'Check Answer' }).click();
        await expect(page.getByRole('button', { name: 'Next Chord' })).toBeVisible();
    });

    test('Next Chord advances to next chord', async ({ page }) => {
        await page.getByRole('button', { name: 'Check Answer' }).click();
        await page.getByRole('button', { name: 'Next Chord' }).click();

        // After Am, next chord should be Am9
        await expect(page.locator('.page__subtitle strong')).toHaveText('Am9');
    });

    test('fretboard grid is rendered', async ({ page }) => {
        await expect(page.locator('.fretboard')).toBeVisible();
    });

    test('clicking a fret cell toggles finger placement', async ({ page }) => {
        // Use a stable locator based on aria-label (doesn't change on click)
        const fretButton = page.locator('button[aria-label="String 1, fret 1"]');
        await expect(fretButton).toHaveAttribute('aria-pressed', 'false');

        await fretButton.click();
        await expect(fretButton).toHaveAttribute('aria-pressed', 'true');

        // Click again to toggle off
        await fretButton.click();
        await expect(fretButton).toHaveAttribute('aria-pressed', 'false');
    });
});
