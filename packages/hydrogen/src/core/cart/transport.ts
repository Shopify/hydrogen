import type { GetCartPayload, UpdateCartPayload } from "../../../vendor/standard-actions";
import type { StorefrontClient } from "../../client";
import type { CartData, CartUserError, CartWarning } from "./state";

export type CartTransportContext = {
  storefrontClient: StorefrontClient;
  customerAccessToken?: string;
  /** The handle of the seller whose cart to use, such as `raycon` for `raycon.myshopify.com`. The handlers validate it before they set it, and only for transports with `sellers: true`. Absent for the home store's cart. */
  seller?: string;
};

export type CartReadResult = {
  /** `null` means the cart doesn't exist, or couldn't be read when `errors` is set. It never means "unchanged". */
  cart: CartData | null;
  errors?: Array<{ message: string }>;
  headers: Headers;
  /** When the cart expires, as an ISO 8601 date-time, when the backend reports it. */
  expiresAt?: string;
};

export type CartWriteResult = {
  /** `null` means the cart doesn't exist. It never means "unchanged": a change that fails on an existing cart returns that cart with `userErrors`. */
  cart: CartData | null;
  userErrors: Array<Omit<CartUserError, "field"> & { field?: string[] | null }>;
  warnings: CartWarning[];
  headers: Headers;
  /** When the cart expires, as an ISO 8601 date-time, when the backend reports it. */
  expiresAt?: string;
};

export interface CartTransport {
  /** `sequential` tells the browser store to send one cart change at a time, for backends that replace the whole cart on each write. */
  readonly ordering: "concurrent" | "sequential";
  /** `true` when the transport can keep one cart per seller, selected with `CartTransportContext.seller`. */
  readonly sellers: boolean;
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
    (value.ordering === "concurrent" || value.ordering === "sequential") &&
    "sellers" in value &&
    typeof value.sellers === "boolean"
  );
}
