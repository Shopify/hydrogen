// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

import type { CartData } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import { CartProvider, useCart } from "./cart";

function CartTotalQuantity() {
  const qty = useCart((s) => s.data.totalQuantity);
  return createElement("span", { "data-testid": "qty" }, qty);
}

function CartItemCount() {
  const count = useCart((s) => s.data.lines.nodes.length);
  return createElement("span", { "data-testid": "count" }, count);
}

function CartLoadingState() {
  const loading = useCart((s) => s.loading);
  return createElement("span", { "data-testid": "loading" }, String(loading));
}

const MOCK_CART: CartData = {
  id: "gid://shopify/Cart/123",
  checkoutUrl: "https://example.com/checkout",
  totalQuantity: 3,
  cost: {
    subtotalAmount: { amount: "30.00", currencyCode: "USD" },
    totalAmount: { amount: "30.00", currencyCode: "USD" },
    checkoutChargeAmount: { amount: "30.00", currencyCode: "USD" },
  },
  note: "",
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
      {
        id: "gid://shopify/CartLine/2",
        quantity: 1,
        cost: {
          totalAmount: { amount: "10.00", currencyCode: "USD" },
          subtotalAmount: { amount: "10.00", currencyCode: "USD" },
          amountPerQuantity: { amount: "10.00", currencyCode: "USD" },
          compareAtAmountPerQuantity: null,
        },
      },
    ],
  },
  discountCodes: [],
};

describe("CartProvider SSR", () => {
  it("renders initialData in server-rendered HTML", () => {
    const html = renderToString(
      createElement(
        CartProvider,
        { initialData: { cart: MOCK_CART } },
        createElement(CartTotalQuantity),
      ),
    );

    expect(html).toContain(">3<");
  });

  it("renders line count from initialData in server-rendered HTML", () => {
    const html = renderToString(
      createElement(
        CartProvider,
        { initialData: { cart: MOCK_CART } },
        createElement(CartItemCount),
      ),
    );

    expect(html).toContain(">2<");
  });

  it("renders zero when no initialData is provided", () => {
    const html = renderToString(
      createElement(CartProvider, null, createElement(CartTotalQuantity)),
    );

    expect(html).toContain(">0<");
  });

  it("renders loading=true when initialData is omitted (no server data)", () => {
    const html = renderToString(createElement(CartProvider, null, createElement(CartLoadingState)));

    expect(html).toContain(">true<");
  });

  it("renders loading=false when initialData has an empty cart fixture", () => {
    const html = renderToString(
      createElement(
        CartProvider,
        { initialData: { cart: EMPTY_CART_DATA } },
        createElement(CartLoadingState),
      ),
    );

    expect(html).toContain(">false<");
  });

  it("renders loading=false when initialData is null cart (server returned no cart)", () => {
    const html = renderToString(
      createElement(CartProvider, { initialData: { cart: null } }, createElement(CartLoadingState)),
    );

    expect(html).toContain(">false<");
  });

  it("renders loading=false when initialData is provided", () => {
    const html = renderToString(
      createElement(
        CartProvider,
        { initialData: { cart: MOCK_CART } },
        createElement(CartLoadingState),
      ),
    );

    expect(html).toContain(">false<");
  });
});
