import assert from "node:assert/strict";

import { describe, it } from "vitest";
import { ZodError } from "zod";

import { fakeFetch, sfapi, US_EN } from "../scenarios/test-helpers.ts";
import { discoverPinnedVariant } from "./catalog.ts";
import { createStorefrontApi } from "./storefront.ts";

const CA_FR = { country: "CA", language: "FR" };

const signal = new AbortController().signal;

function product(
  id: number,
  options: { sellingPlan?: boolean; available?: boolean; truncated?: boolean } = {},
) {
  return {
    id: `gid://shopify/Product/${id}`,
    title: `Product ${id}`,
    handle: `product-${id}`,
    requiresSellingPlan: options.sellingPlan ?? false,
    variants: {
      pageInfo: { hasNextPage: options.truncated ?? false },
      nodes: [
        {
          id: `gid://shopify/ProductVariant/${id}`,
          title: "Default Title",
          availableForSale: options.available ?? true,
          selectedOptions: [{ name: "Title", value: "Default Title" }],
        },
      ],
    },
  };
}

function page(
  nodes: unknown[],
  hasNextPage: boolean,
  endCursor: string | null = hasNextPage ? "cursor" : null,
) {
  return { body: sfapi({ products: { pageInfo: { hasNextPage, endCursor }, nodes } }) };
}

describe("discoverPinnedVariant", () => {
  it("skips selling-plan products and unavailable variants across pages", async () => {
    const { fetch, requests } = fakeFetch([
      page([product(1, { sellingPlan: true }), product(2, { available: false })], true),
      page([product(3)], false),
    ]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const result = await discoverPinnedVariant(api, { maxPages: 5, context: CA_FR, signal });

    assert.equal(result.status, "found");
    assert.equal(
      result.status === "found" && result.variant.variantId,
      "gid://shopify/ProductVariant/3",
    );
    assert.equal(requests[1]?.variables.after, "cursor");
    // Every page query carries the full explicit context.
    for (const request of requests) {
      assert.equal(request.variables.country, "CA");
      assert.equal(request.variables.language, "FR");
      assert.match(request.query, /@inContext\(country: \$country, language: \$language\)/);
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
    const { fetch } = fakeFetch([page([product(1, { available: false })], true), page([], true)]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const result = await discoverPinnedVariant(api, { maxPages: 2, context: US_EN, signal });
    assert.equal(result.status, "incomplete");
  });

  it("returns incomplete when product variants were truncated", async () => {
    const { fetch } = fakeFetch([page([product(1, { available: false, truncated: true })], false)]);
    const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
    const result = await discoverPinnedVariant(api, { maxPages: 2, context: US_EN, signal });
    assert.equal(result.status, "incomplete");
  });

  it("rejects malformed catalog fields with the Zod issue path", async () => {
    const cases = [
      ["value", "option", { value: undefined }],
      ["availableForSale", "variant", { availableForSale: "true" }],
      ["endCursor", "productsPageInfo", { endCursor: 1 }],
    ] as const;
    for (const [path, target, invalid] of cases) {
      const item = product(1);
      const variant = item.variants.nodes[0];
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
      const { fetch } = fakeFetch([{ body: sfapi({ products }) }]);
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
      const item = product(1, { available: false });
      Object.assign(item, { extra: true });
      Object.assign(item.variants.pageInfo, { endCursor });
      const products = { pageInfo: { hasNextPage: true, endCursor }, nodes: [item] };
      const { fetch } = fakeFetch([{ body: sfapi({ products, extra: true }) }]);
      const api = createStorefrontApi({ origin: "https://shop.example.com", fetch });
      assert.deepEqual(await discoverPinnedVariant(api, { maxPages: 1, context: US_EN, signal }), {
        status: "incomplete",
        pagesScanned: 1,
        reason: "Catalog pagination returned no cursor.",
      });
    }
  });
});
