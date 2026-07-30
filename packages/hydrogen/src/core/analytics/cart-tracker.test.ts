// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCartStore } from "../cart/cart";
import type { CartStore } from "../cart/cart";
import type { CartData } from "../cart/state";
import { assert } from "../test-utils";
import { trackCartAnalytics } from "./cart-tracker";
import { AnalyticsEvent } from "./events";
import type { AnalyticsCart, CartUpdatePayload, ShopAnalytics, StorefrontAnalytics } from "./types";

const SHOP_DATA: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  channel: "hydrogen",
  storefrontId: "0",
};

const CONSENT_DATA = {};

const CART_LINE = {
  id: "gid://shopify/CartLine/373702e3-5b12-4ca8-83f1-e5c28150cc09?cart=c1-baf6e1a9669c049a865a469b564a1e44",
  quantity: 1,
  merchandise: {
    id: "gid://shopify/ProductVariant/41007290548280",
    price: {
      currencyCode: "USD",
      amount: "749.95",
    },
    title: "160cm / Syntax",
    product: {
      handle: "the-full-stack",
      title: "The Full Stack Snowboard",
      id: "gid://shopify/Product/6730943823928",
      vendor: "Snowdevil",
    },
  },
};

const CART_DATA: AnalyticsCart = {
  updatedAt: "2024-03-26T21:49:07Z",
  id: "gid://shopify/Cart/c1-123",
  cost: {
    subtotalAmount: { currencyCode: "USD" },
    totalAmount: { currencyCode: "USD" },
  },
  lines: {
    nodes: [CART_LINE],
  },
};

const CART_DATA_QUANTITY_INCREASED: AnalyticsCart = {
  ...CART_DATA,
  updatedAt: "2024-03-27T21:49:07Z",
  lines: {
    nodes: [
      {
        ...CART_LINE,
        quantity: 2,
      },
    ],
  },
};

const CART_DATA_EMPTY: AnalyticsCart = {
  updatedAt: "2024-03-28T21:49:07Z",
  id: "gid://shopify/Cart/c1-123",
  lines: { nodes: [] },
};

const CART_DATA_CAD: AnalyticsCart = {
  ...CART_DATA,
  updatedAt: "2024-03-29T21:49:07Z",
  cost: {
    subtotalAmount: { currencyCode: "cad" },
    totalAmount: { currencyCode: "cad" },
  },
};

const CART_DATA_WITH_LINE_CURRENCY_ONLY: AnalyticsCart = {
  ...CART_DATA,
  updatedAt: "2024-03-30T21:49:07Z",
  cost: undefined,
  lines: {
    nodes: [
      {
        ...CART_LINE,
        merchandise: {
          ...CART_LINE.merchandise,
          price: {
            amount: "749.95",
            currencyCode: "EUR",
          },
        },
      },
    ],
  },
};

function installLocalStorageShim() {
  const storage = new Map<string, string>();

  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, String(value)),
    },
  });
}

function createTestAnalytics(customData?: Record<string, unknown>) {
  const publish = vi.fn<StorefrontAnalytics["publish"]>();
  const analytics: Pick<StorefrontAnalytics, "publish" | "getConfig"> = {
    publish,
    getConfig: () => ({
      shop: SHOP_DATA,
      consent: CONSENT_DATA,
      customData,
    }),
  };

  return { analytics, publish };
}

function setGlobalAnalytics(analytics: Pick<StorefrontAnalytics, "publish" | "getConfig">) {
  (window as any).Shopify = { analytics };
}

function createCartDataFromAnalyticsCart(cart: AnalyticsCart): CartData {
  const lines = cart.lines.nodes ?? [];
  const fallbackCurrency =
    cart.cost?.totalAmount?.currencyCode ??
    cart.cost?.subtotalAmount?.currencyCode ??
    lines.find((line) => line.merchandise.price.currencyCode)?.merchandise.price.currencyCode ??
    "";

  return {
    id: cart.id,
    checkoutUrl: null,
    totalQuantity: lines.reduce((total, line) => total + line.quantity, 0),
    updatedAt: cart.updatedAt,
    note: "",
    discountCodes: [],
    cost: {
      subtotalAmount: {
        amount: "0",
        currencyCode: cart.cost?.subtotalAmount?.currencyCode ?? fallbackCurrency,
      },
      totalAmount: {
        amount: "0",
        currencyCode: cart.cost?.totalAmount?.currencyCode ?? fallbackCurrency,
      },
      checkoutChargeAmount: { amount: "0", currencyCode: fallbackCurrency },
    },
    lines: {
      nodes: lines.map((line) => {
        const price = {
          amount: line.merchandise.price.amount,
          currencyCode: line.merchandise.price.currencyCode ?? "",
        };

        return {
          id: line.id,
          quantity: line.quantity,
          cost: {
            totalAmount: price,
            subtotalAmount: price,
            amountPerQuantity: price,
            compareAtAmountPerQuantity: null,
          },
          merchandise: {
            id: line.merchandise.id,
            title: line.merchandise.title,
            sku: line.merchandise.sku,
            product: line.merchandise.product,
          },
        };
      }),
    },
  };
}

