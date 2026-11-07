import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { Buyer, BuyerResult } from "./agent/buyer.ts";
import { createRedactor, type EvidenceSink } from "./evidence.ts";
import { PageLoadError, runScenario, type Driver } from "./runner.ts";
import type { CartReference } from "./scenario.ts";
import { addToCart } from "./scenarios/add-to-cart.ts";
import {
  fakeFetch,
  memoryArtifacts,
  sfapi,
  US_EN,
  type FakeRequest,
} from "./scenarios/test-helpers.ts";
import { createStorefrontApi } from "./shopify/storefront.ts";
import { LocaleUnavailableError } from "./storefront-locale-error.ts";

const STOREFRONT = new URL("https://www.example.com/");
const VARIANT = "gid://shopify/ProductVariant/7";
const CHECKOUT_URL = "https://www.example.com/cart/c/hWN1secretToken99?key=deadbeefcafe1234";

type Context = { country: string; language: string };

function product(handle: string, variant: string) {
  return {
    id: `gid://shopify/Product/${handle}`,
    title: handle,
    handle,
    requiresSellingPlan: false,
    variants: {
      pageInfo: { hasNextPage: false },
      nodes: [
        {
          id: variant,
          title: "M",
          availableForSale: true,
          selectedOptions: [{ name: "Size", value: "M" }],
        },
      ],
    },
  };
}

function catalog(nodes: unknown[], context: Context | null = US_EN) {
  return {
    body: sfapi(
      { products: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } },
      context,
    ),
  };
}

const catalogFound = catalog([product("shirt", VARIANT)]);
const catalogEmpty = catalog([]);

function cart(
  lines: Array<[string, number]>,
  checkoutUrl = CHECKOUT_URL,
  options: { context?: Context | null; buyerCountry?: string | null } = {},
) {
  return {
    body: sfapi(
      {
        cart: {
          id: "gid://shopify/Cart/hWN1secretToken99?key=deadbeefcafe1234",
          checkoutUrl,
          totalQuantity: lines.reduce((sum, [, quantity]) => sum + quantity, 0),
          buyerIdentity: { countryCode: options.buyerCountry ?? null },
          lines: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: lines.map(([id, quantity]) => ({ quantity, merchandise: { id } })),
          },
        },
      },
      options.context === undefined ? US_EN : options.context,
    ),
  };
}

type Script = (onEvidence: EvidenceSink, signal: AbortSignal) => Promise<BuyerResult>;

type DriverOptions = {
  failClose?: boolean;
  onBuyerClose?: () => void;
  failSession?: boolean;
  /** Fails `navigate` for a URL path. */
  navigateError?: (path: string) => Error | undefined;
  /** Session creation resolves only after this delay (ms). */
  sessionDelayMs?: number;
  /** The locale for each `readLocale` call, by call index. Default US/EN. */
  locale?: (call: number) => { country: string; language: string };
  /** An error for a `readLocale` call, by call index, instead of a locale. */
  localeError?: (call: number) => Error | undefined;
  /** Receives the session evidence sink, so a test can emit browser evidence at any time. */
  browser?: { emit?: EvidenceSink; onClose?: () => void };
  /** Adds a page cart reference reader to the driver. */
  cartReference?: () => Promise<CartReference>;
};

function fakeDriver(script: Script, log: string[], options: DriverOptions = {}) {
  const calls = { loaded: 0, buyers: 0, locales: 0, navigations: [] as string[] };
  const cartReference = options.cartReference;
  const driver: Driver<{ close(): Promise<void> }> = {
    ...(cartReference === undefined
      ? {}
      : {
          async readCartReference() {
            log.push("cart:read");
            return cartReference();
          },
        }),
    buyer: { model: "test-model", promptSha256: "abc" },
    async createSession({ onEvidence }) {
      log.push("session:create");
      if (options.browser !== undefined) {
        options.browser.emit = onEvidence;
      }
      if (options.failSession === true) {
        throw new Error("chromium missing");
      }
      if (options.sessionDelayMs !== undefined) {
        await new Promise((resolve) => setTimeout(resolve, options.sessionDelayMs));
      }
      return {
        async close() {
          log.push("session:close");
          options.browser?.onClose?.();
        },
      };
    },
    async navigate(_session, url) {
      log.push(`navigate:${url.pathname}`);
      calls.navigations.push(url.href);
      const error = options.navigateError?.(url.pathname);
      if (error !== undefined) {
        throw error;
      }
    },
    async readLocale() {
      log.push("locale");
      const call = calls.locales++;
      const error = options.localeError?.(call);
      if (error !== undefined) throw error;
      return options.locale?.(call) ?? { ...US_EN };
    },
    async createBuyer(_session, onEvidence) {
      log.push("buyer:create");
      calls.buyers++;
      const buyer: Buyer = {
        act: async (_objective, { signal }) => {
          log.push("buyer:act");
          return script(onEvidence, signal);
        },
        async close() {
          log.push("buyer:close");
          options.onBuyerClose?.();
          if (options.failClose === true) {
            throw new Error(`close failed for ${CHECKOUT_URL}`);
          }
        },
      };
      return buyer;
    },
  };
  return {
    calls,
    loadDriver: async () => {
      calls.loaded++;
      return driver;
    },
  };
}

