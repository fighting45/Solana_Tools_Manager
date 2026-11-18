// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * PLAYWRIGHT CONFIG — Interview concept: "What does your config do?"
 *
 * Key settings to know:
 *  - webServer: Playwright starts the frontend dev server automatically before tests run
 *  - screenshot/video: Captured on failure — this is what QA engineers attach to bug reports
 *  - trace: Records every click/network call on retry — use `npx playwright show-trace` to debug
 *  - reuseExistingServer: Don't restart if already running locally (saves time during dev)
 */
module.exports = defineConfig({
  testDir: './tests/specs',

  // Max time for a single test to complete
  timeout: 30_000,

  // On CI: retry failed tests 2x (flaky network etc). Locally: 0 retries = fast feedback
  retries: process.env.CI ? 2 : 0,

  // Run test files in parallel, but tests within a file run sequentially
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    // HTML report at tests/reports/index.html — open with: npx playwright show-report tests/reports
    ['html', { open: 'never', outputFolder: 'tests/reports' }],
    // List reporter = live output in terminal
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,

    // VERY IMPORTANT for Web3 QA bug reports: screenshot + video on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to also run on Firefox and Safari:
    // { name: 'Firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'Safari',  use: { ...devices['Desktop Safari'] }  },
  ],

  // Playwright will auto-start the frontend dev server.
  // reuseExistingServer: true means if you already ran `npm start` in frontend/, it won't start another.
  webServer: {
    command: 'npm start',
    cwd: './frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
