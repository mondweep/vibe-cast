import { test, expect } from '@playwright/test';

test.describe('Navigation & Layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('displays app header with title', async ({ page }) => {
        await expect(page.locator('h1')).toHaveText('RSD Guitar Internalizer');
    });

    test('displays streak badge in header', async ({ page }) => {
        await expect(page.locator('.header .streak-badge')).toBeVisible();
    });

    test('renders all navigation links', async ({ page }) => {
        const nav = page.locator('nav[aria-label="Main navigation"]');
        await expect(nav).toBeVisible();

        const links = ['Practice', 'Fretboard', 'Rhythm', 'Flashcards', 'Stats'];
        for (const linkText of links) {
            await expect(nav.getByText(linkText)).toBeVisible();
        }
    });

    test('Practice link is active by default', async ({ page }) => {
        const practiceLink = page.locator('nav a', { hasText: 'Practice' });
        await expect(practiceLink).toHaveClass(/nav__link--active/);
    });

    test('navigates to Fretboard page', async ({ page }) => {
        await page.getByText('Fretboard').click();
        await expect(page).toHaveURL(/\/fretboard/);
        await expect(page.locator('h2')).toHaveText('Fretboard Drill');
    });

    test('navigates to Rhythm page', async ({ page }) => {
        await page.getByText('Rhythm').click();
        await expect(page).toHaveURL(/\/rhythm/);
        await expect(page.locator('h2')).toHaveText('Rhythm Tapper');
    });

    test('navigates to Flashcards page', async ({ page }) => {
        await page.getByText('Flashcards').click();
        await expect(page).toHaveURL(/\/flashcards/);
        await expect(page.locator('h2')).toHaveText('Technique Flashcards');
    });

    test('navigates to Stats page', async ({ page }) => {
        await page.getByText('Stats').click();
        await expect(page).toHaveURL(/\/stats/);
        await expect(page.locator('h2')).toHaveText('Practice Stats');
    });

    test('navigates back to Practice page', async ({ page }) => {
        await page.getByRole('link', { name: 'Stats' }).click();
        await page.getByRole('link', { name: 'Practice' }).click();
        await expect(page).toHaveURL('/');
        await expect(page.locator('h2')).toHaveText('Practice Mode');
    });
});
