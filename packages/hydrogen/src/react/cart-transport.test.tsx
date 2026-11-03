// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetStandardActionsForTests, type CartTransport } from "../core/cart/cart";
import { EMPTY_CART_DATA, type CartData } from "../core/cart/state";
import { CartProvider, createCartComponents, useCart, useCartActions } from "./cart";

const money = { amount: "10.00", currencyCode: "USD" };

function makeCart(quantity: number): CartData & { id: string } {
  return {
    ...EMPTY_CART_DATA,
    id: "cart-1",
    totalQuantity: quantity,
    lines: {
      nodes: [
        {
          id: "line-1",
          quantity,
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

function inMemoryTransport() {
  let cart = makeCart(1);
  const updates: unknown[] = [];
  const transport: CartTransport = {
    getCart: async () => ({ cart }),
    updateCart: async (update) => {
      updates.push(update);
      if ("lines" in update) cart = makeCart(update.lines[0]?.quantity ?? 0);
      return { cart };
    },
  };
  return { transport, updates };
}

function Stepper() {
  const quantity = useCart((state) => state.data.lines.nodes[0]?.quantity);
  const { updateLines } = useCartActions();
  return createElement(
    "button",
    { onClick: () => updateLines([{ id: "line-1", quantity: (quantity ?? 0) + 1 }]) },
    `Quantity ${quantity}`,
  );
}

afterEach(() => resetStandardActionsForTests());

describe("CartProvider with a transport", () => {
  it("loads and changes the cart through the transport", async () => {
    const { transport, updates } = inMemoryTransport();
    render(createElement(CartProvider, { transport }, createElement(Stepper)));

    await screen.findByText("Quantity 1");
    act(() => screen.getByRole("button").click());

    expect(screen.getByText("Quantity 2")).toBeTruthy();
    await vi.waitFor(() =>
      expect(updates).toEqual([{ cartId: "cart-1", lines: [{ id: "line-1", quantity: 2 }] }]),
    );
  });

  it("passes the transport through the typed provider", async () => {
    const { transport } = inMemoryTransport();
    const typed = createCartComponents<{ get: () => Promise<{ data: { cart: CartData } }> }>();
    render(createElement(typed.CartProvider, { transport }, createElement(Stepper)));

    expect(await screen.findByText("Quantity 1")).toBeTruthy();
  });
});
