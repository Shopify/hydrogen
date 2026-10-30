import { expectTypeOf, it } from "vitest";

import type {
  UpdateCartPayload,
  UpdateCartOptions,
  UpdateCartResult,
} from "../../../vendor/standard-actions";
import type { CartTransport, CartTransportUpdateResult, CreateCartStoreOptions, CartData, CartStore } from "../index";

it("accepts mixed-currency and Standard Actions transports without casts", () => {
  const cart: CartData = {
    id: "aggregate", totalQuantity: 0, attributes: [], discountCodes: [],
    lines: { nodes: [] },
    groups: ["USD", "JPY"].map((currencyCode) => {
      const money = { amount: "0", currencyCode };
      return { seller: { shop: currencyCode }, cartId: currencyCode, currencyCode,
        cost: { totalAmount: money, subtotalAmount: money, checkoutChargeAmount: money }, discountCodes: [] };
    }),
  };
  const mixed: CartTransport = {
    getCart: async () => ({ cart }),
    updateCart: async () => ({ cart, userErrors: [], warnings: [], detail: {} }),
  };
  expectTypeOf(mixed).toMatchTypeOf<CartTransport>();
  expectTypeOf<(payload: UpdateCartPayload, options?: UpdateCartOptions) => Promise<UpdateCartResult>>()
    .toExtend<CartTransport["updateCart"]>();
});

it("returns transport results from every programmatic cart action", () => {
  type Action = "addLines" | "updateLines" | "removeLines" | "setNote" | "setDiscountCodes" | "setAttributes";
  expectTypeOf<ReturnType<CartStore[Action]>>().toEqualTypeOf<Promise<CartTransportUpdateResult | undefined>>();
});

it("exports the transport contract", () => {
  expectTypeOf<CreateCartStoreOptions["transport"]>().toEqualTypeOf<CartTransport | undefined>();
  expectTypeOf<CartTransport["updateCart"]>().toEqualTypeOf<
    (payload: UpdateCartPayload, options?: UpdateCartOptions) => Promise<CartTransportUpdateResult>
  >();
});
