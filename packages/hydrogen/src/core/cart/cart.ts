import type {
  CartActionError,
  ShopifyStandardActions,
  UpdateCartOptions,
  UpdateCartPayload,
  UpdateCartResult,
} from "../../../vendor/standard-actions";
import type {
  CartDiscountUpdateEvent,
  CartDiscountUpdateResult,
  CartLinesUpdateEvent,
  CartLinesUpdateResult,
  CartNoteUpdateEvent,
  CartNoteUpdateResult,
} from "../../../vendor/standard-events";
import type { CartErrorCode, CartWarningCode } from "../../graphql/generated/storefront-api-types";
import { getLogger } from "../logging";
import { createObservable } from "../observable";
import {
  SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT,
  VISITOR_CONSENT_COLLECTED_EVENT,
} from "../shopify-scripts/index";
import { DEFAULT_MINIMUM_QUANTITY, sanitizeQuantity } from "./quantity";
import type {
  CartCost,
  CartData,
  CartErrorGroup,
  CartLine,
  CartNetworkEntry,
  CartState,
  CartUserError,
  CartWarning,
} from "./state";
import { createCartState, createEmptyCartState, createEmptyErrorGroup } from "./state";
import { syncQuantityInputs } from "./sync-quantity-inputs";

const log = getLogger("cart");

interface CartResponse extends CartData {
  id: string;
  cost: CartCost;
  checkoutUrl?: string | null;
}

type CartMutationResult =
  | UpdateCartResult
  | CartLinesUpdateResult
  | CartDiscountUpdateResult
  | CartNoteUpdateResult;

type StandardEventCart = NonNullable<CartMutationResult["cart"]>;
type CartActionFailure = CartActionError["cause"];
type VendorUserError = NonNullable<CartActionFailure["userErrors"]>[number];
type VendorWarning = NonNullable<CartActionFailure["warnings"]>[number];
type KeyResult = string | string[] | undefined;
type ErrorProjector = (state: CartState, timestampMs: number) => CartState;
type AddError = (project: ErrorProjector) => void;

const OPTIMISTIC_LINE_ID_PREFIX = "optimistic:";
const LINE_KEY_PREFIX = "line:";
const MERCHANDISE_KEY_PREFIX = "merchandise:";
const DISCOUNT_KEY_PREFIX = "discount:";
const NOTE_KEY = "note";
const DISCOUNT_CODES_KEY = "discount-codes";
const DEFAULT_ADD_QUANTITY = 1;
const NOOP = () => {};

export const STANDARD_ACTION_TIMEOUT_IN_MS = 30_000;

export class CartNetworkError extends Error {
  readonly status: number;

  constructor(status: number) {
    super("Something went wrong updating your cart. Please try again.");
    this.name = "CartNetworkError";
    this.status = status;
  }
}

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

type CartInitialData<TData extends CartData = CartData> = {
  cart: TData | null;
  errors?: Array<{ message: string }>;
};

export type CreateCartStoreOptions<TData extends CartData = CartData> = {
  initialData?: CartInitialData<TData> | PromiseLike<CartInitialData<TData>>;
};

type AddLinePayload = {
  merchandiseId: string;
  quantity: number;
  sellingPlanId?: string;
};

type AddToCartPayload = {
  lines: AddLinePayload[];
  products: Array<Record<string, unknown>>;
  eventDetail?: Record<string, unknown>;
};

type ChangeLineQuantityPayload = {
  lineId: string;
  quantity: number;
};

type SetDiscountCodesPayload = {
  discountCodes: string[];
};

type SetNotePayload = {
  note: string;
};

type TransactionDefinition<TPayload> = {
  payload: TPayload;
  transport(
    payload: TPayload,
    signal: AbortSignal,
    updateCart: ShopifyStandardActions["updateCart"],
  ): Promise<UpdateCartResult>;
  projectPayload(state: CartState, payload: TPayload): CartState;
  projectPromise(
    state: CartState,
    result: CartMutationResult,
    payload: TPayload,
    addError: AddError,
  ): CartState;
  getSignalKeys?(state: CartState, payload: TPayload): KeyResult;
  getPendingKeys?(state: CartState, payload: TPayload): KeyResult;
  getErrorKeys?(state: CartState, payload: TPayload): KeyResult;
  removeSupersededPayload?(older: TPayload, successful: TPayload): TPayload | undefined;
};

function defineTransactionTypes<const TPayloads extends Record<string, unknown>>(definitions: {
  [TType in keyof TPayloads]: TransactionDefinition<TPayloads[TType]>;
}): { [TType in keyof TPayloads]: TransactionDefinition<TPayloads[TType]> } {
  return definitions;
}

type TransactionRegistry = typeof CART_TRANSACTION_TYPES;
type TransactionType = keyof TransactionRegistry;
type TransactionPayload<TType extends TransactionType> = TransactionRegistry[TType]["payload"];

function getTransactionDefinition<TType extends TransactionType>(
  type: TType,
): TransactionDefinition<TransactionPayload<TType>> {
  return CART_TRANSACTION_TYPES[type] as TransactionDefinition<TransactionPayload<TType>>;
}

type TransactionOwner = {
  controller: AbortController;
  token: object;
};

type PendingTransaction = {
  id: number;
  sequence: number;
  generation: number;
  type: TransactionType;
  payload: unknown;
  signalKeys: string[];
  pendingKeys: string[];
  errorKeys: string[];
  owner: TransactionOwner | null;
  promise: PromiseLike<CartMutationResult>;
  projectPayload(state: CartState): CartState;
  projectPromise(state: CartState, result: CartMutationResult, addError: AddError): CartState;
  trimAfter(successful: PendingTransaction): PendingTransaction | undefined;
};

type ProjectedError = {
  keys: string[];
  project(state: CartState): CartState;
};

type ActiveCartLoad = {
  state: CartState;
  promise: Promise<void>;
  resolveReadyPromise: () => void;
};

type TransactionReservation = {
  type: TransactionType;
  payload: unknown;
  signalKeys: string[];
  pendingKeys: string[];
  errorKeys: string[];
  owner: TransactionOwner | null;
  consumed: boolean;
};

type ExpectedTransactionEvent = {
  type: TransactionType;
  payload: unknown;
};

type TransactionIdentity = Pick<
  PendingTransaction,
  "id" | "sequence" | "generation" | "owner" | "signalKeys"
> & { pendingKeys?: string[]; errorKeys?: string[] };

type CartObservable = ReturnType<typeof createCartObservable>;

type CartStoreContext = {
  observable: CartObservable;
  settled: CartState;
  transactions: PendingTransaction[];
  projectedErrors: ProjectedError[];
  observedPromises: Set<PromiseLike<CartMutationResult>>;
  expectedEvents: ExpectedTransactionEvent[];
  nextTransactionId: number;
  generation: number;
  lifecycleController: AbortController;
  keyedOwners: Map<string, TransactionOwner>;
  activeCartLoad: ActiveCartLoad | null;
  cartSyncAttached: boolean;
  reservation: TransactionReservation | null;
  lastSnapshotSequence: number;
};

