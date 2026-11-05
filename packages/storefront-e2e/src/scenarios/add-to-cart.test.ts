import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { BuyerResult } from "../agent/buyer.ts";
import type { EvidenceRecord } from "../evidence.ts";
import { CartReadError, type CartLine, type CartSnapshot } from "../scenario.ts";
import { createStorefrontApi } from "../shopify/storefront.ts";
import { assertAddToCart, buildObjective, evaluateCart, productUrl } from "./add-to-cart.ts";
import { US_EN } from "./test-helpers.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const TOKEN = "hWN1capturedTok";
const KEY = "capturedKey1234";
const CART_ID = `gid://shopify/Cart/${TOKEN}?key=${KEY}`;

/** A settled, error-free lines update with this cart ID, before the handoff. */
function addEvent(cartId: string): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id: "e1", name: "shopify:cart:lines-update", action: "add", phase: "settled" },
      result: { cart: { id: cartId, totalQuantity: 1 }, userErrors: [] },
    },
  };
}

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
function addInput(variant: string, quantity: number): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id: "e9", name: "shopify:cart:lines-update", action: "add", phase: "input" },
      input: { action: "add", lines: [{ merchandiseId: variant, quantity }] },
      awaited: true,
    },
  };
}

/** The `settled` record of event `e9` with no user errors: the storefront handled the add. */
function settledSuccess(id = "e9"): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id, name: "shopify:cart:lines-update", action: "add", phase: "settled" },
      result: { cart: { id: "gid://shopify/Cart/settledTok?key=k" }, userErrors: [] },
    },
  };
}

/** The `settled` record of event `e9` with cart user errors: the storefront rejected the add. */
function rejectedSettle(id = "e9"): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp: 0,
    data: {
      event: { id, name: "shopify:cart:lines-update", action: "add", phase: "settled" },
      result: { userErrors: [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK" }] },
    },
  };
}

const ENDPOINT = "https://www.shop.com/cart.js";
const GIFT = "gid://shopify/ProductVariant/99";
const COMPLETED: BuyerResult = { completed: true, reason: "completed", summary: "Added." };
const STEP_LIMIT: BuyerResult = { completed: false, reason: "step-limit", summary: "Ran out." };
const buyerStart: EvidenceRecord = { kind: "buyer.act.start", timestamp: 0, data: {} };

function cartOf(...lines: Array<[string, number]>): CartSnapshot {
  const parsed: CartLine[] = lines.map(([variantId, quantity]) => ({ variantId, quantity }));
  return {
    endpoint: ENDPOINT,
    totalQuantity: parsed.reduce((sum, line) => sum + line.quantity, 0),
    lines: parsed,
  };
}

/**
 * Runs the assertion against a session cart (or a read error, or no reader). The Storefront API
 * fails any request, so a test fails if the assertion reads a cart through it.
 */
async function assertCart(options: {
  cart: CartSnapshot | Error | "no-reader";
  buyer?: BuyerResult;
  events?: EvidenceRecord[];
  captured?: string;
  signal?: AbortSignal;
}) {
  let apiCalls = 0;
  let reads = 0;
  const fetch: typeof globalThis.fetch = async () => {
    apiCalls++;
    throw new Error("The assertion must not call the Storefront API.");
  };
  const cart = options.cart;
  const outcome = await assertAddToCart(
    {
      api: createStorefrontApi({ origin: "https://www.shop.com", fetch }),
      storefrontUrl: new URL("https://www.shop.com/"),
      context: US_EN,
      evidence: [
        ...(options.events ?? []),
        ...(options.captured === undefined
          ? []
          : [
              { kind: "navigation-blocked", timestamp: 1, data: { reason: "checkout" } },
              { kind: "checkout", timestamp: 1, data: { url: options.captured } },
            ]),
      ],
      buyer: options.buyer ?? COMPLETED,
      signal: options.signal ?? new AbortController().signal,
      ...(cart === "no-reader"
        ? {}
        : {
            readCart: async () => {
              reads++;
              if (cart instanceof Error) throw cart;
              return cart;
            },
          }),
    },
    VARIANT,
  );
  return { outcome, apiCalls, reads };
}

