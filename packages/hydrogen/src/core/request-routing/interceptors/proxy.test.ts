import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import type { HydrogenRouteInterceptor } from "../route-types";
import { createProxyInterceptor } from "./proxy";

const STORE_URL = "https://test-store.myshopify.com";

function run(
  interceptor: HydrogenRouteInterceptor,
  request: Request,
  { storeUrl = STORE_URL }: { storeUrl?: string } = {},
) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return interceptor(new URL(request.url), {
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
      storeUrl,
      apiUrl: `${storeUrl}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

async function getResponse(result: ReturnType<HydrogenRouteInterceptor>): Promise<Response> {
  assert(result, "expected a proxy response");
  return result;
}

describe("createProxyInterceptor", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    resetLoggingForTests();
  });

  it("returns a 500 error response instead of throwing when the upstream URL is invalid", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const interceptor = createProxyInterceptor({
      match: /.*/,
      scope: "test-proxy",
      requestHeaders: { allow: [] },
    });

    let result: ReturnType<HydrogenRouteInterceptor> | undefined;
    expect(() => {
      result = run(interceptor, new Request("https://app.example/anything"), {
        storeUrl: "::not-a-valid-url::",
      });
    }).not.toThrow();

    assert(result, "expected the interceptor to return a result");
    const response = await getResponse(result);
    expect(response.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "request failed",
      expect.objectContaining({ scope: "test-proxy" }),
    );
  });

  it("forwards no request headers for an empty allowlist with storefront headers off", async () => {
    const interceptor = createProxyInterceptor({
      match: /.*/,
      scope: "test-proxy",
      requestHeaders: { allow: [], applyStorefrontHeaders: false },
    });

    await run(
      interceptor,
      new Request("https://app.example/x", {
        headers: { authorization: "Bearer secret", cookie: "a=b" },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect([...new Headers(call[1].headers)]).toEqual([]);
  });

  it("rejects a response: drains the upstream body, returns the from-scratch error, and leaks no upstream headers", async () => {
    const cancel = vi.fn();
    const upstreamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("UPSTREAM-BYTES"));
      },
      cancel,
    });
    mockFetch.mockResolvedValueOnce(
      new Response(upstreamBody, {
        status: 302,
        headers: {
          location: "https://elsewhere.example/",
          "set-cookie": "shopper=secret",
          "content-type": "text/plain",
        },
      }),
    );

    const interceptor = createProxyInterceptor({
      match: /.*/,
      scope: "test-proxy",
      requestHeaders: { allow: [] },
      responseValidation: (upstream) =>
        upstream.status >= 300 && upstream.status < 400
          ? {
              status: 502,
              body: { error: "rejected" },
              headers: { "cache-control": "no-store" },
            }
          : null,
    });

    const response = await getResponse(run(interceptor, new Request("https://app.example/x")));

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({ error: "rejected" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the setup->500 / fetch->502 split when mapError is omitted", async () => {
    const setupThrows = createProxyInterceptor({
      match: /.*/,
      scope: "test-proxy",
      requestHeaders: { allow: [] },
      rewritePathname: () => {
        throw new Error("boom");
      },
    });
    const setup = await getResponse(run(setupThrows, new Request("https://app.example/x")));
    expect(setup.status).toBe(500);
    expect(mockFetch).not.toHaveBeenCalled();

    const fetchFails = createProxyInterceptor({
      match: /.*/,
      scope: "test-proxy",
      requestHeaders: { allow: [] },
    });
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
    const fetched = await getResponse(run(fetchFails, new Request("https://app.example/x")));
    expect(fetched.status).toBe(502);
  });
});
