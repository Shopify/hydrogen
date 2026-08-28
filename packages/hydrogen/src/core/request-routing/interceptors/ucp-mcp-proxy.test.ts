import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleUcpMcpProxy as handleUcpMcpProxyImpl } from "./ucp-mcp-proxy";

const STORE_URL = "https://test-store.myshopify.com";

function createRequest(path: string, init: RequestInit = {}): Request {
  return new Request(`https://my-app.com${path}`, {
    method: init.method ?? "POST",
    body:
      init.body ??
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "search_catalog", arguments: { catalog: { query: "snowboard" } } },
      }),
    headers: init.headers,
  });
}

function handleUcpMcpProxy(request: Request) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return handleUcpMcpProxyImpl(new URL(request.url), {
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

describe("handleUcpMcpProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response('{"jsonrpc":"2.0","id":1,"result":{}}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    resetLoggingForTests();
    vi.unstubAllGlobals();
  });

  it.each(["/api/ucp/mcp/", "/api/ucp/mcp/extra", "/api/ucp/mcps", "/api/mcp"])(
    "does not match %s",
    (path) => {
      expect(handleUcpMcpProxy(createRequest(path))).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("returns 405 for non-POST requests at the reserved route", async () => {
    const request = new Request("https://my-app.com/api/ucp/mcp", { method: "GET" });

    const response = await handleUcpMcpProxy(request);

    assert(response, "expected a response");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Method Not Allowed" },
      id: null,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("always forwards to the configured shop UCP endpoint", async () => {
    await handleUcpMcpProxy(
      createRequest("/api/ucp/mcp?session=abc", {
        headers: { "x-ucp-target": "https://untrusted.example/api/ucp/mcp" },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/api/ucp/mcp?session=abc");
    expect(new Headers(call[1].headers).get("x-ucp-target")).toBe(
      "https://untrusted.example/api/ucp/mcp",
    );
  });

  it("forwards the JSON-RPC body and caller profile without modification", async () => {
    const body = `{
  "jsonrpc": "2.0",
  "id": "caller-id",
  "method": "tools/call",
  "params": {
    "name": "search_catalog",
    "arguments": {
      "meta": {"ucp-agent": {"profile": "https://agent.example/profile.json"}},
      "catalog": {"query": "snowboard"}
    }
  }
}`;

    await handleUcpMcpProxy(
      createRequest("/api/ucp/mcp", {
        body,
        headers: { "content-type": "application/json" },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(await new Response(call[1].body).text()).toBe(body);
  });

  it("preserves caller-provided protocol and authentication headers", async () => {
    await handleUcpMcpProxy(
      createRequest("/api/ucp/mcp", {
        headers: {
          authorization: "Bearer caller-token",
          "mcp-session-id": "caller-session-id",
          "mcp-protocol-version": "2025-06-18",
          "ucp-agent": 'profile="https://agent.example/.well-known/ucp"',
          signature: "sig1=:signature:",
          "x-merchant-auth": "custom-credential",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get("authorization")).toBe("Bearer caller-token");
    expect(headers.get("mcp-session-id")).toBe("caller-session-id");
    expect(headers.get("mcp-protocol-version")).toBe("2025-06-18");
    expect(headers.get("ucp-agent")).toBe('profile="https://agent.example/.well-known/ucp"');
    expect(headers.get("signature")).toBe("sig1=:signature:");
    expect(headers.get("x-merchant-auth")).toBe("custom-credential");
  });

  it("preserves cookies and other caller-provided headers", async () => {
    await handleUcpMcpProxy(
      createRequest("/api/ucp/mcp", {
        headers: {
          cookie: "session=private",
          forwarded: "for=1.2.3.4",
          origin: "https://my-app.com",
          "oxygen-buyer-ip": "1.2.3.4",
          referer: "https://my-app.com/products/snowboard",
          "shopify-storefront-buyer-ip": "1.2.3.4",
          "x-forwarded-for": "1.2.3.4",
          "x-forwarded-host": "my-app.com",
          "x-forwarded-proto": "https",
          "x-real-ip": "1.2.3.4",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get("cookie")).toBe("session=private");
    expect(headers.get("forwarded")).toBe("for=1.2.3.4");
    expect(headers.get("origin")).toBe("https://my-app.com");
    expect(headers.get("oxygen-buyer-ip")).toBe("1.2.3.4");
    expect(headers.get("referer")).toBe("https://my-app.com/products/snowboard");
    expect(headers.get("shopify-storefront-buyer-ip")).toBe("1.2.3.4");
    expect(headers.get("x-forwarded-for")).toBe("1.2.3.4");
    expect(headers.get("x-forwarded-host")).toBe("my-app.com");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("x-real-ip")).toBe("1.2.3.4");
  });

  it("forwards upstream cookies to the caller", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('{"jsonrpc":"2.0","id":1,"result":{}}', {
        headers: {
          "set-cookie": "_shopify_essential=updated; Path=/; HttpOnly; Secure; SameSite=Lax",
        },
      }),
    );

    const response = await handleUcpMcpProxy(createRequest("/api/ucp/mcp"));

    assert(response, "expected a response");
    expect(response.headers.get("set-cookie")).toBe(
      "_shopify_essential=updated; Path=/; HttpOnly; Secure; SameSite=Lax",
    );
  });

  it("applies Hydrogen request-context headers", async () => {
    await handleUcpMcpProxy(createRequest("/api/ucp/mcp"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("custom-storefront-request-group-id")).toBeTruthy();
    expect(headers.get("sec-shopify-storefront-origin")).toBe("https://my-app.com");
  });

  it("returns a JSON-RPC error and logs upstream failures", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const error = new Error("Connection refused");
    mockFetch.mockRejectedValueOnce(error);

    const response = await handleUcpMcpProxy(createRequest("/api/ucp/mcp"));

    assert(response, "expected an error response");
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Connection refused" },
      id: null,
    });
    expect(logger.error).toHaveBeenCalledWith("request failed", {
      scope: "ucp-mcp-proxy",
      error,
    });
  });
});
