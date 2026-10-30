// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { createCartStore, CART_TRANSACTION_TYPES, type CartTransportUpdateResult } from "./cart";
import { EMPTY_CART_DATA, createCartState, type CartData } from "./state";

function cart(currencyCode = "USD"): CartData {
  const money = { amount: "10", currencyCode };
  const cost = { totalAmount: money, subtotalAmount: money, checkoutChargeAmount: money };
  return {
    ...EMPTY_CART_DATA,
    id: "aggregate",
    cost,
    totalQuantity: 1,
    groups: [
      { seller: { shop: "seller" }, cartId: "child", currencyCode, cost, discountCodes: [] },
    ],
    lines: {
      nodes: [
        {
          id: "line",
          quantity: 1,
          seller: { shop: "seller" },
          cartId: "child",
          merchandise: { id: "variant", product: { title: "Product" } },
          cost: {
            totalAmount: money,
            subtotalAmount: money,
            amountPerQuantity: money,
            compareAtAmountPerQuantity: null,
          },
        },
      ],
    },
  };
}

it("clears absent cost and groups on authoritative revalidation", async () => {
  const authoritative = cart();
  delete authoritative.cost;
  delete authoritative.groups;
  const store = createCartStore({
    initialData: { cart: cart() },
    transport: {
      getCart: async () => ({ cart: authoritative }),
      updateCart: vi.fn(),
    },
  });
  try {
    store.connect();
    store.refresh();
    await vi.waitFor(() => {
      expect(store.getState().data.cost).toBeUndefined();
      expect(store.getState().data.groups).toBeUndefined();
    });
  } finally {
    store.destroy();
  }
});

it("does not let an older line response overwrite a newer snapshot", async () => {
  let resolveOlder: (result: CartTransportUpdateResult) => void = vi.fn();
  const older = new Promise<CartTransportUpdateResult>((resolve) => {
    resolveOlder = resolve;
  });
  const newer = cart("JPY");
  const store = createCartStore({
    initialData: { cart: cart() },
    transport: {
      getCart: async () => ({ cart: newer }),
      updateCart: async (payload) => (payload.lines ? older : { cart: newer }),
    },
  });
  try {
    const change = store.updateLines([{ id: "line", quantity: 2 }]);
    await vi.waitFor(() => expect(store.getState().pending.lines.size).toBeGreaterThan(0));
    await store.setNote("newer");
    resolveOlder({ cart: cart("USD") });
    await change;
    expect(store.getState().data.cost).toEqual(newer.cost);
    expect(store.getState().data.groups).toEqual(newer.groups);
  } finally {
    store.destroy();
  }
});

it("copies seller and child cart for a new optimistic line with known merchandise", () => {
  const state = CART_TRANSACTION_TYPES.add_to_cart.projectPayload(
    createCartState(cart()),
    {
      lines: [
        { merchandiseId: "variant", quantity: 1, attributes: [{ key: "gift", value: "yes" }] },
      ],
      products: [{ id: "variant", product: { title: "Product" } }],
    },
    () => true,
  );
  expect(state.data.lines.nodes).toHaveLength(2);
  const optimistic = state.data.lines.nodes.find((line) => line.id !== "line");
  expect(optimistic?.seller).toEqual({ shop: "seller" });
  expect(optimistic?.cartId).toBe("child");
});