async function run(
  responses: Array<{ status?: number; body: unknown }>,
  script: Script,
  options: DriverOptions & {
    timeoutMs?: number;
    failEvidence?: boolean;
    storefront?: URL;
    requested?: { country?: string; language?: string };
    /** External cancellation, such as SIGINT. */
    signal?: AbortSignal;
  } = {},
) {
  const log: string[] = [];
  const fake = fakeFetch(responses);
  const fetch: typeof globalThis.fetch = async (input, init) => {
    log.push("api");
    return fake.fetch(input, init);
  };
  const artifacts = memoryArtifacts({ failEvidence: options.failEvidence });
  const redactor = createRedactor();
  const driver = fakeDriver(script, log, options);
  const storefront = options.storefront ?? STOREFRONT;
  const result = await runScenario({
    runId: "run-1",
    scenario: addToCart,
    storefrontUrl: storefront,
    api: createStorefrontApi({ origin: storefront.origin, fetch }),
    requestedContext: options.requested ?? {},
    maxSteps: 10,
    timeoutMs: options.timeoutMs ?? 5_000,
    catalogPages: 3,
    metadata: { node: "v24", tools: { "playwright-core": "1.59.1" } },
    artifacts,
    redactor,
    loadDriver: driver.loadDriver,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  return { result, artifacts, redactor, calls: driver.calls, log, requests: fake.requests };
}

/** The header of one Standard Event cart lines add. */
function lineUpdateEvent(phase: string) {
  return { id: "e1", name: "shopify:cart:lines-update", action: "add", phase };
}

const checkoutThenComplete: Script = async (onEvidence) => {
  await onEvidence({
    kind: "standard-event",
    timestamp: 1,
    data: { name: "product_added_to_cart", ok: false },
  });
  await onEvidence({ kind: "checkout", timestamp: 2, data: { url: CHECKOUT_URL, cartId: "" } });
  return { completed: true, reason: "completed", summary: "done" };
};

/** The browser context before any API call or buyer: session, storefront page, locale read. */
const PREFLIGHT = ["session:create", "navigate:/", "locale"];

describe("runScenario", () => {
  it("skips an empty catalog after the browser preflight, with no buyer or model", async () => {
    const { result, artifacts, calls, log } = await run([catalogEmpty], checkoutThenComplete);
    assert.equal(result.verdict, "skipped");
    // The browser preflight is required to resolve the context, but no buyer starts.
    assert.deepEqual(log, [...PREFLIGHT, "api", "session:close"]);
    assert.equal(calls.buyers, 0);
    assert.equal(result.metadata.buyer, undefined);
    assert.deepEqual(result.context.resolved, US_EN);
    assert.match(result.reason, /in context US\/EN/);
    assert.equal(artifacts.results.length, 1);
  });

  it("is indeterminate (not skipped) when the catalog cap is exhausted", async () => {
    const page = {
      body: sfapi({ products: { pageInfo: { hasNextPage: true, endCursor: "c" }, nodes: [] } }),
    };
    const { result, calls } = await run([page, page, page], checkoutThenComplete);
    assert.equal(result.verdict, "indeterminate");
    assert.equal(calls.buyers, 0);
  });

  it("classifies API setup failures as indeterminate api errors", async () => {
    const { result, calls } = await run([{ status: 503, body: "down" }], checkoutThenComplete);
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "api");
    assert.equal(calls.buyers, 0);
  });

  it("passes when the checkout cart holds exactly the pinned variant, ignoring event evidence", async () => {
    const { result, artifacts, redactor, log } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      checkoutThenComplete,
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.observations.standardEvents, 1);
    assert.equal(result.pinned?.variantId, VARIANT);
    assert.equal(result.metadata.buyer?.model, "test-model");
    // The frozen context record, then the buyer evidence.
    assert.deepEqual(
      artifacts.evidence.map((record) => record.kind),
      ["storefront-context", "standard-event", "checkout"],
    );
    assert.deepEqual(log.slice(-2), ["buyer:close", "session:close"]);
    const serialized =
      redactor.serialize(result) +
      artifacts.evidence.map((record) => redactor.serialize(record)).join("");
    assert.doesNotMatch(serialized, /hWN1secretToken99|deadbeefcafe1234/);
  });

  it("verifies the page cart ID after the buyer detached and before the session closes, with no handoff", async () => {
    const pageId = "gid://shopify/Cart/hWN1secretToken99?key=pageActionKey77";
    const { result, redactor, log, requests } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async () => ({ completed: true, reason: "completed", summary: "Added." }),
      { cartReference: async () => ({ status: "available", cartId: pageId }) },
    );
    assert.equal(result.verdict, "pass", result.reason);
    // The buyer was detached first; the page was read before the session closed.
    const order = ["buyer:act", "buyer:close", "cart:read", "session:close"].map((step) =>
      log.indexOf(step),
    );
    assert.deepEqual(
      order.toSorted((a, b) => a - b),
      order,
      log.join(","),
    );
    assert.ok(!order.includes(-1), log.join(","));
    assert.equal(requests.at(-1)?.variables.id, pageId);
    assert.equal(result.checkpoints[0]?.stoppedOn, undefined);
    // The ID was never written to evidence, and it is registered for redaction anyway.
    assert.equal(redactor.text(`id ${pageId}`), "id [REDACTED]");
    assert.equal(redactor.text("pageActionKey77"), "[REDACTED]");
  });

  it("ends indeterminate and closes the session when aborted during the page cart read", async () => {
    const controller = new AbortController();
    // The read never settles and ignores every signal.
    const { result, log, requests } = await run(
      [catalogFound],
      async () => ({ completed: true, reason: "completed", summary: "Added." }),
      {
        signal: controller.signal,
        cartReference: async () => {
          setTimeout(() => controller.abort(new Error("SIGINT")), 0);
          return new Promise<CartReference>(() => {});
        },
      },
    );
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.checkpoints[0]?.errorKind, "browser");
    assert.match(result.checkpoints[0]?.reason ?? "", /cart action could not be read/);
    // Only the catalog was read: no cart read after the abort.
    assert.equal(requests.length, 1);
    assert.equal(log.at(-1), "session:close");
    assert.ok(log.indexOf("cart:read") < log.indexOf("session:close"), log.join(","));
  });

  it("passes on API proof of the pinned variant even when the buyer did not report completion", async () => {
    const pageId = "gid://shopify/Cart/hWN1secretToken99?key=pageActionKey77";
    const { result } = await run(
      [
        catalogFound,
        cart([
          [VARIANT, 1],
          ["gid://shopify/ProductVariant/gift", 1],
        ]),
      ],
      async () => ({ completed: false, reason: "step-limit", summary: "Ran out of steps." }),
      { cartReference: async () => ({ status: "available", cartId: pageId }) },
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.checkpoints[0]?.details?.otherLines, 1);
  });

  it("classifies a Storefront API HTTP error in the cart read as indeterminate (api), not a storefront failure", async () => {
    const pageId = "gid://shopify/Cart/hWN1secretToken99?key=pageActionKey77";
    const { result } = await run(
      [catalogFound, { status: 500, body: "down" }],
      async () => ({ completed: true, reason: "completed", summary: "Added." }),
      { cartReference: async () => ({ status: "available", cartId: pageId }) },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "api");
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "storefront-api",
      code: "http-status",
      httpStatus: 500,
    });
  });

  it("keeps an API HTTP error indeterminate even after a storefront-reported add rejection", async () => {
    const pageId = "gid://shopify/Cart/hWN1secretToken99?key=pageActionKey77";
    const { result } = await run(
      [catalogFound, { status: 500, body: "down" }],
      async (onEvidence) => {
        await onEvidence({
          kind: "standard-event",
          timestamp: 1,
          data: {
            event: lineUpdateEvent("input"),
            input: { action: "add", lines: [{ merchandiseId: VARIANT, quantity: 1 }] },
          },
        });
        await onEvidence({
          kind: "standard-event",
          timestamp: 2,
          data: { event: lineUpdateEvent("settled"), result: { userErrors: [{ code: "X" }] } },
        });
        return { completed: false, reason: "step-limit", summary: "Ran out." };
      },
      { cartReference: async () => ({ status: "available", cartId: pageId }) },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "api");
  });

  it("does not read the page cart after a blocked checkout handoff", async () => {
    const { result, log } = await run([catalogFound, cart([[VARIANT, 1]])], checkoutThenComplete, {
      cartReference: async () => ({ status: "empty" }),
    });
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(log.includes("cart:read"), false);
  });

  it("fails for the wrong quantity", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 2]])], checkoutThenComplete);
    assert.equal(result.verdict, "fail");
  });

  it("fails for the wrong variant", async () => {
    const { result } = await run(
      [catalogFound, cart([["gid://shopify/ProductVariant/8", 1]])],
      checkoutThenComplete,
    );
    assert.equal(result.verdict, "fail");
  });

  it("does not turn standard-event evidence alone into a verdict", async () => {
    const { result } = await run([catalogFound], async (onEvidence) => {
      await onEvidence({
        kind: "standard-event",
        timestamp: 1,
        data: { name: "checkout_started", ok: true },
      });
      return { completed: true, reason: "completed", summary: "claims done" };
    });
    // A completed buyer claim with no cart reference to verify is not a verdict.
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "browser");
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "page-cart-action",
      code: "reference-unavailable",
    });
  });

  it("is indeterminate on timeout with no checkout, and still writes a result", async () => {
    const { result, artifacts, log } = await run(
      [catalogFound],
      async () => new Promise(() => {}),
      { timeoutMs: 50 },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "timeout");
    assert.equal(result.checkpoints[0]?.buyer.reason, "aborted");
    assert.equal(artifacts.results.length, 1);
    assert.deepEqual(log.slice(-2), ["buyer:close", "session:close"]);
  });

  it("still asserts a captured checkout after the timeout aborted navigation", async () => {
    const { result, log } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async (onEvidence) => {
        await onEvidence({
          kind: "checkout",
          timestamp: 1,
          data: { url: CHECKOUT_URL, cartId: "" },
        });
        return new Promise(() => {});
      },
      { timeoutMs: 50 },
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.checkpoints[0]?.buyer.completed, false);
    // The aborted buyer is detached before the cart is read through the API.
    assert.ok(log.indexOf("buyer:close") < log.lastIndexOf("api"), log.join(","));
  });

  it("treats a thrown buyer error as indeterminate, not fail", async () => {
    const { result } = await run([catalogFound], async () => {
      throw new Error("model refused");
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.checkpoints[0]?.buyer.reason, "error");
  });

  it("classifies browser start failures and creates no buyer", async () => {
    const { result, calls } = await run([catalogFound], checkoutThenComplete, {
      failSession: true,
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "browser");
    assert.equal(calls.buyers, 0);
  });

  it("records evidence write failures as warnings without changing the verdict", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 1]])], checkoutThenComplete, {
      failEvidence: true,
    });
    assert.equal(result.verdict, "pass");
    assert.equal(
      result.warnings.filter((warning) => warning.startsWith("Evidence write failed")).length,
      3,
    );
  });

  it("is indeterminate, not pass, when the buyer cannot be stopped after checkout", async () => {
    const { result, redactor } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      checkoutThenComplete,
      {
        failClose: true,
      },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "buyer");
    assert.match(result.reason, /could not be stopped/);
    assert.ok(result.warnings.some((warning) => warning.startsWith("Closing the buyer failed")));
    assert.doesNotMatch(redactor.serialize(result.warnings), /hWN1secretToken99/);
  });

  it("stops a cooperative buyer at the first checkout so later cart changes cannot happen", async () => {
    let lines: Array<[string, number]> = [[VARIANT, 1]];
    let signalAbortedAtEmit = false;
    const { result, log } = await run(
      [catalogFound, { body: () => cart(lines).body }],
      async (onEvidence, signal) => {
        void onEvidence({
          kind: "navigation-blocked",
          timestamp: 1,
          data: { reason: "checkout", frame: "top-level" },
        });
        void onEvidence({
          kind: "checkout",
          timestamp: 1,
          data: { url: CHECKOUT_URL, cartId: "" },
        });
        signalAbortedAtEmit = signal.aborted;
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (!signal.aborted) {
          lines = [[VARIANT, 2]];
        }
        return { completed: true, reason: "completed", summary: "kept shopping" };
      },
    );
    assert.equal(signalAbortedAtEmit, true);
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
    assert.ok(log.indexOf("buyer:close") < log.lastIndexOf("api"), log.join(","));
  });

  it("detaches a buyer that ignores the stop before reading the cart", async () => {
    let lines: Array<[string, number]> = [[VARIANT, 1]];
    let closed = false;
    const { result } = await run(
      [catalogFound, { body: () => cart(lines).body }],
      async (onEvidence) => {
        void onEvidence({
          kind: "checkout",
          timestamp: 1,
          data: { url: CHECKOUT_URL, cartId: "" },
        });
        // A lingering tool call that only stops when the buyer is closed.
        setTimeout(() => {
          if (!closed) {
            lines = [[VARIANT, 2]];
          }
        }, 0);
        return new Promise(() => {});
      },
      { onBuyerClose: () => (closed = true) },
    );
    assert.equal(closed, true);
    assert.equal(result.verdict, "pass", result.reason);
  });

  it("does not stop the buyer at an embedded checkout frame, only at the top-level handoff", async () => {
    let abortedAfterFrame: boolean | undefined;
    const { result } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async (onEvidence, signal) => {
        await onEvidence({
          kind: "navigation-blocked",
          timestamp: 1,
          data: { reason: "checkout", frame: "embedded" },
        });
        abortedAfterFrame = signal.aborted;
        await onEvidence({
          kind: "navigation-blocked",
          timestamp: 2,
          data: { reason: "checkout", frame: "top-level" },
        });
        await onEvidence({
          kind: "checkout",
          timestamp: 2,
          data: { url: CHECKOUT_URL, cartId: "" },
        });
        return { completed: true, reason: "completed", summary: "done" };
      },
    );
    assert.equal(abortedAfterFrame, false);
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
  });

  it("does not report an embedded checkout frame alone as a checkout handoff", async () => {
    const { result } = await run([catalogFound], async (onEvidence) => {
      await onEvidence({
        kind: "navigation-blocked",
        timestamp: 1,
        data: { reason: "checkout", frame: "embedded" },
      });
      return { completed: true, reason: "completed", summary: "done" };
    });
    // Not a handoff: the run looks for a cart reference instead, and has none here.
    assert.equal(result.verdict, "indeterminate");
    assert.doesNotMatch(result.reason, /no trusted cart token/);
    assert.match(result.reason, /No cart reference is available/);
  });

  it("reports a blocked checkout with no trusted token as an unsupported checkout", async () => {
    const { result } = await run([catalogFound], async (onEvidence) => {
      await onEvidence({
        kind: "navigation-blocked",
        timestamp: 1,
        data: { reason: "checkout", frame: "top-level" },
      });
      return { completed: false, reason: "aborted", summary: "stopped" };
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "browser");
    assert.match(result.reason, /no trusted cart token/);
  });

  it("keeps the checkout host identifiable while redacting cart secrets", async () => {
    const shopifyCheckout =
      "https://shop.myshopify.com/cart/c/hWN1secretToken99?key=deadbeefcafe1234";
    const { result, artifacts, redactor } = await run(
      [catalogFound, cart([[VARIANT, 1]], shopifyCheckout)],
      async (onEvidence) => {
        await onEvidence({
          kind: "agent-action",
          timestamp: 1,
          data: { text: `Opened ${shopifyCheckout} on shop.myshopify.com` },
        });
        await onEvidence({
          kind: "checkout",
          timestamp: 2,
          data: { url: shopifyCheckout, cartId: "" },
        });
        return { completed: true, reason: "completed", summary: `done at ${shopifyCheckout}` };
      },
    );
    assert.equal(result.verdict, "pass", result.reason);
    const written =
      redactor.serialize(result) +
      artifacts.evidence.map((record) => redactor.serialize(record)).join("");
    assert.doesNotMatch(written, /hWN1secretToken99|deadbeefcafe1234/);
    assert.match(written, /shop\.myshopify\.com/);
  });

  it("redacts native checkout URLs and opaque event cart IDs of any format before writing", async () => {
    // Synthetic tokens only. The URL has a native route, a private query name, and values.
    const nativeCheckout =
      "https://www.example.com/checkouts/cn/hWN1secretToken99/en-ca/information?_r=privR77x&privateName9=privValue9";
    const { result, artifacts, redactor } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async (onEvidence) => {
        await onEvidence({
          kind: "standard-event",
          timestamp: 1,
          data: {
            event: { id: "e1", name: "shopify:cart:lines-update", action: "add", phase: "settled" },
            result: { cart: { id: "c9", totalQuantity: 1 }, userErrors: [] },
          },
        });
        await onEvidence({
          kind: "checkout",
          timestamp: 2,
          data: {
            url: nativeCheckout,
            cartId: "gid://shopify/Cart/hWN1secretToken99",
            route: {
              origin: "https://www.example.com",
              route: "/checkouts/cn/:segment/:locale/information",
            },
          },
        });
        return { completed: true, reason: "completed", summary: `done at ${nativeCheckout}` };
      },
    );
    assert.equal(result.verdict, "pass", result.reason);
    const written =
      redactor.serialize(result) +
      artifacts.evidence.map((record) => redactor.serialize(record)).join("");
    assert.doesNotMatch(written, /hWN1secretToken99|privR77x|privateName9|privValue9|"c9"/);
    assert.match(written, /"url":"\[REDACTED\]"/);
    assert.match(written, /"cart":\{"id":"\[REDACTED\]"/);
    assert.match(written, /www\.example\.com/);
    assert.match(written, /\/checkouts\/cn\/:segment\/:locale\/information/);
  });

  it("opens the pinned product page in code before the buyer is created", async () => {
    const { result, calls, log } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      checkoutThenComplete,
      {
        storefront: new URL("https://www.example.com/en-ca?utm=x"),
      },
    );
    assert.equal(result.verdict, "pass", result.reason);
    // The storefront URL first, as given, then the pinned page in the same session.
    assert.deepEqual(calls.navigations, [
      "https://www.example.com/en-ca?utm=x",
      "https://www.example.com/en-ca/products/shirt",
    ]);
    assert.equal(result.startUrl, "https://www.example.com/en-ca/products/shirt");
    assert.deepEqual(log.slice(0, 9), [
      "session:create",
      "navigate:/en-ca",
      "locale",
      "api",
      "navigate:/en-ca/products/shirt",
      "locale",
      "buyer:create",
      "locale",
      "buyer:act",
    ]);
  });

  it("is indeterminate (browser), with no API call, when the storefront page fails", async () => {
    const { result, calls, log } = await run([], checkoutThenComplete, {
      navigateError: (path) => (path === "/" ? new Error("net::ERR_NAME_NOT_RESOLVED") : undefined),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "browser");
    assert.match(result.reason, /^Storefront page failed to load: net::ERR_NAME_NOT_RESOLVED/);
    assert.equal(calls.buyers, 0);
    assert.deepEqual(log, ["session:create", "navigate:/", "session:close"]);
  });

  it("is indeterminate (browser) for a product page server error or a redirect to an error", async () => {
    for (const error of [new PageLoadError(500, false), new PageLoadError(404, true)]) {
      const { result, calls } = await run([catalogFound], checkoutThenComplete, {
        navigateError: (path) => (path === "/products/shirt" ? error : undefined),
      });
      assert.equal(result.verdict, "indeterminate", error.message);
      assert.equal(result.errorKind, "browser");
      assert.match(result.reason, /^Start page failed to load: Page returned HTTP/);
      assert.equal(calls.buyers, 0);
    }
  });

  it("bounds browser startup by the run timeout and closes a late session", async () => {
    const { result, calls, log } = await run([catalogFound], checkoutThenComplete, {
      timeoutMs: 30,
      sessionDelayMs: 120,
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "timeout");
    assert.equal(calls.buyers, 0);
    assert.deepEqual(calls.navigations, []);
    assert.deepEqual(log, ["session:create", "session:close"]);
  });
});

