import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";

/** Storefront API monetary value — an amount string and ISO 4217 currency code. */
export interface Money {
  /** Decimal amount as a string (e.g. `"29.99"`). */
  amount: string;
  /** ISO 4217 currency code (e.g. `"USD"`, `"EUR"`). */
  currencyCode: string;
}

/** Cart-level cost breakdown returned by the Storefront API. */
export interface CartCost {
  /** Sum of line subtotals before shipping and taxes. */
  subtotalAmount: Money;
  /** Final amount the buyer pays at checkout. */
  totalAmount: Money;
  /** Amount due at checkout when deferred payment methods apply. */
  checkoutChargeAmount: Money;
}

export interface CartLineCost {
  /** Line total after discounts (`quantity × discounted unit price`). */
  totalAmount: Money;
  /** Line subtotal before cart-level discounts. */
  subtotalAmount: Money;
  /** Unit price for a single quantity of this line. */
  amountPerQuantity: Money;
  /** Original compare-at unit price, or `null` when no comparison exists. */
  compareAtAmountPerQuantity: Money | null;
}

/** Product variant information attached to a {@link CartLine}. */
export interface CartLineMerchandise {
  /** Storefront API GID of the product variant. */
  id: string;
  /** Variant title (e.g. `"Small / Black"`). */
  title?: string;
  /** Selected variant option name/value pairs (e.g. `{ name: "Size", value: "S" }`). */
  selectedOptions?: Array<{ name: string; value: string }>;
  product: {
    title: string;
    handle?: string;
    [key: string]: unknown;
  };
  image?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
    [key: string]: unknown;
  } | null;
  quantityAvailable?: number | null;
  [key: string]: unknown;
}

/**
 * A single line item in the cart.
 *
 * Each line represents a product variant at a given quantity. Lines may carry
 * custom {@link Attribute | attributes}, a selling plan allocation (subscriptions),
 * or nested {@link CartLine.lineComponents | line components} (bundles).
 */
export interface CartLine {
  /** Storefront API GID of this cart line — used as the key in {@link CartPending.lines}. */
  id: string;
  /** Number of units of this merchandise in the cart. */
  quantity: number;
  attributes?: Attribute[];
  /** Per-line cost breakdown from the Storefront API. */
  cost: CartLineCost;
  /** The product variant this line represents. */
  merchandise?: CartLineMerchandise;
  /** Subscription selling plan allocation, or `null` for one-time purchases. */
  sellingPlanAllocation?: { sellingPlan: { id: string } } | null;
  parentRelationship?: { parent: { id: string } } | null;
  /** Nested child lines when this line is a bundle parent. */
  lineComponents?: CartLine[];
}

export interface CartLineConnection {
  nodes: CartLine[];
  [key: string]: unknown;
}

/** A discount code applied to the cart. */
export interface DiscountCode {
  code: string;
  /** Whether the code is valid and currently active — determined by the Storefront API, never the client. */
  applicable: boolean;
}

/** A validation error returned by a Storefront API cart mutation. */
export interface CartUserError {
  /** Machine-readable error code, or `null` for unclassified errors. */
  code: CartErrorCode | null;
  message: string;
  /** JSONPath to the input field that caused the error (e.g. `["lines", "0", "quantity"]`). */
  field?: string[];
}

/** A non-blocking warning returned by a Storefront API cart mutation. */
export interface CartWarning {
  code: CartWarningCode;
  message: string;
}

/** Errors and warnings from a single cart mutation response. */
export interface CartErrorGroup {
  userErrors: CartUserError[];
  warnings: CartWarning[];
}

/** A network-level error encountered during a cart operation (e.g. timeout, 5xx). */
export interface CartNetworkEntry {
  message: string;
  /** HTTP status code when available. */
  status?: number;
}

/** A key-value pair attached to the cart or to an individual {@link CartLine}. */
export interface Attribute {
  key: string;
  value: string | null;
}

/**
 * Tracks which parts of the cart have in-flight mutations.
 *
 * `lines` and `discountCodes` are `Set<string>` keyed by line ID / discount code,
 * enabling per-item pending indicators rather than a single global spinner.
 * `cost` is a boolean because *any* line or discount change affects the total —
 * use it to show pending UI on price displays without computing optimistic amounts.
 *
 * @example
 * ```ts
 * const { pending } = store.getState();
 *
 * // Per-line-item pending indicator
 * if (pending.lines.has(lineId)) {
 *   showSpinner(lineId);
 * }
 *
 * // Cart total is stale — show pending UI, don't compute a price
 * if (pending.cost) {
 *   dimTotalDisplay();
 * }
 * ```
 */
export interface CartPending {
  /** Line IDs with in-flight quantity/remove mutations. */
  lines: Set<string>;
  note: boolean;
  attributes: boolean;
  /** Discount codes with in-flight apply/remove mutations. */
  discountCodes: Set<string>;
  /** `true` when any mutation may affect cart pricing — show pending UI on cost displays. */
  cost?: boolean;
}

/**
 * Per-resource error tracking for the cart.
 *
 * Errors are bucketed by the resource they affect — `lines`, `note`, `attributes`,
 * `discountCodes`, or `cart` (for cross-cutting errors). Each bucket carries a
 * `*UpdatedAt` timestamp (ms since epoch) so the UI can show stale-error indicators
 * or auto-dismiss after a timeout.
 *
 * `network` collects transport-level failures (timeouts, 5xx) separately from
 * Storefront API user errors.
 */
