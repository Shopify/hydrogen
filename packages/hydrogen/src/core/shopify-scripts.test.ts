// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  getShopifyScriptTags,
  getShopifyGlobal,
  getShopifyGlobalBootstrapScript,
  initializeShopifyScripts,
  loadShopifyWebMcpTools,
  renderShopifyScriptTag,
  renderShopifyScriptTags,
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
  SHOPIFY_STOREFRONT_WEBMCP_SCRIPT,
} from "./shopify-scripts/index";
import { createShopifyRouteTemplates } from "./standard-routes/index";
import { assert } from "./test-utils";
import { loadScript } from "./utils/load-script";

vi.mock("./utils/load-script", () => ({
  loadScript: vi.fn(() => Promise.resolve(true)),
}));

function getShopifyRoutesRoot() {
  return (window.Shopify?.routes as { root?: string } | undefined)?.root;
}

const TEST_SHOP_GID = "gid://shopify/Shop/42";
const TEST_SHOP_ID = "42";
const TEST_STOREFRONT_ID = "sub-1";
const TEST_RESOURCE_TIMING_SAMPLING_RATE = "10";

describe("shopify scripts", () => {
  const emptyRouteTemplates = createShopifyRouteTemplates({});

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(loadScript).mockResolvedValue(true);
    vi.unstubAllGlobals();
    delete (window as any).Shopify;
    delete (document as any).modelContext;
    delete (navigator as any).modelContext;
    delete (window as any).PerfKit;
    Reflect.deleteProperty(window, Symbol.for("shopify.webmcp.registered"));
    document.head.innerHTML = "";
    setDocumentReadyState("complete");
    document.body.innerHTML = "";
  });

  it("creates the Shopify global without replacing existing state", () => {
    (window as any).Shopify = { existing: "value" };

    const shopify = getShopifyGlobal();

    expect(shopify).toBe(window.Shopify);
    expect((window.Shopify as any)?.existing).toBe("value");
  });

  it("does not read window outside the browser", () => {
    const originalWindow = globalThis.window;

    try {
      delete (globalThis as any).window;

      expect(getShopifyGlobal()).toBeUndefined();
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  it("sets Shopify navigation hooks", async () => {
    const navigate = vi.fn();

    await initializeShopifyScripts({ navigate, routes: emptyRouteTemplates, webMcp: false });

    window.Shopify?.navigate?.("/products/snowboard");

    expect(navigate).toHaveBeenCalledWith("/products/snowboard");
    expect(window.Shopify?.routes.match?.("/products/snowboard")).toEqual({
      route: "product",
      params: { productHandle: "snowboard" },
    });
    expect(window.Shopify?.routes.resolve?.("/products/snowboard")).toBe("/products/snowboard");
  });

  it("sets Shopify navigation without replacing existing route state", async () => {
    (window as any).Shopify = { routes: { existing: "value" } };
    const navigate = vi.fn();

    await initializeShopifyScripts({ navigate, routes: emptyRouteTemplates, webMcp: false });

    expect(window.Shopify?.navigate).toEqual(expect.any(Function));
    expect((window.Shopify?.routes as any)?.existing).toBe("value");
  });

  it("resolves Shopify standard routes before navigating", async () => {
    const navigate = vi.fn();
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    (window as any).Shopify = {
      routes: {
        root: "/fr-ca/",
      },
    };

    await initializeShopifyScripts({ navigate, routes: routeTemplates, webMcp: false });

    const shopifyNavigate = window.Shopify?.navigate;
    assert(shopifyNavigate, "Expected Shopify.navigate to be configured.");
    shopifyNavigate("/fr-ca/products/snowboard?variant=1#reviews");

    expect(navigate).toHaveBeenCalledWith("/fr-ca/p/snowboard?variant=1#reviews");
  });

  it("sets Shopify standard route resolver from route templates", async () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    (window as any).Shopify = {
      routes: {
        root: "/fr-ca/",
      },
    };

    await initializeShopifyScripts({ routes: routeTemplates, webMcp: false });

    expect(window.Shopify?.routes.resolve?.("/fr-ca/products/snowboard?variant=1#reviews")).toBe(
      "/fr-ca/p/snowboard?variant=1#reviews",
    );
    expect(window.Shopify?.routes.match?.("/fr-ca/p/snowboard?variant=1#reviews")).toEqual({
      route: "product",
      params: { productHandle: "snowboard" },
    });
    expect(
      (window.Shopify?.routes as Record<string, unknown> | undefined)?.templates,
    ).toBeUndefined();
  });

  it("initializes routing and WebMCP loading for custom framework integrations", async () => {
    const navigate = vi.fn();
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    (window as any).Shopify = {
      routes: {
        root: "/",
      },
    };
    (navigator as any).modelContext = { registerTool: vi.fn() };

    await expect(initializeShopifyScripts({ navigate, routes: routeTemplates })).resolves.toBe(
      true,
    );

    window.Shopify?.navigate?.("/products/snowboard");
    expect(navigate).toHaveBeenCalledWith("/p/snowboard");
    expect(loadScript).toHaveBeenCalledWith(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT, {
      in: "head",
      attributes: { crossorigin: "anonymous" },
    });
  });

  it("initializes routing without WebMCP when disabled", async () => {
    const navigate = vi.fn();
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });
    (window as any).Shopify = {
      routes: {
        root: "/",
      },
    };
    (navigator as any).modelContext = { registerTool: vi.fn() };

    await expect(
      initializeShopifyScripts({ navigate, routes: routeTemplates, webMcp: false }),
    ).resolves.toBeUndefined();

    window.Shopify?.navigate?.("/products/snowboard");
    expect(navigate).toHaveBeenCalledWith("/p/snowboard");
    expect(loadScript).not.toHaveBeenCalled();
  });

  it("builds a bootstrap script for i18n globals", () => {
    const script = getShopifyGlobalBootstrapScript({
      i18n: { country: "CA", language: "FR", pathPrefix: "/fr-ca" },
    });

    (0, eval)(script);

    expect(window.Shopify?.country).toBe("CA");
    expect(window.Shopify?.locale).toBe("fr");
    expect(getShopifyRoutesRoot()).toBe("/fr-ca/");
  });

  it("falls back to US country, en locale, and root route", () => {
    const script = getShopifyGlobalBootstrapScript({});

    (0, eval)(script);

    expect(window.Shopify?.country).toBe("US");
    expect(window.Shopify?.locale).toBe("en");
    expect(getShopifyRoutesRoot()).toBe("/");
  });

  it("escapes serialized data for inline script safety", () => {
    const script = getShopifyGlobalBootstrapScript({
      // @ts-expect-error Intentionally validates unsafe runtime input serialization.
      i18n: { country: "</script>", language: "EN" },
    });

    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script>");
  });

  it("builds script tag descriptors for the Shopify runtime", () => {
    const descriptors = getShopifyScriptTags({
      i18n: { country: "US", language: "EN" },
      nonce: "test-nonce",
    });

    expect(descriptors.tags).toEqual([
      {
        tagName: "link",
        attributes: {
          rel: "preconnect",
          href: SHOPIFY_CDN_ORIGIN,
        },
      },
      {
        tagName: "link",
        attributes: {
          rel: "preconnect",
          href: SHOPIFY_SHOP_APP_ORIGIN,
        },
      },
      {
        tagName: "link",
        attributes: {
          rel: "prefetch",
          as: "script",
          href: SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
          crossorigin: "anonymous",
        },
      },
      {
        tagName: "script",
        attributes: { nonce: "test-nonce" },
        innerHTML: expect.stringContaining('"country":"US"'),
      },
      {
        tagName: "script",
        attributes: {
          src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
          type: "module",
          crossorigin: "anonymous",
          nonce: "test-nonce",
        },
      },
    ]);
    expect(descriptors.links).toEqual([
      {
        tagName: "link",
        attributes: {
          rel: "preconnect",
          href: SHOPIFY_CDN_ORIGIN,
        },
      },
      {
        tagName: "link",
        attributes: {
          rel: "preconnect",
          href: SHOPIFY_SHOP_APP_ORIGIN,
        },
      },
      {
        tagName: "link",
        attributes: {
          rel: "prefetch",
          as: "script",
          href: SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT,
          crossorigin: "anonymous",
        },
      },
    ]);
    expect(descriptors.scripts).toEqual([
      {
        tagName: "script",
        attributes: { nonce: "test-nonce" },
        innerHTML: expect.stringContaining('"country":"US"'),
      },
      {
        tagName: "script",
        attributes: {
          src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
          type: "module",
          crossorigin: "anonymous",
          nonce: "test-nonce",
        },
      },
    ]);
    expect(descriptors.scripts[0]?.innerHTML).not.toContain('"templates"');
  });

  it("does not include WebMCP in SSR descriptors", () => {
    const descriptors = getShopifyScriptTags({});

    expect(descriptors.scripts).toHaveLength(2);
    expect(descriptors.tags).not.toContainEqual(
      expect.objectContaining({
        innerHTML: expect.stringContaining(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT),
      }),
    );
  });

  it("includes PerfKit when configured", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_GID,
        storefrontId: TEST_STOREFRONT_ID,
      },
    });

    expect(descriptors.scripts).toContainEqual({
      tagName: "script",
      attributes: {
        id: "perfkit",
        async: true,
        src: SHOPIFY_PERF_KIT_SCRIPT,
        "data-application": "hydrogen",
        "data-shop-id": TEST_SHOP_ID,
        "data-storefront-id": TEST_STOREFRONT_ID,
        "data-monorail-region": "global",
        "data-spa-mode": "true",
        "data-resource-timing-sampling-rate": TEST_RESOURCE_TIMING_SAMPLING_RATE,
      },
    });
    expect(getPerfKitBridgeScript(descriptors.scripts)?.innerHTML).toContain(
      "initPerfKitSpaBridge",
    );
    expect(
      renderShopifyScriptTags({
        shop: { shopId: TEST_SHOP_ID, storefrontId: TEST_STOREFRONT_ID },
      }).join("\n"),
    ).toContain(`<script id="perfkit" async src="${SHOPIFY_PERF_KIT_SCRIPT}"`);
  });

  it("accepts numeric PerfKit shop IDs", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
      },
    });

    expect(descriptors.scripts).toContainEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          "data-shop-id": TEST_SHOP_ID,
        }),
      }),
    );
  });

  it("resolves without loading WebMCP without model context", async () => {
    await expect(loadShopifyWebMcpTools()).resolves.toBeUndefined();

    expect(loadScript).not.toHaveBeenCalled();
  });

  it("loads the WebMCP CDN script with model context", async () => {
    (navigator as any).modelContext = { registerTool: vi.fn() };

    await expect(loadShopifyWebMcpTools()).resolves.toBe(true);

    expect(loadScript).toHaveBeenCalledWith(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT, {
      in: "head",
      attributes: { crossorigin: "anonymous" },
    });
  });

  it("skips PerfKit when the shop ID has no numeric segment", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: "gid://shopify/Shop/not-a-number",
        storefrontId: TEST_STOREFRONT_ID,
      },
    });

    expect(descriptors.scripts).not.toContainEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          id: "perfkit",
        }),
      }),
    );
  });

  it("registers the PerfKit SPA bridge when the analytics bus is available at DOMContentLoaded", () => {
    setDocumentReadyState("loading");
    const addDestination = vi.fn();
    const descriptors = getShopifyScriptTags({
      shop: { shopId: TEST_SHOP_ID, storefrontId: TEST_STOREFRONT_ID },
    });
    const bridgeScript = getPerfKitBridgeScript(descriptors.scripts);
    assert(bridgeScript?.innerHTML, "Expected ShopifyScripts to include the PerfKit bridge script");

    (0, eval)(bridgeScript.innerHTML);
    expect(addDestination).not.toHaveBeenCalled();

    (window as any).Shopify = { analytics: { addDestination } };
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(addDestination).toHaveBeenCalledOnce();
    expect(addDestination.mock.calls[0]?.[0]?.name).toBe("perfkit-spa-bridge");
  });

  it("forwards bridged analytics events to PerfKit", () => {
    const addDestination = vi.fn();
    const subscriptions = new Map<string, (payload: unknown) => void>();
    (window as any).Shopify = { analytics: { addDestination } };
    (window as any).PerfKit = {
      navigate: vi.fn(),
      setPageType: vi.fn(),
    };
    const descriptors = getShopifyScriptTags({
      shop: { shopId: TEST_SHOP_ID, storefrontId: TEST_STOREFRONT_ID },
    });
    const bridgeScript = getPerfKitBridgeScript(descriptors.scripts);
    assert(bridgeScript?.innerHTML, "Expected ShopifyScripts to include the PerfKit bridge script");

    (0, eval)(bridgeScript.innerHTML);
    const destination = addDestination.mock.calls[0]?.[0];
    assert(destination, "Expected the bridge to register a destination");
    destination.setup({
      subscribe: (event: string, callback: (payload: unknown) => void) => {
        subscriptions.set(event, callback);
        return vi.fn();
      },
    });

    subscriptions.get("page_viewed")?.({});
    subscriptions.get("product_viewed")?.({});
    subscriptions.get("collection_viewed")?.({});
    subscriptions.get("search_viewed")?.({});
    subscriptions.get("cart_viewed")?.({});

    expect(window.PerfKit?.navigate).toHaveBeenCalledOnce();
    expect(window.PerfKit?.setPageType).toHaveBeenNthCalledWith(1, "product");
    expect(window.PerfKit?.setPageType).toHaveBeenNthCalledWith(2, "collection");
    expect(window.PerfKit?.setPageType).toHaveBeenNthCalledWith(3, "search");
    expect(window.PerfKit?.setPageType).toHaveBeenNthCalledWith(4, "cart");
  });

  it("skips the PerfKit SPA bridge when the analytics bus is missing at DOMContentLoaded", () => {
    setDocumentReadyState("loading");
    const descriptors = getShopifyScriptTags({
      shop: { shopId: TEST_SHOP_ID, storefrontId: TEST_STOREFRONT_ID },
    });
    const bridgeScript = getPerfKitBridgeScript(descriptors.scripts);
    assert(bridgeScript?.innerHTML, "Expected ShopifyScripts to include the PerfKit bridge script");

    (0, eval)(bridgeScript.innerHTML);
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const addDestination = vi.fn();
    (window as any).Shopify = { analytics: { addDestination } };
    expect(addDestination).not.toHaveBeenCalled();
  });

  it("returns a new ordered tag array each time", () => {
    const descriptors = getShopifyScriptTags({});
    const firstTags = descriptors.tags;
    const secondTags = descriptors.tags;

    expect(firstTags).not.toBe(secondTags);
    expect(firstTags).toEqual(secondTags);
  });

  it("renders a script tag descriptor to HTML", () => {
    expect(
      renderShopifyScriptTag({
        tagName: "script",
        attributes: {
          src: "https://example.com/script.js?variant=a&b",
          type: "module",
          crossorigin: "anonymous",
          nonce: '"test"',
        },
      }),
    ).toBe(
      '<script src="https://example.com/script.js?variant=a&amp;b" type="module" crossorigin="anonymous" nonce="&quot;test&quot;"></script>',
    );
  });

  it("renders a link tag descriptor to HTML", () => {
    expect(
      renderShopifyScriptTag({
        tagName: "link",
        attributes: {
          rel: "preconnect",
          href: SHOPIFY_CDN_ORIGIN,
        },
      }),
    ).toBe(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}">`);
  });

  it("renders all Shopify script tags to an HTML array", () => {
    const htmlTags = renderShopifyScriptTags({
      i18n: { country: "US", language: "EN" },
      nonce: "test-nonce",
    });
    const html = htmlTags.join("\n");

    expect(htmlTags).toHaveLength(5);
    expect(html).toContain('<script nonce="test-nonce">');
    expect(html).toContain('"country":"US"');
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('"routes":{"root":"/"}');
    expect(html).not.toContain('"templates"');
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}">`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_SHOP_APP_ORIGIN}">`);
    expect(html).toContain(
      `<script src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}" type="module" crossorigin="anonymous" nonce="test-nonce"></script>`,
    );
    expect(html).toContain(
      `<link rel="prefetch" as="script" href="${SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT}" crossorigin="anonymous">`,
    );
  });
});

function getPerfKitBridgeScript(scripts: ReturnType<typeof getShopifyScriptTags>["scripts"]) {
  return scripts.find((script) => script.innerHTML?.includes("initPerfKitSpaBridge"));
}

function setDocumentReadyState(readyState: DocumentReadyState) {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: readyState,
  });
}