type CartEventHandlers = {
  lines: EventListener;
  discount: EventListener;
  note: EventListener;
};

let configuredCartEndpoint: string | null = null;
let hasConfiguredUpdateCart = false;
let standardActionsPromise: Promise<ShopifyStandardActions> | null = null;
const connectedCartStores = new Set<CartStoreContext>();
let cartConsentListenerAttached = false;

function getLines(cart: CartData): CartLine[] {
  return cart.lines.nodes;
}

function setLines<TData extends CartData>(cart: TData, lines: CartLine[]): TData {
  if (cart.lines.nodes === lines) return cart;
  return { ...cart, lines: { ...cart.lines, nodes: lines } };
}

function normalizeKeys(keys: KeyResult): string[] {
  if (keys === undefined) return [];
  return typeof keys === "string" ? [keys] : [...new Set(keys)];
}

function lineKey(lineId: string): string {
  return `${LINE_KEY_PREFIX}${lineId}`;
}

function merchandiseKey(line: Pick<AddLinePayload, "merchandiseId" | "sellingPlanId">): string {
  return `${MERCHANDISE_KEY_PREFIX}${line.merchandiseId}:${line.sellingPlanId ?? ""}`;
}

function optimisticLineId(line: Pick<AddLinePayload, "merchandiseId" | "sellingPlanId">): string {
  const sellingPlanSuffix = line.sellingPlanId ? `:${line.sellingPlanId}` : "";
  return `${OPTIMISTIC_LINE_ID_PREFIX}${line.merchandiseId}${sellingPlanSuffix}`;
}

