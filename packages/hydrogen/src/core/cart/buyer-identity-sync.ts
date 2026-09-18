import type { StorefrontClient } from "../../client";

// Deliberately a tiny standalone module: customer-account handlers import it at
// runtime, so it must not pull the cart handler graph into their bundle.
export const cartBuyerIdentitySync: unique symbol = Symbol("hydrogen.cartBuyerIdentitySync");

export type CartBuyerIdentitySyncContext = {
  request: Request;
  storefrontClient: StorefrontClient;
};

/**
 * Capability attached by `createCartServerHandlers({customerSession})` and
 * consumed by `createCustomerAccountServerHandlers({cartServerHandlers})` to
 * keep the browser cart's buyer identity in step with the customer session.
 */
export type CartBuyerIdentitySync = {
  /** Attaches only to a bound cart; detaches both protected and visible carts. */
  updateBuyerIdentity(
    context: CartBuyerIdentitySyncContext,
    customerAccessToken: string | null,
  ): Promise<void>;
  /** Set-Cookie values expiring the cart and its binding after failed detachment. */
  readonly expiredCartCookies: readonly string[];
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
