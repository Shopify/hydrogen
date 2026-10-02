import {defineConfig} from '@playwright/test';

/**
 * Runs the Observe bundles in e2e/observe/dist the way the Observe Synthetic
 * Checks runner does: a plain Playwright runner with no repo fixtures, no
 * playwright.config defaults, no dev server. Everything the bundles need is
 * baked in at build time (see e2e/observe/build.mjs).
 *
 * Usage (with dev servers for each store running locally, or with the map
 * baked against deployments):
 *   pnpm exec playwright test --config e2e/observe/verify.config.ts
 */
export default defineConfig({
  testDir: './dist',
  timeout: 60_000,
  // One browser per bundle, like a single Observe check execution.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
});
