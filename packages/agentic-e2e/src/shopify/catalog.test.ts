import { afterEach, describe, expect, it, vi } from "vitest";

import { PAGE_LIMIT, pinVariant, productUrl } from "./catalog.ts";
import { fakeFetch } from "./fake-fetch.ts";
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

function stubFetch(responses: Array<{ status?: number; body: unknown }>) {
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
