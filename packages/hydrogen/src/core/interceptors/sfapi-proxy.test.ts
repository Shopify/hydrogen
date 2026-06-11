import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontRequestContext } from "../headers";
import { assert } from "../test-utils";
import { handleSfapiProxy as handleSfapiProxyImpl } from "./sfapi-proxy";

const defaultStoreUrl = "https://test-store.myshopify.com";

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

function handleSfapiProxy(request: Request, storeUrl = defaultStoreUrl) {
  return handleSfapiProxyImpl({
    request,
    storefrontClient: {
      type: "private",
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
      requestContext: createStorefrontRequestContext(request),
      graphql: vi.fn(),
    },
  });
}

describe("handleSfapiProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response('{"data":{}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null for non-SFAPI URLs", async () => {
    const result = await handleSfapiProxy(createRequest("/some-page"), defaultStoreUrl);
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

  it("does not infer buyer IP headers from the request", async () => {
    await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json", {
        headers: { "oxygen-buyer-ip": "1.2.3.4" },
      }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Client-IP")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
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
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await handleSfapiProxy(
      createRequest("/api/2025-01/graphql.json"),
      defaultStoreUrl,
    );

    assert(result, "expected proxy to return an error response");
    expect(result.status).toBe(502);
    expect(result.headers.get("content-type")).toBe("application/json");

    const body = await result.json();
    expect(body).toEqual({ error: "Connection refused" });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("passes AbortSignal.timeout to upstream fetch", async () => {
    await handleSfapiProxy(createRequest("/api/2025-01/graphql.json"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    expect(init.signal).toBeDefined();
  });
});
