import { describe, expectTypeOf, it } from "vitest";

import {
  SIGNIFIER_TEST_IDS,
  getProductOptionValueAttributes,
  signifier,
  signifierSelector,
  type SignifierAttributes,
  type SignifierStates,
} from "./index";

describe("signifier types", () => {
  it("derives names and state types from the schema", () => {
    expectTypeOf(SIGNIFIER_TEST_IDS).toEqualTypeOf<readonly ("product-add-to-cart" | "product-option-value" | "product-quantity")[]>();
    expectTypeOf<SignifierStates>().toEqualTypeOf<{
      "product-add-to-cart": { variantId: string; available: boolean };
      "product-option-value": { optionName: string; optionValue: string; selected: boolean };
      "product-quantity": {};
    }>();
  });

  it("omits private and legacy exports", () => {
    expectTypeOf<
      Extract<keyof typeof import("./index"), "SIGNIFIER_ATTRIBUTE" | "SIGNIFIER_NAMES">
    >().toEqualTypeOf<never>();
  });

  it("exports an attribute-only product option getter with literal types", () => {
    const attributes = getProductOptionValueAttributes("Color", { name: "Red", selected: true });
    expectTypeOf(attributes).toEqualTypeOf<SignifierAttributes<"product-option-value">>();
    expectTypeOf(attributes["data-shopify-testid"]).toEqualTypeOf<"product-option-value">();
    expectTypeOf<keyof typeof attributes>().toEqualTypeOf<
      "data-shopify-testid" | "data-shopify-option-name" | "data-shopify-option-value" | "data-shopify-selected"
    >();
    expectTypeOf(signifier("product-quantity", {})).toEqualTypeOf<SignifierAttributes<"product-quantity">>();
    expectTypeOf<keyof SignifierAttributes<"product-quantity">>().toEqualTypeOf<"data-shopify-testid">();
  });

  it("returns literal attribute names", () => {
    const attributes = signifier("product-add-to-cart", { variantId: "v", available: true });

    expectTypeOf(attributes).toEqualTypeOf<SignifierAttributes<"product-add-to-cart">>();
    expectTypeOf(attributes["data-shopify-testid"]).toEqualTypeOf<"product-add-to-cart">();
    expectTypeOf(attributes["data-shopify-variant-id"]).toEqualTypeOf<string>();
    expectTypeOf(attributes["data-shopify-available"]).toEqualTypeOf<string>();
    expectTypeOf<keyof SignifierAttributes<"product-add-to-cart">>().toEqualTypeOf<
      "data-shopify-testid" | "data-shopify-variant-id" | "data-shopify-available"
    >();
    expectTypeOf<
      Extract<keyof typeof attributes, `data-shopify-testid-${string}` | "data-testid">
    >().toEqualTypeOf<never>();
    expectTypeOf(signifierSelector("product-add-to-cart", { available: true })).toEqualTypeOf<string>();
  });

  it("rejects unknown names and invalid state", () => {
    function Consumer() {
    // @ts-expect-error unknown signifier name
    signifier("product-remove", { variantId: "v", available: true });
    // @ts-expect-error state is required
    signifier("product-add-to-cart");
    // @ts-expect-error available is required
    signifier("product-add-to-cart", { variantId: "v" });
    // @ts-expect-error variantId is required
    signifier("product-add-to-cart", { available: true });
    // @ts-expect-error available must be a boolean
    signifier("product-add-to-cart", { variantId: "v", available: "true" });
    // @ts-expect-error variantId must be a string
    signifier("product-add-to-cart", { variantId: 1, available: true });
    // @ts-expect-error extra state fields are rejected
    signifier("product-add-to-cart", { variantId: "v", available: true, extra: 1 });
    // @ts-expect-error unknown signifier name
    signifierSelector("product-remove");
    // @ts-expect-error selector state values keep the schema types
    signifierSelector("product-add-to-cart", { available: "true" });
    // @ts-expect-error selector state rejects extra fields
    signifierSelector("product-add-to-cart", { extra: 1 });
    }

    void Consumer;
  });
});
