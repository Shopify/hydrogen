// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { configureCartEndpoint, createCartStore, resetStandardActionsForTests } from "./cart";
import { EMPTY_CART_DATA, type CartData } from "./state";

const CART: CartData = {
  ...EMPTY_CART_DATA,
  id: "gid://shopify/Cart/123",
  totalQuantity: 2,
  lines: {
    nodes: [
      {
        id: "gid://shopify/CartLine/1",
        quantity: 2,
        cost: {
          totalAmount: { amount: "20.00", currencyCode: "USD" },
          subtotalAmount: { amount: "20.00", currencyCode: "USD" },
          amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
          compareAtAmountPerQuantity: null,
        },
      },
    ],
  },
};

afterEach(() => {
  resetStandardActionsForTests();
});

describe("createCartStore during server rendering", () => {
  it("holds streamed initial data when the app configured a cart endpoint", async () => {
    configureCartEndpoint("/storefront/cart");

    const store = createCartStore({ initialData: Promise.resolve({ cart: CART }) });

    await vi.waitFor(() => expect(store.getState().data.totalQuantity).toBe(2));
  });
});
