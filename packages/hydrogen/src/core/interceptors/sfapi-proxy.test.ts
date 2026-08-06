import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import {
  createShopifyRequestContext,
  SHOPIFY_CLIENT_IP_HEADER,
  STOREFRONT_BUYER_IP_HEADER,
  STOREFRONT_PRIVATE_TOKEN_HEADER,
} from "../headers";
import { configureLogging, resetLoggingForTests } from "../logging";
import { assert, createTestLogger } from "../test-utils";
import { handleSfapiProxy as handleSfapiProxyImpl } from "./sfapi-proxy";

const defaultStoreUrl = "https://test-store.myshopify.com";
const defaultBuyerIp = "127.0.0.1";

function createRequest(
  path: string,
  init?: RequestInit & { headers?: Record<string, string> },
): Request {
  return new Request(`https://my-app.com${path}`, {
    method: init?.method ?? "POST",
    body: init?.body ?? JSON.stringify({ query: "{ shop { name } }" }),
    headers: init?.headers,
  });
}

function handleSfapiProxy(request: Request, storeUrl = defaultStoreUrl, buyerIp = defaultBuyerIp) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
    buyerIp,
  });
  return handleSfapiProxyImpl({
    request,
    requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient: {
      type: "private",
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

function handleSfapiProxyWithClientType(
  request: Request,
  type: "public" | "private_no_buyer_context",
  storeUrl = defaultStoreUrl,
  buyerIp?: string,
) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
    buyerIp,
  });
  const clientBase = {
    i18n: { country: "US", language: "EN", pathPrefix: "" } as const,
    storeUrl,
    apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
    requestContext,
    graphql: vi.fn(),
  };
  const storefrontClient =
    type === "public"
      ? { ...clientBase, type: "public" as const }
      : { ...clientBase, type: "private_no_buyer_context" as const };
  return handleSfapiProxyImpl({
    request,
    requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient,
  });
}

