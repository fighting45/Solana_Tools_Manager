const { test, expect } = require('@playwright/test');
const { injectMockWallet } = require('../helpers/mockWallet');

test('debug: check readyState + try direct adapter connect', async ({ page }) => {
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('console', msg => {
    if (msg.text().includes('WalletRead') || msg.text().includes('connect') || msg.text().includes('error'))
      console.log(`[${msg.type()}]`, msg.text().substring(0, 150));
  });

  await injectMockWallet(page, { autoConnect: true });
  await page.goto('/launch');
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    // Walk React fibers to find the WalletProvider context value
    function findReactProps(element) {
      const key = Object.keys(element).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
      if (!key) return null;
      let fiber = element[key];
      while (fiber) {
        if (fiber.memoizedState) {
          let state = fiber.memoizedState;
          while (state) {
            if (state.memoizedState && typeof state.memoizedState === 'object' && state.memoizedState.publicKey !== undefined) {
              return state.memoizedState;
            }
            if (state.queue && state.memoizedState && state.memoizedState.adapter) {
              return state.memoizedState;
            }
            state = state.next;
          }
        }
        fiber = fiber.return;
      }
      return null;
    }

    // Try to find adapter readyState through the global wallet-adapter
    const wa = window.phantom?.solana;
    return {
      phantom_isConnected: wa?.isConnected,
      phantom_hasPublicKey: !!wa?.publicKey,
      phantom_publicKeyB58: wa?.publicKey?.toBase58?.(),
    };
  });
  console.log('Phantom state:', JSON.stringify(result));
});
