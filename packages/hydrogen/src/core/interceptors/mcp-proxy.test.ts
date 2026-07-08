import { describe, it, expect, vi, beforeEach } from "vitest";

import { createShopifyRequestContext } from "../headers";
import { assert } from "../test-utils";
import { handleMcpProxy as handleMcpProxyImpl } from "./mcp-proxy";

const defaultStoreUrl = "https://test-store.myshopify.com";

function createRequest(
  path: string,
  init?: RequestInit & { headers?: Record<string, string> },
): Request {
  return new Request(`https://my-app.com${path}`, {
    method: init?.method ?? "POST",
    body: init?.body ?? JSON.stringify({ jsonrpc: "2.0", method: "test", id: 1 }),
    headers: init?.headers,
  });
}

function handleMcpProxy(request: Request, storeUrl = defaultStoreUrl) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  return handleMcpProxyImpl({
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

describe("handleMcpProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response('{"jsonrpc":"2.0","result":{}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null for non-MCP URLs", async () => {
    const result = await handleMcpProxy(
      createRequest("/api/2025-01/graphql.json"),
      defaultStoreUrl,
    );
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not match /api/mcp/", async () => {
    const result = await handleMcpProxy(createRequest("/api/mcp/"), defaultStoreUrl);
    expect(result).toBeNull();
  });

  it("does not match /api/mcp/foo", async () => {
    const result = await handleMcpProxy(createRequest("/api/mcp/foo"), defaultStoreUrl);
    expect(result).toBeNull();
  });

  it("does not match /api/mcps", async () => {
    const result = await handleMcpProxy(createRequest("/api/mcps"), defaultStoreUrl);
    expect(result).toBeNull();
  });

  it("forwards request to the correct upstream URL", async () => {
    await handleMcpProxy(createRequest("/api/mcp"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url] = call;
    expect(url.href).toBe("https://test-store.myshopify.com/api/mcp");
  });

  it("forwards search params to the upstream URL", async () => {
    await handleMcpProxy(createRequest("/api/mcp?session=abc&cursor=xyz"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url] = call;
    expect(url.href).toBe("https://test-store.myshopify.com/api/mcp?session=abc&cursor=xyz");
  });

  it("forwards allowlisted request headers", async () => {
    const request = createRequest("/api/mcp", {
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": "test-agent",
      },
    });

    await handleMcpProxy(request, defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("user-agent")).toBe("test-agent");
  });

  it("does NOT forward CORS or browser tracking headers", async () => {
    const request = createRequest("/api/mcp", {
      headers: {
        "content-type": "application/json",
        "access-control-request-headers": "x-test",
        "access-control-request-method": "POST",
        "content-length": "100",
        "X-Shopify-UniqueToken": "unique-token",
        "X-Shopify-VisitToken": "visit-token",
      },
    });

    await handleMcpProxy(request, defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("access-control-request-headers")).toBeNull();
    expect(headers.get("access-control-request-method")).toBeNull();
    expect(headers.get("content-length")).toBeNull();
    expect(headers.get("X-Shopify-UniqueToken")).toBeNull();
    expect(headers.get("X-Shopify-VisitToken")).toBeNull();
  });

  it("does not add server-side headers", async () => {
    await handleMcpProxy(
      createRequest("/api/mcp", {
        headers: { "oxygen-buyer-ip": "1.2.3.4" },
      }),
      defaultStoreUrl,
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Shopify-Storefront-Access-Token")).toBeNull();
    expect(headers.get("X-Shopify-Client-IP")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
  });

  it("sets Custom-Storefront-Request-Group-ID as a UUID", async () => {
    await handleMcpProxy(createRequest("/api/mcp"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    const groupId = headers.get("Custom-Storefront-Request-Group-ID");
    expect(groupId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("returns JSON-RPC error on fetch failure and logs the error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const result = await handleMcpProxy(createRequest("/api/mcp"), defaultStoreUrl);

    assert(result, "expected proxy to return an error response");
    expect(result.status).toBe(502);
    expect(result.headers.get("content-type")).toBe("application/json");

    const body = await result.json();
    expect(body).toEqual({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Connection refused" },
      id: null,
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns generic error message for non-Error throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce("string error");

    const result = await handleMcpProxy(createRequest("/api/mcp"), defaultStoreUrl);

    assert(result, "expected proxy to return an error response");
    const body = await result.json();
    expect(body.error.message).toBe("Internal proxy error");
  });

  it("passes AbortSignal.timeout to upstream fetch", async () => {
    await handleMcpProxy(createRequest("/api/mcp"), defaultStoreUrl);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    expect(init.signal).toBeDefined();
  });
});
