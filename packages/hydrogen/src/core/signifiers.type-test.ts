import { describe, expectTypeOf, it } from "vitest";

import {
  SIGNIFIER_ATTRIBUTE,
  SIGNIFIER_NAMES,
  signifier,
  signifierSelector,
  type SignifierAttributes,
  type SignifierStates,
} from "./index";

describe("signifier types", () => {
  it("derives names and state types from the schema", () => {
    expectTypeOf<typeof SIGNIFIER_ATTRIBUTE>().toEqualTypeOf<"data-h3">();
    expectTypeOf(SIGNIFIER_NAMES).toEqualTypeOf<readonly "product-add-to-cart"[]>();
    expectTypeOf<SignifierStates>().toEqualTypeOf<{
      "product-add-to-cart": { variantId: string; available: boolean };
    }>();
  });

  it("returns literal attribute names", () => {
    const attributes = signifier("product-add-to-cart", { variantId: "v", available: true });

    expectTypeOf(attributes).toEqualTypeOf<SignifierAttributes<"product-add-to-cart">>();
    expectTypeOf(attributes["data-h3"]).toEqualTypeOf<"product-add-to-cart">();
    expectTypeOf(attributes["data-h3-variant-id"]).toEqualTypeOf<string>();
    expectTypeOf(attributes["data-h3-available"]).toEqualTypeOf<string>();
    expectTypeOf<keyof SignifierAttributes<"product-add-to-cart">>().toEqualTypeOf<
      "data-h3" | "data-h3-variant-id" | "data-h3-available"
    >();
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
