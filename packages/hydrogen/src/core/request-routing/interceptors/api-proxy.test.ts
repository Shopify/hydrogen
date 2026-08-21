import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SHOPIFY_STOREFRONT_ORIGIN_HEADER } from "../../headers";
import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleShopifyApiProxy as handleShopifyApiProxyImpl } from "./api-proxy";

const STORE_URL = "https://test-store.myshopify.com";

function handleShopifyApiProxy(request: Request) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return handleShopifyApiProxyImpl(new URL(request.url), {
    request,
    requestContext,
    sessionManager: {
      getSessionOrigin: () => new URL(request.url).origin,
      getSessionItem: () => undefined,
      setSessionItem: () => undefined,
      removeSessionItem: () => undefined,
    },
    storefrontClient: {
      type: "public",
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      storeUrl: STORE_URL,
      apiUrl: `${STORE_URL}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

describe("handleShopifyApiProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  afterEach(() => {
    resetLoggingForTests();
  });

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null synchronously outside the reserved prefix", () => {
    expect(
      handleShopifyApiProxy(new Request("https://my-app.com/__shopify-other/path")),
    ).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("removes the prefix and forwards the path and search params to SFR", async () => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/apps/inbox/config.json?locale=en"),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/apps/inbox/config.json?locale=en");
  });

  it("forwards the prefix root to the SFR root", async () => {
    await handleShopifyApiProxy(new Request("https://my-app.com/__shopify"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/");
  });

  it.each([
    ["cart.js", "cart.json"],
    ["products/snowboard.js", "products/snowboard.json"],
    ["variants/123.js", "variants/123.json"],
  ])("rewrites the %s endpoint to %s", async (requestPath, upstreamPath) => {
    await handleShopifyApiProxy(
      new Request(`https://my-app.com/__shopify/${requestPath}?locale=en`),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe(`https://test-store.myshopify.com/${upstreamPath}?locale=en`);
  });

  it("returns 500 for unsupported CDN proxy requests", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });

    const responsePromise = handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/cdn/assets/theme.js?version=1"),
    );

    expect(responsePromise).toBeInstanceOf(Promise);
    const response = await responsePromise;
    assert(response, "expected proxy to return an error response");
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "CDN proxy is not supported." });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith("request failed", {
      scope: "shopify-api-proxy",
      error: expect.objectContaining({ message: "CDN proxy is not supported." }),
    });
  });

  it("keeps repeated slashes in the path from changing the upstream origin", async () => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify//untrusted.example/path"),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/untrusted.example/path");
  });

  it("forwards the method, body, and browser headers", async () => {
    const body = JSON.stringify({ event: "test" });
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/events", {
        method: "POST",
        body,
        headers: {
          authorization: "Bearer browser-token",
          cookie: "_shopify_y=abc",
          "content-type": "application/json",
          [SHOPIFY_STOREFRONT_ORIGIN_HEADER]: "https://untrusted.example",
          "sec-fetch-site": "same-origin",
          "x-custom-header": "custom-value",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(init.body).not.toBeNull();
    expect(headers.get("authorization")).toBe("Bearer browser-token");
    expect(headers.get("cookie")).toBe("_shopify_y=abc");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get(SHOPIFY_STOREFRONT_ORIGIN_HEADER)).toBe("https://my-app.com");
    expect(headers.get("sec-fetch-site")).toBe("same-origin");
    expect(headers.get("x-custom-header")).toBe("custom-value");
  });

  it("consumes upstream state from SFR responses", async () => {
    const headers = new Headers({ "server-timing": '_y;desc="unique"' });
    headers.append("set-cookie", "future_cookie=value; Path=/; Secure");
    mockFetch.mockResolvedValueOnce(new Response("ok", { headers }));

    const result = await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/events", { method: "POST" }),
    );

    assert(result, "expected proxy to return a response");
    expect(result.headers.getSetCookie()).toEqual([]);
    expect(result.headers.get("server-timing")).toBeNull();
  });

  it.each([
    "cf-connecting-ip",
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ])("does not forward the problematic %s header", async (header) => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/events", {
        headers: { [header]: "untrusted-value" },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(new Headers(call[1].headers).get(header)).toBeNull();
  });
});
