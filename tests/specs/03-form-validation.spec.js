/**
 * ============================================================
 * FORM VALIDATION TESTS
 * ============================================================
 *
 * WHAT WE'RE TESTING:
 * The frontend validator (validators.js) runs before any API call.
 * It checks required fields, valid addresses, valid amounts, etc.
 * If validation fails, an error appears in .status-message.
 *
 * WHY THIS MATTERS FOR THE JD:
 * "Find, reproduce, and report bugs with clear steps to reproduce,
 *  expected versus actual behavior"
 * Validation tests follow this EXACT pattern:
 *   Given: form filled with X
 *   When:  user clicks Mint
 *   Then:  error message Y appears
 * — Perfect bug report format.
 *
 * TESTING PHILOSOPHY — "One assertion per behaviour":
 * Each test isolates ONE validation rule. If a test fails, you know
 * EXACTLY which validation broke. Don't test multiple rules in one test.
 *
 * PATTERN USED: AAA (Arrange → Act → Assert)
 *   Arrange: set up the form state
 *   Act:     click the mint button
 *   Assert:  check the error message
 */

const { test, expect } = require('@playwright/test');
const { injectMockWallet } = require('../helpers/mockWallet');
const {
  VALID_TOKEN,
  VALID_SOLANA_ADDRESS,
  INVALID_ADDRESS,
  TOKEN_MISSING_NAME,
  TOKEN_MISSING_SYMBOL,
  TOKEN_ZERO_AMOUNT,
  TOKEN_DECIMALS_TOO_HIGH,
  TOKEN_INVALID_RECIPIENT,
} = require('../helpers/testData');
const { LaunchPage } = require('../pages/LaunchPage');

