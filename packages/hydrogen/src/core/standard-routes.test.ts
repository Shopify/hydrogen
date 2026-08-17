import { describe, expect, it } from "vitest";

import {
  createShopifyRouteTemplates,
  getStandardRoute,
  matchStandardRouteUrl,
  resolveStandardRouteUrl,
} from "./standard-routes/index";
import { normalizePathPrefix, prependPathPrefix } from "./standard-routes/path";

describe("standard routes", () => {
  it("builds default Shopify standard routes", () => {
    const routeTemplates = createShopifyRouteTemplates({});

    expect(getStandardRoute(routeTemplates, "product", { productHandle: "snow board" })).toBe(
      "/products/snow%20board",
    );
    expect(
      getStandardRoute(routeTemplates, "productInCollection", {
        collectionHandle: "winter",
        productHandle: "snowboard",
      }),
    ).toBe("/collections/winter/products/snowboard");
    expect(getStandardRoute(routeTemplates, "cart", {})).toBe("/cart");
    expect(getStandardRoute(routeTemplates, "collectionList", {})).toBe("/collections");
    expect(getStandardRoute(routeTemplates, "policy", { policyHandle: "privacy-policy" })).toBe(
      "/policies/privacy-policy",
    );
    expect(getStandardRoute(routeTemplates, "search", {})).toBe("/search");
  });

  it("builds configured standard routes", () => {
    const routeTemplates = createShopifyRouteTemplates({
      article: "/journal/:blogHandle/:articleHandle",
      cart: "/basket",
      collectionList: "/catalog",
      policy: "/legal/:policyHandle",
      product: "/p/:productHandle",
      search: "/find",
    });

    expect(
      getStandardRoute(
        routeTemplates,
        "article",
        { articleHandle: "waxing guide", blogHandle: "news" },
        { pathPrefix: "/fr-ca" },
      ),
    ).toBe("/fr-ca/journal/news/waxing%20guide");
    expect(getStandardRoute(routeTemplates, "collection", { collectionHandle: "winter" })).toBe(
      "/collections/winter",
    );
    expect(getStandardRoute(routeTemplates, "cart", {})).toBe("/basket");
    expect(getStandardRoute(routeTemplates, "collectionList", {})).toBe("/catalog");
    expect(getStandardRoute(routeTemplates, "policy", { policyHandle: "refund-policy" })).toBe(
      "/legal/refund-policy",
    );
    expect(getStandardRoute(routeTemplates, "search", {})).toBe("/find");
  });

  it("resolves standard route URLs to configured route templates", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    expect(
      resolveStandardRouteUrl({
        routeTemplates,
        url: "/products/snow board?variant=1#reviews",
      }),
    ).toBe("/p/snow%20board?variant=1#reviews");
  });

  it("matches configured route templates", () => {
    const routeTemplates = createShopifyRouteTemplates({
      article: "/journal/:blogHandle/:articleHandle",
      product: "/p/:productHandle",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/p/snow board?variant=1" })).toEqual({
      route: "product",
      pageTemplateName: "product",
      params: { productHandle: "snow board" },
      standardPathname: "/products/snow%20board",
      templates: {
        standard: "/products/:productHandle",
        custom: "/p/:productHandle",
      },
    });
    expect(
      matchStandardRouteUrl({
        routeTemplates,
        url: "/journal/news/waxing guide",
      }),
    ).toEqual({
      route: "article",
      pageTemplateName: "article",
      params: { blogHandle: "news", articleHandle: "waxing guide" },
      standardPathname: "/blogs/news/waxing%20guide",
      templates: {
        standard: "/blogs/:blogHandle/:articleHandle",
        custom: "/journal/:blogHandle/:articleHandle",
      },
    });
  });

  it("matches default standard routes even when custom templates are configured", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/products/snowboard" })).toEqual({
      route: "product",
      pageTemplateName: "product",
      params: { productHandle: "snowboard" },
      standardPathname: "/products/snowboard",
      templates: {
        standard: "/products/:productHandle",
        custom: "/p/:productHandle",
      },
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/collections/winter" })).toEqual({
      route: "collection",
      pageTemplateName: "collection",
      params: { collectionHandle: "winter" },
      standardPathname: "/collections/winter",
      templates: {
        standard: "/collections/:collectionHandle",
        custom: "/collections/:collectionHandle",
      },
    });
  });

  it("prefers Shopify default route identities over overlapping configured templates", () => {
    const routeTemplates = createShopifyRouteTemplates({
      policy: "/pages/:policyHandle",
      productInCollection: "/products/:productHandle",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/pages/privacy-policy" })).toMatchObject({
      route: "page",
      pageTemplateName: "page",
      params: { pageHandle: "privacy-policy" },
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/products/snowboard" })).toMatchObject({
      route: "product",
      pageTemplateName: "product",
      params: { productHandle: "snowboard" },
    });
  });

  it("matches the root as the index route", () => {
    const routeTemplates = createShopifyRouteTemplates({ collectionList: "/" });

    expect(resolveStandardRouteUrl({ routeTemplates, url: "/collections" })).toBe("/");

    expect(matchStandardRouteUrl({ routeTemplates, url: "/" })).toEqual({
      route: "index",
      pageTemplateName: "index",
      params: {},
      standardPathname: "/",
      templates: { standard: "/", custom: "/" },
    });
    expect(
      matchStandardRouteUrl({
        pathPrefix: "/fr-ca/",
        routeTemplates,
        url: "/fr-ca/",
      }),
    ).toEqual({
      route: "index",
      pageTemplateName: "index",
      params: {},
      standardPathname: "/fr-ca/",
      templates: { standard: "/", custom: "/" },
    });
  });

  it.each([
    {
      url: "/cart",
      expected: { route: "cart", pageTemplateName: "cart", params: {} },
    },
    {
      url: "/search?q=snowboard",
      expected: { route: "search", pageTemplateName: "search", params: {} },
    },
    {
      url: "/collections",
      expected: {
        route: "collectionList",
        pageTemplateName: "list-collections",
        params: {},
      },
    },
    {
      url: "/products",
      expected: {
        route: "collectionList",
        pageTemplateName: "list-collections",
        params: {},
      },
    },
    {
      url: "/policies/privacy-policy",
      expected: {
        route: "policy",
        pageTemplateName: "policy",
        params: { policyHandle: "privacy-policy" },
      },
    },
  ] as const)("matches the Liquid page template for $url", ({ url, expected }) => {
    const routeTemplates = createShopifyRouteTemplates({});

    expect(matchStandardRouteUrl({ routeTemplates, url })).toMatchObject(expected);
  });

  it("matches configured storefront utility routes", () => {
    const routeTemplates = createShopifyRouteTemplates({
      cart: "/basket",
      collectionList: "/catalog",
      policy: "/legal/:policyHandle",
      search: "/find",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/basket" })).toMatchObject({
      route: "cart",
      pageTemplateName: "cart",
      params: {},
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/catalog" })).toMatchObject({
      route: "collectionList",
      pageTemplateName: "list-collections",
      params: {},
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/legal/terms-of-service" })).toMatchObject(
      {
        route: "policy",
        pageTemplateName: "policy",
        params: { policyHandle: "terms-of-service" },
      },
    );
    expect(matchStandardRouteUrl({ routeTemplates, url: "/find?q=snowboard" })).toMatchObject({
      route: "search",
      pageTemplateName: "search",
      params: {},
    });
  });

  it("resolves canonical and legacy collection-listing routes", () => {
    const routeTemplates = createShopifyRouteTemplates({ collectionList: "/catalog" });

    expect(resolveStandardRouteUrl({ routeTemplates, url: "/collections" })).toBe("/catalog");
    expect(resolveStandardRouteUrl({ routeTemplates, url: "/products" })).toBe("/catalog");
    expect(matchStandardRouteUrl({ routeTemplates, url: "/products" })).toEqual({
      route: "collectionList",
      pageTemplateName: "list-collections",
      params: {},
      standardPathname: "/collections",
      templates: {
        standard: "/collections",
        custom: "/catalog",
      },
    });
  });

  it("resolves standard route URLs with an i18n path prefix", () => {
    const routeTemplates = createShopifyRouteTemplates({
      article: "/journal/:blogHandle/:articleHandle",
    });

    expect(
      resolveStandardRouteUrl({
        pathPrefix: "/fr-ca/",
        routeTemplates,
        url: "/fr-ca/blogs/news/waxing guide",
      }),
    ).toBe("/fr-ca/journal/news/waxing%20guide");
  });

  it("matches route templates with an i18n path prefix", () => {
    const routeTemplates = createShopifyRouteTemplates({
      productInCollection: "/c/:collectionHandle/p/:productHandle",
    });

    expect(
      matchStandardRouteUrl({
        pathPrefix: "/fr-ca/",
        routeTemplates,
        url: "/fr-ca/c/winter/p/snowboard",
      }),
    ).toEqual({
      route: "productInCollection",
      pageTemplateName: "product",
      params: { collectionHandle: "winter", productHandle: "snowboard" },
      standardPathname: "/fr-ca/collections/winter/products/snowboard",
      templates: {
        standard: "/collections/:collectionHandle/products/:productHandle",
        custom: "/c/:collectionHandle/p/:productHandle",
      },
    });
  });

  it("preserves URLs without matching route templates", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    expect(resolveStandardRouteUrl({ routeTemplates, url: "/collections/winter" })).toBe(
      "/collections/winter",
    );
    expect(
      resolveStandardRouteUrl({
        baseUrl: "https://shop.example",
        routeTemplates,
        url: "https://cdn.example/products/snowboard",
      }),
    ).toBe("https://cdn.example/products/snowboard");
  });

  it("normalizes path prefixes with surrounding whitespace", () => {
    expect(normalizePathPrefix(" /fr-ca/ ")).toBe("/fr-ca");
    expect(normalizePathPrefix("  ")).toBe("");
    expect(normalizePathPrefix(undefined)).toBe("");
    expect(prependPathPrefix("/products", " /fr-ca/ ")).toBe("/fr-ca/products");
  });

  it("does not match external or unknown URLs", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/unknown?q=snow" })).toBeNull();
    expect(
      matchStandardRouteUrl({
        baseUrl: "https://shop.example",
        routeTemplates,
        url: "https://cdn.example/products/snowboard",
      }),
    ).toBeNull();
  });
});
