import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PAGE_LIMIT,
  pinNonDefaultVariant,
  pinVariant,
  pinVariantWithTwoUnits,
  productUrl,
  STOCK_CHECK_LIMIT,
} from "./catalog.ts";
import { fakeFetch, type FakeResponse } from "./fake-fetch.ts";
import type { StorefrontLocale } from "./storefront.ts";

// Every test runs the real Hydrogen public client. Only `fetch` is fake.
const STOREFRONT_URL = new URL("https://shop.example/");
const CA_FR: StorefrontLocale = { country: "CA", language: "FR" };
const signal = new AbortController().signal;

type Variant = { id: string; availableForSale: boolean } | null;

function product(handle: string, variant: Variant, requiresSellingPlan = false) {
  return {
    title: `Title ${handle}`,
    handle,
    requiresSellingPlan,
    selectedOrFirstAvailableVariant:
      variant === null ? null : { ...variant, selectedOptions: [{ name: "Size", value: "M" }] },
  };
}

function available(handle: string) {
  return product(handle, {
    id: `gid://shopify/ProductVariant/${handle}`,
    availableForSale: true,
  });
}

function page(
  nodes: unknown[],
  pageInfo: { hasNextPage: boolean; endCursor: string | null } = {
    hasNextPage: false,
    endCursor: null,
  },
) {
  return { body: { data: { products: { pageInfo, nodes } } } };
}

function stubFetch(responses: FakeResponse[]) {
  const fake = fakeFetch(responses);
  vi.stubGlobal("fetch", fake.fetch);
  return fake.requests;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pinVariant", () => {
  it("sends the discovered context with an explicit @inContext", async () => {
    const requests = stubFetch([page([available("board")])]);

    await pinVariant(STOREFRONT_URL, CA_FR, signal);

    expect(requests[0]?.url).toMatch(/^https:\/\/shop\.example\/api\/[^/]+\/graphql\.json$/);
    expect(requests[0]?.query).toContain(
      "@inContext(country: $storefrontCountry, language: $storefrontLanguage)",
    );
    expect(requests[0]?.variables).toEqual({
      first: 50,
      after: null,
      storefrontCountry: "CA",
      storefrontLanguage: "FR",
    });
  });

  // Storefront API language codes that Hydrogen's shared `ShopifyLanguageCode` leaves out.
  it.each(["LA", "SH", "MO"] as const)("sends the language code %s unchanged", async (language) => {
    const requests = stubFetch([page([available("board")])]);

    await pinVariant(STOREFRONT_URL, { country: "CA", language }, signal);

    expect(requests[0]?.query).toContain(
      "@inContext(country: $storefrontCountry, language: $storefrontLanguage)",
    );
    expect(requests[0]?.variables).toEqual({
      first: 50,
      after: null,
      storefrontCountry: "CA",
      storefrontLanguage: language,
    });
  });

  it("pins the first eligible product and passes over ineligible ones", async () => {
    stubFetch([
      page([
        product("subscription", { id: "v1", availableForSale: true }, true),
        product("no-variant", null),
        product("sold-out", { id: "v3", availableForSale: false }),
        available("first"),
        available("second"),
      ]),
    ]);

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "pinned",
      pinned: {
        productHandle: "first",
        productTitle: "Title first",
        variantId: "gid://shopify/ProductVariant/first",
        selectedOptions: [{ name: "Size", value: "M" }],
      },
    });
  });

  it("follows the pagination cursor and keeps the context on every page", async () => {
    const requests = stubFetch([
      page([product("sold-out", { id: "v1", availableForSale: false })], {
        hasNextPage: true,
        endCursor: "cursor-1",
      }),
      page([available("later")]),
    ]);

    const pin = await pinVariant(STOREFRONT_URL, { country: "CA", language: "LA" }, signal);

    expect(pin.status === "pinned" && pin.pinned.productHandle).toBe("later");
    expect(requests.map((request) => request.variables)).toEqual([
      { first: 50, after: null, storefrontCountry: "CA", storefrontLanguage: "LA" },
      { first: 50, after: "cursor-1", storefrontCountry: "CA", storefrontLanguage: "LA" },
    ]);
  });

  it("skips when the catalog was searched to the end", async () => {
    stubFetch([page([])]);

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason: "No eligible variant: the catalog was searched to the end.",
    });
  });

  it("throws when pagination returns no cursor", async () => {
    stubFetch([page([], { hasNextPage: true, endCursor: null })]);

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Catalog pagination returned no cursor after page 1.",
    );
  });

  it("skips when the page limit is reached", async () => {
    const requests = stubFetch(
      Array.from({ length: PAGE_LIMIT }, (_, index) =>
        page([], { hasNextPage: true, endCursor: `cursor-${index + 1}` }),
      ),
    );

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason: "No eligible variant: the 5-page limit was reached (50 products per page).",
    });
    expect(requests).toHaveLength(PAGE_LIMIT);
  });

  it("throws on GraphQL errors", async () => {
    stubFetch([{ body: { data: null, errors: [{ message: "Bad country" }] } }]);

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "GraphQL errors: Bad country",
    );
  });

  it("throws on a bad shape", async () => {
    const { requiresSellingPlan: _dropped, ...withoutSellingPlan } = available("board");
    stubFetch([page([withoutSellingPlan])]);

    await expect(pinVariant(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Invalid response data: products.nodes.0.requiresSellingPlan: ",
    );
  });
});

