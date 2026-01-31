import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for ChatFlow E2E tests
 *
 * Run all tests: npx playwright test
 * Run specific file: npx playwright test tests/e2e/messaging.spec.ts
 * Run with UI: npx playwright test --ui
 * Debug mode: PWDEBUG=1 npx playwright test
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file patterns
  testMatch: '**/*.spec.ts',

  // Parallel execution
  fullyParallel: true,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // Retry configuration
  retries: process.env.CI ? 2 : 0,

  // Worker configuration
  workers: process.env.CI ? 4 : undefined,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
  ],

  // Global timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.1,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.01,
    },
  },

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Artifacts
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,
    navigationTimeout: 15000,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/New_York',

    // Geolocation permissions
    permissions: ['notifications'],

    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en',
    },
  },

  // Project-specific configurations
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },

    // Accessibility tests
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/accessibility.spec.ts',
    },

    // Performance tests
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      testMatch: '**/performance.spec.ts',
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/chatflow_test',
      REDIS_URL: process.env.TEST_REDIS_URL || 'redis://localhost:6380',
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/e2e-artifacts',

  // Snapshot directory
  snapshotDir: 'tests/e2e/__snapshots__',

  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
});
