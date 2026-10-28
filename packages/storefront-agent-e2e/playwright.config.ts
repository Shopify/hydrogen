import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

import { CDP_PORT, readRunConfig } from "./src/config";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
const envFile = path.join(packageRoot, ".env.local");
// The matrix runner points each batch at its own output folder.
const outRoot = process.env.STOREFRONT_AGENT_OUT ?? packageRoot;
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  testMatch: "**/*.spec.ts",
  projects: [
    // Agent runs and the scripted verifier checks.
    { name: "agent", testDir: path.join(packageRoot, "specs") },
    // Deterministic scripts generated from passing agent runs; no LLM.
    { name: "replay", testDir: path.join(packageRoot, "generated") },
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: path.join(outRoot, "playwright-report") }],
    ["json", { outputFile: path.join(outRoot, "playwright-results.json") }],
  ],
  outputDir: path.join(outRoot, "test-results"),
  use: {
    baseURL: readRunConfig().storefrontBaseUrl,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL,
    // Real window, no viewport emulation: Stagehand screenshots the window itself (see src/viewport.ts).
    launchOptions: { args: [`--remote-debugging-port=${CDP_PORT}`, "--window-size=1280,900"] },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    // Traces record full checkout URLs, including the cart key (a bearer secret). Opt in locally.
    trace: process.env.STOREFRONT_AGENT_TRACE === "1" ? "retain-on-failure" : "off",
    viewport: null,
  },
});