type ChoiceVariant = { id: string; availableForSale: boolean };

/** A product for the variant choice query. `defaultId` is its `selectedOrFirstAvailableVariant`. */
function choiceProduct(
  handle: string,
  defaultId: string | null,
  variants: ChoiceVariant[],
  requiresSellingPlan = false,
) {
  return {
    title: `Title ${handle}`,
    handle,
    requiresSellingPlan,
    selectedOrFirstAvailableVariant: defaultId === null ? null : { id: defaultId },
    variants: {
      nodes: variants.map((variant) => ({
        ...variant,
        selectedOptions: [{ name: "Size", value: `size-${variant.id}` }],
      })),
    },
  };
}

/** Two available variants: `<handle>-default`, the default, then `<handle>-other`. */
function choosable(handle: string) {
  return choiceProduct(handle, `${handle}-default`, [
    { id: `${handle}-default`, availableForSale: true },
    { id: `${handle}-other`, availableForSale: true },
  ]);
}

describe("pinNonDefaultVariant", () => {
  it("sends first, after, variants, and the discovered context with an explicit @inContext", async () => {
    const requests = stubFetch([page([choosable("board")])]);

    await pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal);

    expect(requests[0]?.url).toMatch(/^https:\/\/shop\.example\/api\/[^/]+\/graphql\.json$/);
    expect(requests[0]?.query).toContain("query AgenticE2EVariantChoice(");
    expect(requests[0]?.query).toContain(
      "@inContext(country: $storefrontCountry, language: $storefrontLanguage)",
    );
    expect(requests[0]?.query).toContain("variants(first: $variants)");
    expect(requests[0]?.variables).toEqual({
      first: 50,
      after: null,
      variants: 10,
      storefrontCountry: "CA",
      storefrontLanguage: "FR",
    });
  });

  it("pins the first available variant that is not the default", async () => {
    stubFetch([
      page([
        choiceProduct("board", "v1", [
          { id: "v1", availableForSale: true },
          { id: "v2", availableForSale: false },
          { id: "v3", availableForSale: true },
          { id: "v4", availableForSale: true },
        ]),
      ]),
    ]);

    await expect(pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "pinned",
      pinned: {
        productHandle: "board",
        productTitle: "Title board",
        variantId: "v3",
        selectedOptions: [{ name: "Size", value: "size-v3" }],
      },
    });
  });

  it("does not take the first variant in the list when it is not the default", async () => {
    stubFetch([
      page([
        choiceProduct("board", "v2", [
          { id: "v1", availableForSale: true },
          { id: "v2", availableForSale: true },
        ]),
      ]),
    ]);

    const pin = await pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal);

    expect(pin.status === "pinned" && pin.pinned.variantId).toBe("v1");
  });

  it("does not take the default when it is not the first variant in the list", async () => {
    stubFetch([
      page([
        choiceProduct("board", "v2", [
          { id: "v1", availableForSale: false },
          { id: "v2", availableForSale: true },
          { id: "v3", availableForSale: true },
        ]),
      ]),
    ]);

    const pin = await pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal);

    expect(pin.status === "pinned" && pin.pinned.variantId).toBe("v3");
  });

  it("passes over ineligible products and pins the next eligible one", async () => {
    stubFetch([
      page([
        choiceProduct("one-available", "a1", [
          { id: "a1", availableForSale: true },
          { id: "a2", availableForSale: false },
        ]),
        choiceProduct(
          "subscription",
          "s1",
          [
            { id: "s1", availableForSale: true },
            { id: "s2", availableForSale: true },
          ],
          true,
        ),
        choiceProduct("no-default", null, [
          { id: "n1", availableForSale: true },
          { id: "n2", availableForSale: true },
        ]),
        choosable("first"),
        choosable("second"),
      ]),
    ]);

    const pin = await pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal);

    expect(pin.status === "pinned" && pin.pinned.variantId).toBe("first-other");
  });

  it.each([
    {
      case: "only one available variant",
      product: choiceProduct("board", "v1", [
        { id: "v1", availableForSale: true },
        { id: "v2", availableForSale: false },
      ]),
    },
    {
      case: "a selling plan requirement",
      product: choiceProduct(
        "board",
        "v1",
        [
          { id: "v1", availableForSale: true },
          { id: "v2", availableForSale: true },
        ],
        true,
      ),
    },
    {
      case: "a null default",
      product: choiceProduct("board", null, [
        { id: "v1", availableForSale: true },
        { id: "v2", availableForSale: true },
      ]),
    },
  ])("skips a product with $case", async ({ product: candidate }) => {
    stubFetch([page([candidate])]);

    await expect(pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No product with at least 2 variants available for sale: the catalog was searched to the end.",
    });
  });

  it("follows the pagination cursor and keeps the variables on every page", async () => {
    const requests = stubFetch([
      page([choiceProduct("single", "v1", [{ id: "v1", availableForSale: true }])], {
        hasNextPage: true,
        endCursor: "cursor-1",
      }),
      page([choosable("later")]),
    ]);

    const pin = await pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal);

    expect(pin.status === "pinned" && pin.pinned.variantId).toBe("later-other");
    expect(requests.map((request) => request.variables)).toEqual([
      { first: 50, after: null, variants: 10, storefrontCountry: "CA", storefrontLanguage: "FR" },
      {
        first: 50,
        after: "cursor-1",
        variants: 10,
        storefrontCountry: "CA",
        storefrontLanguage: "FR",
      },
    ]);
  });

  it("skips when the page limit is reached", async () => {
    const requests = stubFetch(
      Array.from({ length: PAGE_LIMIT }, (_, index) =>
        page([], { hasNextPage: true, endCursor: `cursor-${index + 1}` }),
      ),
    );

    await expect(pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No product with at least 2 variants available for sale: the 5-page limit was reached (50 products per page).",
    });
    expect(requests).toHaveLength(PAGE_LIMIT);
  });

  it("throws on a bad shape", async () => {
    const { variants: _dropped, ...withoutVariants } = choosable("board");
    stubFetch([page([withoutVariants])]);

    await expect(pinNonDefaultVariant(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Invalid response data: products.nodes.0.variants: ",
    );
  });
});

