import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureLogging, resetLoggingForTests } from "../../logging";
import { createShopifyRequestContext } from "../../request-context";
import { assert, createTestLogger } from "../../test-utils";
import { handleWellKnownProxy as handleWellKnownProxyImpl } from "./well-known";

const STORE_URL = "https://test-store.myshopify.com";
const ASSOCIATION_PATH = "/.well-known/apple-developer-merchantid-domain-association";
const FEC_PRODUCE_PATH = "/.well-known/shopify/fec/produce";

function handleWellKnownProxy(request: Request) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return handleWellKnownProxyImpl(new URL(request.url), {
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

describe("handleWellKnownProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(
      new Response("association-file", {
        status: 200,
        headers: {
          "cache-control": "public, max-age=3600",
          "content-type": "text/plain",
          "set-cookie": "upstream-cookie=secret",
          "x-upstream-internal": "secret",
        },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    resetLoggingForTests();
  });

  it("proxies an allowlisted well-known path to the Online Store origin", async () => {
    const result = await handleWellKnownProxy(
      new Request(`https://headless.example${ASSOCIATION_PATH}?source=apple`),
    );

    assert(result, "expected association response");
    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url, init] = call;
    expect(url.href).toBe(`${STORE_URL}${ASSOCIATION_PATH}?source=apple`);
    expect(init.redirect).toBe("follow");
    expect(await result.text()).toBe("association-file");
  });

  it("proxies the Frontend Event Collector ingress path to the Online Store origin", async () => {
    const result = await handleWellKnownProxy(
      new Request(`https://headless.example${FEC_PRODUCE_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events: [] }),
      }),
    );

    assert(result, "expected FEC ingress response");
    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [url, init] = call;
    expect(url.href).toBe(`${STORE_URL}${FEC_PRODUCE_PATH}`);
    expect(init.method).toBe("POST");
  });

  it("does not shadow similar well-known paths", async () => {
    for (const path of [
      `${ASSOCIATION_PATH}/`,
      `${ASSOCIATION_PATH}.txt`,
      "/.well-known/other-association",
      `${FEC_PRODUCE_PATH}/`,
      `${FEC_PRODUCE_PATH}.json`,
      "/.well-known/shopify/fec",
      "/.well-known/shopify/fec/consume",
    ]) {
      const result = await handleWellKnownProxy(new Request(`https://headless.example${path}`));
      expect(result, `expected ${path} not to be proxied`).toBeNull();
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards methods so the Online Store origin determines their behavior", async () => {
    const result = await handleWellKnownProxy(
      new Request(`https://headless.example${ASSOCIATION_PATH}`, { method: "POST" }),
    );

    assert(result, "expected upstream response");
    expect(mockFetch).toHaveBeenCalledWith(
      new URL(`${STORE_URL}${ASSOCIATION_PATH}`),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("forwards request headers like the Shopify API proxy", async () => {
    await handleWellKnownProxy(
      new Request(`https://headless.example${ASSOCIATION_PATH}`, {
        headers: {
          accept: "text/plain",
          cookie: "customer=secret",
          authorization: "Bearer secret",
          "user-agent": "apple-validator",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const headers = new Headers(call[1].headers);
    expect(headers.get("accept")).toBe("text/plain");
    expect(headers.get("user-agent")).toBe("apple-validator");
    expect(headers.get("cookie")).toBe("customer=secret");
    expect(headers.get("authorization")).toBe("Bearer secret");
    expect(headers.get("Custom-Storefront-Request-Group-ID")).not.toBeNull();
    expect(headers.get("Sec-Shopify-Storefront-Origin")).toBe("https://headless.example");
  });

  it("preserves upstream response headers", async () => {
    const result = await handleWellKnownProxy(
      new Request(`https://headless.example${ASSOCIATION_PATH}`),
    );

    assert(result, "expected association response");
    expect(result.headers.get("content-type")).toBe("text/plain");
    expect(result.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(result.headers.get("set-cookie")).toBe("upstream-cookie=secret");
    expect(result.headers.get("x-upstream-internal")).toBe("secret");
  });

  it("returns a 502 response and logs upstream failures", async () => {
    const logger = createTestLogger();
    configureLogging({ logger });
    const error = new Error("Connection refused");
    mockFetch.mockRejectedValueOnce(error);

    const result = await handleWellKnownProxy(
      new Request(`https://headless.example${ASSOCIATION_PATH}`),
    );

    assert(result, "expected proxy error response");
    expect(result.status).toBe(502);
    expect(logger.error).toHaveBeenCalledWith("request failed", {
      scope: "well-known-proxy",
      error,
    });
  });
});
