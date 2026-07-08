import type {
  CartActionError,
  ShopifyStandardActions,
  UpdateCartOptions,
  UpdateCartPayload,
  UpdateCartResult,
} from "../../../vendor/standard-actions";
import type {
  CartLinesUpdateEvent,
  CartDiscountUpdateEvent,
  CartNoteUpdateEvent,
  CartLinesUpdateResult,
  CartDiscountUpdateResult,
  CartNoteUpdateResult,
} from "../../../vendor/standard-events";
import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";
import { createObservable } from "../observable";
import { SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT } from "../shopify-scripts/index";
import { sanitizeQuantity, DEFAULT_MINIMUM_QUANTITY } from "./quantity";
import type {
  CartData,
  CartState,
  CartLine,
  CartCost,
  CartUserError,
  CartWarning,
  CartErrorGroup,
  CartNetworkEntry,
} from "./state";
import { createCartState, createEmptyCartState, createEmptyErrorGroup } from "./state";
import { syncQuantityInputs } from "./sync-quantity-inputs";

interface CartResponse extends CartData {
  id: string;
  cost: CartCost;
  checkoutUrl?: string | null;
}

function getLines(cart: CartData): CartLine[] {
  return cart.lines.nodes;
}

function setLines<TData extends CartData>(cart: TData, lines: CartLine[]): TData {
  return { ...cart, lines: { ...cart.lines, nodes: lines } };
}

type StandardEventCart = NonNullable<
  (CartLinesUpdateResult | CartDiscountUpdateResult | CartNoteUpdateResult)["cart"]
>;

/**
 * Standard Events flatten cart lines. Unflatten them here.
 */
function cartResponseFromStandardEvent(cart: StandardEventCart): CartResponse {
  return { ...(cart as unknown as CartResponse), lines: { nodes: cart.lines as CartLine[] } };
}

export class CartNetworkError extends Error {
  readonly status: number;
  constructor(status: number) {
    super("Something went wrong updating your cart. Please try again.");
    this.name = "CartNetworkError";
    this.status = status;
  }
}

export const STANDARD_ACTION_TIMEOUT_IN_MS = 30_000;
const OPTIMISTIC_LINE_ID_PREFIX = "optimistic:";

export type CartStore = {
  connect(): void;
  destroy(): void;
  hydrate(data: CartData): void;
  getState(): CartState;
  subscribe(listener: (state: CartState) => void): () => void;
  fetch(): Promise<void>;
  reset(): void;
  handleFormSubmit(event: SubmitEvent, eventDetail?: Record<string, unknown>): Promise<void>;
};

type CartStoreContext = {
  observable: ReturnType<typeof createObservable<CartState>>;
  activeCartLoad: ActiveCartLoad | null;
  lineControllers: Map<string, AbortController>;
  discountController: AbortController | null;
  noteController: AbortController | null;
  merchandiseControllers: Map<string, AbortController>;
  lineBaselines: Map<string, CartLine>;
  discountBaseline: CartState["data"]["discountCodes"] | null;
  noteBaseline: CartData["note"] | undefined;
  cartSyncAttached: boolean;
};

/**
 * The one active full-cart load for the state snapshot that started it.
 *
 * Initial loads and explicit `store.fetch()` calls share this slot. While the
 * state is unchanged, callers reuse the same promise instead of starting
 * duplicate cart requests. If state changes before the promise settles, the
 * stale result is ignored and the next `store.fetch()` is allowed to start a
 * fresh load.
 */
type ActiveCartLoad = {
  /**
   * Captures the exact state object from when the load started. Observable
   * state updates replace the object, so object identity is enough to tell
   * whether a resolving load is still safe to apply.
   */
  state: CartState;
  promise: Promise<void>;
};

type CartInitialData<TData extends CartData = CartData> = {
  cart: TData | null;
  errors?: Array<{ message: string }>;
};

export type CreateCartStoreOptions<TData extends CartData = CartData> = {
  initialData?: CartInitialData<TData> | PromiseLike<CartInitialData<TData>>;
};

type CartEventHandlers = {
  lines: EventListener;
  discount: EventListener;
  note: EventListener;
};

export function createCartStore<TData extends CartData = CartData>(
  options: CreateCartStoreOptions<TData> = {},
): CartStore {
  const initialData = options.initialData;
  const isAsyncInitialData = isPromiseLike<CartInitialData<TData>>(initialData);
  const isSyncInitialData = initialData !== undefined && !isAsyncInitialData;
  const initialCart = isSyncInitialData ? initialData.cart : null;
  const isHydratedInitialCart = initialCart != null;

  const context: CartStoreContext = {
    observable: createObservable<CartState>(
      isHydratedInitialCart
        ? createCartState(initialCart)
        : isSyncInitialData
          ? createEmptyCartState({ loading: false })
          : createEmptyCartState(),
    ),
    activeCartLoad: null,
    lineControllers: new Map<string, AbortController>(),
    discountController: null,
    noteController: null,
    merchandiseControllers: new Map<string, AbortController>(),
    lineBaselines: new Map<string, CartLine>(),
    discountBaseline: null,
    noteBaseline: undefined,
    cartSyncAttached: false,
  };

  const eventHandlers: CartEventHandlers = {
    lines: ((event: Event) =>
      handleCartLinesUpdate(context, event as CartLinesUpdateEvent)) as EventListener,
    discount: ((event: Event) =>
      handleCartDiscountUpdate(context, event as CartDiscountUpdateEvent)) as EventListener,
    note: ((event: Event) =>
      handleCartNoteUpdate(context, event as CartNoteUpdateEvent)) as EventListener,
  };

  /**
   * Initial cart loading is deferred until `connect()` so SSR stays side-effect
   * free. The flag also makes reconnects, including React StrictMode
   * mount/unmount cycles, reuse the first initial load instead of starting
   * another browser fetch. Sync initial data includes `{cart: null}`, which
   * means the server already settled the bootstrap with no cart.
   */
  let initialCartLoadStarted = isSyncInitialData;

  return {
    connect: () => {
      const connected = connectCartStore(context, eventHandlers);
      if (connected && !initialCartLoadStarted) {
        initialCartLoadStarted = true;
        loadCartInStore(
          context,
          isAsyncInitialData ? Promise.resolve(initialData).then((data) => data.cart) : undefined,
        ).catch((error: unknown) => console.error("[hydrogen] cart initial load failed:", error));
      }
    },
    destroy: () => destroyCartStore(context, eventHandlers),
    hydrate: (data) => hydrateCartInStore(context, data),
    getState: () => context.observable.state,
    subscribe: (listener) => context.observable.subscribe(listener),
    fetch: () => loadCartInStore(context),
    reset: () => resetCartStore(context),
    handleFormSubmit: (event, eventDetail) =>
      handleFormSubmitInStore(context, eventHandlers, event, eventDetail),
  };
}

