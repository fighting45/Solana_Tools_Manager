/**
 * ============================================================
 * SMOKE TESTS — Does the app even load?
 * ============================================================
 *
 * WHAT ARE SMOKE TESTS?
 * The first layer of testing. Named after hardware testing — if you
 * plug in a circuit and it smokes, there's no point testing anything else.
 *
 * In software: "Does the app start? Do the main pages load without crashing?"
 *
 * CHARACTERISTICS:
 *  - Very fast (< 2 seconds each)
 *  - No wallet needed
 *  - No form filling
 *  - Just: navigate → assert visible elements
 *
 * RUN FIRST in CI — if smoke tests fail, skip everything else.
 * They catch: broken builds, missing routes, JS crashes, 500 errors.
 *
 * INTERVIEW TALKING POINT:
 * "My test suite starts with smoke tests. They run in under 30 seconds
 *  and confirm the deployment is healthy before running deeper tests.
 *  In a Web3 app, a smoke test also confirms the wallet adapter loaded
 *  without throwing a JS error."
 */

const { test, expect } = require('@playwright/test');
const HomePage = require('../pages/HomePage');
const { LaunchPage } = require('../pages/LaunchPage');

// test.describe() groups related tests together.
// The string label appears in the test report as a section header.
test.describe('Smoke Tests — App loads and routes work', () => {

  // ── HOMEPAGE ───────────────────────────────────────────────────

  test('homepage loads and shows hero section', async ({ page }) => {
    // ARRANGE: Create the page object
    const home = new HomePage(page);

    // ACT: Navigate to the homepage
    await home.goto();

    // ASSERT: Core elements are visible
    // toBeVisible() = element exists in DOM AND is not hidden (display:none, opacity:0 etc.)
    await expect(home.heroTitle).toBeVisible();
    await expect(home.launchButton).toBeVisible();

    // toHaveTitle() checks the <title> tag in <head>
    // /ProgrammX|Token/i is a regex — matches either word, case-insensitive
    await expect(page).toHaveTitle(/ProgrammX|Token/i);
  });

  test('hero title contains expected copy', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // toContainText() does a substring match — doesn't need to match exactly.
    // This is intentional: if the copy changes slightly ("solution for"→"platform for"),
    // we don't want 20 tests to break. We only assert the distinctive part.
    await expect(home.heroTitle).toContainText('all-in-one solution');
  });

  test('stats section is visible with numbers', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // The stats section should be visible
    await expect(home.statsSection).toBeVisible();

    // We should have at least 1 stat number — not asserting exact value
    // because "857+" changes over time. We just confirm the section renders.
    const stats = await home.getStatNumbers();
    expect(stats.length).toBeGreaterThan(0);
  });

  test('services section shows exactly 3 service cards', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // toHaveCount() asserts the number of matching elements.
    // If a card is accidentally removed, this test catches it immediately.
    await expect(home.serviceCards).toHaveCount(3);
  });

  test('network badge shows "Solana"', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // This is a smoke test for a critical Web3 UI element:
    // "Solana" badge confirms the app is configured for the right network.
    // If someone accidentally switched it to Ethereum, this would catch it.
    await expect(home.networkBadge).toContainText('Solana');
  });

  test('wallet connect button is visible', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // The wallet-adapter button renders even without a wallet installed.
    // If this is NOT visible, the wallet-adapter library failed to load.
    await expect(home.walletButton).toBeVisible();
  });

  // ── NAVIGATION ─────────────────────────────────────────────────

  test('"Launch App" button navigates to /launch', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // clickLaunchApp() internally calls waitForURL — we just assert the final URL
    await home.clickLaunchApp();

    // toHaveURL() uses string or regex. '/' means: URL path contains '/launch'
    await expect(page).toHaveURL(/\/launch/);
  });

  test('navbar "Launch Token" link navigates to /launch', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    // This tests a DIFFERENT navigation path to the same destination.
    // Both paths should work — this is a regression guard.
    await home.clickNavLaunchToken();
    await expect(page).toHaveURL(/\/launch/);
  });

  test('logo link on /launch goes back to homepage', async ({ page }) => {
    // Start on /launch, click the logo, end up on /
    await page.goto('/launch');
    await page.locator('.logo-text').click();
    await expect(page).toHaveURL('/');
  });

  // ── LAUNCH PAGE STRUCTURE ──────────────────────────────────────

  test('/launch page loads and shows the token minter', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.goto();

    // The wrapper div being visible confirms React rendered the component
    // without a JS crash (which would show a blank white page instead)
    await expect(page.locator('.token-minter-wrapper')).toBeVisible();
    await expect(launch.mintButton).toBeVisible();
    await expect(launch.tokenNameInput).toBeVisible();
  });

  test('/launch shows both token type buttons', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.goto();

    await expect(launch.splTokenBtn).toBeVisible();
    await expect(launch.token2022Btn).toBeVisible();
  });

  test('direct navigation to /launch works (no 404)', async ({ page }) => {
    // This confirms React Router handles deep links correctly.
    // If the server isn't configured for SPA routing, /launch would 404.
    const response = await page.goto('/launch');

    // The page response itself should be 200 (or 304 cached)
    expect(response.status()).toBeLessThan(400);
  });

});
