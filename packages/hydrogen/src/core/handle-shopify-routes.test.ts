import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import { createCartServerHandlers } from "./cart/server-handlers";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "./handle-shopify-routes";
import { createStorefrontRequestContext } from "./headers";
import { createShopifyRouteHandler } from "./route-handlers";

type TestStorefrontConfig = {
  storeDomain: string;
  i18n: { country: "US"; language: "EN" };
};

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "test-store.myshopify.com",
  i18n: { country: "US", language: "EN" },
};

type HandleShopifyRoutesTestOptions = Omit<
  Parameters<typeof handleShopifyRoutesImpl>[0],
  "storefrontClient"
> & {
  storefrontClient?: Parameters<typeof handleShopifyRoutesImpl>[0]["storefrontClient"];
};

function createPrivateStorefrontClient(
  request: Request,
  config: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: config.storeDomain,
      i18n: config.i18n,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
      requestContext: createStorefrontRequestContext(request),
    },
  });
}

function handleShopifyRoutes(options: HandleShopifyRoutesTestOptions) {
  return handleShopifyRoutesImpl({
    ...options,
    storefrontClient: options.storefrontClient ?? createPrivateStorefrontClient(options.request),
  });
}

describe("handleShopifyRoutes", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns Response for SFAPI proxy requests", async () => {
    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/2025-01/graphql.json", {
        method: "POST",
        body: "{}",
      }),
    });

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Response);
  });

  it("returns Response for MCP proxy requests", async () => {
    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/mcp", {
        method: "POST",
        body: "{}",
      }),
    });

    expect(result).not.toBeNull();
  });

  it("does not infer buyer IP headers for proxy requests", async () => {
    await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/mcp", {
        method: "POST",
        body: "{}",
        headers: { "oxygen-buyer-ip": "1.2.3.4" },
      }),
    });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Client-IP")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("does not handle cart routes without registered cart handlers", async () => {
    const request = new Request("https://my-app.com/api/cart?cartId=123");

    const result = await handleShopifyRoutes({ request });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses the provided private client for registered cart handlers", async () => {
    const request = new Request("https://my-app.com/api/cart?cartId=123", {
      headers: { "oxygen-buyer-ip": "10.0.0.2" },
    });
    const requestContext = createStorefrontRequestContext(request);
    const storefrontClient = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
        i18n: defaultConfig.i18n,
        buyerIp: "10.0.0.2",
        requestContext,
      },
    });

    await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [createCartServerHandlers()],
    });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Shopify-Storefront-Private-Token")).toBe("test-private-token");
    expect(headers.get("Shopify-Storefront-Buyer-IP")).toBe("10.0.0.2");
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBeNull();
  });

  it("maps registered handler error results to 400 JSON responses", async () => {
    const request = new Request("https://my-app.com/custom");
    const handler = createShopifyRouteHandler("/custom", "GET", async () => ({
      type: "error" as const,
      error: { code: "invalid_custom_request", message: "Invalid custom request" },
    }));

    const result = await handleShopifyRoutes({ request, handlers: [{ custom: handler }] });

    expect(result?.status).toBe(400);
    await expect(result?.json()).resolves.toEqual({
      error: { code: "invalid_custom_request", message: "Invalid custom request" },
    });
  });

  it("lets registered handler exceptions throw", async () => {
    const request = new Request("https://my-app.com/custom");
    const handler = createShopifyRouteHandler("/custom", "GET", async () => {
      throw new Error("Custom transport failure");
    });

    await expect(handleShopifyRoutes({ request, handlers: [{ custom: handler }] })).rejects.toThrow(
      "Custom transport failure",
    );
  });

  it("uses the provided private client for checkout redirects", async () => {
    const request = new Request("https://my-app.com/checkout", {
      headers: {
        cookie: "cart=123",
        "oxygen-buyer-ip": "10.0.0.2",
      },
    });
    const requestContext = createStorefrontRequestContext(request);
    const storefrontClient = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
        i18n: defaultConfig.i18n,
        buyerIp: "10.0.0.2",
        requestContext,
      },
    });

    await handleShopifyRoutes({ request, storefrontClient });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Shopify-Storefront-Private-Token")).toBe("test-private-token");
    expect(headers.get("Shopify-Storefront-Buyer-IP")).toBe("10.0.0.2");
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBeNull();
  });

  it("returns null for non-matching URLs", async () => {
    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/products"),
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
