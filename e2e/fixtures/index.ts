import {test as base} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {stat} from 'node:fs/promises';
import {StorefrontPage} from './storefront';

export * from '@playwright/test';
export * from './storefront';

let baseUrl = '';
let testStoreKey: TestStoreKey = 'mockShop';

export const setTestStore = async (_testStoreKey: TestStoreKey) => {
  testStoreKey = _testStoreKey;
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
  forEachWorker: [
    async ({}, runTests) => {
      const workerIndex = test.info().workerIndex;
      // This code runs before all the tests in the worker process.
      // console.log(`Starting test worker ${workerIndex}`);

      const testStoreEnvFile = await getTestStoreEnvFile(testStoreKey);

      const server = new DevServer({
        id: workerIndex,
        storeKey: testStoreKey,
        customerAccountPush: false,
        envFile: testStoreEnvFile,
      });

      await server.start();

      baseUrl = server.getUrl();

      await runTests();
      // This code runs after all the tests in the worker process.
      // console.log(`Stopping test worker ${workerIndex}`);

      await server.stop();
    },
    {scope: 'worker', auto: true},
  ],
});

const TEST_STORE_KEYS = [
  'mockShop',
  'defaultConsentDisallowed_cookiesEnabled',
] as const;

type TestStoreKey = (typeof TEST_STORE_KEYS)[number];

async function getTestStoreEnvFile(key: TestStoreKey) {
  const filepath = path.resolve(__dirname, `../envs/.env.${key}`);
  await stat(filepath); // Ensure the file exists
  return filepath;
}
