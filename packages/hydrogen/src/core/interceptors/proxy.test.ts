import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import {
  createShopifyRequestContext,
  REQUEST_GROUP_ID_HEADER,
  SHOPIFY_CLIENT_IP_HEADER,
  SHOPIFY_CLIENT_IP_SIG_HEADER,
} from "../headers";
import { assert } from "../test-utils";
import { createProxyInterceptor } from "./proxy";

type ProxyDescriptor = Parameters<typeof createProxyInterceptor>[0];

const DEFAULT_DESCRIPTOR: ProxyDescriptor = {
  match: /^\/proxy$/,
  allowlist: ["accept", SHOPIFY_CLIENT_IP_HEADER, SHOPIFY_CLIENT_IP_SIG_HEADER],
  formatError: (message) => ({ error: message }),
  logPrefix: "Test proxy",
};

function proxyRequest(request: Request, descriptor: Partial<ProxyDescriptor> = {}) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: { storeDomain: "test-store.myshopify.com" },
  });
  const data = new Map<string, unknown>();
  const handleProxy = createProxyInterceptor({ ...DEFAULT_DESCRIPTOR, ...descriptor });

  return handleProxy({
    request,
    requestContext,
    storefrontClient,
    sessionManager: {
      getSessionOrigin: () => new URL(request.url).origin,
      getSessionItem: (key) => data.get(key),
      setSessionItem: (key, value) => data.set(key, value),
      removeSessionItem: (key) => data.delete(key),
    },
  });
}

describe("createProxyInterceptor", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null without fetching when the pathname does not match", async () => {
    const response = await proxyRequest(new Request("https://example.com/not-proxied"));

    expect(response).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards the path, query, method, body, and allowlisted headers", async () => {
    const request = new Request("https://example.com/proxy?cursor=next", {
      method: "POST",
      body: "request-body",
      headers: {
        accept: "application/json",
        "x-not-allowed": "private",
      },
    });

    await proxyRequest(request);

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url, init] = call;
    expect(url.href).toBe("https://test-store.myshopify.com/proxy?cursor=next");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(request.body);
    expect(init.duplex).toBe("half");
    expect(init.redirect).toBe("manual");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(init.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("x-not-allowed")).toBeNull();
  });

  it("reuses the incoming request ID and applies descriptor headers", async () => {
    const prepareHeaders = vi.fn((headers: Headers) => headers.set("x-prepared", "true"));

    await proxyRequest(
      new Request("https://example.com/proxy", {
        headers: { "x-request-id": "incoming-request-id" },
      }),
      { prepareHeaders },
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(prepareHeaders).toHaveBeenCalledOnce();
    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toBe("incoming-request-id");
    expect(headers.get("x-prepared")).toBe("true");
  });

  it("generates a request group ID when the request has none", async () => {
    await proxyRequest(new Request("https://example.com/proxy"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get(REQUEST_GROUP_ID_HEADER)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("uses the descriptor timeout", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutSignal);

    await proxyRequest(new Request("https://example.com/proxy"), { timeoutMs: 1_234 });

    expect(timeout).toHaveBeenCalledWith(1_234);
    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[1].signal).toBe(timeoutSignal);
  });

  it("replaces incoming client IP headers with Oxygen-provided values", async () => {
    await proxyRequest(
      new Request("https://example.com/proxy", {
        headers: {
          "oxygen-buyer-ip": "1.2.3.4",
          [SHOPIFY_CLIENT_IP_HEADER]: "5.6.7.8",
          [SHOPIFY_CLIENT_IP_SIG_HEADER]: "signed-client-ip",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get(SHOPIFY_CLIENT_IP_HEADER)).toBe("1.2.3.4");
    expect(headers.get(SHOPIFY_CLIENT_IP_SIG_HEADER)).toBe("signed-client-ip");
  });

  it("removes client IP headers without Oxygen-provided values", async () => {
    await proxyRequest(
      new Request("https://example.com/proxy", {
        headers: {
          [SHOPIFY_CLIENT_IP_HEADER]: "5.6.7.8",
          [SHOPIFY_CLIENT_IP_SIG_HEADER]: "untrusted-signature",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get(SHOPIFY_CLIENT_IP_HEADER)).toBeNull();
    expect(headers.get(SHOPIFY_CLIENT_IP_SIG_HEADER)).toBeNull();
  });

  it("preserves the upstream response while removing stale body metadata", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("response-body", {
        status: 202,
        statusText: "Accepted",
        headers: {
          "content-encoding": "gzip",
          "content-length": "999",
          "x-upstream": "preserved",
        },
      }),
    );

    const response = await proxyRequest(new Request("https://example.com/proxy"));

    assert(response, "expected a proxy response");
    expect(response.status).toBe(202);
    expect(response.statusText).toBe("Accepted");
    expect(response.headers.get("content-encoding")).toBeNull();
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("x-upstream")).toBe("preserved");
    expect(await response.text()).toBe("response-body");
  });

  it("formats fetch errors as 502 responses and logs the failure", async () => {
    const error = new Error("Connection refused");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(error);

    const response = await proxyRequest(new Request("https://example.com/proxy"));

    assert(response, "expected an error response");
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Connection refused" });
    expect(consoleError).toHaveBeenCalledWith("Test proxy request failed:", error);
  });

  it("uses a generic message for non-Error fetch failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce("offline");

    const response = await proxyRequest(new Request("https://example.com/proxy"));

    assert(response, "expected an error response");
    expect(await response.json()).toEqual({ error: "Internal proxy error" });
  });
});
