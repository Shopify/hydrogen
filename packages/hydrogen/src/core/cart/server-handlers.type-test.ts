import { describe, it, expectTypeOf } from "vitest";

import type { PublicStorefrontClient } from "../../client";
import type { ShopifyRouteHandlerGroup } from "../request-routing/registered-routes";
import type { CartServerHandlers } from "./server-handlers";

describe("CartServerHandlers route handler compatibility", () => {
  it("fits inside a ShopifyRouteHandlerGroup[]", () => {
    expectTypeOf<CartServerHandlers>().toMatchTypeOf<ShopifyRouteHandlerGroup>();
  });

  it("exposes callable route handlers with metadata", () => {
    type Handler = CartServerHandlers["get"];

    expectTypeOf<Handler>().toBeFunction();
    expectTypeOf<Handler>().toHaveProperty("pathname").toEqualTypeOf<"/api/cart">();
    expectTypeOf<Handler>().toHaveProperty("method").toEqualTypeOf<"GET">();
  });

  it("accepts any Storefront client for handler context", () => {
    type Context = Parameters<CartServerHandlers["get"]>[0];

    expectTypeOf<PublicStorefrontClient>().toMatchTypeOf<Context["storefrontClient"]>();
  });
});
