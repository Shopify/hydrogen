// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { SIGNIFIER_TEST_IDS, signifier, signifierSelector } from "./signifiers";

describe("signifiers", () => {
  it("names every signifier in the schema", () => {
    expect(SIGNIFIER_TEST_IDS).toEqual([
      "product-add-to-cart",
      "product-option-value",
      "product-quantity",
    ]);
  });

  it("converts camelCase state keys to kebab-case attributes and values to strings", () => {
    expect(signifier("product-add-to-cart", { variantId: "gid://v/1", available: true })).toEqual({
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "gid://v/1",
      "data-shopify-available": "true",
    });
    expect(signifier("product-add-to-cart", { variantId: "", available: false })).toEqual({
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "",
      "data-shopify-available": "false",
    });
  });

  it("converts number values to strings", () => {
    const state = { variantId: 42, available: true } as unknown as {
      variantId: string;
      available: boolean;
    };

    expect(signifier("product-add-to-cart", state)["data-shopify-variant-id"]).toBe("42");
    expect(signifierSelector("product-add-to-cart", state)).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="42"][data-shopify-available="true"]',
    );
  });

  it("only emits attributes for schema state keys", () => {
    const state = { variantId: "v", available: true, extra: "x" };

    expect(Object.keys(signifier("product-add-to-cart", state))).toEqual([
      "data-shopify-testid",
      "data-shopify-variant-id",
      "data-shopify-available",
    ]);
  });

  it("keeps namespace-based state separate from test IDs", () => {
    const attributes = {
      "data-testid": "custom-add-to-cart",
      ...signifier("product-add-to-cart", { variantId: "v", available: true }),
    };

    expect(attributes).toEqual({
      "data-testid": "custom-add-to-cart",
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "v",
      "data-shopify-available": "true",
    });
    expect(attributes).not.toHaveProperty("data-shopify-testid-variant-id");
    expect(attributes).not.toHaveProperty("data-shopify-testid-available");
  });

  it("builds selectors from the name and the given state fields", () => {
    expect(signifierSelector("product-add-to-cart")).toBe(
      '[data-shopify-testid="product-add-to-cart"]',
    );
    expect(signifierSelector("product-add-to-cart", { available: false })).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-available="false"]',
    );
    expect(signifierSelector("product-add-to-cart", { variantId: "v-1", available: true })).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="v-1"][data-shopify-available="true"]',
    );
  });

  it("escapes quotes, backslashes, newlines, and control characters in selector values", () => {
    expect(signifierSelector("product-add-to-cart", { variantId: 'a"b\\c' })).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="a\\"b\\\\c"]',
    );
    expect(signifierSelector("product-add-to-cart", { variantId: "a\nb\rc\td\0e\x7ff" })).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="a\\a b\\d c\\9 d\\0 e\\7f f"]',
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
