import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";

/** A monetary value from the Storefront API. */
export interface Money {
  /** The decimal amount as a string, such as `29.99`. */
  amount: string;
  /** The ISO 4217 currency code, such as `USD`. */
  currencyCode: string;
}

/** The cart's costs from the Storefront API. */
export interface CartCost {
  /** The amount, before taxes and cart-level discounts, for the customer to pay. */
  subtotalAmount: Money;
  /** Final amount the customer pays at checkout. */
  totalAmount: Money;
  /** Estimated amount due at checkout, excluding deferred payments. Equals the subtotal when no deferred payments exist. */
  checkoutChargeAmount: Money;
}

/** A cart line's costs from the Storefront API. */
export interface CartLineCost {
  /** Line total after all applicable discounts. */
  totalAmount: Money;
  /** Line subtotal before line-level discounts. */
  subtotalAmount: Money;
  /** Unit price for a single quantity of this line. */
  amountPerQuantity: Money;
  /** Original compare-at unit price, or `null` when no comparison exists. */
  compareAtAmountPerQuantity: Money | null;
}

/** The product variant on a cart line. */
export interface CartLineMerchandise {
  /** Storefront API GID of the product variant. */
  id: string;
  /** The variant title, such as `"Small / Black"`. */
  title?: string;
  /** The variant's selected options as name and value pairs. */
  selectedOptions?: Array<{ name: string; value: string }>;
  /** The product that the variant belongs to. */
  product: {
    title: string;
    handle?: string;
    [key: string]: unknown;
  };
  /** The variant image that the cart query selects. */
  image?: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
    [key: string]: unknown;
  } | null;
  /** Units available for sale. When your cart fragment selects the field, the store caps the quantity of a `set` submission at this number. */
  quantityAvailable?: number | null;
  /** Extra variant fields from your custom cart fragment, unchanged. */
  [key: string]: unknown;
}

/**
 * A single line item in the cart.
 *
 * Each line holds a product variant at a quantity. A line can carry custom
 * attributes, a selling plan allocation for a subscription, or line components
 * for a bundle.
 */
export interface CartLine {
  /** The cart line's Storefront API GID. Look up the line's pending state and errors with this ID. */
  id: string;
  /** Number of units of this merchandise in the cart. */
  quantity: number;
  /** Custom key-value attributes attached to the line. */
  attributes?: Attribute[];
  /** Per-line cost breakdown from the Storefront API. */
  cost: CartLineCost;
  /** The product variant on the line. */
  merchandise?: CartLineMerchandise;
  /** Subscription selling plan allocation, or `null` for one-time purchases. */
  sellingPlanAllocation?: { sellingPlan: { id: string } } | null;
  /** The parent line's ID when this line is a bundle component. */
  parentRelationship?: { parent: { id: string } } | null;
  /** Nested child lines when this line is a bundle parent. */
  lineComponents?: CartLine[];
}

/** The cart's line items in the Storefront API connection shape. */
export interface CartLineConnection {
  /** The cart lines that the cart query returns. */
  nodes: CartLine[];
  /** Extra connection fields from your custom cart fragment, unchanged. */
  [key: string]: unknown;
}

/** A discount code applied to the cart. */
export interface DiscountCode {
  /** The discount code text. Look up the code's pending state and errors with this value. */
  code: string;
  /** Whether the code applies to the cart's current contents. A new code reads `false` until the server responds. */
  applicable: boolean;
}

/** A validation error returned by a Storefront API cart mutation. */
export interface CartUserError {
  /** Machine-readable error code, or `null` for unclassified errors. */
  code: CartErrorCode | null;
  /** Human-readable error text from the Storefront API. */
  message: string;
  /** The path to the input field that caused the error, such as `["lines", "0", "quantity"]`. */
  field?: string[];
}

/** A non-blocking warning returned by a Storefront API cart mutation. */
export interface CartWarning {
  /** The warning code from the Storefront API. */
  code: CartWarningCode;
  /** Human-readable warning text from the Storefront API. */
  message: string;
}

/** Errors and warnings from one cart change. */
export interface CartErrorGroup {
  /** Validation errors that the mutation returned. */
  userErrors: CartUserError[];
  /** Non-blocking warnings that the mutation returned. */
  warnings: CartWarning[];
}

/**
 * A failed cart request, such as a non-2xx response or a timeout. Canceled requests add no entry.
 */
export interface CartNetworkEntry {
  /** The error message, or a generic message when the failure has no message of its own. */
  message: string;
  /** The HTTP status code, when the endpoint returned a non-2xx response. */
  status?: number;
}

/** A key-value pair attached to the cart or to an individual cart line. */
export interface Attribute {
  /** The attribute name. Look up the attribute's errors with this name. */
  key: string;
  /** The attribute value. */
  value: string | null;
}

/**
 * Shows which parts of the cart have changes in flight.
 *
 * Check a line ID or a discount code to show a pending indicator on that item.
 * Check `cost` to show pending UI on prices, which update only when the server
 * responds.
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
  /** Line IDs with an add, quantity change, or removal in flight. A new line has an ID that starts with `optimistic:` until the server confirms the line. */
  lines: Set<string>;
  /** `true` while a note update is in flight. */
  note: boolean;
  /** `true` while an attribute update is in flight. */
  attributes: boolean;
  /** Discount codes with an apply or remove in flight. */
  discountCodes: Set<string>;
  /** `true` while a change that can affect cart prices is in flight. */
  cost?: boolean;
}

