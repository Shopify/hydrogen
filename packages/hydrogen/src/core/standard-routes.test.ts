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
  });

  it("builds configured standard routes", () => {
    const routeTemplates = createShopifyRouteTemplates({
      article: "/journal/:blogHandle/:articleHandle",
      product: "/p/:productHandle",
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
      params: { productHandle: "snow board" },
    });
    expect(
      matchStandardRouteUrl({
        routeTemplates,
        url: "/journal/news/waxing guide",
      }),
    ).toEqual({
      route: "article",
      params: { blogHandle: "news", articleHandle: "waxing guide" },
    });
  });

  it("matches default standard routes even when custom templates are configured", () => {
    const routeTemplates = createShopifyRouteTemplates({
      product: "/p/:productHandle",
    });

    expect(matchStandardRouteUrl({ routeTemplates, url: "/products/snowboard" })).toEqual({
      route: "product",
      params: { productHandle: "snowboard" },
    });
    expect(matchStandardRouteUrl({ routeTemplates, url: "/collections/winter" })).toEqual({
      route: "collection",
      params: { collectionHandle: "winter" },
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

    expect(matchStandardRouteUrl({ routeTemplates, url: "/search?q=snow" })).toBeNull();
    expect(
      matchStandardRouteUrl({
        baseUrl: "https://shop.example",
        routeTemplates,
        url: "https://cdn.example/products/snowboard",
      }),
    ).toBeNull();
  });
});
