const { test, expect } = require('@playwright/test');

test.describe('Assamese Dubbing Pipeline', () => {

  test('homepage loads with pipeline visualization', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Assamese Video Dubbing/);
    await expect(page.locator('h1')).toContainText('Assamese Video Dubbing');

    // Pipeline step elements should be visible
    await expect(page.locator('#step-transcribe')).toBeVisible();
    await expect(page.locator('#step-translate')).toBeVisible();
    await expect(page.locator('#step-synthesize')).toBeVisible();
    await expect(page.locator('#step-lipsync')).toBeVisible();
    await expect(page.locator('#step-mix')).toBeVisible();
  });

  test('tab switching between Upload, URL, and Demo', async ({ page }) => {
    await page.goto('/');

    // Upload panel visible by default
    await expect(page.locator('#panel-upload')).toBeVisible();
    await expect(page.locator('#panel-url')).not.toBeVisible();
    await expect(page.locator('#panel-demo')).not.toBeVisible();

    // Switch to URL tab
    await page.click('#tab-url');
    await expect(page.locator('#panel-url')).toBeVisible();
    await expect(page.locator('#panel-upload')).not.toBeVisible();

    // Switch to Demo tab
    await page.click('#tab-demo');
    await expect(page.locator('#panel-demo')).toBeVisible();
    await expect(page.locator('#panel-url')).not.toBeVisible();

    // Switch back to Upload
    await page.click('#tab-upload');
    await expect(page.locator('#panel-upload')).toBeVisible();
  });

  test('file upload shows file info', async ({ page }) => {
    await page.goto('/');

    // Create a small test file in the browser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#uploadZone');
    const fileChooser = await fileChooserPromise;

    // Create a minimal WAV in memory
    const fs = require('fs');
    const wavPath = '/tmp/test_pipeline.wav';
    const buffer = createTestWav();
    fs.writeFileSync(wavPath, buffer);
    await fileChooser.setFiles(wavPath);

    // File info should be visible
    await expect(page.locator('#fileInfo')).toBeVisible();
    await expect(page.locator('#fileName')).toContainText('test_pipeline.wav');
  });

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('config endpoint returns provider info', async ({ request }) => {
    const response = await request.get('/api/config');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.mode).toBeDefined();
    expect(data.providers).toBeDefined();
    expect(data.providers.transcription).toBeDefined();
    expect(data.providers.translation).toBeDefined();
    expect(data.providers.synthesis).toBeDefined();
    expect(data.voices).toBeDefined();
  });

  test('demo mode pipeline runs without API keys', async ({ page }) => {
    await page.goto('/');

    // Switch to demo tab
    await page.click('#tab-demo');

    // Run pipeline
    await page.click('#btnRun');

    // Wait for results to appear
    await expect(page.locator('#results')).toBeVisible({ timeout: 30000 });

    // Should show timing
    await expect(page.locator('#resultsTime')).toContainText('Completed');

    // Should have stage cards
    const stageCards = page.locator('.stage-card');
    await expect(stageCards).toHaveCount(5);
  });

  test('pipeline with file upload and live Sarvam API', async ({ page }) => {
    // Skip if no API key
    if (!process.env.SARVAM_API_KEY) {
      test.skip();
      return;
    }

    await page.goto('/');

    // Upload test audio
    const fs = require('fs');
    const wavPath = '/tmp/test_sarvam.wav';
    fs.writeFileSync(wavPath, createTestWav());

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('#uploadZone');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(wavPath);

    // Run pipeline
    await page.click('#btnRun');

    // Wait for results
    await expect(page.locator('#results')).toBeVisible({ timeout: 90000 });
    await expect(page.locator('#resultsTime')).toContainText('Completed');
  });
});

// Helper: generate a minimal 16kHz mono WAV (2 seconds, 440Hz tone)
function createTestWav() {
  const sampleRate = 16000;
  const seconds = 2;
  const numSamples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.floor(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 3000);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }
  return buffer;
}
