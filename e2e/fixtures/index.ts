import {test as base} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {StorefrontPage} from './storefront';
import {CartUtil} from './cart-utils';
import {DiscountUtil} from './discount-utils';
import {GiftCardUtil} from './gift-card-utils';
import type {MswScenario} from './msw/scenarios';
import {getHandlersForScenario} from './msw/handlers';

export * from '@playwright/test';
export * from './storefront';
export {getTestSecrets, getRequiredSecret} from './test-secrets';
export {CartUtil} from './cart-utils';
export {DiscountUtil} from './discount-utils';
export {GiftCardUtil} from './gift-card-utils';
export {AccountUtil} from './account-utils';
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

type TestStoreOptions = {
  mock?: {
    scenario: MswScenario;
  };
};

async function createMockEnvFile(envFile: string, scenario: MswScenario) {
  const mockEnvDir = await mkdtemp(path.join(tmpdir(), 'hydrogen-e2e-msw-'));
  const mockEnvFile = path.join(mockEnvDir, '.env.mock');

  const baseEnvContents = await readFile(envFile, 'utf8');
  const normalizedEnvContents = baseEnvContents.endsWith('\n')
    ? baseEnvContents
    : `${baseEnvContents}\n`;

  const scenarioMeta = getHandlersForScenario(scenario);
  /** these variables are required by the CAAPI client */
  const caapiVars = scenarioMeta?.mocksCustomerAccountApi
    ? `SHOP_ID="mock-shop"\nPUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID="shp_mock-client-id"\n`
    : '';

  await writeFile(
    mockEnvFile,
    `${normalizedEnvContents}HYDROGEN_E2E_MSW_SCENARIO=${scenario}\n${caapiVars}`,
  );

  return {mockEnvDir, mockEnvFile};
}

export const setTestStore = async (
  testStore: TestStoreKey | `https://${string}`,
  options: TestStoreOptions = {},
) => {
  const isLocal = !testStore.startsWith('https://');
  let server: DevServer | null = null;
  let mockEnvDir: string | undefined;

  const mockScenario = isLocal ? options.mock?.scenario : undefined;

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

    if (mockEnvDir) {
      await rm(mockEnvDir, {recursive: true, force: true});
    }
  });

  test.beforeAll(async ({}) => {
    const envFile = path.resolve(__dirname, `../envs/.env.${testStore}`);
    await stat(envFile); // Ensure the file exists

    let runtimeEnvFile = envFile;

    if (mockScenario) {
      const mockEnvFiles = await createMockEnvFile(envFile, mockScenario);
      runtimeEnvFile = mockEnvFiles.mockEnvFile;
      mockEnvDir = mockEnvFiles.mockEnvDir;
    }

    server = new DevServer({
      storeKey: testStore,
      customerAccountPush: false,
      envFile: runtimeEnvFile,
      entry: mockScenario
        ? path.resolve(__dirname, './msw/entry.ts')
        : undefined,
    });

    await server.start();
  });
};
