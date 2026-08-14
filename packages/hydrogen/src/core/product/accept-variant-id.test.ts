import { afterEach, describe, expect, it, vi } from "vitest";

import type { StorefrontClient } from "../../client";
import { StorefrontApiError } from "../../client/errors";
import { configureLogging, resetLoggingForTests } from "../logging";
import type { ShopifyRouteHandlerContext } from "../request-routing/route-types";
import { acceptProductVariantId } from "./accept-variant-id";

const VARIANT_NODE = {
  selectedOptions: [
    { name: "Color", value: "Red" },
    { name: "Size", value: "M" },
  ],
  product: { handle: "snowboard" },
};

function createContext({
  url,
  method = "GET",
  node = VARIANT_NODE,
  graphql = vi.fn().mockResolvedValue({ data: { node } }),
  i18n = { country: "US", language: "EN" },
}: {
  url: string;
  method?: string;
  node?: typeof VARIANT_NODE | null;
  graphql?: ReturnType<typeof vi.fn>;
  i18n?: { country: string; language: string };
}) {
  const request = new Request(url, { method });
  const context = {
    request,
    storefrontClient: { graphql, i18n, storeUrl: "https://shop.myshopify.com" } as unknown as StorefrontClient,
  } as ShopifyRouteHandlerContext;

  return { context, graphql, url: new URL(url) };
}

async function run(
  handler: ReturnType<typeof acceptProductVariantId>,
  options: Parameters<typeof createContext>[0],
) {
  const { context, url, graphql } = createContext(options);
  const result = handler(url, context);
  return { result: result ? await result : null, graphql };
}

describe("acceptProductVariantId", () => {
  afterEach(() => {
    resetLoggingForTests();
  });

  it("passes through non-GET/HEAD requests, product-less URLs, and missing or malformed variant params", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const cases = [
      { url: "https://shop.com/products/snowboard?variant=1", method: "POST" },
      { url: "https://shop.com/products/snowboard" },
      { url: "https://shop.com/products/snowboard?variant=banana" },
      { url: "https://shop.com/products/snowboard?variant=-1" },
      { url: "https://shop.com/products/snowboard?variant=" },
      { url: `https://shop.com/products/snowboard?variant=${"9".repeat(31)}` },
      { url: "https://shop.com/collections/sale?variant=1" },
      { url: "https://shop.com/pages/about?variant=1" },
    ];

    for (const testCase of cases) {
      const { result, graphql } = await run(handler, testCase);
      expect(result, testCase.url).toBeNull();
      expect(graphql).not.toHaveBeenCalled();
    }
  });

  it("redirects to the same pathname with the variant's option params", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result, graphql } = await run(handler, {
      url: "https://shop.com/products/snowboard?variant=41820371452004&ref=campaign",
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/products/snowboard?ref=campaign&Color=Red&Size=M",
    });
    expect(graphql).toHaveBeenCalledWith(expect.anything(), {
      variables: { id: "gid://shopify/ProductVariant/41820371452004" },
    });
  });

  it("prefers the variant over option params already in the URL", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result } = await run(handler, {
      url: "https://shop.com/products/snowboard?Color=Blue&variant=42",
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/products/snowboard?Color=Red&Size=M",
    });
  });

  it("handles HEAD requests and collection-scoped product URLs", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result } = await run(handler, {
      url: "https://shop.com/collections/sale/products/snowboard?variant=42",
      method: "HEAD",
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/collections/sale/products/snowboard?Color=Red&Size=M",
    });
  });

  it("matches configured custom product templates", async () => {
    const handler = acceptProductVariantId({
      routeTemplates: { product: "/p/:productHandle" },
    });

    const { result } = await run(handler, { url: "https://shop.com/p/snowboard?variant=42" });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/p/snowboard?Color=Red&Size=M",
    });
  });

  it("redirects to the variant's own product page for combined listings", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result } = await run(handler, {
      url: "https://shop.com/products/combined-parent?variant=42",
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/products/snowboard?Color=Red&Size=M",
    });
  });

  it("matches locale-prefixed URLs and keeps the prefix on cross-product redirects", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {}, pathPrefix: "/fr-ca" });

    const samePage = await run(handler, {
      url: "https://shop.com/fr-ca/products/snowboard?variant=42",
    });
    expect(samePage.result).toEqual({
      type: "redirect",
      status: 302,
      location: "/fr-ca/products/snowboard?Color=Red&Size=M",
    });

    const crossProduct = await run(handler, {
      url: "https://shop.com/fr-ca/products/combined-parent?variant=42",
    });
    expect(crossProduct.result).toEqual({
      type: "redirect",
      status: 302,
      location: "/fr-ca/products/snowboard?Color=Red&Size=M",
    });
  });

  it("forwards the caching strategy to the variant lookup", async () => {
    const cache = { maxAge: 3600 };
    const handler = acceptProductVariantId({ routeTemplates: {}, cache });

    const { graphql } = await run(handler, {
      url: "https://shop.com/products/snowboard?variant=42",
    });

    expect(graphql).toHaveBeenCalledWith(expect.anything(), {
      variables: { id: "gid://shopify/ProductVariant/42" },
      cache,
    });
  });

  it("deduplicates concurrent variant lookups for the same store and variant", async () => {
    const graphql = vi.fn().mockResolvedValue({ data: { node: VARIANT_NODE } });
    const handler = acceptProductVariantId({ routeTemplates: {} });
    const first = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql,
    });
    const second = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql,
    });

    await Promise.all([
      handler(first.url, first.context),
      handler(second.url, second.context),
    ]);

    expect(graphql).toHaveBeenCalledOnce();
  });

  it("scopes concurrent variant lookup dedupe by storefront i18n", async () => {
    const graphql = vi.fn().mockResolvedValue({ data: { node: VARIANT_NODE } });
    const handler = acceptProductVariantId({ routeTemplates: {} });
    const us = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql,
      i18n: { country: "US", language: "EN" },
    });
    const ca = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql,
      i18n: { country: "CA", language: "FR" },
    });

    await Promise.all([handler(us.url, us.context), handler(ca.url, ca.context)]);

    expect(graphql).toHaveBeenCalledTimes(2);
  });

  it("strips the variant param when the variant does not exist", async () => {
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result } = await run(handler, {
      url: "https://shop.com/products/snowboard?variant=42&ref=campaign",
      node: null,
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/products/snowboard?ref=campaign",
    });
  });

  it("logs and strips the variant param when the lookup fails", async () => {
    const logger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    };
    configureLogging({ logger });
    const failure = new StorefrontApiError("SFAPI unavailable");
    const handler = acceptProductVariantId({ routeTemplates: {} });

    const { result } = await run(handler, {
      url: "https://shop.com/products/snowboard?variant=42",
      graphql: vi.fn().mockRejectedValue(failure),
    });

    expect(result).toEqual({
      type: "redirect",
      status: 302,
      location: "/products/snowboard",
    });
    expect(logger.error).toHaveBeenCalledWith("variant id redirect lookup failed", {
      scope: "product",
      error: failure,
      variantId: "gid://shopify/ProductVariant/42",
    });
  });

  it("throws programming and configuration errors from the lookup", async () => {
    const failure = new Error("Storefront API cache options require a cache configured");
    const handler = acceptProductVariantId({ routeTemplates: {} });
    const { context, url } = createContext({
      url: "https://shop.com/products/snowboard?variant=42",
      graphql: vi.fn().mockRejectedValue(failure),
    });

    await expect(handler(url, context)).rejects.toThrow(failure);
  });
});
