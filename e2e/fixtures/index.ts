import {test as base} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {stat} from 'node:fs/promises';
import {StorefrontPage} from './storefront';

export * from '@playwright/test';
export * from './storefront';

let baseUrl = '';

export const setTestStore = async (testStoreKey: TestStoreKey) => {
  let server: DevServer;

  base.beforeAll(async () => {
    const testStoreEnvFile = await getTestStoreEnvFile(testStoreKey);

    server = new DevServer({
      storeKey: testStoreKey,
      customerAccountPush: false,
      envFile: testStoreEnvFile,
    });

    await server.start();

    baseUrl = server.getUrl();
  });

  base.afterAll(async () => {
    await server?.stop();
  });
};

export const test = base.extend<
  {storefront: StorefrontPage},
  {forEachWorker: void}
>({
  baseURL: async ({}, use) => {
    await use(baseUrl);
  },
  storefront: async ({page}, use) => {
    const storefront = new StorefrontPage(page);
    await use(storefront);
  },
});

const TEST_STORE_KEYS = [
  'mockShop',
  'defaultConsentDisallowed_cookiesEnabled',
  'defaultConsentAllowed_cookiesEnabled',
] as const;

type TestStoreKey = (typeof TEST_STORE_KEYS)[number];

async function getTestStoreEnvFile(key: TestStoreKey) {
  const filepath = path.resolve(__dirname, `../envs/.env.${key}`);
  await stat(filepath); // Ensure the file exists
  return filepath;
}
