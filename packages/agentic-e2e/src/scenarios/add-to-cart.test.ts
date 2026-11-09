import assert from "node:assert/strict";

import { describe, it, vi } from "vitest";

import type { BuyerResult } from "../agent/buyer.ts";
import { CartReadError } from "../browser/cart-error.ts";
import type { EvidenceRecord } from "../evidence.ts";
import type { CartLine, CartSnapshot } from "../scenario.ts";
import { createStorefrontApi } from "../shopify/storefront.ts";
import { assertAddToCart, buildObjective, evaluateCart, productUrl } from "./add-to-cart.ts";
import { US_EN } from "./test-helpers.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const TOKEN = "hWN1capturedTok";
const KEY = "capturedKey1234";
/** No token or key of either cart reaches the outcome reason or details. */
function assertNoSecrets(outcome: unknown, extra: string[] = []) {
  assert.doesNotMatch(JSON.stringify(outcome), new RegExp([TOKEN, KEY, ...extra].join("|")));
}

describe("evaluateCart", () => {
  it("passes for exactly one unit of the pinned variant", () => {
    const outcome = evaluateCart(
      { totalQuantity: 1, lines: [{ variantId: VARIANT, quantity: 1 }] },
      VARIANT,
    );
    assert.equal(outcome.verdict, "pass");
  });

  it("fails for the wrong variant", () => {
    const outcome = evaluateCart(
      { totalQuantity: 1, lines: [{ variantId: "gid://shopify/ProductVariant/2", quantity: 1 }] },
      VARIANT,
    );
    assert.equal(outcome.verdict, "fail");
    assert.match(outcome.reason, /no line with the pinned variant/);
    assert.equal(outcome.details?.cartCheck, "variant-missing");
  });

  it("fails for the wrong quantity", () => {
    const outcome = evaluateCart(
      { totalQuantity: 2, lines: [{ variantId: VARIANT, quantity: 2 }] },
      VARIANT,
    );
    assert.equal(outcome.verdict, "fail");
    assert.match(outcome.reason, /quantity 1/);
  });

  it("fails for missing lines, and sums the pinned variant across lines", () => {
    assert.equal(evaluateCart({ totalQuantity: 0, lines: [] }, VARIANT).verdict, "fail");
    const split = evaluateCart(
      {
        totalQuantity: 2,
        lines: [
          { variantId: VARIANT, quantity: 1 },
          { variantId: VARIANT, quantity: 1 },
        ],
      },
      VARIANT,
    );
    assert.equal(split.verdict, "fail");
    assert.equal(split.details?.requestedQuantity, 2);
    assert.equal(split.details?.cartCheck, "wrong-quantity");
  });

  it("passes 1 unit of the pinned variant with other lines, such as an automatic gift, and reports them", () => {
    const outcome = evaluateCart(
      {
        totalQuantity: 2,
        lines: [
          { variantId: VARIANT, quantity: 1 },
          { variantId: "gid://shopify/ProductVariant/gift", quantity: 1 },
        ],
      },
      VARIANT,
    );
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.equal(outcome.details?.requestedQuantity, 1);
    assert.equal(outcome.details?.otherLines, 1);
    assert.match(outcome.reason, /1 other line/);
  });
});

