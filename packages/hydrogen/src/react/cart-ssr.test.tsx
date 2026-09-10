// @vitest-environment node
import { PassThrough } from "node:stream";

import { createElement, Suspense } from "react";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

import type { CartData } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import { CartProvider, createCartComponents, useCart } from "./cart";

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

const typedCart = createCartComponents<{
  get: () => Promise<{ data: { cart: CartData } }>;
}>();

function SuspenseCartTotalQuantity() {
  const qty = typedCart.useSuspenseCart((s) => s.data.totalQuantity);
  return createElement("span", { "data-testid": "qty" }, qty);
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
  attributes: [],
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

  it("suspends on async initialData during server rendering", () => {
    const initialData = new Promise<{ cart: CartData }>(() => {});
    const fallback = createElement("span", { "data-testid": "fallback" }, "Loading cart");
    const cartContent = createElement(
      Suspense,
      { fallback },
      createElement(SuspenseCartTotalQuantity),
    );
    const tree = createElement(typedCart.CartProvider, { initialData }, cartContent);
    const html = renderToString(tree);

    expect(html).toContain("Loading cart");
    expect(html).not.toContain(">0<");
  });

  it("streams resolved cart content from useSuspenseCart", async () => {
    let resolveInitialData: ((value: { cart: CartData }) => void) | undefined;
    const initialData = new Promise<{ cart: CartData }>((resolve) => {
      resolveInitialData = resolve;
    });
    const tree = createElement(
      typedCart.CartProvider,
      { initialData },
      createElement(
        Suspense,
        { fallback: createElement("span", null, "Loading cart") },
        createElement(SuspenseCartTotalQuantity),
      ),
    );

    const html = await new Promise<string>((resolve, reject) => {
      const destination = new PassThrough();
      let output = "";
      destination.setEncoding("utf8");
      destination.on("data", (chunk: string) => {
        output += chunk;
      });
      destination.on("end", () => resolve(output));
      destination.on("error", reject);

      const stream = renderToPipeableStream(tree, {
        onShellReady() {
          if (!resolveInitialData) {
            reject(new Error("Expected initialData resolver to be assigned"));
            return;
          }
          resolveInitialData({ cart: MOCK_CART });
        },
        onAllReady() {
          stream.pipe(destination);
        },
        onShellError: reject,
        onError: reject,
      });
    });

    expect(html).toContain(">3<");
    expect(html).not.toContain("Loading cart");
  });
});
