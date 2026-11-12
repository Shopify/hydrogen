import { afterEach, describe, expect, it, vi } from "vitest";

import {
  findVariantChoice,
  PAGE_LIMIT,
  pinOtherVariant,
  pinVariant,
  productUrl,
  type VariantChoice,
} from "./catalog.ts";
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

type ChoiceVariant = { id: string; availableForSale: boolean };

/** A product for the variant choice query. */
function choiceProduct(handle: string, variants: ChoiceVariant[], requiresSellingPlan = false) {
  return {
    title: `Title ${handle}`,
    handle,
    requiresSellingPlan,
    variants: {
      nodes: variants.map((variant) => ({
        ...variant,
        selectedOptions: [{ name: "Size", value: `size-${variant.id}` }],
      })),
    },
  };
}

/** Two available variants: `<handle>-1`, then `<handle>-2`. */
function choosable(handle: string) {
  return choiceProduct(handle, [
    { id: `${handle}-1`, availableForSale: true },
    { id: `${handle}-2`, availableForSale: true },
  ]);
}

function candidate(id: string) {
  return { id, selectedOptions: [{ name: "Size", value: `size-${id}` }] };
}

describe("findVariantChoice", () => {
  it("sends first, after, variants, and the discovered context with an explicit @inContext", async () => {
    const requests = stubFetch([page([choosable("board")])]);

    await findVariantChoice(STOREFRONT_URL, CA_FR, signal);

    expect(requests[0]?.url).toMatch(/^https:\/\/shop\.example\/api\/[^/]+\/graphql\.json$/);
    expect(requests[0]?.query).toContain("query AgenticE2EVariantChoice(");
    expect(requests[0]?.query).toContain(
      "@inContext(country: $storefrontCountry, language: $storefrontLanguage)",
    );
    expect(requests[0]?.query).toContain("variants(first: $variants)");
    // The page, not the API default, tells which variant is selected first.
    expect(requests[0]?.query).not.toContain("selectedOrFirstAvailableVariant");
    expect(requests[0]?.variables).toEqual({
      first: 50,
      after: null,
      variants: 10,
      storefrontCountry: "CA",
      storefrontLanguage: "FR",
    });
  });

  it("returns the available variants as candidates, in API order, and every examined ID", async () => {
    stubFetch([
      page([
        choiceProduct("board", [
          { id: "v1", availableForSale: true },
          { id: "v2", availableForSale: false },
          { id: "v3", availableForSale: true },
          { id: "v4", availableForSale: true },
        ]),
      ]),
    ]);

    await expect(findVariantChoice(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "found",
      product: {
        productHandle: "board",
        productTitle: "Title board",
        variantIds: ["v1", "v2", "v3", "v4"],
        candidates: [candidate("v1"), candidate("v3"), candidate("v4")],
      },
    });
  });

  it("passes over ineligible products and returns the next eligible one", async () => {
    stubFetch([
      page([
        choiceProduct("one-available", [
          { id: "a1", availableForSale: true },
          { id: "a2", availableForSale: false },
        ]),
        choiceProduct(
          "subscription",
          [
            { id: "s1", availableForSale: true },
            { id: "s2", availableForSale: true },
          ],
          true,
        ),
        choosable("first"),
        choosable("second"),
      ]),
    ]);

    const search = await findVariantChoice(STOREFRONT_URL, CA_FR, signal);

    expect(search.status === "found" && search.product.productHandle).toBe("first");
  });

  it.each([
    {
      case: "only one available variant",
      product: choiceProduct("board", [
        { id: "v1", availableForSale: true },
        { id: "v2", availableForSale: false },
      ]),
    },
    {
      case: "a selling plan requirement",
      product: choiceProduct(
        "board",
        [
          { id: "v1", availableForSale: true },
          { id: "v2", availableForSale: true },
        ],
        true,
      ),
    },
  ])("skips a product with $case", async ({ product: candidateProduct }) => {
    stubFetch([page([candidateProduct])]);

    await expect(findVariantChoice(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No product with at least 2 variants available for sale: the catalog was searched to the end.",
    });
  });

  it("follows the pagination cursor and keeps the variables on every page", async () => {
    const requests = stubFetch([
      page([choiceProduct("single", [{ id: "v1", availableForSale: true }])], {
        hasNextPage: true,
        endCursor: "cursor-1",
      }),
      page([choosable("later")]),
    ]);

    const search = await findVariantChoice(STOREFRONT_URL, CA_FR, signal);

    expect(search.status === "found" && search.product.productHandle).toBe("later");
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

    await expect(findVariantChoice(STOREFRONT_URL, CA_FR, signal)).resolves.toEqual({
      status: "skipped",
      reason:
        "No product with at least 2 variants available for sale: the 5-page limit was reached (50 products per page).",
    });
    expect(requests).toHaveLength(PAGE_LIMIT);
  });

  it("throws when pagination returns no cursor", async () => {
    stubFetch([page([], { hasNextPage: true, endCursor: null })]);

    await expect(findVariantChoice(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Catalog pagination returned no cursor after page 1.",
    );
  });

  it("throws on a bad shape", async () => {
    const { variants: _dropped, ...withoutVariants } = choosable("board");
    stubFetch([page([withoutVariants])]);

    await expect(findVariantChoice(STOREFRONT_URL, CA_FR, signal)).rejects.toThrow(
      "Invalid response data: products.nodes.0.variants: ",
    );
  });
});

describe("pinOtherVariant", () => {
  const board: VariantChoice = {
    productHandle: "board",
    productTitle: "Board",
    variantIds: ["v1", "v2", "v3", "v4"],
    candidates: [candidate("v1"), candidate("v3"), candidate("v4")],
  };

  it.each([
    { selected: "v1", pinned: "v3" },
    { selected: "v3", pinned: "v1" },
    { selected: "v4", pinned: "v1" },
    // An unavailable variant: every candidate differs, so the first one is pinned.
    { selected: "v2", pinned: "v1" },
  ])("pins $pinned when the page selects $selected", ({ selected, pinned }) => {
    expect(pinOtherVariant(board, selected)).toEqual({
      productHandle: "board",
      productTitle: "Board",
      variantId: pinned,
      selectedOptions: [{ name: "Size", value: `size-${pinned}` }],
    });
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
