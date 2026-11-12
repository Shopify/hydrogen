import type { GetCartPayload, UpdateCartPayload } from "../../../vendor/standard-actions";
import type { StorefrontClient } from "../../client";
import type { CartData, CartUserError, CartWarning } from "./state";

export type CartTransportContext = {
  storefrontClient: StorefrontClient;
  customerAccessToken?: string;
};

export type CartReadResult = {
  cart: CartData | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
};

export type CartWriteResult = {
  cart: CartData | null;
  userErrors: Array<Omit<CartUserError, "field"> & { field?: string[] | null }>;
  warnings: CartWarning[];
  headers: Headers;
};

export interface CartTransport {
  /** `sequential` tells the browser store to send one cart change at a time, for backends that replace the whole cart on each write. */
  readonly ordering: "concurrent" | "sequential";
  getCart(payload: Required<GetCartPayload>, ctx: CartTransportContext): Promise<CartReadResult>;
  /** Creates a cart from the payload when it has no `cartId`. */
  updateCart(payload: UpdateCartPayload, ctx: CartTransportContext): Promise<CartWriteResult>;
}

const CART_TRANSPORT_KEY = "~cartTransport";

/**
 * A server-side cart backend created by a Hydrogen factory, such as `createUcpCartTransport`. Pass it to `createCartServerHandlers` as `transport`.
 *
 * @publicDocs
 */
// A string key, not a unique symbol: the root and `/ucp` declaration files each declare this
// type, and two `unique symbol` declarations never unify.
export type CartServerTransport = {
  /** @private */
  readonly "~cartTransport": CartTransport;
};

export function createCartServerTransport(transport: CartTransport): CartServerTransport {
  return Object.freeze({ [CART_TRANSPORT_KEY]: transport });
}

export function getCartTransport(value: unknown): CartTransport {
  const transport: unknown =
    typeof value === "object" && value !== null
      ? Reflect.get(value, CART_TRANSPORT_KEY)
      : undefined;
  if (!isCartTransport(transport)) {
    throw new TypeError(
      "transport must be created by a Hydrogen cart transport factory, such as createUcpCartTransport.",
    );
  }
  return transport;
}

function isCartTransport(value: unknown): value is CartTransport {
  return (
    typeof value === "object" &&
    value !== null &&
    "getCart" in value &&
    typeof value.getCart === "function" &&
    "updateCart" in value &&
    typeof value.updateCart === "function" &&
    "ordering" in value &&
    (value.ordering === "concurrent" || value.ordering === "sequential")
  );
}
