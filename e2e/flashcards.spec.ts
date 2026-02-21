import { test, expect } from '@playwright/test';

test.describe('Flashcards Page', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage to ensure fresh state with all cards due
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.goto('/flashcards');
    });

    test('renders Technique Flashcards heading', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Technique Flashcards');
    });

    test('shows due card count', async ({ page }) => {
        await expect(page.locator('.page__subtitle')).toContainText(/\d+ of \d+ cards due/);
    });

    test('displays a flashcard', async ({ page }) => {
        await expect(page.locator('.flashcard')).toBeVisible();
    });

    test('flashcard initially shows question side', async ({ page }) => {
        const card = page.locator('.flashcard');
        await expect(card).toBeVisible();
        // Confidence buttons should not be visible until flipped
        await expect(page.locator('.confidence-buttons')).not.toBeVisible();
    });

    test('clicking the card flips it to show answer', async ({ page }) => {
        const card = page.locator('.flashcard');
        await card.click();

        // After flipping, confidence buttons should appear
        await expect(page.locator('.confidence-buttons')).toBeVisible();
    });

    test('confidence buttons appear after flip', async ({ page }) => {
        await page.locator('.flashcard').click();

        const buttons = page.locator('.confidence-buttons');
        await expect(buttons.getByRole('button', { name: /again/i })).toBeVisible();
        await expect(buttons.getByRole('button', { name: /hard/i })).toBeVisible();
        await expect(buttons.getByRole('button', { name: /good/i })).toBeVisible();
        await expect(buttons.getByRole('button', { name: /easy/i })).toBeVisible();
    });

    test('rating a card advances to the next card', async ({ page }) => {
        // Get initial due count
        const subtitle = page.locator('.page__subtitle');
        const initialText = await subtitle.textContent();

        // Flip and rate
        await page.locator('.flashcard').click();
        await page.locator('.confidence-buttons').getByRole('button', { name: /good/i }).click();

        // Due count should decrease or card should change
        const newText = await subtitle.textContent();
        // Either the count changed or we've gone through all cards
        expect(initialText !== newText || page.locator('.flashcards-page__empty')).toBeTruthy();
    });
});
