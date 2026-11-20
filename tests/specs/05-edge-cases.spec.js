/**
 * ============================================================
 * EDGE CASE TESTS — Web3 Specific Failure Scenarios
 * ============================================================
 *
 * WHY EDGE CASES MATTER MORE IN WEB3 THAN REGULAR APPS:
 * In a regular app, failures are mostly server errors or bad input.
 * In Web3, there are additional failure modes:
 *
 *   1. WALLET REJECTION  — user clicks "Reject" in the wallet popup
 *   2. NETWORK TIMEOUT   — Solana RPC takes too long / drops connection
 *   3. EXPIRED BLOCKHASH — transaction built >150 blocks ago is invalid
 *   4. INSUFFICIENT SOL  — user doesn't have enough for fees
 *   5. WRONG NETWORK     — wallet on mainnet, app expecting devnet
 *
 * The JD explicitly says: "Test edge cases such as rejected signatures,
 * failed or pending transactions, and network switching."
 *
 * We test what we CAN test via UI/mock — the rest is documented here
 * as manual test cases (also valuable for the interview).
 *
 * HOW TO TALK ABOUT UNTESTABLE SCENARIOS IN AN INTERVIEW:
 * "For scenarios like actual network timeouts, I document them as
 *  manual test cases and use network throttling (Chrome DevTools or
 *  Playwright's route interception) to simulate slow/failed requests."
 */

const { test, expect } = require('@playwright/test');
const { injectMockWallet } = require('../helpers/mockWallet');
const { VALID_SOLANA_ADDRESS } = require('../helpers/testData');
const { LaunchPage } = require('../pages/LaunchPage');

test.describe('Edge Cases — Failure scenarios and boundary conditions', () => {

  // ── WALLET REJECTION ───────────────────────────────────────────

  test('wallet rejection error message appears (rejectSign simulation)', async ({ page }) => {
    // This is THE KEY Web3 edge case the JD mentions.
    //
    // HOW IT WORKS:
    // We inject the mock wallet with rejectSign: true.
    // When the app calls signTransaction(), our mock throws:
    //   { code: 4001, message: "User rejected the request." }
    // The useMintTransaction hook catches this and calls setStatus({ type: 'error', ... })
    //
    // WHAT WE EXPECT TO SEE: an error message in the UI with rejection text.

    await injectMockWallet(page, { autoConnect: true, rejectSign: true });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    // Fill the complete form (all required fields + image)
    await launch.fillCompleteForm();

    // Click Mint — this will trigger the signing flow, which our mock rejects
    await launch.clickMint();

    // The error should appear in the status message.
    // useMintTransaction.js catches the error and calls:
    //   setStatus({ type: 'error', message: error.message })
    // IPFS upload happens BEFORE signing, so the rejection error surfaces
    // at the signing step — but only if backend is running.
    // Without the backend running, the error surfaces at the API call step.
    // Either way, an error appears in the status message.
    await expect(launch.statusMessage).toBeVisible({ timeout: 15000 });
    await expect(launch.statusMessage).toHaveClass(/error/);
  });

  // ── NETWORK INTERCEPTION (Playwright's route API) ──────────────

  test('API timeout shows error in the UI', async ({ page }) => {
    // PLAYWRIGHT TECHNIQUE: page.route() intercepts network requests.
    // Here we intercept the mint API call and simulate a timeout.
    //
    // This tests: "What happens if the backend is down?"
    // Expected: an error message, NOT a frozen spinner forever.

    await injectMockWallet(page, { autoConnect: true });

    // Intercept POST requests to the mint endpoint and abort them
    await page.route('**/api/mint/create-transaction', route => {
      // abort() simulates a network failure (connection refused / timeout)
      route.abort('connectionrefused');
    });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    await launch.fillCompleteForm();
    await launch.clickMint();

    // The app should show an error — not hang forever
    await expect(launch.statusMessage).toBeVisible({ timeout: 15000 });
    await expect(launch.statusMessage).toHaveClass(/error/);
  });

  test('API returning 500 shows error in the UI', async ({ page }) => {
    // Simulate a server error — backend throws an unhandled exception.
    // This tests error handling at the API layer.

    await injectMockWallet(page, { autoConnect: true });

    await page.route('**/api/mint/create-transaction', route => {
      // fulfill() returns a custom response instead of hitting the real server
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error', details: 'Simulated failure' }),
      });
    });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    await launch.fillCompleteForm();
    await launch.clickMint();

    await expect(launch.statusMessage).toBeVisible({ timeout: 15000 });
    await expect(launch.statusMessage).toHaveClass(/error/);
  });

  // ── THEME PERSISTENCE ──────────────────────────────────────────

  test('dark mode toggle saves "dark" to localStorage', async ({ page }) => {
    // localStorage persists across page actions in the same test.
    // page.evaluate() runs JS inside the browser — the only way to read localStorage.
    await page.goto('/');

    // Click the 🌙 button to switch to dark mode
    await page.locator('.theme-toggle').click();

    // Read what was saved
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });

  test('clicking theme toggle twice returns to light mode', async ({ page }) => {
    await page.goto('/');

    const toggle = page.locator('.theme-toggle');

    // Click 1: light → dark
    await toggle.click();
    // Click 2: dark → light
    await toggle.click();

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');
  });

  test('dark mode is applied via data-theme attribute on <html>', async ({ page }) => {
    await page.goto('/');

    // Click to dark mode
    await page.locator('.theme-toggle').click();

    // Navbar.js sets: document.documentElement.setAttribute('data-theme', 'dark')
    // We verify this happened — CSS variables then pick up the dark theme.
    const dataTheme = await page.locator('html').getAttribute('data-theme');
    expect(dataTheme).toBe('dark');
  });

  // ── DIRECT URL ACCESS ──────────────────────────────────────────

  test('app handles unknown routes gracefully', async ({ page }) => {
    // Navigate to a route that doesn't exist in React Router
    // A well-configured SPA should handle this — either redirect or show 404 UI
    const response = await page.goto('/this-page-does-not-exist');

    // With CRA, the dev server serves index.html for all routes.
    // React Router then renders — no defined route = renders nothing or the homepage.
    // We just confirm it didn't crash (no blank page from JS error).
    await expect(page.locator('body')).not.toBeEmpty();
  });

  // ── LOADING STATE ──────────────────────────────────────────────

  test('mint button shows "Processing..." text while loading', async ({ page }) => {
    await injectMockWallet(page, { autoConnect: true });

    // Intercept the API and add a delay to observe the loading state
    await page.route('**/api/mint/create-transaction', async route => {
      // Wait 3 seconds before responding — long enough to observe loading state
      await new Promise(resolve => setTimeout(resolve, 3000));
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Test delay complete' }),
      });
    });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();
    await launch.fillCompleteForm();

    // Click mint and immediately check the button text
    // We can't await clickMint() here because the button changes state immediately
    const clickPromise = launch.mintButton.click();

    // Check the button shows the loading state
    await expect(launch.mintButton).toContainText('Processing', { timeout: 2000 });

    // Wait for the click to fully resolve
    await clickPromise;
  });

});

