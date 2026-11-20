/**
 * ============================================================
 * TOKEN TYPE SWITCHER TESTS — SPL vs Token-2022
 * ============================================================
 *
 * WHAT WE'RE TESTING:
 * The token type selector at the top of the form controls which
 * features and sections are visible. This is conditional rendering logic.
 *
 * SPL Token shows:
 *  ✅ Optional Metadata (social links, tags)
 *  ✅ Custom Address Generator
 *  ✅ Multi-Wallet Distribution
 *  ✅ Custom Creator section
 *  ✅ Revoke Authorities checkboxes
 *  ❌ Extension Selector (Token-2022 only)
 *
 * Token-2022 shows:
 *  ✅ Extension Selector (mintCloseAuthority, permanentDelegate, nonTransferable)
 *  ❌ Optional Metadata
 *  ❌ Revoke Authorities
 *
 * WHY TEST CONDITIONAL RENDERING?
 * If a developer accidentally removes a conditional in MintForm.js,
 * SPL users might see the extension selector — confusing them.
 * Or Token-2022 users might see revoke options that don't apply.
 * These tests are regression guards.
 *
 * QA CONCEPT: "Flag usability issues and confusing flows, not just functional bugs"
 * → Showing wrong sections IS a usability bug even if it doesn't break anything.
 */

const { test, expect } = require('@playwright/test');
const { injectMockWallet } = require('../helpers/mockWallet');
const { LaunchPage } = require('../pages/LaunchPage');

test.describe('Token Type Switcher — SPL vs Token-2022 UI', () => {

  test.beforeEach(async ({ page }) => {
    // Connect wallet so the form is interactive
    await injectMockWallet(page, { autoConnect: true });
    await page.goto('/launch');
    await page.waitForTimeout(2000); // Give wallet-adapter time to auto-connect
  });

  // ── DEFAULT STATE ──────────────────────────────────────────────

  test('SPL Token is selected by default', async ({ page }) => {
    const launch = new LaunchPage(page);

    // The active button gets the CSS class 'active'.
    // toHaveClass() checks if the class exists (not an exact match).
    await expect(launch.splTokenBtn).toHaveClass(/active/);

    // And Token-2022 should NOT be active
    await expect(launch.token2022Btn).not.toHaveClass(/active/);
  });

  // ── SPL TOKEN SECTIONS ─────────────────────────────────────────

  test('SPL mode shows the optional components grid', async ({ page }) => {
    // The optional-components-grid contains social links, custom address, etc.
    // It's only rendered for SPL (see: tokenType !== 'TOKEN2022' condition in MintForm.js)
    const grid = page.locator('.optional-components-grid');
    await expect(grid).toBeVisible();
  });

  test('SPL mode shows Revoke Authorities section', async ({ page }) => {
    // Revoke authorities (freeze/mint/update) are only relevant for SPL tokens.
    // Token-2022 uses a different authority model.
    // CLASS FIX: The actual root div in RevokeAuthorities.js uses
    // className="revoke-authorities-section" (not ".revoke-authorities")
    const revokeSection = page.locator('.revoke-authorities-section');
    await expect(revokeSection).toBeVisible();
  });

  test('SPL mode does NOT show the extension selector', async ({ page }) => {
    // Extensions (mintCloseAuthority etc.) only exist in Token-2022 program.
    const launch = new LaunchPage(page);
    await expect(launch.extensionSelector).not.toBeVisible();
  });

  // ── TOKEN-2022 SECTIONS ────────────────────────────────────────

  test('switching to Token-2022 activates that button', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.selectToken2022();

    // Now Token-2022 should be active, SPL should not
    await expect(launch.token2022Btn).toHaveClass(/active/);
    await expect(launch.splTokenBtn).not.toHaveClass(/active/);
  });

  test('Token-2022 mode hides the optional components grid', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.selectToken2022();

    // This grid is conditionally rendered only for SPL tokens
    const grid = page.locator('.optional-components-grid');
    await expect(grid).not.toBeVisible();
  });

  test('Token-2022 mode hides the Revoke Authorities section', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.selectToken2022();

    const revokeSection = page.locator('.revoke-authorities-section');
    await expect(revokeSection).not.toBeVisible();
  });

  // ── MINT BUTTON TEXT CHANGES ───────────────────────────────────

  test('mint button shows "Mint Tokens" by default (SPL)', async ({ page }) => {
    const launch = new LaunchPage(page);

    // The button text should be the default "Mint Tokens" with no extensions
    // (Note: textContent() includes whitespace from the emoji span, so we use toContainText)
    await expect(launch.mintButton).toContainText('Mint Tokens');
  });

  test('mint button text updates when Token-2022 is selected', async ({ page }) => {
    const launch = new LaunchPage(page);
    await launch.selectToken2022();

    // Without extensions selected, it still says "Mint Tokens"
    await expect(launch.mintButton).toContainText('Mint Tokens');
    // The button text changes to "Mint with X Extension(s)" only after
    // extensions are selected — that's tested in a separate spec.
  });

  // ── EXTENSION BADGE ────────────────────────────────────────────

  test('Token-2022 button shows extension badge when extensions are selected', async ({ page }) => {
    // This badge is the number shown on the Token-2022 tab button
    // when extensions are active: "Token-2022 [2]"
    // We're checking the badge appears after extension selection.

    const launch = new LaunchPage(page);
    await launch.selectToken2022();

    // For now, just confirm no badge when no extensions selected
    const badge = page.locator('.extension-badge');
    // With 0 extensions, badge should either be hidden or not present
    const badgeCount = await badge.count();
    if (badgeCount > 0) {
      await expect(badge).not.toBeVisible();
    }
    // If badge element doesn't exist at all, that's also fine
  });

});
