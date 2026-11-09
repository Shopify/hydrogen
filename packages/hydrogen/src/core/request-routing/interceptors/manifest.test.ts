import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createStorefrontClient } from "../../../client/client";
import { defineShopifyI18n } from "../../i18n/define";
import type { ShopifyI18n } from "../../i18n/types";
import { createShopifyRequestContext } from "../../request-context";
import type { ShopifyRouteTemplates } from "../../standard-routes/types";
import { assert } from "../../test-utils";
import { handleShopifyRoutes } from "../handle-shopify-routes";

const MANIFEST_URL = "https://headless.example/__shopify/hydrogen/manifest.json";

const DEFAULT_ROUTES = {
  product: "/products/:productHandle",
  collection: "/collections/:collectionHandle",
  collectionList: "/collections",
  page: "/pages/:pageHandle",
  policy: "/policies/:policyHandle",
  blog: "/blogs/:blogHandle",
  article: "/blogs/:blogHandle/:articleHandle",
  productInCollection: "/collections/:collectionHandle/products/:productHandle",
  cart: "/cart",
  search: "/search",
};

function requestManifest({
  url = MANIFEST_URL,
  method = "GET",
  i18n = defineShopifyI18n({ defaultLocale: { language: "EN", country: "US" } }),
  routeTemplates,
}: {
  url?: string;
  method?: string;
  i18n?: ShopifyI18n;
  routeTemplates?: ShopifyRouteTemplates;
} = {}) {
  const request = new Request(url, { method });
  const requestContext = createShopifyRequestContext({ request, i18n });
  const storefrontClient = createStorefrontClient({
    type: "public",
    requestContext,
    config: { storeDomain: "test-store.myshopify.com", publicStorefrontToken: "public-token" },
  });
  return handleShopifyRoutes({ request, requestContext, storefrontClient, routeTemplates });
}

describe("Hydrogen manifest route", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves route templates and locales from Hydrogen instead of proxying /__shopify", async () => {
    const response = await requestManifest({
      routeTemplates: {
        product: "/p/:productHandle",
        cart: "/basket",
        // Untyped callers can put anything on the object; only known routes are published.
        ...({ secret: "/internal" } as ShopifyRouteTemplates),
      },
      i18n: defineShopifyI18n({
        defaultLocale: { language: "EN", country: "US" },
        routing: {
          type: "pathname",
          locales: [
            { language: "FR", country: "CA" },
            // Extra per-locale fields stay private.
            { language: "PT_BR", country: "BR", pathSegment: "br", hreflang: "pt-BR" },
          ],
        },
      }),
    });

    assert(response, "expected the manifest route to match");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("powered-by")).toBe("Shopify, Hydrogen");
    expect(await response.json()).toEqual({
      version: 1,
      routes: { ...DEFAULT_ROUTES, product: "/p/:productHandle", cart: "/basket" },
      i18n: {
        type: "pathname",
        defaultLocale: { language: "EN", country: "US" },
        locales: [
          { language: "EN", country: "US", pathPrefix: "" },
          { language: "FR", country: "CA", pathPrefix: "/fr-ca" },
          { language: "PT_BR", country: "BR", pathPrefix: "/br" },
        ],
      },
    });
  });

  it.each<{
    name: string;
    i18n: ShopifyI18n;
    expected: unknown;
  }>([
    {
      name: "a single-locale definition",
      i18n: defineShopifyI18n({ defaultLocale: { language: "EN", country: "US" } }),
      expected: {
        type: "single",
        defaultLocale: { language: "EN", country: "US" },
        locales: [{ language: "EN", country: "US", pathPrefix: "" }],
      },
    },
    {
      name: "domain routing, default first",
      i18n: defineShopifyI18n({
        defaultLocale: { language: "EN", country: "US" },
        routing: {
          type: "domain",
          locales: [
            // Extra per-locale fields stay private under domain routing too.
            { language: "FR", country: "CA", hostname: "fr.example.ca", hreflang: "fr-CA" },
            { language: "EN", country: "US", hostname: "example.com" },
          ],
        },
      }),
      expected: {
        type: "domain",
        defaultLocale: { language: "EN", country: "US" },
        locales: [
          { language: "EN", country: "US", hostname: "example.com" },
          { language: "FR", country: "CA", hostname: "fr.example.ca" },
        ],
      },
    },
    {
      name: "the deprecated fixed-locale input, which has no definition",
      // The deprecated overload is not reachable through the helper's definition-typed parameter.
      i18n: { language: "EN", country: "US" } as unknown as ShopifyI18n,
      expected: null,
    },
  ])("describes $name", async ({ i18n, expected }) => {
    const response = await requestManifest({ i18n });

    assert(response, "expected the manifest route to match");
    const manifest = await response.json();
    expect(manifest.i18n).toEqual(expected);
    // Without routeTemplates, Hydrogen does not know the app's routes.
    expect(manifest.routes).toBeNull();
  });

  it("answers HEAD without a body", async () => {
    const response = await requestManifest({ method: "HEAD" });

    assert(response, "expected the manifest route to match");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });

  it("matches the exact path, leaving the rest of /__shopify to the API proxy", async () => {
    mockFetch.mockResolvedValue(new Response("upstream"));

    const response = await requestManifest({ url: `${MANIFEST_URL}/` });

    assert(response, "expected the API proxy to match");
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(await response.text()).toBe("upstream");
  });

  it("rejects other methods instead of proxying them", async () => {
    const response = await requestManifest({ method: "POST" });

    assert(response, "expected the manifest route to match");
    expect(mockFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});
