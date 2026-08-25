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
      headers: { deny: ["cookie"], prepare },
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
      headers: { deny: [] },
      scope: "test-proxy",
    });
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const request = new Request("https://my-app.com/proxy", { method: "GET" });

    const response = await handleProxy(new URL(request.url), createOptions(request));

    assert(response, "expected a response");
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST, DELETE");
    expect(await response.text()).toBe("Method Not Allowed");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
