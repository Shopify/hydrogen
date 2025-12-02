import {defineConfig} from '@playwright/test';

// Check for smoke test environment variable or if running smoke tests specifically
const isSmoke =
  process.env.SMOKE_TEST === 'true' ||
  process.argv.some((arg) => arg.includes('e2e/smoke'));

// Determine test directory based on smoke flag
const testDir = isSmoke ? './e2e/smoke' : './e2e';

const e2ePort = process.env.E2E_PORT || '3100';
const baseURL = `http://localhost:${e2ePort}`;

export default defineConfig({
  // Configure test directory based on smoke flag
  testDir,

  // Base URL for all tests
  use: {
    baseURL,
  },

  // No retries for now
  retries: 0,

  // Use list reporter for clear output
  reporter: 'list',

  // Automatically start dev server before tests
  webServer: {
    command: 'cd templates/skeleton && npm run dev',
    url: baseURL,
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      // Hydrogen CLI reads port from SHOPIFY_HYDROGEN_FLAG_PORT env var
      SHOPIFY_HYDROGEN_FLAG_PORT: e2ePort,
    },
  },
});
