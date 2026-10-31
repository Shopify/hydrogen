import {defineConfig} from '@playwright/test';
import {getLoadtestHeaders} from './e2e/fixtures/test-secrets';

const isCI = !!process.env.CI;
const CI_RETRIES = 1;
// The consent specs depend on live Shopify consent and analytics endpoints,
// which intermittently respond slowly under parallel load. Playwright retries
// do not stack, so this project sets its total: the usual CI retry plus these.
const EXTRA_CONSENT_RETRIES = 2;

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: isCI ? CI_RETRIES : 0,
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
    // WARNING: Any spec that calls test.use({ extraHTTPHeaders }) REPLACES
    // (not merges) these headers. Spread getLoadtestHeaders() in that spec
    // or the OTP bypass silently breaks. See customerAccount.spec.ts.
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
      retries: (isCI ? CI_RETRIES : 0) + EXTRA_CONSENT_RETRIES,
    },
    {
      name: 'recipes',
      testDir: './e2e/specs/recipes',
      // Each recipe test uses isolated fixture directories, enabling parallel execution
      fullyParallel: true,
    },
  ],
});
