import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import { createCartServerHandlers } from "./cart/server-handlers";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "./handle-shopify-routes";
import { createShopifyRequestContext } from "./headers";
import { createShopifyRouteHandler } from "./route-handlers";

type TestStorefrontConfig = {
  storeDomain: string;
};

const DEFAULT_I18N = { country: "US", language: "EN" } as const;

const defaultConfig: TestStorefrontConfig = {
  storeDomain: "test-store.myshopify.com",
};

type HandleShopifyRoutesTestOptions = Omit<
  Parameters<typeof handleShopifyRoutesImpl>[0],
  "requestContext" | "sessionManager" | "storefrontClient"
> & {
  requestContext?: Parameters<typeof handleShopifyRoutesImpl>[0]["requestContext"];
  sessionManager?: Parameters<typeof handleShopifyRoutesImpl>[0]["sessionManager"];
  storefrontClient?: Parameters<typeof handleShopifyRoutesImpl>[0]["storefrontClient"];
};

function createPrivateStorefrontClient(
  request: Request,
  fixture: TestStorefrontConfig = defaultConfig,
) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n: DEFAULT_I18N }),
    config: {
      storeDomain: fixture.storeDomain,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function handleShopifyRoutes(options: HandleShopifyRoutesTestOptions) {
  const storefrontClient =
    options.storefrontClient ?? createPrivateStorefrontClient(options.request);
  return handleShopifyRoutesImpl({
    ...options,
    requestContext: options.requestContext ?? storefrontClient.requestContext,
    sessionManager: options.sessionManager ?? createTestSessionManager(options.request),
    storefrontClient,
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
    const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });
    const storefrontClient = createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
        buyerIp: "10.0.0.2",
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

  it("uses the provided public client for registered cart handlers", async () => {
    const request = new Request("https://my-app.com/api/cart?cartId=123");
    const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });
    const storefrontClient = createStorefrontClient({
      type: "public",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        publicStorefrontToken: "test-public-token",
      },
    });

    await handleShopifyRoutes({
      request,
      storefrontClient,
      handlers: [createCartServerHandlers()],
    });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBe("test-public-token");
    expect(headers.get("Shopify-Storefront-Private-Token")).toBeNull();
    expect(headers.get("Shopify-Storefront-Buyer-IP")).toBeNull();
  });

  it("rejects a request context that differs from the storefront client's context", async () => {
    const request = new Request("https://my-app.com/custom");
    const storefrontClient = createPrivateStorefrontClient(request);
    const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });

    await expect(
      handleShopifyRoutes({ request, requestContext, storefrontClient }),
    ).rejects.toThrow("same requestContext");
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

  it("applies request-context response headers to registered route responses", async () => {
    const request = new Request("https://my-app.com/custom");
    const storefrontClient = createPrivateStorefrontClient(request);
    const requestContext = storefrontClient.requestContext;
    const handler = createShopifyRouteHandler("/custom", "GET", async (handlerContext) => {
      handlerContext.requestContext.markResponseAsPersonalized("test-private-route");
      return {
        type: "json" as const,
        data: { ok: true },
        headers: {
          "cache-control": "public, s-maxage=600",
          "cdn-cache-control": "public, s-maxage=600",
        },
      };
    });

    const result = await handleShopifyRoutes({
      request,
      requestContext,
      storefrontClient,
      handlers: [{ custom: handler }],
    });

    expect(result?.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(result?.headers.get("cdn-cache-control")).toBeNull();
  });

  it("maps registered handler relative redirects to absolute same-origin Location headers", async () => {
    const request = new Request("https://my-app.com/custom");
    const handler = createShopifyRouteHandler("/custom", "GET", async () => ({
      type: "redirect" as const,
      location: "/account?login=failed",
    }));

    const result = await handleShopifyRoutes({ request, handlers: [{ custom: handler }] });

    expect(result?.status).toBe(303);
    expect(result?.headers.get("location")).toBe("https://my-app.com/account?login=failed");
  });

  it("preserves registered handler absolute redirect Location headers", async () => {
    const request = new Request("https://my-app.com/custom");
    const handler = createShopifyRouteHandler("/custom", "GET", async () => ({
      type: "redirect" as const,
      location: "https://shopify.com/authentication/123/oauth/authorize",
    }));

    const result = await handleShopifyRoutes({ request, handlers: [{ custom: handler }] });

    expect(result?.status).toBe(303);
    expect(result?.headers.get("location")).toBe(
      "https://shopify.com/authentication/123/oauth/authorize",
    );
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
    const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });
    const storefrontClient = createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
        buyerIp: "10.0.0.2",
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
