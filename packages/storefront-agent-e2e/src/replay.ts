import { expect, test as base, type Page, type TestInfo } from "@playwright/test";

import { captureCheckout, CHECKOUT_STUB_HEADING, redactCartKeys } from "./checkout";
import { classify, type VerifiedState } from "./classify";
import { verifyProductPage } from "./product-page";
import type { AddToCartTask, FindProductTask } from "./task";
import { verifyCart } from "./verify";
import { sizeWindowToViewport } from "./viewport";

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
  readonly finishAtCheckout: (task: AddToCartTask) => Promise<void>;
  /** Checks the page the steps ended on is the product's, exactly like an agent run. */
  readonly finishOnProductPage: (task: FindProductTask) => Promise<void>;
};

export const test = base.extend<{ replay: Replay }>({
  replay: async ({ page }, use, testInfo) => {
    const checkout = await captureCheckout(page.context());
    // Same window as the agent run, so coordinate steps land where they were recorded.
    await sizeWindowToViewport(page);
    const network = trackNetwork(page);
    await use({
      start: async (path) => {
        await page.goto(path);
        await network.settled();
      },
      step: (label, action, options = {}) =>
        base.step(label, async () => {
          try {
            await action(page);
            // Wait for the page the recorded click led to, so the next step can't land on the old one.
            const { thenUrl } = options;
            if (thenUrl) await page.waitForURL((url) => samePathAndQuery(url, thenUrl));
            // The agent paused to look after every action; give the page the same chance to settle
            // (e.g. a cart update re-enabling Checkout) before the next recorded step.
            await network.settled();
          } catch (error) {
            markStale(testInfo, `step "${label}": ${firstLine(error)}`);
            throw error;
          }
        }),
      finishAtCheckout: async (task) => {
        try {
          await expect(page.getByRole("heading", { name: CHECKOUT_STUB_HEADING })).toBeVisible();
        } catch (error) {
          markStale(testInfo, "the recorded steps never reached checkout");
          throw error;
        }
        await judge(testInfo, await verifyCart(task, checkout.url()));
      },
      // All recorded steps succeeded, so a wrong page is the storefront's verdict, not staleness.
      finishOnProductPage: async (task) => {
        await judge(testInfo, await verifyProductPage(page, task));
      },
    });
  },
});

async function judge(testInfo: TestInfo, state: VerifiedState & { reason?: string }) {
  const outcome = classify("done", state);
  const verdict = redactCartKeys(JSON.stringify({ outcome, state }, null, 2));
  const why = state.reason ? `: ${state.reason}` : "";
  testInfo.annotations.push({
    type: VERDICT_ANNOTATION,
    description: redactCartKeys(`${outcome}${why}`),
  });
  await testInfo.attach("verdict.json", { body: verdict, contentType: "application/json" });
  expect(outcome, verdict).toBe("PASS");
}

const QUIET_MS = 500;
const SETTLE_TIMEOUT_MS = 5_000;

function isData(type: string): boolean {
  return type === "fetch" || type === "xhr";
}

// Counts in-flight fetch/XHR requests so a step can wait until the page has gone quiet.
function trackNetwork(page: Page): { settled: () => Promise<void> } {
  let inFlight = 0;
  let lastChange = Date.now();
  page.on("request", (request) => {
    if (!isData(request.resourceType())) return;
    inFlight += 1;
    lastChange = Date.now();
  });
  const done = (request: { resourceType(): string }) => {
    if (!isData(request.resourceType())) return;
    inFlight = Math.max(0, inFlight - 1);
    lastChange = Date.now();
  };
  page.on("requestfinished", done);
  page.on("requestfailed", done);
  return {
    settled: async () => {
      const deadline = Date.now() + SETTLE_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (inFlight === 0 && Date.now() - lastChange >= QUIET_MS) return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    },
  };
}

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
