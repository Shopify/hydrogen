import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import type { I18nConfig } from "../client/types";
import { handleShopifyRedirects } from "./handle-shopify-redirects";
import { createShopifyRequestContext } from "./headers";
import { createShopifyRouteTemplates } from "./standard-routes/index";
import { assert } from "./test-utils";

const defaultConfig = {
  storeDomain: "test-store.myshopify.com",
} as const;

const DEFAULT_I18N = { country: "US", language: "EN" } as const;
const DEFAULT_ROUTE_TEMPLATES = createShopifyRouteTemplates({});

function createPrivateStorefrontClient(request: Request, i18n: I18nConfig = DEFAULT_I18N) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n }),
    config: {
      storeDomain: defaultConfig.storeDomain,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function redirectOptions(
  request: Request,
  options: Partial<Parameters<typeof handleShopifyRedirects>[0]> = {},
): Parameters<typeof handleShopifyRedirects>[0] {
  return {
    request,
    storefrontClient: createPrivateStorefrontClient(request),
    routeTemplates: DEFAULT_ROUTE_TEMPLATES,
    ...options,
  };
}

describe("handleShopifyRedirects", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { urlRedirects: { edges: [] } } })));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("redirects /admin to Shopify admin", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            shop: { primaryDomain: { url: "https://test-store.myshopify.com" } },
          },
        }),
      ),
    );

    const request = new Request("https://my-app.com/admin");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected admin redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("https://test-store.myshopify.com/admin");
  });

  it("returns URL redirect from Storefront API", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            urlRedirects: {
              edges: [{ node: { target: "/new-page" } }],
            },
          },
        }),
      ),
    );

    const request = new Request("https://my-app.com/old-page");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected URL redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/new-page");
  });

  it("falls through to query param redirect", async () => {
    const request = new Request("https://my-app.com/some-page?return_to=/dashboard");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected query param redirect response");
    expect(result.headers.get("location")).toBe("/dashboard");
  });

  it("redirects standard resource routes using configured templates", async () => {
    const request = new Request("https://my-app.com/products/snowboard?utm_source=test");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: {
          product: "/p/:productHandle",
        },
      }),
    );

    assert(result, "expected standard route redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/p/snowboard?utm_source=test");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not redirect standard resource routes to themselves", async () => {
    const request = new Request("https://my-app.com/products/snowboard?utm_source=test");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: {
          product: "/products/:productHandle",
        },
      }),
    );

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("redirects standard product-in-collection routes using configured templates", async () => {
    const request = new Request(
      "https://my-app.com/collections/winter/products/snowboard?utm_source=test",
    );
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: {
          productInCollection: "/c/:collectionHandle/p/:productHandle",
        },
      }),
    );

    assert(result, "expected product-in-collection standard route redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/c/winter/p/snowboard?utm_source=test");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("redirects standard article routes using configured templates", async () => {
    const request = new Request("https://my-app.com/blogs/news/snowboard-guide?utm_source=test");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: {
          article: "/journal/:blogHandle/:articleHandle",
        },
      }),
    );

    assert(result, "expected article standard route redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/journal/news/snowboard-guide?utm_source=test");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "collection",
      requestUrl: "https://my-app.com/collections/winter?utm_source=test",
      routeTemplates: { collection: "/c/:collectionHandle" },
      expectedLocation: "/c/winter?utm_source=test",
    },
    {
      name: "page",
      requestUrl: "https://my-app.com/pages/about-us?utm_source=test",
      routeTemplates: { page: "/content/:pageHandle" },
      expectedLocation: "/content/about-us?utm_source=test",
    },
    {
      name: "blog",
      requestUrl: "https://my-app.com/blogs/news?utm_source=test",
      routeTemplates: { blog: "/journal/:blogHandle" },
      expectedLocation: "/journal/news?utm_source=test",
    },
  ] as const)("redirects standard $name routes using configured templates", async (scenario) => {
    const request = new Request(scenario.requestUrl);
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: scenario.routeTemplates,
      }),
    );

    assert(result, `expected ${scenario.name} standard route redirect response`);
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe(scenario.expectedLocation);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("strips the i18n path prefix before matching standard routes", async () => {
    const request = new Request("https://my-app.com/en-us/products/snowboard");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        storefrontClient: createPrivateStorefrontClient(request, {
          ...DEFAULT_I18N,
          pathPrefix: "/EN-US",
        }),
        routeTemplates: {
          product: "/p/:productHandle",
        },
      }),
    );

    assert(result, "expected localized standard route redirect response");
    expect(result.headers.get("location")).toBe("/EN-US/p/snowboard");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not redirect i18n standard resource routes to themselves", async () => {
    const request = new Request("https://my-app.com/en-us/products/snowboard?utm_source=test");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        storefrontClient: createPrivateStorefrontClient(request, {
          ...DEFAULT_I18N,
          pathPrefix: "/en-us",
        }),
        routeTemplates: {
          product: "/products/:productHandle",
        },
      }),
    );

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("does not redirect standard resource routes without configured templates", async () => {
    const request = new Request("https://my-app.com/products/snowboard");
    const result = await handleShopifyRedirects(redirectOptions(request));

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("does not double-encode standard route parameters", async () => {
    const request = new Request("https://my-app.com/products/snow%20board");
    const result = await handleShopifyRedirects(
      redirectOptions(request, {
        routeTemplates: {
          product: "/p/:productHandle",
        },
      }),
    );

    assert(result, "expected encoded standard route redirect response");
    expect(result.headers.get("location")).toBe("/p/snow%20board");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when no redirect is found", async () => {
    const request = new Request("https://my-app.com/nonexistent");
    const result = await handleShopifyRedirects(redirectOptions(request));

    expect(result).toBeNull();
  });

  it("logs error and falls through when Storefront API fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const request = new Request("https://my-app.com/old-page");
    const result = await handleShopifyRedirects(redirectOptions(request));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to resolve Shopify redirects"),
      expect.any(Error),
    );
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});
