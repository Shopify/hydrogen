import {defineConfig} from '@playwright/test';

// Check for smoke test environment variable or if running smoke tests specifically
const isSmoke =
  process.env.SMOKE_TEST === 'true' ||
  process.argv.some((arg) => arg.includes('e2e/smoke'));

// Determine test directory based on smoke flag
const testDir = isSmoke ? './e2e/smoke' : './e2e';

export default defineConfig({
  // Configure test directory based on smoke flag
  testDir,

  // Base URL for all tests
  use: {
    baseURL: 'http://localhost:3000',
  },

  // No retries for now
  retries: 0,

  // Use multiple reporters for better debugging
  reporter: [
    ['list'],
    ['html', {outputFolder: 'playwright-report', open: 'never'}],
  ],

  // Automatically start dev server before tests
  webServer: {
    command: 'cd templates/skeleton && npm run dev',
    url: 'http://localhost:3000',
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI,
  },
});