type CartActionFailure = CartActionError["cause"];
type VendorUserError = NonNullable<CartActionFailure["userErrors"]>[number];
type VendorWarning = NonNullable<CartActionFailure["warnings"]>[number];

function getErrorGroup(map: Map<string, CartErrorGroup>, key: string): CartErrorGroup {
  let group = map.get(key);
  if (!group) {
    group = createEmptyErrorGroup();
    map.set(key, group);
  }
  return group;
}

function toCartUserError(e: VendorUserError): CartUserError {
  return {
    code: (e.code as CartErrorCode) ?? null,
    message: e.message,
    ...(e.field ? { field: e.field } : {}),
  };
}

function toCartWarning(w: VendorWarning): CartWarning {
  return {
    code: (w.code as CartWarningCode) ?? ("UNKNOWN" as CartWarningCode),
    message: w.message,
  };
}

function groupLineErrors(
  failure: CartActionFailure | undefined,
  lineIds: string[],
): { lines: Map<string, CartErrorGroup>; cart: CartErrorGroup } {
  const lines = new Map<string, CartErrorGroup>();
  const cart = createEmptyErrorGroup();

  for (const e of failure?.userErrors ?? []) {
    const lineIndex = findFieldIndex(e.field, "lines", "lineIds");
    const lineId = lineIndex !== undefined ? lineIds[lineIndex] : undefined;
    if (lineId) {
      getErrorGroup(lines, lineId).userErrors.push(toCartUserError(e));
    } else {
      cart.userErrors.push(toCartUserError(e));
    }
  }

  for (const w of failure?.warnings ?? []) {
    if (isCartLineId(w.target)) {
      getErrorGroup(lines, w.target).warnings.push(toCartWarning(w));
    } else {
      cart.warnings.push(toCartWarning(w));
    }
  }

  return { lines, cart };
}

function isDiscountWarning(code: string | undefined): boolean {
  return typeof code === "string" && code.startsWith("DISCOUNT_");
}

function groupDiscountErrors(
  failure: CartActionFailure | undefined,
  discountCodes: string[],
  resolvedDiscountCodes?: Array<{ code: string; applicable: boolean }>,
): { discountCodes: Map<string, CartErrorGroup>; cart: CartErrorGroup } {
  const codes = new Map<string, CartErrorGroup>();
  const cart = createEmptyErrorGroup();

  for (const e of failure?.userErrors ?? []) {
    const codeIndex = findFieldIndex(e.field, "discountCodes");
    const code = codeIndex !== undefined ? discountCodes[codeIndex] : undefined;
    if (code) {
      getErrorGroup(codes, code).userErrors.push(toCartUserError(e));
    } else {
      cart.userErrors.push(toCartUserError(e));
    }
  }

  const nonApplicableCodes =
    resolvedDiscountCodes?.filter((dc) => !dc.applicable).map((dc) => dc.code) ?? [];

  for (const w of failure?.warnings ?? []) {
    const warning = toCartWarning(w);

    if (isDiscountWarning(w.code) && nonApplicableCodes.length > 0) {
      for (const code of nonApplicableCodes) {
        getErrorGroup(codes, code).warnings.push(warning);
      }
    } else {
      cart.warnings.push(warning);
    }
  }

  return { discountCodes: codes, cart };
}

function toCartErrorGroup(failure: CartActionFailure): CartErrorGroup {
  return {
    userErrors: (failure?.userErrors ?? []).map(toCartUserError),
    warnings: (failure?.warnings ?? []).map(toCartWarning),
  };
}

function findFieldIndex(field: string[] | undefined, ...keys: string[]): number | undefined {
  if (!field) return undefined;
  const index = field.findIndex(
    (part, i) => keys.includes(part) && /^\d+$/.test(field[i + 1] ?? ""),
  );
  return index === -1 ? undefined : Number(field[index + 1]);
}

function createNetworkEntry(error: CartNetworkError): CartNetworkEntry {
  return { message: error.message, status: error.status };
}

function extractCartActionFailure(error: unknown): CartActionFailure | undefined {
  const cause = (error as CartActionError | null)?.cause;
  return Array.isArray(cause?.userErrors) || Array.isArray(cause?.warnings) ? cause : undefined;
}

function writeNetworkError(store: CartStoreContext, error: unknown): void {
  const now = Date.now();
  const entry: CartNetworkEntry =
    error instanceof CartNetworkError
      ? createNetworkEntry(error)
      : { message: error instanceof Error ? error.message : "Cart update failed" };
  store.observable.setState((prev) => ({
    ...prev,
    errors: {
      ...prev.errors,
      network: [...prev.errors.network, entry],
      networkUpdatedAt: now,
      lastUpdatedAt: now,
    },
  }));
}

function extractProductDetails(
  detail: Record<string, unknown> | undefined,
): Array<Record<string, unknown>> {
  const raw = detail?.products;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Record<string, unknown> =>
      typeof p === "object" && p !== null && "id" in p && typeof p.id === "string",
  );
}

function clearPendingWork(store: CartStoreContext): void {
  for (const controller of store.lineControllers.values()) controller.abort();
  store.discountController?.abort();
  store.noteController?.abort();
  for (const controller of store.merchandiseControllers.values()) {
    controller.abort();
  }

  store.lineControllers.clear();
  store.discountController = null;
  store.noteController = null;
  store.merchandiseControllers.clear();
  store.lineBaselines.clear();
  store.discountBaseline = null;
  store.noteBaseline = undefined;
}

function destroyCartStore(store: CartStoreContext, eventHandlers: CartEventHandlers): void {
  clearPendingWork(store);

  if (typeof document !== "undefined" && store.cartSyncAttached) {
    document.removeEventListener("shopify:cart:lines-update", eventHandlers.lines);
    document.removeEventListener("shopify:cart:discount-update", eventHandlers.discount);
    document.removeEventListener("shopify:cart:note-update", eventHandlers.note);
  }

  connectedCartStores.delete(store);
  store.cartSyncAttached = false;
}