function createCartDataWithLineCurrencyOnly(cart: AnalyticsCart): CartData {
  return {
    ...createCartDataFromAnalyticsCart(cart),
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "" },
      totalAmount: { amount: "0", currencyCode: "" },
      checkoutChargeAmount: { amount: "0", currencyCode: "" },
    },
  };
}

function createStore(cart: CartData | null = null): CartStore {
  return createCartStore({ initialData: { cart } });
}

function dispatchCartLinesUpdate(
  cart: CartData,
  eventLines = cart.lines.nodes.map((line) => ({ id: line.id, quantity: line.quantity })),
): Promise<void> {
  const deferred = createDeferred<{ cart: unknown }>();

  const event = Object.assign(
    new Event("shopify:cart:lines-update", { bubbles: true, cancelable: true }),
    {
      action: eventLines.some((line) => line.quantity === 0) ? "remove" : "update",
      context: "standard-action",
      lines: eventLines,
      promise: deferred.promise,
    },
  );

  document.dispatchEvent(event);
  deferred.resolve({ cart: toStandardEventCart(cart) });

  return deferred.promise.then(() => nextTick());
}

function dispatchPendingCartLinesUpdate(cart: CartData): {
  settle: () => Promise<void>;
} {
  const deferred = createDeferred<{ cart: unknown }>();
  const lines = cart.lines.nodes.map((line) => ({ id: line.id, quantity: line.quantity }));

  const event = Object.assign(
    new Event("shopify:cart:lines-update", { bubbles: true, cancelable: true }),
    {
      action: "update",
      context: "standard-action",
      lines,
      promise: deferred.promise,
    },
  );

  document.dispatchEvent(event);

  return {
    settle: () => {
      deferred.resolve({ cart: toStandardEventCart(cart) });
      return deferred.promise.then(() => nextTick());
    },
  };
}

function toStandardEventCart(cart: CartData) {
  return {
    ...cart,
    lines: cart.lines.nodes,
  };
}

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  assert(resolve, "Expected deferred resolve to be assigned");
  assert(reject, "Expected deferred reject to be assigned");
  return { promise, resolve, reject };
}

function nextTick(): Promise<void> {
  return Promise.resolve().then(() => {});
}

