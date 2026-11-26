import { describe, expect, expectTypeOf, it } from "vitest";

import {
  getProductViewAttributes,
  type ProductViewOptions,
  type ProductViewProduct,
} from "./product-view";
import type { ProductInput } from "./state";

const variant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Red / Small",
  availableForSale: true,
  price: { amount: "10.0", currencyCode: "USD", extra: "drop" },
  compareAtPrice: { amount: "12.0", currencyCode: "USD" },
  sku: "SKU-1",
  selectedOptions: [
    { name: "Color", value: "Red" },
    { name: "Size", value: "Small" },
  ],
};

const product = {
  id: "gid://shopify/Product/1",
  title: "Shirt",
  handle: "shirt",
  vendor: "Hydrogen",
  options: [],
  adjacentVariants: [],
  selectedOrFirstAvailableVariant: variant,
};

function payload(options: ProductViewOptions) {
  return JSON.parse(getProductViewAttributes(options)["view-event-payload"]);
}

describe("getProductViewAttributes", () => {
  it("accepts the product form input", () => {
    expectTypeOf<ProductInput>().toMatchTypeOf<ProductViewProduct>();
  });

  it("maps the selected variant for the product page and drops extra fields", () => {
    expect(payload({ product, context: "page" })).toEqual({
      context: "page",
      selectedOptions: variant.selectedOptions,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        selectedVariant: {
          id: variant.id,
          title: variant.title,
          availableForSale: true,
          price: { amount: "10.0", currencyCode: "USD" },
          selectedOptions: variant.selectedOptions,
        },
      },
    });
  });

  it("keeps the variant for dialogs", () => {
    expect(payload({ product, context: "dialog" }).product.selectedVariant.id).toBe(variant.id);
  });

  it.each(["collection", "search", "recommendation"] as const)(
    "sends no variant for %s cards",
    (context) => {
      expect(
        payload({
          product: { id: product.id, title: product.title, handle: product.handle },
          context,
        }),
      ).toEqual({
        context,
        selectedOptions: [],
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          selectedVariant: null,
        },
      });
    },
  );

  it("sends no variant when the product has none", () => {
    const { selectedOptions, product: payloadProduct } = payload({
      product: { ...product, selectedOrFirstAvailableVariant: null },
      context: "page",
    });
    expect(selectedOptions).toEqual([]);
    expect(payloadProduct.selectedVariant).toBeNull();
  });

  it.each([
    ["page", "connect"],
    ["dialog", "dialog"],
    ["collection", "intersect"],
    ["search", "intersect"],
    ["recommendation", "intersect"],
  ] as const)("maps the %s context to the %s trigger", (context, trigger) => {
    expect(getProductViewAttributes({ product, context })["view-event-trigger"]).toBe(trigger);
  });

  it("uses the product ID as the view event key", () => {
    expect(getProductViewAttributes({ product, context: "page" })["view-event-key"]).toBe(
      product.id,
    );
  });
});
