import { describe, it } from "vitest";

import { createStorefrontClient } from "../../client";
import { handleShopifyRoutes } from "../handle-shopify-routes";
import { createStorefrontRequestContext } from "../headers";
import { createCartServerHandlers } from "./server-handlers";

const i18n = { country: "US", language: "EN" } as const;
const requestContext = createStorefrontRequestContext(new Request("https://shop.example.com"));

describe("createCartServerHandlers type tests", () => {
  it("accepts private storefront clients", () => {
    const cartHandlers = createCartServerHandlers();
    const storefront = createStorefrontClient({
      type: "private",
      config: {
        storeDomain: "shop.example.com",
        privateStorefrontToken: "private-token",
        buyerIp: "203.0.113.10",
        i18n,
        requestContext,
      },
    });

    cartHandlers.get({ storefrontClient: storefront });
    handleShopifyRoutes({
      request: new Request("https://shop.example.com/api/cart"),
      storefrontClient: storefront,
      handlers: [cartHandlers],
    });
  });

  it("rejects public storefront clients", () => {
    const cartHandlers = createCartServerHandlers();
    const storefront = createStorefrontClient({
      type: "public",
      config: {
        storeDomain: "shop.example.com",
        publicStorefrontToken: "public-token",
        i18n,
        requestContext,
      },
    });

    // @ts-expect-error — cart bootstrap must use a private client so buyer IP is forwarded.
    cartHandlers.get({ storefrontClient: storefront });
  });

  it("preserves literal path and method metadata", () => {
    const cartHandlers = createCartServerHandlers();

    const getPathname: "/api/cart" = cartHandlers.get.pathname;
    const postPathname: "/api/cart" = cartHandlers.post.pathname;
    const getMethod: "GET" = cartHandlers.get.method;
    const postMethod: "POST" = cartHandlers.post.method;

    void getPathname;
    void postPathname;
    void getMethod;
    void postMethod;
  });
});