function cartResponseFromStandardEvent(cart: StandardEventCart): CartResponse {
  const response = cart as unknown as CartResponse;
  const lines = Array.isArray(cart.lines) ? cart.lines : response.lines.nodes;
  return { ...response, lines: { ...response.lines, nodes: lines as CartLine[] } };
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function shallowEqualRecord(left: object, right: object): boolean {
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  if (leftKeys.length !== Object.keys(rightRecord).length) return false;
  return leftKeys.every((key) => Object.is(leftRecord[key], rightRecord[key]));
}

function reuseLineReferences(previous: CartLine[], next: CartLine[]): CartLine[] {
  const previousById = new Map(previous.map((line) => [line.id, line]));
  let changed = previous.length !== next.length;
  const shared = next.map((line, index) => {
    const prior = previousById.get(line.id);
    const value = prior && shallowEqualRecord(prior, line) ? prior : line;
    if (previous[index] !== value) changed = true;
    return value;
  });
  return changed ? shared : previous;
}

function sameSet<T>(left: Set<T>, right: Set<T>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function reuseVisibleReferences(previous: CartState, next: CartState): CartState {
  const lines = reuseLineReferences(getLines(previous.data), getLines(next.data));
  const dataWithLines = setLines(next.data, lines);
  const data = shallowEqualRecord(previous.data, dataWithLines) ? previous.data : dataWithLines;
  const pendingLines = sameSet(previous.pending.lines, next.pending.lines)
    ? previous.pending.lines
    : next.pending.lines;
  const pendingDiscountCodes = sameSet(previous.pending.discountCodes, next.pending.discountCodes)
    ? previous.pending.discountCodes
    : next.pending.discountCodes;
  const pending = {
    lines: pendingLines,
    note: next.pending.note,
    discountCodes: pendingDiscountCodes,
  };

  if (
    previous.data === data &&
    previous.loading === next.loading &&
    previous.errors === next.errors &&
    previous.pending.lines === pending.lines &&
    previous.pending.note === pending.note &&
    previous.pending.discountCodes === pending.discountCodes
  ) {
    return previous;
  }

  return { ...next, data, pending };
}

function derivePending(state: CartState, transactions: PendingTransaction[]): CartState["pending"] {
  const lines = new Set<string>();
  const discountCodes = new Set<string>();
  let note = false;

  for (const transaction of transactions) {
    for (const key of transaction.pendingKeys) {
      if (key === NOTE_KEY) note = true;
      if (key.startsWith(LINE_KEY_PREFIX)) lines.add(key.slice(LINE_KEY_PREFIX.length));
      if (key.startsWith(DISCOUNT_KEY_PREFIX)) {
        discountCodes.add(key.slice(DISCOUNT_KEY_PREFIX.length));
      }
      if (!key.startsWith(MERCHANDISE_KEY_PREFIX)) continue;
      const identity = key.slice(MERCHANDISE_KEY_PREFIX.length).split(":")[0];
      const line = getLines(state.data).find((candidate) => candidate.merchandise?.id === identity);
      if (line) lines.add(line.id);
    }
  }

  return { lines, note, discountCodes };
}

function projectVisibleState(store: CartStoreContext): CartState {
  let state = store.settled;
  for (const transaction of store.transactions) state = transaction.projectPayload(state);
  state = { ...state, pending: derivePending(state, store.transactions) };
  for (const error of store.projectedErrors) state = error.project(state);
  return state;
}

function publishVisibleState(store: CartStoreContext): void {
  const previous = store.observable.state;
  const next = reuseVisibleReferences(previous, projectVisibleState(store));
  if (configuredCartEndpoint && previous !== next) {
    const previousLines = new Map(getLines(previous.data).map((line) => [line.id, line]));
    const changedQuantities = getLines(next.data)
      .filter((line) => previousLines.get(line.id)?.quantity !== line.quantity)
      .map((line) => ({ id: line.id, quantity: line.quantity }));
    if (changedQuantities.length > 0) {
      syncQuantityInputs(changedQuantities, configuredCartEndpoint);
    }
  }
  store.observable.setState(next);
}

function sharesKey(left: string[], right: string[]): boolean {
  const rightKeys = new Set(right);
  return left.some((key) => rightKeys.has(key));
}

function clearProjectedErrors(store: CartStoreContext, keys: string[]): void {
  if (keys.length === 0) return;
  store.projectedErrors = store.projectedErrors.filter((error) => !sharesKey(error.keys, keys));
}

function addProjectedError(
  store: CartStoreContext,
  keys: string[],
  projector: ErrorProjector,
): void {
  const timestampMs = Date.now();
  store.projectedErrors.push({
    keys,
    project: (state) => projector(state, timestampMs),
  });
}

function createOwner(store: CartStoreContext, keys: string[]): TransactionOwner | null {
  if (keys.length === 0) return null;
  const owner = { controller: new AbortController(), token: {} };
  for (const key of keys) {
    store.keyedOwners.get(key)?.controller.abort();
    store.keyedOwners.set(key, owner);
  }
  return owner;
}

function ownsSignalKeys(store: CartStoreContext, transaction: PendingTransaction): boolean {
  if (!transaction.owner) return true;
  return transaction.signalKeys.every(
    (key) => store.keyedOwners.get(key)?.token === transaction.owner?.token,
  );
}

function releaseSignalKeys(store: CartStoreContext, transaction: PendingTransaction): void {
  if (!transaction.owner) return;
  for (const key of transaction.signalKeys) {
    if (store.keyedOwners.get(key)?.token === transaction.owner.token) {
      store.keyedOwners.delete(key);
    }
  }
}

function getErrorGroup(map: Map<string, CartErrorGroup>, key: string): CartErrorGroup {
  const existing = map.get(key);
  if (existing) return existing;
  const group = createEmptyErrorGroup();
  map.set(key, group);
  return group;
}

function toCartUserError(error: VendorUserError): CartUserError {
  return {
    code: (error.code as CartErrorCode) ?? null,
    message: error.message,
    ...(error.field ? { field: error.field } : {}),
  };
}

function toCartWarning(warning: VendorWarning): CartWarning {
  return {
    code: (warning.code as CartWarningCode) ?? ("UNKNOWN" as CartWarningCode),
    message: warning.message,
  };
}

function findFieldIndex(field: string[] | undefined, ...keys: string[]): number | undefined {
  if (!field) return undefined;
  const index = field.findIndex(
    (part, fieldIndex) => keys.includes(part) && /^\d+$/.test(field[fieldIndex + 1] ?? ""),
  );
  return index === -1 ? undefined : Number(field[index + 1]);
}

function isCartLineId(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("gid://shopify/CartLine/");
}

function groupLineErrors(
  failure: CartActionFailure | undefined,
  lineIds: string[],
): { lines: Map<string, CartErrorGroup>; cart: CartErrorGroup } {
  const lines = new Map<string, CartErrorGroup>();
  const cart = createEmptyErrorGroup();

  for (const error of failure?.userErrors ?? []) {
    const lineIndex = findFieldIndex(error.field, "lines", "lineIds");
    const lineId = lineIndex === undefined ? undefined : lineIds[lineIndex];
    const group = lineId ? getErrorGroup(lines, lineId) : cart;
    group.userErrors.push(toCartUserError(error));
  }

  for (const warning of failure?.warnings ?? []) {
    const group = isCartLineId(warning.target) ? getErrorGroup(lines, warning.target) : cart;
    group.warnings.push(toCartWarning(warning));
  }

  return { lines, cart };
}

function isDiscountWarning(code: string | undefined): boolean {
  return typeof code === "string" && code.startsWith("DISCOUNT_");
}

function addDiscountWarning(
  codes: Map<string, CartErrorGroup>,
  cart: CartErrorGroup,
  warning: VendorWarning,
  nonApplicableCodes: string[],
): void {
  if (!isDiscountWarning(warning.code) || nonApplicableCodes.length === 0) {
    cart.warnings.push(toCartWarning(warning));
    return;
  }
  for (const code of nonApplicableCodes) {
    getErrorGroup(codes, code).warnings.push(toCartWarning(warning));
  }
}

function groupDiscountErrors(
  failure: CartActionFailure | undefined,
  discountCodes: string[],
  resolvedDiscountCodes?: Array<{ code: string; applicable: boolean }>,
): { discountCodes: Map<string, CartErrorGroup>; cart: CartErrorGroup } {
  const codes = new Map<string, CartErrorGroup>();
  const cart = createEmptyErrorGroup();

  for (const error of failure?.userErrors ?? []) {
    const codeIndex = findFieldIndex(error.field, "discountCodes");
    const code = codeIndex === undefined ? undefined : discountCodes[codeIndex];
    const group = code ? getErrorGroup(codes, code) : cart;
    group.userErrors.push(toCartUserError(error));
  }

  const nonApplicableCodes =
    resolvedDiscountCodes?.filter((code) => !code.applicable).map((code) => code.code) ?? [];
  for (const warning of failure?.warnings ?? []) {
    addDiscountWarning(codes, cart, warning, nonApplicableCodes);
  }

  return { discountCodes: codes, cart };
}

function toCartErrorGroup(failure: CartActionFailure | undefined): CartErrorGroup {
  return {
    userErrors: (failure?.userErrors ?? []).map(toCartUserError),
    warnings: (failure?.warnings ?? []).map(toCartWarning),
  };
}

function extractCartActionFailure(error: unknown): CartActionFailure | undefined {
  const cause = (error as CartActionError | null)?.cause;
  return Array.isArray(cause?.userErrors) || Array.isArray(cause?.warnings) ? cause : undefined;
}

function createNetworkEntry(error: unknown): CartNetworkEntry {
  if (error instanceof CartNetworkError) {
    return { message: error.message, status: error.status };
  }
  return { message: error instanceof Error ? error.message : "Cart update failed" };
}

function mergeErrorGroups(left: CartErrorGroup, right: CartErrorGroup): CartErrorGroup {
  return {
    userErrors: [...left.userErrors, ...right.userErrors],
    warnings: [...left.warnings, ...right.warnings],
  };
}

function writeNetworkError(state: CartState, error: unknown, timestampMs: number): CartState {
  return {
    ...state,
    errors: {
      ...state.errors,
      network: [...state.errors.network, createNetworkEntry(error)],
      networkUpdatedAt: timestampMs,
      lastUpdatedAt: timestampMs,
    },
  };
}

function projectLineErrors(
  state: CartState,
  failure: CartActionFailure | undefined,
  lineIds: string[],
  timestampMs: number,
): CartState {
  if (!failure) return state;
  const grouped = groupLineErrors(failure, lineIds);
  return {
    ...state,
    errors: {
      ...state.errors,
      lines: new Map([...state.errors.lines, ...grouped.lines]),
      cart: mergeErrorGroups(state.errors.cart, grouped.cart),
      linesUpdatedAt: timestampMs,
      cartUpdatedAt: timestampMs,
      lastUpdatedAt: timestampMs,
    },
  };
}

function projectDiscountErrors(
  state: CartState,
  failure: CartActionFailure | undefined,
  discountCodes: string[],
  timestampMs: number,
  resolvedDiscountCodes?: Array<{ code: string; applicable: boolean }>,
): CartState {
  if (!failure) return state;
  const grouped = groupDiscountErrors(failure, discountCodes, resolvedDiscountCodes);
  return {
    ...state,
    errors: {
      ...state.errors,
      discountCodes: new Map([...state.errors.discountCodes, ...grouped.discountCodes]),
      cart: mergeErrorGroups(state.errors.cart, grouped.cart),
      discountCodesUpdatedAt: timestampMs,
      cartUpdatedAt: timestampMs,
      lastUpdatedAt: timestampMs,
    },
  };
}

function projectNoteErrors(
  state: CartState,
  failure: CartActionFailure | undefined,
  timestampMs: number,
): CartState {
  if (!failure) return state;
  return {
    ...state,
    errors: {
      ...state.errors,
      note: toCartErrorGroup(failure),
      noteUpdatedAt: timestampMs,
      lastUpdatedAt: timestampMs,
    },
  };
}

function extractProductDetails(
  detail: Record<string, unknown> | undefined,
): Array<Record<string, unknown>> {
  const products = detail?.products;
  if (!Array.isArray(products)) return [];
  return products.filter(
    (product): product is Record<string, unknown> =>
      typeof product === "object" &&
      product !== null &&
      "id" in product &&
      typeof product.id === "string",
  );
}

function findLineForAddition(lines: CartLine[], addition: AddLinePayload): CartLine | undefined {
  const optimisticId = optimisticLineId(addition);
  return lines.find(
    (line) => line.merchandise?.id === addition.merchandiseId || line.id === optimisticId,
  );
}

function mergeServerLine(previous: CartLine | undefined, next: CartLine): CartLine {
  if (!previous) return next;
  const merchandise = next.merchandise
    ? { ...previous.merchandise, ...next.merchandise }
    : previous.merchandise;
  return { ...previous, ...next, ...(merchandise ? { merchandise } : {}) };
}

function hasProjectedErrors(result: CartActionFailure | undefined): boolean {
  return (result?.userErrors?.length ?? 0) > 0 || (result?.warnings?.length ?? 0) > 0;
}

export const CART_TRANSACTION_TYPES = defineTransactionTypes({
  add_to_cart: {
    payload: {} as AddToCartPayload,
    transport: (payload, signal, updateCart) =>
      updateCart(
        { lines: payload.lines },
        {
          signal,
          ...(payload.eventDetail && { event: { detail: payload.eventDetail } }),
        },
      ),
    projectPayload: (state, payload) => {
      let lines = getLines(state.data);
      let linesChanged = false;

      for (const addition of payload.lines) {
        const existing = findLineForAddition(lines, addition);
        if (existing) {
          lines = lines.map((line) =>
            line === existing ? { ...line, quantity: line.quantity + addition.quantity } : line,
          );
          linesChanged = true;
          continue;
        }

        const product = payload.products.find(
          (candidate) => candidate.id === addition.merchandiseId,
        );
        if (!product) continue;
        const { price, ...merchandise } = product;
        const amount = (price as CartLine["cost"]["totalAmount"] | undefined) ?? {
          amount: "0",
          currencyCode: "",
        };
        lines = [
          ...lines,
          {
            id: optimisticLineId(addition),
            quantity: addition.quantity,
            merchandise: merchandise as unknown as CartLine["merchandise"],
            cost: {
              totalAmount: amount,
              subtotalAmount: amount,
              amountPerQuantity: amount,
              compareAtAmountPerQuantity: null,
            },
          },
        ];
        linesChanged = true;
      }

      const addedQuantity = payload.lines.reduce((total, line) => total + line.quantity, 0);
      const data = setLines(
        { ...state.data, totalQuantity: state.data.totalQuantity + addedQuantity },
        linesChanged ? lines : getLines(state.data),
      );
      return { ...state, data };
    },
    projectPromise: (state, result, payload, addError) => {
      const currentLines = getLines(state.data);
      const lineIds = payload.lines.map(
        (addition) => findLineForAddition(currentLines, addition)?.id ?? "",
      );
      if (hasProjectedErrors(result)) {
        addError((current, timestampMs) =>
          projectLineErrors(current, result, lineIds, timestampMs),
        );
      }
      if (!result.cart) return state;

      const cart = cartResponseFromStandardEvent(result.cart);
      const previousById = new Map(currentLines.map((line) => [line.id, line]));
      const lines = getLines(cart).map((line) => {
        const previous = previousById.get(line.id);
        if (line.merchandise || previous?.merchandise || payload.products.length !== 1) {
          return mergeServerLine(previous, line);
        }
        const { price: _price, ...merchandise } = payload.products[0];
        return mergeServerLine(previous, {
          ...line,
          merchandise: merchandise as unknown as CartLine["merchandise"],
        });
      });
      return { ...state, data: setLines(state.data, lines) };
    },
    getPendingKeys: (state, payload) => {
      const keys: string[] = [];
      const lines = getLines(state.data);
      for (const addition of payload.lines) {
        keys.push(merchandiseKey(addition));
        const existing = findLineForAddition(lines, addition);
        if (existing) keys.push(lineKey(existing.id));
        if (
          !existing &&
          payload.products.some((product) => product.id === addition.merchandiseId)
        ) {
          keys.push(lineKey(optimisticLineId(addition)));
        }
      }
      return keys;
    },
    getErrorKeys: (_state, payload) => payload.lines.map(merchandiseKey),
    removeSupersededPayload: (older, successful) => {
      const successfulKeys = new Set(successful.lines.map(merchandiseKey));
      const lines = older.lines.filter((line) => !successfulKeys.has(merchandiseKey(line)));
      return lines.length > 0 ? { ...older, lines } : undefined;
    },
  },
  change_line_quantity: {
    payload: {} as ChangeLineQuantityPayload,
    transport: (payload, signal, updateCart) =>
      updateCart({ lines: [{ id: payload.lineId, quantity: payload.quantity }] }, { signal }),
    projectPayload: (state, payload) => {
      const previous = getLines(state.data);
      const existing = previous.find((line) => line.id === payload.lineId);
      if (!existing) return state;
      const lines =
        payload.quantity === 0
          ? previous.filter((line) => line.id !== payload.lineId)
          : previous.map((line) =>
              line.id === payload.lineId ? { ...line, quantity: payload.quantity } : line,
            );
      const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
      return { ...state, data: setLines({ ...state.data, totalQuantity }, lines) };
    },
    projectPromise: (state, result, payload, addError) => {
      if (hasProjectedErrors(result)) {
        addError((current, timestampMs) =>
          projectLineErrors(current, result, [payload.lineId], timestampMs),
        );
      }
      if (!result.cart) return state;

      const cart = cartResponseFromStandardEvent(result.cart);
      const serverLines = getLines(cart);
      const matching = serverLines.find((line) => line.id === payload.lineId);
      const previous = getLines(state.data);
      let lines = previous.filter((line) => line.id !== payload.lineId);
      if (matching) {
        const prior = previous.find((line) => line.id === payload.lineId);
        lines = previous.map((line) =>
          line.id === payload.lineId ? mergeServerLine(prior, matching) : line,
        );
      } else if (payload.quantity > 0 && previous.length === 1 && serverLines.length === 1) {
        lines = [mergeServerLine(previous[0], serverLines[0])];
      }
      return { ...state, data: setLines(state.data, lines) };
    },
    getSignalKeys: (_state, payload) => lineKey(payload.lineId),
  },
  set_discount_codes: {
    payload: {} as SetDiscountCodesPayload,
    transport: (payload, signal, updateCart) =>
      updateCart({ discountCodes: payload.discountCodes }, { signal }),
    projectPayload: (state, payload) => {
      const discountCodes = payload.discountCodes.map((code) => {
        const existing = state.data.discountCodes.find((discount) => discount.code === code);
        return { code, applicable: existing?.applicable ?? false };
      });
      return { ...state, data: { ...state.data, discountCodes } };
    },
    projectPromise: (state, result, payload, addError) => {
      const resolvedCodes = result.cart
        ? cartResponseFromStandardEvent(result.cart).discountCodes
        : undefined;
      if (hasProjectedErrors(result)) {
        addError((current, timestampMs) =>
          projectDiscountErrors(current, result, payload.discountCodes, timestampMs, resolvedCodes),
        );
      }
      if (!result.cart) return state;
      const cart = cartResponseFromStandardEvent(result.cart);
      return { ...state, data: { ...state.data, discountCodes: cart.discountCodes } };
    },
    getSignalKeys: () => DISCOUNT_CODES_KEY,
    getPendingKeys: (state, payload) => {
      const current = new Set(state.data.discountCodes.map((discount) => discount.code));
      const next = new Set(payload.discountCodes);
      return [...new Set([...current, ...next])]
        .filter((code) => current.has(code) !== next.has(code))
        .map((code) => `${DISCOUNT_KEY_PREFIX}${code}`);
    },
  },
  set_note: {
    payload: {} as SetNotePayload,
    transport: (payload, signal, updateCart) => updateCart({ note: payload.note }, { signal }),
    projectPayload: (state, payload) => ({
      ...state,
      data: { ...state.data, note: payload.note },
    }),
    projectPromise: (state, result, payload, addError) => {
      if (hasProjectedErrors(result)) {
        addError((current, timestampMs) => projectNoteErrors(current, result, timestampMs));
      }
      if (!result.cart) return state;
      return { ...state, data: { ...state.data, note: payload.note } };
    },
    getSignalKeys: () => NOTE_KEY,
  },
});

function getTransactionProjectionKeys<TType extends TransactionType>(
  definition: TransactionDefinition<TransactionPayload<TType>>,
  state: CartState,
  payload: TransactionPayload<TType>,
  signalKeys: string[],
): { pendingKeys: string[]; errorKeys: string[] } {
  return {
    pendingKeys: normalizeKeys(definition.getPendingKeys?.(state, payload) ?? signalKeys),
    errorKeys: normalizeKeys(definition.getErrorKeys?.(state, payload) ?? signalKeys),
  };
}

function resolveTransactionIdentity<TType extends TransactionType>(
  store: CartStoreContext,
  definition: TransactionDefinition<TransactionPayload<TType>>,
  payload: TransactionPayload<TType>,
  reservation: TransactionReservation | undefined,
  identity: TransactionIdentity | undefined,
): TransactionIdentity & { pendingKeys: string[]; errorKeys: string[] } {
  const state = store.observable.state;
  if (identity) {
    const projectedKeys = getTransactionProjectionKeys(
      definition,
      state,
      payload,
      identity.signalKeys,
    );
    const pendingKeys = identity.pendingKeys ?? projectedKeys.pendingKeys;
    const errorKeys = identity.errorKeys ?? projectedKeys.errorKeys;
    return { ...identity, pendingKeys, errorKeys };
  }
  if (reservation) {
    const id = store.nextTransactionId++;
    return { ...reservation, id, sequence: id, generation: store.generation };
  }
  const signalKeys = normalizeKeys(definition.getSignalKeys?.(state, payload));
  const { pendingKeys, errorKeys } = getTransactionProjectionKeys(
    definition,
    state,
    payload,
    signalKeys,
  );
  const id = store.nextTransactionId++;
  return {
    id,
    sequence: id,
    generation: store.generation,
    owner: createOwner(store, signalKeys),
    signalKeys,
    pendingKeys,
    errorKeys,
  };
}

function createPendingTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  definition: TransactionDefinition<TransactionPayload<TType>>,
  payload: TransactionPayload<TType>,
  promise: PromiseLike<CartMutationResult>,
  reservation?: TransactionReservation,
  identity?: TransactionIdentity,
): PendingTransaction {
  const metadata = resolveTransactionIdentity(store, definition, payload, reservation, identity);
  const { id, sequence, generation, owner, signalKeys, pendingKeys, errorKeys } = metadata;

  return {
    id,
    sequence,
    generation,
    type,
    payload,
    signalKeys,
    pendingKeys,
    errorKeys,
    owner,
    promise,
    projectPayload: (current) => definition.projectPayload(current, payload),
    projectPromise: (current, result, addError) =>
      definition.projectPromise(current, result, payload, addError),
    trimAfter: (successful) =>
      trimPendingTransaction(
        store,
        type,
        definition,
        payload,
        promise,
        { id, sequence, generation, owner, signalKeys, pendingKeys, errorKeys },
        successful,
      ),
  };
}

function trimPendingTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  definition: TransactionDefinition<TransactionPayload<TType>>,
  payload: TransactionPayload<TType>,
  promise: PromiseLike<CartMutationResult>,
  identity: TransactionIdentity,
  successful: PendingTransaction,
): PendingTransaction | undefined {
  let remaining = payload;
  let nextIdentity = identity;
  if (successful.type === type && definition.removeSupersededPayload) {
    const trimmed = definition.removeSupersededPayload(
      payload,
      successful.payload as TransactionPayload<TType>,
    );
    if (!trimmed) return undefined;
    remaining = trimmed;
    nextIdentity = { ...identity, pendingKeys: undefined, errorKeys: undefined };
  }
  return createPendingTransaction(
    store,
    type,
    definition,
    remaining,
    promise,
    undefined,
    nextIdentity,
  );
}

