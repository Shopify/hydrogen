import {defineConfig, devices} from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'html' : 'list',
  workers: 1,
  fullyParallel: true,
  timeout: 60 * 1000,
  use: {
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    // Record trace on first retry (helps debug flaky tests)
    trace: 'on-first-retry',
  },
  projects: [
    // Smoke tests - Chromium only
    {
      name: 'smoke',
      testDir: './e2e/specs/smoke',
      use: {...devices['Desktop Chrome']},
    },
    // New cookies tests - all browsers
    {
      name: 'new-cookies-chromium',
      testDir: './e2e/specs/new-cookies',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'new-cookies-firefox',
      testDir: './e2e/specs/new-cookies',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'new-cookies-webkit',
      testDir: './e2e/specs/new-cookies',
      use: {...devices['Desktop Safari']},
    },
    // Old cookies tests - all browsers (TODO: remove once new cookies rolled out)
    {
      name: 'old-cookies-chromium',
      testDir: './e2e/specs/old-cookies',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'old-cookies-firefox',
      testDir: './e2e/specs/old-cookies',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'old-cookies-webkit',
      testDir: './e2e/specs/old-cookies',
      use: {...devices['Desktop Safari']},
    },
  ],
});
