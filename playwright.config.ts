import {defineConfig} from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'html' : 'list',
  workers: 1,
  fullyParallel: true,
  timeout: 20 * 1000,
  use: {
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'on',
  },
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
