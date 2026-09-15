import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleUcpProxy as handleUcpProxyImpl } from "./ucp";

const STORE_URL = "https://test-store.myshopify.com";
const UCP_PATH = "/.well-known/ucp";
const UCP_CACHE_CONTROL =
  "public, max-age=60, s-maxage=60, stale-while-revalidate=300, stale-if-error=300";

function handleUcpProxy(request: Request, storeUrl = STORE_URL) {
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
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
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

  it("ignores unsupported paths and methods", async () => {
    for (const request of [
      new Request("https://headless.example/.well-known/ucp/"),
      new Request(`https://headless.example${UCP_PATH}`, { method: "POST" }),
    ]) {
      expect(handleUcpProxy(request)).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards conditional request headers but not shopper state", async () => {
    const lastModified = "Thu, 27 Aug 2026 20:00:00 GMT";
    await handleUcpProxy(
      new Request(`https://headless.example${UCP_PATH}`, {
        headers: {
          accept: "text/html",
          authorization: "Bearer secret",
          cookie: "shopper=secret",
          "if-none-match": '"old-profile"',
          "if-modified-since": lastModified,
          "user-agent": "commerce-agent",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect([...headers]).toEqual([
      ["accept", "application/json"],
      ["if-modified-since", lastModified],
      ["if-none-match", '"old-profile"'],
    ]);
  });

  it("passes through upstream 304 responses with public caching and validation headers", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const lastModified = "Thu, 27 Aug 2026 20:00:00 GMT";
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: {
          etag: '"old-profile"',
          "last-modified": lastModified,
          "cache-control": "private",
          "set-cookie": "shopper=secret",
          "x-shopify-internal": "secret",
        },
      }),
    );

    const response = getResponse(
      await handleUcpProxy(
        new Request(`https://headless.example${UCP_PATH}`, {
          headers: { "if-none-match": '"old-profile"' },
        }),
      ),
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("cache-control")).toBe(UCP_CACHE_CONTROL);
    expect(response.headers.get("etag")).toBe('"old-profile"');
    expect(response.headers.get("last-modified")).toBe(lastModified);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-shopify-internal")).toBeNull();
    expect(logger.error).not.toHaveBeenCalled();
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

  it.each(["GET", "HEAD"])("replaces upstream HTML 404s for %s", async (method) => {
    const upstream = new Response(method === "HEAD" ? null : "<html>Not found</html>", {
      status: 404,
      headers: {
        "content-type": "text/html",
        "cache-control": "public",
        "set-cookie": "shopper=secret",
        etag: '"html-404"',
      },
    });
    mockFetch.mockResolvedValueOnce(upstream);

    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`, { method })),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toBeNull();
    if (method === "HEAD") {
      expect(response.body).toBeNull();
    } else {
      await expect(response.json()).resolves.toEqual({ error: expect.any(String) });
    }
  });

  it("does not cache upstream 500 responses", async () => {
    mockFetch.mockResolvedValueOnce(
      Response.json(
        { error: "upstream error" },
        { status: 500, headers: { "cache-control": "public" } },
      ),
    );

    const response = getResponse(
      await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`)),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["GET", "HEAD"])("returns an uncached 500 for %s setup failures", async (method) => {
    const logger = createTestLogger();
    configureLogging({ logger });

    const response = getResponse(
      await handleUcpProxy(
        new Request(`https://headless.example${UCP_PATH}`, { method }),
        "::not-a-valid-url::",
      ),
    );

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockFetch).not.toHaveBeenCalled();
    if (method === "HEAD") expect(response.body).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      "request failed",
      expect.objectContaining({ scope: "ucp-proxy" }),
    );
  });

  it.each([
    ["GET", 504, new DOMException("Timed out", "TimeoutError")],
    ["GET", 502, new Error("Connection refused")],
    ["HEAD", 504, new DOMException("Timed out", "TimeoutError")],
  ])(
    "logs %s fetch failures and returns an uncached %s response",
    async (method, status, error) => {
      const logger = createTestLogger();
      configureLogging({ logger });
      mockFetch.mockRejectedValueOnce(error);

      const response = getResponse(
        await handleUcpProxy(new Request(`https://headless.example${UCP_PATH}`, { method })),
      );

      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("no-store");
      if (method === "HEAD") {
        expect(response.body).toBeNull();
      } else {
        await expect(response.json()).resolves.toEqual({
          error: "Unable to fetch the Shopify UCP profile",
        });
      }
      expect(logger.error).toHaveBeenCalledWith("request failed", {
        scope: "ucp-proxy",
        error,
      });
    },
  );
});
