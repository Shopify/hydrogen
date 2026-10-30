// @vitest-environment happy-dom
import { expect, it } from "vitest";

import { trackCartAnalytics } from "../analytics/cart-tracker";
import { createCartStore, type CartTransport } from "./cart";
import { EMPTY_CART_DATA, type CartData, type CartLine } from "./state";

const money = (currencyCode: string) => ({ amount: "10", currencyCode });

it("keeps mixed-currency seller carts through transport mutations", async () => {
  const line = (id: string, currency: string): CartLine => ({
    id,
    quantity: 1,
    seller: { shop: id },
    cartId: `cart-${id}`,
    merchandise: { id: `variant-${id}`, product: { title: id } },
    cost: {
      totalAmount: money(currency),
      subtotalAmount: money(currency),
      amountPerQuantity: money(currency),
      compareAtAmountPerQuantity: null,
    },
  });
  let cart: CartData = {
    ...EMPTY_CART_DATA,
    id: "aggregate",
    cost: undefined,
    totalQuantity: 2,
    lines: { nodes: [line("us", "USD"), line("jp", "JPY")] },
    groups: ["USD", "JPY"].map((currencyCode, index) => ({
      seller: { shop: index === 0 ? "us" : "jp" },
      cartId: `child-${index}`,
      currencyCode,
      cost: {
        subtotalAmount: money(currencyCode),
        totalAmount: money(currencyCode),
        checkoutChargeAmount: money(currencyCode),
      },
      discountCodes: [],
    })),
  };
  const groups = cart.groups;
  const transport: CartTransport = {
    getCart: async () => ({ cart }),
    updateCart: async () => ({ cart, userErrors: [], warnings: [] }),
  };
  const store = createCartStore({ transport });
  const previousShopify = window.Shopify;
  (window as any).Shopify = { analytics: { publish() {}, getConfig: () => ({}) } };
  const stop = trackCartAnalytics(store);
  const submit = (fields: Record<string, string>, intent: string) => {
    const form = document.createElement("form");
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.name = name;
      input.value = value;
      form.append(input);
    }
    const button = document.createElement("button");
    button.name = "intent";
    button.value = intent;
    form.append(button);
    const event = new SubmitEvent("submit", { submitter: button });
    form.dispatchEvent(event);
    return store.handleFormSubmit(event);
  };
  try {
    await store.fetch();
    for (const intent of ["add", "increase", "remove"]) {
      const before = store.getState().data.lines.nodes[0];
      expect(before).toBeDefined();
      const promise = submit(
        intent === "add" ? { merchandiseId: "variant-us" } : { lineId: "us" },
        intent,
      );
      const optimistic = store.getState().data;
      expect(optimistic.cost).toBeUndefined();
      expect(optimistic.groups).toEqual(groups);
      for (const item of optimistic.lines.nodes) {
        expect(item.seller).toBeDefined();
        expect(item.cartId).toBeDefined();
      }
      cart = { ...cart };
      await promise;
      expect(store.getState().data.groups).toEqual(groups);
      expect(store.getState().data.cost).toBeUndefined();
    }
  } finally {
    stop();
    store.destroy();
    window.Shopify = previousShopify;
  }
});
