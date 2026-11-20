/**
 * ============================================================
 * API TESTS — Backend endpoints (no browser needed)
 * ============================================================
 *
 * WHAT IS API TESTING?
 * Testing the backend HTTP endpoints directly — no browser, no UI.
 * We send HTTP requests and assert the responses.
 *
 * WHY USE PLAYWRIGHT FOR API TESTS? (not Postman?)
 * Postman is great for MANUAL/exploratory API testing.
 * Playwright's `request` context is for AUTOMATED regression tests.
 * Both appear in the JD — this file covers the automation angle.
 * The Postman COLLECTION we'll build later covers the manual angle.
 *
 * HOW PLAYWRIGHT API TESTING WORKS:
 * Each test gets a `{ request }` fixture — a pre-configured HTTP client.
 * It supports GET, POST, PUT, DELETE and handles JSON automatically.
 * No browser is opened — these tests run in pure Node.js.
 *
 * COVERAGE STRATEGY:
 *   ✅ Health endpoints  — confirms the server is alive
 *   ✅ Happy path GET    — valid inputs return valid responses
 *   ✅ Validation errors — missing/invalid inputs return 400
 *   ✅ Response schema   — shape of JSON responses is correct
 *   ✅ Unknown routes    — return 404
 *
 * INTERVIEW TALKING POINT:
 * "I write API tests for the backend contract — these run in CI
 *  without spinning up a browser, so they're very fast. They give
 *  me confidence the backend API I'm UI-testing against is healthy."
 *
 * PREREQUISITE: Backend server must be running on localhost:3001
 * Run it with: `npm run dev` in the project root
 */

const { test, expect } = require('@playwright/test');
const { BACKEND_URL, VALID_SOLANA_ADDRESS } = require('../helpers/testData');

