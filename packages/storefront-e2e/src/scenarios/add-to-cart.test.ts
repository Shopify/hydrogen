import assert from "node:assert/strict";

import { describe, it } from "vitest";

import type { BuyerResult } from "../agent/buyer.ts";
import type { EvidenceRecord } from "../evidence.ts";
import { CartReferenceError, type CartReference } from "../scenario.ts";
import { createStorefrontApi } from "../shopify/storefront.ts";
import { assertAddToCart, buildObjective, evaluateCart, productUrl } from "./add-to-cart.ts";
import { fakeFetch, sfapi, US_EN } from "./test-helpers.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const TOKEN = "hWN1capturedTok";
const KEY = "capturedKey1234";
const CART_ID = `gid://shopify/Cart/${TOKEN}?key=${KEY}`;
const CUSTOM_CHECKOUT = `https://checkout.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`;

type CartOverrides = Record<string, unknown>;

function cartBody(overrides: CartOverrides | null) {
  return {
    body: sfapi({
      cart:
        overrides === null
          ? null
          : {
              id: CART_ID,
              checkoutUrl: CUSTOM_CHECKOUT,
              totalQuantity: 1,
              buyerIdentity: { countryCode: null },
              lines: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [{ quantity: 1, merchandise: { id: VARIANT } }],
              },
              ...overrides,
            },
    }),
  };
}

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

/** Runs the assertion with one cart response per API read, in order. */
async function assertFlow(
  capturedUrl: string | undefined,
  carts: Array<CartOverrides | null>,
  options: { events?: EvidenceRecord[]; cartId?: string } = {},
) {
  const { fetch, requests } = fakeFetch(carts.map(cartBody));
  const outcome = await assertAddToCart(
    {
      api: createStorefrontApi({ origin: "https://www.shop.com", fetch }),
      storefrontUrl: new URL("https://www.shop.com/"),
      context: US_EN,
      evidence: [
        ...(options.events ?? []),
        {
          kind: "navigation-blocked",
          timestamp: 1,
          data: { reason: "checkout", frame: "top-level" },
        },
        ...(capturedUrl === undefined
          ? []
          : [
              {
                kind: "checkout",
                timestamp: 1,
                data: {
                  url: capturedUrl,
                  ...(options.cartId === undefined ? {} : { cartId: options.cartId }),
                },
              },
            ]),
      ],
      buyer: { completed: false, reason: "aborted", summary: "stopped" },
      signal: new AbortController().signal,
    },
    VARIANT,
  );
  return { outcome, requests };
}

async function assertWith(
  capturedUrl: string | undefined,
  cart: CartOverrides | null | "no-api-read",
) {
  return assertFlow(capturedUrl, cart === "no-api-read" ? [] : [cart]);
}

/** A native-cart API response on the origin of `url`, with a rotated cart ID key. */
function apiCart(url: string, overrides: CartOverrides = {}) {
  return {
    id: "gid://shopify/Cart/fixture-native?key=apiRotated1",
    checkoutUrl: `${new URL(url).origin}/cart/c/fixture-native?key=apiKey123`,
    ...overrides,
  };
}

/** No token or key of either cart reaches the outcome reason or details. */
function assertNoSecrets(outcome: unknown, extra: string[] = []) {
  assert.doesNotMatch(JSON.stringify(outcome), new RegExp([TOKEN, KEY, ...extra].join("|")));
}

