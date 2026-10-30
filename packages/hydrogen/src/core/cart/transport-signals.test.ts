// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { createCartStore } from "./cart";

it("cancels transport loads on destroy", async () => {
  let signal: AbortSignal | undefined;
  const store = createCartStore({
    transport: {
      getCart: (options) => {
        signal = options.signal;
        return new Promise(() => {});
      },
      updateCart: vi.fn(),
    },
  });
  void store.fetch();
  expect(signal?.aborted).toBe(false);
  store.destroy();
  expect(signal?.aborted).toBe(true);
});

it("refreshes checkout URLs on each connect when consent is already loaded", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "Shopify");
  Object.defineProperty(window, "Shopify", {
    configurable: true,
    value: { customerPrivacy: { consentStatus: "loaded" } },
  });
  const getCart = vi.fn(async () => ({ cart: null }));
  const transport = { getCart, updateCart: vi.fn() };
  const first = createCartStore({ initialData: { cart: null }, transport });
  const second = createCartStore({ initialData: { cart: null }, transport });
  try {
    first.connect();
    second.connect();
    await Promise.resolve();
    expect(getCart).toHaveBeenCalledTimes(2);
    second.refresh();
    await vi.waitFor(() => expect(getCart).toHaveBeenCalledTimes(3));
  } finally {
    first.destroy();
    second.destroy();
    if (descriptor) Object.defineProperty(window, "Shopify", descriptor);
    else Reflect.deleteProperty(window, "Shopify");
  }
});
