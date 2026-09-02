import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

import { getLoadtestHeaders } from "./e2e/fixtures/test-secrets";

const isCI = !!process.env.CI;
const hydrogenRoot = fileURLToPath(new URL(".", import.meta.url));
const e2eSpecsRoot = path.join(hydrogenRoot, "e2e/specs");

export default defineConfig({
  testMatch: /\.spec\.ts$/,
  retries: isCI ? 1 : 0,
  reporter: [
    [
      "html",
      {
        open: "on-failure",
        outputFolder: path.join(hydrogenRoot, "playwright-report"),
      },
    ],
  ],
  outputDir: path.join(hydrogenRoot, "test-results"),
  // 3 workers in CI (ubuntu-latest: 2 vCPUs, 7GB RAM).
  // Each worker spawns a Vite dev server + Chromium. Increase with caution.
  workers: process.env.CI ? 3 : 4,
  fullyParallel: true,
  timeout: 60 * 1000,
  use: {
    // Capture screenshot on failure
    screenshot: "only-on-failure",
    // Record trace on first retry (helps debug flaky tests)
    trace: "on-first-retry",
    // Loadtest header so Shopify's bot-priority system recognises our
    // traffic as internal Playwright e2e tests.
    // WARNING: Any spec that calls test.use({ extraHTTPHeaders }) REPLACES
    // (not merges) these headers. Spread getLoadtestHeaders() in that spec
    // or the OTP bypass silently breaks. See customerAccount.spec.ts.
    extraHTTPHeaders: getLoadtestHeaders(),
  },
  projects: [
    {
      name: "skeleton",
      testDir: path.join(e2eSpecsRoot, "skeleton"),
    },
    {
      name: "smoke",
      testDir: path.join(e2eSpecsRoot, "smoke"),
    },
    {
      name: "new-cookies",
      testDir: path.join(e2eSpecsRoot, "new-cookies"),
    },
    {
      // TODO: remove once new cookies are rolled out
      name: "old-cookies",
      testDir: path.join(e2eSpecsRoot, "old-cookies"),
    },
    // TODO-HYDROGEN-E2E: re-enable recipes after fixture generation copies from a
    // source outside examples/hydrogen/.tmp instead of copying into itself.
    // {
    //   name: "recipes",
    //   testDir: path.join(e2eSpecsRoot, "recipes"),
    //   // Each recipe test uses isolated fixture directories, enabling parallel execution
    //   fullyParallel: true,
    // },
  ],
});
