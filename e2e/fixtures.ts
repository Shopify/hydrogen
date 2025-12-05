import {test as base, expect} from '@playwright/test';
import {DevServer} from './server';
import path from 'node:path';
import {stat} from 'node:fs/promises';

export * from '@playwright/test';

let baseUrl = '';
let testStoreKey: TestStoreKey = 'mockShop';

export const setTestStore = async (_testStoreKey: TestStoreKey) => {
  testStoreKey = _testStoreKey;
};

export const test = base.extend<{}, {forEachWorker: void}>({
  // eslint-disable-next-line no-empty-pattern
  baseURL: async ({}, use) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(baseUrl);
  },
  forEachWorker: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, runTests) => {
      const workerIndex = test.info().workerIndex;
      // This code runs before all the tests in the worker process.
      // console.log(`Starting test worker ${workerIndex}`);

      console.log(
        `[Worker ${workerIndex}] Starting dev server for ${testStoreKey}...`,
      );

      const testStoreEnvFile = await getTestStoreEnvFile(testStoreKey);

      const server = new DevServer(workerIndex, {
        customerAccountPush: false,
        envFile: testStoreEnvFile,
      });

      await server.start();

      baseUrl = server.getUrl();

      console.log(`[Worker ${workerIndex}] Server ready at: ${baseUrl}`);

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
  const filepath = path.resolve(__dirname, `envs/.env.${key}`);
  await stat(filepath); // Ensure the file exists
  return filepath;
}
