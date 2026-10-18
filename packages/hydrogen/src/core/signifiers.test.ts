// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { SIGNIFIER_TEST_IDS, signifier, signifierSelector } from "./signifiers";

describe("signifiers", () => {
  it("names every signifier in the schema", () => {
    expect(SIGNIFIER_TEST_IDS).toEqual(["product-add-to-cart"]);
  });

  it("converts camelCase state keys to kebab-case attributes and values to strings", () => {
    expect(
      signifier("product-add-to-cart", { variantId: "gid://v/1", availableForSale: true }),
    ).toEqual({
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "gid://v/1",
      "data-shopify-available-for-sale": "true",
    });
    expect(signifier("product-add-to-cart", { variantId: "", availableForSale: false })).toEqual({
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "",
      "data-shopify-available-for-sale": "false",
    });
  });

  it("converts number values to strings", () => {
    const state = { variantId: 42, availableForSale: true } as unknown as {
      variantId: string;
      availableForSale: boolean;
    };

    expect(signifier("product-add-to-cart", state)["data-shopify-variant-id"]).toBe("42");
    expect(signifierSelector("product-add-to-cart", state)).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="42"][data-shopify-available-for-sale="true"]',
    );
  });

  it("only emits attributes for schema state keys", () => {
    const state = { variantId: "v", availableForSale: true, extra: "x" };

    expect(Object.keys(signifier("product-add-to-cart", state))).toEqual([
      "data-shopify-testid",
      "data-shopify-variant-id",
      "data-shopify-available-for-sale",
    ]);
  });

  it("keeps namespace-based state separate from test IDs", () => {
    const attributes = {
      "data-testid": "custom-add-to-cart",
      ...signifier("product-add-to-cart", { variantId: "v", availableForSale: true }),
    };

    expect(attributes).toEqual({
      "data-testid": "custom-add-to-cart",
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-variant-id": "v",
      "data-shopify-available-for-sale": "true",
    });
    expect(attributes).not.toHaveProperty("data-shopify-testid-variant-id");
    expect(attributes).not.toHaveProperty("data-shopify-testid-available-for-sale");
  });

  it("builds selectors from the name and the given state fields", () => {
    expect(signifierSelector("product-add-to-cart")).toBe(
      '[data-shopify-testid="product-add-to-cart"]',
    );
    expect(signifierSelector("product-add-to-cart", { availableForSale: false })).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-available-for-sale="false"]',
    );
    expect(
      signifierSelector("product-add-to-cart", { variantId: "", availableForSale: false }),
    ).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id=""][data-shopify-available-for-sale="false"]',
    );
    expect(
      signifierSelector("product-add-to-cart", { variantId: "v-1", availableForSale: true }),
    ).toBe(
      '[data-shopify-testid="product-add-to-cart"][data-shopify-variant-id="v-1"][data-shopify-available-for-sale="true"]',
    );
  });

  it.each([
    ["variantId", { variantId: undefined }],
    ["availableForSale", { availableForSale: undefined }],
  ] as const)("rejects explicitly undefined selector field %s", (field, state) => {
    expect(() => signifierSelector("product-add-to-cart", state)).toThrow(
      new TypeError(`Signifier "product-add-to-cart" field "${field}" is undefined.`),
    );
  });

  it("omits undefined string signifier state fields at runtime", () => {
    const state = { variantId: undefined, availableForSale: false } as unknown as {
      variantId: string;
      availableForSale: boolean;
    };

    expect(signifier("product-add-to-cart", state)).toEqual({
      "data-shopify-testid": "product-add-to-cart",
      "data-shopify-available-for-sale": "false",
    });
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
      signifier("product-add-to-cart", { variantId, availableForSale: true }),
    )) {
      button.setAttribute(name, value);
    }
    document.body.append(button);

    expect(document.querySelector(signifierSelector("product-add-to-cart", { variantId }))).toBe(
      button,
    );
    expect(
      document.querySelector(signifierSelector("product-add-to-cart", { availableForSale: false })),
    ).toBeNull();
    button.remove();
  });
});
