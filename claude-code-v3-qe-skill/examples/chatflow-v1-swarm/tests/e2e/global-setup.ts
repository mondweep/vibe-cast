/**
 * Playwright Global Setup
 *
 * This file runs once before all E2E tests.
 * Use it to set up test data, authenticate users, and prepare the environment.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig): Promise<void> {
  console.log('Running global E2E test setup...');

  const { baseURL } = config.projects[0].use;

  // Wait for the application to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Health check - wait for app to be available
    let retries = 30;
    while (retries > 0) {
      try {
        await page.goto(baseURL || 'http://localhost:3000');
        console.log('Application is ready');
        break;
      } catch {
        retries--;
        if (retries === 0) {
          throw new Error('Application failed to start');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Create test user and save authentication state
    await page.goto(`${baseURL}/api/test/setup`);

    // Login as test user and save auth state
    await page.goto(`${baseURL}/login`);
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');

    // Save authentication state
    await page.context().storageState({ path: './tests/e2e/.auth/user.json' });

    console.log('Global setup completed successfully');
  } finally {
    await browser.close();
  }
}

export default globalSetup;
