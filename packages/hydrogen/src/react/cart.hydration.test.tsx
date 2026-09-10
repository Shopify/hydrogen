// @vitest-environment happy-dom
import { act } from "@testing-library/react";
import { createElement, Suspense, type ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CartData } from "../core/cart/state";
import { assert } from "../core/test-utils";
import { CartProvider, createCartComponents, useCart } from "./cart";

const CART: CartData = {
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
  lines: { nodes: [] },
  discountCodes: [],
};

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value) {
      assert(resolvePromise, "Expected deferred resolve to be assigned");
      resolvePromise(value);
    },
  };
}

function CartSummary() {
  const loading = useCart((state) => state.loading);
  const quantity = useCart((state) => state.data.totalQuantity);
  return createElement("span", { "data-testid": "cart-summary" }, loading ? "Loading" : quantity);
}

const typedCart = createCartComponents<{
  get: () => Promise<{ data: { cart: CartData } }>;
}>();

function SuspenseCartSummary() {
  const quantity = typedCart.useSuspenseCart((state) => state.data.totalQuantity);
  return createElement("span", { "data-testid": "cart-summary" }, quantity);
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("CartProvider hydration", () => {
  it("hydrates useCart from its initial snapshot when cart data resolves first", async () => {
    const cartData = createDeferred<{ cart: CartData }>();
    const hydrationGate = createDeferred<void>();
    let blockHydration = false;

    function HydrationGate({ children }: { children: ReactNode }) {
      if (blockHydration) throw hydrationGate.promise;
      return children;
    }

    function App() {
      return createElement(
        CartProvider,
        { initialData: cartData.promise },
        createElement(
          Suspense,
          { fallback: createElement("span", null, "Waiting") },
          createElement(HydrationGate, null, createElement(CartSummary)),
        ),
      );
    }

    const container = document.createElement("div");
    container.innerHTML = renderToString(createElement(App));
    document.body.append(container);
    expect(container.textContent).toBe("Loading");

    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;
    blockHydration = true;

    await act(async () => {
      root = hydrateRoot(container, createElement(App), { onRecoverableError });
    });

    cartData.resolve({ cart: CART });
    await act(async () => {
      await cartData.promise;
    });

    blockHydration = false;
    hydrationGate.resolve();
    await act(async () => {
      await hydrationGate.promise;
    });

    expect(container.textContent).toBe("3");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
  });

  it("hydrates useSuspenseCart content from live cart data", async () => {
    const cartData = createDeferred<{ cart: CartData }>();
    const hydrationGate = createDeferred<void>();
    let blockHydration = false;

    function HydrationGate({ children }: { children: ReactNode }) {
      if (blockHydration) throw hydrationGate.promise;
      return children;
    }

    function App({
      initialData,
    }: {
      initialData: { cart: CartData } | Promise<{ cart: CartData }>;
    }) {
      return createElement(
        typedCart.CartProvider,
        { initialData },
        createElement(
          Suspense,
          { fallback: createElement("span", null, "Loading") },
          createElement(HydrationGate, null, createElement(SuspenseCartSummary)),
        ),
      );
    }

    const container = document.createElement("div");
    container.innerHTML = renderToString(createElement(App, { initialData: { cart: CART } }));
    document.body.append(container);
    expect(container.textContent).toBe("3");

    const onRecoverableError = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let root: Root | undefined;
    blockHydration = true;

    await act(async () => {
      root = hydrateRoot(container, createElement(App, { initialData: cartData.promise }), {
        onRecoverableError,
      });
    });

    cartData.resolve({ cart: CART });
    await act(async () => {
      await cartData.promise;
    });

    blockHydration = false;
    hydrationGate.resolve();
    await act(async () => {
      await hydrationGate.promise;
    });

    expect(container.textContent).toBe("3");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();

    await act(async () => root?.unmount());
  });
});