/**
 * Run a full-cart load through the shared stale-result guard and dedupe slot.
 *
 * This is used by the first client connect load and by explicit revalidation
 * from `store.fetch()`. Callers may provide an existing promise-like source,
 * such as async initial data; otherwise this function creates the browser fetch
 * after checking whether the current state already has an active load. Once the
 * load settles, the slot is cleared; if state changes first, the stale result is
 * ignored and a later `store.fetch()` can start a fresh load.
 */
function loadCartInStore(
  store: CartStoreContext,
  cartPromise?: PromiseLike<CartData | null>,
): Promise<void> {
  const existingRequest = store.activeCartLoad;
  if (existingRequest?.state === store.observable.state) {
    return existingRequest.promise;
  }

  let request: ActiveCartLoad;
  const state = store.observable.state;
  const promise = Promise.resolve(cartPromise ?? fetchCartData(state.data.id))
    .then((data) => {
      if (!isCurrentCartLoad(store, request)) return;

      if (!data) {
        store.observable.setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      hydrateCartInStore(store, data);
    })
    .catch((error) => {
      if (isCurrentCartLoad(store, request)) {
        store.observable.setState((prev) => ({ ...prev, loading: false }));
      }
      throw error;
    })
    .finally(() => {
      if (store.activeCartLoad === request) {
        store.activeCartLoad = null;
      }
    });

  request = { state, promise };
  store.activeCartLoad = request;
  return promise;
}

/**
 * Returns whether a full-cart load can still apply its result.
 *
 * The request must still be the active load and the store must still be on the
 * same state snapshot. Either change means the result is stale.
 */
function isCurrentCartLoad(store: CartStoreContext, request: ActiveCartLoad): boolean {
  return store.activeCartLoad === request && store.observable.state === request.state;
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function hydrateCartInStore(store: CartStoreContext, data: CartData): void {
  const current = store.observable.state;
  if (current.data.id !== null && current.data.id === data.id) return;
  if (
    current.pending.lines.size > 0 ||
    current.pending.note ||
    current.pending.discountCodes.size > 0
  )
    return;

  store.observable.setState(createCartState(data));
}

function fetchCartData(cartId?: string | null): Promise<CartData | null> {
  return fetchCart(cartId).then(({ cart }) =>
    cart
      ? {
          ...cart,
          checkoutUrl: cart.checkoutUrl ?? null,
          note: extractNoteFromCart(cart),
        }
      : null,
  );
}

async function refreshCheckoutUrl(store: CartStoreContext): Promise<void> {
  // TODO: consider making a GraphQL query directly to SFAPI proxy instead.
  const { cart } = await fetchCart(store.observable.state.data.id);

  const current = store.observable.state;
  if (!cart || (current.data.id && current.data.id !== cart.id)) return;

  const checkoutUrl = cart.checkoutUrl ?? null;
  store.observable.setState((prev) =>
    prev.data.checkoutUrl === checkoutUrl ? prev : { ...prev, data: { ...prev.data, checkoutUrl } },
  );
}

async function fetchCart(cartId?: string | null): Promise<{ cart: CartResponse | null }> {
  if (configuredCartEndpoint) {
    let endpoint = configuredCartEndpoint;
    if (cartId) {
      const separator = endpoint.includes("?") ? "&" : "?";
      endpoint += `${separator}cartId=${encodeURIComponent(cartId)}`;
    }

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
    });

    if (!response.ok) throw new CartNetworkError(response.status);

    const result = (await response.json()) as { cart: CartResponse | null };
    return { cart: result.cart };
  }

  const { getCart } = await getShopifyStandardActions();
  if (!getCart) {
    throw new Error(
      "Standard Actions not available. Ensure the Shopify script tag is loaded before calling fetchCart.",
    );
  }

  const result = (await getCart(cartId ? { cartId } : undefined, {
    signal: AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
  })) as { cart: CartResponse | null };

  return { cart: result.cart };
}

/**
 * @internal
 *
 * Consent changes can rotate analytics tracking tokens that are embedded in
 * cart.checkoutUrl. Keep this internal: frameworks should not need to wire
 * revalidation just to keep the cart store's checkout URL fresh.
 */
export function revalidateConnectedCartCheckoutUrls(): void {
  if (typeof window === "undefined") return;

  const stores = [...connectedCartStores].filter((store) => {
    const state = store.observable.state;
    return state.data.checkoutUrl && state.data.totalQuantity > 0;
  });

  if (stores.length) {
    for (const store of stores) {
      refreshCheckoutUrl(store).catch(() => {});
    }
  }
}

function resetCartStore(store: CartStoreContext): void {
  clearPendingWork(store);
  store.activeCartLoad = null;
  store.observable.setState(createEmptyCartState());
}

function reconcileLines(
  prev: CartLine[],
  next: CartLine[],
  pendingLineIds?: Set<string>,
  currentAffectedIds?: Set<string>,
): CartLine[] {
  const merged = next.map((n) => {
    const p = prev.find((l) => l.id === n.id);
    return p ? { ...p, ...n } : n;
  });

  if (!pendingLineIds) return merged;

  const affected = currentAffectedIds ?? new Set<string>();
  const stillPending = prev.filter(
    (l) =>
      l.id.startsWith(OPTIMISTIC_LINE_ID_PREFIX) &&
      pendingLineIds.has(l.id) &&
      !affected.has(l.id) &&
      !merged.some((m) => m.id === l.id),
  );

  return stillPending.length > 0 ? [...merged, ...stillPending] : merged;
}

// Vendored CartSummary omits `note`, but the GraphQL response includes it at runtime.
function extractNoteFromCart(cart: CartResponse): string {
  return ((cart as unknown as Record<string, unknown>).note as string) ?? "";
}