/**
 * The cart's errors, grouped by the part of the cart that they affect: lines, the note,
 * attributes, discount codes, or the cart as a whole. Each group has a timestamp in
 * milliseconds since the epoch. Use the timestamps to flag stale errors or dismiss
 * errors after a timeout.
 *
 * Failed requests go in a network list, apart from Storefront API user errors.
 */
export interface CartErrorState {
  /** Errors that don't belong to a line, the note, an attribute, or a discount code. */
  cart: CartErrorGroup;
  /** Errors keyed by cart line ID. */
  lines: Map<string, CartErrorGroup>;
  /** Errors for the cart note. */
  note: CartErrorGroup;
  /** Errors keyed by attribute name. */
  attributes: Map<string, CartErrorGroup>;
  /** Errors keyed by discount code. */
  discountCodes: Map<string, CartErrorGroup>;
  /**
   * Failed cart requests. A failed cart change adds an entry, with an HTTP status when the endpoint returned a non-2xx response. A failed refresh adds an entry with a generic message and no status. A failed first load or a failed load after a reset adds no entry.
   */
  network: CartNetworkEntry[];
  /** Time in milliseconds since the epoch when the store last recorded any error, or `0` before the first. */
  lastUpdatedAt: number;
  /** Time in milliseconds since the epoch of the last line, discount code, or attribute error, or `0` before any. */
  cartUpdatedAt: number;
  /** Time in milliseconds since the epoch when the store last recorded line errors, or `0` before any. */
  linesUpdatedAt: number;
  /** Time in milliseconds since the epoch when the store last recorded note errors, or `0` before any. */
  noteUpdatedAt: number;
  /** Time in milliseconds since the epoch when the store last recorded attribute errors, or `0` before any. */
  attributesUpdatedAt: number;
  /** Time in milliseconds since the epoch when the store last recorded discount code errors, or `0` before any. */
  discountCodesUpdatedAt: number;
  /** Time in milliseconds since the epoch when the store last recorded a network error, or `0` before any. */
  networkUpdatedAt: number;
}

/**
 * The customer's cart, in the shape that the Storefront API returns.
 *
 * Cart costs come only from the server. Extra fields from your custom cart
 * fragment appear unchanged.
 */
export interface CartData {
  /** The cart's Storefront API GID, or `null` when no cart exists yet. */
  id: string | null;
  /** The cart's last update time in ISO 8601 format. Absent until the first server response. */
  updatedAt?: string;
  /** The Shopify checkout URL. The URL can change when the customer logs in or out, or changes tracking consent. */
  checkoutUrl?: string | null;
  /** Sum of all line quantities. */
  totalQuantity: number;
  /** The cart's subtotal, total, and checkout charge. */
  cost: CartCost;
  /** Customer-supplied cart note, or `null` or empty when unset. */
  note?: string | null;
  /** Cart-level custom attributes. */
  attributes: Attribute[];
  /** The cart's line items. */
  lines: CartLineConnection;
  /** Discount codes applied to the cart, with their applicability. */
  discountCodes: DiscountCode[];
  /** Extra cart fields from your custom cart fragment, unchanged. */
  [key: string]: unknown;
}

/**
 * The cart, plus what's loading, pending, and failed.
 *
 * The cart hooks return values from this state. The data type matches the cart
 * fragment in your cart server handlers.
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
  /** The cart, including changes that the server hasn't confirmed yet. */
  data: TData;
  /** `true` while the store loads the full cart: the first load, a load after `reset()`, or before `connect()` when the store has no initial data. */
  loading: boolean;
  /** Present while a full cart load runs. The promise resolves, and never rejects, when the load finishes or the store drops the load. */
  readonly readyPromise?: PromiseLike<void>;
  /** The parts of the cart with changes in flight. */
  pending: CartPending;
  /** `true` while the store reloads the cart in the background after overlapping cart changes or a `refresh()` call. */
  revalidating?: boolean;
  /** Errors and warnings, grouped by the part of the cart that they affect. */
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

/**
 * Creates an empty error group with no user errors and no warnings.
 *
 * @returns A new error group with empty user error and warning arrays.
 * @publicDocs
 */
export function createEmptyErrorGroup(): CartErrorGroup {
  return { userErrors: [], warnings: [] };
}

/**
 * Creates a cart error state with no errors and every timestamp at `0`.
 *
 * Each call returns new groups, maps, and arrays.
 *
 * @returns A new, empty error state.
 * @publicDocs
 */
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
 * Frozen cart data for an empty cart, with a `null` ID, zero quantities, and
 * zero-amount costs. A cart store without initial data starts from this cart.
 *
 * @publicDocs
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

/** Creates an empty cart state backed by the empty cart data. Loading defaults to `true`. */
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

/**
 * Shared empty cart state backed by the empty cart data, with loading set to `true`.
 *
 * @publicDocs
 */
export const EMPTY_CART_STATE: CartState = createEmptyCartState();
