import type { StorefrontClient } from "../../client";
import type { ShopifyRequestContext } from "../request-context";
import type { ShopifyRouteSessionManager } from "../request-routing/route-types";

// Deliberately a tiny standalone module: handleShopifyRoutes imports it at runtime, so it must
// not pull the cart handler graph into apps that never register cart handlers.

export type CartDiscountLinkContext = {
  request: Request;
  storefrontClient: StorefrontClient;
  requestContext: ShopifyRequestContext;
  sessionManager?: ShopifyRouteSessionManager;
};

/**
 * Adds a code from a `/discount/{code}` link to the shopper's cart, creating the cart when there
 * is none. Never rejects: failures are logged, and the returned headers belong on the redirect.
 */
export type CartDiscountLink = (context: CartDiscountLinkContext, code: string) => Promise<Headers>;

// A WeakMap rather than a property so the capability never registers as a route in
// handleShopifyRoutes and stays unreachable outside Hydrogen wiring.
const discountLinks = new WeakMap<object, CartDiscountLink>();

export function registerCartDiscountLink(handlers: object, apply: CartDiscountLink): void {
  discountLinks.set(handlers, apply);
}

export function findCartDiscountLink(
  handlerGroups: ReadonlyArray<object> = [],
): CartDiscountLink | undefined {
  for (const group of handlerGroups) {
    const apply = discountLinks.get(group);
    if (apply) return apply;
  }
  return undefined;
}