function addSnapshotFields(state: CartState, result: CartMutationResult): CartState {
  if (!result.cart) return state;
  const cart = cartResponseFromStandardEvent(result.cart);
  return {
    ...state,
    data: {
      ...state.data,
      id: cart.id,
      checkoutUrl: cart.checkoutUrl ?? state.data.checkoutUrl,
      totalQuantity: cart.totalQuantity,
      cost: cart.cost,
    },
  };
}

function removeTransaction(
  store: CartStoreContext,
  transactionId: number,
): PendingTransaction | null {
  const index = store.transactions.findIndex((transaction) => transaction.id === transactionId);
  if (index === -1) return null;
  const [transaction] = store.transactions.splice(index, 1);
  return transaction;
}

function trimOlderRelativeTransactions(
  store: CartStoreContext,
  successful: PendingTransaction,
): void {
  store.transactions = store.transactions.flatMap((transaction) => {
    if (transaction.sequence >= successful.sequence) return [transaction];
    const trimmed = transaction.trimAfter(successful);
    return trimmed ? [trimmed] : [];
  });
}

function fulfillTransaction(
  store: CartStoreContext,
  transactionId: number,
  result: CartMutationResult,
): void {
  const transaction = store.transactions.find((candidate) => candidate.id === transactionId);
  if (!transaction || transaction.generation !== store.generation) return;
  store.observedPromises.delete(transaction.promise);
  if (!ownsSignalKeys(store, transaction)) {
    removeTransaction(store, transactionId);
    publishVisibleState(store);
    return;
  }

  store.settled = transaction.projectPromise(store.settled, result, (projector) =>
    addProjectedError(store, transaction.errorKeys, projector),
  );
  if (result.cart && transaction.sequence >= store.lastSnapshotSequence) {
    store.settled = addSnapshotFields(store.settled, result);
    store.lastSnapshotSequence = transaction.sequence;
  }
  removeTransaction(store, transactionId);
  if (result.cart) trimOlderRelativeTransactions(store, transaction);
  releaseSignalKeys(store, transaction);
  publishVisibleState(store);
}

