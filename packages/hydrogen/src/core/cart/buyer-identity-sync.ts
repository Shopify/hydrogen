import type { StorefrontClient } from "../../client";

// Deliberately a tiny standalone module: customer-account handlers import it at
// runtime, so it must not pull the cart handler graph into their bundle.
export const cartBuyerIdentitySync: unique symbol = Symbol("hydrogen.cartBuyerIdentitySync");

/** The request and Storefront API client that buyer identity sync uses to update the cart in the cart cookie. */
export type CartBuyerIdentitySyncContext = {
  request: Request;
  storefrontClient: StorefrontClient;
};

/**
 * The buyer identity sync that createCartServerHandlers attaches when you pass `customerSession`.
 * Pass the cart server handlers to createCustomerAccountServerHandlers through the `cartServerHandlers`
 * option to keep the cart's buyer identity in step with the customer session.
 */
export type CartBuyerIdentitySync = {
  /** Attaches the customer to the cart in the request's cart cookie, or detaches the customer when the token is `null`. */
  updateBuyerIdentity(
    context: CartBuyerIdentitySyncContext,
    customerAccessToken: string | null,
  ): Promise<void>;
  /** A `Set-Cookie` value that expires the cart cookie when detaching the customer from the cart fails. */
  readonly expiredCartCookie: string;
};

/** Cart server handlers capable of buyer identity sync. */
export type CartBuyerIdentitySyncSource = {
  readonly [cartBuyerIdentitySync]: CartBuyerIdentitySync;
};

// Accepts a partial source because JavaScript callers can pass cart handlers
// created without customerSession; the caller turns undefined into an error.
export function getCartBuyerIdentitySync(
  source: Partial<CartBuyerIdentitySyncSource>,
): CartBuyerIdentitySync | undefined {
  return source[cartBuyerIdentitySync];
}