function resolveCartLines(
  observable: CartStoreContext["observable"],
  cart: CartResponse,
  affectedIds: Set<string>,
  failure: CartActionFailure | undefined,
  lineIds: string[],
): void {
  const now = Date.now();
  const grouped = groupLineErrors(failure, lineIds);

  observable.setState((prev) => {
    const prevLines = getLines(prev.data);
    const cartLines = getLines(cart);
    let mergedLines = reconcileLines(prevLines, cartLines, prev.pending.lines, affectedIds);

    mergedLines = mergedLines.map((line) => {
      if (!prev.pending.lines.has(line.id)) return line;
      if (affectedIds.has(line.id)) return line;
      const optimistic = prevLines.find((l) => l.id === line.id);
      return optimistic ? { ...line, quantity: optimistic.quantity } : line;
    });

    const optimisticallyRemovedIds = new Set<string>();
    for (const id of prev.pending.lines) {
      if (!prevLines.some((l) => l.id === id) && !affectedIds.has(id)) {
        optimisticallyRemovedIds.add(id);
      }
    }
    mergedLines = mergedLines.filter((line) => !optimisticallyRemovedIds.has(line.id));

    const remainingPending = new Set(prev.pending.lines);
    for (const id of affectedIds) remainingPending.delete(id);

    const data = cart;

    return {
      ...prev,
      data: setLines(
        {
          ...data,
          totalQuantity:
            remainingPending.size > 0
              ? mergedLines.reduce((sum, l) => sum + l.quantity, 0)
              : data.totalQuantity,
          note: prev.pending.note ? prev.data.note : data.note,
          discountCodes:
            prev.pending.discountCodes.size > 0 ? prev.data.discountCodes : data.discountCodes,
        },
        mergedLines,
      ),
      pending: { ...prev.pending, lines: remainingPending },
      errors: {
        ...prev.errors,
        lines: grouped.lines,
        cart: grouped.cart,
        linesUpdatedAt: now,
        cartUpdatedAt: now,
        lastUpdatedAt: now,
      },
    };
  });
}

function isCartLineId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/CartLine/");
}

// ---------------------------------------------------------------------------
// Event-driven state management
// ---------------------------------------------------------------------------

