import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

import { getStorefrontBaseUrl, getStorefrontE2EWorkerCount } from "./src/runtime-config";
import {
  ACTION_TIMEOUT_MS,
  EXPECT_TIMEOUT_MS,
  NAVIGATION_TIMEOUT_MS,
  TEST_TIMEOUT_MS,
} from "./src/timeouts";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: path.join(packageRoot, "specs"),
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: getStorefrontE2EWorkerCount(),
  timeout: TEST_TIMEOUT_MS,
  expect: {
    timeout: EXPECT_TIMEOUT_MS,
  },
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: path.join(packageRoot, "playwright-report"),
      },
    ],
  ],
  outputDir: path.join(packageRoot, "test-results"),
  use: {
    actionTimeout: ACTION_TIMEOUT_MS,
    baseURL: getStorefrontBaseUrl(),
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
    navigationTimeout: NAVIGATION_TIMEOUT_MS,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
    viewport: { width: 1280, height: 900 },
  },
});
