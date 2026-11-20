/**
 * ============================================================
 * PAGE OBJECT MODEL — LaunchPage (/launch)
 * ============================================================
 *
 * This represents the TOKEN MINTER page — the core feature of the app.
 * It has the most complex UI: form fields, token type switcher,
 * optional panels, wallet state, and the mint button.
 *
 * LOCATOR NAMING CONVENTION:
 * Use camelCase that describes what the element IS, not where it is.
 *   GOOD: this.mintButton         (what it is)
 *   BAD:  this.bottomGreenButton  (where/how it looks — fragile)
 *
 * SCOPING LOCATORS:
 * When a selector is not unique on the page, scope it with .filter()
 * or hasText to avoid "strict mode violation" errors (Playwright
 * throws if a locator matches more than 1 element and you try to click it).
 */

const path = require('path');

// Path to a small test image — used for the required image upload field.
// We'll create this 1x1 pixel PNG in the fixtures folder.
const TEST_IMAGE_PATH = path.join(__dirname, '../fixtures/test-token.png');

class LaunchPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── TOKEN TYPE SELECTOR ─────────────────────────────────────
    // Two buttons at the top: "SPL Token" and "Token-2022"
    // Active button gets the 'active' CSS class
    this.splTokenBtn   = page.locator('.token-type-btn', { hasText: 'SPL Token' });
    this.token2022Btn  = page.locator('.token-type-btn', { hasText: 'Token-2022' });

    // ── FORM FIELDS ─────────────────────────────────────────────
    // Using #id selectors — most stable option available without data-testid.
    // These match the id="..." attributes on the actual <input> elements in MintForm.js.
    this.tokenNameInput     = page.locator('#name');
    this.tokenSymbolInput   = page.locator('#symbol');
    this.imageInput         = page.locator('#image');         // type="file" input
    this.descriptionInput   = page.locator('#description');  // <textarea>
    this.recipientInput     = page.locator('#recipientAddress');
    this.amountInput        = page.locator('#amount');
    this.decimalsInput      = page.locator('#decimals');
    this.mintAuthorityInput = page.locator('#mintAuthorityAddress');

    // ── BUTTONS ─────────────────────────────────────────────────
    // The main CTA button at the bottom of the form
    this.mintButton   = page.locator('.mint-button');
    // The wallet connect button (from @solana/wallet-adapter-react-ui)
    this.walletButton = page.locator('.wallet-adapter-button');

    // ── FEEDBACK ELEMENTS ────────────────────────────────────────
    // Status message shown when: validation fails, tx in progress, tx confirmed
    this.statusMessage = page.locator('.status-message');
    // Success modal shown after a successful mint
    this.successModal  = page.locator('.success-modal');

    // ── NAVBAR ELEMENTS ──────────────────────────────────────────
    this.priorityFeeBtn = page.locator('.priority-fee-btn');  // "Priority: Fast 1x" button
    this.networkBadge   = page.locator('.network-badge');     // "⚡ Solana" pill
    this.logoLink       = page.locator('a.navbar-logo');      // Logo → goes back to /
    this.themeToggle    = page.locator('.theme-toggle');

    // ── OPTIONAL FEATURE PANELS ──────────────────────────────────
    // These panels are only visible for SPL tokens
    this.optionalComponentsGrid = page.locator('.optional-components-grid');
    // Extension selector is only visible for Token-2022
    this.extensionSelector      = page.locator('.extension-selector');
    this.revokeAuthoritiesSection = page.locator('.revoke-authorities-section');
  }

  // ── NAVIGATION ─────────────────────────────────────────────────

  /**
   * Navigate directly to the /launch page.
   * Note: This bypasses the homepage — useful for focused tests.
   */
  async goto() {
    await this.page.goto('/launch');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── TOKEN TYPE ACTIONS ──────────────────────────────────────────

  /** Click the "SPL Token" tab. */
  async selectSPLToken() {
    await this.splTokenBtn.click();
  }

  /** Click the "Token-2022" tab. */
  async selectToken2022() {
    await this.token2022Btn.click();
  }

  // ── FORM ACTIONS ────────────────────────────────────────────────

  /**
   * Fill the basic required form fields.
   * Fields not provided are skipped (useful for testing partial fills).
   *
   * @param {Object} fields
   * @param {string} [fields.name]
   * @param {string} [fields.symbol]
   * @param {string} [fields.amount]
   * @param {string} [fields.decimals]
   * @param {string} [fields.recipientAddress]
   * @param {string} [fields.description]
   */
  async fillBasicForm({ name, symbol, amount, decimals, recipientAddress, description } = {}) {
    // locator.fill() clears the field first, then types the value.
    // It's better than .type() because it doesn't depend on keyboard events.
    if (name !== undefined)              await this.tokenNameInput.fill(name);
    if (symbol !== undefined)            await this.tokenSymbolInput.fill(symbol);
    if (amount !== undefined)            await this.amountInput.fill(String(amount));
    if (decimals !== undefined)          await this.decimalsInput.fill(String(decimals));
    if (recipientAddress !== undefined)  await this.recipientInput.fill(recipientAddress);
    if (description !== undefined)       await this.descriptionInput.fill(description);
  }

  /**
   * Upload a token image using the file input.
   * setInputFiles() bypasses the native OS file picker dialog,
   * which Playwright cannot interact with otherwise.
   *
   * @param {string} [imagePath] - Absolute path to image file. Defaults to test fixture.
   */
  async uploadImage(imagePath = TEST_IMAGE_PATH) {
    // setInputFiles() works even when the input is visually hidden (display:none).
    // It directly sets the files on the <input type="file"> element.
    await this.imageInput.setInputFiles(imagePath);
  }

  /**
   * Click the Mint button to submit the form.
   * If the wallet is connected and form is valid → triggers signing flow.
   * If validation fails → shows error in .status-message.
   */
  async clickMint() {
    await this.mintButton.click();
  }

  // ── STATE QUERIES ───────────────────────────────────────────────

  /**
   * Returns true if the form fields are disabled.
   * Form is disabled when: no wallet connected, OR loading/processing.
   * We check tokenNameInput as the representative field.
   */
  async isFormDisabled() {
    return await this.tokenNameInput.isDisabled();
  }

  /**
   * Get the current text content of the mint button.
   * Changes based on state:
   *   "Mint Tokens"              → default
   *   "Mint with 2 Extensions"   → Token-2022 with extensions selected
   *   "Processing..."            → transaction in progress (shows spinner)
   */
  async getMintButtonText() {
    return await this.mintButton.textContent();
  }

  /**
   * Get the error or status message shown below the form.
   * Returns null if no message is currently shown.
   */
  async getStatusMessage() {
    const isVisible = await this.statusMessage.isVisible();
    if (!isVisible) return null;
    return await this.statusMessage.textContent();
  }

  /**
   * Wait for the wallet to be reflected as connected in the UI.
   * After injecting the mock wallet, there's a brief delay before
   * React's wallet-adapter state updates and re-renders.
   *
   * @param {number} [ms=1000] - Milliseconds to wait
   */
  async waitForWalletReady(ms = 2000) {
    // wallet-adapter uses internal state updates that may take several ticks:
    //   1. React mounts → reads localStorage 'walletName' = 'Phantom'
    //   2. PhantomWalletAdapter.autoConnect() is called
    //   3. scopePollingDetectionStrategy detects window.phantom
    //   4. adapter.connect() fires → publicKey is set → React re-renders
    // On slow machines this chain takes 1–2 seconds.
    // Best practice: replace this with page.waitForFunction or expect polling,
    // but a generous fixed timeout is acceptable for initial setup.
    await this.page.waitForTimeout(ms);
  }

  /**
   * Fill ALL required fields and upload the test image.
   * Convenience method for happy-path tests that just need a filled form.
   *
   * @param {Object} [overrides] - Override specific fields from VALID_TOKEN
   */
  async fillCompleteForm(overrides = {}) {
    const { VALID_TOKEN } = require('../helpers/testData');
    const data = { ...VALID_TOKEN, ...overrides };
    await this.fillBasicForm(data);
    await this.uploadImage();
  }
}

module.exports = { LaunchPage, TEST_IMAGE_PATH };
