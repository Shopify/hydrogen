import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

import { CDP_PORT, readRunConfig } from "./src/config";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const envFile = path.join(packageRoot, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  testDir: path.join(packageRoot, "specs"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(packageRoot, "playwright-report") }],
    ["json", { outputFile: path.join(packageRoot, "playwright-results.json") }],
  ],
  outputDir: path.join(packageRoot, "test-results"),
  use: {
    baseURL: readRunConfig().storefrontBaseUrl,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
    launchOptions: { args: [`--remote-debugging-port=${CDP_PORT}`] },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    // Traces record full checkout URLs, including the cart key (a bearer secret). Opt in locally.
    trace: process.env.STOREFRONT_AGENT_TRACE === "1" ? "retain-on-failure" : "off",
    viewport: { width: 1280, height: 800 },
  },
});
