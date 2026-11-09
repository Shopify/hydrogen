import assert from "node:assert/strict";

import { describe, it } from "vitest";
import { ZodError } from "zod";

import { fakeFetch, type FakeRequest, sfapi, US_EN } from "../scenarios/test-helpers.ts";
import { discoverPinnedVariant } from "./catalog.ts";
import { createStorefrontApi } from "./storefront.ts";

const CA_FR = { country: "CA", language: "FR" };

const signal = new AbortController().signal;

type FakeVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
};

function fakeVariant(id: number, available = true): FakeVariant {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: "Default Title",
    availableForSale: available,
    selectedOptions: [{ name: "Title", value: "Default Title" }],
  };
}

function product(
  id: number,
  options: { sellingPlan?: boolean; variant?: FakeVariant | null } = {},
) {
  return {
    id: `gid://shopify/Product/${id}`,
    title: `Product ${id}`,
    handle: `product-${id}`,
    requiresSellingPlan: options.sellingPlan ?? false,
    selectedOrFirstAvailableVariant:
      options.variant === undefined ? fakeVariant(id) : options.variant,
  };
}

const VARIANT_SELECTION =
  /\bselectedOrFirstAvailableVariant\s*\{\s*id\s+title\s+availableForSale\s+selectedOptions\s*\{\s*name\s+value\s*\}\s*\}/;

/**
 * Answers like the Storefront API would for a query that selects the product's
 * `selectedOrFirstAvailableVariant` without arguments: any other variant
 * selection (such as the `variants` connection) gets a GraphQL error, so a
 * query that does not ask for these fields cannot pass with these fixtures.
 */
function respond(data: Record<string, unknown>) {
  return (request: FakeRequest) =>
    VARIANT_SELECTION.test(request.query) && !/\bvariants\b/.test(request.query)
      ? sfapi(data)
      : { errors: [{ message: "Query does not select selectedOrFirstAvailableVariant." }] };
}

function page(
  nodes: unknown[],
  hasNextPage: boolean,
  endCursor: string | null = hasNextPage ? "cursor" : null,
) {
  return { body: respond({ products: { pageInfo: { hasNextPage, endCursor }, nodes } }) };
}

describe("discoverPinnedVariant", () => {
  it("skips selling-plan products and unavailable variants across pages", async () => {
    const { fetch, requests } = fakeFetch([
      page(
        [
          product(1, { sellingPlan: true }),
          // No variant in this context.
          product(2, { variant: null }),
          // The API falls back to the first variant when none is available.
          product(3, { variant: fakeVariant(3, false) }),
        ],
        true,
      ),
      page(
        [
          product(4, {
            variant: {
              id: "gid://shopify/ProductVariant/40",
              title: "Large / Blue",
              availableForSale: true,
              selectedOptions: [
                { name: "Size", value: "Large" },
                { name: "Color", value: "Blue" },
              ],
            },
          }),
          product(5),
        ],
        false,
      ),
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const result = await discoverPinnedVariant(api, { maxPages: 5, context: CA_FR, signal });

    assert.deepEqual(result, {
      status: "found",
      pagesScanned: 2,
      variant: {
        variantId: "gid://shopify/ProductVariant/40",
        variantTitle: "Large / Blue",
        productId: "gid://shopify/Product/4",
        productTitle: "Product 4",
        productHandle: "product-4",
        selectedOptions: [
          { name: "Size", value: "Large" },
          { name: "Color", value: "Blue" },
        ],
      },
    });
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.variables.after, null);
    assert.equal(requests[1]?.variables.after, "cursor");
    // Every page query carries the full explicit context and keeps product ID order.
    for (const request of requests) {
      assert.equal(request.variables.country, "CA");
      assert.equal(request.variables.language, "FR");
      assert.match(request.query, /@inContext\(country: \$country, language: \$language\)/);
      assert.match(request.query, /sortKey: ID/);
    }
  });

  it("returns empty only when the catalog was fully searched", async () => {
    const { fetch } = fakeFetch([page([product(1, { sellingPlan: true })], false)]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    assert.deepEqual(await discoverPinnedVariant(api, { maxPages: 5, context: US_EN, signal }), {
      status: "empty",
      pagesScanned: 1,
    });
  });

  it("returns incomplete when the page cap is exhausted", async () => {
    const { fetch } = fakeFetch([
      page([product(1, { variant: fakeVariant(1, false) })], true),
      page([], true),
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const result = await discoverPinnedVariant(api, { maxPages: 2, context: US_EN, signal });
    assert.equal(result.status, "incomplete");
  });

  it("returns empty when every product has a null or unavailable variant", async () => {
    const { fetch } = fakeFetch([
      page([product(1, { variant: null }), product(2, { variant: fakeVariant(2, false) })], false),
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    assert.deepEqual(await discoverPinnedVariant(api, { maxPages: 2, context: US_EN, signal }), {
      status: "empty",
      pagesScanned: 1,
    });
  });

  it("rejects a response without the selectedOrFirstAvailableVariant field", async () => {
    const item: Record<string, unknown> = product(1);
    delete item.selectedOrFirstAvailableVariant;
    const { fetch } = fakeFetch([page([item], false)]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    await assert.rejects(
      discoverPinnedVariant(api, { maxPages: 1, context: US_EN, signal }),
      (error) =>
        error instanceof ZodError &&
        error.issues.some((issue) => issue.path.includes("selectedOrFirstAvailableVariant")),
    );
  });

  it("rejects malformed catalog fields with the Zod issue path", async () => {
    const cases = [
      ["value", "option", { value: undefined }],
      ["availableForSale", "variant", { availableForSale: "true" }],
      ["endCursor", "productsPageInfo", { endCursor: 1 }],
    ] as const;
    for (const [path, target, invalid] of cases) {
      const item = product(1);
      const variant = item.selectedOrFirstAvailableVariant;
      assert.ok(variant);
      const option = variant.selectedOptions[0];
      assert.ok(option);
      const productsPageInfo = { hasNextPage: false, endCursor: null };
      const targets = {
        option,
        variant,
        productsPageInfo,
      };
      Object.assign(targets[target], invalid);
      const products = { pageInfo: productsPageInfo, nodes: [item] };
      const { fetch } = fakeFetch([{ body: respond({ products }) }]);
      const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
      await assert.rejects(
        discoverPinnedVariant(api, { maxPages: 1, context: US_EN, signal }),
        (error) =>
          error instanceof ZodError && error.issues.some((issue) => issue.path.includes(path)),
        path,
      );
    }
  });

  it("accepts extra fields and treats null or omitted cursors as missing", async () => {
    for (const endCursor of [null, undefined]) {
      const item = product(1, { variant: fakeVariant(1, false) });
      Object.assign(item, { extra: true });
      Object.assign(item.selectedOrFirstAvailableVariant ?? {}, { extra: true });
      const products = { pageInfo: { hasNextPage: true, endCursor }, nodes: [item] };
      const { fetch } = fakeFetch([{ body: respond({ products, extra: true }) }]);
      const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
      assert.deepEqual(await discoverPinnedVariant(api, { maxPages: 1, context: US_EN, signal }), {
        status: "incomplete",
        pagesScanned: 1,
        reason: "Catalog pagination returned no cursor.",
      });
    }
  });
});