describe("assertAddToCart with the session cart JSON", () => {
  it("passes on 1 unit of the pinned variant with a gift, with no Storefront API cart query", async () => {
    const { outcome, apiCalls, reads } = await assertCart({
      cart: cartOf([VARIANT, 1], [GIFT, 1]),
      events: [addEvent(CART_ID)],
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
    assert.deepEqual([apiCalls, reads], [0, 1]);
    assertNoSecrets(outcome);
  });

  it("records an item_count that differs from the lines as a diagnostic, not a verdict", async () => {
    const odd = await assertCart({ cart: { ...cartOf([VARIANT, 1]), totalQuantity: 3 } });
    assert.equal(odd.outcome.verdict, "pass", odd.outcome.reason);
    assert.match(JSON.stringify(odd.outcome.details?.cart), /"itemCountConsistent":false/);
  });

  it("passes on proof even when the buyer did not complete, and is indeterminate for a wrong cart without a confirmed add", async () => {
    const pass = await assertCart({ cart: cartOf([VARIANT, 1]), buyer: STEP_LIMIT });
    assert.equal(pass.outcome.verdict, "pass", pass.outcome.reason);

    for (const cart of [cartOf([VARIANT, 3]), cartOf()]) {
      const wrong = await assertCart({ cart, buyer: STEP_LIMIT });
      assert.equal(wrong.outcome.verdict, "indeterminate");
      assert.match(wrong.outcome.reason, /No correct add attempt was confirmed/);
    }
  });

  describe("confirms an add attempt from Standard Events only with a settled response after the buyer started", () => {
    const failedPromise: EvidenceRecord = {
      kind: "standard-event",
      timestamp: 0,
      data: {
        event: { id: "e9", name: "shopify:cart:lines-update", action: "add", phase: "failed" },
        error: { message: "network" },
      },
    };

    it("fails an empty cart after a settled pinned add, and with add-rejected after cart user errors", async () => {
      const settled = await assertCart({
        cart: cartOf(),
        buyer: STEP_LIMIT,
        events: [buyerStart, addInput(VARIANT, 1), settledSuccess()],
      });
      assert.equal(settled.outcome.verdict, "fail", settled.outcome.reason);
      assert.equal(settled.outcome.details?.cartCheck, "variant-missing");

      const rejected = await assertCart({
        cart: cartOf(),
        buyer: STEP_LIMIT,
        events: [buyerStart, addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(rejected.outcome.verdict, "fail");
      assert.deepEqual(rejected.outcome.details?.failure, {
        source: "storefront",
        code: "add-rejected",
      });
    });

    it.each([
      ["an input alone", [addInput(VARIANT, 1)]],
      ["a failed request promise", [addInput(VARIANT, 1), failedPromise]],
      [
        "a stale add from before the buyer started",
        [addInput(VARIANT, 1), settledSuccess(), buyerStart],
      ],
      [
        "an add of another variant",
        [addInput("gid://shopify/ProductVariant/2", 1), settledSuccess()],
      ],
    ] as const)("does not confirm %s: a wrong cart stays indeterminate", async (_name, events) => {
      const { outcome } = await assertCart({
        cart: cartOf(),
        buyer: STEP_LIMIT,
        events: [...events],
      });
      assert.equal(outcome.verdict, "indeterminate", outcome.reason);
      assert.match(outcome.reason, /No correct add attempt was confirmed/);
    });
  });

  describe("with a storefront-reported rejection of the pinned add", () => {
    it("fails with add-rejected when no cart can be read, and still passes on proof of 1 unit", async () => {
      const noReader = await assertCart({
        cart: "no-reader",
        buyer: STEP_LIMIT,
        events: [addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(noReader.outcome.verdict, "fail", noReader.outcome.reason);
      assert.deepEqual(noReader.outcome.details?.failure, {
        source: "storefront",
        code: "add-rejected",
      });
      assert.doesNotMatch(noReader.outcome.reason, /MERCHANDISE/);

      const proof = await assertCart({
        cart: cartOf([VARIANT, 1]),
        buyer: STEP_LIMIT,
        events: [addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(proof.outcome.verdict, "pass", proof.outcome.reason);
    });

    it("ignores a rejection of another variant or a stale one", async () => {
      for (const events of [
        [addInput("gid://shopify/ProductVariant/2", 1), rejectedSettle()],
        [addInput(VARIANT, 1), rejectedSettle(), buyerStart],
      ]) {
        const { outcome } = await assertCart({ cart: "no-reader", buyer: STEP_LIMIT, events });
        assert.equal(outcome.verdict, "indeterminate", JSON.stringify(events));
      }
    });
  });

  it("keeps a wrong cart indeterminate after an unconfirmed SDK completion, and fails it after a real one", async () => {
    const unconfirmedCompletion: BuyerResult = {
      completed: false,
      reason: "error",
      summary: "done?",
      failure: { source: "sdk", code: "completion-unconfirmed" },
    };
    const fabricated = await assertCart({ cart: cartOf(), buyer: unconfirmedCompletion });
    assert.equal(fabricated.outcome.verdict, "indeterminate");
    assert.deepEqual(fabricated.outcome.details?.failure, {
      source: "sdk",
      code: "completion-unconfirmed",
    });
    const real = await assertCart({ cart: cartOf(), buyer: COMPLETED });
    assert.equal(real.outcome.verdict, "fail");
  });

  it("is indeterminate, never fail, when the cart JSON cannot be read, even after a completed add", async () => {
    const http = await assertCart({
      cart: new CartReadError("http-status", "The cart JSON endpoint answered HTTP 500.", 500),
      events: [buyerStart, addInput(VARIANT, 1), settledSuccess()],
    });
    assert.equal(http.outcome.verdict, "indeterminate");
    assert.deepEqual(http.outcome.details?.failure, {
      source: "cart-json",
      code: "http-status",
      httpStatus: 500,
    });
    for (const code of ["timeout", "invalid-json", "invalid-response", "network"] as const) {
      const { outcome } = await assertCart({ cart: new CartReadError(code, "Fixed message.") });
      assert.deepEqual(outcome.details?.failure, { source: "cart-json", code });
    }
    const unknown = await assertCart({ cart: new Error("boom") });
    assert.deepEqual(unknown.outcome.details?.failure, { source: "cart-json", code: "unreadable" });

    const controller = new AbortController();
    controller.abort(new Error("SIGINT"));
    const aborted = await assertCart({ cart: new Error("aborted"), signal: controller.signal });
    assert.deepEqual(aborted.outcome.details?.failure, { source: "cart-json", code: "aborted" });
  });

  it("without a reader, is indeterminate with no cart read, also after a captured handoff", async () => {
    const none = await assertCart({
      cart: "no-reader",
      events: [buyerStart, addInput(VARIANT, 1), settledSuccess(), addEvent(CART_ID)],
    });
    assert.equal(none.outcome.verdict, "indeterminate", none.outcome.reason);
    assert.deepEqual(none.outcome.details?.failure, {
      source: "cart-json",
      code: "reader-unavailable",
    });
    const captured = await assertCart({
      cart: "no-reader",
      captured: `https://checkout.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`,
    });
    assert.equal(captured.outcome.verdict, "indeterminate");
    assert.match(captured.outcome.reason, /Checkout navigation was blocked/);
    assertNoSecrets(captured.outcome);
    const confused = await assertCart({ cart: "no-reader", buyer: STEP_LIMIT });
    assert.equal(confused.outcome.verdict, "indeterminate");
    assert.match(confused.outcome.reason, /no cart reader is available/);
  });

  it("decides by the session cart, not by a captured checkout URL", async () => {
    const { outcome } = await assertCart({
      cart: cartOf([VARIANT, 1]),
      captured: "https://evil.example.net/checkouts/cn/unrelatedTok/en-us",
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.match(JSON.stringify(outcome.details?.cart), /"handoff":"captured"/);
  });
});
