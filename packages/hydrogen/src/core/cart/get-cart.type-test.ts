import { describe, it } from "vitest";

import { createStorefrontClient } from "../../client";
import { handleShopifyRoutes } from "../handle-shopify-routes";
import { createShopifyRequestContext } from "../headers";
import { createCartServerHandlers } from "./server-handlers";

const i18n = { country: "US", language: "EN" } as const;
const requestContext = createShopifyRequestContext({
  request: new Request("https://shop.example.com"),
  i18n,
});
const sessionManager = {
  getSessionOrigin: () => "https://shop.example.com",
  getSessionItem: (_key: string) => undefined,
  setSessionItem(_key: string, _value: unknown) {},
  removeSessionItem(_key: string) {},
};

describe("createCartServerHandlers type tests", () => {
  it("accepts private storefront clients", () => {
    const cartHandlers = createCartServerHandlers();
    const storefront = createStorefrontClient({
      type: "private",
      requestContext,
      config: {
        storeDomain: "shop.example.com",
        privateStorefrontToken: "private-token",
        buyerIp: "203.0.113.10",
      },
    });

    cartHandlers.get({ storefrontClient: storefront });
    handleShopifyRoutes({
      request: new Request("https://shop.example.com/api/cart"),
      requestContext,
      sessionManager,
      storefrontClient: storefront,
      handlers: [cartHandlers],
    });
  });

  it("accepts public storefront clients", () => {
    const cartHandlers = createCartServerHandlers();
    const storefront = createStorefrontClient({
      type: "public",
      requestContext,
      config: {
        storeDomain: "shop.example.com",
        publicStorefrontToken: "public-token",
      },
    });

    cartHandlers.get({ storefrontClient: storefront });
    handleShopifyRoutes({
      request: new Request("https://shop.example.com/api/cart"),
      requestContext,
      sessionManager,
      storefrontClient: storefront,
      handlers: [cartHandlers],
    });
  });

  it("accepts private clients without buyer context", () => {
    const cartHandlers = createCartServerHandlers();
    const storefront = createStorefrontClient({
      type: "private_no_buyer_context",
      requestContext,
      config: {
        storeDomain: "shop.example.com",
        privateStorefrontToken: "private-token",
      },
    });

    cartHandlers.get({ storefrontClient: storefront });
    handleShopifyRoutes({
      request: new Request("https://shop.example.com/api/cart"),
      requestContext,
      sessionManager,
      storefrontClient: storefront,
      handlers: [cartHandlers],
    });
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