function rejectedResult(failure: CartActionFailure): CartMutationResult {
  return { cart: null, ...failure } as CartMutationResult;
}

function rejectTransaction(store: CartStoreContext, transactionId: number, error: unknown): void {
  const transaction = store.transactions.find((candidate) => candidate.id === transactionId);
  if (!transaction || transaction.generation !== store.generation) return;
  store.observedPromises.delete(transaction.promise);
  const owned = ownsSignalKeys(store, transaction);
  removeTransaction(store, transactionId);
  releaseSignalKeys(store, transaction);

  if (owned) {
    const failure = extractCartActionFailure(error);
    if (failure) {
      transaction.projectPromise(store.settled, rejectedResult(failure), (projector) =>
        addProjectedError(store, transaction.errorKeys, projector),
      );
    }
    if (!failure && !isAbortError(error)) {
      addProjectedError(store, transaction.errorKeys, (state, timestampMs) =>
        writeNetworkError(state, error, timestampMs),
      );
    }
  }
  publishVisibleState(store);
}

function transactionPayloadsMatch(
  type: TransactionType,
  expected: unknown,
  actual: unknown,
): boolean {
  if (type === "add_to_cart") {
    const left = expected as AddToCartPayload;
    const right = actual as AddToCartPayload;
    return (
      left.lines.length === right.lines.length &&
      left.lines.every((line, index) => {
        const candidate = right.lines[index];
        return (
          line.merchandiseId === candidate?.merchandiseId &&
          line.quantity === candidate.quantity &&
          line.sellingPlanId === candidate.sellingPlanId
        );
      })
    );
  }
  if (type === "change_line_quantity") {
    const left = expected as ChangeLineQuantityPayload;
    const right = actual as ChangeLineQuantityPayload;
    return left.lineId === right.lineId && left.quantity === right.quantity;
  }
  if (type === "set_discount_codes") {
    const left = expected as SetDiscountCodesPayload;
    const right = actual as SetDiscountCodesPayload;
    return (
      left.discountCodes.length === right.discountCodes.length &&
      left.discountCodes.every((code, index) => code === right.discountCodes[index])
    );
  }
  const left = expected as SetNotePayload;
  const right = actual as SetNotePayload;
  return left.note === right.note;
}

function enqueueTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  payload: TransactionPayload<TType>,
  promise: PromiseLike<CartMutationResult>,
  reservedTransaction?: TransactionReservation,
): void {
  const expectedEventIndex = store.expectedEvents.findIndex(
    (expected) =>
      expected.type === type && transactionPayloadsMatch(type, expected.payload, payload),
  );
  if (expectedEventIndex !== -1) {
    store.expectedEvents.splice(expectedEventIndex, 1);
    return;
  }
  if (store.observedPromises.has(promise)) return;
  store.observedPromises.add(promise);
  const activeReservation = store.reservation?.type === type ? store.reservation : undefined;
  const reservation = reservedTransaction ?? activeReservation;
  if (reservation) reservation.consumed = true;
  const transaction = createPendingTransaction(
    store,
    type,
    getTransactionDefinition(type),
    reservation ? (reservation.payload as TransactionPayload<TType>) : payload,
    promise,
    reservation,
  );
  clearProjectedErrors(store, transaction.errorKeys);
  store.transactions.push(transaction);
  publishVisibleState(store);
  promise.then(
    (result) => fulfillTransaction(store, transaction.id, result),
    (error: unknown) => rejectTransaction(store, transaction.id, error),
  );
}

function reserveTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  payload: TransactionPayload<TType>,
): TransactionReservation {
  const definition = getTransactionDefinition(type);
  const state = store.observable.state;
  const signalKeys = normalizeKeys(definition.getSignalKeys?.(state, payload));
  const pendingKeys = normalizeKeys(definition.getPendingKeys?.(state, payload) ?? signalKeys);
  const errorKeys = normalizeKeys(definition.getErrorKeys?.(state, payload) ?? signalKeys);
  clearProjectedErrors(store, errorKeys);
  return {
    type,
    payload,
    signalKeys,
    pendingKeys,
    errorKeys,
    owner: createOwner(store, signalKeys),
    consumed: false,
  };
}

function createTransactionSignal(
  store: CartStoreContext,
  reservation: TransactionReservation,
): AbortSignal {
  const signals = [
    store.lifecycleController.signal,
    AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS),
  ];
  if (reservation.owner) signals.push(reservation.owner.controller.signal);
  return AbortSignal.any(signals);
}

