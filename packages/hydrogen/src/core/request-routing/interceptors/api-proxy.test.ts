import { beforeEach, describe, expect, it, vi } from "vitest";

import { createShopifyRequestContext } from "../../request-context";
import { assert } from "../../test-utils";
import { handleShopifyApiProxy as handleShopifyApiProxyImpl } from "./api-proxy";

const STORE_URL = "https://test-store.myshopify.com";

function handleShopifyApiProxy(request: Request) {
  const requestContext = createShopifyRequestContext({
    request,
    i18n: { country: "US", language: "EN" },
  });

  return handleShopifyApiProxyImpl(new URL(request.url), {
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
      storeUrl: STORE_URL,
      apiUrl: `${STORE_URL}/api/2026-04/graphql.json`,
      requestContext,
      graphql: vi.fn(),
    },
  });
}

describe("handleShopifyApiProxy", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns null synchronously outside the reserved prefix", () => {
    expect(
      handleShopifyApiProxy(new Request("https://my-app.com/__shopify-other/path")),
    ).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("removes the prefix and forwards the path and search params to SFR", async () => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/apps/inbox/config.json?locale=en"),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/apps/inbox/config.json?locale=en");
  });

  it("forwards the prefix root to the SFR root", async () => {
    await handleShopifyApiProxy(new Request("https://my-app.com/__shopify"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/");
  });

  it("rewrites the cart.js endpoint to cart.json", async () => {
    await handleShopifyApiProxy(new Request("https://my-app.com/__shopify/cart.js?locale=en"));

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/cart.json?locale=en");
  });

  it("keeps repeated slashes in the path from changing the upstream origin", async () => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify//untrusted.example/path"),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(call[0].href).toBe("https://test-store.myshopify.com/untrusted.example/path");
  });

  it("forwards the method, body, and browser headers", async () => {
    const body = JSON.stringify({ event: "test" });
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/events", {
        method: "POST",
        body,
        headers: {
          authorization: "Bearer browser-token",
          cookie: "_shopify_y=abc",
          "content-type": "application/json",
          "sec-fetch-site": "same-origin",
          "x-custom-header": "custom-value",
        },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    const [, init] = call;
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(init.body).not.toBeNull();
    expect(headers.get("authorization")).toBe("Bearer browser-token");
    expect(headers.get("cookie")).toBe("_shopify_y=abc");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("sec-fetch-site")).toBe("same-origin");
    expect(headers.get("x-custom-header")).toBe("custom-value");
  });

  it.each([
    "connection",
    "content-length",
    "host",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ])("does not forward the problematic %s header", async (header) => {
    await handleShopifyApiProxy(
      new Request("https://my-app.com/__shopify/events", {
        headers: { [header]: "untrusted-value" },
      }),
    );

    const call = mockFetch.mock.calls[0];
    assert(call, "expected fetch to be called");
    expect(new Headers(call[1].headers).get(header)).toBeNull();
  });
});
