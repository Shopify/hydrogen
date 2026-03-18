import {defineConfig} from '@playwright/test';
import {getTestSecrets} from './e2e/fixtures/test-secrets';

const isCI = !!process.env.CI;

function getLoadtestHeaders(): Record<string, string> {
  try {
    const secrets = getTestSecrets();
    const header = secrets.loadtest_header;
    if (header) return {[header]: 'true'};
  } catch {
    // Secrets not available (e.g. missing ejson key). The loadtest header is
    // required for customer account OTP bypass — without it, tests fail
    // cryptically minutes later. Warn loudly so the root cause is obvious.
    console.warn(
      '[playwright.config] Failed to load loadtest header from ejson secrets.\n' +
        'Customer account tests will fail without it.\n' +
        'Set up ejson: ./scripts/setup-ejson-private-key.sh',
    );
  }
  return {};
}

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: isCI ? 1 : 0,
  reporter: [['html', {open: 'on-failure', outputFolder: 'playwright-report'}]],
  // 3 workers in CI (ubuntu-latest: 2 vCPUs, 7GB RAM).
  // Each worker spawns a Vite dev server + Chromium. Increase with caution.
  workers: process.env.CI ? 3 : 4,
  fullyParallel: true,
  timeout: 60 * 1000,
  use: {
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    // Record trace on first retry (helps debug flaky tests)
    trace: 'on-first-retry',
    // Loadtest header so Shopify's bot-priority system recognises our
    // traffic as internal Playwright e2e tests.
    extraHTTPHeaders: getLoadtestHeaders(),
  },
  projects: [
    {
      name: 'skeleton',
      testDir: './e2e/specs/skeleton',
    },
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