function handleCartLinesAdd(store: CartStoreContext, event: CartLinesUpdateEvent): void {
  const cartObservable = store.observable;
  const lineControllers = store.lineControllers;
  const merchandiseControllers = store.merchandiseControllers;
  const lineBaselines = store.lineBaselines;
  const addLines = event.lines as Array<{
    merchandiseId: string;
    quantity: number;
  }>;
  const current = cartObservable.state;
  const products = extractProductDetails(event.detail);

  const matchedAdditions = new Map<string, number>();
  const optimisticLines: CartLine[] = [];
  const untrackedAddLines: Array<{ merchandiseId: string; quantity: number }> = [];
  const lineToMerchandise = new Map<string, string>();

  for (const eventLine of addLines) {
    const existing = getLines(current.data).find(
      (l) =>
        l.merchandise?.id === eventLine.merchandiseId ||
        l.id === OPTIMISTIC_LINE_ID_PREFIX + eventLine.merchandiseId,
    );
    if (existing) {
      const prev = matchedAdditions.get(existing.id) ?? 0;
      matchedAdditions.set(existing.id, prev + eventLine.quantity);
      lineToMerchandise.set(existing.id, eventLine.merchandiseId);
      if (!existing.id.startsWith(OPTIMISTIC_LINE_ID_PREFIX) && !lineBaselines.has(existing.id)) {
        lineBaselines.set(existing.id, { ...existing });
      }
    } else {
      const productDetail = products.find((p) => p.id === eventLine.merchandiseId);
      if (productDetail) {
        const { price, ...merchandise } = productDetail;
        const optimisticId = OPTIMISTIC_LINE_ID_PREFIX + eventLine.merchandiseId;
        lineToMerchandise.set(optimisticId, eventLine.merchandiseId);
        // Casts are intentional: product shape is merchant-provided via event.detail
        // and replaced by server truth on resolve. extractProductDetails validates
        // the structural minimum (object with string id).
        optimisticLines.push({
          id: optimisticId,
          quantity: eventLine.quantity,
          merchandise: merchandise as unknown as CartLine["merchandise"],
          cost: {
            totalAmount: (price as CartLine["cost"]["totalAmount"]) ?? {
              amount: "0",
              currencyCode: "",
            },
            subtotalAmount: (price as CartLine["cost"]["subtotalAmount"]) ?? {
              amount: "0",
              currencyCode: "",
            },
            amountPerQuantity: (price as CartLine["cost"]["amountPerQuantity"]) ?? {
              amount: "0",
              currencyCode: "",
            },
            compareAtAmountPerQuantity: null,
          },
        });
      } else {
        untrackedAddLines.push(eventLine);
      }
    }
  }

  const matchedIds = [...matchedAdditions.keys()];
  const optimisticIds = optimisticLines.map((l) => l.id);
  const allAffectedIds = [...matchedIds, ...optimisticIds];

  const controllersAtEventTime = new Map(matchedIds.map((id) => [id, lineControllers.get(id)]));

  // One controller per add batch — shared across all merchandiseIds because
  // the batch is a single atomic fetch. Superseding any merchandiseId in the
  // batch aborts the entire request.
  const addMerchIds = [...new Set(addLines.map((l) => l.merchandiseId))];
  const addController = new AbortController();
  for (const merchId of addMerchIds) {
    merchandiseControllers.get(merchId)?.abort();
    merchandiseControllers.set(merchId, addController);
  }

  const addedQuantity = addLines.reduce((sum, l) => sum + l.quantity, 0);

  cartObservable.setState((prev) => {
    const prevLines = getLines(prev.data);
    const newPendingLines = new Set(prev.pending.lines);
    for (const id of allAffectedIds) newPendingLines.add(id);

    return {
      ...prev,
      data: setLines({ ...prev.data, totalQuantity: prev.data.totalQuantity + addedQuantity }, [
        ...prevLines.map((l) => {
          const addition = matchedAdditions.get(l.id);
          return addition != null ? { ...l, quantity: l.quantity + addition } : l;
        }),
        ...optimisticLines,
      ]),
      pending: { ...prev.pending, lines: newPendingLines },
    };
  });

  if (matchedIds.length > 0 && configuredCartEndpoint) {
    const updates = matchedIds.map((id) => ({
      id,
      quantity: getLines(cartObservable.state.data).find((l) => l.id === id)?.quantity ?? 0,
    }));
    syncQuantityInputs(updates, configuredCartEndpoint);
  }

  const wasSuperseded = (lineId: string): boolean => {
    if (lineControllers.get(lineId) !== controllersAtEventTime.get(lineId)) return true;
    const merchId = lineToMerchandise.get(lineId);
    return !!merchId && merchandiseControllers.get(merchId) !== addController;
  };

  const cleanupAddController = (): void => {
    for (const merchId of addMerchIds) {
      if (merchandiseControllers.get(merchId) === addController) {
        merchandiseControllers.delete(merchId);
      }
    }
  };

  const getOwnedUntrackedQuantity = (): number => {
    let quantity = 0;
    for (const line of untrackedAddLines) {
      if (merchandiseControllers.get(line.merchandiseId) === addController) {
        quantity += line.quantity;
      }
    }
    return quantity;
  };

  const rollbackAdd = (failure?: CartActionFailure): void => {
    const matchedToRollback = matchedIds.filter((id) => !wasSuperseded(id));
    const optimisticToRemove = optimisticIds.filter((id) => !wasSuperseded(id));
    const hasTrackedRollback = matchedToRollback.length > 0 || optimisticToRemove.length > 0;

    // Add-by-merchandise without detail.products bumps totalQuantity without
    // creating any matched or optimistic line. On failure we still need to undo
    // the bump, but only for merchandiseIds this batch still owns — a newer add
    // for the same merchandiseId replaces the controller, and its bump must be
    // left alone.
    const ownedUntrackedQuantity = getOwnedUntrackedQuantity();

    if (!hasTrackedRollback && ownedUntrackedQuantity === 0) return;

    const grouped = failure ? groupLineErrors(failure, matchedIds) : null;
    const now = grouped ? Date.now() : 0;

    cartObservable.setState((prev) => {
      const prevLines = getLines(prev.data);
      let revertedLines = prevLines.filter((l) => !optimisticToRemove.includes(l.id));

      for (const lineId of matchedToRollback) {
        const baseline = lineBaselines.get(lineId);
        if (!baseline) continue;
        revertedLines = revertedLines.map((l) => (l.id === lineId ? baseline : l));
      }

      const remainingPending = new Set(prev.pending.lines);
      for (const id of matchedToRollback) remainingPending.delete(id);
      for (const id of optimisticToRemove) remainingPending.delete(id);

      const visibleQuantityBefore = prevLines.reduce((sum, l) => sum + l.quantity, 0);
      const visibleQuantityAfter = revertedLines.reduce((sum, l) => sum + l.quantity, 0);
      const visibleRollbackQuantity = visibleQuantityBefore - visibleQuantityAfter;
      const totalQuantity = Math.max(
        0,
        prev.data.totalQuantity - visibleRollbackQuantity - ownedUntrackedQuantity,
      );

      return {
        ...prev,
        data: setLines({ ...prev.data, totalQuantity }, revertedLines),
        pending: { ...prev.pending, lines: remainingPending },
        ...(grouped && {
          errors: {
            ...prev.errors,
            lines: grouped.lines,
            cart: grouped.cart,
            linesUpdatedAt: now,
            cartUpdatedAt: now,
            lastUpdatedAt: now,
          },
        }),
      };
    });

    for (const lineId of matchedToRollback) {
      lineBaselines.delete(lineId);
    }
  };

  event.promise.then(
    (result) => {
      if (!result?.cart) {
        // 200 OK with no cart = mutation failed entirely (e.g. all merchandiseIds invalid).
        // Roll back optimistic state and surface userErrors.
        rollbackAdd(result);
        cleanupAddController();
        return;
      }

      // A newer add for the same merchandiseId will handle reconciliation
      const superseded = addMerchIds.some((id) => merchandiseControllers.get(id) !== addController);
      if (superseded) return;

      const cart = cartResponseFromStandardEvent(result.cart);
      const affectedIds = new Set(allAffectedIds);

      resolveCartLines(cartObservable, cart, affectedIds, result, matchedIds);

      if (configuredCartEndpoint) {
        const resolvedUpdates = getLines(cart)
          .filter((l) => affectedIds.has(l.id))
          .map((l) => ({ id: l.id, quantity: l.quantity }));
        syncQuantityInputs(resolvedUpdates, configuredCartEndpoint);
      }

      for (const id of matchedIds) {
        if (cartObservable.state.pending.lines.has(id)) {
          const serverLine = getLines(cart).find((l) => l.id === id);
          if (serverLine) lineBaselines.set(id, serverLine as CartLine);
        } else {
          lineBaselines.delete(id);
        }
      }
      for (const id of optimisticIds) {
        lineBaselines.delete(id);
      }

      cleanupAddController();
    },
    (error) => {
      rollbackAdd(extractCartActionFailure(error));
      cleanupAddController();
    },
  );
}

