import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";

/** A monetary value from the Storefront API. */
export interface Money {
  /** The decimal amount as a string, such as `"29.99"`. */
  amount: string;
  /** The ISO 4217 currency code, such as `"USD"`. */
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
  /** Units available for sale. The store caps typed quantity submissions at this value when your cart query selects it. */
  quantityAvailable?: number | null;
  /** Extra variant fields from your custom cart query pass through unchanged. */
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
  /** Storefront API GID of the cart line. The store keys pending state and line errors by this ID. */
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
  /** Extra connection fields from your custom cart query pass through unchanged. */
  [key: string]: unknown;
}

/** A discount code applied to the cart. */
export interface DiscountCode {
  /** The discount code text. The store keys pending state and discount errors by this value. */
  code: string;
  /** Whether the code applies to the cart's current contents. The store sets `false` for a new code until the server responds. */
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

/** Errors and warnings from a single cart mutation response. */
export interface CartErrorGroup {
  /** Validation errors that the mutation returned. */
  userErrors: CartUserError[];
  /** Non-blocking warnings that the mutation returned. */
  warnings: CartWarning[];
}

/**
 * A network error from a cart request, such as a non-2xx response or a timeout. The store doesn't record aborted requests.
 */
export interface CartNetworkEntry {
  /** The error message, or a generic message when the failure has no message of its own. */
  message: string;
  /** HTTP status code when available. */
  status?: number;
}

/** A key-value pair attached to the cart or to an individual cart line. */
export interface Attribute {
  /** The attribute name. The store keys attribute errors by this value. */
  key: string;
  /** The attribute value. */
  value: string | null;
}

/**
 * Tracks which parts of the cart have in-flight mutations.
 *
 * The store tracks pending lines by line ID and pending discount codes by code,
 * which supports a pending indicator for each item. The cost flag is one boolean
 * because any line or discount change affects the total. Use the cost flag to show
 * pending UI on price displays without computing optimistic amounts.
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
  /** Line IDs with in-flight add, quantity, or remove mutations. New lines use their `optimistic:` ID until the server confirms. */
  lines: Set<string>;
  /** `true` while a note update is in flight. */
  note: boolean;
  /** `true` while an attribute update is in flight. */
  attributes: boolean;
  /** Discount codes with in-flight apply or remove mutations. */
  discountCodes: Set<string>;
  /** `true` while a mutation that can change cart pricing is in flight. */
  cost?: boolean;
}

/**
 * Per-resource error tracking for the cart.
 *
 * The store groups errors by the resource they affect: lines, the note, attributes,
 * discount codes, or the cart as a whole. Each group has a timestamp in milliseconds
 * since the epoch. Use the timestamps to flag stale errors or dismiss them after a timeout.
 *
 * A separate network list collects transport failures apart from Storefront API user errors.
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
   * When a cart mutation request fails, the store adds an entry. The entry has an HTTP status only when the endpoint returned a non-2xx response. When a refresh fails, the store adds an entry with a generic message and no status. The store logs failed initial loads and reset loads without adding entries.
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
 * Cart data returned by the Storefront API.
 *
 * Cart costs come only from the server. Extra fields from your custom cart query
 * pass through unchanged.
 */
export interface CartData {
  /** Storefront API Cart GID, or `null` when no cart exists yet. */
  id: string | null;
  /** The cart's last update time in ISO 8601 format. Absent until the first server response. */
  updatedAt?: string;
  /** The Shopify checkout URL. The URL changes when the buyer identity or consent state changes. */
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
  /** Extra cart fields from your custom cart query pass through unchanged. */
  [key: string]: unknown;
}

/**
 * The state of the cart store.
 *
 * The React and Vue cart hooks read this state. The data type matches the cart
 * query in your cart server handlers.
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
  /** The cart data from the server, with changes from unconfirmed mutations applied. */
  data: TData;
  /** `true` during a full-cart fetch: the initial load, a load after reset, or before connecting without initial data. */
  loading: boolean;
  /** A promise that resolves, and never rejects, when the current full cart load settles or the store discards the load. */
  readonly readyPromise?: PromiseLike<void>;
  /** The parts of the cart with mutations in flight. */
  pending: CartPending;
  /** `true` while a background revalidation runs after overlapping mutations or a refresh. */
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
 * Creates an empty cart error state with every timestamp at `0` and every group empty.
 *
 * Each call returns new groups, maps, and arrays.
 *
 * @returns A new error state that shares no groups, maps, or arrays with earlier calls.
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
 * zero-amount costs. Serves as the initial and fallback value before the first server response.
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
