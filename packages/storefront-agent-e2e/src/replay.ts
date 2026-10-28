import { expect, test as base, type Page, type TestInfo } from "@playwright/test";

import { captureCheckout, CHECKOUT_STUB_HEADING, redactCartKeys } from "./checkout";
import { classify } from "./classify";
import type { AddToCartTask } from "./task";
import { verifyCart } from "./verify";

/** Annotation types the regenerate flow reads from the Playwright JSON report. */
export const STALE_ANNOTATION = "replay-stale";
export const VERDICT_ANNOTATION = "replay-verdict";

export type Replay = {
  readonly start: (path: string) => Promise<void>;
  /** A recorded shopper step. A failure here means the script is stale, not that the store is. */
  readonly step: (
    label: string,
    action: (page: Page) => Promise<unknown>,
    options?: { readonly thenUrl?: string },
  ) => Promise<void>;
  /** Checks the handoff happened and verifies the cart, exactly like an agent run. */
  readonly finish: (task: AddToCartTask) => Promise<void>;
};

export const test = base.extend<{ replay: Replay }>({
  replay: async ({ page }, use, testInfo) => {
    const checkout = await captureCheckout(page.context());
    await use({
      start: async (path) => {
        await page.goto(path);
      },
      step: (label, action, options = {}) =>
        base.step(label, async () => {
          try {
            await action(page);
            // Wait for the page the recorded click led to, so the next step can't land on the old one.
            const { thenUrl } = options;
            if (thenUrl) await page.waitForURL((url) => samePathAndQuery(url, thenUrl));
          } catch (error) {
            markStale(testInfo, `step "${label}": ${firstLine(error)}`);
            throw error;
          }
        }),
      finish: async (task) => {
        try {
          await expect(page.getByRole("heading", { name: CHECKOUT_STUB_HEADING })).toBeVisible();
        } catch (error) {
          markStale(testInfo, "the recorded steps never reached checkout");
          throw error;
        }
        const state = await verifyCart(task, checkout.url());
        const outcome = classify("done", state);
        const verdict = redactCartKeys(JSON.stringify({ outcome, state }, null, 2));
        const why =
          state.kind === "wrong" || state.kind === "unverifiable" ? `: ${state.reason}` : "";
        testInfo.annotations.push({
          type: VERDICT_ANNOTATION,
          description: redactCartKeys(`${outcome}${why}`),
        });
        await testInfo.attach("verdict.json", { body: verdict, contentType: "application/json" });
        expect(outcome, verdict).toBe("PASS");
      },
    });
  },
});

function samePathAndQuery(actual: URL, expected: string): boolean {
  const wanted = new URL(expected, actual);
  return actual.pathname === wanted.pathname && sortedQuery(actual) === sortedQuery(wanted);
}

function sortedQuery(url: URL): string {
  return [...url.searchParams]
    .map(([key, value]) => `${key}=${value}`)
    .toSorted()
    .join("&");
}

function markStale(testInfo: TestInfo, description: string) {
  testInfo.annotations.push({ type: STALE_ANNOTATION, description });
}

function firstLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (message.split("\n")[0] ?? "").slice(0, 200);
}
