import { afterEach, describe, expect, it, vi } from "vitest";

import { createShopifyRequestContext } from "../../request-context";
import { assert } from "../../test-utils";
import type { HydrogenRoutesOptions } from "../route-types";
import { createProxyInterceptor } from "./proxy";

const STORE_URL = "https://test-store.myshopify.com";

function createOptions(request: Request): HydrogenRoutesOptions {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return {
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
  };
}

describe("createProxyInterceptor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies context headers before deny and prepare", async () => {
    const prepare = vi.fn((headers: Headers) => {
      expect(headers.get("cookie")).toBeNull();
      headers.set("x-prepared", "true");
    });
    const handleProxy = createProxyInterceptor({
      match: /^\/proxy$/,
      requestHeaders: { deny: ["cookie"], prepare },
      scope: "test-proxy",
    });
    const mockFetch = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", mockFetch);
    const request = new Request("https://my-app.com/proxy", {
      headers: { cookie: "session=private" },
    });

    const response = await handleProxy(new URL(request.url), createOptions(request));

    assert(response, "expected a response");
    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("x-prepared")).toBe("true");
    expect(prepare).toHaveBeenCalledOnce();
  });

  it("returns the allowed methods when the request method is unsupported", async () => {
    const handleProxy = createProxyInterceptor({
      match: /^\/proxy$/,
      methods: ["POST", "DELETE"],
      requestHeaders: { deny: [] },
      scope: "test-proxy",
    });
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const request = new Request("https://my-app.com/proxy", { method: "GET" });

    const response = await handleProxy(new URL(request.url), createOptions(request));

    assert(response, "expected a response");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, DELETE");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Method Not Allowed" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each(["callback=readCart", "callback=", "%63allback=readCart", "callback=&callback=readCart"])(
    "rejects JSONP before forwarding requests: %s",
    async (query) => {
      const handleProxy = createProxyInterceptor({
        match: /^\/proxy$/,
        requestHeaders: { deny: [] },
        scope: "test-proxy",
      });
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const request = new Request(`https://my-app.com/proxy?${query}`);
      const response = await handleProxy(new URL(request.url), createOptions(request));
      assert(response, "expected a JSONP rejection");
      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "JSONP requests are not supported" });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("preserves the descriptor's error format for JSONP rejections", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const handleProxy = createProxyInterceptor({
      match: /^\/proxy$/,
      requestHeaders: { deny: [] },
      formatError: (message) => ({ jsonrpc: "2.0", error: { message }, id: null }),
      scope: "test-proxy",
    });
    const request = new Request("https://my-app.com/proxy?callback=readCart");
    const response = await handleProxy(new URL(request.url), createOptions(request));
    assert(response, "expected a JSONP rejection");
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      error: { message: "JSONP requests are not supported" },
      id: null,
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not intercept callback parameters outside the proxy's route", () => {
    const handleProxy = createProxyInterceptor({
      match: /^\/proxy$/,
      requestHeaders: { deny: [] },
      scope: "test-proxy",
    });
    const request = new Request("https://my-app.com/other?callback=readCart");
    expect(handleProxy(new URL(request.url), createOptions(request))).toBeNull();
  });

  it("allows similarly named parameters that do not enable JSONP", async () => {
    const handleProxy = createProxyInterceptor({
      match: /^\/proxy$/,
      requestHeaders: { deny: [] },
      scope: "test-proxy",
    });
    const mockFetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", mockFetch);
    const request = new Request("https://my-app.com/proxy?callbackUrl=/return");
    const response = await handleProxy(new URL(request.url), createOptions(request));
    assert(response, "expected a successful proxy response");
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      new URL(`${STORE_URL}/proxy?callbackUrl=/return`),
      expect.anything(),
    );
  });
});
