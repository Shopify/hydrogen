// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createStorefrontAnalytics } from "./bus";
import type {
  StorefrontAnalyticsOptions,
  ShopAnalytics,
  AnalyticsCart,
  PageViewPayload,
} from "./types";

vi.mock("@shopify/hydrogen/cdn", () => ({
  bootstrapShopifyAnalytics: vi.fn(),
}));

vi.mock("./consent", () => ({
  initConsent: vi.fn(() => vi.fn()),
}));

import { bootstrapShopifyAnalytics } from "@shopify/hydrogen/cdn";

import { initConsent } from "./consent";
import { getTrackingValues } from "./utils/tracking-values";

const bootstrapMock = vi.mocked(bootstrapShopifyAnalytics);
const initConsentMock = vi.mocked(initConsent);

vi.mock("./utils/tracking-values", () => ({
  getTrackingValues: vi.fn(() => ({
    uniqueToken: "abc-unique-token",
    visitToken: "def-visit-token",
    consent: null,
  })),
}));

const SHOP_DATA: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: "0",
};

const CONSENT_DATA = {
  consentDomain: "checkout.hydrogen.shop",
  publicStorefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
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

const CART_DATA: AnalyticsCart = {
  updatedAt: "2024-03-26T21:49:07Z",
  id: "gid://shopify/Cart/c1-123",
  lines: {
    nodes: [
      {
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
      },
    ],
  },
};

const CART_DATA_QUANTITY_INCREASED: AnalyticsCart = {
  updatedAt: "2024-03-27T21:49:07Z",
  id: "gid://shopify/Cart/c1-123",
  lines: {
    nodes: [
      {
        id: "gid://shopify/CartLine/373702e3-5b12-4ca8-83f1-e5c28150cc09?cart=c1-baf6e1a9669c049a865a469b564a1e44",
        quantity: 2,
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
      },
    ],
  },
};

const CART_DATA_EMPTY: AnalyticsCart = {
  updatedAt: "2024-03-28T21:49:07Z",
  id: "gid://shopify/Cart/c1-123",
  lines: { nodes: [] },
};

function createTestBus(overrides: Partial<StorefrontAnalyticsOptions> = {}) {
  return createStorefrontAnalytics({
    shop: SHOP_DATA,
    consent: CONSENT_DATA,
    ...overrides,
  } as StorefrontAnalyticsOptions);
}

describe("createStorefrontAnalytics", () => {
  beforeEach(() => {
    installLocalStorageShim();
    localStorage.clear();
    document.cookie = "_shopify_y=; max-age=0; path=/";
    document.cookie = "_shopify_s=; max-age=0; path=/";
    vi.mocked(getTrackingValues).mockReturnValue({
      uniqueToken: "abc-unique-token",
      visitToken: "def-visit-token",
      consent: "",
    });
    bootstrapMock.mockClear();
    initConsentMock.mockClear();
    delete (window as any).Shopify;
  });

  afterEach(() => {
    delete (window as any).Shopify;
  });

  describe("pub/sub", () => {
    it("delivers events to subscribers", () => {
      const bus = createTestBus();
      const callback = vi.fn();

      bus.subscribe("page_viewed", callback);

      bus.publish("page_viewed", { url: "/test", shop: SHOP_DATA });

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ url: "/test" }));
    });

    it("delivers events regardless of consent state (consent-agnostic bus)", () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe("page_viewed", callback);

      bus.publish("page_viewed", { url: "/test", shop: SHOP_DATA });

      expect(callback).toHaveBeenCalledOnce();
    });

    it("returns an unsubscribe function", () => {
      const bus = createTestBus();
      const callback = vi.fn();

      const unsubscribe = bus.subscribe("page_viewed", callback);

      bus.publish("page_viewed", { url: "/first", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();

      unsubscribe();

      bus.publish("page_viewed", { url: "/second", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();
    });

    it("supports multiple subscribers for the same event", () => {
      const bus = createTestBus();
      const callbackA = vi.fn();
      const callbackB = vi.fn();

      bus.subscribe("page_viewed", callbackA);
      bus.subscribe("page_viewed", callbackB);

      bus.publish("page_viewed", { url: "/test", shop: SHOP_DATA });

      expect(callbackA).toHaveBeenCalledOnce();
      expect(callbackB).toHaveBeenCalledOnce();
    });

    it("isolates events by name", () => {
      const bus = createTestBus();
      const pageCallback = vi.fn();
      const productCallback = vi.fn();

      bus.subscribe("page_viewed", pageCallback);
      bus.subscribe("product_viewed", productCallback);

      bus.publish("page_viewed", { url: "/test", shop: SHOP_DATA });

      expect(pageCallback).toHaveBeenCalledOnce();
      expect(productCallback).not.toHaveBeenCalled();
    });

    it("catches subscriber errors without breaking other subscribers", () => {
      const bus = createTestBus();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      bus.subscribe("page_viewed", () => {
        throw new Error("subscriber failed");
      });
      const healthyCallback = vi.fn();
      bus.subscribe("page_viewed", healthyCallback);

      bus.publish("page_viewed", { url: "/test", shop: SHOP_DATA });

      expect(healthyCallback).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("destinations", () => {
    it("delivers live events to destinations when analytics consent is granted", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      bus.publish("page_viewed", { url: "/live", shop: SHOP_DATA });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(expect.objectContaining({ url: "/live" }));
    });

    it("buffers destination events until analytics consent is granted", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => false },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/buffered", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      const { onConsentCollected } = initConsentMock.mock.calls[0][0];
      onConsentCollected({ shouldRevalidate: false });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(expect.objectContaining({ url: "/buffered" }));
    });

    it("replays buffered events to destinations added after consent is granted", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => false },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/early", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      const { onConsentCollected } = initConsentMock.mock.calls[0][0];
      onConsentCollected({ shouldRevalidate: false });

      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(expect.objectContaining({ url: "/early" }));
    });

    it("does not replay buffered events after explicit analytics consent denial", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => false },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/denied", shop: SHOP_DATA });

      const { onConsentCollected } = initConsentMock.mock.calls[0][0];
      onConsentCollected({ shouldRevalidate: false });

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
    });

    it("replays custom events to destinations", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.publish("custom_my_event" as `custom_${string}`, { shop: SHOP_DATA });
      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("custom_my_event" as `custom_${string}`, destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(expect.objectContaining({ shop: SHOP_DATA }));
    });

    it("replays each buffered event to a destination only once", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => false },
      };

      const bus = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/one", shop: SHOP_DATA });
      bus.publish("page_viewed", { url: "/two", shop: SHOP_DATA });

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      const { onReady, onConsentCollected } = initConsentMock.mock.calls[0][0];
      onReady();
      onConsentCollected({ shouldRevalidate: false });

      expect(destination).toHaveBeenCalledTimes(2);
      expect(destination).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: "/one" }));
      expect(destination).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: "/two" }));
    });

    it("cleans up destination subscriptions", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const destination = vi.fn();
      const cleanup = vi.fn();

      const removeDestination = bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
          return cleanup;
        },
      });

      removeDestination();
      bus.publish("page_viewed", { url: "/after-cleanup", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("waits for async destination setup before replaying buffered events", async () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const destination = vi.fn();
      let finishSetup: (() => void) | undefined;

      bus.publish("page_viewed", { url: "/early", shop: SHOP_DATA });
      bus.addDestination({
        name: "async-destination",
        async setup({ subscribe }) {
          await new Promise<void>((resolve) => {
            finishSetup = resolve;
          });
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
      finishSetup?.();
      await vi.waitFor(() => {
        expect(destination).toHaveBeenCalledOnce();
      });
    });
  });

  describe("consent initialization", () => {
    it("calls initConsent on bus creation", () => {
      const bus = createTestBus();
      expect(initConsentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          consent: CONSENT_DATA,
          onReady: expect.any(Function),
          onConsentCollected: expect.any(Function),
        }),
      );
      bus.destroy();
    });

    it("syncs deprecated cookies when consent is ready", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const { onReady } = initConsentMock.mock.calls[0][0];

      onReady();

      expect(document.cookie).toContain("_shopify_y=abc-unique-token");
      expect(document.cookie).toContain("_shopify_s=def-visit-token");

      bus.destroy();
    });

    it("does not write deprecated cookies from page views before consent and tracking readiness", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      bus.publish("page_viewed", { url: "/before-ready", shop: SHOP_DATA });

      expect(document.cookie).not.toContain("_shopify_y=abc-unique-token");
      expect(document.cookie).not.toContain("_shopify_s=def-visit-token");

      const { onReady } = initConsentMock.mock.calls[0][0];
      onReady();
      bus.publish("page_viewed", { url: "/after-ready", shop: SHOP_DATA });

      expect(document.cookie).toContain("_shopify_y=abc-unique-token");
      expect(document.cookie).toContain("_shopify_s=def-visit-token");

      bus.destroy();
    });

    it("clears deprecated cookies when consent collection denies analytics", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const bus = createTestBus();
      const { onReady, onConsentCollected } = initConsentMock.mock.calls[0][0];

      onReady();
      expect(document.cookie).toContain("_shopify_y=abc-unique-token");

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => false;
      onConsentCollected({ shouldRevalidate: false });

      expect(document.cookie).not.toContain("_shopify_y=abc-unique-token");
      expect(document.cookie).not.toContain("_shopify_s=def-visit-token");

      bus.destroy();
    });
  });

  describe("getConfig", () => {
    it("returns current bus configuration", () => {
      const bus = createTestBus();
      const config = bus.getConfig();

      expect(config.shop).toEqual(SHOP_DATA);
      expect(config.consent).toEqual(CONSENT_DATA);
    });
  });

  describe("CDN discovery (browser environment)", () => {
    it("assigns bus to window.Shopify.headless.analytics", () => {
      const bus = createTestBus();
      expect(window.Shopify?.headless?.analytics).toBe(bus);
      expect((window as any).headlessAnalytics).toBeUndefined();
      bus.destroy();
    });

    it("preserves existing window.Shopify state", () => {
      const customerPrivacy = { analyticsProcessingAllowed: () => true };
      (window as any).Shopify = {
        customerPrivacy,
        headless: { existing: "value" },
      };

      const bus = createTestBus();

      expect(window.Shopify?.customerPrivacy).toBe(customerPrivacy);
      expect((window.Shopify?.headless as any)?.existing).toBe("value");
      expect(window.Shopify?.headless?.analytics).toBe(bus);

      bus.destroy();
    });

    it("exposes the bus but does not load Shopify analytics when shopifyAnalytics: false", async () => {
      const bus = createTestBus({ shopifyAnalytics: false });

      expect(window.Shopify?.headless?.analytics).toBe(bus);
      expect((window as any).headlessAnalytics).toBeUndefined();
      await vi.dynamicImportSettled();
      expect(bootstrapMock).not.toHaveBeenCalled();

      bus.destroy();
    });

    it("cleans up window.Shopify.headless.analytics on destroy", () => {
      const bus = createTestBus();
      expect(window.Shopify?.headless?.analytics).toBe(bus);

      bus.destroy();
      expect(window.Shopify?.headless?.analytics).toBeUndefined();
    });

    it("does not clear another analytics bus on destroy", () => {
      const bus = createTestBus();
      const otherBus = createTestBus();
      const headless = window.Shopify?.headless;
      if (!headless) throw new Error("Expected Shopify headless namespace");
      headless.analytics = otherBus;

      bus.destroy();

      expect(window.Shopify?.headless?.analytics).toBe(otherBus);
      otherBus.destroy();
    });

    it("dynamically imports and bootstraps Shopify analytics", async () => {
      const bus = createTestBus();
      await vi.dynamicImportSettled();
      expect(bootstrapMock).toHaveBeenCalledWith(bus);
      bus.destroy();
    });

    it("does not call bootstrap after destroy", async () => {
      const bus = createTestBus();
      bus.destroy();
      await vi.dynamicImportSettled();
      expect(bootstrapMock).not.toHaveBeenCalled();
    });
  });

  describe("instance isolation", () => {
    it("creates independent bus instances with no shared state", () => {
      const busA = createTestBus();
      const busB = createTestBus();

      const callbackA = vi.fn();
      const callbackB = vi.fn();

      busA.subscribe("page_viewed", callbackA);
      busB.subscribe("page_viewed", callbackB);

      busA.publish("page_viewed", { url: "/a", shop: SHOP_DATA });

      expect(callbackA).toHaveBeenCalledOnce();
      expect(callbackB).not.toHaveBeenCalled();
    });

    it("destroying one bus does not affect another", () => {
      const busA = createTestBus();
      const busB = createTestBus();

      const callbackB = vi.fn();
      busB.subscribe("page_viewed", callbackB);

      busA.destroy();

      busB.publish("page_viewed", { url: "/b", shop: SHOP_DATA });
      expect(callbackB).toHaveBeenCalledOnce();

      busB.destroy();
    });
  });

  describe("destroy", () => {
    it("stops delivering events after destroy", () => {
      const bus = createTestBus();
      const callback = vi.fn();
      bus.subscribe("page_viewed", callback);

      bus.publish("page_viewed", { url: "/before", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();

      bus.destroy();

      bus.publish("page_viewed", { url: "/after", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe("backward-compat: page_viewed payload shape", () => {
    it("publishes page_viewed with shop, cart, and url", () => {
      const bus = createTestBus();
      const pageViewedEvent = vi.fn();

      bus.subscribe("page_viewed", pageViewedEvent);

      const payload = {
        shop: SHOP_DATA,
        cart: CART_DATA,
        prevCart: null,
        url: "http://localhost/example/path/1",
        customData: {},
      } as PageViewPayload & {
        cart: AnalyticsCart;
        prevCart: AnalyticsCart | null;
      };

      bus.publish("page_viewed", payload);

      expect(pageViewedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
          url: expect.any(String),
        }),
      );
    });
  });

  describe("backward-compat: cart events via updateCart", () => {
    it("publishes product_added_to_cart with cart and shop when quantity increases", () => {
      const bus = createTestBus();
      const productAddedToCartEvent = vi.fn();
      bus.subscribe("cart_updated", vi.fn());
      bus.subscribe("product_added_to_cart", productAddedToCartEvent);

      bus.updateCart(CART_DATA);

      productAddedToCartEvent.mockClear();

      bus.updateCart(CART_DATA_QUANTITY_INCREASED);

      expect(productAddedToCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });

    it("publishes product_removed_from_cart with cart and shop when line removed", () => {
      const bus = createTestBus();
      const productRemovedFromCartEvent = vi.fn();
      bus.subscribe("cart_updated", vi.fn());
      bus.subscribe("product_added_to_cart", vi.fn());
      bus.subscribe("product_removed_from_cart", productRemovedFromCartEvent);

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA_EMPTY);

      expect(productRemovedFromCartEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          cart: expect.any(Object),
          shop: SHOP_DATA,
        }),
      );
    });

    it("includes prevCart in cart_updated payload", () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe("cart_updated", cartUpdatedEvent);

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA_QUANTITY_INCREASED);

      const secondCall = cartUpdatedEvent.mock.calls[1][0];
      expect(secondCall.cart).toBe(CART_DATA_QUANTITY_INCREASED);
      expect(secondCall.prevCart).toBe(CART_DATA);
    });

    it("does not duplicate cart_updated on same updatedAt", () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe("cart_updated", cartUpdatedEvent);

      bus.updateCart(CART_DATA);
      bus.updateCart(CART_DATA);

      expect(cartUpdatedEvent).toHaveBeenCalledOnce();
    });

    it("deduplicates via localStorage across bus instances", () => {
      const bus = createTestBus();
      const cartUpdatedEvent = vi.fn();
      bus.subscribe("cart_updated", cartUpdatedEvent);

      bus.updateCart(CART_DATA);
      expect(cartUpdatedEvent).toHaveBeenCalledOnce();

      const bus2 = createTestBus();
      const cartUpdatedEvent2 = vi.fn();
      bus2.subscribe("cart_updated", cartUpdatedEvent2);

      bus2.updateCart(CART_DATA);
      expect(cartUpdatedEvent2).not.toHaveBeenCalled();
    });
  });
});
