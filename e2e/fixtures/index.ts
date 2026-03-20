import {test as base} from '@playwright/test';
import {
  DevServer,
  STARTUP_TIMEOUT_IN_MS,
  TUNNEL_READY_TIMEOUT_IN_MS,
} from './server';
import path from 'node:path';
import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {StorefrontPage} from './storefront';
import {CartUtil} from './cart-utils';
import {DiscountUtil} from './discount-utils';
import {GiftCardUtil} from './gift-card-utils';
import {CustomerAccountUtil} from './customer-account-utils';
import type {MswScenario} from './msw/scenarios';
import {getHandlersForScenario} from './msw/handlers';

export * from '@playwright/test';
export * from './storefront';
export {
  getTestSecrets,
  getRequiredSecret,
  getLoadtestHeaders,
} from './test-secrets';
export {CartUtil} from './cart-utils';
export {DiscountUtil} from './discount-utils';
export {GiftCardUtil} from './gift-card-utils';
export {CustomerAccountUtil} from './customer-account-utils';

export const CUSTOMER_ACCOUNT_STORAGE_STATE_PATH = path.resolve(
  __dirname,
  '../.auth/customer-account.json',
);

// Only applies to the local Cloudflare tunnel path (not Oxygen deployments).
// Tunnel-based customer account tests need generous time because Cloudflare
// quick-tunnel propagation takes an observed 30-90s on top of dev server startup (~10s).
// Used for both the beforeAll hook (via test.setTimeout) and individual tests
// (via test.describe.configure in spec files).
// Computed from the constituent timeouts so the relationship stays in sync
// automatically. The margin ensures the tunnel health check's descriptive
// error surfaces before Playwright's generic beforeAll timeout fires.
const TUNNEL_SETUP_MARGIN_IN_MS = 30_000;
export const TUNNEL_SETUP_TIMEOUT_IN_MS =
  STARTUP_TIMEOUT_IN_MS +
  TUNNEL_READY_TIMEOUT_IN_MS +
  TUNNEL_SETUP_MARGIN_IN_MS;
export {mockCustomerAccountOperation} from './msw/graphql';
export {MSW_SCENARIOS} from './msw/scenarios';

export const test = base.extend<
  {
    storefront: StorefrontPage;
    cart: CartUtil;
    discount: DiscountUtil;
    giftCard: GiftCardUtil;
    customerAccount: CustomerAccountUtil;
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
  customerAccount: async ({page}, use) => {
    const customerAccount = new CustomerAccountUtil(page);
    await use(customerAccount);
  },
});

const TEST_STORE_KEYS = [
  'mockShop',
  'defaultConsentDisallowed_cookiesEnabled',
  'defaultConsentAllowed_cookiesEnabled',
  'defaultConsentDisallowed_cookiesDisabled',
  'defaultConsentAllowed_cookiesDisabled',
  'hydrogenPreviewStorefront',
  'customerAccount',
] as const;

type TestStoreKey = (typeof TEST_STORE_KEYS)[number];

type TestStoreOptions = {
  customerAccountPush?: boolean;
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
  const caapiVars = scenarioMeta.mocksCustomerAccountApi
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
    // test.describe.configure({ timeout }) only applies to individual test
    // bodies, not to beforeAll hooks — they inherit the global timeout (60s).
    // Tunnel propagation alone takes an observed 30-90s, so we must override explicitly.
    if (options.customerAccountPush) {
      test.setTimeout(TUNNEL_SETUP_TIMEOUT_IN_MS);
    }
    
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
      customerAccountPush: options.customerAccountPush ?? false,
      envFile: runtimeEnvFile,
      entry: mockScenario
        ? path.resolve(__dirname, './msw/entry.ts')
        : undefined,
    });

    await server.start();
  });
};
