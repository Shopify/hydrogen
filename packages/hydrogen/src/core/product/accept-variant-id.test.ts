import { afterEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient, type StorefrontClient } from "../../client";
import { StorefrontApiError } from "../../client/errors";
import { Cache } from "../cache";
import { configureLogging, resetLoggingForTests } from "../logging";
import { createShopifyRequestContext, type I18nConfig } from "../request-context";
import type { HydrogenRoutesOptions } from "../request-routing/route-types";
import type { ShopifyRouteTemplates } from "../standard-routes/types";
import { handleProductVariantId } from "./accept-variant-id";

const DEFAULT_I18N = { country: "US", language: "EN", pathPrefix: "" } as const;

const VARIANT_NODE = {
  selectedOptions: [
    { name: "Color", value: "Red" },
    { name: "Size", value: "M" },
  ],
  product: { handle: "snowboard" },
};

function createContext({
  url,
  method = "GET",
  node = VARIANT_NODE,
  graphql = vi.fn().mockResolvedValue({ data: { node } }),
  i18n = DEFAULT_I18N,
  routeTemplates = {},
}: {
  url: string;
  method?: string;
  node?: typeof VARIANT_NODE | null;
  graphql?: ReturnType<typeof vi.fn>;
  i18n?: I18nConfig;
  routeTemplates?: ShopifyRouteTemplates;
}) {
  const request = new Request(url, { method });
  const requestContext = createShopifyRequestContext({ request, i18n });
  const storefrontClient = {
    graphql,
    i18n: requestContext.i18n,
    storeUrl: "https://shop.myshopify.com",
    requestContext,
  } as unknown as StorefrontClient;
  const options = {
    request,
    requestContext,
    storefrontClient,
    sessionManager: createTestSessionManager(),
    routeTemplates,
  } satisfies HydrogenRoutesOptions;

  return { graphql, options, url: new URL(url) };
}

function createTestSessionManager() {
  const data = new Map<string, unknown>();

  return {
    getSessionOrigin: () => "https://shop.com",
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

function createCacheEnabledContext(node: typeof VARIANT_NODE | null) {
  const values = new Map<string, unknown>();
  const cache = {
    get: vi.fn((key: string) => values.get(key)),
    set: vi.fn((key: string, value: unknown) => {
      values.set(key, value);
    }),
  };
  const request = new Request("https://shop.com/products/snowboard?variant=42");
  const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: {
      storeDomain: "shop.myshopify.com",
      cache,
      fetch: vi.fn().mockResolvedValue(Response.json({ data: { node } })),
    },
  });

  return {
    cache,
    options: {
      request,
      requestContext,
      storefrontClient,
      sessionManager: createTestSessionManager(),
      routeTemplates: {},
    } satisfies HydrogenRoutesOptions,
    url: new URL(request.url),
  };
}

async function run(options: Parameters<typeof createContext>[0]) {
  const { options: routeOptions, url, graphql } = createContext(options);
  const result = handleProductVariantId(url, routeOptions);
  return { result: result ? await result : null, graphql };
}

