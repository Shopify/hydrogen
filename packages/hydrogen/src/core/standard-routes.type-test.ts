import { describe, expectTypeOf, it } from "vitest";

import { createShopifyRouteTemplates, getStandardRoute, type ShopifyRouteTemplates } from "./standard-routes/index";

describe("ShopifyRouteTemplates types", () => {
  it("accepts templates with required placeholders", () => {
    const routes = createShopifyRouteTemplates({
      article: "/articles/:articleHandle/from/:blogHandle",
      blog: "/journal/:blogHandle",
      cart: "/basket",
      collection: "/c/:collectionHandle",
      collectionList: "/catalog",
      page: "/content/:pageHandle",
      policy: "/legal/:policyHandle",
      product: "/p/:productHandle",
      productInCollection: "/p/:productHandle/in/:collectionHandle",
      search: "/find",
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
      // @ts-expect-error policy routes must include :policyHandle
      policy: "/legal/:handle",
      // @ts-expect-error static routes must start with /
      cart: "basket",
      // @ts-expect-error static routes must start with /
      collectionList: "catalog",
      // @ts-expect-error static routes must start with /
      search: "find",
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
    const policyUrl = getStandardRoute(routes, "policy", { policyHandle: "privacy-policy" });
    const cartUrl = getStandardRoute(routes, "cart", {});

    expectTypeOf(productUrl).toBeString();
    expectTypeOf(collectionUrl).toBeString();
    expectTypeOf(policyUrl).toBeString();
    expectTypeOf(cartUrl).toBeString();

    // @ts-expect-error product routes require productHandle.
    getStandardRoute(routes, "product", { collectionHandle: "winter" });
    // @ts-expect-error article routes require blogHandle and articleHandle.
    getStandardRoute(routes, "article", { articleHandle: "guide" });
    // @ts-expect-error policy routes require policyHandle.
    getStandardRoute(routes, "policy", { pageHandle: "privacy-policy" });
    // @ts-expect-error cart routes have no parameters.
    getStandardRoute(routes, "cart", { productHandle: "snowboard" });
  });
});
