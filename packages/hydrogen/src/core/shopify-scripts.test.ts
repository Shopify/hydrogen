// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  getShopifyScriptTags,
  getShopifyGlobal,
  getShopifyGlobalBootstrapScript,
  initializeShopifyScripts,
  renderShopifyScriptTag,
  renderShopifyScriptTags,
  SHOPIFY_CONSENT_API_SCRIPT,
  SHOPIFY_CDN_ORIGIN,
  SHOPIFY_PERF_KIT_SCRIPT,
  SHOPIFY_SHOP_APP_ORIGIN,
  SHOPIFY_INBOX_SCRIPT,
  SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
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
const TEST_MYSHOPIFY_DOMAIN = "test-shop.myshopify.com";
const TEST_RESOURCE_TIMING_SAMPLING_RATE = "10";
const TEST_SHOP = {
  shopId: TEST_SHOP_ID,
  storefrontId: TEST_STOREFRONT_ID,
  myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
};

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
      attributes: { id: "shopify-webmcp", crossorigin: "anonymous" },
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
      i18n: { country: "CA", language: "FR", pathPrefix: "/fr-ca", currency: "cad" },
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
    });

    (0, eval)(script);

    expect(window.Shopify?.country).toBe("CA");
    expect(window.Shopify?.currency).toEqual({ active: "CAD" });
    expect(window.Shopify?.locale).toBe("fr");
    expect(window.Shopify?.shop).toBe(TEST_MYSHOPIFY_DOMAIN);
    expect(window.Shopify?.components.config).toEqual({
      storeDomain: window.location.origin,
      country: "CA",
      language: "fr",
    });
    expect(getShopifyRoutesRoot()).toBe("/fr-ca/");
  });

  it("replaces existing storefront components config", () => {
    (window as any).Shopify = {
      components: {
        config: {
          storeDomain: "https://custom.example.com",
          publicAccessToken: "custom-token",
        },
      },
    };
    const script = getShopifyGlobalBootstrapScript({ shop: TEST_SHOP });

    (0, eval)(script);

    expect(window.Shopify?.components.config).toEqual({
      storeDomain: window.location.origin,
      country: "US",
      language: "en",
    });
  });

  it("falls back to US country, en locale, and root route", () => {
    const script = getShopifyGlobalBootstrapScript({ shop: TEST_SHOP });

    (0, eval)(script);

    expect(window.Shopify?.country).toBe("US");
    expect(window.Shopify?.currency).toBeUndefined();
    expect(window.Shopify?.locale).toBe("en");
    expect(getShopifyRoutesRoot()).toBe("/");
  });

  it("normalizes the permanent shop domain", () => {
    const script = getShopifyGlobalBootstrapScript({
      shop: {
        ...TEST_SHOP,
        myshopifyDomain: ` https://${TEST_MYSHOPIFY_DOMAIN}/// `,
      },
    });

    (0, eval)(script);

    expect(window.Shopify?.shop).toBe(TEST_MYSHOPIFY_DOMAIN);
  });

  it("escapes serialized data for inline script safety", () => {
    const script = getShopifyGlobalBootstrapScript({
      // @ts-expect-error Intentionally validates unsafe runtime input serialization.
      i18n: { country: "</script>", language: "EN" },
      shop: TEST_SHOP,
    });

    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script>");
  });

  it("builds script tag descriptors for the Shopify runtime", () => {
    const descriptors = getShopifyScriptTags({
      i18n: { country: "US", language: "EN" },
      nonce: "test-nonce",
      shop: TEST_SHOP,
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
        attributes: { id: "shopify-global-bootstrap", nonce: "test-nonce" },
        innerHTML: expect.stringContaining('"country":"US"'),
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-standard-actions",
          type: "module",
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-consent",
          async: true,
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_CONSENT_API_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: { id: "shopify-consent-bootstrap", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("visitorConsentCollected"),
      },
      {
        tagName: "script",
        attributes: { id: "shopify-analytics-bus", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("Analytics bus already initialized"),
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-storefront-analytics",
          async: true,
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-perfkit",
          nonce: "test-nonce",
          async: true,
          src: SHOPIFY_PERF_KIT_SCRIPT,
          "data-application": "hydrogen",
          "data-shop-id": TEST_SHOP_ID,
          "data-storefront-id": TEST_STOREFRONT_ID,
          "data-monorail-region": "global",
          "data-spa-mode": "true",
          "data-resource-timing-sampling-rate": TEST_RESOURCE_TIMING_SAMPLING_RATE,
        },
      },
      {
        tagName: "script",
        attributes: { id: "shopify-perfkit-spa-bridge", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("perfkit-spa-bridge"),
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
        attributes: { id: "shopify-global-bootstrap", nonce: "test-nonce" },
        innerHTML: expect.stringContaining('"country":"US"'),
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-standard-actions",
          type: "module",
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-consent",
          async: true,
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_CONSENT_API_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: { id: "shopify-consent-bootstrap", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("visitorConsentCollected"),
      },
      {
        tagName: "script",
        attributes: { id: "shopify-analytics-bus", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("Analytics bus already initialized"),
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-storefront-analytics",
          async: true,
          crossorigin: "anonymous",
          nonce: "test-nonce",
          src: SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
        },
      },
      {
        tagName: "script",
        attributes: {
          id: "shopify-perfkit",
          nonce: "test-nonce",
          async: true,
          src: SHOPIFY_PERF_KIT_SCRIPT,
          "data-application": "hydrogen",
          "data-shop-id": TEST_SHOP_ID,
          "data-storefront-id": TEST_STOREFRONT_ID,
          "data-monorail-region": "global",
          "data-spa-mode": "true",
          "data-resource-timing-sampling-rate": TEST_RESOURCE_TIMING_SAMPLING_RATE,
        },
      },
      {
        tagName: "script",
        attributes: { id: "shopify-perfkit-spa-bridge", nonce: "test-nonce" },
        innerHTML: expect.stringContaining("perfkit-spa-bridge"),
      },
    ]);
    expect(descriptors.scripts[0]?.innerHTML).not.toContain('"templates"');
  });

  it("preserves an explicitly empty nonce on nonce-capable scripts", () => {
    const descriptors = getShopifyScriptTags({
      nonce: "",
      shop: TEST_SHOP,
    });
    expect(descriptors.scripts).toHaveLength(8);
    for (const { attributes } of descriptors.scripts) {
      expect(attributes).toHaveProperty("nonce", "");
    }
  });

  it("does not include WebMCP in SSR descriptors", () => {
    const descriptors = getShopifyScriptTags({ shop: TEST_SHOP });

    expect(descriptors.scripts).toHaveLength(8);
    expect(descriptors.tags).not.toContainEqual(
      expect.objectContaining({
        innerHTML: expect.stringContaining(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT),
      }),
    );
  });

  it("includes the async Inbox module when enabled", () => {
    const descriptors = getShopifyScriptTags({
      nonce: "test-nonce",
      shop: TEST_SHOP,
      inbox: true,
    });

    expect(descriptors.scripts).toContainEqual({
      tagName: "script",
      attributes: {
        id: "shopify-inbox",
        type: "module",
        async: true,
        crossorigin: "anonymous",
        nonce: "test-nonce",
        src: SHOPIFY_INBOX_SCRIPT,
      },
    });
    expect(
      descriptors.scripts.findIndex(
        ({ attributes }) => attributes?.src === SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
      ),
    ).toBeLessThan(
      descriptors.scripts.findIndex(({ attributes }) => attributes?.src === SHOPIFY_INBOX_SCRIPT),
    );
  });

  it("allows storefront analytics to be omitted from SSR descriptors", () => {
    const descriptors = getShopifyScriptTags({ shop: TEST_SHOP, shopifyAnalytics: false });

    expect(descriptors.scripts).not.toContainEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          src: SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT,
        }),
      }),
    );
  });

  it("includes PerfKit when configured", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_GID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
    });

    expect(descriptors.scripts).toContainEqual({
      tagName: "script",
      attributes: {
        id: "shopify-perfkit",
        async: true,
        "data-application": "hydrogen",
        "data-shop-id": TEST_SHOP_ID,
        "data-storefront-id": TEST_STOREFRONT_ID,
        "data-monorail-region": "global",
        "data-spa-mode": "true",
        "data-resource-timing-sampling-rate": TEST_RESOURCE_TIMING_SAMPLING_RATE,
        src: SHOPIFY_PERF_KIT_SCRIPT,
      },
    });
    expect(getPerfKitBridgeScript(descriptors.scripts)?.innerHTML).toContain("perfkit-spa-bridge");
    const renderedTags = renderShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
    }).join("\n");
    expect(renderedTags).toContain(`<script id="shopify-perfkit" async`);
    expect(renderedTags).toContain(`data-application="hydrogen"`);
  });

  it("accepts numeric PerfKit shop IDs", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
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
    await expect(
      initializeShopifyScripts({ routes: emptyRouteTemplates }),
    ).resolves.toBeUndefined();

    expect(loadScript).not.toHaveBeenCalled();
  });

  it("loads the WebMCP CDN script with model context", async () => {
    (navigator as any).modelContext = { registerTool: vi.fn() };

    await expect(initializeShopifyScripts({ routes: emptyRouteTemplates })).resolves.toBe(true);

    expect(loadScript).toHaveBeenCalledWith(SHOPIFY_STOREFRONT_WEBMCP_SCRIPT, {
      in: "head",
      attributes: { id: "shopify-webmcp", crossorigin: "anonymous" },
    });
  });

  it("skips PerfKit when the shop ID has no numeric segment", () => {
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: "gid://shopify/Shop/not-a-number",
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
    });

    expect(descriptors.scripts).not.toContainEqual(
      expect.objectContaining({
        attributes: expect.objectContaining({
          id: "shopify-perfkit",
        }),
      }),
    );
  });

  it("registers the PerfKit SPA bridge when the analytics bus is available at DOMContentLoaded", () => {
    setDocumentReadyState("loading");
    const addDestination = vi.fn();
    const descriptors = getShopifyScriptTags({
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
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
      shop: {
        shopId: TEST_SHOP_ID,
        storefrontId: TEST_STOREFRONT_ID,
        myshopifyDomain: TEST_MYSHOPIFY_DOMAIN,
      },
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

  it("returns a new ordered tag array each time", () => {
    const descriptors = getShopifyScriptTags({ shop: TEST_SHOP });
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
      shop: TEST_SHOP,
    });
    const html = htmlTags.join("\n");

    expect(htmlTags).toHaveLength(11);
    expect(html).toContain('<script id="shopify-global-bootstrap" nonce="test-nonce">');
    expect(html).toContain('"country":"US"');
    expect(html).toContain('"locale":"en"');
    expect(html).toContain('"routes":{"root":"/"}');
    expect(html).not.toContain('"templates"');
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_CDN_ORIGIN}">`);
    expect(html).toContain(`<link rel="preconnect" href="${SHOPIFY_SHOP_APP_ORIGIN}">`);
    expect(html).toContain(
      `<script id="shopify-standard-actions" type="module" crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}"></script>`,
    );
    expect(html).toContain(
      `<script id="shopify-storefront-analytics" async crossorigin="anonymous" nonce="test-nonce" src="${SHOPIFY_STOREFRONT_ANALYTICS_SCRIPT}"></script>`,
    );
    expect(html).toContain(
      `<link rel="prefetch" as="script" href="${SHOPIFY_STOREFRONT_STANDARD_EVENTS_SCRIPT}" crossorigin="anonymous">`,
    );
  });
});

function getPerfKitBridgeScript(scripts: ReturnType<typeof getShopifyScriptTags>["scripts"]) {
  return scripts.find((script) => script.innerHTML?.includes("perfkit-spa-bridge"));
}

function setDocumentReadyState(readyState: DocumentReadyState) {
  Object.defineProperty(document, "readyState", {
    configurable: true,
    value: readyState,
  });
}