describe("handleProductVariantId", () => {
  afterEach(() => {
    resetLoggingForTests();
  });

  it("passes through non-GET/HEAD requests, product-less URLs, and missing or malformed variant params", async () => {
    const cases = [
      { url: "https://shop.com/products/snowboard?variant=1", method: "POST" },
      { url: "https://shop.com/products/snowboard" },
      { url: "https://shop.com/products/snowboard?variant=banana" },
      { url: "https://shop.com/products/snowboard?variant=-1" },
      { url: "https://shop.com/products/snowboard?variant=" },
      { url: `https://shop.com/products/snowboard?variant=${"9".repeat(31)}` },
      { url: "https://shop.com/collections/sale?variant=1" },
      { url: "https://shop.com/pages/about?variant=1" },
    ];

    for (const testCase of cases) {
      const { result, graphql } = await run(testCase);
      expect(result, testCase.url).toBeNull();
      expect(graphql).not.toHaveBeenCalled();
    }
  });

  it("redirects to the same pathname with the variant's option params", async () => {
    const { result, graphql } = await run({
      url: "https://shop.com/products/snowboard?variant=41820371452004&ref=campaign",
    });

    expect(result?.status).toBe(302);
    expect(result?.headers.get("location")).toBe(
      "https://shop.com/products/snowboard?ref=campaign&Color=Red&Size=M",
    );
    expect(graphql).toHaveBeenCalledWith(expect.anything(), {
      variables: { id: "gid://shopify/ProductVariant/41820371452004" },
    });
  });

  it("uses the long cache strategy when the storefront client has a cache adapter", async () => {
    const { cache, options, url } = createCacheEnabledContext(VARIANT_NODE);

    await handleProductVariantId(url, options);

    expect(cache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ strategy: Cache.long() }),
      expect.any(Object),
    );
  });

  it("does not cache unresolved variants", async () => {
    const { cache, options, url } = createCacheEnabledContext(null);

    await handleProductVariantId(url, options);

    expect(cache.set).not.toHaveBeenCalled();
  });

  it("prefers the variant over option params already in the URL", async () => {
    const { result } = await run({
      url: "https://shop.com/products/snowboard?Color=Blue&variant=42",
    });

    expect(result?.headers.get("location")).toBe(
      "https://shop.com/products/snowboard?Color=Red&Size=M",
    );
  });

  it("handles HEAD requests and collection-scoped product URLs", async () => {
    const { result } = await run({
      url: "https://shop.com/collections/sale/products/snowboard?variant=42",
      method: "HEAD",
    });

    expect(result?.headers.get("location")).toBe(
      "https://shop.com/collections/sale/products/snowboard?Color=Red&Size=M",
    );
  });

  it("matches configured custom product templates", async () => {
    const { result } = await run({
      url: "https://shop.com/p/snowboard?variant=42",
      routeTemplates: { product: "/p/:productHandle" },
    });

    expect(result?.headers.get("location")).toBe("https://shop.com/p/snowboard?Color=Red&Size=M");
  });

  it("redirects to the variant's own product page for combined listings", async () => {
    const { result } = await run({
      url: "https://shop.com/products/combined-parent?variant=42",
    });

    expect(result?.headers.get("location")).toBe(
      "https://shop.com/products/snowboard?Color=Red&Size=M",
    );
  });

  it("matches locale-prefixed URLs and keeps the prefix on cross-product redirects", async () => {
    const i18n = { country: "CA", language: "FR", pathPrefix: "/fr-ca" } as const;
    const samePage = await run({
      url: "https://shop.com/fr-ca/products/snowboard?variant=42",
      i18n,
    });
    expect(samePage.result?.headers.get("location")).toBe(
      "https://shop.com/fr-ca/products/snowboard?Color=Red&Size=M",
    );

    const crossProduct = await run({
      url: "https://shop.com/fr-ca/products/combined-parent?variant=42",
      i18n,
    });
    expect(crossProduct.result?.headers.get("location")).toBe(
      "https://shop.com/fr-ca/products/snowboard?Color=Red&Size=M",
    );
  });

  it("strips the variant param when the variant does not exist", async () => {
    const { result } = await run({
      url: "https://shop.com/products/snowboard?variant=42&ref=campaign",
      node: null,
    });

    expect(result?.headers.get("location")).toBe(
      "https://shop.com/products/snowboard?ref=campaign",
    );
  });

  it("logs and strips the variant param when the lookup fails", async () => {
    const logger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };
    configureLogging({ logger });
    const failure = new StorefrontApiError("SFAPI unavailable");

    const { result } = await run({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql: vi.fn().mockRejectedValue(failure),
    });

    expect(result?.headers.get("location")).toBe("https://shop.com/products/snowboard");
    expect(logger.error).toHaveBeenCalledWith("variant id redirect lookup failed", {
      scope: "product",
      error: failure,
      variantId: "gid://shopify/ProductVariant/42",
    });
  });

  it("throws programming and configuration errors from the lookup", async () => {
    const failure = new Error("Storefront API cache options require a cache configured");
    const { options, url } = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql: vi.fn().mockRejectedValue(failure),
    });

    await expect(handleProductVariantId(url, options)).rejects.toThrow(failure);
  });
});
