/**
 * ============================================================
 * PAGE OBJECT MODEL (POM) — HomePage
 * ============================================================
 *
 * WHAT IS THE PAGE OBJECT MODEL?
 * It's a design pattern where each page of your app gets its own class.
 * The class has two things:
 *   1. LOCATORS — references to elements on the page (defined once)
 *   2. METHODS  — user actions on that page (click, fill, navigate)
 *
 * WHY USE IT?
 * Imagine the homepage hero title changes from class "hero-title" to "main-heading".
 * WITHOUT POM: you'd grep every test file and update 20 selectors manually.
 * WITH POM:    you change ONE LINE here → all tests automatically updated.
 *
 * Also makes tests READABLE like user stories:
 *   await home.goto();
 *   await home.clickLaunchApp();
 *   → reads like: "user goes to homepage, clicks Launch App"
 *
 * INTERVIEW ANSWER: "Why do you use the Page Object Model?"
 * → "It separates test logic from page structure. When the UI changes,
 *    I update the POM class, not every test. It also makes tests readable
 *    — a spec reads like a user story, not a wall of CSS selectors."
 */

class HomePage {
  /**
   * @param {import('@playwright/test').Page} page
   * The Playwright Page object — represents one browser tab.
   * We store it so all methods in this class can use it.
   */
  constructor(page) {
    this.page = page;

    // ── LOCATORS ──────────────────────────────────────────────────
    // Locators are LAZY — they don't query the DOM until you await them.
    // This means defining them in the constructor is fine — no network call yet.
    //
    // Selector strategy (best → worst for stability):
    //   1. data-testid="x"     → Never breaks, but requires dev to add attributes
    //   2. aria-label / role   → Accessible + stable
    //   3. id / name           → Stable if devs don't change them
    //   4. CSS class           → Breaks when styles are refactored
    //   5. text content        → Most fragile, but fine for unique headings
    //
    // This app doesn't have data-testid attributes, so we use CSS classes
    // that are semantic (not utility classes), which are reasonably stable.

    // Hero section — first thing the user sees
    this.heroTitle    = page.locator('.hero-title');
    this.heroSubtitle = page.locator('.hero-subtitle');
    this.launchButton = page.locator('.launch-button');  // "Launch App →" button

    // Navbar elements
    // hasText narrows the selector — there are multiple .navbar-link elements
    this.navLaunchLink = page.locator('.navbar-link', { hasText: 'Launch Token' });
    this.navHomeLink   = page.locator('.navbar-link', { hasText: 'Home' });
    this.navAboutLink  = page.locator('.navbar-link', { hasText: 'About' });

    // Navbar right-side elements
    this.walletButton  = page.locator('.wallet-adapter-button');  // "Select Wallet" button
    this.themeToggle   = page.locator('.theme-toggle');           // 🌙/☀️ button
    this.networkBadge  = page.locator('.network-badge');          // "⚡ Solana" pill
    this.logoText      = page.locator('.logo-text');              // "ProgrammX" text in navbar

    // Stats section — "857+ Tokens Created" etc.
    this.statsSection  = page.locator('.stats-section');
    this.statNumbers   = page.locator('.stat-number');  // All stat numbers at once

    // Services section — 3 cards
    this.servicesSection = page.locator('.services-section');
    this.serviceCards    = page.locator('.service-card');  // All 3 cards

    // Footer
    this.footer = page.locator('.homepage-footer');
  }

  // ── ACTIONS ────────────────────────────────────────────────────

  /**
   * Navigate to the homepage.
   * '/' resolves to baseURL + '/' = 'http://localhost:3000/'
   */
  async goto() {
    await this.page.goto('/');
    // waitForLoadState ensures React has mounted and rendered.
    // 'domcontentloaded' = HTML parsed (fast).
    // 'networkidle' = no pending requests (slower but more reliable for SPAs).
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Click the big "Launch App →" button in the hero section.
   * This navigates to /launch (uses React Router Link).
   */
  async clickLaunchApp() {
    await this.launchButton.click();
    // After clicking a React Router link, wait for navigation to complete
    await this.page.waitForURL('**/launch');
  }

  /**
   * Click "Launch Token" in the top navbar.
   * Alternative navigation path to /launch.
   */
  async clickNavLaunchToken() {
    await this.navLaunchLink.click();
    await this.page.waitForURL('**/launch');
  }

  /**
   * Click the theme toggle (dark/light mode switch).
   * Tests that the toggle works and localStorage is updated.
   */
  async toggleTheme() {
    await this.themeToggle.click();
  }

  /**
   * Get the text content of all stat numbers on the page.
   * Returns an array like ['857+', '109K+']
   * Useful for asserting stats exist without hard-coding exact values.
   */
  async getStatNumbers() {
    return await this.statNumbers.allTextContents();
  }

  /**
   * Check the current theme stored in localStorage.
   * Playwright's page.evaluate() runs JS inside the browser context.
   * @returns {'dark'|'light'|null}
   */
  async getCurrentTheme() {
    return await this.page.evaluate(() => localStorage.getItem('theme'));
  }
}

module.exports = HomePage;
