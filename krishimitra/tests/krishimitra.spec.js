// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('KrishiMitra Core E2E', () => {

  test('page loads with welcome card and correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/KrishiMitra/);

    const welcomeCard = page.locator('#welcomeCard');
    await expect(welcomeCard).toBeVisible();
    await expect(welcomeCard).toContainText('KrishiMitra');
  });

  test('status bar shows connection status with database info', async ({ page }) => {
    await page.goto('/');

    const statusPill = page.locator('#statusPill');
    await expect(statusPill).toBeVisible();

    // Wait for the health check to complete — status text should update from "Connecting..."
    const statusText = page.locator('#statusText');
    await expect(statusText).not.toHaveText('Connecting...', { timeout: 15000 });

    // Should mention crops count or market prices (database info)
    const text = await statusText.textContent();
    expect(text).toMatch(/crops|market prices|फसलें|मंडी भाव/i);
  });

  test('form has all dropdowns populated', async ({ page }) => {
    await page.goto('/');

    // District dropdown
    const district = page.locator('#district');
    await expect(district).toBeVisible();
    const districtOptions = district.locator('option');
    await expect(districtOptions).toHaveCount(10);

    // Soil type dropdown
    const soil = page.locator('#soilType');
    await expect(soil).toBeVisible();
    const soilOptions = soil.locator('option');
    expect(await soilOptions.count()).toBeGreaterThanOrEqual(4);

    // Crop dropdown
    const crop = page.locator('#crop');
    await expect(crop).toBeVisible();
    const cropOptions = crop.locator('option');
    expect(await cropOptions.count()).toBeGreaterThanOrEqual(5);

    // Farm size dropdown
    const farmSize = page.locator('#farmSize');
    await expect(farmSize).toBeVisible();
    const farmSizeOptions = farmSize.locator('option');
    expect(await farmSizeOptions.count()).toBeGreaterThanOrEqual(3);

    // Irrigation dropdown
    const irrigation = page.locator('#irrigation');
    await expect(irrigation).toBeVisible();
    const irrigationOptions = irrigation.locator('option');
    expect(await irrigationOptions.count()).toBeGreaterThanOrEqual(3);
  });

  test('"Get AI Advisory" generates a response card with real data', async ({ page }) => {
    await page.goto('/');

    // Wait for server connection
    await expect(page.locator('#statusText')).not.toHaveText('Connecting...', { timeout: 15000 });

    // Select farm details
    await page.locator('#district').selectOption('Jaipur');
    await page.locator('#soilType').selectOption({ index: 0 });
    await page.locator('#crop').selectOption({ index: 0 });

    // Click "Get AI Advisory"
    await page.locator('#askBtn').click();

    // Wait for response card to appear
    const responseCard = page.locator('.response-card').first();
    await expect(responseCard).toBeVisible({ timeout: 30000 });

    // Response body should contain real data markers
    const responseBody = responseCard.locator('.response-body');
    const bodyText = await responseBody.innerHTML();

    // Should contain rupee prices (₹) from MSP/market data
    expect(bodyText).toContain('₹');

    // Should contain soil-related information
    expect(bodyText).toMatch(/soil|Soil|मिट्टी|मृदा|pH/i);
  });

  test('each quick query button works', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#statusText')).not.toHaveText('Connecting...', { timeout: 15000 });

    const queryTypes = ['pest', 'water', 'market', 'fertilizer', 'weather'];

    for (const queryType of queryTypes) {
      // Click the quick query button by its onclick attribute
      await page.locator(`button.quick-btn[onclick="quickQuery('${queryType}')"]`).click();

      // Wait for a response card to appear
      const latestCard = page.locator('.response-card').first();
      await expect(latestCard).toBeVisible({ timeout: 30000 });

      // Verify it has response content
      const body = latestCard.locator('.response-body');
      const text = await body.textContent();
      expect(text.length).toBeGreaterThan(20);
    }

    // All 5 queries should have produced response cards
    const allCards = page.locator('.response-card');
    await expect(allCards).toHaveCount(5);
  });

  test('welcome card is removed after first query', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#statusText')).not.toHaveText('Connecting...', { timeout: 15000 });

    // Welcome card should be visible initially
    await expect(page.locator('#welcomeCard')).toBeVisible();

    // Submit an advisory
    await page.locator('#askBtn').click();

    // Wait for response
    await expect(page.locator('.response-card').first()).toBeVisible({ timeout: 30000 });

    // Welcome card should be gone
    await expect(page.locator('#welcomeCard')).toHaveCount(0);
  });

  test('multiple responses stack with most recent on top', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#statusText')).not.toHaveText('Connecting...', { timeout: 15000 });

    // Submit first query — pest
    await page.locator(`button.quick-btn[onclick="quickQuery('pest')"]`).click();
    await expect(page.locator('.response-card').first()).toBeVisible({ timeout: 30000 });

    // Get first card's header text
    const firstHeader = await page.locator('.response-card').first().locator('.response-header h3').textContent();

    // Submit second query — market
    await page.locator(`button.quick-btn[onclick="quickQuery('market')"]`).click();

    // Wait for second card
    await expect(page.locator('.response-card')).toHaveCount(2, { timeout: 30000 });

    // Most recent (market) should be first, previous (pest) should be second
    const topHeader = await page.locator('.response-card').nth(0).locator('.response-header h3').textContent();
    const bottomHeader = await page.locator('.response-card').nth(1).locator('.response-header h3').textContent();

    // The top one should be the market query (submitted second)
    expect(topHeader).toMatch(/Market|मंडी/i);
    // The bottom one should be the pest query (submitted first)
    expect(bottomHeader).toMatch(/Pest|कीट/i);
  });
});
