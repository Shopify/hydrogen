// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { SIGNIFIER_ATTRIBUTE, SIGNIFIER_NAMES, signifier, signifierSelector } from "./signifiers";

describe("signifiers", () => {
  it("names every signifier in the schema", () => {
    expect(SIGNIFIER_ATTRIBUTE).toBe("data-h3");
    expect(SIGNIFIER_NAMES).toEqual(["product-add-to-cart"]);
  });

  it("converts camelCase state keys to kebab-case attributes and values to strings", () => {
    expect(signifier("product-add-to-cart", { variantId: "gid://v/1", available: true })).toEqual({
      "data-h3": "product-add-to-cart",
      "data-h3-variant-id": "gid://v/1",
      "data-h3-available": "true",
    });
    expect(signifier("product-add-to-cart", { variantId: "", available: false })).toEqual({
      "data-h3": "product-add-to-cart",
      "data-h3-variant-id": "",
      "data-h3-available": "false",
    });
  });

  it("converts number values to strings", () => {
    const state = { variantId: 42, available: true } as unknown as {
      variantId: string;
      available: boolean;
    };

    expect(signifier("product-add-to-cart", state)["data-h3-variant-id"]).toBe("42");
    expect(signifierSelector("product-add-to-cart", state)).toBe(
      '[data-h3="product-add-to-cart"][data-h3-variant-id="42"][data-h3-available="true"]',
    );
  });

  it("only emits attributes for schema state keys", () => {
    const state = { variantId: "v", available: true, extra: "x" };

    expect(Object.keys(signifier("product-add-to-cart", state))).toEqual([
      "data-h3",
      "data-h3-variant-id",
      "data-h3-available",
    ]);
  });

  it("builds selectors from the name and the given state fields", () => {
    expect(signifierSelector("product-add-to-cart")).toBe('[data-h3="product-add-to-cart"]');
    expect(signifierSelector("product-add-to-cart", { available: false })).toBe(
      '[data-h3="product-add-to-cart"][data-h3-available="false"]',
    );
    expect(signifierSelector("product-add-to-cart", { variantId: "v-1", available: true })).toBe(
      '[data-h3="product-add-to-cart"][data-h3-variant-id="v-1"][data-h3-available="true"]',
    );
  });

  it("escapes quotes, backslashes, newlines, and control characters in selector values", () => {
    expect(signifierSelector("product-add-to-cart", { variantId: 'a"b\\c' })).toBe(
      '[data-h3="product-add-to-cart"][data-h3-variant-id="a\\"b\\\\c"]',
    );
    expect(signifierSelector("product-add-to-cart", { variantId: "a\nb\rc\td\0e\x7ff" })).toBe(
      '[data-h3="product-add-to-cart"][data-h3-variant-id="a\\a b\\d c\\9 d\\0 e\\7f f"]',
    );
  });

  it("selects the element that carries the built attributes", () => {
    const variantId = "gid://shopify/ProductVariant/1";
    const button = document.createElement("button");
    for (const [name, value] of Object.entries(
      signifier("product-add-to-cart", { variantId, available: true }),
    )) {
      button.setAttribute(name, value);
    }
    document.body.append(button);

    expect(document.querySelector(signifierSelector("product-add-to-cart", { variantId }))).toBe(
      button,
    );
    expect(
      document.querySelector(signifierSelector("product-add-to-cart", { available: false })),
    ).toBeNull();
    button.remove();
  });
});
