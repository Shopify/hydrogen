import { describe, expectTypeOf, it } from "vitest";

import { CART_TRANSACTION_TYPES } from "./transaction-cart-store";

describe("cart transaction payloads", () => {
  it("keeps batch cardinality in the transaction registry", () => {
    expectTypeOf(CART_TRANSACTION_TYPES.add_to_cart.payload).toEqualTypeOf<{
      lines: Array<{
        merchandiseId: string;
        quantity: number;
        sellingPlanId?: string;
      }>;
      products: Array<Record<string, unknown>>;
      eventDetail?: Record<string, unknown>;
    }>();

    expectTypeOf(CART_TRANSACTION_TYPES.change_line_quantity.payload).toEqualTypeOf<{
      lineId: string;
      quantity: number;
    }>();
  });

  it("prevents absolute line batches at the type boundary", () => {
    const payload = CART_TRANSACTION_TYPES.change_line_quantity.payload;
    expectTypeOf(payload).not.toHaveProperty("lines");

    // A keyed batch would make changing one overlapping line abort unrelated
    // lines in the same transport, so this transaction accepts one line only.
    // @ts-expect-error - absolute line transactions cannot contain a batch
    payload.lines = [{ lineId: "line-a", quantity: 2 }];
  });
});