async function dispatchTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  payload: TransactionPayload<TType>,
): Promise<void> {
  const { updateCart } = await getShopifyStandardActions();
  const reservation = reserveTransaction(store, type, payload);
  store.reservation = reservation;
  const signal = createTransactionSignal(store, reservation);
  let promise: Promise<UpdateCartResult>;

  try {
    promise = getTransactionDefinition(type).transport(payload, signal, updateCart);
  } finally {
    store.reservation = null;
  }

  if (!reservation.consumed) {
    enqueueTransaction(store, type, payload, promise, reservation);
    store.expectedEvents.push({ type, payload });
  }

  try {
    await promise;
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function payloadFromAddEvent(event: CartLinesUpdateEvent): AddToCartPayload {
  return {
    lines: event.lines as AddLinePayload[],
    products: extractProductDetails(event.detail),
    ...(event.detail ? { eventDetail: event.detail } : {}),
  };
}

function handleLinesEvent(store: CartStoreContext, event: CartLinesUpdateEvent): void {
  if (event.action === "add") {
    enqueueTransaction(store, "add_to_cart", payloadFromAddEvent(event), event.promise);
    return;
  }
  if (event.lines.length !== 1) return;
  const line = event.lines[0] as { id: string; quantity: number };
  enqueueTransaction(
    store,
    "change_line_quantity",
    { lineId: line.id, quantity: line.quantity },
    event.promise,
  );
}

function handleDiscountEvent(store: CartStoreContext, event: CartDiscountUpdateEvent): void {
  enqueueTransaction(
    store,
    "set_discount_codes",
    { discountCodes: event.discountCodes.map((discount) => discount.code) },
    event.promise,
  );
}

function handleNoteEvent(store: CartStoreContext, event: CartNoteUpdateEvent): void {
  enqueueTransaction(store, "set_note", { note: event.note }, event.promise);
}

function connectCartStore(store: CartStoreContext, handlers: CartEventHandlers): boolean {
  if (typeof document === "undefined") return false;
  if (store.lifecycleController.signal.aborted) store.lifecycleController = new AbortController();
  if (store.cartSyncAttached) return true;
  store.cartSyncAttached = true;
  connectedCartStores.add(store);
  attachCartConsentListener();
  document.addEventListener("shopify:cart:lines-update", handlers.lines);
  document.addEventListener("shopify:cart:discount-update", handlers.discount);
  document.addEventListener("shopify:cart:note-update", handlers.note);
  void getShopifyStandardActions().catch(() => {});
  return true;
}

function clearPendingTransactions(store: CartStoreContext): void {
  store.generation += 1;
  store.lifecycleController.abort();
  store.lifecycleController = new AbortController();
  for (const owner of new Set(store.keyedOwners.values())) owner.controller.abort();
  store.keyedOwners.clear();
  store.transactions = [];
  store.projectedErrors = [];
  store.observedPromises.clear();
  store.expectedEvents = [];
  store.reservation = null;
}

function destroyCartStore(store: CartStoreContext, handlers: CartEventHandlers): void {
  clearPendingTransactions(store);
  if (typeof document !== "undefined" && store.cartSyncAttached) {
    document.removeEventListener("shopify:cart:lines-update", handlers.lines);
    document.removeEventListener("shopify:cart:discount-update", handlers.discount);
    document.removeEventListener("shopify:cart:note-update", handlers.note);
  }
  connectedCartStores.delete(store);
  detachCartConsentListenerIfIdle();
  store.cartSyncAttached = false;
  publishVisibleState(store);
}

function handleVisitorConsentCollected(): void {
  revalidateConnectedCartCheckoutUrls();
}

function attachCartConsentListener(): void {
  if (cartConsentListenerAttached) return;
  document.addEventListener(VISITOR_CONSENT_COLLECTED_EVENT, handleVisitorConsentCollected);
  cartConsentListenerAttached = true;
}

function detachCartConsentListenerIfIdle(): void {
  if (!cartConsentListenerAttached || connectedCartStores.size > 0) return;
  document.removeEventListener(VISITOR_CONSENT_COLLECTED_EVENT, handleVisitorConsentCollected);
  cartConsentListenerAttached = false;
}

function createCartObservable(initialState: CartState, onReadyPromiseRemoved: () => void) {
  const observable = createObservable<CartState>(initialState);

  return {
    get state() {
      return observable.state;
    },
    subscribe: observable.subscribe,
    setState(next: CartState | ((prev: CartState) => CartState)): void {
      observable.setState((prev) => {
        const nextState = typeof next === "function" ? next(prev) : next;
        if (Object.is(nextState, prev)) return prev;
        if (prev.readyPromise) onReadyPromiseRemoved();
        return withoutReadyPromise(nextState);
      });
    },
    setReadyState(next: CartState): void {
      observable.setState(next);
    },
    clearReadyState(): void {
      observable.setState(withoutReadyPromise(observable.state));
    },
  };
}

function withoutReadyPromise(state: CartState): CartState {
  if (!state.readyPromise) return state;
  const nextState = { ...state, loading: false };
  delete nextState.readyPromise;
  return nextState;
}

function invalidateActiveCartLoad(store: CartStoreContext): void {
  const activeCartLoad = store.activeCartLoad;
  if (!activeCartLoad) return;
  store.activeCartLoad = null;
  activeCartLoad.resolveReadyPromise();
}

function hydrateCartInStore(store: CartStoreContext, data: CartData): void {
  const current = store.observable.state;
  invalidateActiveCartLoad(store);
  if (current.data.id !== null && current.data.id === data.id) {
    store.observable.clearReadyState();
    return;
  }
  if (store.transactions.length > 0) {
    store.observable.clearReadyState();
    return;
  }
  store.settled = createCartState(data);
  store.projectedErrors = [];
  publishVisibleState(store);
}

function resetCartStore(store: CartStoreContext): void {
  clearPendingTransactions(store);
  invalidateActiveCartLoad(store);
  store.lastSnapshotSequence = 0;
  store.settled = createEmptyCartState();
  publishVisibleState(store);

  if (store.cartSyncAttached) {
    loadCartInStore(store).catch((error: unknown) =>
      log.error("cart reset load failed", { error }),
    );
  }
}

function isCurrentCartLoad(store: CartStoreContext, request: ActiveCartLoad): boolean {
  return store.activeCartLoad === request && store.observable.state === request.state;
}

function loadCartInStore(
  store: CartStoreContext,
  cartPromise?: PromiseLike<CartData | null>,
): Promise<void> {
  const existing = store.activeCartLoad;
  if (existing?.state === store.observable.state) return existing.promise;

  invalidateActiveCartLoad(store);

  let resolveReadyPromise = NOOP;
  const readyPromise = new Promise<void>((resolve) => {
    resolveReadyPromise = resolve;
  });
  let request: ActiveCartLoad;
  const state = { ...store.observable.state, readyPromise };
  const promise = Promise.resolve(cartPromise ?? fetchCartData(state.data.id))
    .then((data) => {
      if (!isCurrentCartLoad(store, request)) return;
      if (data) hydrateCartInStore(store, data);
      if (!data) {
        store.settled = { ...store.settled, loading: false };
        publishVisibleState(store);
      }
    })
    .catch((error) => {
      if (isCurrentCartLoad(store, request)) {
        store.settled = { ...store.settled, loading: false };
        publishVisibleState(store);
      }
      throw error;
    })
    .finally(() => {
      if (store.activeCartLoad === request) store.activeCartLoad = null;
      request.resolveReadyPromise();
    });
  request = { state, promise, resolveReadyPromise };
  store.activeCartLoad = request;
  store.observable.setReadyState(state);
  return promise;
}

export function createCartStore<TData extends CartData = CartData>(
  options: CreateCartStoreOptions<TData> = {},
): CartStore {
  const initialData = options.initialData;
  const asyncInitialData = isPromiseLike<CartInitialData<TData>>(initialData);
  const syncInitialData = initialData !== undefined && !asyncInitialData;
  const initialCart = syncInitialData ? initialData.cart : null;
  const settled = initialCart
    ? createCartState(initialCart)
    : syncInitialData
      ? createEmptyCartState({ loading: false })
      : createEmptyCartState();
  let context: CartStoreContext | null = null;
  const observable = createCartObservable(settled, () => {
    if (context) invalidateActiveCartLoad(context);
  });
  const store: CartStoreContext = {
    observable,
    settled,
    transactions: [],
    projectedErrors: [],
    observedPromises: new Set(),
    expectedEvents: [],
    nextTransactionId: 1,
    generation: 0,
    lifecycleController: new AbortController(),
    keyedOwners: new Map(),
    activeCartLoad: null,
    cartSyncAttached: false,
    reservation: null,
    lastSnapshotSequence: 0,
  };
  context = store;
  const handlers: CartEventHandlers = {
    lines: ((event: Event) =>
      handleLinesEvent(store, event as CartLinesUpdateEvent)) as EventListener,
    discount: ((event: Event) =>
      handleDiscountEvent(store, event as CartDiscountUpdateEvent)) as EventListener,
    note: ((event: Event) => handleNoteEvent(store, event as CartNoteUpdateEvent)) as EventListener,
  };
  let initialCartLoadStarted = syncInitialData;

  return {
    connect: () => {
      const connected = connectCartStore(store, handlers);
      if (!connected || initialCartLoadStarted) return;
      initialCartLoadStarted = true;
      loadCartInStore(
        store,
        asyncInitialData ? Promise.resolve(initialData).then((data) => data.cart) : undefined,
      ).catch((error: unknown) => log.error("cart initial load failed", { error }));
    },
    destroy: () => destroyCartStore(store, handlers),
    hydrate: (data) => hydrateCartInStore(store, data),
    getState: () => store.observable.state,
    subscribe: (listener) => store.observable.subscribe(listener),
    fetch: () => loadCartInStore(store),
    reset: () => resetCartStore(store),
    handleFormSubmit: (event, eventDetail) =>
      handleFormSubmitInStore(store, handlers, event, eventDetail),
  };
}

const LINE_INTENTS = new Set(["increase", "decrease", "remove", "set"]);
const DISCOUNT_INTENTS = new Set(["discount-apply", "discount-remove"]);

function requireFormEvent(event: SubmitEvent): {
  form: HTMLFormElement;
  submitter: HTMLElement;
} {
  if (!(event.target instanceof HTMLFormElement)) {
    throw new TypeError(`Expected event.target to be an HTMLFormElement, got ${event.target}`);
  }
  if (!(event.submitter instanceof HTMLElement)) {
    throw new TypeError(`Expected event.submitter to be an HTMLElement, got ${event.submitter}`);
  }
  return { form: event.target, submitter: event.submitter };
}

function getLineQuantityPayload(
  state: CartState,
  intent: string,
  lineId: string,
  formData: FormData,
): ChangeLineQuantityPayload {
  const line = getLines(state.data).find((candidate) => candidate.id === lineId);
  const currentQuantity = line?.quantity ?? 0;
  if (intent === "remove") return { lineId, quantity: 0 };
  if (intent === "increase") return { lineId, quantity: currentQuantity + 1 };
  if (intent === "decrease") return { lineId, quantity: Math.max(0, currentQuantity - 1) };

  const rawQuantity = Number(formData.get("quantity"));
  const explicitQuantity = Number.isNaN(rawQuantity) ? DEFAULT_MINIMUM_QUANTITY : rawQuantity;
  if (explicitQuantity <= 0) return { lineId, quantity: 0 };
  const maxQuantity = line?.merchandise?.quantityAvailable ?? undefined;
  return {
    lineId,
    quantity: sanitizeQuantity(explicitQuantity, {
      min: DEFAULT_MINIMUM_QUANTITY,
      max: maxQuantity,
    }),
  };
}

function getAddPayload(
  formData: FormData,
  eventDetail?: Record<string, unknown>,
): AddToCartPayload {
  const merchandiseId = formData.get("merchandiseId") as string | null;
  if (!merchandiseId) throw new Error('Add intent requires a "merchandiseId" field.');
  const rawQuantity = Number.parseInt(formData.get("quantity") as string, 10);
  const quantity = Number.isNaN(rawQuantity)
    ? DEFAULT_ADD_QUANTITY
    : Math.max(DEFAULT_ADD_QUANTITY, rawQuantity);
  const rawSellingPlanId = formData.get("sellingPlanId") as string | null;
  const sellingPlanId = rawSellingPlanId || undefined;
  return {
    lines: [{ merchandiseId, quantity, ...(sellingPlanId ? { sellingPlanId } : {}) }],
    products: extractProductDetails(eventDetail),
    ...(eventDetail ? { eventDetail } : {}),
  };
}

function submitLineIntent(
  store: CartStoreContext,
  intent: string,
  formData: FormData,
): Promise<void> {
  const lineId = formData.get("lineId") as string | null;
  if (!lineId) throw new Error('Missing "lineId" in form data');
  const payload = getLineQuantityPayload(store.observable.state, intent, lineId, formData);
  return dispatchTransaction(store, "change_line_quantity", payload);
}

function submitDiscountIntent(
  store: CartStoreContext,
  intent: string,
  formData: FormData,
): Promise<void> {
  const code = (formData.get("discountCode") as string) ?? "";
  const currentCodes = store.observable.state.data.discountCodes.map((discount) => discount.code);
  const discountCodes =
    intent === "discount-apply"
      ? [...currentCodes, code]
      : currentCodes.filter((current) => current !== code);
  return dispatchTransaction(store, "set_discount_codes", { discountCodes });
}

async function handleFormSubmitInStore(
  store: CartStoreContext,
  handlers: CartEventHandlers,
  event: SubmitEvent,
  eventDetail?: Record<string, unknown>,
): Promise<void> {
  const { form, submitter } = requireFormEvent(event);
  connectCartStore(store, handlers);
  const intent = submitter.getAttribute("value") ?? "";
  const formData = new FormData(form);

  if (intent === "add" || (!intent && formData.has("merchandiseId"))) {
    return dispatchTransaction(store, "add_to_cart", getAddPayload(formData, eventDetail));
  }
  if (LINE_INTENTS.has(intent)) return submitLineIntent(store, intent, formData);
  if (DISCOUNT_INTENTS.has(intent)) return submitDiscountIntent(store, intent, formData);
  if (intent === "note-update") {
    const note = (formData.get("note") as string) ?? "";
    return dispatchTransaction(store, "set_note", { note });
  }
  throw new Error(`Unknown cart form intent: "${intent}"`);
}

export function configureCartEndpoint(endpoint: string): void {
  if (configuredCartEndpoint === endpoint) return;
  if (configuredCartEndpoint !== null) {
    log.warn(
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

function configureUpdateCartOnce(actions: ShopifyStandardActions): void {
  if (hasConfiguredUpdateCart) return;
  const configured = actions.updateCart.configure({
    eventTarget: () => document,
    handler: (defaultHandler, payload, options) => {
      if (!configuredCartEndpoint || !payload) return defaultHandler();
      return postCartUpdateToEndpoint(configuredCartEndpoint, payload, options);
    },
  });
  if (configured === false) {
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
      const actions = typeof window === "undefined" ? undefined : window.Shopify?.actions;
      if (actions?.updateCart) {
        configureUpdateCartOnce(actions);
        resolve(actions);
        return;
      }
      const message = hasShopifyStandardActionsScript()
        ? "Standard Actions not available. Ensure the Shopify script tag has loaded before calling cart actions."
        : `Standard Actions not available. Add ShopifyScripts to your document head or include ${SHOPIFY_STOREFRONT_STANDARD_ACTIONS_SCRIPT} before calling cart actions.`;
      reject(new Error(message));
    };

    if (typeof document !== "undefined" && document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", configure, { once: true });
      return;
    }
    configure();
  }).catch((error) => {
    standardActionsPromise = null;
    throw error;
  }));
}

/** @internal */
export function resetStandardActionsForTests(): void {
  hasConfiguredUpdateCart = false;
  standardActionsPromise = null;
}

function extractNoteFromCart(cart: CartResponse): string {
  return ((cart as unknown as Record<string, unknown>).note as string) ?? "";
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
  const { cart } = await fetchCart(store.observable.state.data.id);
  const current = store.observable.state;
  if (!cart || (current.data.id && current.data.id !== cart.id)) return;
  const checkoutUrl = cart.checkoutUrl ?? null;
  if (current.data.checkoutUrl === checkoutUrl) return;
  store.settled = { ...store.settled, data: { ...store.settled.data, checkoutUrl } };
  publishVisibleState(store);
}

/** @internal */
export function revalidateConnectedCartCheckoutUrls(): void {
  if (typeof window === "undefined") return;
  for (const store of connectedCartStores) {
    const state = store.observable.state;
    if (!state.data.checkoutUrl || state.data.totalQuantity === 0) continue;
    refreshCheckoutUrl(store).catch(() => {});
  }
}
