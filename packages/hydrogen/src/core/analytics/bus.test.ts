// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  CONSENT_TRACKING_API_LOADED_EVENT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts";
import { assert } from "../test-utils";
import { setupStorefrontAnalytics } from "./bus";
import type {
  StorefrontAnalyticsConfig,
  ShopAnalytics,
  AnalyticsCart,
  PageViewPayload,
} from "./types";

const SHOP_DATA: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  channel: "hydrogen",
  storefrontId: "0",
};

const CONSENT_DATA = {};
const DESTINATION_CONTEXT = { getTrackingValues: expect.any(Function) };

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

function grantAnalyticsConsent() {
  (window as any).Shopify = {
    customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => true },
  };
}

const testCleanups: Array<() => void> = [];

function createTestBus(overrides: Partial<StorefrontAnalyticsConfig> = {}) {
  const instance = setupStorefrontAnalytics({
    shop: SHOP_DATA,
    consent: CONSENT_DATA,
    ...overrides,
  } as StorefrontAnalyticsConfig);
  testCleanups.push(instance.destroy);
  return instance;
}

describe("setupStorefrontAnalytics", () => {
  beforeEach(() => {
    installLocalStorageShim();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    delete (window as any).Shopify;
    delete (window as any).privacyBanner;
  });

  afterEach(() => {
    for (const cleanup of testCleanups.splice(0)) cleanup();
    delete (window as any).Shopify;
    delete (window as any).privacyBanner;
  });

  describe("destination tracking values", () => {
    it("reads current tokens for each destination with its own Hydrogen tag", () => {
      const uniqueToken = vi.fn(() => "unique");
      const visitToken = vi.fn(() => "visit");
      const privacy = {
        consentStatus: "loaded",
        analyticsProcessingAllowed: () => true,
        __internal: { uniqueToken, visitToken },
      };
      (window as any).Shopify = { customerPrivacy: privacy };
      const { bus } = createTestBus();
      const received = vi.fn();

      for (const name of ["shopify-analytics", "ga4"]) {
        bus.addDestination({
          name,
          setup({ subscribe }) {
            subscribe("page_viewed", (payload, { getTrackingValues }) => {
              received(name, payload.url, getTrackingValues());
            });
          },
        });
      }

      expect(uniqueToken).not.toHaveBeenCalled();
      expect(visitToken).not.toHaveBeenCalled();
      bus.publish("page_viewed", { url: "/first" });

      const updatedUniqueToken = vi.fn(() => "updated-unique");
      const updatedVisitToken = vi.fn(() => "updated-visit");
      privacy.__internal = { uniqueToken: updatedUniqueToken, visitToken: updatedVisitToken };
      bus.publish("page_viewed", { url: "/second" });

      expect(received.mock.calls).toEqual([
        ["shopify-analytics", "/first", { uniqueToken: "unique", visitToken: "visit" }],
        ["ga4", "/first", { uniqueToken: "unique", visitToken: "visit" }],
        [
          "shopify-analytics",
          "/second",
          { uniqueToken: "updated-unique", visitToken: "updated-visit" },
        ],
        ["ga4", "/second", { uniqueToken: "updated-unique", visitToken: "updated-visit" }],
      ]);
      for (const getter of [uniqueToken, visitToken, updatedUniqueToken, updatedVisitToken]) {
        expect(getter.mock.calls).toEqual([
          [{ generateFallback: true, tag: "hydrogen:shopify-analytics" }],
          [{ generateFallback: true, tag: "hydrogen:ga4" }],
        ]);
      }
    });

    it("reads buffered event tokens only after consent is loaded and analytics is allowed", () => {
      const uniqueToken = vi.fn(() => "ready-unique");
      const visitToken = vi.fn(() => "ready-visit");
      const privacy = {
        consentStatus: "loading",
        analyticsProcessingAllowed: () => true,
        __internal: { uniqueToken, visitToken },
      };
      (window as any).Shopify = { customerPrivacy: privacy };
      const { bus } = createTestBus();
      const received = vi.fn();
      bus.addDestination({
        name: "shopify-analytics",
        setup({ subscribe }) {
          subscribe("page_viewed", (payload, { getTrackingValues }) => {
            received(payload.url, getTrackingValues());
          });
        },
      });

      bus.publish("page_viewed", { url: "/buffered" });
      expect(uniqueToken).not.toHaveBeenCalled();
      expect(visitToken).not.toHaveBeenCalled();

      privacy.consentStatus = "loaded";
      privacy.analyticsProcessingAllowed = () => false;
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));
      expect(uniqueToken).not.toHaveBeenCalled();
      expect(visitToken).not.toHaveBeenCalled();

      privacy.analyticsProcessingAllowed = () => true;
      document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
      expect(received).toHaveBeenCalledExactlyOnceWith("/buffered", {
        uniqueToken: "ready-unique",
        visitToken: "ready-visit",
      });
      for (const getter of [uniqueToken, visitToken]) {
        expect(getter).toHaveBeenCalledExactlyOnceWith({
          generateFallback: true,
          tag: "hydrogen:shopify-analytics",
        });
      }

      privacy.analyticsProcessingAllowed = () => false;
      document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));
      bus.publish("page_viewed", { url: "/declined" });
      expect(uniqueToken).toHaveBeenCalledOnce();
      expect(visitToken).toHaveBeenCalledOnce();
      expect(received).toHaveBeenCalledOnce();
    });

    it("returns empty tokens from a retained getter after consent is revoked", () => {
      const uniqueToken = vi.fn(() => "unique");
      const visitToken = vi.fn(() => "visit");
      const privacy = {
        consentStatus: "loaded",
        analyticsProcessingAllowed: () => true,
        __internal: { uniqueToken, visitToken },
      };
      (window as any).Shopify = { customerPrivacy: privacy };
      const { bus } = createTestBus();
      let retainedGetter: (() => unknown) | undefined;
      bus.addDestination({
        name: "retaining",
        setup({ subscribe }) {
          subscribe("page_viewed", (_payload, { getTrackingValues }) => {
            retainedGetter = getTrackingValues;
          });
        },
      });
      bus.publish("page_viewed", { url: "/first" });

      assert(retainedGetter, "expected destination to receive the getter");
      expect(retainedGetter()).toEqual({ uniqueToken: "unique", visitToken: "visit" });
      expect(uniqueToken).toHaveBeenCalledOnce();
      expect(visitToken).toHaveBeenCalledOnce();

      privacy.analyticsProcessingAllowed = () => false;
      document.dispatchEvent(new Event(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(retainedGetter()).toEqual({ uniqueToken: "", visitToken: "" });
      expect(uniqueToken).toHaveBeenCalledOnce();
      expect(visitToken).toHaveBeenCalledOnce();
    });

    it("does not request tokens when destinations ignore the getter", () => {
      const uniqueToken = vi.fn();
      const visitToken = vi.fn();
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loaded",
          analyticsProcessingAllowed: () => true,
          __internal: { uniqueToken, visitToken },
        },
      };
      const { bus } = createTestBus();
      const received = vi.fn();
      bus.addDestination({
        name: "observer",
        setup({ subscribe }) {
          subscribe("page_viewed", (payload) => received(payload.url));
        },
      });
      bus.publish("page_viewed", { url: "/observed" });

      expect(received).toHaveBeenCalledExactlyOnceWith("/observed");
      expect(uniqueToken).not.toHaveBeenCalled();
      expect(visitToken).not.toHaveBeenCalled();
    });
  });

  describe("publishing", () => {
    beforeEach(grantAnalyticsConsent);

    it("defaults the payload shop from the bus config when omitted", () => {
      const { bus } = createTestBus();
      const callback = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });

      bus.publish("page_viewed", { url: "/test" });

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ shop: SHOP_DATA }),
        DESTINATION_CONTEXT,
      );
    });

    it("normalizes configured shop IDs before publishing", () => {
      const { bus } = createTestBus({
        shop: {
          shopId: "2",
          channel: "hydrogen",
          storefrontId: "sub-2",
        },
      });
      const callback = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });
      bus.publish("page_viewed", { url: "/test" });

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          shop: {
            shopId: "gid://shopify/Shop/2",
            channel: "hydrogen",
            storefrontId: "sub-2",
          },
        }),
        DESTINATION_CONTEXT,
      );
    });

    it("publishes page views without an explicit payload", () => {
      const { bus } = createTestBus();
      const callback = vi.fn();
      window.history.pushState({}, "", "/optional-payload");

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });
      bus.publish("page_viewed");

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ shop: SHOP_DATA, url: window.location.href }),
        DESTINATION_CONTEXT,
      );
    });

    it("normalizes an explicit payload shop override", () => {
      const explicitShop = {
        ...SHOP_DATA,
        shopId: "2",
      };
      const { bus } = createTestBus();
      const callback = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });

      bus.publish("page_viewed", { url: "/test", shop: explicitShop });

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          shop: {
            ...explicitShop,
            shopId: "gid://shopify/Shop/2",
          },
        }),
        DESTINATION_CONTEXT,
      );
    });

    it("infers the current browser URL for view events when omitted", () => {
      const { bus } = createTestBus();
      const callback = vi.fn();
      window.history.pushState({}, "", "/collections/all?sort=title#grid");

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("collection_viewed", callback);
        },
      });
      bus.publish("collection_viewed", {
        collection: { id: "gid://shopify/Collection/1", handle: "all" },
      });

      expect(callback).toHaveBeenCalledOnce();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ url: window.location.href }),
        DESTINATION_CONTEXT,
      );
    });

    it("warns and drops unsupported publish events", () => {
      const { bus } = createTestBus();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const callback = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });
      bus.publish("custom_my_event" as never, { shop: SHOP_DATA } as never);

      expect(callback).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[hydrogen:warn:analytics] unsupported analytics event "custom_my_event"',
      );
      warnSpy.mockRestore();
    });
  });

  describe("destinations", () => {
    it("delivers live events to destinations when analytics consent is granted", () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      bus.publish("page_viewed", { url: "/live", shop: SHOP_DATA });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/live" }),
        DESTINATION_CONTEXT,
      );
    });

    it("buffers destination events until analytics consent is granted", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
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
      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/buffered" }),
        DESTINATION_CONTEXT,
      );
    });

    it("buffers destination events while consent status is loading", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loading", analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/pending", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/pending" }),
        DESTINATION_CONTEXT,
      );
    });

    it("snapshots inferred URLs before destination replay", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();
      window.history.pushState({}, "", "/before-consent");
      const publishedUrl = window.location.href;

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", {});
      window.history.pushState({}, "", "/after-consent");

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: publishedUrl }),
        DESTINATION_CONTEXT,
      );
    });

    it("replays buffered events to destinations added after consent is granted", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/early", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/early" }),
        DESTINATION_CONTEXT,
      );
    });

    it("replays buffered events when initial consent is ready", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/ready", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/ready" }),
        DESTINATION_CONTEXT,
      );
    });

    it("waits for interaction before replaying default banner events when the banner is required", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => true,
        },
      };
      (window as any).privacyBanner = {};

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "default-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/blocked-initial", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).not.toHaveBeenCalled();

      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/blocked-initial" }),
        DESTINATION_CONTEXT,
      );
    });

    it("recognizes default banner mode before the privacy banner global is assigned", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => true,
        },
      };

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "default-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/before-banner-global", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).not.toHaveBeenCalled();
    });

    it("catches up on initial readiness that fired before the bus attached", async () => {
      // Consent is already loaded and the readiness event has passed, so the bus
      // must reconcile the default-banner gate on setup instead of missing it.
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loaded",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => true,
        },
      };

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "default-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/missed-readiness", shop: SHOP_DATA });

      // Without the catch-up the pre-interaction gate would stay open and leak this event.
      expect(destination).not.toHaveBeenCalled();

      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/missed-readiness" }),
        DESTINATION_CONTEXT,
      );
    });

    it("waits for interaction when privacy-banner is present without explicit mode", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => true,
        },
      };
      (window as any).privacyBanner = {};

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/privacy-banner-runtime", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).not.toHaveBeenCalled();
    });

    it("does not wait for interaction in custom banner mode", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => true,
        },
      };

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "custom-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/custom-banner-initial", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/custom-banner-initial" }),
        DESTINATION_CONTEXT,
      );
    });

    it("replays default banner initial events when no banner interaction is required", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => false,
        },
      };
      (window as any).privacyBanner = {};

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "default-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/allowed-initial", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/allowed-initial" }),
        DESTINATION_CONTEXT,
      );
    });

    it("replays default banner initial events when consent was already collected", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loading",
          analyticsProcessingAllowed: () => true,
          shouldShowGDPRBanner: () => false,
        },
      };
      (window as any).privacyBanner = {};

      const { bus } = createTestBus({ consent: { ...CONSENT_DATA, mode: "default-banner" } });
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/prior-consent", shop: SHOP_DATA });

      (window as any).Shopify.customerPrivacy.consentStatus = "loaded";
      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/prior-consent" }),
        DESTINATION_CONTEXT,
      );
    });

    it("does not clear buffered events when initial consent becomes ready while tracking is blocked", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/pending", shop: SHOP_DATA });

      document.dispatchEvent(new Event(CONSENT_TRACKING_API_LOADED_EVENT));

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/pending" }),
        DESTINATION_CONTEXT,
      );
    });

    it("does not replay buffered events after explicit analytics consent denial", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.publish("page_viewed", { url: "/denied", shop: SHOP_DATA });

      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      (window as any).Shopify.customerPrivacy.analyticsProcessingAllowed = () => true;
      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
    });

    it("blocks destinations when the visitor explicitly declined analytics", async () => {
      (window as any).Shopify = {
        customerPrivacy: {
          consentStatus: "loaded",
          analyticsProcessingAllowed: () => true,
          currentVisitorConsent: () => ({ analytics: "no" }),
        },
      };

      const { bus } = createTestBus();
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      bus.publish("page_viewed", { url: "/explicit-denial", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();
    });

    it("replays custom events to destinations", () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const destination = vi.fn();

      bus.publish("custom_my_event" as never, { shop: SHOP_DATA } as never);
      bus.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[hydrogen:warn:analytics] unsupported analytics event "custom_my_event"',
      );
      warnSpy.mockRestore();
    });

    it("warns and ignores unsupported destination subscriptions", () => {
      (window as any).Shopify = {
        customerPrivacy: { analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const destination = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("custom_my_event" as never, destination as never);
        },
      });
      bus.publish("page_viewed", { url: "/live", shop: SHOP_DATA });

      expect(destination).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        '[hydrogen:warn:analytics] unsupported analytics event "custom_my_event"',
      );
      warnSpy.mockRestore();
    });

    it("replays each buffered event to a destination only once", async () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => false },
      };

      const { bus } = createTestBus();
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
      document.dispatchEvent(new CustomEvent(VISITOR_CONSENT_COLLECTED_EVENT));

      expect(destination).toHaveBeenCalledTimes(2);
      expect(destination).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ url: "/one" }),
        DESTINATION_CONTEXT,
      );
      expect(destination).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ url: "/two" }),
        DESTINATION_CONTEXT,
      );
    });

    it("cleans up destination subscriptions", () => {
      (window as any).Shopify = {
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
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
        customerPrivacy: { consentStatus: "loaded", analyticsProcessingAllowed: () => true },
      };

      const { bus } = createTestBus();
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

  describe("getConfig", () => {
    it("returns current bus configuration", () => {
      const { bus } = createTestBus();
      const config = bus.getConfig();

      expect(config.shop).toEqual(SHOP_DATA);
      expect(config.consent).toEqual(CONSENT_DATA);
    });
  });

  describe("global attachment (browser environment)", () => {
    it("assigns bus to window.Shopify.analytics", () => {
      const { bus } = createTestBus();
      expect(window.Shopify?.analytics).toBe(bus);
      expect((window.Shopify as any)?.["headless"]).toBeUndefined();
      expect((window as any).headlessAnalytics).toBeUndefined();
    });

    it("preserves existing window.Shopify state", () => {
      const customerPrivacy = { analyticsProcessingAllowed: () => true };
      (window as any).Shopify = {
        customerPrivacy,
        existing: "value",
      };

      const { bus } = createTestBus();

      expect(window.Shopify?.customerPrivacy).toBe(customerPrivacy);
      expect((window.Shopify as any)?.existing).toBe("value");
      expect(window.Shopify?.analytics).toBe(bus);
    });

    it("cleans up window.Shopify.analytics on internal teardown", () => {
      const { bus, destroy } = createTestBus();
      expect(window.Shopify?.analytics).toBe(bus);

      destroy();
      expect(window.Shopify?.analytics).toBeUndefined();
    });

    it("throws when a bus is already initialized", () => {
      createTestBus();

      expect(() => createTestBus()).toThrow("Analytics bus already initialized");
    });

    it("allows re-initialization after internal teardown", () => {
      const { destroy } = createTestBus();
      destroy();

      const { bus: newBus } = createTestBus();
      expect(window.Shopify?.analytics).toBe(newBus);
    });
  });

  describe("instance isolation", () => {
    beforeEach(grantAnalyticsConsent);

    it("re-created bus after internal teardown has independent state", () => {
      const { bus: busA, destroy } = createTestBus();
      const callbackA = vi.fn();
      busA.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callbackA);
        },
      });
      destroy();

      const { bus: busB } = createTestBus();
      const callbackB = vi.fn();
      busB.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callbackB);
        },
      });

      busB.publish("page_viewed", { url: "/b", shop: SHOP_DATA });

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalledOnce();
    });
  });

  describe("internal teardown", () => {
    beforeEach(grantAnalyticsConsent);

    it("stops delivering events after teardown", () => {
      const { bus, destroy } = createTestBus();
      const callback = vi.fn();
      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", callback);
        },
      });

      bus.publish("page_viewed", { url: "/before", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();

      destroy();

      bus.publish("page_viewed", { url: "/after", shop: SHOP_DATA });
      expect(callback).toHaveBeenCalledOnce();
    });
  });

  describe("backward-compat: page_viewed payload shape", () => {
    beforeEach(grantAnalyticsConsent);

    it("publishes page_viewed with shop, cart, and url", () => {
      const { bus } = createTestBus();
      const pageViewedEvent = vi.fn();

      bus.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", pageViewedEvent);
        },
      });

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
        DESTINATION_CONTEXT,
      );
    });
  });
});
