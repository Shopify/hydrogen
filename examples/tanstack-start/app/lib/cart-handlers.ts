import { createCartServerHandlers, gql } from "@shopify/hydrogen";

/**
 * Custom cart fragment — adds `updatedAt` (for analytics cart-change dedupe)
 * and `merchandise.price`/`product.id`/`product.vendor` (required by the
 * `AnalyticsCart` shape the analytics bus consumes). Composed alongside the
 * built-in `HydrogenCartFragment` by `createCartServerHandlers`.
 *
 * `hydrogen-analytics`: `updateCart()` keys dedupe on `updatedAt`; without it
 * cart events are silently ignored. The bus's `AnalyticsCartLine` requires
 * `merchandise.price` and `product.{id,vendor}`, which the default fragment
 * omits.
 */
const cartFragment = gql(`
  fragment CartFragment on Cart {
    updatedAt
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
