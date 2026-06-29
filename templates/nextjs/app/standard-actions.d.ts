// Ambient types for the Shopify Standard Actions runtime
// (https://cdn.shopify.com/storefront/standard-actions.js), which backs the
// `hydrogen-cart-drawer` skill's `window.Shopify.actions.openCart()` contract.
//
// Sourced verbatim from the shipped @shopify/hydrogen Standard Actions runtime
// types (packages/hydrogen/vendor/standard-actions.d.ts, version below).
// Inlined here so this template is self-contained — it does NOT depend on a
// relative `/// <reference path="../../../packages/hydrogen/vendor/...">` into
// any sibling example. @shopify/hydrogen's own analytics globals augment the
// `Shopify` interface declared here (see its src/core/analytics/globals.d.ts).
//
// version: ea315691e9819723879605d727a20fde6bdda314
export interface Price {
  amount: string;
  currencyCode: string;
}
export interface CartDiscountCode {
  applicable: boolean;
  code: string;
}
export interface CartCost {
  totalAmount: Price;
}
export interface CartLine {
  id: string;
  quantity: number;
  cost: CartCost;
}
export interface CartMutationUserError {
  code?: string;
  field?: string[];
  message: string;
}
export interface CartMutationWarning {
  code?: string;
  message: string;
  target?: string;
}
declare const CART_UPDATE_CONTEXTS: readonly ["product", "cart", "dialog", "standard-action"];
export type CartUpdateContext = (typeof CART_UPDATE_CONTEXTS)[number];
declare const CART_UPDATE_ACTIONS: readonly ["add", "remove", "update"];
export type CartUpdateAction = (typeof CART_UPDATE_ACTIONS)[number];
export type ActionArgs<P, O = void> = [P] extends [void]
  ? [options?: O]
  : [Extract<P, void>] extends [never]
    ? [payload: P, options?: O]
    : [payload?: Exclude<P, void>, options?: O];
export type DefaultActionHandler<R> = () => Promise<R>;
export type ActionConfiguration<P, R, Meta extends object = {}, O = void> = Meta & {
  handler?: (defaultHandler: DefaultActionHandler<R>, ...args: ActionArgs<P, O>) => Promise<R>;
};
export interface ActionFunction<P, R, Meta extends object = {}, O = void> {
  (...args: ActionArgs<P, O>): Promise<R>;
  configure(options: ActionConfiguration<P, R, Meta, O>): boolean;
  isDefault(): boolean;
}
export type UpdateCartUserError = CartMutationUserError;
export type UpdateCartWarning = CartMutationWarning;
export interface StorefrontCartLinesConnection {
  nodes: CartLine[];
}
export interface StorefrontCartSummary {
  id: string;
  totalQuantity: number;
  cost: CartCost;
  lines: StorefrontCartLinesConnection;
  discountCodes: CartDiscountCode[];
}
export type UpdateCartEventTargetMeta =
  | {
      type: "shopify:cart:lines-update";
      action: CartUpdateAction;
    }
  | {
      type: "shopify:cart:note-update" | "shopify:cart:discount-update" | "shopify:cart:error";
    };
export interface EventTargetConfigurationMeta {
  /**
   * Required: return the element to emit updateCart-generated events from.
   * Receives metadata for the specific event so themes can route events to
   * different UI roots if needed. `shopify:cart:lines-update` includes the
   * mutation action (`'add' | 'remove' | 'update'`).
   */
  eventTarget: (meta: UpdateCartEventTargetMeta) => EventTarget | null;
}
export interface CartLineInput {
  /**
   * Existing-line id from SFAPI or the AJAX cart API.
   * CartLine GIDs keep or receive a `?cart=` suffix automatically when the cart id is known.
   * Present = update/remove; absent = add.
   */
  id?: string;
  /** ProductVariant GID or raw variant id. Required for add. */
  merchandiseId?: string;
  /** Set to 0 to remove. */
  quantity: number;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
  /** Selling plan GID or raw selling plan id. */
  sellingPlanId?: string;
}
export interface UpdateCartPayload {
  /** Cart GID or raw cart token. If omitted, discovered from the cart cookie. */
  cartId?: string;
  lines?: CartLineInput[];
  note?: string;
  discountCodes?: string[];
}
export interface UpdateCartResult {
  cart: StorefrontCartSummary;
  userErrors?: UpdateCartUserError[];
  warnings?: UpdateCartWarning[];
  detail?: Record<string, any>;
}
export interface UpdateCartOptions {
  signal?: AbortSignal;
  event?: {
    detail?: Record<string, any>;
    context?: CartUpdateContext;
  };
}
export interface GetCartPayload {
  /** Cart GID or raw cart token. If omitted, discovered from the browser cookie. */
  cartId?: string;
}
export interface GetCartResult {
  cart: StorefrontCartSummary | null;
  detail?: Record<string, any>;
}
export interface GetCartOptions {
  signal?: AbortSignal;
}
export interface GetCartAction {
  (payload?: GetCartPayload, options?: GetCartOptions): Promise<GetCartResult>;
}
export interface CartActionErrorCause {
  cartId?: string | null;
  userErrors?: UpdateCartUserError[];
  warnings?: UpdateCartWarning[];
}
export declare class CartActionError extends Error {
  cause: CartActionErrorCause;
  constructor(message: string, cause: CartActionErrorCause);
}
declare const actions: Readonly<{
  getCart: GetCartAction;
  updateCart: ActionFunction<
    UpdateCartPayload,
    UpdateCartResult,
    EventTargetConfigurationMeta,
    UpdateCartOptions
  >;
  openCart: ActionFunction<void, void, {}, void>;
}>;
export type ShopifyStandardActions = typeof actions;
declare global {
  interface Shopify {
    actions?: typeof actions;
    country?: string;
    locale?: string;
  }
  interface Window {
    Shopify?: Shopify & {
      [key: string]: unknown;
    };
  }
}

// Native invoker-commands API (command/commandfor) used to open the cart drawer
// <dialog> declaratively. React's published types do not yet describe these
// button attributes, so augment them here.
declare module "react" {
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }

  // Native <dialog> light-dismiss attribute (HTML `closedby`) used by the cart
  // drawer and mobile nav. React's published types do not yet describe it.
  interface DialogHTMLAttributes<T> {
    closedby?: "any" | "closerequest" | "none";
  }
}

export {};
