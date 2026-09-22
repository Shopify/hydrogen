/**
 * Framework-agnostic cart primitives for Hydrogen.
 *
 * The cart spans a server route and a client store, connected by the
 * `/api/cart` endpoint:
 *
 * 1. **Server** — {@link createCartServerHandlers} builds GET/POST handlers for
 *    `/api/cart`. GET fetches the cart ({@link getCart}, {@link getCartId}); POST
 *    parses the request ({@link parseCartRequest}), runs the matching Storefront
 *    API mutation, and persists the cart id ({@link createCartCookie}).
 * 2. **Client** — {@link createCartStore} holds a reactive {@link CartState}:
 *    optimistic projections layered over server-authoritative {@link CartData}.
 *    Mutations POST to `/api/cart` (override with {@link configureCartEndpoint}).
 * 3. **Forms** — {@link createCartFormRegister} generates HTML attributes for
 *    cart form fields and intent buttons; {@link attachQuantityInput} auto-submits
 *    on quantity change; {@link CartStore.handleFormSubmit} dispatches submissions.
 *
 * Prices, totals, and discount applicability are always server-authoritative —
 * they come from the Storefront API and are never computed on the client.
 */

export {
  configureCartEndpoint,
  createCartStore,
  CartNetworkError,
  STANDARD_ACTION_TIMEOUT_IN_MS,
} from "./cart";
export type { CartStore, CreateCartStoreOptions } from "./cart";
export { createCartFormRegister } from "./form";
export type { CartFormRegister, QuantityInputAttributes, SetButtonAttributes } from "./form";
export { attachQuantityInput } from "./attach-quantity-input";
export { parseCartRequest } from "./actions";
export type {
  CartAction,
  CartAttributeInput,
  CartLineAddInput,
  CartLineUpdateInput,
} from "./actions";
export { cartQueries } from "./queries";
export { createCartCookie } from "./cookie";
export type {
  CartState,
  CartData,
  CartPending,
  CartErrorState,
  CartErrorGroup,
  CartUserError,
  CartWarning,
  CartNetworkEntry,
  CartLine,
  CartLineConnection,
  CartLineCost,
  CartLineMerchandise,
  CartCost,
  DiscountCode,
  Attribute,
} from "./state";
export {
  EMPTY_CART_DATA,
  EMPTY_CART_STATE,
  createEmptyCartErrors,
  createEmptyErrorGroup,
} from "./state";
export { getCartId, getCart } from "./get-cart";
export type { CartDataFromQuery, CartResult } from "./get-cart";
export { createCartServerHandlers } from "./server-handlers";
export type {
  CartError,
  CartErrorCode,
  CartDataFromHandlers,
  CartGetData,
  CartGetHandler,
  CartGetResult,
  CartPostHandler,
  CartPostResult,
  CartServerHandlers,
  CartServerHandlersWithCustomerSession,
  CreateCartServerHandlersOptions,
} from "./server-handlers";
export { sanitizeQuantity, DEFAULT_MINIMUM_QUANTITY, NO_QUANTITY_LIMIT } from "./quantity";
