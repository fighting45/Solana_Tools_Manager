/**
 * ============================================================
 * TEST DATA — Centralised constants for all test files
 * ============================================================
 *
 * WHY A SEPARATE FILE?
 * QA principle: Never hard-code test inputs inline inside spec files.
 * If the valid recipient address changes in production, you update it
 * in ONE place here — not hunting through 7 test files.
 *
 * Also makes tests readable:
 *   GOOD:  recipientAddress: VALID_SOLANA_ADDRESS
 *   BAD:   recipientAddress: 'GsbwXfJraMomNxBcjK9EHxGmxUDJiDcGJWJhVNNsPLBz'
 * The first reads like a sentence. The second is a mystery string.
 *
 * INTERVIEW TALKING POINT:
 * "I keep all test data in a central testData.js file. This avoids
 *  duplication, makes tests self-documenting, and means a single
 *  change propagates everywhere — especially important for addresses
 *  that differ between devnet and mainnet."
 */

// ── VALID SOLANA ADDRESSES ────────────────────────────────────────────
// These are real base58 addresses — 44 characters, valid checksum.
// They're publicly known addresses (not funded test wallets), so
// they're safe to commit and use in automated tests.

// Used as: recipient address, payer address in positive tests
const VALID_SOLANA_ADDRESS = 'GsbwXfJraMomNxBcjK9EHxGmxUDJiDcGJWJhVNNsPLBz';

// A second valid address — useful for multi-wallet distribution tests
// (This is the USDC token mint address on mainnet — well-known, always valid format)
const ANOTHER_VALID_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ── INVALID ADDRESSES ─────────────────────────────────────────────────
// Used in NEGATIVE tests — we expect the app to show an error for these.

// Not base58 at all — contains hyphens which are invalid in base58
const INVALID_ADDRESS = 'not-a-valid-solana-address';

// Too short — Solana addresses are always 32–44 characters
const SHORT_ADDRESS = '1234abc';

// Empty string — tests the "field is required" validation path
const EMPTY_ADDRESS = '';

// ── VALID TOKEN FORM PAYLOADS ─────────────────────────────────────────
// A complete, valid set of form values for the HAPPY PATH test.
// Every required field is filled. Use this as a base and override
// specific fields in negative tests:
//   e.g. { ...VALID_TOKEN, recipientAddress: INVALID_ADDRESS }
const VALID_TOKEN = {
  name: 'Test Token',          // Required — displayed in metadata
  symbol: 'TEST',              // Required — max 10 chars (enforced by HTML maxLength)
  description: 'A test token for QA automation', // Optional but good to include
  amount: '1000000',           // Required — must be > 0
  decimals: '9',               // Required — must be 0–18
  recipientAddress: VALID_SOLANA_ADDRESS, // Required — must be valid base58
};

// Same but for Token-2022 (fewer fields — no social links, no revoke authorities)
const VALID_TOKEN_2022 = {
  name: 'Test Token 2022',
  symbol: 'T22',
  description: 'Token-2022 test token for QA',
  amount: '500000',
  decimals: '6',
  recipientAddress: VALID_SOLANA_ADDRESS,
};

// ── EDGE CASE PAYLOADS ────────────────────────────────────────────────
// These are intentionally broken payloads for negative testing.
// Each one tests exactly ONE validation rule.

const TOKEN_MISSING_NAME = { ...VALID_TOKEN, name: '' };
const TOKEN_MISSING_SYMBOL = { ...VALID_TOKEN, symbol: '' };
const TOKEN_ZERO_AMOUNT = { ...VALID_TOKEN, amount: '0' };
const TOKEN_NEGATIVE_AMOUNT = { ...VALID_TOKEN, amount: '-100' };
const TOKEN_DECIMALS_TOO_HIGH = { ...VALID_TOKEN, decimals: '19' }; // Max is 18
const TOKEN_DECIMALS_NEGATIVE = { ...VALID_TOKEN, decimals: '-1' };
const TOKEN_INVALID_RECIPIENT = { ...VALID_TOKEN, recipientAddress: INVALID_ADDRESS };

// ── SERVER URLs ───────────────────────────────────────────────────────
// Use environment variables so the same tests work locally AND in CI.
// In CI: set BACKEND_URL=https://api.staging.programmx.com
// Locally: defaults to localhost

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

module.exports = {
  // Addresses
  VALID_SOLANA_ADDRESS,
  ANOTHER_VALID_ADDRESS,
  INVALID_ADDRESS,
  SHORT_ADDRESS,
  EMPTY_ADDRESS,

  // Happy path payloads
  VALID_TOKEN,
  VALID_TOKEN_2022,

  // Edge case payloads
  TOKEN_MISSING_NAME,
  TOKEN_MISSING_SYMBOL,
  TOKEN_ZERO_AMOUNT,
  TOKEN_NEGATIVE_AMOUNT,
  TOKEN_DECIMALS_TOO_HIGH,
  TOKEN_DECIMALS_NEGATIVE,
  TOKEN_INVALID_RECIPIENT,

  // Server URLs
  BACKEND_URL,
  FRONTEND_URL,
};