describe("trackCartAnalytics", () => {
  beforeEach(() => {
    installLocalStorageShim();
    localStorage.clear();
    delete (window as any).Shopify;
  });

  it("publishes product_added_to_cart with cart and shop when quantity increases", async () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA));

    trackCartAnalytics(store);
    store.connect();
    await dispatchCartLinesUpdate(createCartDataFromAnalyticsCart(CART_DATA_QUANTITY_INCREASED));
    store.destroy();

    expect(publish).toHaveBeenCalledWith(
      AnalyticsEvent.PRODUCT_ADD_TO_CART,
      expect.objectContaining({
        cart: expect.objectContaining({ id: CART_DATA_QUANTITY_INCREASED.id }),
        prevCart: expect.objectContaining({ id: CART_DATA.id }),
        shop: SHOP_DATA,
      }),
    );
  });

  it("publishes product_removed_from_cart with cart and shop when line removed", async () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA));

    trackCartAnalytics(store);
    store.connect();
    await dispatchCartLinesUpdate(createCartDataFromAnalyticsCart(CART_DATA_EMPTY), [
      { id: CART_LINE.id, quantity: 0 },
    ]);
    store.destroy();

    expect(publish).toHaveBeenCalledWith(
      AnalyticsEvent.PRODUCT_REMOVED_FROM_CART,
      expect.objectContaining({
        cart: expect.objectContaining({ id: CART_DATA_EMPTY.id }),
        prevCart: expect.objectContaining({ id: CART_DATA.id }),
        shop: SHOP_DATA,
      }),
    );
  });

  it("includes prevCart in cart_updated payload", async () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA));

    trackCartAnalytics(store);
    store.connect();
    await dispatchCartLinesUpdate(createCartDataFromAnalyticsCart(CART_DATA_QUANTITY_INCREASED));
    store.destroy();

    const cartUpdatedCalls = publish.mock.calls.filter(
      ([event]) => event === AnalyticsEvent.CART_UPDATED,
    );
    const payload = cartUpdatedCalls[0]?.[1];
    assert(payload, "Expected a cart_updated payload");
    const cartUpdatedPayload = payload as CartUpdatePayload;
    expect(cartUpdatedPayload.cart).toEqual(
      expect.objectContaining({ id: CART_DATA_QUANTITY_INCREASED.id }),
    );
    expect(cartUpdatedPayload.prevCart).toEqual(expect.objectContaining({ id: CART_DATA.id }));
  });

  it("includes customData from analytics config", () => {
    const customData = { theme: "v2" };
    const { analytics, publish } = createTestAnalytics(customData);
    setGlobalAnalytics(analytics);
    const store = createStore();

    trackCartAnalytics(store);
    store.hydrate(createCartDataFromAnalyticsCart(CART_DATA));

    expect(publish).toHaveBeenCalledWith(
      AnalyticsEvent.CART_UPDATED,
      expect.objectContaining({ customData }),
    );
  });

  it("sets Shopify global currency when missing", () => {
    const { analytics } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA));

    trackCartAnalytics(store);

    expect(window.Shopify?.currency).toEqual({ active: "USD" });
  });

  it("updates Shopify global currency when it differs from cart currency", () => {
    const { analytics } = createTestAnalytics();
    (window as any).Shopify = { analytics, currency: { active: "USD" } };
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA_CAD));

    trackCartAnalytics(store);

    expect(window.Shopify?.currency).toEqual({ active: "CAD" });
  });

  it("falls back to line price currency when cart cost currency is unavailable", () => {
    const { analytics } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(
      createCartDataWithLineCurrencyOnly(CART_DATA_WITH_LINE_CURRENCY_ONLY),
    );

    trackCartAnalytics(store);

    expect(window.Shopify?.currency).toEqual({ active: "EUR" });
  });

  it("does not duplicate cart_updated on same updatedAt", () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore();

    trackCartAnalytics(store);
    store.hydrate(createCartDataFromAnalyticsCart(CART_DATA));
    store.reset();
    store.hydrate(createCartDataFromAnalyticsCart(CART_DATA));

    const cartUpdatedCalls = publish.mock.calls.filter(
      ([event]) => event === AnalyticsEvent.CART_UPDATED,
    );
    expect(cartUpdatedCalls).toHaveLength(1);
  });

  it("deduplicates via localStorage across tracker instances", () => {
    const firstAnalytics = createTestAnalytics();
    setGlobalAnalytics(firstAnalytics.analytics);
    const firstStore = createStore();

    trackCartAnalytics(firstStore);
    firstStore.hydrate(createCartDataFromAnalyticsCart(CART_DATA));
    expect(firstAnalytics.publish).toHaveBeenCalledWith(
      AnalyticsEvent.CART_UPDATED,
      expect.any(Object),
    );

    const secondAnalytics = createTestAnalytics();
    setGlobalAnalytics(secondAnalytics.analytics);
    const secondStore = createStore();
    trackCartAnalytics(secondStore);
    secondStore.hydrate(createCartDataFromAnalyticsCart(CART_DATA));

    expect(secondAnalytics.publish).not.toHaveBeenCalled();
  });

  it("uses the global analytics bus", () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore();

    trackCartAnalytics(store);
    store.hydrate(createCartDataFromAnalyticsCart(CART_DATA));

    expect(publish).toHaveBeenCalledWith(AnalyticsEvent.CART_UPDATED, expect.any(Object));
  });

  it("ignores pending cart state until the cart settles", async () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore(createCartDataFromAnalyticsCart(CART_DATA));

    trackCartAnalytics(store);
    store.connect();
    const update = dispatchPendingCartLinesUpdate(
      createCartDataFromAnalyticsCart(CART_DATA_QUANTITY_INCREASED),
    );

    expect(publish).not.toHaveBeenCalled();

    await update.settle();
    store.destroy();

    expect(publish).toHaveBeenCalledWith(AnalyticsEvent.CART_UPDATED, expect.any(Object));
  });

  it("stops tracking when the returned cleanup runs", () => {
    const { analytics, publish } = createTestAnalytics();
    setGlobalAnalytics(analytics);
    const store = createStore();

    const cleanup = trackCartAnalytics(store);
    cleanup();
    store.hydrate(createCartDataFromAnalyticsCart(CART_DATA));

    expect(publish).not.toHaveBeenCalled();
  });

  it("throws when no analytics bus is available", () => {
    const store = createStore();

    expect(() => trackCartAnalytics(store)).toThrow("Shopify analytics bus is not available");
  });
});