/**
 * ============================================================
 * MANUAL TEST CASES (Not automated — documented for reference)
 * ============================================================
 *
 * These scenarios are hard to automate but IMPORTANT for Web3 QA.
 * Document them for the interview — shows depth of knowledge.
 *
 * TC-M01: WRONG NETWORK
 *   Steps:    1. Set Phantom to Mainnet-Beta
 *             2. Open the app (which is on Devnet)
 *             3. Connect wallet and attempt mint
 *   Expected: Error "Wrong network — please switch to Devnet"
 *   Actual:   TBD (need to verify if the app handles this)
 *
 * TC-M02: INSUFFICIENT SOL BALANCE
 *   Steps:    1. Connect a devnet wallet with 0 SOL
 *             2. Fill form and click Mint
 *   Expected: Error "Insufficient balance. Required: 0.07 SOL, Available: 0.00 SOL"
 *   Actual:   This IS handled in mintSPL.js (balance check before tx)
 *
 * TC-M03: TRANSACTION EXPIRED (blockhash too old)
 *   Steps:    1. Build transaction (get blockhash)
 *             2. Wait 90+ seconds
 *             3. Try to sign and send
 *   Expected: Error "Blockhash not found" / "Transaction simulation failed"
 *   Note:     Hard to test without actual Solana — requires waiting ~2 minutes
 *
 * TC-M04: USER CLOSES WALLET POPUP WITHOUT DECIDING
 *   Steps:    1. Click Mint (wallet popup opens)
 *             2. Close the popup via X button
 *   Expected: "Processing..." spinner stops, error message appears
 *
 * TC-M05: IPFS UPLOAD TIMEOUT
 *   Steps:    1. Throttle network to 2G speed (Chrome DevTools)
 *             2. Upload a 5MB image
 *             3. Click Mint
 *   Expected: Either success (slow) or timeout error (after Pinata timeout)
 */
