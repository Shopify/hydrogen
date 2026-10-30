import { expectTypeOf, it } from "vitest";
import type { CartData, CartLine, CartSeller, CartGroup, CartCost } from "../index";

it("exports seller groups and optional aggregate totals", () => {
  expectTypeOf<CartData["cost"]>().toEqualTypeOf<CartCost | undefined>();
  expectTypeOf<CartData["groups"]>().toEqualTypeOf<CartGroup[] | undefined>();
  expectTypeOf<CartLine["seller"]>().toEqualTypeOf<CartSeller | undefined>();
  expectTypeOf<CartLine["cartId"]>().toEqualTypeOf<string | undefined>();
  expectTypeOf<CartGroup["cost"]>().toEqualTypeOf<CartCost>();
});
