import {defineConfig} from '@playwright/test';

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: 0,
  reporter: 'list',
  // Run one worker per file to ensure test isolation with different store configs
  fullyParallel: true,
  timeout: 60 * 1000,
  projects: [
    {
      name: 'smoke',
      testDir: './e2e/specs/smoke',
    },
    {
      name: 'new-cookies',
      testDir: './e2e/specs/new-cookies',
    },
    {
      // TODO: remove once new cookies are rolled out
      name: 'old-cookies',
      testDir: './e2e/specs/old-cookies',
    },
  ],
});
