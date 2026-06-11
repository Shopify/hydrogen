import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStorefrontClient } from "../client/client";
import { handleShopifyRedirects } from "./handle-shopify-redirects";
import { createStorefrontRequestContext } from "./headers";
import { assert } from "./test-utils";

const defaultConfig = {
  storeDomain: "test-store.myshopify.com",
  i18n: { country: "US", language: "EN" },
} as const;

function createPrivateStorefrontClient(request: Request) {
  return createStorefrontClient({
    type: "private",
    config: {
      storeDomain: defaultConfig.storeDomain,
      i18n: defaultConfig.i18n,
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
      requestContext: createStorefrontRequestContext(request),
    },
  });
}

function redirectOptions(request: Request): Parameters<typeof handleShopifyRedirects>[0] {
  return { request, storefrontClient: createPrivateStorefrontClient(request) };
}

describe("handleShopifyRedirects", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { urlRedirects: { edges: [] } } })));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("redirects /admin to Shopify admin", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            shop: { primaryDomain: { url: "https://test-store.myshopify.com" } },
          },
        }),
      ),
    );

    const request = new Request("https://my-app.com/admin");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected admin redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("https://test-store.myshopify.com/admin");
  });

  it("returns URL redirect from Storefront API", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            urlRedirects: {
              edges: [{ node: { target: "/new-page" } }],
            },
          },
        }),
      ),
    );

    const request = new Request("https://my-app.com/old-page");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected URL redirect response");
    expect(result.status).toBe(301);
    expect(result.headers.get("location")).toBe("/new-page");
  });

  it("falls through to query param redirect", async () => {
    const request = new Request("https://my-app.com/some-page?return_to=/dashboard");
    const result = await handleShopifyRedirects(redirectOptions(request));

    assert(result, "expected query param redirect response");
    expect(result.headers.get("location")).toBe("/dashboard");
  });

  it("returns null when no redirect is found", async () => {
    const request = new Request("https://my-app.com/nonexistent");
    const result = await handleShopifyRedirects(redirectOptions(request));

    expect(result).toBeNull();
  });

  it("logs error and falls through when Storefront API fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const request = new Request("https://my-app.com/old-page");
    const result = await handleShopifyRedirects(redirectOptions(request));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to resolve Shopify redirects"),
      expect.any(Error),
    );
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});