function handleCartLinesUpdate(store: CartStoreContext, event: CartLinesUpdateEvent): void {
  const cartObservable = store.observable;
  const lineControllers = store.lineControllers;
  const lineBaselines = store.lineBaselines;
  const eventLines = event.lines;
  const action = event.action;

  if (action === "add") {
    handleCartLinesAdd(store, event);
    return;
  }

  const lineIds = eventLines.map((l) => (l as { id: string }).id);

  // Snapshot which controller owns each line RIGHT NOW (synchronous).
  // If a replacement mutation fires later, the controller changes — we use
  // this to detect "was I superseded?" in the async callbacks.
  const controllersAtEventTime = new Map(lineIds.map((id) => [id, lineControllers.get(id)]));

  for (const lineId of lineIds) {
    if (!lineBaselines.has(lineId)) {
      const existing = getLines(cartObservable.state.data).find((l) => l.id === lineId);
      if (existing) lineBaselines.set(lineId, { ...existing });
    }
  }

  cartObservable.setState((prev) => {
    const prevLines = getLines(prev.data);
    const isRemove = action === "remove";
    const updatedLines = isRemove
      ? prevLines.filter((l) => !lineIds.includes(l.id))
      : prevLines.map((l) => {
          const match = eventLines.find((el) => (el as { id: string }).id === l.id);
          return match ? { ...l, quantity: match.quantity } : l;
        });

    const newPendingLines = new Set(prev.pending.lines);
    for (const id of lineIds) newPendingLines.add(id);

    return {
      ...prev,
      data: setLines(
        { ...prev.data, totalQuantity: updatedLines.reduce((sum, l) => sum + l.quantity, 0) },
        updatedLines,
      ),
      pending: { ...prev.pending, lines: newPendingLines },
    };
  });

  const rollbackUpdate = (failure?: CartActionFailure): void => {
    const linesToRollback = lineIds.filter(
      (id) => lineControllers.get(id) === controllersAtEventTime.get(id),
    );
    if (linesToRollback.length === 0) return;

    const grouped = failure ? groupLineErrors(failure, lineIds) : null;
    const now = grouped ? Date.now() : 0;

    cartObservable.setState((prev) => {
      let revertedLines = getLines(prev.data);
      for (const lineId of linesToRollback) {
        const baseline = lineBaselines.get(lineId);
        if (!baseline) continue;

        const existsInState = revertedLines.some((l) => l.id === lineId);
        if (existsInState) {
          revertedLines = revertedLines.map((l) => (l.id === lineId ? baseline : l));
        } else {
          revertedLines = [...revertedLines, baseline];
        }
      }

      const remainingPending = new Set(prev.pending.lines);
      for (const id of linesToRollback) remainingPending.delete(id);

      return {
        ...prev,
        data: setLines(
          { ...prev.data, totalQuantity: revertedLines.reduce((sum, l) => sum + l.quantity, 0) },
          revertedLines,
        ),
        pending: { ...prev.pending, lines: remainingPending },
        ...(grouped && {
          errors: {
            ...prev.errors,
            lines: grouped.lines,
            cart: grouped.cart,
            linesUpdatedAt: now,
            cartUpdatedAt: now,
            lastUpdatedAt: now,
          },
        }),
      };
    });

    for (const lineId of linesToRollback) {
      lineBaselines.delete(lineId);
    }
  };

  if (action === "update" && configuredCartEndpoint) {
    const updates = eventLines.map((l) => ({
      id: (l as { id: string }).id,
      quantity: l.quantity,
    }));
    syncQuantityInputs(updates, configuredCartEndpoint);
  }

  event.promise.then(
    (result) => {
      if (!result?.cart) {
        rollbackUpdate(result);
        return;
      }
      const cart = cartResponseFromStandardEvent(result.cart);
      const affectedIds = new Set(lineIds);

      resolveCartLines(cartObservable, cart, affectedIds, result, lineIds);

      if (configuredCartEndpoint) {
        const resolvedUpdates = getLines(cart)
          .filter((l) => affectedIds.has(l.id))
          .map((l) => ({ id: l.id, quantity: l.quantity }));
        syncQuantityInputs(resolvedUpdates, configuredCartEndpoint);
      }

      for (const id of affectedIds) {
        if (cartObservable.state.pending.lines.has(id)) {
          const serverLine = getLines(cart).find((l) => l.id === id);
          if (serverLine) lineBaselines.set(id, serverLine as CartLine);
        } else {
          lineBaselines.delete(id);
        }
      }
    },
    (error) => rollbackUpdate(extractCartActionFailure(error)),
  );
}

function handleCartDiscountUpdate(store: CartStoreContext, event: CartDiscountUpdateEvent): void {
  const cartObservable = store.observable;
  const controllerAtEventTime = store.discountController;

  if (store.discountBaseline === null) {
    store.discountBaseline = cartObservable.state.data.discountCodes;
  }

  const newCodeSet = new Set(event.discountCodes.map((c) => c.code));

  cartObservable.setState((prev) => {
    const prevCodeSet = new Set(prev.data.discountCodes.map((c) => c.code));

    const newPendingCodes = new Set(prev.pending.discountCodes);
    for (const code of event.discountCodes.map((c) => c.code)) {
      if (!prevCodeSet.has(code)) newPendingCodes.add(code);
    }
    for (const code of prev.data.discountCodes.map((c) => c.code)) {
      if (!newCodeSet.has(code)) newPendingCodes.add(code);
    }

    return {
      ...prev,
      data: {
        ...prev.data,
        discountCodes: event.discountCodes.map((c) => {
          const known = prev.data.discountCodes.find((dc) => dc.code === c.code);
          return { code: c.code, applicable: known?.applicable ?? false };
        }),
      },
      pending: { ...prev.pending, discountCodes: newPendingCodes },
    };
  });

  const rollbackDiscount = (failure?: CartActionFailure): void => {
    if (store.discountController !== controllerAtEventTime) return;

    const baseline = store.discountBaseline ?? [];
    store.discountBaseline = null;

    const grouped = failure
      ? groupDiscountErrors(
          failure,
          event.discountCodes.map((c) => c.code),
        )
      : null;
    const now = grouped ? Date.now() : 0;

    cartObservable.setState((prev) => ({
      ...prev,
      data: { ...prev.data, discountCodes: baseline },
      pending: { ...prev.pending, discountCodes: new Set() },
      ...(grouped && {
        errors: {
          ...prev.errors,
          discountCodes: grouped.discountCodes,
          cart: grouped.cart,
          discountCodesUpdatedAt: now,
          cartUpdatedAt: now,
          lastUpdatedAt: now,
        },
      }),
    }));
  };

  event.promise.then(
    (result: CartDiscountUpdateResult) => {
      if (!result?.cart) {
        rollbackDiscount(result);
        return;
      }
      const cart = cartResponseFromStandardEvent(result.cart);

      store.discountBaseline = null;
      const now = Date.now();
      const grouped = groupDiscountErrors(
        result,
        event.discountCodes.map((c) => c.code),
        cart.discountCodes,
      );
      cartObservable.setState((prev) => {
        const mergedLines = reconcileLines(getLines(prev.data), getLines(cart), prev.pending.lines);

        const data = cart;

        return {
          ...prev,
          data: setLines(
            {
              ...data,
              totalQuantity:
                prev.pending.lines.size > 0
                  ? mergedLines.reduce((sum, l) => sum + l.quantity, 0)
                  : data.totalQuantity,
              note: prev.pending.note ? prev.data.note : data.note,
            },
            mergedLines,
          ),
          pending: { ...prev.pending, discountCodes: new Set() },
          errors: {
            ...prev.errors,
            discountCodes: grouped.discountCodes,
            cart: grouped.cart,
            discountCodesUpdatedAt: now,
            cartUpdatedAt: now,
            lastUpdatedAt: now,
          },
        };
      });
    },
    (error) => rollbackDiscount(extractCartActionFailure(error)),
  );
}

