// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { AnalyticsEvent } from "../events";
import type { StorefrontAnalytics, StorefrontAnalyticsDestination } from "../types";

const shopifyHandleEvent = vi.fn();
const perfkitHandleEvent = vi.fn();
const perfkitStartLoading = vi.fn();

vi.mock("./shopify-analytics", () => ({
  createShopifyAnalyticsProcessor: vi.fn(() => ({
    handleEvent: shopifyHandleEvent,
  })),
}));

vi.mock("./perfkit", () => ({
  createPerfKitProcessor: vi.fn(() => ({
    startLoading: perfkitStartLoading,
    handleEvent: perfkitHandleEvent,
  })),
}));

function createCdnBus() {
  const destinations: StorefrontAnalyticsDestination[] = [];
  return {
    destinations,
    bus: {
      getConfig: vi.fn(() => ({ shop: null, consent: {} })),
      addDestination: vi.fn((destination: StorefrontAnalyticsDestination) => {
        destinations.push(destination);
        return vi.fn();
      }),
    } as unknown as StorefrontAnalytics,
  };
}

describe("CDN entry", () => {
  beforeEach(() => {
    vi.resetModules();
    shopifyHandleEvent.mockClear();
    perfkitHandleEvent.mockClear();
    perfkitStartLoading.mockClear();
    delete (window as any).Shopify;
  });

  afterEach(() => {
    delete (window as any).Shopify;
  });

  it("registers Shopify analytics as a destination from window.Shopify.headless.analytics", async () => {
    const { bus, destinations } = createCdnBus();
    (window as any).Shopify = { headless: { analytics: bus } };

    await import("./entry");

    expect(bus.addDestination).toHaveBeenCalledOnce();
    expect(destinations[0]?.name).toBe("shopify-analytics");
  });

  it("subscribes Shopify analytics and PerfKit processors to known analytics events", async () => {
    const { bus, destinations } = createCdnBus();
    const subscriptions = new Map<string, (payload: any) => void>();
    (window as any).Shopify = { headless: { analytics: bus } };

    await import("./entry");

    destinations[0]?.setup({
      getConfig: bus.getConfig,
      subscribe: (event, callback) => {
        subscriptions.set(event, callback);
        return vi.fn();
      },
    });

    expect(perfkitStartLoading).not.toHaveBeenCalled();

    const pageViewed = subscriptions.get(AnalyticsEvent.PAGE_VIEWED);
    expect(pageViewed).toBeDefined();
    pageViewed?.({ url: "/" });

    expect(perfkitStartLoading).toHaveBeenCalledOnce();
    expect(shopifyHandleEvent).toHaveBeenCalledWith(AnalyticsEvent.PAGE_VIEWED, { url: "/" });
    expect(perfkitHandleEvent).toHaveBeenCalledWith(AnalyticsEvent.PAGE_VIEWED, { url: "/" });
  });

  it("waits until DOMContentLoaded when the bus is not available yet", async () => {
    const { bus } = createCdnBus();
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "loading",
    });

    await import("./entry");
    expect(bus.addDestination).not.toHaveBeenCalled();

    (window as any).Shopify = { headless: { analytics: bus } };
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(bus.addDestination).toHaveBeenCalledOnce();
  });

  it("logs an error when DOMContentLoaded fires without a bus", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(document, "readyState", {
      configurable: true,
      value: "loading",
    });

    await import("./entry");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(errorSpy).toHaveBeenCalledWith(
      "[h3] Analytics bus was not initialized before Shopify analytics setup.",
    );
    errorSpy.mockRestore();
  });
});
