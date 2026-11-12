import { describe, it, expectTypeOf } from "vitest";

import type { PublicStorefrontClient } from "../../client";
import { createCustomerSession } from "../../customer-account";
import { gql } from "../../graphql";
import type { ShopifyRouteHandlerGroup } from "../request-routing/registered-routes";
import { createUcpCartTransport } from "../../ucp";
import {
  createCartServerHandlers,
  type CartDataFromHandlers,
  type CartServerHandlers,
  type CartServerHandlersWithCustomerSession,
  type CreateCartServerHandlersOptions,
} from "./server-handlers";
import type { CartData } from "./state";
import type { CartServerTransport } from "./transport";

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

  it("types transport handlers with the default cart data", () => {
    const transport = createUcpCartTransport({ agentProfile: "https://example.com/agent.json" });
    const handlers = createCartServerHandlers({ transport });

    expectTypeOf(transport).toEqualTypeOf<CartServerTransport>();
    expectTypeOf(handlers).toMatchTypeOf<ShopifyRouteHandlerGroup>();
    expectTypeOf<CartDataFromHandlers<typeof handlers>>().toEqualTypeOf<CartData>();
    expectTypeOf<Parameters<typeof handlers.post>[0]>().not.toHaveProperty("sessionManager");
  });

  it("rejects transport combined with fragment or customerSession", () => {
    const transport = {} as CartServerTransport;
    const fragment = gql(`fragment CartFragment on Cart { note }`);
    const customerSession = createCustomerSession({
      shopId: "123456789",
      customerAccountApiClientId: "shp_test-client-id",
    });

    // Never called: the calls throw at runtime.
    void (() => {
      // @ts-expect-error transport can't be combined with fragment.
      createCartServerHandlers({ transport, fragment });
      // @ts-expect-error transport can't be combined with customerSession.
      createCartServerHandlers({ transport, customerSession });
      // @ts-expect-error CartServerTransport is opaque, so a plain transport object doesn't fit.
      createCartServerHandlers({ transport: { ordering: "sequential" } });
    });
  });
});
