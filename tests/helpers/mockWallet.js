/**
 * ============================================================
 * MOCK WALLET — The most important helper for Web3 UI testing
 * ============================================================
 *
 * ── THE PROBLEM ──────────────────────────────────────────────
 * Browser wallet extensions (Phantom, Solflare) work by injecting a
 * JavaScript object into every web page. Phantom injects:
 *   window.phantom.solana   ← checked by wallet-adapter-wallets
 *   window.solana           ← legacy fallback
 *
 * Playwright runs a CLEAN Chromium with zero extensions installed.
 * So when our React app boots and wallet-adapter checks window.phantom,
 * it finds nothing → the form stays disabled → we can't test anything.
 *
 * ── THE SOLUTION ──────────────────────────────────────────────
 * page.addInitScript() runs a JavaScript function in the browser
 * BEFORE any page scripts execute. So we can inject our fake wallet
 * object before React even mounts. The app can't tell the difference.
 *
 * ── WHAT WE CAN TEST WITH THIS ────────────────────────────────
 *  ✅ Form is enabled when wallet is connected
 *  ✅ Mint button triggers the correct flow
 *  ✅ Wallet rejection error messages (rejectSign: true)
 *  ✅ Connected wallet address displayed in navbar
 *  ✅ All form flows that require a connected wallet
 *
 * ── WHAT WE CAN'T TEST (requires real wallet + devnet SOL) ────
 *  ❌ Actual on-chain transaction confirmation
 *  ❌ Real IPFS upload (requires Pinata JWT)
 *  ❌ Actual token appearing in wallet
 *  → These are covered by manual testing or integration tests
 *
 * INTERVIEW ANSWER: "How do you test a Web3 dApp without a real wallet?"
 * → "I inject a mock window.phantom object via Playwright's addInitScript()
 *    before the page loads. This gives me full control over connection state,
 *    public key, and transaction signing — including simulating rejections."
 */

// A real-looking Solana devnet address. 44 chars, valid base58.
// Safe to use — not a real funded wallet.
const TEST_WALLET_ADDRESS = 'GsbwXfJraMomNxBcjK9EHxGmxUDJiDcGJWJhVNNsPLBz';

/**
 * Injects a mock Phantom wallet into the browser page.
 *
 * IMPORTANT: Call this BEFORE page.goto(). The script runs at page init,
 * not after. If you call it after goto(), the wallet-adapter has already
 * checked window.phantom and found nothing.
 *
 * @param {import('@playwright/test').Page} page  - Playwright page object
 * @param {Object} options
 * @param {string}  [options.address]      Public key shown as connected wallet
 * @param {boolean} [options.autoConnect]  true = already connected when page loads
 *                                         false = user must click Connect (default)
 * @param {boolean} [options.rejectSign]   true = signTransaction throws an error
 *                                         Simulates user clicking "Reject" in wallet
 */
