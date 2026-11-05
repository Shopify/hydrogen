import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { Buyer, BuyerResult } from "./agent/buyer.ts";
import type { EvidenceSink } from "./evidence.ts";
import { formatSummary } from "./report/summary.ts";
import { PageLoadError, runScenario, type Driver } from "./runner.ts";
import { CartReadError, type CartSnapshot } from "./scenario.ts";
import { addToCart } from "./scenarios/add-to-cart.ts";
import {
  fakeFetch,
  memoryArtifacts,
  sfapi,
  US_EN,
  type FakeRequest,
} from "./scenarios/test-helpers.ts";
import { createStorefrontApi, type StorefrontContext } from "./shopify/storefront.ts";

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

/** A session cart for the fake driver's cart reader (in place of an API response). */
type CartEntry = { cart: CartSnapshot | Error | (() => CartSnapshot) };

function cart(lines: Array<[string, number]>): CartEntry {
  return {
    cart: {
      endpoint: "https://www.example.com/cart.js",
      totalQuantity: lines.reduce((sum, [, quantity]) => sum + quantity, 0),
      lines: lines.map(([variantId, quantity]) => ({ variantId, quantity })),
    },
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
  /** Receives the session evidence sink, so a test can emit browser evidence at any time. */
  browser?: { emit?: EvidenceSink; onClose?: () => void };
  /**
   * The session cart reader. Default: the next {@link CartEntry} given to `run`. `null`: the
   * driver has no reader.
   */
  readCart?: ((storefrontUrl: URL) => Promise<CartSnapshot>) | null;
  /** Session carts for the default reader, in order. */
  carts?: CartEntry[];
};

function fakeDriver(script: Script, log: string[], options: DriverOptions = {}) {
  const calls = {
    loaded: 0,
    buyers: 0,
    navigations: [] as string[],
    standardEvents: [] as readonly string[],
    cartBases: [] as string[],
  };
  const readCart =
    options.readCart === undefined
      ? async (): Promise<CartSnapshot> => {
          const next = options.carts?.shift()?.cart;
          if (next === undefined) throw new CartReadError("network", "No fake cart.");
          if (next instanceof Error) throw next;
          return typeof next === "function" ? next() : next;
        }
      : options.readCart;
  const driver: Driver<{ close(): Promise<void> }> = {
    ...(readCart === null
      ? {}
      : {
          async readCart(_session: unknown, storefrontUrl: URL) {
            log.push("cart:read");
            calls.cartBases.push(storefrontUrl.href);
            return readCart(storefrontUrl);
          },
        }),
    buyer: { model: "test-model", promptSha256: "abc" },
    async createSession({ onEvidence, standardEvents }) {
      log.push("session:create");
      calls.standardEvents = standardEvents;
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
  entries: Array<{ status?: number; body: unknown } | CartEntry>,
  script: Script,
  options: DriverOptions & {
    timeoutMs?: number;
    failEvidence?: boolean;
    storefront?: URL;
    /** The configured context. Default US/EN. */
    context?: StorefrontContext;
    /** External cancellation, such as SIGINT. */
    signal?: AbortSignal;
  } = {},
) {
  const log: string[] = [];
  const responses = entries.filter(
    (entry): entry is { status?: number; body: unknown } => !("cart" in entry),
  );
  const carts = entries.filter((entry): entry is CartEntry => "cart" in entry);
  const fake = fakeFetch(responses);
  const fetch: typeof globalThis.fetch = async (input, init) => {
    log.push("api");
    return fake.fetch(input, init);
  };
  const artifacts = memoryArtifacts({ failEvidence: options.failEvidence });
  const driver = fakeDriver(script, log, { carts, ...options });
  const storefront = options.storefront ?? STOREFRONT;
  const result = await runScenario({
    runId: "run-1",
    scenario: addToCart,
    storefrontUrl: storefront,
    api: createStorefrontApi({ origin: storefront.origin, fetch }),
    context: options.context ?? US_EN,
    maxSteps: 10,
    timeoutMs: options.timeoutMs ?? 5_000,
    catalogPages: 3,
    metadata: { node: "v24", tools: { "playwright-core": "1.59.1" } },
    artifacts,
    loadDriver: driver.loadDriver,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  return { result, artifacts, calls: driver.calls, log, requests: fake.requests };
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

/** A buyer that adds and completes without reaching checkout. */
const addThenComplete: Script = async (onEvidence) => {
  await onEvidence({
    kind: "standard-event",
    timestamp: 1,
    data: { name: "product_added_to_cart", ok: false },
  });
  return { completed: true, reason: "completed", summary: "done" };
};

/** The browser steps before any API call or buyer: session and storefront page. */
const PREFLIGHT = ["session:create", "navigate:/"];

describe("runScenario", () => {
  it("skips an empty catalog after the browser preflight, with no buyer or model", async () => {
    const { result, artifacts, calls, log } = await run([catalogEmpty], addThenComplete);
    assert.equal(result.verdict, "skipped");
    // The storefront page opens first, but no buyer starts.
    assert.deepEqual(log, [...PREFLIGHT, "api", "session:close"]);
    assert.equal(calls.buyers, 0);
    assert.equal(result.metadata.buyer, undefined);
    assert.deepEqual(result.context, { configured: US_EN });
    assert.match(result.reason, /in context US\/EN/);
    assert.equal(artifacts.results.length, 1);
  });

  it("is indeterminate (not skipped) when the catalog cap is exhausted", async () => {
    const page = {
      body: sfapi({ products: { pageInfo: { hasNextPage: true, endCursor: "c" }, nodes: [] } }),
    };
    const { result, calls } = await run([page, page, page], addThenComplete);
    assert.equal(result.verdict, "indeterminate");
    assert.equal(calls.buyers, 0);
  });

  it("keeps API setup failures indeterminate", async () => {
    const cases = [
      [{ status: 503, body: "down" }, /^Scenario preparation failed:.*503/],
      [
        { body: { ...catalogFound.body, errors: [{ message: "catalog field failed" }] } },
        /catalog field failed/,
      ],
      [{ body: sfapi({ products: { nodes: "wrong" } }) }, /products/],
    ] as const;
    for (const [response, reason] of cases) {
      const { result, calls } = await run([response], addThenComplete);
      assert.equal(result.verdict, "indeterminate");
      assert.match(result.reason, reason);
      assert.equal(calls.buyers, 0);
    }
  });

  it("passes when the session cart holds exactly the pinned variant, ignoring event evidence", async () => {
    const { result, artifacts, log, calls } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      addThenComplete,
    );
    assert.equal(result.verdict, "pass", result.reason);
    // The browser session records only the scenario's selected Standard Events.
    assert.deepEqual(calls.standardEvents, ["shopify:cart:lines-update", "shopify:cart:error"]);
    assert.equal(result.pinned?.variantId, VARIANT);
    assert.equal(result.metadata.buyer?.model, "test-model");
    // The configured context record, then the buyer evidence.
    assert.deepEqual(
      artifacts.evidence.map((record) => record.kind),
      ["storefront-context", "standard-event"],
    );
    assert.deepEqual(log.slice(-2), ["buyer:close", "session:close"]);
  });

  it("reads the session cart after the buyer detached and before the session closes, with no handoff", async () => {
    const { result, log, requests, calls } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async () => ({ completed: true, reason: "completed", summary: "Added." }),
    );
    assert.equal(result.verdict, "pass", result.reason);
    // The buyer was detached first; the cart was read before the session closed.
    const order = ["buyer:act", "buyer:close", "cart:read", "session:close"].map((step) =>
      log.indexOf(step),
    );
    assert.deepEqual(
      order.toSorted((a, b) => a - b),
      order,
      log.join(","),
    );
    assert.ok(!order.includes(-1), log.join(","));
    // The reader gets the supplied storefront URL as the base path. No API cart query.
    assert.deepEqual(calls.cartBases, [STOREFRONT.href]);
    assert.equal(requests.length, 1);
    assert.equal(result.checkpoints[0]?.stoppedOn, undefined);
    assert.match(JSON.stringify(result.checkpoints[0]?.details?.cart), /"source":"cart-json"/);
  });

  it("ends indeterminate and closes the session when aborted during the session cart read", async () => {
    const controller = new AbortController();
    // The read never settles and ignores every signal.
    const { result, log, requests } = await run(
      [catalogFound],
      async () => ({ completed: true, reason: "completed", summary: "Added." }),
      {
        signal: controller.signal,
        readCart: async () => {
          setTimeout(() => controller.abort(new Error("SIGINT")), 0);
          return new Promise<CartSnapshot>(() => {});
        },
      },
    );
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.match(result.checkpoints[0]?.reason ?? "", /session cart could not be read/);
    // Only the catalog was read through the API.
    assert.equal(requests.length, 1);
    assert.equal(log.at(-1), "session:close");
    assert.ok(log.indexOf("cart:read") < log.indexOf("session:close"), log.join(","));
  });

  it("keeps a cart JSON HTTP error indeterminate even after a storefront-reported add rejection", async () => {
    const { result } = await run(
      [catalogFound, { cart: new CartReadError("http-status", "HTTP 500.", 500) }],
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
    );
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /session cart could not be read/);
  });

  it("does not read the session cart after a blocked checkout handoff", async () => {
    const { result, log, requests } = await run([catalogFound], checkoutThenComplete, {
      readCart: async () => {
        throw new Error("The cart must not be read after a blocked checkout.");
      },
    });
    // The page is a blocked checkout error page, so the cart is not read.
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.match(result.reason, /Checkout navigation was blocked/);
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
    assert.equal(log.includes("cart:read"), false);
    assert.equal(requests.length, 1);
  });

  it("fails for the wrong quantity", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 2]])], addThenComplete);
    assert.equal(result.verdict, "fail");
  });

  it("fails for the wrong variant", async () => {
    const { result } = await run(
      [catalogFound, cart([["gid://shopify/ProductVariant/8", 1]])],
      addThenComplete,
    );
    assert.equal(result.verdict, "fail");
  });

  it("does not turn standard-event evidence alone into a verdict", async () => {
    const { result } = await run(
      [catalogFound],
      async (onEvidence) => {
        await onEvidence({
          kind: "standard-event",
          timestamp: 1,
          data: { name: "checkout_started", ok: true },
        });
        return { completed: true, reason: "completed", summary: "claims done" };
      },
      { readCart: null },
    );
    // A completed buyer claim with no cart reference to verify is not a verdict.
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /no cart reader is available/);
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
  });

  it("is indeterminate on timeout with no checkout, and still writes a result", async () => {
    const { result, artifacts, log } = await run(
      [catalogFound],
      async () => new Promise(() => {}),
      { timeoutMs: 50 },
    );
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /^Run timed out after 50 ms\./);
    assert.equal(result.checkpoints[0]?.buyer.reason, "aborted");
    assert.equal(artifacts.results.length, 1);
    assert.deepEqual(log.slice(-2), ["buyer:close", "session:close"]);
  });

  it("detaches a buyer at a captured checkout after the timeout, and reads no cart from the URL", async () => {
    const { result, log, requests } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      async (onEvidence) => {
        await onEvidence({
          kind: "checkout",
          timestamp: 1,
          data: { url: CHECKOUT_URL },
        });
        return new Promise(() => {});
      },
      { timeoutMs: 50 },
    );
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.checkpoints[0]?.buyer.completed, false);
    assert.ok(log.includes("buyer:close"), log.join(","));
    assert.equal(log.includes("cart:read"), false);
    // The catalog read only: the checkout URL is not a cart reference.
    assert.equal(requests.length, 1);
  });

  it("treats a thrown buyer error as indeterminate, not fail", async () => {
    const { result } = await run([catalogFound], async () => {
      throw new Error("model refused");
    });
    assert.equal(result.verdict, "indeterminate");
    assert.equal(result.checkpoints[0]?.buyer.reason, "error");
  });

  it("keeps browser start failures indeterminate and creates no buyer", async () => {
    const { result, calls } = await run([catalogFound], addThenComplete, {
      failSession: true,
    });
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /^Browser session failed to start:/);
    assert.equal(calls.buyers, 0);
  });

  it("records evidence write failures as warnings without changing the verdict", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 1]])], addThenComplete, {
      failEvidence: true,
    });
    assert.equal(result.verdict, "pass");
    assert.equal(
      result.warnings.filter((warning) => warning.startsWith("Evidence write failed")).length,
      2,
    );
  });

  it("is indeterminate, not pass, when the buyer cannot be stopped before the assertion", async () => {
    const { result } = await run([catalogFound, cart([[VARIANT, 1]])], addThenComplete, {
      failClose: true,
    });
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /could not be stopped/);
    assert.ok(result.warnings.some((warning) => warning.startsWith("Closing the buyer failed")));
    assert.ok(result.warnings.some((warning) => warning.includes(CHECKOUT_URL)));
    assert.ok(formatSummary(result).includes(CHECKOUT_URL));
  });

  it("stops a cooperative buyer at the first checkout so later cart changes cannot happen", async () => {
    let lines: Array<[string, number]> = [[VARIANT, 1]];
    let signalAbortedAtEmit = false;
    const { result, log, requests } = await run(
      [catalogFound, { cart: () => cart(lines).cart as CartSnapshot }],
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
    assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
    assert.ok(log.includes("buyer:close"), log.join(","));
    // The page is a blocked checkout error page, so the cart is not read.
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(requests.length, 1);
  });

  it("detaches a buyer that ignores the checkout stop", async () => {
    let lines: Array<[string, number]> = [[VARIANT, 1]];
    let closed = false;
    const { result } = await run(
      [catalogFound, { cart: () => cart(lines).cart as CartSnapshot }],
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
    assert.equal(result.verdict, "indeterminate", result.reason);
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
    assert.equal(result.verdict, "indeterminate", result.reason);
    assert.equal(result.checkpoints[0]?.stoppedOn, "checkout");
  });

  it("does not report an embedded checkout frame alone as a checkout handoff", async () => {
    const { result } = await run(
      [catalogFound],
      async (onEvidence) => {
        await onEvidence({
          kind: "navigation-blocked",
          timestamp: 1,
          data: { reason: "checkout", frame: "embedded" },
        });
        return { completed: true, reason: "completed", summary: "done" };
      },
      { readCart: null },
    );
    // Not a handoff: the run looks for a cart reference instead, and has none here.
    assert.equal(result.verdict, "indeterminate");
    assert.doesNotMatch(result.reason, /Checkout navigation was blocked/);
    assert.match(result.reason, /no cart reader is available/);
  });

  it("reports a blocked checkout with no checkout record as a browser problem with no cart reference", async () => {
    const { result } = await run([catalogFound], async (onEvidence) => {
      await onEvidence({
        kind: "navigation-blocked",
        timestamp: 1,
        data: { reason: "checkout", frame: "top-level" },
      });
      return { completed: false, reason: "aborted", summary: "stopped" };
    });
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /Checkout navigation was blocked/);
    assert.deepEqual(result.checkpoints[0]?.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
  });

  it("preserves checkout URLs, query values, and event cart IDs in owner reports", async () => {
    // Synthetic tokens only. The URL has a native route, a private query name, and values.
    const nativeCheckout =
      "https://www.example.com/checkouts/cn/hWN1secretToken99/en-ca/information?_r=privR77x&privateName9=privValue9";
    const { result, artifacts } = await run(
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
    // A checkout URL is not a cart reference; it remains diagnostic data.
    assert.equal(result.verdict, "indeterminate", result.reason);
    const written = JSON.stringify({ result, evidence: artifacts.evidence });
    assert.ok(written.includes(nativeCheckout));
    assert.match(written, /"cart":\{"id":"c9"/);
    assert.match(written, /\/checkouts\/cn\/:segment\/:locale\/information/);
  });

  it("opens the pinned product page in code before the buyer is created", async () => {
    const { result, calls, log } = await run(
      [catalogFound, cart([[VARIANT, 1]])],
      addThenComplete,
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
    assert.deepEqual(log.slice(0, 6), [
      "session:create",
      "navigate:/en-ca",
      "api",
      "navigate:/en-ca/products/shirt",
      "buyer:create",
      "buyer:act",
    ]);
  });

  it("is indeterminate, with no API call, when the storefront page fails", async () => {
    const { result, calls, log } = await run([], addThenComplete, {
      navigateError: (path) => (path === "/" ? new Error("net::ERR_NAME_NOT_RESOLVED") : undefined),
    });
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /^Storefront page failed to load: net::ERR_NAME_NOT_RESOLVED/);
    assert.equal(calls.buyers, 0);
    assert.deepEqual(log, ["session:create", "navigate:/", "session:close"]);
  });

  it("is indeterminate for a product page server error or a redirect to an error", async () => {
    for (const error of [new PageLoadError(500, false), new PageLoadError(404, true)]) {
      const { result, calls } = await run([catalogFound], addThenComplete, {
        navigateError: (path) => (path === "/products/shirt" ? error : undefined),
      });
      assert.equal(result.verdict, "indeterminate", error.message);
      assert.match(result.reason, /^Start page failed to load: Page returned HTTP/);
      assert.equal(calls.buyers, 0);
    }
  });

  it("bounds browser startup by the run timeout and closes a late session", async () => {
    const { result, calls, log } = await run([catalogFound], addThenComplete, {
      timeoutMs: 30,
      sessionDelayMs: 120,
    });
    assert.equal(result.verdict, "indeterminate");
    assert.match(result.reason, /^Run timed out after 30 ms\./);
    assert.equal(calls.buyers, 0);
    assert.deepEqual(calls.navigations, []);
    assert.deepEqual(log, ["session:create", "session:close"]);
  });
});

describe("runScenario with the configured context", () => {
  const CA_FR = { country: "CA", language: "FR" };

  it("passes on valid data when the API response metadata is missing or names another context", async () => {
    const { result, requests } = await run(
      [catalog([product("shirt", VARIANT)], CA_FR), cart([[VARIANT, 1]])],
      addThenComplete,
    );
    assert.equal(result.verdict, "pass", result.reason);
    assert.equal(requests.length, 1);
    assert.deepEqual(
      [requests[0]?.variables.country, requests[0]?.variables.language],
      ["US", "EN"],
    );
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
    const { result, calls } = await run([contextual, cart([[VARIANT, 1]])], addThenComplete);
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
        addThenComplete,
        {
          navigateError: (path) =>
            path === "/products/jersey" ? new PageLoadError(status, false) : undefined,
        },
      );
      assert.equal(result.verdict, "fail", String(status));
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
