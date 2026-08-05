import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import { handleShopifyRoutesDev as handleShopifyRoutesDevImpl } from "./handle-shopify-routes.development";
import { createShopifyRequestContext } from "./headers";
import { assert } from "./test-utils";

const defaultConfig = {
  storeDomain: "test-store.myshopify.com",
} as const;

const DEFAULT_I18N = { country: "US", language: "EN" } as const;

function handleShopifyRoutesDev(
  options: Omit<
    Parameters<typeof handleShopifyRoutesDevImpl>[0],
    "requestContext" | "sessionManager" | "storefrontClient"
  >,
) {
  const requestContext = createShopifyRequestContext({
    request: options.request,
    i18n: DEFAULT_I18N,
  });
  return handleShopifyRoutesDevImpl({
    ...options,
    requestContext,
    sessionManager: createTestSessionManager(options.request),
    storefrontClient: createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
        buyerIp: "127.0.0.1",
      },
    }),
  });
}

function createTestSessionManager(request: Request) {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;

  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key: string) => data.get(key),
    setSessionItem: (key: string, value: unknown) => {
      data.set(key, value);
    },
    removeSessionItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("handleShopifyRoutesDev", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
  });

  it("serves GraphiQL from the development routes", async () => {
    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/graphiql"),
    });

    assert(result, "expected GraphiQL response");
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("text/html");
  });

  it("falls through to production Hydrogen routes", async () => {
    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/api/mcp", {
        method: "POST",
        body: "{}",
      }),
    });

    assert(result, "expected MCP proxy response");
    expect(result.status).toBe(200);
  });

  it("proxies products.json to Shopify for the standard events inspector", async () => {
    const products = [{ id: 1, title: "Snowboard", variants: [] }];
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ products }), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/products.json?limit=25"),
    });

    assert(result, "expected products JSON response");
    await expect(result.json()).resolves.toEqual({ products });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(String(mockFetch.mock.calls[0]?.[0])).toBe(
      "https://test-store.myshopify.com/products.json?limit=25",
    );
  });

  it("does not proxy non-GET products.json requests", async () => {
    const mockFetch = vi.mocked(fetch);

    const result = await handleShopifyRoutesDev({
      request: new Request("https://my-app.com/products.json", { method: "POST" }),
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
