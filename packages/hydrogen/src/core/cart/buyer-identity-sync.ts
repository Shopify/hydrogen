import type { StorefrontClient } from "../../client";

// Deliberately a tiny standalone module: customer-account handlers import it at
// runtime, so it must not pull the cart handler graph into their bundle.
export const cartBuyerIdentitySync: unique symbol = Symbol("hydrogen.cartBuyerIdentitySync");

/** The request with the `cart` cookie and the Storefront API client that updates the cart. */
export type CartBuyerIdentitySyncContext = {
  /** The incoming request. The `cart` cookie on the request identifies the cart. */
  request: Request;
  /** The Storefront API client that updates the cart's buyer identity. */
  storefrontClient: StorefrontClient;
};

/**
 * Connects the cart to the customer when the customer logs in, and disconnects the cart when the customer logs out.
 *
 * Create the cart server handlers with `customerSession`, then pass the handlers to createCustomerAccountServerHandlers through the `cartServerHandlers` option. The customer account handlers then update the cart for you.
 */
export type CartBuyerIdentitySync = {
  /** Attaches the customer to the cart in the request's `cart` cookie, or detaches the customer when the token is `null`. */
  updateBuyerIdentity(
    context: CartBuyerIdentitySyncContext,
    customerAccessToken: string | null,
  ): Promise<void>;
  /** A `Set-Cookie` value that clears the `cart` cookie. The customer account handlers send the value when they can't detach the customer from the cart. */
  readonly expiredCartCookie: string;
};

/** Cart server handlers that you created with `customerSession`. */
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
