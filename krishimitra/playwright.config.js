// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
        },
      },
    },
  ],
  webServer: {
    command: 'node server.js',
    cwd: './server',
    port: 3001,
    env: {
      PORT: '3001',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