async function injectMockWallet(page, options = {}) {
  const {
    address = TEST_WALLET_ADDRESS,
    autoConnect = false,
    rejectSign = false,
  } = options;

  // addInitScript receives a function AND a serializable args object.
  // The function runs INSIDE the browser — it cannot close over Node.js variables.
  // That's why we pass { address, autoConnect, rejectSign } as a second argument.
  await page.addInitScript(
    ({ address, autoConnect, rejectSign, addressBytes }) => {
      // ── Step 0: Set localStorage BEFORE React mounts ────────────
      // CRITICAL FIX: WalletProvider reads localStorage.getItem('walletName')
      // on mount to know which wallet to auto-reconnect to.
      // The key is 'walletName' and the value is JSON.stringify('Phantom').
      // Without this, autoConnect=true in WalletProvider has no wallet to select,
      // so the adapter stays null and the form stays disabled forever.
      if (autoConnect) {
        localStorage.setItem('walletName', JSON.stringify('Phantom'));
      }

      // ── Step 1: Build a publicKey object ────────────────────────
      // @solana/web3.js PublicKey has these methods.
      // wallet-adapter calls .toBase58() to display the address in the navbar.
      // wallet-adapter calls .toBytes() to construct a real PublicKey internally:
      //   publicKey = new web3js.PublicKey(wallet.publicKey.toBytes())
      // The bytes must be the actual 32-byte representation of the address.
      // We pre-compute them in Node.js using bs58.decode() and pass them in.
      const publicKey = {
        toBase58: () => address,
        toString: () => address,
        toBytes: () => new Uint8Array(addressBytes),  // Real bytes, not fill(1)
        equals: other => other?.toBase58?.() === address,
        toJSON: () => address,
      };

      // ── Step 2: Build the full mock wallet object ────────────────
      // This matches the Phantom wallet API spec.
      // wallet-adapter-wallets reads isPhantom to identify the wallet type.
      const mockWallet = {
        isPhantom: true,

        // publicKey is null when disconnected, set when connected.
        // wallet-adapter reads this to know if a wallet is connected.
        publicKey: autoConnect ? publicKey : null,
        isConnected: autoConnect,

        // ── connect() ─────────────────────────────────────────────
        // Called when user clicks "Phantom" in the wallet modal dialog.
        // { onlyIfTrusted: true } is sent on page load for auto-reconnect —
        // wallet-adapter calls this automatically if the site was previously approved.
        connect: async ({ onlyIfTrusted } = {}) => {
          mockWallet.isConnected = true;
          mockWallet.publicKey = publicKey;
          // Notify all listeners — wallet-adapter subscribes to this
          mockWallet.emit('connect', publicKey);
          return { publicKey };
        },

        // ── disconnect() ──────────────────────────────────────────
        // Called when user clicks "Disconnect" in the wallet button dropdown.
        disconnect: async () => {
          mockWallet.isConnected = false;
          mockWallet.publicKey = null;
          mockWallet.emit('disconnect');
        },

        // ── signTransaction() ─────────────────────────────────────
        // This is what gets called when the user clicks "Mint Tokens".
        // The backend builds an unsigned transaction → frontend calls signTransaction().
        //
        // rejectSign: true simulates the user clicking "Reject" in the Phantom popup.
        // This is an IMPORTANT edge case the JD mentions: "rejected signatures"
        // Real Phantom throws: { code: 4001, message: "User rejected the request." }
        signTransaction: async tx => {
          if (rejectSign) {
            const err = new Error('User rejected the request.');
            err.code = 4001; // Standard wallet rejection code
            throw err;
          }
          // Simply return the tx as-is (pretend it's signed).
          // We're not testing on-chain execution here — just the UI flow.
          return tx;
        },

        // ── signAllTransactions() ─────────────────────────────────
        // Batch signing — same behaviour as signTransaction
        signAllTransactions: async txs => {
          if (rejectSign) {
            const err = new Error('User rejected the request.');
            err.code = 4001;
            throw err;
          }
          return txs;
        },

        // ── signAndSendTransaction() ──────────────────────────────
        // Some wallet adapters use this combined method instead of
        // separate sign + send. Returns a fake signature string.
        signAndSendTransaction: async tx => {
          if (rejectSign) {
            const err = new Error('User rejected the request.');
            err.code = 4001;
            throw err;
          }
          return {
            signature: 'MockSignature_' + Math.random().toString(36).slice(2),
          };
        },

        // ── signMessage() ─────────────────────────────────────────
        // Used for "Sign In With Solana" flows — not used in this app,
        // but included for completeness.
        signMessage: async () => ({
          signature: new Uint8Array(64).fill(2),
        }),

        // ── Event system ──────────────────────────────────────────
        // wallet-adapter subscribes to 'connect', 'disconnect', 'accountChanged'.
        // We store handlers in _listeners and fire them via emit().
        _listeners: {},

        on(event, handler) {
          if (!this._listeners[event]) this._listeners[event] = [];
          this._listeners[event].push(handler);
        },

        off(event, handler) {
          if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(
              h => h !== handler
            );
          }
        },

        // Alias — some adapters call removeListener instead of off
        removeListener(event, handler) {
          this.off(event, handler);
        },

        addListener(event, handler) {
          this.on(event, handler);
        },

        // Fire all handlers registered for this event
        emit(event, ...args) {
          (this._listeners[event] || []).forEach(h => h(...args));
        },

        // ── request() ─────────────────────────────────────────────
        // Newer wallet-standard API — some adapters use this instead of
        // direct method calls.
        request: async ({ method } = {}) => {
          if (method === 'connect') return { publicKey };
          if (method === 'disconnect') return {};
          return null;
        },
      };

      // ── Step 3: Expose the mock at the locations wallet-adapter checks ──
      // @solana/wallet-adapter-wallets checks window.phantom?.solana first,
      // then falls back to window.solana for legacy detection.
      window.phantom = { solana: mockWallet };
      window.solana = mockWallet; // Legacy fallback
    },
    // ── IMPORTANT: Pass options as the second arg ──────────────────
    // Variables in the outer Node.js scope are NOT accessible inside the browser
    // function. Playwright serializes this plain object and passes it in as the
    // first parameter. Only JSON-serializable values work (no Buffers, no classes).
    //
    // addressBytes: pre-computed bs58.decode(address) so the browser doesn't
    // need bs58 — it just wraps it in Uint8Array(addressBytes).
    {
      address,
      autoConnect,
      rejectSign,
      addressBytes: Array.from(require('bs58').decode(address)),
    }
  );
}

module.exports = { injectMockWallet, TEST_WALLET_ADDRESS };