test.describe('Form Validation — Required fields and invalid inputs', () => {

  // ── SETUP: RUN BEFORE EVERY TEST IN THIS BLOCK ────────────────
  // test.beforeEach() is like a "setup" hook — runs before every test.
  // Here: inject wallet (so form is enabled) and navigate to /launch.
  // This avoids repeating these 3 lines in every test.
  test.beforeEach(async ({ page }) => {
    // Wallet must be connected — otherwise form is disabled and we can't test validation.
    // addInitScript (called inside injectMockWallet) sets localStorage BEFORE React mounts,
    // so WalletProvider finds 'walletName'='Phantom' and auto-connects on boot.
    await injectMockWallet(page, { autoConnect: true });
    const launch = new LaunchPage(page);
    await launch.goto();
    // Wait for the full wallet-adapter connect chain to complete (see LaunchPage.waitForWalletReady)
    await launch.waitForWalletReady(); // uses 2000ms default

    // Extra guard: wait until the name input is actually enabled before each test.
    // This is better than a fixed sleep — it fails fast if something is wrong.
    await launch.tokenNameInput.waitFor({ state: 'visible' });
  });

  // ── MISSING REQUIRED FIELDS ────────────────────────────────────

  test('clicking Mint with empty form shows "required" error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // ACT: Click Mint without filling anything
    await launch.clickMint();

    // ASSERT: Status message should appear with an error
    // The validator returns errors like "Token name is required"
    // We use a regex /required/i so it matches any capitalisation
    await expect(launch.statusMessage).toBeVisible();
    await expect(launch.statusMessage).toContainText(/required/i);
  });

  test('missing token NAME shows name-specific error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // ARRANGE: Fill everything EXCEPT name
    // Using spread: { ...VALID_TOKEN, name: '' } overrides just the name field
    await launch.fillBasicForm({ ...TOKEN_MISSING_NAME });
    // We skip uploadImage() intentionally — name validation fires first

    await launch.clickMint();

    // The exact error from validators.js: "Token name is required"
    await expect(launch.statusMessage).toContainText(/name/i);
  });

  test('missing token SYMBOL shows symbol-specific error', async ({ page }) => {
    const launch = new LaunchPage(page);

    await launch.fillBasicForm({ ...TOKEN_MISSING_SYMBOL });

    await launch.clickMint();

    await expect(launch.statusMessage).toContainText(/symbol/i);
  });

  test('missing IMAGE shows image-specific error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Fill all text fields — only skip the image upload
    await launch.fillBasicForm({ ...VALID_TOKEN });
    // No uploadImage() call — this is the gap we're testing

    await launch.clickMint();

    // validators.js: "Token image is required"
    await expect(launch.statusMessage).toContainText(/image/i);
  });

  test('missing RECIPIENT ADDRESS shows address error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Fill form without recipientAddress
    await launch.fillBasicForm({
      name: 'Test Token',
      symbol: 'TEST',
      amount: '1000000',
      decimals: '9',
      // recipientAddress intentionally omitted
    });

    await launch.clickMint();

    // validators.js: "Recipient address is required (or use Multi-Wallet Distribution)"
    await expect(launch.statusMessage).toContainText(/recipient|address/i);
  });

  // ── INVALID FIELD VALUES ───────────────────────────────────────

  test('INVALID recipient address shows "invalid address" error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Fill with an invalid address — this tests the isValidSolanaAddress() check
    await launch.fillBasicForm({ ...TOKEN_INVALID_RECIPIENT });
    await launch.uploadImage();

    await launch.clickMint();

    // The exact VALIDATION_MESSAGES.INVALID_ADDRESS from constants.js
    await expect(launch.statusMessage).toContainText(/invalid.*address|address.*invalid/i);
  });

  test('ZERO amount shows "amount must be greater than 0" error', async ({ page }) => {
    const launch = new LaunchPage(page);

    await launch.fillBasicForm({ ...TOKEN_ZERO_AMOUNT });
    await launch.uploadImage();

    await launch.clickMint();

    // validators.js: isValidAmount checks num > 0
    await expect(launch.statusMessage).toContainText(/amount/i);
  });

  test('NEGATIVE amount is rejected', async ({ page }) => {
    const launch = new LaunchPage(page);

    await launch.fillBasicForm({
      ...VALID_TOKEN,
      amount: '-100',  // Negative — should fail isValidAmount()
    });
    await launch.uploadImage();

    await launch.clickMint();

    await expect(launch.statusMessage).toContainText(/amount/i);
  });

  test('DECIMALS over 18 shows decimals error', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Max decimals is 18 (Solana token standard allows 0–9 practically,
    // but validators.js allows up to 18). 19 should fail.
    await launch.fillBasicForm({ ...TOKEN_DECIMALS_TOO_HIGH });
    await launch.uploadImage();

    await launch.clickMint();

    // validators.js: "Decimals must be between 0 and 18"
    await expect(launch.statusMessage).toContainText(/decimal/i);
  });

  // ── HTML-LEVEL CONSTRAINTS ─────────────────────────────────────
  // These are enforced by browser HTML validation BEFORE the JS validator runs.
  // Test them separately — they're a different layer.

  test('symbol field enforces max length of 10 characters via HTML', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Try to type 20 characters into symbol field
    await launch.tokenSymbolInput.fill('THISISWAYTOOLONG'); // 16 chars

    // HTML maxLength="10" on the input means browser truncates silently.
    // We read the actual value and confirm it's capped.
    const value = await launch.tokenSymbolInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
  });

  test('decimals field enforces min=0 and max=18 via HTML', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Check the HTML constraints on the decimals input
    const minAttr = await launch.decimalsInput.getAttribute('min');
    const maxAttr = await launch.decimalsInput.getAttribute('max');

    expect(minAttr).toBe('0');
    expect(maxAttr).toBe('18');
    // Note: HTML min/max don't prevent typing — they affect form submission
    // and browser-native validation. The JS validator is the real guard.
  });

  // ── FORM RESET BEHAVIOUR ───────────────────────────────────────

  test('switching SPL → Token-2022 resets the form', async ({ page }) => {
    const launch = new LaunchPage(page);

    // ARRANGE: Fill in the SPL form
    await launch.fillBasicForm({ name: 'My SPL Token', symbol: 'MSPL' });
    const valueBefore = await launch.tokenNameInput.inputValue();
    expect(valueBefore).toBe('My SPL Token'); // Confirm it was set

    // ACT: Switch to Token-2022
    // TokenMinter.js calls setFormData(DEFAULT_FORM_VALUES) on type switch
    await launch.selectToken2022();

    // ASSERT: Form was cleared
    const valueAfter = await launch.tokenNameInput.inputValue();
    expect(valueAfter).toBe('');
  });

  test('switching Token-2022 → SPL also resets the form', async ({ page }) => {
    const launch = new LaunchPage(page);

    // Start on Token-2022
    await launch.selectToken2022();
    await launch.fillBasicForm({ name: 'My 2022 Token' });

    // Switch back to SPL
    await launch.selectSPLToken();

    const value = await launch.tokenNameInput.inputValue();
    expect(value).toBe('');
  });

});