describe("runScenario with a later page that sets no locale", () => {
  /** Preflight (call 0) reads US/EN; every later page read finds no locale at all. */
  const laterUnavailable = (call: number) =>
    call === 0 ? undefined : new LocaleUnavailableError();

  it("keeps the preflight strict: no locale on the storefront page stops the run before the catalog", async () => {
    const { result, calls, log } = await run([], checkoutThenComplete, {
      localeError: () => new LocaleUnavailableError(),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "setup");
    assert.equal(log.includes("api"), false);
    assert.equal(calls.buyers, 0);
  });

  it("carries the frozen context forward, marked as an assumption, and still verifies the cart in it", async () => {
    const { result, artifacts, requests, calls } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      checkoutThenComplete,
      { localeError: laterUnavailable },
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(calls.buyers, 1);
    const carried = result.context.observations.filter(
      (entry) => entry.verification === "carried-forward",
    );
    assert.deepEqual(
      carried.map((entry) => [entry.source, entry.step, entry.country, entry.language]),
      [
        ["runner", "after the start page opened", "US", "EN"],
        ["runner", "before checkpoint add-to-cart", "US", "EN"],
      ],
    );
    assert.deepEqual(
      artifacts.evidence
        .filter((record) => record.kind === "storefront-locale-carried-forward")
        .map((record) => record.data.step),
      ["after the start page opened", "before checkpoint add-to-cart"],
    );
    // No carried value is reported as an observed browser locale.
    assert.equal(
      artifacts.evidence.some((record) => record.kind === "storefront-locale"),
      false,
    );
    // The cart read keeps the frozen context.
    assert.equal(requests.at(-1)?.variables.country, "US");
    assert.equal(requests.at(-1)?.variables.language, "EN");
  });

  it("does not carry forward on any other read failure", async () => {
    const { result, calls } = await run([catalogFound], checkoutThenComplete, {
      localeError: (call) =>
        call === 0 ? undefined : new Error("Storefront locale is not readable: the page closed."),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.equal(calls.buyers, 0);
  });

  it("still stops on a known different locale in browser evidence after a carry-forward", async () => {
    const browser: { emit?: EvidenceSink } = {};
    const { result } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async (onEvidence) => {
        void browser.emit?.({
          kind: "storefront-locale",
          timestamp: 9,
          data: { country: "CA", language: "FR", url: "https://www.example.com/" },
        });
        return checkoutThenComplete(onEvidence, new AbortController().signal);
      },
      { localeError: laterUnavailable, browser },
    );
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
  });

  it("still stops when the API cart names another country", async () => {
    const { result } = await run(
      [catalogFound, cart([[VARIANT, 1]], CHECKOUT_URL, { buyerCountry: "CA" })],
      checkoutThenComplete,
      { localeError: laterUnavailable },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
  });
});

describe("runScenario context isolation", () => {
  const CA_FR = { country: "CA", language: "FR" };
  const localeRecord = (browser: { emit?: EvidenceSink }) =>
    void browser.emit?.({
      kind: "storefront-locale",
      timestamp: 9,
      data: { ...CA_FR, url: "https://www.example.com/products/shirt" },
    });

  it("overrides a pass when the context changes while the assertion awaits the cart read", async () => {
    const browser: { emit?: EvidenceSink } = {};
    const changedDuringAssert = {
      body: () => {
        localeRecord(browser);
        return cart([[VARIANT, 1]]).body;
      },
    };
    const { result, calls, log } = await run(
      [catalogFound, changedDuringAssert],
      checkoutThenComplete,
      {
        browser,
      },
    );
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /showed CA\/FR in browser evidence.*The pass result is not used/);
    const [report] = result.checkpoints;
    assert.equal(report?.verdict, "indeterminate");
    assert.equal(report?.errorKind, "context");
    // The structured API context details stay in the report.
    assert.deepEqual(report?.details?.context, {
      queryCountry: "US",
      queryLanguage: "EN",
      cartBuyerCountry: null,
      cartCountryConfirmed: false,
    });
    // No re-pin: one catalog read, one cart read, and the pinned page only.
    assert.equal(log.filter((entry) => entry === "api").length, 2);
    assert.deepEqual(calls.navigations, [
      "https://www.example.com/",
      "https://www.example.com/products/shirt",
    ]);
  });

  it("overrides a pass when the context change arrives during browser cleanup", async () => {
    const browser: { emit?: EvidenceSink; onClose?: () => void } = {};
    browser.onClose = () => localeRecord(browser);
    const { result } = await run([catalogFound, cart([[VARIANT, 1]])], checkoutThenComplete, {
      browser,
    });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.equal(result.checkpoints[0]?.verdict, "indeterminate");
    assert.equal(result.checkpoints[0]?.errorKind, "context");
    assert.match(result.context.mismatch ?? "", /CA\/FR/);
  });

  it("lets a recorded context change win over a product 404, with no extra locale read", async () => {
    const browser: { emit?: EvidenceSink } = {};
    const { result, calls } = await run([catalogFound], checkoutThenComplete, {
      browser,
      navigateError: (path) => {
        if (path !== "/products/shirt") return undefined;
        localeRecord(browser);
        return new PageLoadError(404, false);
      },
    });
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.errorKind, "context");
    assert.equal(calls.buyers, 0);
    assert.equal(calls.locales, 1);
  });

  it("resolves country and language from the storefront page when no flag is set", async () => {
    const { result, requests } = await run(
      [
        catalog([product("shirt", VARIANT)], CA_FR),
        cart([[VARIANT, 1]], CHECKOUT_URL, { context: CA_FR }),
      ],
      checkoutThenComplete,
      { locale: () => ({ country: "ca", language: "fr" }) },
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.deepEqual(result.context.requested, {});
    assert.deepEqual(result.context.resolved, CA_FR);
    assert.deepEqual(result.context.observations[0], {
      source: "runner",
      step: "preflight",
      country: "ca",
      language: "fr",
    });
    // Catalog and cart queries both carry the explicit frozen context.
    assert.equal(requests.length, 2);
    for (const request of requests) {
      assert.match(request.query, /@inContext\(country: \$country, language: \$language\)/);
      assert.equal(request.variables.country, "CA");
      assert.equal(request.variables.language, "FR");
    }
    assert.match(requests[1]?.query ?? "", /StorefrontE2ECart/);
    assert.deepEqual(result.checkpoints[0]?.details?.context, {
      queryCountry: "CA",
      queryLanguage: "FR",
      cartBuyerCountry: null,
      cartCountryConfirmed: false,
    });
  });

  it("accepts flags that match the storefront page and records them", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 1]])], checkoutThenComplete, {
      requested: { country: "US", language: "EN" },
    });
    assert.equal(result.verdict, "pass", result.reason);
    assert.deepEqual(result.context.requested, { country: "US", language: "EN" });
    assert.deepEqual(result.context.resolved, US_EN);
  });

  it("is indeterminate (setup) before any API call or buyer when a flag does not match the page", async () => {
    for (const requested of [{ country: "CA" }, { language: "FR" }]) {
      const { result, calls, log } = await run([], checkoutThenComplete, { requested });
      assert.equal(result.verdict, "indeterminate", JSON.stringify(requested));
      assert.equal(result.errorKind, "setup");
      assert.match(result.reason, /constraints only: the CLI does not set the market/);
      assert.equal(result.context.resolved, undefined);
      assert.equal(result.context.mismatch, result.reason);
      assert.equal(calls.buyers, 0);
      assert.equal(result.metadata.buyer, undefined);
      assert.deepEqual(log, [...PREFLIGHT, "session:close"]);
    }
  });

  it("is indeterminate (setup) when the page country or language cannot be read", async () => {
    const { result, log } = await run([], checkoutThenComplete, {
      locale: () => ({ country: "US", language: "" }),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "setup");
    assert.match(result.reason, /could not be read: The storefront language is missing/);
    assert.deepEqual(log, [...PREFLIGHT, "session:close"]);
  });

  it("is indeterminate (context), with no buyer, when the API answers in another context", async () => {
    const { result, calls } = await run(
      [catalog([product("shirt", VARIANT)], CA_FR)],
      checkoutThenComplete,
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /answered in context CA\/FR, but the run context is US\/EN/);
    assert.equal(calls.buyers, 0);
    const missing = await run([catalog([product("shirt", VARIANT)], null)], checkoutThenComplete);
    assert.equal(missing.result.errorKind, "context");
    assert.match(missing.result.reason, /did not report its context/);
  });

  it("is indeterminate (context), not pass, when the cart read answers in another context", async () => {
    const { result } = await run(
      [catalogFound, cart([[VARIANT, 1]], CHECKOUT_URL, { context: CA_FR })],
      checkoutThenComplete,
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
  });

  it("is indeterminate (context), not fail, when the cart buyer identity names another country", async () => {
    const { result } = await run(
      [
        catalogFound,
        cart([["gid://shopify/ProductVariant/8", 1]], CHECKOUT_URL, { buyerCountry: "CA" }),
      ],
      checkoutThenComplete,
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /buyer identity country is CA/);
  });

  it("aborts the active buyer at once and reads no cart when browser evidence shows another context", async () => {
    let abortedAtEmit = false;
    const { result, log } = await run([catalogFound], async (onEvidence, signal) => {
      void onEvidence({
        kind: "storefront-locale",
        timestamp: 1,
        data: {
          country: "CA",
          language: "EN",
          url: "https://www.example.com/en-ca/products/shirt",
        },
      });
      abortedAtEmit = signal.aborted;
      await onEvidence({ kind: "checkout", timestamp: 2, data: { url: CHECKOUT_URL, cartId: "" } });
      return new Promise(() => {});
    });
    assert.equal(abortedAtEmit, true);
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.match(
      result.reason,
      /showed CA\/EN in browser evidence, but the run context is US\/EN.*does not re-pin/,
    );
    assert.match(result.context.mismatch ?? "", /CA\/EN/);
    assert.ok(
      result.context.observations.some(
        (entry) => entry.source === "browser" && entry.country === "CA",
      ),
    );
    // One catalog read only. The cart is not read and no other product is pinned.
    assert.equal(log.filter((entry) => entry === "api").length, 1);
    assert.ok(log.includes("buyer:close"));
  });

  it("is indeterminate (context), with no buyer, when the pinned page shows another context", async () => {
    const { result, calls, log } = await run([catalogFound], checkoutThenComplete, {
      locale: (call) => (call === 0 ? { ...US_EN } : { country: "CA", language: "EN" }),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /after the start page opened/);
    assert.equal(calls.buyers, 0);
    assert.deepEqual(calls.navigations, [
      "https://www.example.com/",
      "https://www.example.com/products/shirt",
    ]);
    assert.equal(log.filter((entry) => entry === "api").length, 1);
  });

  it("checks the page context after a checkpoint that did not reach checkout", async () => {
    const { result, calls } = await run(
      [catalogFound],
      async () => ({ completed: true, reason: "completed", summary: "changed country" }),
      { locale: (call) => (call < 3 ? { ...US_EN } : { country: "CA", language: "EN" }) },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.errorKind, "context");
    assert.match(result.reason, /after checkpoint add-to-cart/);
    assert.equal(calls.locales, 4);
  });

  it("does not read the blocked checkout page; it relies on the last recorded context and the cart query", async () => {
    const { result, calls } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      checkoutThenComplete,
      {
        locale: (call) => (call < 3 ? { ...US_EN } : { country: "XX", language: "EN" }),
      },
    );
    assert.equal(result.verdict, "pass", result.reason);
    // Preflight, start page, and before the checkpoint. None after the checkout stop.
    assert.equal(calls.locales, 3);
  });

  it("pins the product the run context catalog lists, not one from another context", async () => {
    // The US catalog does not list the jersey. That is a different fixture, not a route skip.
    const contextual = {
      body: (request: FakeRequest) =>
        catalog(
          request.variables.country === "US"
            ? [product("shirt", VARIANT)]
            : [product("jersey", "gid://shopify/ProductVariant/9"), product("shirt", VARIANT)],
          {
            country: String(request.variables.country),
            language: String(request.variables.language),
          },
        ).body,
    };
    const { result, calls } = await run([contextual, cart([[VARIANT, 1]])], checkoutThenComplete);
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(result.pinned?.productHandle, "shirt");
    assert.deepEqual(calls.navigations, [
      "https://www.example.com/",
      "https://www.example.com/products/shirt",
    ]);
  });

  it("fails, with no buyer and no other product tried, when the pinned product route is 404 or 410", async () => {
    for (const status of [404, 410]) {
      const { result, calls, log } = await run(
        [catalog([product("jersey", "gid://shopify/ProductVariant/9"), product("shirt", VARIANT)])],
        checkoutThenComplete,
        {
          navigateError: (path) =>
            path === "/products/jersey" ? new PageLoadError(status, false) : undefined,
        },
      );
      assert.equal(result.verdict, "fail", String(status));
      assert.equal(result.errorKind, undefined);
      assert.match(
        result.reason,
        new RegExp(`/products/jersey returned HTTP ${status}.*published product route is broken`),
      );
      assert.equal(result.pinned?.productHandle, "jersey");
      assert.equal(calls.buyers, 0);
      assert.equal(result.metadata.buyer, undefined);
      assert.deepEqual(calls.navigations, [
        "https://www.example.com/",
        "https://www.example.com/products/jersey",
      ]);
      assert.equal(log.filter((entry) => entry === "api").length, 1);
    }
  });
});