function handlePrivateSfapiProxyWithoutBuyerContext(request: Request, storeUrl = defaultStoreUrl) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  return handleSfapiProxyImpl({
    request,
    requestContext,
    sessionManager: createTestSessionManager(request),
    storefrontClient: {
      type: "private",
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
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

describe("handleSfapiProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  afterEach(() => {
    resetLoggingForTests();
  });

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response('{"data":{}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null synchronously for non-SFAPI URLs", () => {
    const result = handleSfapiProxy(createRequest("/some-page"), defaultStoreUrl);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards request to the correct upstream URL", async () => {
    await handleSfapiProxy(createRequest("/api/2025-01/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url] = call;
    expect(url.href).toBe("https://test-store.myshopify.com/api/2025-01/graphql.json");
  });

  it("extracts API version from request path", async () => {
    await handleSfapiProxy(createRequest("/api/unstable/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url] = call;
    expect(url.href).toBe("https://test-store.myshopify.com/api/unstable/graphql.json");
  });

  it("forwards search params to the upstream URL", async () => {
    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json?extensions=persist"),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url] = call;
    expect(url.href).toBe(
      "https://test-store.myshopify.com/api/2025-01/graphql.json?extensions=persist",
    );
  });

  it("forwards request method and body", async () => {
    const body = JSON.stringify({
      query: "{ products { edges { node { id } } } }",
    });
    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", { method: "POST", body }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    expect(init.method).toBe("POST");
  });

  it("forwards allowlisted request headers", async () => {
    const request = createRequest("/api/2025-01/graphql.json", {
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": "test-agent",
        cookie: "session=abc",
      },
    });

    await handleSfapiProxy(request, defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("user-agent")).toBe("test-agent");
    expect(headers.get("cookie")).toBe("session=abc");
  });

  it("does NOT forward headers outside the allowlist", async () => {
    const request = createRequest("/api/2025-01/graphql.json", {
      headers: {
        "content-type": "application/json",
        "x-custom-secret": "should-not-be-forwarded",
        authorization: "Bearer evil",
      },
    });

    await handleSfapiProxy(request, defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("x-custom-secret")).toBeNull();
    expect(headers.get("authorization")).toBeNull();
  });

  it("does not set X-Shopify-Storefront-Access-Token from config", async () => {
    await handleSfapiProxy(createRequest("/api/2025-01/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBeNull();
  });

  it("forwards the incoming Storefront API token header without overwriting it", async () => {
    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", {
        headers: {
          "content-type": "application/json",
          "X-Shopify-Storefront-Access-Token": "browser-token",
        },
      }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBe("browser-token");
  });

  it("forwards the incoming private Storefront API token header", async () => {
    const privateToken = "private-token";

    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", {
        headers: {
          "content-type": "application/json",
          [STOREFRONT_PRIVATE_TOKEN_HEADER]: privateToken,
        },
      }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(STOREFRONT_PRIVATE_TOKEN_HEADER)).toBe(privateToken);
  });

  it("uses the request context buyer IP instead of browser-supplied buyer IP", async () => {
    const trustedBuyerIp = "1.2.3.4";
    const browserBuyerIp = "5.6.7.8";

    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", {
        headers: { [STOREFRONT_BUYER_IP_HEADER]: browserBuyerIp },
      }),
      defaultStoreUrl,
      trustedBuyerIp,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(STOREFRONT_BUYER_IP_HEADER)).toBe(trustedBuyerIp);
    expect(headers.get(SHOPIFY_CLIENT_IP_HEADER)).toBe(trustedBuyerIp);
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it.each(["public", "private_no_buyer_context"] as const)(
    "adds request context buyer IP headers for %s clients",
    async (clientType) => {
      const trustedBuyerIp = "1.2.3.4";
      const browserBuyerIp = "5.6.7.8";

      await handleSfapiProxyWithClientType(
        createRequest("/api/2025-01/graphql.json", {
          headers: { [STOREFRONT_BUYER_IP_HEADER]: browserBuyerIp },
        }),
        clientType,
        defaultStoreUrl,
        trustedBuyerIp,
      );

      const call = mockFetch.mock.calls[0];
      assert(call, "expected fetch to be called");
      const [, init] = call;
      const headers = new Headers(init.headers);
      expect(headers.get(STOREFRONT_BUYER_IP_HEADER)).toBe(trustedBuyerIp);
      expect(headers.get(SHOPIFY_CLIENT_IP_HEADER)).toBe(trustedBuyerIp);
    },
  );

  it("does not add buyer IP headers without request context buyer IP", async () => {
    const browserBuyerIp = "5.6.7.8";

    await handleSfapiProxyWithClientType(
      createRequest("/api/2025-01/graphql.json", {
        headers: { [STOREFRONT_BUYER_IP_HEADER]: browserBuyerIp },
      }),
      "public",
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get(STOREFRONT_BUYER_IP_HEADER)).toBeNull();
    expect(headers.get(SHOPIFY_CLIENT_IP_HEADER)).toBeNull();
  });

  it("requires request context buyer IP for private client proxy requests", () => {
    expect(() =>
      handlePrivateSfapiProxyWithoutBuyerContext(createRequest("/api/2025-01/graphql.json")),
    ).toThrow("requestContext.buyerIp is required for private Storefront API proxy requests");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets Custom-Storefront-Request-Group-ID as a UUID", async () => {
    await handleSfapiProxy(createRequest("/api/2025-01/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    const groupId = headers.get("Custom-Storefront-Request-Group-ID");
    expect(groupId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("reuses the incoming request id as the Storefront request group id", async () => {
    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", {
        headers: { "x-request-id": "incoming-request-id" },
      }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("Custom-Storefront-Request-Group-ID")).toBe("incoming-request-id");
  });

  it("streams the upstream response body through", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"data":{"shop":{"name":"Test"}}}', { status: 200 }),
    );

    const result = await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json"),
      defaultStoreUrl,
    );

    assert(result, "expected proxy to return a response");
    const text = await result.text();
    expect(text).toBe('{"data":{"shop":{"name":"Test"}}}');
  });

  it("forwards SFAPI server-timing and set-cookie response headers", async () => {
    const headers = new Headers({
      "content-type": "application/json",
      "server-timing": '_y;desc="unique", _s;desc="visit"',
    });
    headers.append("set-cookie", "_shopify_y=unique; Path=/; Secure");
    headers.append("set-cookie", "_shopify_s=visit; Path=/; Secure");

    mockFetch.mockResolvedValueOnce(
      new Response('{"data":{}}', {
        status: 200,
        headers,
      }),
    );

    const result = await handleSfapiProxy(
      createRequest("/api/unstable/graphql.json"),
      defaultStoreUrl,
    );

    assert(result, "expected proxy to return a response");
    expect(result.headers.get("server-timing")).toBe('_y;desc="unique", _s;desc="visit"');
    expect(result.headers.getSetCookie()).toEqual([
      "_shopify_y=unique; Path=/; Secure",
      "_shopify_s=visit; Path=/; Secure",
    ]);
  });

  it("drops body-specific upstream response headers", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"data":{}}', {
        status: 200,
        headers: {
          "content-encoding": "br",
          "content-length": "1234",
          "content-type": "application/json",
          "server-timing": '_y;desc="unique"',
        },
      }),
    );

    const result = await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json"),
      defaultStoreUrl,
    );

    assert(result, "expected proxy to return a response");
    expect(result.headers.get("content-encoding")).toBeNull();
    expect(result.headers.get("content-length")).toBeNull();
    expect(result.headers.get("content-type")).toBe("application/json");
    expect(result.headers.get("server-timing")).toBe('_y;desc="unique"');
  });

  it("returns 502 on upstream fetch failure", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const error = new Error("Connection refused");
    mockFetch.mockRejectedValueOnce(error);

    const result = await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json"),
      defaultStoreUrl,
    );

    assert(result, "expected proxy to return an error response");
    expect(result.status).toBe(502);
    expect(result.headers.get("content-type")).toBe("application/json");

    const body = await result.json();
    expect(body).toEqual({ error: "Connection refused" });
    expect(logger.error).toHaveBeenCalledWith("request failed", { scope: "sfapi-proxy", error });
  });

  it("passes AbortSignal.timeout to upstream fetch", async () => {
    await handleSfapiProxy(createRequest("/api/2025-01/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    expect(init.signal).toBeDefined();
  });
});
