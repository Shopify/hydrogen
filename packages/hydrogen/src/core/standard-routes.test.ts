import { describe, expect, it } from "vitest";

import {
  createShopifyRouteTemplates,
  getStandardRoute,
  matchStandardRouteUrl,
  resolveStandardRouteUrl,
} from "./standard-routes/index";

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
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/collections/winter" })).toEqual({
      route: "collection",
      pageTemplateName: "collection",
      params: { collectionHandle: "winter" },
    });
  });

  it("matches the root as the index route", () => {
    const routeTemplates = createShopifyRouteTemplates({});

    expect(matchStandardRouteUrl({ routeTemplates, url: "/" })).toEqual({
      route: "index",
      pageTemplateName: "index",
      params: {},
    });
    expect(
      matchStandardRouteUrl({
        pathPrefix: "/fr-ca/",
        routeTemplates,
        url: "/fr-ca/",
      }),
    ).toEqual({ route: "index", pageTemplateName: "index", params: {} });
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

    expect(matchStandardRouteUrl({ routeTemplates, url })).toEqual(expected);
  });

  it("matches configured storefront utility routes", () => {
    const routeTemplates = createShopifyRouteTemplates({
      cart: "/basket",
      collectionList: "/catalog",
      policy: "/legal/:policyHandle",
      search: "/find",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/basket" })).toEqual({
      route: "cart",
      pageTemplateName: "cart",
      params: {},
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/catalog" })).toEqual({
      route: "collectionList",
      pageTemplateName: "list-collections",
      params: {},
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/legal/terms-of-service" })).toEqual({
      route: "policy",
      pageTemplateName: "policy",
      params: { policyHandle: "terms-of-service" },
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/find?q=snowboard" })).toEqual({
      route: "search",
      pageTemplateName: "search",
      params: {},
    });
  });

  it("resolves canonical and legacy collection-listing routes", () => {
    const routeTemplates = createShopifyRouteTemplates({ collectionList: "/catalog" });

    expect(resolveStandardRouteUrl({ routeTemplates, url: "/collections" })).toBe("/catalog");
    expect(resolveStandardRouteUrl({ routeTemplates, url: "/products" })).toBe("/catalog");
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
