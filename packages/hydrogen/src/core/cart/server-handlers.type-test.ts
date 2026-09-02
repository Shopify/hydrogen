import { describe, it, expectTypeOf } from "vitest";

import type { PublicStorefrontClient } from "../../client";
import { createCustomerSession } from "../../customer-account";
import type { ShopifyRouteHandlerGroup } from "../request-routing/registered-routes";
import {
  createCartServerHandlers,
  type CartServerHandlers,
  type CartServerHandlersWithCustomerSession,
  type CreateCartServerHandlersOptions,
} from "./server-handlers";

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

  it("requires session context when configured with a customer session", () => {
    const customerSession = createCustomerSession({
      shopId: "123456789",
      customerAccountApiClientId: "shp_test-client-id",
    });
    const handlers = createCartServerHandlers({ customerSession });
    const options: CreateCartServerHandlersOptions = { customerSession };
    const handlersFromAnnotatedOptions = createCartServerHandlers(options);

    expectTypeOf(handlers).toMatchTypeOf<CartServerHandlersWithCustomerSession>();
    expectTypeOf(handlers).toMatchTypeOf<ShopifyRouteHandlerGroup>();
    type Context = Parameters<typeof handlers.post>[0];
    type AnnotatedContext = Parameters<typeof handlersFromAnnotatedOptions.post>[0];
    expectTypeOf<Context>().toHaveProperty("sessionManager");
    expectTypeOf<Context>().toHaveProperty("requestContext");
    expectTypeOf<AnnotatedContext>().toHaveProperty("sessionManager");
    expectTypeOf<AnnotatedContext>().toHaveProperty("requestContext");
  });
});
