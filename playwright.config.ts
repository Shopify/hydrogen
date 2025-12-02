import {defineConfig} from '@playwright/test';

// Check for smoke test environment variable or if running smoke tests specifically
const isSmoke =
  process.env.SMOKE_TEST === 'true' ||
  process.argv.some((arg) => arg.includes('e2e/smoke'));
const isCustomerAccountPush = process.env.E2E_CUSTOMER_ACCOUNT_PUSH === 'true';

// Determine test directory based on smoke flag
const testDir = isSmoke
  ? './e2e/smoke'
  : isCustomerAccountPush
    ? './e2e/cookies' // TODO: make this more generic
    : './e2e';

const e2ePort = (process.env.E2E_PORT ??= '3100');

export default defineConfig({
  testDir,

  globalSetup: require.resolve('./e2e/global-setup.mjs'),

  use: {
    baseURL: `http://localhost:${e2ePort}`,
  },

  // No retries for now
  retries: 0,

  // Use list reporter for clear output
  reporter: 'list',
});
