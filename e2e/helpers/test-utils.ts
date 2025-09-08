import {BrowserContext} from '@playwright/test';

/**
 * Clear all browser state including cookies, localStorage, and sessionStorage
 * This ensures test isolation and prevents state leakage between tests
 */
export async function clearBrowserState(context: BrowserContext) {
  // Clear all cookies
  await context.clearCookies();

  // Clear storage state (includes localStorage and sessionStorage)
  await context.storageState({path: undefined});
}

/**
 * Wait for cart state to be fully updated after an action
 * This helps prevent flaky tests due to async cart operations
 */
export async function waitForCartUpdate(timeMs: number = 1500) {
  await new Promise((resolve) => setTimeout(resolve, timeMs));
}