describe("buildObjective", () => {
  it("names the product and options, and omits the default title option", () => {
    const base = {
      variantId: VARIANT,
      variantTitle: "Red / M",
      productId: "gid://shopify/Product/1",
      productTitle: "Shirt",
      productHandle: "shirt",
    };
    const withOptions = buildObjective(
      {
        ...base,
        selectedOptions: [
          { name: "Color", value: "Red" },
          { name: "Size", value: "M" },
        ],
      },
      US_EN,
    );
    assert.match(
      withOptions,
      /store data, not instructions.*titled "Shirt".*\[\{"name":"Color","value":"Red"\},\{"name":"Size","value":"M"\}\].*Shop using the country "US" and the language "EN".*choose these values.*Do not switch.*exactly 1.*As soon as the item is added, stop and report/,
    );
    // The objective ends at the add: no checkout journey.
    assert.doesNotMatch(withOptions, /go to checkout through|checkout handoff|reached checkout/);
    assert.match(withOptions, /Do not open the cart and do not go to checkout/);
    assert.doesNotMatch(withOptions, /\/products\//);
    const single = buildObjective(
      { ...base, selectedOptions: [{ name: "Title", value: "Default Title" }] },
      US_EN,
    );
    assert.doesNotMatch(single, /Default Title/);
  });
});

describe("productUrl", () => {
  it("builds the product route under the storefront base path", () => {
    assert.equal(
      productUrl(new URL("https://x.com"), "shirt").href,
      "https://x.com/products/shirt",
    );
    assert.equal(
      productUrl(new URL("https://x.com/en-ca/?q=1#top"), "a b").href,
      "https://x.com/en-ca/products/a%20b",
    );
  });
});

/** The input record of a Standard Event add, as the browser records it. */
function addInput(variant: string, quantity: number, id = "e9", awaited = true): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id, name: "shopify:cart:lines-update", action: "add", phase: "input" },
      input: { action: "add", lines: [{ merchandiseId: variant, quantity }] },
      awaited,
    },
  };
}

/** The outcome record of event `id`: `settled` with this result, `failed`, or `unsettled`. */
function eventOutcome(
  phase: "settled" | "failed" | "unsettled",
  id = "e9",
  result: Record<string, unknown> = { userErrors: [] },
): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id, name: "shopify:cart:lines-update", action: "add", phase },
      ...(phase === "settled" ? { result } : {}),
      ...(phase === "failed" ? { error: { message: "network" } } : {}),
      ...(phase === "unsettled" ? { reason: "document-unloaded" } : {}),
    },
  };
}

