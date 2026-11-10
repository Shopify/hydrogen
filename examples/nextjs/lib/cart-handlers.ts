import { createCartServerHandlers, gql } from "@shopify/hydrogen";

/** Adds `merchandise.price`, which analytics cart lines require. */
const cartFragment = gql(`
  fragment CartFragment on Cart {
    lines(first: 250) {
      nodes {
        merchandise {
          ... on ProductVariant {
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`);

/**
 * Cart server handlers, registered in the root middleware's
 * `handleShopifyRoutes` wiring. The React cart bindings in `app/lib/cart.ts`
 * are derived from these handlers' type so the cart provider's `initialData`
 * envelope and line types stay in sync with the server contract.
 *
 * `hydrogen-request-handlers` / `references/frameworks.md` owns the wiring; the
 * `hydrogen-cart-ui` React reference owns the provider/form helpers.
 */
export const cartHandlers = createCartServerHandlers({
  fragment: cartFragment,
});
