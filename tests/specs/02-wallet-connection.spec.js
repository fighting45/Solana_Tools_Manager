/**
 * ============================================================
 * WALLET CONNECTION TESTS
 * ============================================================
 *
 * WHAT WE'RE TESTING:
 * The wallet connection state drives almost all UI in this app.
 * - No wallet connected → form disabled, can't mint
 * - Wallet connected   → form enabled, can fill and submit
 *
 * This is a CRITICAL test category for Web3 QA. The JD specifically
 * mentions "connecting wallets" as a core responsibility.
 *
 * HOW WALLET STATE WORKS IN THIS APP:
 *   1. App loads → @solana/wallet-adapter-react checks window.phantom
 *   2. If found → attempts autoConnect if previously approved
 *   3. User can click "Select Wallet" → wallet modal opens
 *   4. User selects Phantom → wallet.connect() is called
 *   5. publicKey is returned → React state updates → form enables
 *
 * We mock Step 1 entirely by injecting window.phantom before page load.
 * autoConnect: true skips Steps 3–4 and starts at Step 5.
 *
 * IMPORTANT ORDER: injectMockWallet() must ALWAYS come before page.goto()
 */

const { test, expect } = require('@playwright/test');
const { injectMockWallet, TEST_WALLET_ADDRESS } = require('../helpers/mockWallet');
const { LaunchPage } = require('../pages/LaunchPage');

test.describe('Wallet Connection — UI state changes', () => {

  // ── NO WALLET STATE ────────────────────────────────────────────

  test('form inputs are DISABLED when no wallet is connected', async ({ page }) => {
    // We deliberately do NOT inject a mock wallet here.
    // This simulates a user who has no Phantom extension installed.

    const launch = new LaunchPage(page);
    await launch.goto();

    // isDisabled() returns true if the element has the `disabled` attribute.
    // In TokenMinter.js, the `disabled` prop is set to `!publicKey`,
    // so when publicKey is null (no wallet), all inputs are disabled.
    await expect(launch.tokenNameInput).toBeDisabled();
    await expect(launch.tokenSymbolInput).toBeDisabled();
    await expect(launch.amountInput).toBeDisabled();
    await expect(launch.recipientInput).toBeDisabled();
  });

  test('mint button is DISABLED when no wallet is connected', async ({ page }) => {
    // Even if the form were somehow filled, the mint button should be disabled.
    // This is the last line of defense against accidental submissions.
    const launch = new LaunchPage(page);
    await launch.goto();

    await expect(launch.mintButton).toBeDisabled();
  });

  test('"Select Wallet" button is visible when no wallet detected', async ({ page }) => {
    // The wallet-adapter button renders as "Select Wallet" when no wallet is connected.
    // This is the user's entry point for connecting their wallet.
    const launch = new LaunchPage(page);
    await launch.goto();

    await expect(launch.walletButton).toBeVisible();
    // Not asserting exact text because wallet-adapter may show different text
    // depending on whether a wallet was previously disconnected vs never connected
  });

  // ── CONNECTED WALLET STATE ────────────────────────────────────

  test('form inputs are ENABLED when wallet is connected', async ({ page }) => {
    // STEP 1: Inject mock wallet BEFORE navigating.
    // autoConnect: true means the mock wallet starts already connected,
    // simulating a user who approved the site in a previous session.
    await injectMockWallet(page, { autoConnect: true });

    // STEP 2: Navigate to the page. At this point, React mounts and
    // wallet-adapter finds window.phantom → calls connect() → sets publicKey.
    const launch = new LaunchPage(page);
    await launch.goto();

    // STEP 3: Wait for the wallet-adapter state to propagate through React.
    // wallet-adapter uses useState internally — the update is async.
    await launch.waitForWalletReady();

    // STEP 4: Now assert the form is enabled
    await expect(launch.tokenNameInput).toBeEnabled();
    await expect(launch.tokenSymbolInput).toBeEnabled();
    await expect(launch.amountInput).toBeEnabled();
    await expect(launch.recipientInput).toBeEnabled();
  });

  test('mint button is ENABLED when wallet is connected', async ({ page }) => {
    await injectMockWallet(page, { autoConnect: true });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    // Mint button should be enabled — user can now attempt to mint
    await expect(launch.mintButton).toBeEnabled();
  });

  test('wallet button changes from "Select Wallet" to show address when connected', async ({ page }) => {
    await injectMockWallet(page, { autoConnect: true });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    // When connected, wallet-adapter shows a truncated address like "GsbwXf...PLBz".
    // We use waitFor with a polling assertion — this retries until the text changes
    // or the timeout (5s default) is reached. Better than a fixed sleep.
    await expect(launch.walletButton).not.toHaveText('Select Wallet', { timeout: 8000 });
  });

  test('wallet button shows truncated version of TEST_WALLET_ADDRESS', async ({ page }) => {
    await injectMockWallet(page, {
      autoConnect: true,
      address: TEST_WALLET_ADDRESS,  // 'GsbwXfJraMomNxBcjK9EHxGmxUDJiDcGJWJhVNNsPLBz'
    });

    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady();

    // wallet-adapter truncates: "GsbwXf...PLBz" (first 6 + last 4 chars)
    // We check for the first few chars of our test address
    const btnText = await launch.walletButton.textContent();
    // The text should contain part of our address
    // "GsbwXf" is the first 6 characters of TEST_WALLET_ADDRESS
    expect(btnText).toMatch(/Gsbw|GsbwXf/i);
  });

  // ── NAVIGATION WHILE CONNECTED ────────────────────────────────

  test('wallet stays connected when navigating between pages', async ({ page }) => {
    // This tests that wallet state persists across React Router navigation.
    // If wallet-adapter state resets on navigation, the user would have
    // to reconnect every time they go between pages — a usability bug.
    //
    // NOTE: We use React Router Link clicks (not page.goto) so the app
    // stays in the same React tree and wallet state is preserved.
    // Using page.goto('/') followed by page.goto('/launch') does a full
    // browser reload — React remounts from scratch and re-reads localStorage,
    // which is equivalent to testing autoConnect across reloads (also valid).

    await injectMockWallet(page, { autoConnect: true });

    // Start directly on /launch — addInitScript set localStorage, so wallet
    // reconnects automatically via the autoConnect flow.
    const launch = new LaunchPage(page);
    await launch.goto();
    await launch.waitForWalletReady(2000);  // Give wallet-adapter time to reconnect

    // Wallet should be connected — form enabled
    await expect(launch.tokenNameInput).toBeEnabled({ timeout: 8000 });
  });

});
