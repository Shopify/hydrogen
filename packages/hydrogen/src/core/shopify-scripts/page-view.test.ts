// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as StandardEventsModule from "../../../vendor/standard-events";
import { assert } from "../test-utils";
import { SHOPIFY_PERF_KIT_SCRIPT_ID } from "./constants";
import { initializeShopifyPageViewEvents } from "./page-view";

class TestPageViewEvent extends Event {
  page: { template: string; title: string; url: string };

  constructor({ page }: { page: TestPageViewEvent["page"] }) {
    super("shopify:page:view");
    this.page = page;
  }
}

const importStandardEvents = vi.fn(async () => ({
  PageViewEvent: TestPageViewEvent as typeof StandardEventsModule.PageViewEvent,
}));
let cleanup: (() => void) | undefined;
let pageViews: TestPageViewEvent[];
let readyState: DocumentReadyState;

function collectPageView(event: Event) {
  pageViews.push(event as TestPageViewEvent);
}

function initialize() {
  cleanup = initializeShopifyPageViewEvents(importStandardEvents);
}

async function flushPageViews() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("Shopify page view events", () => {
  beforeEach(() => {
    importStandardEvents.mockClear();
    pageViews = [];
    readyState = "complete";
    document.addEventListener("shopify:page:view", collectPageView);
    vi.spyOn(document, "readyState", "get").mockImplementation(() => readyState);
    document.head.innerHTML = "";
    document.title = "Hydrogen";
    window.history.replaceState({}, "", "/");
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    (window as any).Shopify = {
      routes: {
        root: "/",
        match: vi.fn((url: string) =>
          new URL(url, window.location.origin).pathname === "/"
            ? { route: "index" as const, pageTemplateName: "index" as const, params: {} }
            : null,
        ),
      },
    };
    delete (window as any).navigation;
  });

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.removeEventListener("shopify:page:view", collectPageView);
    vi.restoreAllMocks();
  });

  it("emits the initial root page as index and configures PerfKit", async () => {
    readyState = "loading";
    const perfKit = document.createElement("script");
    perfKit.id = SHOPIFY_PERF_KIT_SCRIPT_ID;
    document.head.append(perfKit);

    initialize();
    expect(pageViews).toHaveLength(0);
    expect(perfKit.dataset.pageType).toBe("index");

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPageViews();

    expect(pageViews).toHaveLength(1);
    expect(pageViews[0]?.page).toEqual({
      template: "index",
      title: "Hydrogen",
      url: window.location.href,
    });
  });

  it("uses the matched Shopify route for SPA page views", async () => {
    const shopify = window.Shopify;
    assert(shopify, "Expected Shopify globals to be configured");
    shopify.routes.match = vi.fn((url: string) =>
      url.includes("/products/")
        ? {
            route: "productInCollection" as const,
            pageTemplateName: "product" as const,
            params: { collectionHandle: "winter", productHandle: "snowboard" },
            standardPathname: "/collections/winter/products/snowboard",
            templates: {
              standard: "/collections/:collectionHandle/products/:productHandle",
              custom: "/collections/:collectionHandle/products/:productHandle",
            },
          }
        : null,
    );
    initialize();
    await flushPageViews();
    pageViews.length = 0;

    document.title = "Snowboard";
    window.history.pushState({}, "", "/products/snowboard");
    await flushPageViews();

    expect(pageViews).toHaveLength(1);
    expect(pageViews[0]?.page).toEqual({
      template: "product",
      title: "Snowboard",
      url: window.location.href,
    });
  });

  it("prefers Navigation API currententrychange events when available", async () => {
    const navigation = new EventTarget();
    Object.defineProperty(window, "navigation", { configurable: true, value: navigation });
    initialize();
    await flushPageViews();
    pageViews.length = 0;

    window.history.pushState({}, "", "/next");
    navigation.dispatchEvent(new Event("currententrychange"));
    await flushPageViews();

    expect(pageViews).toHaveLength(1);
    expect(pageViews[0]?.page.template).toBe("unknown");
  });

  it("ignores state and hash-only history changes", async () => {
    initialize();
    await flushPageViews();
    pageViews.length = 0;

    window.history.replaceState({ state: true }, "", window.location.href);
    window.history.pushState({}, "", "/#details");
    await flushPageViews();

    expect(pageViews).toHaveLength(0);
  });

  it("initializes only once", () => {
    initialize();
    const firstCleanup = cleanup;
    initialize();

    expect(cleanup).toBe(firstCleanup);
    expect(importStandardEvents).toHaveBeenCalledTimes(1);
  });
});
