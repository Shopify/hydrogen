// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";

import { createCartStore, type CartTransport, CartNetworkError } from "./cart";

it("loads through a transport without reading Shopify", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "Shopify");
  Object.defineProperty(window, "Shopify", {
    configurable: true,
    get() {
      throw new Error("Unexpected Shopify access");
    },
  });
  const transport: CartTransport = {
    getCart: vi.fn(async () => ({ cart: null })),
    updateCart: vi.fn(),
  };
  const store = createCartStore({ transport });
  try {
    store.connect();
    await store.fetch();
    expect(transport.getCart).toHaveBeenCalled();
    expect(store.getState().data.id).toBeFalsy();
  } finally {
    store.destroy();
    if (descriptor) Object.defineProperty(window, "Shopify", descriptor);
    else Reflect.deleteProperty(window, "Shopify");
  }
});

it("rejects transport network failures", async () => {
  const error = new CartNetworkError(503);
  const store = createCartStore({
    transport: {
      getCart: async () => {
        throw error;
      },
      updateCart: vi.fn(),
    },
  });
  await expect(store.fetch()).rejects.toBe(error);
  store.destroy();
});
