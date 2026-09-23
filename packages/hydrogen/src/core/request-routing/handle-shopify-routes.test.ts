import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createCartServerHandlers } from "../cart/server-handlers";
import {
  CONSENT_MANAGEMENT_HEADER,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from "../headers";
import { createShopifyRequestContext } from "../request-context";
import { assert } from "../test-utils";
import { handleShopifyRoutes as handleShopifyRoutesImpl } from "./handle-shopify-routes";
import { createShopifyRouteHandler } from "./registered-routes";

type TestStorefrontConfig = {
  storeDomain: string;
};

const DEFAULT_I18N = { country: "US", language: "EN" } as const;
const DEFAULT_BUYER_IP = "127.0.0.1";

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
    requestContext: createShopifyRequestContext({
      request,
      i18n: DEFAULT_I18N,
      buyerIp: DEFAULT_BUYER_IP,
    }),
    config: {
      storeDomain: fixture.storeDomain,
      privateStorefrontToken: "test-private-token",
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

  it("strips upstream cookies from cold non-consent SFAPI proxy responses", async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append("set-cookie", "_shopify_essential=cold; Path=/; Secure; HttpOnly");
    upstreamHeaders.append("set-cookie", "app_session=preserved; Path=/; Secure; HttpOnly");
    mockFetch.mockResolvedValueOnce(new Response("{}", { headers: upstreamHeaders }));

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/unstable/graphql.json", {
        method: "POST",
        body: "{}",
      }),
    });

    expect(result?.headers.getSetCookie()).toEqual([]);
  });

  it("protects consent response bodies without upstream cookies", async () => {
    const body = {
      data: {
        consentManagement: {
          cookies: { shopifyUnique: "unique", shopifyVisit: "visit" },
        },
      },
    };
    const headers = new Headers({
      "cache-control": "public, s-maxage=600",
      "cdn-cache-control": "public, s-maxage=600",
    });
    mockFetch.mockResolvedValueOnce(Response.json(body, { headers }));

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/unstable/graphql.json", {
        method: "POST",
        body: "{}",
        headers: { [CONSENT_MANAGEMENT_HEADER]: "1" },
      }),
    });

    assert(result, "expected consent response");
    expect(await result.json()).toEqual(body);
    expect(result.headers.getSetCookie()).toEqual([]);
    expect(result.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
    expect(result.headers.has("cdn-cache-control")).toBe(false);
  });

  it("strips upstream timing while preserving public cache directives", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("{}", {
        headers: {
          "server-timing": "db;dur=2, _y;desc=unique, _s;desc=visit",
          "cache-control": "public, s-maxage=600",
          "cdn-cache-control": "public, s-maxage=600",
        },
      }),
    );

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/unstable/graphql.json", {
        headers: { cookie: "_shopify_essential=established" },
      }),
    });

    assert(result, "expected proxy response");
    expect(result.headers.has("server-timing")).toBe(false);
    expect(result.headers.get("cache-control")).toBe("public, s-maxage=600");
    expect(result.headers.get("cdn-cache-control")).toBe("public, s-maxage=600");
  });

  it("returns Shopify cookies from marked consent-management proxy responses", async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append(
      "set-cookie",
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    );
    mockFetch.mockResolvedValueOnce(new Response("{}", { headers: upstreamHeaders }));

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/unstable/graphql.json", {
        method: "POST",
        body: "{}",
        headers: { [CONSENT_MANAGEMENT_HEADER]: "1" },
      }),
    });

    expect(result?.headers.getSetCookie()).toEqual([
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    ]);
    const [, init] = mockFetch.mock.calls[0];
    expect(new Headers(init.headers).has(CONSENT_MANAGEMENT_HEADER)).toBe(false);
  });

  describe("legacy tracking cookie cleanup", () => {
    const legacyCookies = "_shopify_y=legacy-unique; _shopify_s=legacy-visit";
    const consentBody = {
      data: {
        consentManagement: {
          cookies: { shopifyUnique: "legacy-unique", shopifyVisit: "legacy-visit" },
        },
      },
    };

    it.each(["migration", "denial", "revocation"])(
      "expires legacy cookies after successful consent %s",
      async (scenario) => {
        const body =
          scenario === "migration"
            ? consentBody
            : {
                data: {
                  consentManagement: { cookies: { shopifyUnique: null, shopifyVisit: null } },
                },
              };
        const modernCookie = "_shopify_essential=established; Path=/; Secure; HttpOnly";
        mockFetch.mockResolvedValueOnce(
          Response.json(body, {
            headers: {
              "set-cookie": modernCookie,
              "cache-control": "public, s-maxage=600",
              "cdn-cache-control": "public, s-maxage=600",
            },
          }),
        );

        const result = await handleShopifyRoutes({
          request: new Request("https://shop.example.co.uk/api/unstable/graphql.json", {
            method: "POST",
            headers: {
              [CONSENT_MANAGEMENT_HEADER]: "1",
              cookie:
                scenario === "revocation"
                  ? `${legacyCookies}; _shopify_analytics=established`
                  : legacyCookies,
            },
          }),
        });

        // Forward legacy cookies so Shopify can decide whether to migrate their identifiers.
        const call = mockFetch.mock.calls[0];
        assert(call, "expected consent request to reach Shopify");
        const requestHeaders = new Headers(call[1].headers);
        expect(requestHeaders.get("cookie")).toContain(legacyCookies);
        expect(requestHeaders.get(SHOPIFY_UNIQUE_TOKEN_HEADER)).toBeNull();
        expect(requestHeaders.get(SHOPIFY_VISIT_TOKEN_HEADER)).toBeNull();

        // Replay the modern state and expire both host-only and parent-domain cookies.
        assert(result, "expected consent response");
        expect(await result.json()).toEqual(body);
        expect(result.headers.getSetCookie()).toContain(modernCookie);
        for (const name of ["_shopify_y", "_shopify_s"]) {
          const expired = `${name}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
          expect(result.headers.getSetCookie()).toEqual(
            expect.arrayContaining([
              expired,
              `${expired}; Domain=shop.example.co.uk`,
              `${expired}; Domain=example.co.uk`,
            ]),
          );
        }
        expect(result.headers.get("cache-control")).toBe(
          "private, no-store, max-age=0, must-revalidate",
        );
        expect(result.headers.has("cdn-cache-control")).toBe(false);
      },
    );

    it("preserves legacy cookies on an HTTP error", async () => {
      mockFetch.mockResolvedValueOnce(new Response("Upstream failure", { status: 500 }));

      const result = await handleShopifyRoutes({
        request: new Request("https://example.com/api/unstable/graphql.json", {
          method: "POST",
          headers: { [CONSENT_MANAGEMENT_HEADER]: "1", cookie: legacyCookies },
        }),
      });

      assert(result, "expected upstream response");
      expect(result.status).toBe(500);
      expect(await result.text()).toBe("Upstream failure");
      expect(result.headers.getSetCookie()).toEqual([]);
    });

    it("trusts the consent marker even when HTTP 200 contains GraphQL errors", async () => {
      const body = { errors: [{ message: "Consent failed" }], data: null };
      mockFetch.mockResolvedValueOnce(Response.json(body));

      const result = await handleShopifyRoutes({
        request: new Request("https://example.com/api/unstable/graphql.json", {
          method: "POST",
          headers: { [CONSENT_MANAGEMENT_HEADER]: "1", cookie: legacyCookies },
        }),
      });

      assert(result, "expected consent response");
      expect(await result.json()).toEqual(body);
      expect(result.headers.getSetCookie()).toEqual(
        expect.arrayContaining([
          "_shopify_y=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
          "_shopify_s=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
        ]),
      );
    });

    it.each(["GET", "POST"])("preserves legacy cookies on unmarked %s requests", async (method) => {
      mockFetch.mockResolvedValueOnce(Response.json(consentBody));

      const result = await handleShopifyRoutes({
        request: new Request("https://example.com/api/unstable/graphql.json", {
          method,
          headers: { cookie: legacyCookies },
        }),
      });

      expect(result?.headers.getSetCookie()).toEqual([]);
    });

    it.each(["localhost", "127.0.0.1", "[::1]"])(
      "expires only the detected cookie on %s without adding parent domains",
      async (hostname) => {
        mockFetch.mockResolvedValueOnce(Response.json(consentBody));

        const result = await handleShopifyRoutes({
          request: new Request(`http://${hostname}/api/unstable/graphql.json`, {
            method: "POST",
            headers: { [CONSENT_MANAGEMENT_HEADER]: "1", cookie: "_shopify_s=legacy-visit" },
          }),
        });

        expect(result?.headers.getSetCookie()).toEqual([
          "_shopify_s=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax",
        ]);
      },
    );
  });

  it("returns Response for Shopify API proxy requests", async () => {
    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/__shopify/apps/inbox/config.json"),
    });

    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Response);
  });

  it.each(["GET", "HEAD"])("proxies %s UCP requests to the Online Store origin", async (method) => {
    mockFetch.mockResolvedValueOnce(
      new Response(method === "HEAD" ? null : '{"ucp":{"version":"2026-01-11"}}', {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "shopper=secret",
        },
      }),
    );

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/.well-known/ucp", {
        method,
        headers: { accept: "text/html", cookie: "shopper=secret" },
      }),
    });

    assert(result, "expected UCP response");
    const ucpCall = mockFetch.mock.calls[0];
    assert(ucpCall, "expected fetch to be called");
    const [ucpUrl, ucpInit] = ucpCall;
    expect(ucpUrl.href).toBe("https://test-store.myshopify.com/.well-known/ucp");
    expect(ucpInit.method).toBe(method);
    expect(ucpInit.redirect).toBe("manual");
    expect([...new Headers(ucpInit.headers)]).toEqual([["accept", "application/json"]]);
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toBe(
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=300",
    );
    expect(result.headers.get("set-cookie")).toBeNull();
    expect(result.headers.get("server-timing")).toBeNull();
    expect(result.headers.get("powered-by")).toBe("Shopify, Hydrogen");
    if (method === "HEAD") expect(result.body).toBeNull();
  });

  it("returns the Apple Pay domain association from the Online Store origin", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("association-file", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    const result = await handleShopifyRoutes({
      request: new Request(
        "https://my-app.com/.well-known/apple-developer-merchantid-domain-association",
      ),
    });

    assert(result, "expected association response");
    expect(mockFetch).toHaveBeenCalledWith(
      new URL(
        "https://test-store.myshopify.com/.well-known/apple-developer-merchantid-domain-association",
      ),
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(await result.text()).toBe("association-file");
  });

  it("rewrites cart.js AJAX requests to cart.json", async () => {
    await handleShopifyRoutes({
      request: new Request("https://my-app.com/en/cart.js?locale=en"),
    });

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/en/cart.json?locale=en");
  });

  it.each([
    ["/cart.js", "GET"],
    ["/__shopify/cart.js", "GET"],
    ["/api/2026-04/graphql.json", "POST"],
    ["/api/mcp", "POST"],
    ["/api/ucp/mcp", "POST"],
    ["/.well-known/shopify/fec/produce", "POST"],
  ])("rejects JSONP before forwarding through %s (%s)", async (path, method) => {
    const response = await handleShopifyRoutes({
      request: new Request(`https://store.example.com${path}?callback=readCart`, {
        method,
        headers: { cookie: "cart=cart-token%3Fkey%3Dcart-secret" },
      }),
    });
    assert(response, "expected a JSONP rejection");
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mockFetch).not.toHaveBeenCalled();
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

  it("returns Response for UCP MCP proxy requests", async () => {
    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/ucp/mcp", {
        method: "POST",
        body: "{}",
      }),
    });

    assert(result, "expected UCP MCP response");
    expect(result.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0, must-revalidate",
    );
  });

  it("returns Shopify cookies from cold UCP MCP requests (session establishing)", async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append(
      "set-cookie",
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    );
    mockFetch.mockResolvedValueOnce(new Response("{}", { headers: upstreamHeaders }));

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/api/ucp/mcp", {
        method: "POST",
        body: "{}",
      }),
    });

    expect(result?.headers.getSetCookie()).toEqual([
      "_shopify_essential=established; Path=/; Secure; HttpOnly",
    ]);
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
    const requestContext = createShopifyRequestContext({
      request,
      i18n: DEFAULT_I18N,
      buyerIp: "10.0.0.2",
    });
    const storefrontClient = createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
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

  it("throws when the request context differs from the storefront client's context", () => {
    const request = new Request("https://my-app.com/custom");
    const storefrontClient = createPrivateStorefrontClient(request);
    const requestContext = createShopifyRequestContext({ request, i18n: DEFAULT_I18N });

    expect(() => handleShopifyRoutes({ request, requestContext, storefrontClient })).toThrow(
      "same requestContext",
    );
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

  it("throws for invalid registered handler redirect statuses", async () => {
    const request = new Request("https://my-app.com/custom");
    const handler = createShopifyRouteHandler("/custom", "GET", async () => ({
      type: "redirect" as const,
      status: 304 as never,
      location: "/account?login=failed",
    }));

    await expect(handleShopifyRoutes({ request, handlers: [{ custom: handler }] })).rejects.toThrow(
      "Invalid Shopify route redirect status 304",
    );
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
    const requestContext = createShopifyRequestContext({
      request,
      i18n: DEFAULT_I18N,
      buyerIp: "10.0.0.2",
    });
    const storefrontClient = createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: defaultConfig.storeDomain,
        privateStorefrontToken: "test-private-token",
      },
    });

    await handleShopifyRoutes({ request, storefrontClient });

    const [, init] = mockFetch.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Shopify-Storefront-Private-Token")).toBe("test-private-token");
    expect(headers.get("Shopify-Storefront-Buyer-IP")).toBe("10.0.0.2");
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBeNull();
  });

  it("handles variant id product redirects before registered handlers", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            node: {
              selectedOptions: [{ name: "Color", value: "Red" }],
              product: { handle: "snowboard" },
            },
          },
        }),
        { status: 200 },
      ),
    );

    const result = await handleShopifyRoutes({
      request: new Request("https://my-app.com/products/snowboard?variant=42"),
      routeTemplates: {},
      handlers: [createCartServerHandlers()],
    });

    assert(result, "expected a redirect response");
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("https://my-app.com/products/snowboard?Color=Red");
  });

  it("returns null synchronously for non-matching URLs", () => {
    const result = handleShopifyRoutes({
      request: new Request("https://my-app.com/products"),
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
