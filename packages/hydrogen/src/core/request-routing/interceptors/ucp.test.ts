import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleUcpProxy as handleUcpProxyImpl } from "./ucp";

const STORE_URL = "https://test-store.myshopify.com";
const UCP_PATH = "/.well-known/ucp";
const UCP_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=86400";

function handleUcpProxy(request: Request) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return handleUcpProxyImpl(new URL(request.url), {
    request,
    requestContext,
    sessionManager: {
      getSessionOrigin: () => new URL(request.url).origin,
      getSessionItem: () => undefined,
      setSessionItem: () => undefined,
      removeSessionItem: () => undefined,
    },
    storefrontClient: {
      type: "private",
      i18n: { country: "US", language: "EN", pathPrefix: "" },
      storeUrl: STORE_URL,
      apiUrl: `${STORE_URL}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

function getResponse(result: Awaited<ReturnType<typeof handleUcpProxy>>): Response {
  assert(result, "expected UCP response");
  return result;
}

describe("handleUcpProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response('{"ucp":{"version":"2026-01-11"}}', {
        status: 200,
        headers: {
          "cache-control": "private, max-age=0",
          "content-type": "application/json",
          etag: '"profile-etag"',
          "last-modified": "Thu, 27 Aug 2026 20:00:00 GMT",
          "set-cookie": "shopper=secret",
          vary: "Accept-Encoding",
          "x-shopify-internal": "secret",
        },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    resetLoggingForTests();
  });

  it("proxies the UCP profile to the Online Store origin", async () => {
    const result = await handleUcpProxy(
      new Request(`https://headless.example${UCP_PATH}?ignored=true`),
    );

    getResponse(result);
    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url, init] = call;
    expect(url.href).toBe(`${STORE_URL}${UCP_PATH}`);
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("only handles exact GET requests", async () => {
    for (const request of [
      new Request("https://headless.example/.well-known/ucp/"),
      new Request(`https://headless.example${UCP_PATH}`, { method: "POST" }),
    ]) {
      expect(handleUcpProxy(request)).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not forward shopper or conditional request headers", async () => {
    await handleUcpProxy(
      new Request(`https://headless.example${UCP_PATH}`, {
        headers: {
          accept: "text/html",
          authorization: "Bearer secret",
          cookie: "shopper=secret",
          "if-none-match": '"old-profile"',
          "user-agent": "commerce-agent",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect([...headers]).toEqual([["accept", "application/json"]]);
  });

  it("streams successful profiles with edge-first caching and validation headers", async () => {
    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`)),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(UCP_CACHE_CONTROL);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("etag")).toBe('"profile-etag"');
    expect(response.headers.get("last-modified")).toBe("Thu, 27 Aug 2026 20:00:00 GMT");
    expect(response.headers.get("vary")).toBe("Accept-Encoding");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-shopify-internal")).toBeNull();
    await expect(response.json()).resolves.toEqual({ ucp: { version: "2026-01-11" } });
  });

  it.each([
    [302, { location: "https://other.example/.well-known/ucp" }],
    [200, { "content-type": "text/html" }],
  ])("rejects invalid upstream responses", async (status, headers) => {
    const logger = createTestLogger();
    configureLogging({ logger });
    mockFetch.mockResolvedValueOnce(new Response("invalid profile", { status, headers }));

    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`)),
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      error: "Invalid Shopify UCP profile response",
    });
    expect(logger.error).toHaveBeenCalledWith("invalid profile response", {
      scope: "ucp-proxy",
      status,
      contentType: status === 200 ? "text/html" : "text/plain;charset=UTF-8",
    });
  });

  it.each([404, 500])("does not cache upstream %s responses", async (status) => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        { error: "upstream error" },
        { status, headers: { "cache-control": "public" } },
      ),
    );

    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`)),
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    [new DOMException("Timed out", "TimeoutError"), 504],
    [new Error("Connection refused"), 502],
  ])("logs fetch failures and returns an uncached response", async (error, status) => {
    const logger = createTestLogger();
    configureLogging({ logger });
    mockFetch.mockRejectedValueOnce(error);

    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`)),
    );

    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Unable to fetch the Shopify UCP profile",
    });
    expect(logger.error).toHaveBeenCalledWith("request failed", {
      scope: "ucp-proxy",
      error,
    });
  });
});
