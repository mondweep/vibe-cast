/**
 * Playwright Global Teardown
 *
 * This file runs once after all E2E tests complete.
 * Use it to clean up test data and resources.
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('Running global E2E test teardown...');

  try {
    // Clean up test data via API
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

    const response = await fetch(`${baseURL}/api/test/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Secret': process.env.TEST_SECRET || 'test-secret',
      },
    });

    if (!response.ok) {
      console.warn('Warning: Test cleanup API returned non-OK status');
    }

    console.log('Global teardown completed successfully');
  } catch (error) {
    console.error('Error during global teardown:', error);
    // Don't throw - teardown should not fail the test run
  }
}

export default globalTeardown;
