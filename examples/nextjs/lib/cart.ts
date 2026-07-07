import { createCartComponents } from "@shopify/hydrogen/react";

import type { cartHandlers } from "./cart-handlers";

/**
 * React cart bindings derived from the cart server handlers' type. The
 * `CartProvider` accepts the full handler data envelope (`{cart, errors?}`) as
 * `initialData` — see `hydrogen-cart-ui` / `references/react.md`. Do not unwrap
 * to `data.cart`: `{cart: null}` tells the client the server already checked.
 */
export const { CartProvider, useCart, useCartForm } = createCartComponents<typeof cartHandlers>();
