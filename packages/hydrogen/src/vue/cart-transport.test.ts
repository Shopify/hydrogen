// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { resetStandardActionsForTests, type CartTransport } from "../core/cart/cart";
import { EMPTY_CART_DATA, type CartData } from "../core/cart/state";
import { CartProvider, useCart, useCartActions } from "./cart";

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

afterEach(() => resetStandardActionsForTests());

describe("CartProvider with a transport", () => {
  it("loads and changes the cart through the transport", async () => {
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
    const Stepper = defineComponent({
      setup() {
        const quantity = useCart((state) => state.data.lines.nodes[0]?.quantity);
        const { updateLines } = useCartActions();
        return () =>
          h(
            "button",
            { onClick: () => updateLines([{ id: "line-1", quantity: (quantity.value ?? 0) + 1 }]) },
            `Quantity ${quantity.value}`,
          );
      },
    });

    const wrapper = mount(CartProvider, {
      props: { transport },
      slots: { default: () => h(Stepper) },
    });
    await vi.waitFor(() => expect(wrapper.text()).toBe("Quantity 1"));
    await wrapper.get("button").trigger("click");
    await nextTick();

    expect(wrapper.text()).toBe("Quantity 2");
    await vi.waitFor(() =>
      expect(updates).toEqual([{ cartId: "cart-1", lines: [{ id: "line-1", quantity: 2 }] }]),
    );
    wrapper.unmount();
  });
});
