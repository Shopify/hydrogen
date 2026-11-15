import { describe, it, expectTypeOf } from "vitest";

import type { PublicStorefrontClient } from "../../client";
import { createCustomerSession } from "../../customer-account";
import type { ShopifyRouteHandlerGroup } from "../request-routing/registered-routes";
import {
  createCartServerHandlers,
  type CartErrorCode,
  type CartServerHandlers,
  type CartServerHandlersWithCustomerSession,
  type CreateCartServerHandlersOptions,
} from "./server-handlers";

describe("CartServerHandlers route handler compatibility", () => {
  it("preserves legacy exhaustive CartErrorCode consumers", () => {
    const messages: Record<CartErrorCode, string> = {
      invalid_cart_request: "Invalid request",
      missing_cart: "Missing cart",
      cart_mutation_failed: "Mutation failed",
    };
    function legacyMessage(code: CartErrorCode): string {
      switch (code) {
        case "invalid_cart_request":
        case "missing_cart":
        case "cart_mutation_failed":
          return messages[code];
        default: {
          const exhaustive: never = code;
          return exhaustive;
        }
      }
    }
    expectTypeOf<CartErrorCode>().toEqualTypeOf<
      "invalid_cart_request" | "missing_cart" | "cart_mutation_failed"
    >();
    expectTypeOf(legacyMessage).returns.toEqualTypeOf<string>();
    const handlers = createCartServerHandlers({ rateLimitHandling: "response" });
    type Result = Awaited<ReturnType<typeof handlers.post>>;
    type Code = Extract<Result, { type: "error" }>["error"]["code"];
    expectTypeOf<Code>().toEqualTypeOf<CartErrorCode>();
  });

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
