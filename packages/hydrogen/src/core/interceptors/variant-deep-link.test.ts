import { beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../client/client";
import { createShopifyRequestContext } from "../headers";
import { createShopifyRouteTemplates } from "../standard-routes/index";
import { assert } from "../test-utils";
import { handleVariantDeepLink } from "./variant-deep-link";

const DEFAULT_I18N = { country: "US", language: "EN" } as const;
const LARGE_VARIANT_GID = "gid://shopify/ProductVariant/43695710437398";

function storefrontClient(request: Request) {
  return createStorefrontClient({
    type: "private",
    requestContext: createShopifyRequestContext({ request, i18n: DEFAULT_I18N }),
    config: {
      storeDomain: "test-store.myshopify.com",
      privateStorefrontToken: "test-private-token",
      buyerIp: "127.0.0.1",
    },
  });
}

function options(
  request: Request,
  overrides: Partial<Parameters<typeof handleVariantDeepLink>[0]> = {},
): Parameters<typeof handleVariantDeepLink>[0] {
  return {
    request,
    storefrontClient: storefrontClient(request),
    routeTemplates: createShopifyRouteTemplates({}),
    ...overrides,
  };
}

function variantResponse(handle: string, selectedOptions: Array<{ name: string; value: string }>) {
  return new Response(JSON.stringify({ data: { node: { product: { handle }, selectedOptions } } }));
}

describe("handleVariantDeepLink", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { node: null } })));
    vi.stubGlobal("fetch", mockFetch);
  });

  it("redirects a bare variant id to the option-param URL", async () => {
    mockFetch.mockResolvedValueOnce(variantResponse("slides", [{ name: "Size", value: "Large" }]));

    const request = new Request("https://my-app.com/products/slides?variant=43695710437398");
    const result = await handleVariantDeepLink(options(request));

    assert(result, "expected variant deep link redirect");
    expect(result.status).toBe(307);
    expect(result.headers.get("location")).toBe("/products/slides?Size=Large");
  });

  it("accepts a full ProductVariant GID", async () => {
    mockFetch.mockResolvedValueOnce(variantResponse("slides", [{ name: "Size", value: "Large" }]));

    const url = `https://my-app.com/products/slides?variant=${encodeURIComponent(LARGE_VARIANT_GID)}`;
    const result = await handleVariantDeepLink(options(new Request(url)));

    assert(result, "expected variant deep link redirect");
    expect(result.headers.get("location")).toBe("/products/slides?Size=Large");
  });

  it("preserves unrelated campaign params", async () => {
    mockFetch.mockResolvedValueOnce(variantResponse("slides", [{ name: "Size", value: "Medium" }]));

    const request = new Request(
      "https://my-app.com/products/slides?variant=43695710437398&utm_source=google&ref=feed",
    );
    const result = await handleVariantDeepLink(options(request));

    assert(result, "expected variant deep link redirect");
    const location = result.headers.get("location") ?? "";
    expect(location.startsWith("/products/slides?")).toBe(true);
    expect(new URLSearchParams(location.split("?")[1])).toEqual(
      new URLSearchParams({ utm_source: "google", ref: "feed", Size: "Medium" }),
    );
  });

  it("follows the variant's own product handle for combined listings", async () => {
    mockFetch.mockResolvedValueOnce(
      variantResponse("slides-wide", [{ name: "Width", value: "Wide" }]),
    );

    const request = new Request("https://my-app.com/products/slides?variant=43695710437398");
    const result = await handleVariantDeepLink(options(request));

    assert(result, "expected variant deep link redirect");
    expect(result.headers.get("location")).toBe("/products/slides-wide?Width=Wide");
  });

  it("omits Shopify's Default Title sentinel for single-variant products", async () => {
    mockFetch.mockResolvedValueOnce(
      variantResponse("gift-card", [{ name: "Title", value: "Default Title" }]),
    );

    const request = new Request("https://my-app.com/products/gift-card?variant=43695710437398");
    const result = await handleVariantDeepLink(options(request));

    assert(result, "expected variant deep link redirect");
    expect(result.headers.get("location")).toBe("/products/gift-card");
  });

  it("honors a custom product route template", async () => {
    mockFetch.mockResolvedValueOnce(variantResponse("slides", [{ name: "Size", value: "Large" }]));

    const request = new Request("https://my-app.com/p/slides?variant=43695710437398");
    const result = await handleVariantDeepLink(
      options(request, {
        routeTemplates: createShopifyRouteTemplates({ product: "/p/:productHandle" }),
      }),
    );

    assert(result, "expected variant deep link redirect");
    expect(result.headers.get("location")).toBe("/p/slides?Size=Large");
  });

  it("preserves an i18n path prefix", async () => {
    mockFetch.mockResolvedValueOnce(variantResponse("slides", [{ name: "Size", value: "Large" }]));

    const request = new Request("https://my-app.com/en-ca/products/slides?variant=43695710437398");
    const result = await handleVariantDeepLink(options(request, { pathPrefix: "/en-ca" }));

    assert(result, "expected variant deep link redirect");
    expect(result.headers.get("location")).toBe("/en-ca/products/slides?Size=Large");
  });

  it("ignores requests without a variant param", async () => {
    const request = new Request("https://my-app.com/products/slides?Size=Large");

    expect(await handleVariantDeepLink(options(request))).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ignores non-product routes carrying a variant param", async () => {
    const request = new Request("https://my-app.com/cart?variant=43695710437398");

    expect(await handleVariantDeepLink(options(request))).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("ignores a GID for another resource type without querying", async () => {
    const url = `https://my-app.com/products/slides?variant=${encodeURIComponent("gid://shopify/Customer/1")}`;

    expect(await handleVariantDeepLink(options(new Request(url)))).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("falls through when the variant does not resolve", async () => {
    const request = new Request("https://my-app.com/products/slides?variant=99999999999999");

    expect(await handleVariantDeepLink(options(request))).toBeNull();
  });
});
