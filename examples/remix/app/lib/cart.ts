import {
  createCartServerHandlers,
  getCartId,
  type CartData,
  type CartGetData,
} from "@shopify/hydrogen";
import type { SerializableObject, SerializablePrimitive } from "remix/component";

import type { AppStorefrontClient } from "./storefront.ts";

/**
 * Cart server handlers. Like the other examples, they're created without
 * `customerSession`, so carts aren't connected to the signed-in customer.
 */
export const cartHandlers = createCartServerHandlers();

export type AppCartHandlers = typeof cartHandlers;

/**
 * `clientEntry()` props cross the server/browser boundary, so they must be serializable.
 * Hydrogen's cart types keep open index signatures for custom fragment fields; this drops
 * them so the cart data type-checks as island props.
 */
type Serializable<Value> = Value extends SerializablePrimitive
  ? Value
  : Value extends readonly (infer Item)[]
    ? Serializable<Item>[]
    : Value extends object
      ? SerializableObject & {
          [Key in keyof Value as string extends Key
            ? never
            : number extends Key
              ? never
              : Key]: Serializable<Value[Key]>;
        }
      : never;

/** The server cart that seeds the browser cart store. `{ cart: null }` means no cart. */
export type CartInitialData = Serializable<CartGetData<CartData>>;

/**
 * Loads the current cart for server rendering. A missing cookie skips the Storefront API
 * call; a failed cart query renders an empty cart instead of failing the page.
 */
export async function getCartInitialData({
  request,
  storefrontClient,
}: {
  request: Request;
  storefrontClient: AppStorefrontClient;
}): Promise<CartInitialData> {
  if (!getCartId(request)) return { cart: null };

  try {
    const result = await cartHandlers.get({ request, storefrontClient });
    // SAFETY: Hydrogen returns JSON from the cart query; only the open fragment
    // extension fields keep TypeScript from proving it serializable.
    return result.data as CartInitialData;
  } catch (error) {
    if (request.signal.aborted && error === request.signal.reason) throw error;
    console.error("Cart query failed; rendering without cart data", error);
    return { cart: null };
  }
}