// Use test.describe to group API tests separately from UI tests.
// In the HTML report, they appear as a distinct section.
test.describe('API Tests — Backend endpoints', () => {

  // ── HEALTH CHECKS ─────────────────────────────────────────────
  // These are the FIRST tests to run in any CI pipeline.
  // If /health fails, there's no point running anything else.

  test('GET /health returns 200 with { status: "ok" }', async ({ request }) => {
    // request.get() sends a GET request and returns a Response object.
    // This is Playwright's built-in API testing client.
    const response = await request.get(`${BACKEND_URL}/health`);

    // ── Assert HTTP Status ──
    // 200 = server is alive and handled the request
    expect(response.status()).toBe(200);

    // ── Assert Response Body ──
    // response.json() parses the response body as JSON
    const body = await response.json();

    // Check the structure — this is "schema validation"
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeTruthy();     // Should be an ISO timestamp string
    expect(body.environment).toBeTruthy();   // Should be 'development' or 'production'
  });

  test('GET /api/health also returns 200 with { status: "ok" }', async ({ request }) => {
    // The app has TWO health endpoints — /health and /api/health.
    // This confirms both work (they're separate routes in app.js).
    const response = await request.get(`${BACKEND_URL}/api/health`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  // ── TOKEN-2022 EXTENSIONS ENDPOINT ────────────────────────────

  test('GET /api/token2022/token2022-extensions returns 200 with extension list', async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/token2022/token2022-extensions`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Schema validation: body must have an `extensions` array
    expect(body).toHaveProperty('extensions');
    expect(Array.isArray(body.extensions)).toBe(true);
    expect(body.extensions.length).toBeGreaterThan(0);
  });

  test('extensions list contains the 3 expected extension objects', async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/token2022/token2022-extensions`
    );
    const body = await response.json();

    // Extract just the names for easy assertion
    const names = body.extensions.map(e => e.name);

    // These are hardcoded in token2022Controller.js — if one is removed,
    // this test catches the regression immediately.
    expect(names).toContain('mintCloseAuthority');
    expect(names).toContain('permanentDelegate');
    expect(names).toContain('nonTransferable');
  });

  test('each extension has required fields: name, label, description', async ({ request }) => {
    const response = await request.get(
      `${BACKEND_URL}/api/token2022/token2022-extensions`
    );
    const body = await response.json();

    // Validate the SCHEMA of each extension object.
    // This is important — if the frontend expects `label` but backend sends `title`,
    // the UI breaks silently.
    for (const ext of body.extensions) {
      expect(ext).toHaveProperty('name');
      expect(ext).toHaveProperty('label');
      expect(ext).toHaveProperty('description');
      expect(typeof ext.name).toBe('string');
      expect(typeof ext.label).toBe('string');
    }
  });

  // ── CUSTOM ADDRESS PREVIEW ENDPOINT ───────────────────────────

  test('GET /api/mint/preview-address without suffix returns 400', async ({ request }) => {
    // The endpoint requires a `suffix` query parameter.
    // Missing it should return 400 Bad Request.
    const response = await request.get(
      `${BACKEND_URL}/api/mint/preview-address`
      // No ?suffix= query param
    );

    expect(response.status()).toBe(400);

    const body = await response.json();
    // The error message should mention "suffix"
    expect(body.error).toMatch(/suffix/i);
  });

  test('GET /api/mint/preview-address with suffix > 3 chars returns 400', async ({ request }) => {
    // mintController.js validates: suffix.length > 3 → 400
    const response = await request.get(
      `${BACKEND_URL}/api/mint/preview-address?suffix=TOOLONG`
    );

    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toMatch(/exceed 3|3 characters/i);
  });

  test('GET /api/mint/preview-address with valid suffix (1 char) returns 200', async ({ request }) => {
    // This actually generates a custom address — may take a few seconds.
    // The brute-force search is capped at 1,000,000 attempts.
    // A 1-character suffix should find a match quickly (1/58 chance per attempt).
    const response = await request.get(
      `${BACKEND_URL}/api/mint/preview-address?suffix=x`,
      { timeout: 30000 } // Allow up to 30s for address generation
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.sampleAddress).toBeTruthy();
    // Verify the returned address actually ends with our suffix (case-insensitive)
    expect(body.sampleAddress.toLowerCase()).toMatch(/x$/);
  });

  // ── MINT TRANSACTION ENDPOINT — VALIDATION ────────────────────

  test('POST /api/mint/create-transaction without payerAddress returns 400', async ({ request }) => {
    // Test backend validation: payerAddress is required.
    // We send a multipart form with everything EXCEPT payerAddress.

    const response = await request.post(
      `${BACKEND_URL}/api/mint/create-transaction`,
      {
        // multipart: {} sends a multipart/form-data request (like a browser form)
        multipart: {
          // No payerAddress
          name: 'Test Token',
          symbol: 'TEST',
          amount: '1000000',
          decimals: '9',
          recipientAddress: VALID_SOLANA_ADDRESS,
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    // mintController.js: "if (!payerAddress) return res.status(400).json({ error: 'payerAddress is required' })"
    expect(body.error).toContain('payerAddress');
  });

  test('POST /api/mint/create-transaction without name returns 400', async ({ request }) => {
    const response = await request.post(
      `${BACKEND_URL}/api/mint/create-transaction`,
      {
        multipart: {
          payerAddress: VALID_SOLANA_ADDRESS,
          symbol: 'TEST',
          amount: '1000000',
          decimals: '9',
          recipientAddress: VALID_SOLANA_ADDRESS,
          // name is missing
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('name');
  });

  test('POST /api/mint/create-transaction without symbol returns 400', async ({ request }) => {
    const response = await request.post(
      `${BACKEND_URL}/api/mint/create-transaction`,
      {
        multipart: {
          payerAddress: VALID_SOLANA_ADDRESS,
          name: 'Test Token',
          amount: '1000000',
          decimals: '9',
          recipientAddress: VALID_SOLANA_ADDRESS,
          // symbol is missing
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('symbol');
  });

  test('POST /api/mint/create-transaction without image returns 400', async ({ request }) => {
    // All text fields are present but no image file — multer should still receive
    // the form, but the controller checks req.file explicitly.
    const response = await request.post(
      `${BACKEND_URL}/api/mint/create-transaction`,
      {
        multipart: {
          payerAddress: VALID_SOLANA_ADDRESS,
          name: 'Test Token',
          symbol: 'TEST',
          amount: '1000000',
          decimals: '9',
          recipientAddress: VALID_SOLANA_ADDRESS,
          // No image file
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Image');
  });

  // ── 404 AND UNKNOWN ROUTES ─────────────────────────────────────

  test('unknown API route returns 404', async ({ request }) => {
    // Express 5 returns 404 for routes that don't match any handler.
    // This confirms the routing setup is correct.
    const response = await request.get(`${BACKEND_URL}/api/this-does-not-exist`);
    expect(response.status()).toBe(404);
  });

  // ── RESPONSE HEADERS ──────────────────────────────────────────

  test('API responses include Content-Type: application/json', async ({ request }) => {
    // This is a basic API hygiene test — JSON endpoints should always
    // declare their content type. Some frameworks forget this on error responses.
    const response = await request.get(`${BACKEND_URL}/api/health`);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('CORS header is present for allowed origin', async ({ request }) => {
    // Test that the CORS configuration works.
    // The backend reads ALLOWED_ORIGINS env var — in development it allows localhost:3000.
    const response = await request.get(`${BACKEND_URL}/api/health`, {
      headers: {
        Origin: 'http://localhost:3000',  // Simulate a request from the frontend
      },
    });

    // If CORS is configured correctly, this header should be present
    const corsHeader = response.headers()['access-control-allow-origin'];
    // Either '*' (allow all) or the specific origin we sent
    expect(corsHeader).toBeTruthy();
  });

});
