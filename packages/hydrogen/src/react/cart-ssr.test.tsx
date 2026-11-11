// @vitest-environment node
import { PassThrough } from "node:stream";

import { createElement, Suspense, type ReactNode } from "react";
import { renderToPipeableStream, renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";

import type { CartData } from "../core/cart/state";
import { EMPTY_CART_DATA } from "../core/cart/state";
import { CartProvider, createCartComponents, useCart } from "./cart";
import { LocaleProvider, type LocaleProviderProps } from "./locale";

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

    const html = await streamToString(tree, () => resolveInitialData?.({ cart: MOCK_CART }));

    expect(html).toContain(">3<");
    expect(html).not.toContain("Loading cart");
  });
});

describe("cart form actions in server-rendered streams", () => {
  const FR_CA = { language: "FR", country: "CA", pathPrefix: "/fr-ca" } as const;
  const EN_CA = { language: "EN", country: "CA", pathPrefix: "/en-ca" } as const;

  // Renders after the streamed cart resolves, which is after the shell of every request started.
  function StreamedCartForm() {
    typedCart.useSuspenseCart((s) => s.data.id);
    const { formProps } = typedCart.useCartForm();
    return createElement("form", formProps());
  }

  function startRequest(locale: LocaleProviderProps["locale"]) {
    let sendCart: (() => void) | undefined;
    const initialData = new Promise<{ cart: CartData }>((resolve) => {
      sendCart = () => resolve({ cart: MOCK_CART });
    });
    const html = streamToString(
      createElement(
        LocaleProvider,
        { locale },
        createElement(
          typedCart.CartProvider,
          { initialData },
          createElement(Suspense, { fallback: null }, createElement(StreamedCartForm)),
        ),
      ),
    );
    return { html, sendCart: () => sendCart?.() };
  }

  it("renders each request's own action when requests for two locales overlap", async () => {
    const frCa = startRequest(FR_CA);
    const enCa = startRequest(EN_CA);

    enCa.sendCart();
    frCa.sendCart();

    expect(getFormActions(await frCa.html)).toEqual(["/fr-ca/api/cart"]);
    expect(getFormActions(await enCa.html)).toEqual(["/en-ca/api/cart"]);
  });
});

function getFormActions(html: string): string[] {
  return [...html.matchAll(/action="([^"]*)"/g)].map(([, action]) => action);
}

function streamToString(tree: ReactNode, onShellReady?: () => void): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const destination = new PassThrough();
    let output = "";
    destination.setEncoding("utf8");
    destination.on("data", (chunk: string) => {
      output += chunk;
    });
    destination.on("end", () => resolve(output));
    destination.on("error", reject);

    const stream = renderToPipeableStream(tree, {
      onShellReady,
      onAllReady() {
        stream.pipe(destination);
      },
      onShellError: reject,
      onError: reject,
    });
  });
}
