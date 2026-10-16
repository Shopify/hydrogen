import { describe, expectTypeOf, it } from "vitest";

import { createCartFormRegister, getCartLineAttributes } from "../index";
import { EMPTY_CART_STATE } from "./state";

describe("cart form signifier types", () => {
  it("keeps literal keys and values for every quantity overload and line action", () => {
    const register = createCartFormRegister();
    expectTypeOf(register("quantity", { value: 1 })["data-shopify-testid"]).toEqualTypeOf<"cart-line-quantity">();
    expectTypeOf(register("quantity", { value: "1", interactive: false })["data-shopify-testid"]).toEqualTypeOf<"cart-line-quantity">();
    expectTypeOf(register("quantity", { value: 1, interactive: true })["data-shopify-testid"]).toEqualTypeOf<"cart-line-quantity">();
    expectTypeOf(register("quantity", { defaultValue: 1 })["data-shopify-testid"]).toEqualTypeOf<"cart-line-quantity">();
    expectTypeOf(register("increase")["data-shopify-testid"]).toEqualTypeOf<"cart-line-increase">();
    expectTypeOf(register("decrease")["data-shopify-testid"]).toEqualTypeOf<"cart-line-decrease">();
    expectTypeOf(register("remove")["data-shopify-testid"]).toEqualTypeOf<"cart-line-remove">();
    expectTypeOf(register("set")).not.toHaveProperty("data-shopify-testid");
    expectTypeOf(register("lineId", { value: "line-1" })).not.toHaveProperty("data-shopify-testid");
  });

  it("exports the pure getter with literal attributes and no interaction props", () => {
    const attributes = getCartLineAttributes({ id: "line", quantity: 1 }, EMPTY_CART_STATE);
    expectTypeOf(attributes["data-shopify-testid"]).toEqualTypeOf<"cart-line">();
    expectTypeOf(attributes["data-shopify-merchandise-id"]).toEqualTypeOf<string>();
    expectTypeOf(attributes["data-shopify-quantity"]).toEqualTypeOf<string>();
    expectTypeOf(attributes["data-shopify-pending"]).toEqualTypeOf<string>();
    expectTypeOf(attributes["aria-busy"]).toEqualTypeOf<"true" | undefined>();
    expectTypeOf<Extract<keyof typeof attributes, "disabled" | "onClick" | "href">>().toEqualTypeOf<never>();
  });
});