export interface CartErrorState {
  /** Cross-cutting cart errors not attributable to a specific resource. */
  cart: CartErrorGroup;
  /** Errors keyed by {@link CartLine.id}. */
  lines: Map<string, CartErrorGroup>;
  note: CartErrorGroup;
  /** Errors keyed by {@link Attribute.key}. */
  attributes: Map<string, CartErrorGroup>;
  /** Errors keyed by discount code string. */
  discountCodes: Map<string, CartErrorGroup>;
  network: CartNetworkEntry[];
  lastUpdatedAt: number;
  cartUpdatedAt: number;
  linesUpdatedAt: number;
  noteUpdatedAt: number;
  attributesUpdatedAt: number;
  discountCodesUpdatedAt: number;
  networkUpdatedAt: number;
}

/**
 * Cart data returned by the Storefront API.
 *
 * This is the server's authoritative snapshot — prices, discount applicability,
 * and totals come exclusively from here, never from client-side computation.
 * The index signature allows custom cart query fields to pass through.
 */
export interface CartData {
  /** Storefront API Cart GID, or `null` when no cart exists yet. */
  id: string | null;
  /** Shopify checkout URL. Changes when buyer identity or consent state changes. */
  checkoutUrl?: string | null;
  /** Sum of all line quantities. */
  totalQuantity: number;
  /** Cart-level cost breakdown (subtotal, total, checkout charge). */
  cost: CartCost;
  /** Buyer-supplied cart note, or `null`/empty when unset. */
  note?: string | null;
  /** Cart-level custom attributes. */
  attributes: Attribute[];
  /** The cart's line items. */
  lines: CartLineConnection;
  /** Discount codes applied to the cart, with their applicability. */
  discountCodes: DiscountCode[];
  [key: string]: unknown;
}

/**
 * Full observable state of the cart store.
 *
 * Framework adapters subscribe to this via {@link CartStore.subscribe} (or the
 * framework-specific hooks like `useCart`). The generic `TData` parameter
 * flows from your server handler configuration, so `data` is typed to match
 * your custom cart query.
 *
 * @example
 * ```ts
 * const state = store.getState();
 *
 * if (state.loading) {
 *   // Initial cart load in progress — show skeleton
 * }
 *
 * if (state.pending.lines.size > 0) {
 *   // One or more lines are mid-mutation — show per-line spinners
 * }
 *
 * if (state.errors.network.length > 0) {
 *   // Network errors occurred — show retry prompt
 * }
 * ```
 */
export interface CartState<TData extends CartData = CartData> {
  /** The latest server-confirmed cart data, with optimistic projections applied on top. */
  data: TData;
  /** `true` during the initial full-cart fetch before any data is available. */
  loading: boolean;
  /** Non-rejecting signal that resolves when the current full-cart load settles or is invalidated. */
  readonly readyPromise?: PromiseLike<void>;
  /** Per-resource in-flight mutation tracking. */
  pending: CartPending;
  /** `true` when a background revalidation is reconciling drift after overlapping mutations. */
  revalidating?: boolean;
  /** Per-resource error and warning state. */
  errors: CartErrorState;
}

export function createEmptyPending(): CartPending {
  return {
    lines: new Set(),
    note: false,
    attributes: false,
    discountCodes: new Set(),
    cost: false,
  };
}

/** Creates an empty {@link CartErrorGroup} — no user errors, no warnings. */
export function createEmptyErrorGroup(): CartErrorGroup {
  return { userErrors: [], warnings: [] };
}

/** Creates an empty {@link CartErrorState} — all timestamps at `0`, all buckets empty. */
export function createEmptyCartErrors(): CartErrorState {
  return {
    cart: createEmptyErrorGroup(),
    lines: new Map(),
    note: createEmptyErrorGroup(),
    attributes: new Map(),
    discountCodes: new Map(),
    network: [],
    lastUpdatedAt: 0,
    cartUpdatedAt: 0,
    linesUpdatedAt: 0,
    noteUpdatedAt: 0,
    attributesUpdatedAt: 0,
    discountCodesUpdatedAt: 0,
    networkUpdatedAt: 0,
  };
}

/**
 * Frozen {@link CartData} representing an empty cart — `id: null`, zero quantities,
 * zero-amount costs. Used as the initial/fallback value before the first server response.
 */
export const EMPTY_CART_DATA: CartData = Object.freeze({
  id: null,
  checkoutUrl: null,
  totalQuantity: 0,
  cost: Object.freeze({
    subtotalAmount: Object.freeze({ amount: "0", currencyCode: "" }),
    totalAmount: Object.freeze({ amount: "0", currencyCode: "" }),
    checkoutChargeAmount: Object.freeze({ amount: "0", currencyCode: "" }),
  }),
  note: "",
  attributes: [] as Attribute[],
  lines: Object.freeze({ nodes: [] as CartLine[] }),
  discountCodes: [] as DiscountCode[],
});

export function createCartState<TData extends CartData>(
  data: TData,
  { loading = false }: { loading?: boolean } = {},
): CartState<TData> {
  return {
    data,
    loading,
    pending: createEmptyPending(),
    errors: createEmptyCartErrors(),
  };
}

/** Creates an empty {@link CartState} backed by {@link EMPTY_CART_DATA}. Defaults to `loading: true`. */
export function createEmptyCartState({ loading = true }: { loading?: boolean } = {}): CartState {
  return createCartState(
    {
      ...EMPTY_CART_DATA,
      lines: { nodes: [] },
      discountCodes: [],
    },
    { loading },
  );
}

/** Shared empty {@link CartState} — backed by {@link EMPTY_CART_DATA}, defaults to `loading: true`. */
export const EMPTY_CART_STATE: CartState = createEmptyCartState();