function handleCartNoteUpdate(store: CartStoreContext, event: CartNoteUpdateEvent): void {
  const cartObservable = store.observable;
  const controllerAtEventTime = store.noteController;

  if (store.noteBaseline === undefined) {
    store.noteBaseline = cartObservable.state.data.note;
  }

  cartObservable.setState((prev) => ({
    ...prev,
    data: { ...prev.data, note: event.note },
    pending: { ...prev.pending, note: true },
  }));

  const rollbackNote = (failure?: CartActionFailure): void => {
    if (store.noteController !== controllerAtEventTime) return;

    const baseline = store.noteBaseline;
    store.noteBaseline = undefined;

    const noteErrors = failure ? toCartErrorGroup(failure) : null;
    const now = noteErrors ? Date.now() : 0;

    cartObservable.setState((prev) => ({
      ...prev,
      data: { ...prev.data, note: baseline },
      pending: { ...prev.pending, note: false },
      ...(noteErrors && {
        errors: {
          ...prev.errors,
          note: noteErrors,
          noteUpdatedAt: now,
          lastUpdatedAt: now,
        },
      }),
    }));
  };

  event.promise.then(
    (result: CartNoteUpdateResult) => {
      if (!result?.cart) {
        rollbackNote(result);
        return;
      }
      const cart = cartResponseFromStandardEvent(result.cart);

      store.noteBaseline = undefined;
      const now = Date.now();
      cartObservable.setState((prev) => {
        const mergedLines = reconcileLines(getLines(prev.data), getLines(cart), prev.pending.lines);

        const data = cart;

        return {
          ...prev,
          data: setLines(
            {
              ...data,
              note: event.note,
              totalQuantity:
                prev.pending.lines.size > 0
                  ? mergedLines.reduce((sum, l) => sum + l.quantity, 0)
                  : data.totalQuantity,
              discountCodes:
                prev.pending.discountCodes.size > 0 ? prev.data.discountCodes : data.discountCodes,
            },
            mergedLines,
          ),
          pending: { ...prev.pending, note: false },
          errors: {
            ...prev.errors,
            note: toCartErrorGroup(result),
            noteUpdatedAt: now,
            lastUpdatedAt: now,
          },
        };
      });
    },
    (error) => rollbackNote(extractCartActionFailure(error)),
  );
}

// ---------------------------------------------------------------------------
// Event listener registration + trampoline handler
// ---------------------------------------------------------------------------

let configuredCartEndpoint: string | null = null;
let hasConfiguredUpdateCart = false;
let standardActionsPromise: Promise<ShopifyStandardActions> | null = null;
const connectedCartStores = new Set<CartStoreContext>();

/** @internal */
export function resetStandardActionsForTests(): void {
  hasConfiguredUpdateCart = false;
  standardActionsPromise = null;
}

export function configureCartEndpoint(endpoint: string): void {
  if (configuredCartEndpoint === endpoint) return;
  if (configuredCartEndpoint !== null) {
    console.warn(
      `configureCartEndpoint called with "${endpoint}" but already configured with "${configuredCartEndpoint}".`,
    );
  }
  configuredCartEndpoint = endpoint;
}

async function postCartUpdateToEndpoint(
  endpoint: string,
  payload: UpdateCartPayload,
  options?: UpdateCartOptions,
): Promise<UpdateCartResult> {
  const timeoutSignal = AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS);
  const signal = options?.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new CartNetworkError(response.status);
  return response.json();
}

/**
 * Attach browser-only cart sync listeners.
 *
 * Returns `false` during SSR so the public `connect()` wrapper can avoid
 * observing or creating the deferred initial cart data on the server.
 */
function connectCartStore(store: CartStoreContext, eventHandlers: CartEventHandlers): boolean {
  if (typeof document === "undefined") return false;

  if (!store.cartSyncAttached) {
    store.cartSyncAttached = true;
    connectedCartStores.add(store);

    document.addEventListener("shopify:cart:lines-update", eventHandlers.lines);
    document.addEventListener("shopify:cart:discount-update", eventHandlers.discount);
    document.addEventListener("shopify:cart:note-update", eventHandlers.note);
  }

  void getShopifyStandardActions().catch(() => {});
  return true;
}

function collectMerchandiseSignals(payload: UpdateCartPayload | undefined): AbortSignal[] {
  if (!payload?.lines) return [];

  const signals: AbortSignal[] = [];
  for (const line of payload.lines) {
    if (!line.merchandiseId) continue;

    for (const store of connectedCartStores) {
      const controller = store.merchandiseControllers.get(line.merchandiseId);
      if (controller) signals.push(controller.signal);
    }
  }

  return signals;
}

function configureUpdateCartOnce(actions: ShopifyStandardActions): void {
  if (hasConfiguredUpdateCart) return;

  const didConfigure = actions.updateCart.configure({
    eventTarget: () => document,
    handler: async (defaultHandler, payload, options) => {
      if (!configuredCartEndpoint || !payload) return defaultHandler();

      const merchandiseSignals = collectMerchandiseSignals(payload);
      const endpointOptions =
        merchandiseSignals.length > 0
          ? {
              ...options,
              signal: AbortSignal.any([
                ...merchandiseSignals,
                ...(options?.signal ? [options.signal] : []),
              ]),
            }
          : options;

      return postCartUpdateToEndpoint(configuredCartEndpoint, payload, endpointOptions);
    },
  });

  if (didConfigure === false) {
    throw new Error("Standard Actions updateCart could not be configured.");
  }

  hasConfiguredUpdateCart = true;
}

function hasShopifyStandardActionsScript(): boolean {
  if (typeof document === "undefined") return false;

  return (
    document.querySelector(`script[src="${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT}"]`) !== null
  );
}

export function getShopifyStandardActions(): Promise<ShopifyStandardActions> {
  return (standardActionsPromise ??= new Promise<ShopifyStandardActions>((resolve, reject) => {
    const configure = () => {
      const actions = typeof window !== "undefined" ? window.Shopify?.actions : undefined;
      if (actions?.updateCart) {
        configureUpdateCartOnce(actions);
        resolve(actions);
      } else {
        const message = hasShopifyStandardActionsScript()
          ? "Standard Actions not available. Ensure the Shopify script tag has loaded before calling cart actions."
          : `Standard Actions not available. Add ShopifyScripts to your document head or include ${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT} before calling cart actions.`;

        reject(new Error(message));
      }
    };

    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", configure, { once: true });
    } else {
      configure();
    }
  }).catch((error) => {
    standardActionsPromise = null;
    throw error;
  }));
}