/** A `cartCreate` answer: one line of `variantId` with `quantity`, and `userErrors`. */
function cart(
  variantId: string,
  quantity: number,
  userErrors: Array<{ code: string | null; message: string }> = [],
) {
  return {
    body: {
      data: {
        cartCreate: {
          cart: { lines: { nodes: [{ quantity, merchandise: { id: variantId } }] } },
          userErrors,
        },
      },
    },
  };
}

const variantOf = (handle: string) => `gid://shopify/ProductVariant/${handle}`;

describe("pinVariantWithTwoUnits", () => {
  it("pins the first eligible variant after one tokenless cartCreate with 2 units, the context, and no cart ID or checkout URL", async () => {
    const requests = stubFetch([
      page([product("sold-out", { id: "v1", availableForSale: false }), available("board")]),
      cart(variantOf("board"), 2),
    ]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "pinned",
      pinned: {
        productHandle: "board",
        productTitle: "Title board",
        variantId: variantOf("board"),
        selectedOptions: [{ name: "Size", value: "M" }],
      },
    });
    // The same catalog query as pinVariant, then one cartCreate.
    expect(requests).toHaveLength(2);
    expect(requests[0]?.query).toContain("query AgenticE2ECatalog(");
    const [, check] = requests;
    expect(check?.url).toMatch(/^https:\/\/shop\.example\/api\/[^/]+\/graphql\.json$/);
    expect(check?.query).toMatch(/^mutation AgenticE2EStockCheck\(/);
    expect(check?.query).toContain(
      "@inContext(country: $storefrontCountry, language: $storefrontLanguage)",
    );
    expect(check?.query).toContain("userErrors { code message }");
    expect(check?.query).not.toMatch(/checkoutUrl|cart \{ id/);
    expect(check?.variables).toEqual({
      lines: [{ merchandiseId: variantOf("board"), quantity: 2 }],
      storefrontCountry: "CA",
      storefrontLanguage: "FR",
    });
    expect(check?.headers.has("x-shopify-storefront-access-token")).toBe(false);
    expect(check?.headers.has("shopify-storefront-private-token")).toBe(false);
  });

  it.each([
    {
      // Over stock: a lower quantity and no userErrors (a warning only).
      case: "fewer units, with no user errors",
      answer: cart(variantOf("first"), 1),
    },
    {
      case: "cart user errors",
      answer: cart(variantOf("first"), 2, [{ code: "INVALID", message: "No" }]),
    },
    {
      case: "a line of another variant",
      answer: cart(variantOf("other"), 2),
    },
    {
      case: "no cart",
      answer: { body: { data: { cartCreate: { cart: null, userErrors: [] } } } },
    },
  ])("rejects a candidate for $case and tries the next one", async ({ answer }) => {
    stubFetch([
      page([available("first"), available("second")]),
      answer,
      cart(variantOf("second"), 2),
    ]);

    const pin = await pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal);

    expect(pin.status === "pinned" && pin.pinned.productHandle).toBe("second");
  });

  it("follows the pagination cursor, and counts the checks over pages", async () => {
    const requests = stubFetch([
      page([available("a"), available("b")], { hasNextPage: true, endCursor: "cursor-1" }),
      cart(variantOf("a"), 1),
      cart(variantOf("b"), 1),
      page([available("c")]),
      cart(variantOf("c"), 1),
    ]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No variant could be added to a cart with 2 units (3 eligible variants checked): the catalog was searched to the end.",
    });
    expect(requests[3]?.variables).toMatchObject({ after: "cursor-1" });
  });

  it("skips with the count after the check limit, and reads no further page", async () => {
    const handles = ["a", "b", "c", "d", "e", "f"];
    const requests = stubFetch([
      page(handles.map(available), { hasNextPage: true, endCursor: "cursor-1" }),
      ...handles.slice(0, STOCK_CHECK_LIMIT).map((handle) => cart(variantOf(handle), 1)),
    ]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No variant could be added to a cart with 2 units (5 eligible variants checked): the 5-variant check limit was reached.",
    });
    // One catalog page and 5 checks.
    expect(requests).toHaveLength(1 + STOCK_CHECK_LIMIT);
  });

  it("says 1 variant when one was checked", async () => {
    stubFetch([page([available("a")]), cart(variantOf("a"), 1)]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No variant could be added to a cart with 2 units (1 eligible variant checked): the catalog was searched to the end.",
    });
  });

  it("skips with the pinVariant reason, and sends no cartCreate, when no variant is eligible", async () => {
    const requests = stubFetch([
      page([product("sold-out", { id: "v1", availableForSale: false })]),
    ]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason: "No eligible variant: the catalog was searched to the end.",
    });
    expect(requests).toHaveLength(1);
  });

  it("passes the caller's signal to the stock check, and sends no further cartCreate after an abort", async () => {
    const interrupt = new AbortController();
    // The first stock check gets no answer until its signal aborts.
    const requests = stubFetch([
      page([available("a"), available("b")]),
      { pending: true },
      cart(variantOf("b"), 2),
    ]);

    const pinning = pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, interrupt.signal);
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    const [, check] = requests;
    expect(check?.query).toMatch(/^mutation AgenticE2EStockCheck\(/);
    expect(check?.signal?.aborted).toBe(false);
    interrupt.abort();

    // The request in flight gets the abort, the pin rejects, and no second cartCreate is sent.
    expect(check?.signal?.aborted).toBe(true);
    await expect(pinning).rejects.toMatchObject({ name: "AbortError" });
    expect(requests).toHaveLength(2);
  });

  it("throws on a bad cartCreate shape", async () => {
    stubFetch([page([available("board")]), { body: { data: { cartCreate: null } } }]);

    await expect(pinVariantWithTwoUnits(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Invalid response data: cartCreate: ",
    );
  });
});

describe("productUrl", () => {
  it.each([
    ["https://shop.example/?q=1#top", "https://shop.example/products/board"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:3000/products/board"],
  ])("builds the product URL for %s", (input, expected) => {
    expect(productUrl(new URL(input), "board").href).toBe(expected);
  });

  it("encodes the handle", () => {
    expect(productUrl(new URL("https://shop.example"), "a/b c").href).toBe(
      "https://shop.example/products/a%2Fb%20c",
    );
  });
});
