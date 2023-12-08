import type {Page} from '@playwright/test';

export type NetworkWatcher = ReturnType<typeof createNetworkWatcher>;

/**
 * Creates a network watcher that can be used to wait for network requests to settle.
 * Based on https://gist.github.com/dgozman/d1c46f966eb9854ee1fe24960b603b28
 */
export function createNetworkWatcher(page: Page) {
  let requestCounter = 0;
  let lock = deferLock();
  lock.resolve();

  const onRequest = () => {
    if (requestCounter === 0) lock = deferLock();
    ++requestCounter;
  };

  const onRequestDone = async () => {
    // Let the page handle responses asynchronously
    await page
      .evaluate(() => new Promise((f) => setTimeout(f, 0)))
      .catch(() => {});

    --requestCounter;
    if (requestCounter <= 0) {
      requestCounter = 0;
      lock.resolve();
    }
  };

  page.on('request', onRequest);
  page.on('requestfinished', onRequestDone);
  page.on('requestfailed', onRequestDone);

  return {
    settled: () => lock.promise,
    stop() {
      page.removeListener('request', onRequest);
      page.removeListener('requestfinished', onRequestDone);
      page.removeListener('requestfailed', onRequestDone);
    },
  };
}

function deferLock() {
  let deferredResolve: (value?: unknown) => void;
  const promise = new Promise((resolve) => {
    deferredResolve = resolve;
  });

  return {promise, resolve: deferredResolve!};
}

/**
 * Formats a number as USD. Example: 1800 => $1,800.00
 */
export function formatPrice(
  price: string | number,
  currency = 'USD',
  locale = 'en-US',
) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  });

  return formatter.format(Number(price));
}

/**
 * Removes symbols and decimals from a price and converts to number.
 */
export function normalizePrice(price: string | null) {
  if (!price) throw new Error('Price was not found');

  return Number(
    price
      .replace('$', '')
      .trim()
      .replace(/[.,](\d\d)$/, '-$1')
      .replace(/[.,]/g, '')
      .replace('-', '.'),
  );
}