describe("assertAddToCart", () => {
  it("passes a custom checkout domain only when the Storefront API confirms it", async () => {
    const { outcome, requests } = await assertWith(CUSTOM_CHECKOUT, {});
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.deepEqual(outcome.details?.checkout, {
      capturedOrigin: "https://checkout.custom-shop.com",
      apiOrigin: "https://checkout.custom-shop.com",
      capturedForm: "cart-permalink",
      apiForm: "cart-permalink",
      exactApiQuery: true,
      boundBy: "cart-id",
      cartSource: "checkout-url",
      handoff: "captured",
      standardEventCart: "absent",
    });
    // One read through the configured API origin. The candidate host is never fetched.
    assert.deepEqual(
      requests.map((request) => request.url),
      ["https://www.shop.com/api/2026-10/graphql.json"],
    );
    assert.equal(requests[0]?.variables.id, CART_ID);
    assert.equal(requests[0]?.variables.country, "US");
    assert.equal(requests[0]?.variables.language, "EN");
    assert.match(
      requests[0]?.query ?? "",
      /@inContext\(country: \$country, language: \$language\)/,
    );
    // No buyer identity country: the cart country is recorded as not confirmed, not assumed.
    assert.deepEqual(outcome.details?.context, {
      queryCountry: "US",
      queryLanguage: "EN",
      cartBuyerCountry: null,
      cartCountryConfirmed: false,
    });
  });

  it("records a confirmed cart country when the buyer identity matches", async () => {
    const { outcome } = await assertWith(CUSTOM_CHECKOUT, { buyerIdentity: { countryCode: "US" } });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.deepEqual(outcome.details?.context, {
      queryCountry: "US",
      queryLanguage: "EN",
      cartBuyerCountry: "US",
      cartCountryConfirmed: true,
    });
  });

  it("is indeterminate (context), never fail, when the cart buyer identity names another country", async () => {
    // The wrong variant would be a fail in the run context, but the cart is in another country.
    const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
      buyerIdentity: { countryCode: "CA" },
      lines: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{ quantity: 1, merchandise: { id: "gid://shopify/ProductVariant/2" } }],
      },
    });
    assert.equal(outcome.verdict, "indeterminate");
    assert.equal(outcome.errorKind, "context");
    assert.match(outcome.reason, /buyer identity country is CA/);
  });

  describe("with native checkout URLs (synthetic tokens)", () => {
    const NATIVE = [
      "https://shopca.ladygaga.com/checkouts/cn/fixture-native/en-ca/information?_r=fixture&auto_redirect=false&skip_shop_pay=true",
      "https://www.ohpolly.com/checkouts/cn/fixture-native/en-ca",
      "https://happydad.ca/checkouts/cn/fixture-native/en-ca",
    ];

    it("captures, reads the cart without a key in the run context, and passes with no events", async () => {
      for (const url of NATIVE) {
        const { outcome, requests } = await assertFlow(url, [apiCart(url)]);
        assert.equal(outcome.verdict, "pass", `${url}: ${outcome.reason}`);
        assert.equal(requests.length, 1);
        assert.equal(requests[0]?.variables.id, "gid://shopify/Cart/fixture-native");
        assert.equal(requests[0]?.variables.country, "US");
        assert.equal(requests[0]?.variables.language, "EN");
        assert.match(
          JSON.stringify(outcome.details?.checkout),
          /"capturedForm":"native-checkout","apiForm":"cart-permalink","exactApiQuery":false,"boundBy":"cart-id"/,
        );
        assertNoSecrets(outcome, ["fixture-native", "apiRotated1", "apiKey123"]);
      }
    });

    it("passes a native API checkout URL with other locale and step segments", async () => {
      const url = NATIVE[1] ?? "";
      const { outcome } = await assertFlow(url, [
        apiCart(url, {
          checkoutUrl: "https://www.ohpolly.com/checkouts/cn/fixture-native/fr-ca/shipping",
        }),
      ]);
      assert.equal(outcome.verdict, "pass", outcome.reason);
    });

    it("fails the wrong quantity or variant on the bound cart", async () => {
      const url = NATIVE[0] ?? "";
      // The captured handoff confirms the add attempt, so a wrong cart is a failure.
      const quantity = await assertFlow(url, [
        apiCart(url, {
          totalQuantity: 2,
          lines: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ quantity: 2, merchandise: { id: VARIANT } }],
          },
        }),
      ]);
      assert.equal(quantity.outcome.verdict, "fail");
      const variant = await assertFlow(url, [
        apiCart(url, {
          lines: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ quantity: 1, merchandise: { id: "gid://shopify/ProductVariant/2" } }],
          },
        }),
      ]);
      assert.equal(variant.outcome.verdict, "fail");
      assert.match(variant.outcome.reason, /no line with the pinned variant/);
    });

    it("passes when the API checkout URL names another origin, and reads only the configured API", async () => {
      const url = NATIVE[2] ?? "";
      const { outcome, requests } = await assertFlow(url, [
        apiCart(url, { checkoutUrl: "https://checkout.happydad.ca/cart/c/fixture-native?key=k" }),
      ]);
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.deepEqual(
        requests.map((request) => request.url),
        ["https://www.shop.com/api/2026-10/graphql.json"],
      );
    });

    describe("for a Shop wrapper URL whose origin the API does not name", () => {
      const WRAPPER = "https://shop.app/checkout/12345/cn/fixture-native/en-ca";
      const api = (overrides: CartOverrides = {}) => apiCart("https://happydad.ca/", overrides);

      it("passes the same cart with the pinned variant and quantity", async () => {
        const { outcome, requests } = await assertFlow(WRAPPER, [api()]);
        assert.equal(outcome.verdict, "pass", outcome.reason);
        assert.equal(requests.length, 1);
        assert.equal(requests[0]?.url, "https://www.shop.com/api/2026-10/graphql.json");
        assert.equal(requests[0]?.variables.id, "gid://shopify/Cart/fixture-native");
        assert.equal(requests[0]?.variables.country, "US");
        assertNoSecrets(outcome, ["fixture-native", "apiRotated1", "apiKey123"]);
      });

      it("fails the wrong quantity or variant", async () => {
        const quantity = await assertFlow(WRAPPER, [
          api({
            totalQuantity: 2,
            lines: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ quantity: 2, merchandise: { id: VARIANT } }],
            },
          }),
        ]);
        assert.equal(quantity.outcome.verdict, "fail");
        assert.match(quantity.outcome.reason, /quantity/i);
        const variant = await assertFlow(WRAPPER, [
          api({
            lines: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ quantity: 1, merchandise: { id: "gid://shopify/ProductVariant/2" } }],
            },
          }),
        ]);
        assert.equal(variant.outcome.verdict, "fail");
        assert.match(variant.outcome.reason, /no line with the pinned variant/);
      });

      it("is indeterminate (context), not pass, when the cart is in another country", async () => {
        const { outcome } = await assertFlow(WRAPPER, [
          api({ buyerIdentity: { countryCode: "CA" } }),
        ]);
        assert.equal(outcome.verdict, "indeterminate");
        assert.equal(outcome.errorKind, "context");
      });

      it("is indeterminate, not pass, when the API returns another cart", async () => {
        const { outcome } = await assertFlow(WRAPPER, [
          api({
            id: "gid://shopify/Cart/fixture-other?key=k",
            checkoutUrl: "https://happydad.ca/cart/c/fixture-other?key=k",
          }),
        ]);
        assert.equal(outcome.verdict, "indeterminate");
      });
    });
  });

  describe("with a response-specific cart ID key", () => {
    const ROTATED_KEY = "rotatedResponseKey77";
    const ROTATED_ID = `gid://shopify/Cart/${TOKEN}?key=${ROTATED_KEY}`;

    it("passes when the returned cart ID has another key, and reads with the captured ID", async () => {
      const { outcome, requests } = await assertWith(CUSTOM_CHECKOUT, { id: ROTATED_ID });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.equal(requests[0]?.variables.id, CART_ID);
      assertNoSecrets(outcome, [ROTATED_KEY]);
    });

    it("passes, with exactApiQuery false, when the API checkout URL key differs from the captured key", async () => {
      // Keys are not cart identity, and key equality is not independent proof.
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
        id: ROTATED_ID,
        checkoutUrl: `https://checkout.custom-shop.com/cart/c/${TOKEN}?key=${ROTATED_KEY}`,
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.match(JSON.stringify(outcome.details?.checkout), /"exactApiQuery":false/);
      assertNoSecrets(outcome, [ROTATED_KEY]);
    });

    it("passes when the API checkout URL is on another host", async () => {
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
        id: ROTATED_ID,
        checkoutUrl: `https://www.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`,
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assertNoSecrets(outcome, [ROTATED_KEY]);
    });

    it("is indeterminate (api) when the returned cart ID has another token", async () => {
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
        id: `gid://shopify/Cart/otherTok?key=${KEY}`,
      });
      assert.equal(outcome.verdict, "indeterminate");
      assert.equal(outcome.errorKind, "api");
    });

    it("binds through the API checkout URL when the returned cart ID has an unknown format", async () => {
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
        id: `gid://shopify/Cart/${TOKEN}?key=${KEY}&x=1`,
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.match(JSON.stringify(outcome.details?.checkout), /"boundBy":"checkout-url"/);
    });
  });

  it("decides by the cart, not the handoff host, for a sibling, port, or other host", async () => {
    for (const captured of [
      `https://www.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`,
      `https://checkout.custom-shop.com:8443/cart/c/${TOKEN}?key=${KEY}`,
      `http://localhost:4000/cart/c/${TOKEN}?key=${KEY}`,
    ]) {
      const pass = await assertWith(captured, {});
      assert.equal(pass.outcome.verdict, "pass", `${captured}: ${pass.outcome.reason}`);
      // Only the configured API is read; the handoff host is never fetched.
      assert.deepEqual(
        pass.requests.map((request) => request.url),
        ["https://www.shop.com/api/2026-10/graphql.json"],
      );
      const fail = await assertWith(captured, {
        totalQuantity: 2,
        lines: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [{ quantity: 2, merchandise: { id: VARIANT } }],
        },
      });
      assert.equal(fail.outcome.verdict, "fail", captured);
    }
  });

  it("binds by the cart ID when the API checkout URL names another key or reference", async () => {
    for (const checkoutUrl of [
      `https://checkout.custom-shop.com/cart/c/${TOKEN}?key=apiOtherKey99`,
      `https://checkout.custom-shop.com/checkouts/cn/apiOtherTok99`,
    ]) {
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, { checkoutUrl });
      assert.equal(outcome.verdict, "pass", checkoutUrl);
      assertNoSecrets(outcome, ["apiOtherKey99", "apiOtherTok99"]);
    }
  });

  it("is indeterminate (api), never pass, for an unusable API checkout URL or missing cart", async () => {
    for (const checkoutUrl of ["not a url", "javascript:alert(1)", "/cart/c/x"]) {
      const { outcome } = await assertWith(CUSTOM_CHECKOUT, { checkoutUrl });
      assert.equal(outcome.verdict, "indeterminate", checkoutUrl);
      assert.equal(outcome.errorKind, "api");
    }
    const missing = await assertWith(CUSTOM_CHECKOUT, null);
    assert.equal(missing.outcome.verdict, "indeterminate");
    assert.equal(missing.outcome.errorKind, "api");
    // A missing `checkoutUrl` is a schema error. The runner reports it as an api error.
    await assert.rejects(assertWith(CUSTOM_CHECKOUT, { checkoutUrl: null }), /checkoutUrl/);
  });

  it("is indeterminate (browser) for an unsafe or absent capture, without an API read", async () => {
    for (const captured of [
      undefined,
      `http://evil.test/cart/c/${TOKEN}?key=${KEY}`,
      `https://user:pw@checkout.custom-shop.com/cart/c/${TOKEN}?key=${KEY}`,
    ]) {
      const { outcome, requests } = await assertWith(captured, "no-api-read");
      assert.equal(outcome.verdict, "indeterminate", String(captured));
      assert.equal(outcome.errorKind, "browser");
      assert.equal(requests.length, 0);
    }
  });

  it("keeps a capture with no cart reference as indeterminate with the missing reference", async () => {
    const { outcome, requests } = await assertFlow(
      "https://checkout.custom-shop.com/checkouts/zz/opaqueRef77",
      [],
    );
    assert.equal(outcome.verdict, "indeterminate");
    assert.equal(outcome.errorKind, "browser");
    assert.match(
      outcome.reason,
      /handoff to https:\/\/checkout\.custom-shop\.com was captured, but it has no cart reference/,
    );
    assert.doesNotMatch(outcome.reason, /no checkout navigation was captured/);
    assert.equal(requests.length, 0);
  });

  describe("with optional Standard Event cart IDs", () => {
    it("corroborates without an extra read when the event names the same cart", async () => {
      const { outcome, requests } = await assertFlow(CUSTOM_CHECKOUT, [{}], {
        events: [addEvent(`gid://shopify/Cart/${TOKEN}?key=eventKey55`)],
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.equal(requests.length, 1);
      assert.match(JSON.stringify(outcome.details?.checkout), /"standardEventCart":"matches"/);
      assertNoSecrets(outcome, ["eventKey55"]);
    });

    it("falls back to the event cart, unchanged, when the URL has no reference", async () => {
      const opaque = `gid://shopify/Cart/${TOKEN}?key=opaque%2Bevent%3D`;
      const { outcome, requests } = await assertFlow(
        `https://checkout.custom-shop.com/checkouts/zz/${TOKEN}/en-ca`,
        [{}],
        { events: [addEvent(opaque)] },
      );
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.deepEqual(
        requests.map((request) => request.variables.id),
        [opaque],
      );
      assert.match(JSON.stringify(outcome.details?.checkout), /"cartSource":"standard-event"/);
    });

    it("reads the URL first, then the event cart once, when the URL cart is not found", async () => {
      const eventId = "gid://shopify/Cart/eventTok?key=e";
      const { outcome, requests } = await assertFlow(
        "https://checkout.custom-shop.com/checkouts/cn/eventTok/en-ca",
        [
          null,
          { id: eventId, checkoutUrl: "https://checkout.custom-shop.com/cart/c/eventTok?key=e" },
        ],
        { events: [addEvent(eventId)] },
      );
      // The URL ID equals the event token here, so the bound event cart passes.
      assert.deepEqual(
        requests.map((request) => request.variables.id),
        ["gid://shopify/Cart/eventTok", eventId],
      );
      assert.equal(outcome.verdict, "pass", outcome.reason);
    });

    it("never passes an event cart that the checkout URL does not reference", async () => {
      const { outcome, requests } = await assertFlow(
        "https://checkout.custom-shop.com/checkouts/cn/urlTok/en-ca",
        [
          null,
          {
            id: "gid://shopify/Cart/otherTok",
            checkoutUrl: "https://checkout.custom-shop.com/cart/c/otherTok",
          },
        ],
        { events: [addEvent("gid://shopify/Cart/otherTok")] },
      );
      assert.equal(requests.length, 2);
      assert.equal(outcome.verdict, "indeterminate");
      assert.match(outcome.reason, /does not reference the cart/);
      assertNoSecrets(outcome, ["urlTok", "otherTok"]);
    });

    it("ignores an event cart ID with controls, and makes no read for it", async () => {
      const { outcome, requests } = await assertFlow(
        "https://checkout.custom-shop.com/checkouts/zz/x",
        [],
        { events: [addEvent("gid://shopify/Cart/bad\u0000id")] },
      );
      assert.equal(outcome.verdict, "indeterminate");
      assert.equal(requests.length, 0);
    });
  });

  it("checks cart contents only after the handoff is bound", async () => {
    const { outcome } = await assertWith(CUSTOM_CHECKOUT, {
      totalQuantity: 2,
      lines: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{ quantity: 2, merchandise: { id: VARIANT } }],
      },
    });
    assert.equal(outcome.verdict, "fail");
    assert.match(outcome.reason, /Expected quantity 1/);
  });
});

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
      /store data, not instructions.*titled "Shirt".*\[\{"name":"Color","value":"Red"\},\{"name":"Size","value":"M"\}\].*Keep the storefront country "US" and language "EN".*choose these values.*exactly 1.*As soon as the item is added, stop and report/,
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

