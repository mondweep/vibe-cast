// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('KrishiMitra Hindi Language Tests', () => {

  test('click Hindi button changes tagline to Hindi', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify English tagline first
    const tagline = page.locator('#tagline');
    await expect(tagline).toHaveText("The Farmer's AI Companion");

    // Click Hindi button
    await page.locator('#langHi').click();

    // Tagline should change to Hindi
    await expect(tagline).toHaveText('किसान का AI साथी');
  });

  test('form labels change to Hindi', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#langHi').click();

    // Check several form labels for Hindi text using data-hi attributes
    // District label
    const districtLabel = page.locator('label[data-hi="जिला"]');
    await expect(districtLabel).toHaveText('जिला');

    // Soil Type label
    const soilLabel = page.locator('label[data-hi="मिट्टी का प्रकार"]');
    await expect(soilLabel).toHaveText('मिट्टी का प्रकार');

    // Irrigation label
    const irrigationLabel = page.locator('label[data-hi="सिंचाई"]');
    await expect(irrigationLabel).toHaveText('सिंचाई');

    // Farm Size label
    const farmSizeLabel = page.locator('label[data-hi="खेत का आकार (बीघा)"]');
    await expect(farmSizeLabel).toHaveText('खेत का आकार (बीघा)');

    // The "Get AI Advisory" button text
    const btnText = page.locator('#askBtn span[data-hi="AI सलाह प्राप्त करें"]');
    await expect(btnText).toHaveText('AI सलाह प्राप्त करें');
  });

  test('quick query buttons show Hindi text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('#langHi').click();

    // Check quick query button labels in Hindi
    const pestBtn = page.locator('.qlabel[data-hi="कीट एवं रोग चेतावनी"]');
    await expect(pestBtn).toHaveText('कीट एवं रोग चेतावनी');

    const waterBtn = page.locator('.qlabel[data-hi="सिंचाई अनुसूची"]');
    await expect(waterBtn).toHaveText('सिंचाई अनुसूची');

    const marketBtn = page.locator('.qlabel[data-hi="मंडी भाव"]');
    await expect(marketBtn).toHaveText('मंडी भाव');

    const fertBtn = page.locator('.qlabel[data-hi="उर्वरक सिफारिश"]');
    await expect(fertBtn).toHaveText('उर्वरक सिफारिश');

    const weatherBtn = page.locator('.qlabel[data-hi="मौसम प्रभाव सलाह"]');
    await expect(weatherBtn).toHaveText('मौसम प्रभाव सलाह');
  });

  test('submit advisory in Hindi returns Hindi response', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#statusText')).not.toHaveText('Connecting...', { timeout: 15000 });

    // Switch to Hindi
    await page.locator('#langHi').click();

    // Submit advisory
    await page.locator('#askBtn').click();

    // Wait for response card
    const responseCard = page.locator('.response-card').first();
    await expect(responseCard).toBeVisible({ timeout: 30000 });

    // The response should contain Hindi text (Devanagari characters)
    const responseBody = responseCard.locator('.response-body');
    const bodyHtml = await responseBody.innerHTML();

    // Hindi fallback response contains Hindi characters like क्विंटल, मृदा, सलाह, etc.
    expect(bodyHtml).toMatch(/[\u0900-\u097F]/);
  });

  test('toggle back to English works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Switch to Hindi
    await page.locator('#langHi').click();
    await expect(page.locator('#tagline')).toHaveText('किसान का AI साथी');

    // Switch back to English
    await page.locator('#langEn').click();
    await expect(page.locator('#tagline')).toHaveText("The Farmer's AI Companion");

    // Labels should be back in English
    const districtLabel = page.locator('label[data-en="District"]');
    await expect(districtLabel).toHaveText('District');

    const btnText = page.locator('#askBtn span[data-en="Get AI Advisory"]');
    await expect(btnText).toHaveText('Get AI Advisory');
  });
});