// ---------------------------------------------------------------------------
// Form submission (thin payload constructor + abort management)
// ---------------------------------------------------------------------------

const LINE_INTENTS = new Set(["increase", "decrease", "remove", "set"]);
const DISCOUNT_INTENTS = new Set(["discount-apply", "discount-remove"]);

async function handleFormSubmitInStore(
  store: CartStoreContext,
  eventHandlers: CartEventHandlers,
  event: SubmitEvent,
  eventDetail?: Record<string, unknown>,
): Promise<void> {
  if (!(event.target instanceof HTMLFormElement)) {
    throw new TypeError(`Expected event.target to be an HTMLFormElement, got ${event.target}`);
  }

  if (!(event.submitter instanceof HTMLElement)) {
    throw new TypeError(`Expected event.submitter to be an HTMLElement, got ${event.submitter}`);
  }

  const { updateCart } = await getShopifyStandardActions();
  if (!updateCart) {
    throw new Error(
      "Standard Actions not available. Ensure the Shopify script tag is loaded before calling handleFormSubmit.",
    );
  }

  connectCartStore(store, eventHandlers);

  const intent = event.submitter.getAttribute("value") ?? "";
  const formData = new FormData(event.target);

  if (intent === "add" || (!intent && formData.has("merchandiseId"))) {
    const merchandiseId = formData.get("merchandiseId") as string | null;
    if (!merchandiseId) throw new Error('Add intent requires a "merchandiseId" field.');
    return submitAddMutation(updateCart, formData, merchandiseId, eventDetail);
  }

  if (LINE_INTENTS.has(intent)) {
    const lineId = formData.get("lineId") as string | null;
    if (!lineId) throw new Error('Missing "lineId" in form data');

    if (intent === "set") {
      // See actions.ts parseLineIntent for the server-side equivalent
      const rawQuantity = Number(formData.get("quantity"));
      const explicitQuantity = Number.isNaN(rawQuantity) ? DEFAULT_MINIMUM_QUANTITY : rawQuantity;
      return submitLineMutation(store, updateCart, intent, lineId, explicitQuantity);
    }

    return submitLineMutation(store, updateCart, intent, lineId);
  }

  if (DISCOUNT_INTENTS.has(intent)) {
    const discountCode = (formData.get("discountCode") as string) ?? "";
    return submitDiscountMutation(store, updateCart, intent, discountCode);
  }

  if (intent === "note-update") {
    const note = (formData.get("note") as string) ?? "";
    return submitNoteMutation(store, updateCart, note);
  }

  throw new Error(`Unknown cart form intent: "${intent}"`);
}

type UpdateCartFn = ShopifyStandardActions["updateCart"];

async function submitAddMutation(
  updateCart: UpdateCartFn,
  formData: FormData,
  merchandiseId: string,
  eventDetail?: Record<string, unknown>,
): Promise<void> {
  const rawQuantity = parseInt(formData.get("quantity") as string, 10);
  const quantity = Number.isNaN(rawQuantity) ? 1 : Math.max(1, rawQuantity);
  const rawSellingPlanId = formData.get("sellingPlanId") as string | null;
  const sellingPlanId = rawSellingPlanId && rawSellingPlanId !== "" ? rawSellingPlanId : undefined;

  const line: { merchandiseId: string; quantity: number; sellingPlanId?: string } = {
    merchandiseId,
    quantity,
  };
  if (sellingPlanId) line.sellingPlanId = sellingPlanId;

  try {
    await updateCart(
      { lines: [line] },
      {
        signal: AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
        ...(eventDetail && { event: { detail: eventDetail } }),
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    throw error;
  }
}

async function submitLineMutation(
  store: CartStoreContext,
  updateCart: UpdateCartFn,
  intent: string,
  lineId: string,
  explicitQuantity?: number,
): Promise<void> {
  const line = getLines(store.observable.state.data).find((l) => l.id === lineId);
  const currentQuantity = line?.quantity ?? 0;

  let newQuantity: number;
  if (intent === "set" && explicitQuantity !== undefined) {
    if (explicitQuantity <= 0) {
      newQuantity = 0;
    } else {
      const maxQuantity = line?.merchandise?.quantityAvailable ?? undefined;
      newQuantity = sanitizeQuantity(explicitQuantity, {
        min: DEFAULT_MINIMUM_QUANTITY,
        max: maxQuantity,
      });
    }
  } else if (intent === "remove") {
    newQuantity = 0;
  } else {
    newQuantity = intent === "increase" ? currentQuantity + 1 : Math.max(0, currentQuantity - 1);
  }

  store.lineControllers.get(lineId)?.abort();
  const controller = new AbortController();
  store.lineControllers.set(lineId, controller);

  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
  ]);

  try {
    await updateCart({ lines: [{ id: lineId, quantity: newQuantity }] }, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    if (extractCartActionFailure(error)) throw error;
    writeNetworkError(store, error);
    throw error;
  }
}

async function submitDiscountMutation(
  store: CartStoreContext,
  updateCart: UpdateCartFn,
  intent: string,
  discountCode: string,
): Promise<void> {
  const current = store.observable.state;

  const newDiscountCodes =
    intent === "discount-apply"
      ? [...current.data.discountCodes.map((c) => c.code), discountCode]
      : current.data.discountCodes.filter((c) => c.code !== discountCode).map((c) => c.code);

  store.discountController?.abort();
  const controller = new AbortController();
  store.discountController = controller;

  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
  ]);

  try {
    await updateCart({ discountCodes: newDiscountCodes }, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    if (extractCartActionFailure(error)) throw error;
    writeNetworkError(store, error);
    throw error;
  }
}

async function submitNoteMutation(
  store: CartStoreContext,
  updateCart: UpdateCartFn,
  note: string,
): Promise<void> {
  store.noteController?.abort();
  const controller = new AbortController();
  store.noteController = controller;

  const signal = AbortSignal.any([
    controller.signal,
    AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
  ]);

  try {
    await updateCart({ note }, { signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    if (extractCartActionFailure(error)) throw error;
    writeNetworkError(store, error);
    throw error;
  }
}
