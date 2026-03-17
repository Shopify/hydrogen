import {test as base} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {stat} from 'node:fs/promises';
import {StorefrontPage} from './storefront';
import {CartUtil} from './cart-utils';
import {DiscountUtil} from './discount-utils';
import {GiftCardUtil} from './gift-card-utils';

export * from '@playwright/test';
export * from './storefront';
export * from './recipe';
export {getTestSecrets, getRequiredSecret} from './test-secrets';
export {CartUtil} from './cart-utils';
export {DiscountUtil} from './discount-utils';
export {GiftCardUtil} from './gift-card-utils';

export const test = base.extend<
  {
    storefront: StorefrontPage;
    cart: CartUtil;
    discount: DiscountUtil;
    giftCard: GiftCardUtil;
  },
  {forEachWorker: void}
>({
  storefront: async ({page}, use) => {
    const storefront = new StorefrontPage(page);
    await use(storefront);
  },
  cart: async ({page}, use) => {
    const cart = new CartUtil(page);
    await use(cart);
  },
  discount: async ({page}, use) => {
    const discount = new DiscountUtil(page);
    await use(discount);
  },
  giftCard: async ({page}, use) => {
    const giftCard = new GiftCardUtil(page);
    await use(giftCard);
  },
});

const TEST_STORE_KEYS = [
  'mockShop',
  'defaultConsentDisallowed_cookiesEnabled',
  'defaultConsentAllowed_cookiesEnabled',
  'defaultConsentDisallowed_cookiesDisabled',
  'defaultConsentAllowed_cookiesDisabled',
  'hydrogenPreviewStorefront',
] as const;

type TestStoreKey = (typeof TEST_STORE_KEYS)[number];

type DevServerLifecycleOptions = {
  storeKey: string;
  projectPath?: string;
};

/**
 * Registers Playwright hooks for DevServer lifecycle: baseURL fixture,
 * beforeAll (start), and afterAll (stop). For remote stores, only the
 * baseURL fixture is registered — no local server is started.
 *
 * Playwright runs beforeAll hooks in registration order, so callers
 * that need setup before the server starts (e.g. fixture generation)
 * should register their own beforeAll BEFORE calling this function.
 */
export const configureDevServer = (options: DevServerLifecycleOptions) => {
  const {storeKey, projectPath} = options;
  const isLocal = !storeKey.startsWith('https://');
  let server: DevServer | null = null;

  test.use({
    baseURL: async ({}, use) => {
      await use(isLocal ? server?.getUrl() : storeKey);
    },
  });

  if (!isLocal) return;

  test.afterAll(async () => {
    await server?.stop();
  });

  test.beforeAll(async () => {
    const envPath = path.resolve(__dirname, `../envs/.env.${storeKey}`);
    await stat(envPath);

    server = new DevServer({
      storeKey,
      customerAccountPush: false,
      envFile: envPath,
      projectPath,
    });

    await server.start();
  });
};

export const setTestStore = (testStore: TestStoreKey | `https://${string}`) => {
  configureDevServer({storeKey: testStore});
};
