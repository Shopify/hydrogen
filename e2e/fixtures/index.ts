import {test as base} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {stat} from 'node:fs/promises';
import {StorefrontPage} from './storefront';
import {CartUtil} from './cart-utils';
import {DiscountUtil} from './discount-utils';
import {GiftCardUtil} from './gift-card-utils';
import type {MswScenario} from './msw/scenarios';

export * from '@playwright/test';
export * from './storefront';
export {getTestSecrets, getRequiredSecret} from './test-secrets';
export {CartUtil} from './cart-utils';
export {DiscountUtil} from './discount-utils';
export {GiftCardUtil} from './gift-card-utils';
export {mockCustomerAccountOperation} from './msw/graphql';
export {MSW_SCENARIOS} from './msw/scenarios';

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

type MockServerOptions = {
  scenario: MswScenario;
};

type TestStoreOptions = {
  mock?: MockServerOptions;
};

export const setTestStore = async (
  testStore: TestStoreKey | `https://${string}`,
  options: TestStoreOptions = {},
) => {
  const isLocal = !testStore.startsWith('https://');
  let server: DevServer | null = null;

  const mockScenario = isLocal ? options.mock?.scenario : undefined;
  const useMsw = mockScenario !== undefined;

  const mswEntryFile = path.resolve(__dirname, './msw/entry.ts');

  test.use({
    baseURL: async ({}, use) => {
      await use(isLocal ? server?.getUrl() : testStore);
    },
  });

  if (!isLocal) {
    console.log(`Using test store: ${testStore}`);
    return;
  }

  test.afterAll(async () => {
    await server?.stop();
  });

  test.beforeAll(async ({}) => {
    const filepath = path.resolve(__dirname, `../envs/.env.${testStore}`);
    await stat(filepath); // Ensure the file exists

    server = new DevServer({
      storeKey: testStore,
      customerAccountPush: false,
      envFile: filepath,
      entry: useMsw ? mswEntryFile : undefined,
      env: mockScenario
        ? {
            HYDROGEN_E2E_MSW_SCENARIO: mockScenario,
          }
        : undefined,
    });

    await server.start();
  });
};
