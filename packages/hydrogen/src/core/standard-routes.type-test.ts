import { describe, expectTypeOf, it } from "vitest";

import { createShopifyRouteTemplates, getStandardRoute, type ShopifyRouteTemplates } from "./standard-routes/index";

describe("ShopifyRouteTemplates types", () => {
  it("accepts templates with required placeholders", () => {
    const routes = createShopifyRouteTemplates({
      article: "/articles/:articleHandle/from/:blogHandle",
      blog: "/journal/:blogHandle",
      collection: "/c/:collectionHandle",
      page: "/content/:pageHandle",
      product: "/p/:productHandle",
      productInCollection: "/p/:productHandle/in/:collectionHandle",
    });
    const canonicalProductRoutes = createShopifyRouteTemplates({
      productInCollection: "/p/:productHandle",
    });

    expectTypeOf(routes).toMatchTypeOf<ShopifyRouteTemplates>();
    expectTypeOf(canonicalProductRoutes).toMatchTypeOf<ShopifyRouteTemplates>();
    expectTypeOf(routes.product).toEqualTypeOf<"/p/:productHandle">();
    void routes;
    void canonicalProductRoutes;
  });

  it("rejects templates without the required placeholders", () => {
    const routes = createShopifyRouteTemplates({
      // @ts-expect-error product routes must include :productHandle
      product: "/p/:productHandler",
      // @ts-expect-error collection routes must include :collectionHandle
      collection: "/c/:handle",
      // @ts-expect-error page routes must start with /
      page: "content/:pageHandle",
      // @ts-expect-error article routes must include :blogHandle and :articleHandle
      article: "/articles/:articleHandle",
      // @ts-expect-error product-in-collection routes must include :productHandle
      productInCollection: "/c/:collectionHandle",
    });

    void routes;
  });

  it("requires params for the selected standard route", () => {
    const routes = createShopifyRouteTemplates({
      article: "/articles/:articleHandle/from/:blogHandle",
      product: "/p/:productHandle",
    });
    const defaultRoutes = createShopifyRouteTemplates({});

    const productUrl = getStandardRoute(routes, "product", { productHandle: "snowboard" });
    const collectionUrl = getStandardRoute(defaultRoutes, "collection", {
      collectionHandle: "winter",
    });

    expectTypeOf(productUrl).toBeString();
    expectTypeOf(collectionUrl).toBeString();

    // @ts-expect-error product routes require productHandle.
    getStandardRoute(routes, "product", { collectionHandle: "winter" });
    // @ts-expect-error article routes require blogHandle and articleHandle.
    getStandardRoute(routes, "article", { articleHandle: "guide" });
  });
});