const emptyReference = async (): Promise<CartReference> => ({ status: "empty" });

describe("assertAddToCart with the page cart action (Shopify.actions.getCart)", () => {
  const PAGE_TOKEN = "pageCartTok42";
  const PAGE_ID = `gid://shopify/Cart/${PAGE_TOKEN}?key=pageCartKey42`;
  const COMPLETED: BuyerResult = {
    completed: true,
    reason: "completed",
    summary: "Added.",
  };
  const STEP_LIMIT: BuyerResult = { completed: false, reason: "step-limit", summary: "Ran out." };

  /** The API cart for the page cart ID. */
  function pageCart(overrides: CartOverrides = {}): CartOverrides {
    return {
      id: `gid://shopify/Cart/${PAGE_TOKEN}?key=rotatedPageKey`,
      checkoutUrl: `https://www.shop.com/cart/c/${PAGE_TOKEN}?key=pageCartKey42`,
      ...overrides,
    };
  }

  /** Runs the assertion with no handoff evidence unless `captured` is set. */
  async function assertPage(options: {
    reference: (() => Promise<CartReference>) | undefined;
    carts: Array<CartOverrides | null>;
    buyer?: BuyerResult;
    events?: EvidenceRecord[];
    captured?: string;
  }) {
    const { fetch, requests } = fakeFetch(options.carts.map(cartBody));
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
        signal: new AbortController().signal,
        ...(options.reference === undefined ? {} : { readCartReference: options.reference }),
      },
      VARIANT,
    );
    return { outcome, requests };
  }

  const available = async (): Promise<CartReference> => ({ status: "available", cartId: PAGE_ID });

  function linesOf(quantity: number) {
    return {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: quantity === 0 ? [] : [{ quantity, merchandise: { id: VARIANT } }],
    };
  }

  it("reads the page cart ID through the configured API in the run context, with no handoff", async () => {
    const { outcome, requests } = await assertPage({
      reference: available,
      carts: [pageCart()],
      // A stale event cart is ignored when the page names its cart.
      events: [addEvent(CART_ID)],
    });
    assert.equal(outcome.verdict, "pass", outcome.reason);
    assert.match(outcome.reason, /exactly 1 unit/);
    assert.deepEqual(
      requests.map((request) => [request.url, request.variables.id, request.variables.country]),
      [["https://www.shop.com/api/2026-10/graphql.json", PAGE_ID, "US"]],
    );
    assert.equal(requests[0]?.variables.language, "EN");
    assert.deepEqual(outcome.details?.checkout, {
      cartSource: "standard-action",
      handoff: "none",
      standardEventCart: "differs",
    });
    assertNoSecrets(outcome, [PAGE_TOKEN, "pageCartKey42", "rotatedPageKey"]);
  });

  it("decides by the API cart: wrong variant or quantity fails, another country or cart is indeterminate", async () => {
    const variant = await assertPage({
      reference: available,
      carts: [
        pageCart({
          lines: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ quantity: 1, merchandise: { id: "gid://shopify/ProductVariant/2" } }],
          },
        }),
      ],
    });
    assert.equal(variant.outcome.verdict, "fail");
    assert.match(variant.outcome.reason, /no line with the pinned variant/);
    const quantity = await assertPage({
      reference: available,
      carts: [
        pageCart({
          totalQuantity: 3,
          lines: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ quantity: 3, merchandise: { id: VARIANT } }],
          },
        }),
      ],
    });
    assert.equal(quantity.outcome.verdict, "fail");
    const country = await assertPage({
      reference: available,
      carts: [pageCart({ buyerIdentity: { countryCode: "CA" } })],
    });
    assert.equal(country.outcome.errorKind, "context");
    const other = await assertPage({
      reference: available,
      carts: [pageCart({ id: "gid://shopify/Cart/otherTok?key=k" })],
    });
    assert.equal(other.outcome.verdict, "indeterminate");
    assert.equal(other.outcome.errorKind, "api");
  });

  it("passes on API proof even when the buyer did not complete, and is indeterminate (buyer) for a wrong cart without a confirmed add", async () => {
    const pass = await assertPage({ reference: available, carts: [pageCart()], buyer: STEP_LIMIT });
    assert.equal(pass.outcome.verdict, "pass", pass.outcome.reason);

    const wrong = await assertPage({
      reference: available,
      carts: [pageCart({ totalQuantity: 3, lines: linesOf(3) })],
      buyer: STEP_LIMIT,
    });
    assert.equal(wrong.outcome.verdict, "indeterminate");
    assert.equal(wrong.outcome.errorKind, "buyer");
    assert.match(wrong.outcome.reason, /No correct add attempt was confirmed/);
    // The cart read is kept for the report.
    assert.equal(wrong.outcome.details?.requestedQuantity, 3);
  });

  describe("confirms an add attempt from Standard Events only with a settled response after the buyer started", () => {
    const wrongCart = () => pageCart({ totalQuantity: 0, lines: linesOf(0) });
    const buyerStart: EvidenceRecord = { kind: "buyer.act.start", timestamp: 0, data: {} };
    const failedPromise: EvidenceRecord = {
      kind: "standard-event",
      timestamp: 0,
      data: {
        event: { id: "e9", name: "shopify:cart:lines-update", action: "add", phase: "failed" },
        error: { message: "network" },
      },
    };

    it("fails a wrong API cart after a settled pinned add", async () => {
      const { outcome } = await assertPage({
        reference: available,
        carts: [wrongCart()],
        buyer: STEP_LIMIT,
        events: [buyerStart, addInput(VARIANT, 1), settledSuccess()],
      });
      assert.equal(outcome.verdict, "fail", outcome.reason);
      assert.equal(outcome.details?.cartCheck, "variant-missing");
    });

    it("fails with add-rejected after a settled pinned add with cart user errors", async () => {
      const { outcome } = await assertPage({
        reference: available,
        carts: [wrongCart()],
        buyer: STEP_LIMIT,
        events: [buyerStart, addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(outcome.verdict, "fail", outcome.reason);
      assert.deepEqual(outcome.details?.failure, { source: "storefront", code: "add-rejected" });
    });

    it("passes on API proof after a settled pinned add", async () => {
      const { outcome } = await assertPage({
        reference: available,
        carts: [pageCart()],
        buyer: STEP_LIMIT,
        events: [buyerStart, addInput(VARIANT, 1), settledSuccess()],
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
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
    ] as const)(
      "does not confirm %s: a wrong API cart stays indeterminate",
      async (_name, events) => {
        const { outcome } = await assertPage({
          reference: available,
          carts: [wrongCart()],
          buyer: STEP_LIMIT,
          events: [...events],
        });
        assert.equal(outcome.verdict, "indeterminate", outcome.reason);
        assert.equal(outcome.errorKind, "buyer");
      },
    );
  });

  describe("with a storefront-reported rejection of the pinned add", () => {
    const STEP_LIMIT_BUYER: BuyerResult = { completed: false, reason: "step-limit", summary: "x" };

    it("fails with add-rejected when no cart reference or no pinned unit remains", async () => {
      const noReference = await assertPage({
        reference: undefined,
        carts: [],
        buyer: STEP_LIMIT_BUYER,
        events: [addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(noReference.outcome.verdict, "fail", noReference.outcome.reason);
      assert.deepEqual(noReference.outcome.details?.failure, {
        source: "storefront",
        code: "add-rejected",
      });
      assert.equal(noReference.requests.length, 0);
      assert.doesNotMatch(noReference.outcome.reason, /MERCHANDISE/);

      const emptyCart = await assertPage({
        reference: available,
        carts: [pageCart({ totalQuantity: 0, lines: linesOf(0) })],
        buyer: STEP_LIMIT_BUYER,
        events: [addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(emptyCart.outcome.verdict, "fail");
      // The cart state stays the cart check; the rejection is the failure cause.
      assert.equal(emptyCart.outcome.details?.cartCheck, "variant-missing");
      assert.deepEqual(emptyCart.outcome.details?.failure, {
        source: "storefront",
        code: "add-rejected",
      });
    });

    it("still passes on API proof of 1 unit despite a rejection", async () => {
      const { outcome } = await assertPage({
        reference: available,
        carts: [pageCart()],
        buyer: STEP_LIMIT_BUYER,
        events: [addInput(VARIANT, 1), rejectedSettle()],
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
    });

    it("ignores a rejection of another variant, a stale one before the buyer started, and a failed promise", async () => {
      const failedPromise: EvidenceRecord = {
        kind: "standard-event",
        timestamp: 0,
        data: {
          event: { id: "e9", name: "shopify:cart:lines-update", action: "add", phase: "failed" },
          error: { message: "network" },
        },
      };
      const buyerStart: EvidenceRecord = { kind: "buyer.act.start", timestamp: 0, data: {} };
      for (const events of [
        [addInput("gid://shopify/ProductVariant/2", 1), rejectedSettle()],
        [addInput(VARIANT, 1), rejectedSettle(), buyerStart],
        [addInput(VARIANT, 1), failedPromise],
      ]) {
        const { outcome } = await assertPage({
          reference: undefined,
          carts: [],
          buyer: STEP_LIMIT_BUYER,
          events,
        });
        assert.equal(outcome.verdict, "indeterminate", JSON.stringify(events));
      }
    });
  });

  it("keeps a wrong cart indeterminate after an unconfirmed SDK completion, and fails it after a real one", async () => {
    const wrongCart = pageCart({ totalQuantity: 0, lines: linesOf(0) });
    // The native adapter maps a completion without a `done` action to this result.
    const unconfirmedCompletion: BuyerResult = {
      completed: false,
      reason: "error",
      summary: "done?",
      failure: { source: "sdk", code: "completion-unconfirmed" },
    };
    const fabricated = await assertPage({
      reference: available,
      carts: [wrongCart],
      buyer: unconfirmedCompletion,
    });
    assert.equal(fabricated.outcome.verdict, "indeterminate");
    assert.deepEqual(fabricated.outcome.details?.failure, {
      source: "sdk",
      code: "completion-unconfirmed",
    });

    const real = await assertPage({ reference: available, carts: [wrongCart], buyer: COMPLETED });
    assert.equal(real.outcome.verdict, "fail");
  });

  it("fails when the API has no cart for the current cart ID that the page reported", async () => {
    const { outcome } = await assertPage({ reference: available, carts: [null] });
    assert.equal(outcome.verdict, "fail");
    assert.equal(outcome.details?.cartCheck, "cart-missing");
  });

  it("decides an explicit empty cart by the add attempt, with no fallback to an event or API read", async () => {
    const completed = await assertPage({
      reference: emptyReference,
      carts: [],
      events: [addEvent(CART_ID)],
    });
    assert.equal(completed.outcome.verdict, "fail");
    assert.equal(completed.outcome.details?.cartCheck, "no-current-cart");
    assert.equal(completed.requests.length, 0);

    const confused = await assertPage({ reference: emptyReference, carts: [], buyer: STEP_LIMIT });
    assert.equal(confused.outcome.verdict, "indeterminate");
    assert.equal(confused.outcome.errorKind, "buyer");
    assert.equal(confused.requests.length, 0);
  });

  it("is indeterminate (browser) when the action fails, with no fallback and no secret", async () => {
    const { outcome, requests } = await assertPage({
      reference: async () => {
        throw new Error("The page cart action failed.");
      },
      carts: [],
      events: [addEvent(CART_ID)],
    });
    assert.equal(outcome.verdict, "indeterminate");
    assert.equal(outcome.errorKind, "browser");
    assert.match(outcome.reason, /could not be read: The page cart action failed\./);
    assert.deepEqual(outcome.details?.failure, { source: "page-cart-action", code: "unreadable" });
    assert.equal(requests.length, 0);
    const typed = await assertPage({
      reference: async () => {
        throw new CartReferenceError(
          "timeout",
          "The page cart action did not settle within 5000 ms.",
        );
      },
      carts: [],
    });
    assert.deepEqual(typed.outcome.details?.failure, {
      source: "page-cart-action",
      code: "timeout",
    });
  });

  it("without the action, verifies the latest event cart ID for a completed buyer with no handoff", async () => {
    for (const reference of [
      undefined,
      async (): Promise<CartReference> => ({ status: "unavailable" }),
    ]) {
      const { outcome, requests } = await assertPage({
        reference,
        carts: [{}],
        events: [addEvent(CART_ID)],
      });
      assert.equal(outcome.verdict, "pass", outcome.reason);
      assert.equal(requests[0]?.variables.id, CART_ID);
      assert.match(JSON.stringify(outcome.details?.checkout), /"cartSource":"standard-event"/);
    }
    // No action and no event: no reference, which is not a storefront failure.
    const none = await assertPage({ reference: undefined, carts: [] });
    assert.equal(none.outcome.verdict, "indeterminate");
    assert.match(none.outcome.reason, /No cart reference is available/);
    assert.deepEqual(none.outcome.details?.failure, {
      source: "page-cart-action",
      code: "reference-unavailable",
    });
  });

  it("rejects a captured handoff that does not reference the page cart", async () => {
    const { outcome } = await assertPage({
      reference: available,
      carts: [pageCart()],
      captured: CUSTOM_CHECKOUT,
    });
    assert.equal(outcome.verdict, "indeterminate");
    assert.equal(outcome.errorKind, "browser");
    assert.match(JSON.stringify(outcome.details?.checkout), /"cartSource":"standard-action"/);
  });
});
