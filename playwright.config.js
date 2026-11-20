// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * ============================================================
 * PLAYWRIGHT CONFIG — The single source of truth for all tests
 * ============================================================
 *
 * INTERVIEW CONCEPT: "Walk me through your Playwright config"
 *
 * This file controls:
 *  1. WHERE tests live (testDir)
 *  2. HOW LONG they're allowed to run (timeout)
 *  3. WHAT happens on failure (screenshot, video, trace)
 *  4. WHICH browsers to run on (projects)
 *  5. HOW the app is started before tests (webServer)
 *
 * Think of this like a `.eslintrc` but for your test runner.
 */

module.exports = defineConfig({
  // ─── 1. WHERE ARE TESTS ────────────────────────────────────────
  // Playwright scans this folder recursively for *.spec.js files
  testDir: './tests/specs',

  // ─── 2. TIMEOUTS ───────────────────────────────────────────────
  // Global timeout per individual test (not the whole suite).
  // If a test takes longer than 30s it's marked as failed.
  // For Web3: transactions + IPFS uploads can be slow → keep this generous.
  timeout: 30_000,

  // expect() assertion timeout — how long to wait for a locator to match.
  // e.g. await expect(page.locator('.modal')).toBeVisible() waits up to 5s
  expect: {
    timeout: 5_000,
  },

  // ─── 3. RETRIES ────────────────────────────────────────────────
  // On CI: retry each failing test up to 2 times before marking it failed.
  // Why? Network blips, slow RPC nodes, timing issues in Web3 apps cause
  // "flaky" tests that fail randomly — retries reduce false alarms.
  // Locally: 0 retries = instant feedback during development.
  retries: process.env.CI ? 2 : 0,

  // ─── 4. PARALLELISM ────────────────────────────────────────────
  // fullyParallel: true → each test FILE runs in its own worker simultaneously.
  // Individual tests within one file still run sequentially (safe default).
  // On CI: cap at 2 workers to avoid overloading the CI container.
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // ─── 5. REPORTERS ──────────────────────────────────────────────
  // Multiple reporters can run simultaneously:
  //  - html:  Beautiful visual report at tests/reports/index.html
  //           Open it with: npx playwright show-report tests/reports
  //           GREAT for attaching to bug reports (the JD mentions screenshots/recordings)
  //  - list:  Simple line-by-line output in the terminal
  reporter: [
    ['html', { open: 'never', outputFolder: 'tests/reports' }],
    ['list'],
  ],

  // ─── 6. SHARED USE OPTIONS (apply to all projects/browsers) ────
  use: {
    // The base URL — all page.goto('/launch') calls resolve to http://localhost:3000/launch
    baseURL: 'http://localhost:3000',

    // headless: true = no visible browser window (runs in background).
    // Set to false locally when debugging a failing test: you'll see the browser.
    headless: true,

    // SCREENSHOT: captured automatically on test failure.
    // The image is embedded in the HTML report.
    // For the JD: "Find bugs with screenshots" — this is automatic!
    screenshot: 'only-on-failure',

    // VIDEO: Playwright records a video of every test run.
    // 'retain-on-failure' means only keep the video if the test fails.
    // For the JD: "recordings" for bug reports — Playwright does this for free.
    video: 'retain-on-failure',

    // TRACE: Records every action, DOM snapshot, network request, and console log.
    // 'on-first-retry' = only trace the first retry of a flaky test.
    // View with: npx playwright show-trace trace.zip
    // This is like a black box recorder for failed tests.
    trace: 'on-first-retry',
  },

  // ─── 7. BROWSER PROJECTS ───────────────────────────────────────
  // Each project is a separate browser/device combo.
  // The JD says "test across browsers and devices" — add more projects here.
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment these to expand coverage (requires: npx playwright install):
    // {
    //   name: 'Desktop Firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'Desktop Safari',
    //   use: { ...devices['Desktop Safari'] },
    //   // Note: Safari uses WebKit engine, NOT actual Safari binary
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    //   // Tests the app on a 393×851 mobile viewport
    // },
  ],

  // ─── 8. WEB SERVER (auto-start the app) ────────────────────────
  // Playwright will run this command and wait for the URL to respond
  // before it starts any tests. You don't need to manually run `npm start`.
  //
  // reuseExistingServer: !CI means:
  //   - Locally: if you already started the dev server, reuse it (fast)
  //   - On CI: always start fresh (reliable)
  //
  // The frontend uses react-app-rewired (not plain react-scripts),
  // so we run `npm start` from the ./frontend directory.
  webServer: {
    command: 'npm start',
    cwd: './frontend',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // CRA can be slow to compile the first time
    // stdout/stderr from the dev server are silenced during tests.
    // Set env var PLAYWRIGHT_WEBSERVER_VERBOSE=1 to see them.
  },
});