/** The storefront handled the add. */
const settled = (id = "e9") => eventOutcome("settled", id);
/** The storefront rejected the add with cart user errors. */
const rejected = (id = "e9") =>
  eventOutcome("settled", id, { userErrors: [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK" }] });

const OTHER = "gid://shopify/ProductVariant/2";
const ENDPOINT = "https://www.shop.com/cart.js";
const GIFT = "gid://shopify/ProductVariant/99";
const COMPLETED: BuyerResult = { completed: true, reason: "completed", summary: "Added." };
const STEP_LIMIT: BuyerResult = { completed: false, reason: "step-limit", summary: "Ran out." };
const buyerStart: EvidenceRecord = { kind: "buyer.act.start", timestamp: 0, data: {} };
/** A settled add of 1 unit of the pinned variant after the buyer started. */
const ADDED = [buyerStart, addInput(VARIANT, 1), settled()];
const NOT_CONFIRMED = { source: "agent", code: "add-not-confirmed" };
const ADD_PENDING = { source: "runner", code: "add-pending" };
const WAIT_MS = 5_000;

function cartOf(...lines: Array<[string, number]>): CartSnapshot {
  const parsed: CartLine[] = lines.map(([variantId, quantity]) => ({ variantId, quantity }));
  return {
    endpoint: ENDPOINT,
    totalQuantity: parsed.reduce((sum, line) => sum + line.quantity, 0),
    lines: parsed,
  };
}

/**
 * Runs the assertion against a session cart (or a read error, or no reader) on fake timers, so
 * the event wait passes at once. A cart function can change the live evidence during the read.
 * `onStart` can schedule evidence or an abort. The Storefront API fails any request, so a test
 * fails if the assertion reads a cart through it.
 */
async function assertCart(options: {
  cart: CartSnapshot | Error | "no-reader" | ((evidence: EvidenceRecord[]) => CartSnapshot);
  buyer?: BuyerResult;
  events?: EvidenceRecord[];
  captured?: string;
  signal?: AbortSignal;
  onStart?: (evidence: EvidenceRecord[]) => void;
}) {
  let apiCalls = 0;
  let reads = 0;
  const fetch: typeof globalThis.fetch = async () => {
    apiCalls++;
    throw new Error("The assertion must not call the Storefront API.");
  };
  const cart = options.cart;
  const evidence: EvidenceRecord[] = [
    ...(options.events ?? []),
    ...(options.captured === undefined
      ? []
      : [
          { kind: "navigation-blocked", timestamp: 1, data: { reason: "checkout" } },
          { kind: "checkout", timestamp: 1, data: { url: options.captured } },
        ]),
  ];
  vi.useFakeTimers();
  try {
    const started = Date.now();
    options.onStart?.(evidence);
    const pending = assertAddToCart(
      {
        api: createStorefrontApi({ origin: "https://www.shop.com", fetch }),
        storefrontUrl: new URL("https://www.shop.com/"),
        context: US_EN,
        evidence,
        buyer: options.buyer ?? COMPLETED,
        signal: options.signal ?? new AbortController().signal,
        ...(cart === "no-reader"
          ? {}
          : {
              readCart: async () => {
                reads++;
                const next = typeof cart === "function" ? cart(evidence) : cart;
                if (next instanceof Error) throw next;
                return next;
              },
            }),
      },
      VARIANT,
    );
    await vi.runAllTimersAsync();
    return { outcome: await pending, apiCalls, reads, elapsedMs: Date.now() - started };
  } finally {
    vi.useRealTimers();
  }
}

describe("assertAddToCart after a settled pinned add", () => {
  it("passes on 1 unit of the pinned variant with a gift, with one read, no wait, and no Storefront API cart query", async () => {
    const { outcome, apiCalls, reads, elapsedMs } = await assertCart({
      cart: cartOf([VARIANT, 1], [GIFT, 1]),
      events: ADDED,
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.equal(outcome.details?.otherLines, 1);
    assert.deepEqual(outcome.details?.cart, {
      source: "cart-json",
      endpoint: ENDPOINT,
      handoff: "none",
      itemCountConsistent: true,
    });
    // The cart JSON has no country, and the browser country is not checked.
    assert.deepEqual(outcome.details?.context, {
      cartCountryConfirmed: false,
      countryVerification: "configured-only",
    });
    assert.deepEqual([apiCalls, reads, elapsedMs], [0, 1, 0]);
    assertNoSecrets(outcome);
  });

  it("records an item_count that differs from the lines as a diagnostic, not a verdict", async () => {
    const odd = await assertCart({
      cart: { ...cartOf([VARIANT, 1]), totalQuantity: 3 },
      events: ADDED,
    });
    assert.equal(odd.outcome.verdict, "pass", odd.outcome.reason);
    assert.match(JSON.stringify(odd.outcome.details?.cart), /"itemCountConsistent":false/);
  });

  it("fails a wrong cart, whatever the buyer reported", async () => {
    for (const buyer of [COMPLETED, STEP_LIMIT]) {
      for (const [cart, check] of [
        [cartOf(), "variant-missing"],
        [cartOf([VARIANT, 3]), "wrong-quantity"],
      ] as const) {
        const { outcome, reads } = await assertCart({ cart, buyer, events: ADDED });
        assert.equal(outcome.verdict, "fail", outcome.reason);
        assert.equal(outcome.details?.cartCheck, check);
        assert.equal(reads, 1);
      }
    }
  });

  it("is indeterminate, never fail, when the cart JSON cannot be read", async () => {
    const http = await assertCart({
      cart: new CartReadError("request-failed", "The cart JSON endpoint answered HTTP 500.", 500),
      events: ADDED,
    });
    assert.equal(http.outcome.verdict, "indeterminate");
    assert.match(http.outcome.reason, /endpoint answered HTTP 500\./);
    assert.deepEqual(http.outcome.details?.failure, {
      source: "cart-json",
      code: "request-failed",
      httpStatus: 500,
    });
    for (const code of [
      "unavailable",
      "request-failed",
      "timeout",
      "invalid-response",
      "unreadable",
    ] as const) {
      const { outcome } = await assertCart({
        cart: new CartReadError(code, "Fixed message."),
        events: ADDED,
      });
      assert.equal(outcome.verdict, "indeterminate", code);
      assert.match(outcome.reason, /Fixed message\./);
      assert.deepEqual(outcome.details?.failure, { source: "cart-json", code });
    }
    const unknown = await assertCart({ cart: new Error("boom"), events: ADDED });
    assert.deepEqual(unknown.outcome.details?.failure, { source: "cart-json", code: "unreadable" });
  });

  it("is indeterminate with no cart read when the caller already stopped", async () => {
    const controller = new AbortController();
    controller.abort(new Error("SIGINT"));
    for (const cart of [cartOf([VARIANT, 1]), "no-reader"] as const) {
      const { outcome, reads } = await assertCart({
        cart,
        events: [buyerStart, addInput(VARIANT, 1), rejected()],
        signal: controller.signal,
      });
      assert.deepEqual(outcome.details?.failure, { source: "runner", code: "aborted" });
      assert.equal(reads, 0);
    }
  });

  it("reads the cart after a captured checkout, which is a diagnostic only", async () => {
    const captured = `https://www.shop.com/cart/c/${TOKEN}?key=${KEY}`;
    const empty = await assertCart({ cart: cartOf(), events: ADDED, captured });
    assert.equal(empty.outcome.verdict, "fail", empty.outcome.reason);
    assert.match(JSON.stringify(empty.outcome.details?.cart), /"handoff":"captured"/);
    assertNoSecrets(empty.outcome);

    const proof = await assertCart({ cart: cartOf([VARIANT, 1]), events: ADDED, captured });
    assert.equal(proof.outcome.verdict, "pass", proof.outcome.reason);

    // A captured handoff does not stand in for the settled add.
    const handoffOnly = await assertCart({ cart: cartOf([VARIANT, 1]), captured });
    assert.deepEqual(handoffOnly.outcome.details?.failure, NOT_CONFIRMED);
    assert.equal(handoffOnly.reads, 0);
  });

  it("decides by the session cart, not by a captured checkout URL", async () => {
    const { outcome } = await assertCart({
      cart: cartOf([VARIANT, 1]),
      events: ADDED,
      captured: "https://evil.example.net/checkouts/cn/unrelatedTok/en-us",
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.match(JSON.stringify(outcome.details?.cart), /"handoff":"captured"/);
  });
});

describe("assertAddToCart without a settled pinned add", () => {
  it.each([
    ["no Standard Events", []],
    ["a settled response with no input", [buyerStart, settled()]],
    ["an input with no promise", [buyerStart, addInput(VARIANT, 1, "e9", false)]],
    ["a failed request promise", [buyerStart, addInput(VARIANT, 1), eventOutcome("failed")]],
    ["an unsettled request", [buyerStart, addInput(VARIANT, 1), eventOutcome("unsettled")]],
    ["a stale add from before the buyer started", [addInput(VARIANT, 1), settled(), buyerStart]],
    ["an add of another variant", [buyerStart, addInput(OTHER, 1), settled()]],
    ["an add of 2 units", [buyerStart, addInput(VARIANT, 2), settled()]],
  ] as const)(
    "is indeterminate with no cart read after %s, even for a completed buyer and 1 unit in the cart",
    async (_name, events) => {
      const { outcome, reads, elapsedMs } = await assertCart({
        cart: cartOf([VARIANT, 1]),
        buyer: COMPLETED,
        events: [...events],
      });
      assert.equal(outcome.verdict, "indeterminate", outcome.reason);
      assert.match(outcome.reason, /No Standard Event add of 1 unit/);
      assert.deepEqual(outcome.details?.failure, NOT_CONFIRMED);
      assert.deepEqual([reads, elapsedMs], [0, 0]);
    },
  );

  it("reports the buyer failure when the buyer did not complete", async () => {
    const unconfirmedCompletion: BuyerResult = {
      completed: false,
      reason: "error",
      summary: "done?",
      failure: { source: "sdk", code: "completion-unconfirmed" },
    };
    const { outcome } = await assertCart({ cart: cartOf(), buyer: unconfirmedCompletion });
    assert.equal(outcome.verdict, "indeterminate");
    assert.deepEqual(outcome.details?.failure, { source: "sdk", code: "completion-unconfirmed" });
  });
});

describe("assertAddToCart with a storefront-reported rejection of the pinned add", () => {
  it("fails with add-rejected for a wrong cart or no reader, and still passes on proof of 1 unit", async () => {
    const events = [buyerStart, addInput(VARIANT, 1), rejected()];
    for (const cart of [cartOf(), "no-reader"] as const) {
      const { outcome } = await assertCart({ cart, buyer: STEP_LIMIT, events });
      assert.equal(outcome.verdict, "fail", outcome.reason);
      assert.deepEqual(outcome.details?.failure, { source: "storefront", code: "add-rejected" });
      assert.doesNotMatch(outcome.reason, /MERCHANDISE/);
    }
    const proof = await assertCart({ cart: cartOf([VARIANT, 1]), buyer: STEP_LIMIT, events });
    assert.equal(proof.outcome.verdict, "pass", proof.outcome.reason);
  });

  // Settlement order need not match attempt order, so both orders are checked.
  it.each([
    ["rejected, then a successful one settles", [rejected("e1"), settled("e2")]],
    ["successful, then a rejected one settles", [settled("e2"), rejected("e1")]],
  ] as const)("does not claim a rejection when one pinned add is %s", async (_name, settles) => {
    const events = [buyerStart, addInput(VARIANT, 1, "e1"), addInput(VARIANT, 1, "e2"), ...settles];
    const noReader = await assertCart({ cart: "no-reader", buyer: STEP_LIMIT, events });
    assert.deepEqual(noReader.outcome.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
    const empty = await assertCart({ cart: cartOf(), buyer: STEP_LIMIT, events });
    assert.equal(empty.outcome.verdict, "fail", empty.outcome.reason);
    assert.equal(empty.outcome.details?.cartCheck, "variant-missing");
  });

  it("fails with add-rejected when every settled pinned add was rejected", async () => {
    const { outcome } = await assertCart({
      cart: "no-reader",
      buyer: STEP_LIMIT,
      events: [
        buyerStart,
        addInput(VARIANT, 1, "e1"),
        addInput(VARIANT, 1, "e2"),
        rejected("e2"),
        rejected("e1"),
      ],
    });
    assert.equal(outcome.verdict, "fail", outcome.reason);
    assert.deepEqual(outcome.details?.failure, { source: "storefront", code: "add-rejected" });
  });

  it("ignores a rejection of another variant or a stale one", async () => {
    for (const events of [
      [buyerStart, addInput(OTHER, 1), rejected()],
      [addInput(VARIANT, 1), rejected(), buyerStart],
    ]) {
      const { outcome } = await assertCart({ cart: "no-reader", buyer: STEP_LIMIT, events });
      assert.deepEqual(outcome.details?.failure, {
        source: "cart-json",
        code: "reader-unavailable",
      });
    }
  });
});

describe("assertAddToCart without a reader", () => {
  it("is indeterminate with no cart read, also after a captured handoff", async () => {
    const none = await assertCart({ cart: "no-reader", events: ADDED });
    assert.equal(none.outcome.verdict, "indeterminate", none.outcome.reason);
    assert.deepEqual(none.outcome.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
    const captured = await assertCart({
      cart: "no-reader",
      captured: `https://checkout.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`,
    });
    assert.match(captured.outcome.reason, /no cart reader is available/);
    assertNoSecrets(captured.outcome);
  });
});

describe("assertAddToCart timing", () => {
  it("waits for a pending pinned add, then reads the cart once: the buyer reported before the add finished", async () => {
    let added = false;
    const { outcome, reads, elapsedMs } = await assertCart({
      events: [buyerStart, addInput(VARIANT, 1)],
      onStart: (evidence) =>
        setTimeout(() => {
          added = true;
          evidence.push(settled());
        }, 700),
      cart: () => (added ? cartOf([VARIANT, 1]) : cartOf()),
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.equal(reads, 1);
    assert.ok(elapsedMs >= 700 && elapsedMs < WAIT_MS, String(elapsedMs));
  });

  it("does not pass 1 unit while an add of 2 more units is pending", async () => {
    let added = false;
    let readWhilePending = false;
    const { outcome, reads } = await assertCart({
      events: [...ADDED, addInput(VARIANT, 2, "e2")],
      onStart: (evidence) =>
        setTimeout(() => {
          added = true;
          evidence.push(settled("e2"));
        }, 600),
      cart: () => {
        readWhilePending ||= !added;
        return cartOf([VARIANT, added ? 3 : 1]);
      },
    });
    assert.equal(readWhilePending, false);
    assert.equal(reads, 1);
    assert.equal(outcome.verdict, "fail", outcome.reason);
    assert.equal(outcome.details?.requestedQuantity, 3);
  });

  it("is indeterminate, with no cart read, when a pinned add is still pending after the wait", async () => {
    for (const events of [
      [buyerStart, addInput(VARIANT, 1)],
      // The settled response belongs to another event.
      [buyerStart, addInput(VARIANT, 1), settled("e8")],
    ]) {
      for (const cart of [cartOf([VARIANT, 1]), "no-reader"] as const) {
        const { outcome, reads, elapsedMs } = await assertCart({ events, cart });
        assert.equal(outcome.verdict, "indeterminate", outcome.reason);
        assert.deepEqual(outcome.details?.failure, ADD_PENDING);
        assert.equal(reads, 0);
        assert.ok(elapsedMs >= WAIT_MS && elapsedMs < WAIT_MS + 500, String(elapsedMs));
      }
    }
  });

  it("is indeterminate, and never reads again, when an add starts during the read", async () => {
    for (const [during, failure] of [
      [[addInput(VARIANT, 1, "e2"), settled("e2")], { source: "runner", code: "cart-changing" }],
      [[addInput(VARIANT, 1, "e2")], ADD_PENDING],
    ] as const) {
      const { outcome, reads } = await assertCart({
        events: ADDED,
        cart: (evidence) => {
          evidence.push(...during);
          return cartOf([VARIANT, 1]);
        },
      });
      assert.equal(outcome.verdict, "indeterminate", outcome.reason);
      assert.deepEqual(outcome.details?.failure, failure);
      assert.equal(reads, 1);
    }
  });

  it("judges with the evidence after the read: an answer that arrives during the read counts", async () => {
    // e1 was rejected. e2 (no promise) is answered during the read, so it is not a rejection.
    const { outcome } = await assertCart({
      events: [
        buyerStart,
        addInput(VARIANT, 1, "e1"),
        rejected("e1"),
        addInput(VARIANT, 1, "e2", false),
      ],
      cart: (evidence) => {
        evidence.push(settled("e2"));
        return cartOf();
      },
    });
    assert.equal(outcome.verdict, "fail", outcome.reason);
    // A wrong cart, not a storefront rejection: one pinned add was answered without user errors.
    assert.equal(outcome.details?.failure, undefined);
  });

  it("is not kept waiting by stale or unrelated pending adds", async () => {
    const { outcome, reads, elapsedMs } = await assertCart({
      events: [addInput(VARIANT, 1, "stale"), ...ADDED, addInput(OTHER, 1, "other")],
      cart: cartOf([VARIANT, 1]),
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.deepEqual([reads, elapsedMs], [1, 0]);
  });

  it("does not claim a rejection while another pinned add is pending, and counts its late answer", async () => {
    const events = [
      buyerStart,
      addInput(VARIANT, 1, "e1"),
      addInput(VARIANT, 1, "e2"),
      rejected("e1"),
    ];
    const pending = await assertCart({ cart: "no-reader", events });
    assert.deepEqual(pending.outcome.details?.failure, ADD_PENDING);

    let added = false;
    const late = await assertCart({
      events,
      onStart: (evidence) =>
        setTimeout(() => {
          added = true;
          evidence.push(settled("e2"));
        }, 500),
      cart: () => (added ? cartOf([VARIANT, 1]) : cartOf()),
    });
    assert.equal(late.outcome.verdict, "pass", late.outcome.reason);
    assert.equal(late.reads, 1);
  });

  it("stops within one check interval, as indeterminate, when aborted while it waits", async () => {
    const controller = new AbortController();
    const { outcome, reads, elapsedMs } = await assertCart({
      events: [buyerStart, addInput(VARIANT, 1)],
      cart: cartOf([VARIANT, 1]),
      signal: controller.signal,
      onStart: () => setTimeout(() => controller.abort(new Error("SIGINT")), 300),
    });
    assert.deepEqual(outcome.details?.failure, { source: "runner", code: "aborted" });
    assert.equal(reads, 0);
    assert.ok(elapsedMs < 500, String(elapsedMs));
  });
});
