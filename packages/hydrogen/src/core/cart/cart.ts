import type {
  CartActionError,
  ShopifyStandardActions,
  UpdateCartOptions,
  UpdateCartPayload,
  UpdateCartResult,
} from "../../../vendor/standard-actions";
import type {
  CartAttributesUpdateEvent,
  CartAttributesUpdateResult,
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
import { getCartAttributeFormEntries } from "./form";
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
  | CartAttributesUpdateResult
  | CartLinesUpdateResult
  | CartDiscountUpdateResult
  | CartNoteUpdateResult;

type StandardEventCart = NonNullable<CartMutationResult["cart"]>;
type CartActionFailure = CartActionError["cause"];
type VendorUserError = NonNullable<CartActionFailure["userErrors"]>[number];
type VendorWarning = NonNullable<CartActionFailure["warnings"]>[number];
type KeyResult = string | string[] | undefined;
type ErrorProjector = (state: CartState, timestampMs: number) => CartState;
type AddError = (project: ErrorProjector, keys?: string[]) => void;
type TransactionSettlementOptions = { mergeServerCart: boolean };
type UpdateCartTransport = (
  payload: UpdateCartPayload,
  options?: UpdateCartOptions,
) => Promise<UpdateCartResult>;

const OPTIMISTIC_LINE_ID_PREFIX = "optimistic:";
const LINE_KEY_PREFIX = "line:";
const MERCHANDISE_KEY_PREFIX = "merchandise:";
const DISCOUNT_KEY_PREFIX = "discount:";
const NOTE_KEY = "note";
const ATTRIBUTES_KEY = "attributes";
const DISCOUNT_CODES_KEY = "discount-codes";
const REVALIDATION_ERROR_KEY = "cart-revalidation";
const TRANSACTION_EVENT_TOKEN_KEY = "__shopifyHydrogenCartTransaction";
const DEFAULT_ADD_QUANTITY = 1;
const NOOP = () => {};
const EMPTY_QUANTITY = 0;
const FNV1A_OFFSET_BASIS = 0x811c9dc5;
const FNV1A_PRIME = 0x01000193;
const CART_REVALIDATION_ERROR_MESSAGE =
  "Something went wrong refreshing your cart. Please try again.";

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
  attributes?: AddLineAttribute[];
  sellingPlanId?: string;
};
type AddLineIdentity = Pick<AddLinePayload, "merchandiseId" | "attributes" | "sellingPlanId">;
type AddLineAttribute = { key: string; value: string };
type LineAttribute = { key: string; value: string | null };

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

type SetAttributesPayload = {
  attributes: Array<{ key: string; value: string }>;
};

type TransactionDefinition<TPayload> = {
  payload: TPayload;
  transport(
    payload: TPayload,
    signal: AbortSignal,
    updateCart: UpdateCartTransport,
  ): Promise<UpdateCartResult>;
  projectPayload(state: CartState, payload: TPayload): CartState;
  projectPromise(
    state: CartState,
    result: CartMutationResult,
    payload: TPayload,
    addError: AddError,
    options: TransactionSettlementOptions,
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
  requiresRevalidation: boolean;
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

type ActiveCartRevalidation = {
  cartId: string;
  controller: AbortController;
  generation: number;
  mutationRevision: number;
  promise: Promise<void>;
};

type CartRevalidation = {
  requested: boolean;
  active: ActiveCartRevalidation | null;
  visible: boolean;
};

type DeferredCartMutation = {
  promise: Promise<CartMutationResult>;
  resolve(result: CartMutationResult): void;
  reject(error: unknown): void;
};

type QueuedInitialAdd = {
  deferred: DeferredCartMutation;
  generation: number;
  payload: AddToCartPayload;
  reservation: TransactionReservation;
  signal: AbortSignal;
};

type CartIdentityTransportGate = {
  active: QueuedInitialAdd | null;
  waiting: QueuedInitialAdd[];
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
  token: string;
};

type TransactionIdentity = Pick<
  PendingTransaction,
  "id" | "sequence" | "generation" | "owner" | "signalKeys" | "requiresRevalidation"
> & { pendingKeys?: string[]; errorKeys?: string[] };

type CartObservable = ReturnType<typeof createCartObservable>;

type CartStoreContext = {
  observable: CartObservable;
  settled: CartState;
  transactions: PendingTransaction[];
  projectedErrors: ProjectedError[];
  observedPromises: Set<PromiseLike<CartMutationResult>>;
  activeMutationTransports: Set<PromiseLike<CartMutationResult>>;
  expectedEvents: ExpectedTransactionEvent[];
  nextTransactionId: number;
  generation: number;
  lifecycleController: AbortController;
  keyedOwners: Map<string, TransactionOwner>;
  activeCartLoad: ActiveCartLoad | null;
  revalidation: CartRevalidation;
  mutationRevision: number;
  identityTransportGate: CartIdentityTransportGate;
  cartSyncAttached: boolean;
  reservation: TransactionReservation | null;
  lastSnapshotSequence: number;
};

type CartEventHandlers = {
  lines: EventListener;
  discount: EventListener;
  note: EventListener;
  attributes: EventListener;
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

function reconcileCartLines<TData extends CartData>(cart: TData, lines: CartLine[]): TData {
  const currentLines = getLines(cart);
  if (currentLines === lines) return cart;

  // Preserve quantities outside the loaded lines connection by applying only its visible delta.
  const currentLoadedQuantity = currentLines.reduce(
    (total, line) => total + line.quantity,
    EMPTY_QUANTITY,
  );
  const nextLoadedQuantity = lines.reduce((total, line) => total + line.quantity, EMPTY_QUANTITY);
  const totalQuantity = cart.totalQuantity + nextLoadedQuantity - currentLoadedQuantity;
  return setLines({ ...cart, totalQuantity }, lines);
}

function normalizeKeys(keys: KeyResult): string[] {
  if (keys === undefined) return [];
  return typeof keys === "string" ? [keys] : [...new Set(keys)];
}

function lineKey(lineId: string): string {
  return `${LINE_KEY_PREFIX}${lineId}`;
}

function compareAttributes(left: LineAttribute, right: LineAttribute): number {
  if (left.key !== right.key) return left.key < right.key ? -1 : 1;
  if (left.value === null) return right.value === null ? 0 : -1;
  if (right.value === null) return 1;
  if (left.value !== right.value) return left.value < right.value ? -1 : 1;
  return 0;
}

function normalizeAttributes<TAttribute extends LineAttribute>(
  attributes: readonly TAttribute[] | undefined,
): TAttribute[] {
  if (!attributes?.length) return [];
  return attributes.toSorted(compareAttributes);
}

function sameAttributes(
  left: readonly LineAttribute[] | undefined,
  right: readonly LineAttribute[] | undefined,
): boolean {
  const normalizedLeft = normalizeAttributes(left);
  const normalizedRight = normalizeAttributes(right);
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every(
    (attribute, index) =>
      attribute.key === normalizedRight[index].key &&
      attribute.value === normalizedRight[index].value,
  );
}

function hashString(value: string): string {
  let hash = FNV1A_OFFSET_BASIS;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, FNV1A_PRIME);
  }
  return (hash >>> 0).toString(36);
}

function merchandiseKey(line: AddLineIdentity): string {
  return `${MERCHANDISE_KEY_PREFIX}${JSON.stringify({
    merchandiseId: line.merchandiseId,
    sellingPlanId: line.sellingPlanId ?? null,
    attributes: normalizeAttributes(line.attributes),
  })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAttribute(value: unknown): value is AddLineAttribute {
  return isRecord(value) && typeof value.key === "string" && typeof value.value === "string";
}

function parseMerchandiseKey(key: string): AddLineIdentity | undefined {
  if (!key.startsWith(MERCHANDISE_KEY_PREFIX)) return undefined;
  const value = key.slice(MERCHANDISE_KEY_PREFIX.length);
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }

  if (!isRecord(parsed) || typeof parsed.merchandiseId !== "string") return undefined;
  if (parsed.sellingPlanId !== null && typeof parsed.sellingPlanId !== "string") return undefined;
  if (!Array.isArray(parsed.attributes) || !parsed.attributes.every(isAttribute)) return undefined;
  const attributes = normalizeAttributes(parsed.attributes);
  return {
    merchandiseId: parsed.merchandiseId,
    ...(parsed.sellingPlanId ? { sellingPlanId: parsed.sellingPlanId } : {}),
    ...(attributes.length > 0 ? { attributes } : {}),
  };
}

function optimisticLineId(line: AddLineIdentity): string {
  const sellingPlanSuffix = line.sellingPlanId ? `:${line.sellingPlanId}` : "";
  const attributes = normalizeAttributes(line.attributes);
  const attributesSuffix =
    attributes.length > 0 ? `:${hashString(JSON.stringify(attributes))}` : "";
  return `${OPTIMISTIC_LINE_ID_PREFIX}${line.merchandiseId}${sellingPlanSuffix}${attributesSuffix}`;
}

function cartResponseFromStandardEvent(cart: StandardEventCart): CartResponse {
  const response = cart as unknown as CartResponse;
  const lines = Array.isArray(cart.lines) ? cart.lines : response.lines.nodes;
  const connection = Array.isArray(cart.lines)
    ? { nodes: lines as CartLine[] }
    : { ...response.lines, nodes: lines as CartLine[] };
  return { ...response, lines: connection };
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
  const nextPending = {
    lines: pendingLines,
    note: next.pending.note,
    attributes: next.pending.attributes,
    discountCodes: pendingDiscountCodes,
    cost: next.pending.cost,
  };
  const pending = shallowEqualRecord(previous.pending, nextPending)
    ? previous.pending
    : nextPending;

  if (
    previous.data === data &&
    previous.loading === next.loading &&
    previous.revalidating === next.revalidating &&
    previous.errors === next.errors &&
    previous.pending === pending
  ) {
    return previous;
  }

  return { ...next, data, pending };
}

function derivePending(state: CartState, transactions: PendingTransaction[]): CartState["pending"] {
  const lines = new Set<string>();
  const discountCodes = new Set<string>();
  let note = false;
  let attributes = false;
  let cost = false;

  for (const transaction of transactions) {
    for (const key of transaction.pendingKeys) {
      if (key === NOTE_KEY) note = true;
      if (key === ATTRIBUTES_KEY) attributes = true;
      if (key.startsWith(LINE_KEY_PREFIX)) {
        lines.add(key.slice(LINE_KEY_PREFIX.length));
        cost = true;
      }
      if (key.startsWith(DISCOUNT_KEY_PREFIX)) {
        discountCodes.add(key.slice(DISCOUNT_KEY_PREFIX.length));
        cost = true;
      }
      const addition = parseMerchandiseKey(key);
      if (!addition) continue;
      const line = findLineForAddition(getLines(state.data), addition);
      if (line) lines.add(line.id);
      cost = true;
    }
  }

  return { lines, note, attributes, discountCodes, cost };
}

function projectVisibleState(store: CartStoreContext): CartState {
  let state = store.settled;
  for (const transaction of store.transactions) state = transaction.projectPayload(state);
  state = { ...state, pending: derivePending(state, store.transactions) };
  for (const error of store.projectedErrors) state = error.project(state);
  if (store.revalidation.visible) state = { ...state, revalidating: true };
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

function groupAttributeErrors(
  failure: CartActionFailure | undefined,
  attributes: CartData["attributes"],
): { attributes: Map<string, CartErrorGroup>; cart: CartErrorGroup } {
  const attributeErrors = new Map<string, CartErrorGroup>();
  const cart = createEmptyErrorGroup();

  for (const error of failure?.userErrors ?? []) {
    const attributeIndex = findFieldIndex(error.field, "attributes");
    const key = attributeIndex === undefined ? undefined : attributes[attributeIndex]?.key;
    const group = key ? getErrorGroup(attributeErrors, key) : cart;
    group.userErrors.push(toCartUserError(error));
  }
  for (const warning of failure?.warnings ?? []) cart.warnings.push(toCartWarning(warning));
  return { attributes: attributeErrors, cart };
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

function projectAttributeErrors(
  state: CartState,
  failure: CartActionFailure | undefined,
  attributes: CartData["attributes"],
  timestampMs: number,
): CartState {
  if (!failure) return state;
  const grouped = groupAttributeErrors(failure, attributes);
  return {
    ...state,
    errors: {
      ...state.errors,
      attributes: new Map([...state.errors.attributes, ...grouped.attributes]),
      cart: mergeErrorGroups(state.errors.cart, grouped.cart),
      attributesUpdatedAt: timestampMs,
      cartUpdatedAt: timestampMs,
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

function getLineSellingPlanId(line: CartLine): string | undefined {
  return line.sellingPlanAllocation?.sellingPlan.id;
}

function hasKnownLineIdentity(line: CartLine): boolean {
  return Object.hasOwn(line, "attributes") && Object.hasOwn(line, "sellingPlanAllocation");
}

function hasAdditionIdentityDetails(addition: AddLineIdentity): boolean {
  return (
    addition.sellingPlanId !== undefined || normalizeAttributes(addition.attributes).length > 0
  );
}

function lineMatchesAddition(line: CartLine, addition: AddLineIdentity): boolean {
  if (line.id === optimisticLineId(addition)) return true;
  if (line.merchandise?.id !== addition.merchandiseId) return false;
  if (!hasKnownLineIdentity(line)) return !hasAdditionIdentityDetails(addition);
  if (getLineSellingPlanId(line) !== addition.sellingPlanId) return false;
  return sameAttributes(line.attributes, addition.attributes);
}

function findLineForAddition(lines: CartLine[], addition: AddLineIdentity): CartLine | undefined {
  return lines.find((line) => lineMatchesAddition(line, addition));
}

function findAvailableLineForAddition(
  lines: CartLine[],
  addition: AddLineIdentity,
  usedLineIds: Set<string>,
): CartLine | undefined {
  return lines.find((line) => !usedLineIds.has(line.id) && lineMatchesAddition(line, addition));
}

function findResponseLineForAddition(
  serverLines: CartLine[],
  currentLines: CartLine[],
  addition: AddLineIdentity,
  usedLineIds: Set<string>,
  canInferSingleLine: boolean,
  remainingAdditions: number,
): CartLine | undefined {
  const exact = findAvailableLineForAddition(serverLines, addition, usedLineIds);
  if (exact) return exact;

  const currentLine = findLineForAddition(currentLines, addition);
  const matchingCurrentLine = serverLines.find(
    (line) => !usedLineIds.has(line.id) && line.id === currentLine?.id,
  );
  if (matchingCurrentLine) return matchingCurrentLine;

  const currentLineIds = new Set(currentLines.map((line) => line.id));
  const newLines = serverLines.filter(
    (line) => !usedLineIds.has(line.id) && !currentLineIds.has(line.id),
  );
  if (remainingAdditions === newLines.length && newLines.length === 1) return newLines[0];

  return canInferSingleLine ? serverLines.find((line) => !usedLineIds.has(line.id)) : undefined;
}

function withAdditionMerchandise(
  line: CartLine,
  addition: AddLineIdentity,
  products: Array<Record<string, unknown>>,
): CartLine {
  if (line.merchandise) return line;
  const product = products.find((candidate) => candidate.id === addition.merchandiseId);
  if (!product) return line;
  const { price: _price, ...merchandise } = product;
  return { ...line, merchandise: merchandise as unknown as CartLine["merchandise"] };
}

function replaceOrPrependLine(
  lines: CartLine[],
  previous: CartLine | undefined,
  next: CartLine,
): CartLine[] {
  if (previous) return lines.map((line) => (line === previous ? next : line));
  if (lines.some((line) => line.id === next.id)) {
    return lines.map((line) => (line.id === next.id ? next : line));
  }
  return [next, ...lines];
}

function mergeAddResponseLines(
  currentLines: CartLine[],
  serverLines: CartLine[],
  payload: AddToCartPayload,
): CartLine[] {
  let lines = currentLines;
  const usedLineIds = new Set<string>();
  const canInferSingleLine = payload.lines.length === 1 && serverLines.length === 1;

  for (const addition of payload.lines) {
    const remainingAdditions = payload.lines.length - usedLineIds.size;
    const serverLine = findResponseLineForAddition(
      serverLines,
      lines,
      addition,
      usedLineIds,
      canInferSingleLine,
      remainingAdditions,
    );
    if (!serverLine) continue;
    usedLineIds.add(serverLine.id);

    const previous =
      findLineForAddition(lines, addition) ?? lines.find((line) => line.id === serverLine.id);
    const next = withAdditionMerchandise(serverLine, addition, payload.products);
    lines = replaceOrPrependLine(lines, previous, mergeServerLine(previous, next));
  }

  return lines;
}

function resolveAddLineIds(
  currentLines: CartLine[],
  serverLines: CartLine[],
  payload: AddToCartPayload,
): string[] {
  const usedLineIds = new Set<string>();
  const canInferSingleLine = payload.lines.length === 1 && serverLines.length === 1;
  return payload.lines.map((addition) => {
    const remainingAdditions = payload.lines.length - usedLineIds.size;
    const serverLine = findResponseLineForAddition(
      serverLines,
      currentLines,
      addition,
      usedLineIds,
      canInferSingleLine,
      remainingAdditions,
    );
    if (serverLine) {
      usedLineIds.add(serverLine.id);
      return serverLine.id;
    }
    return findLineForAddition(currentLines, addition)?.id ?? "";
  });
}

function getAddErrorKeys(
  payload: AddToCartPayload,
  lineIds: string[],
  failure: CartActionFailure | undefined,
): string[] {
  const keys = new Set(payload.lines.map(merchandiseKey));
  for (const lineId of lineIds) {
    if (lineId) keys.add(lineKey(lineId));
  }
  for (const warning of failure?.warnings ?? []) {
    if (isCartLineId(warning.target)) keys.add(lineKey(warning.target));
  }
  return [...keys];
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

function transportAddToCart(
  payload: AddToCartPayload,
  signal: AbortSignal,
  updateCart: UpdateCartTransport,
  cartId?: string,
): Promise<UpdateCartResult> {
  return updateCart(
    { ...(cartId && { cartId }), lines: payload.lines },
    {
      signal,
      ...(payload.eventDetail && { event: { detail: payload.eventDetail } }),
    },
  );
}

export const CART_TRANSACTION_TYPES = defineTransactionTypes({
  add_to_cart: {
    payload: {} as AddToCartPayload,
    transport: transportAddToCart,
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
          {
            id: optimisticLineId(addition),
            quantity: addition.quantity,
            attributes: addition.attributes ?? [],
            sellingPlanAllocation: addition.sellingPlanId
              ? { sellingPlan: { id: addition.sellingPlanId } }
              : null,
            merchandise: merchandise as unknown as CartLine["merchandise"],
            cost: {
              totalAmount: amount,
              subtotalAmount: amount,
              amountPerQuantity: amount,
              compareAtAmountPerQuantity: null,
            },
          },
          ...lines,
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
      const cart = result.cart ? cartResponseFromStandardEvent(result.cart) : undefined;
      const serverLines = cart ? getLines(cart) : [];
      const lineIds = resolveAddLineIds(currentLines, serverLines, payload);
      if (hasProjectedErrors(result)) {
        addError(
          (current, timestampMs) => projectLineErrors(current, result, lineIds, timestampMs),
          getAddErrorKeys(payload, lineIds, result),
        );
      }
      if (!cart) return state;

      const lines = mergeAddResponseLines(currentLines, serverLines, payload);
      return { ...state, data: reconcileCartLines(state.data, lines) };
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
      return { ...state, data: reconcileCartLines(state.data, lines) };
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
      return { ...state, data: reconcileCartLines(state.data, lines) };
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
    projectPromise: (state, result, payload, addError, options) => {
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
      if (options.mergeServerCart) {
        return { ...state, data: mergeAuthoritativeCartData(state.data, cart) };
      }
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
  set_attributes: {
    payload: {} as SetAttributesPayload,
    transport: (payload, signal, updateCart) =>
      updateCart({ attributes: payload.attributes }, { signal }),
    projectPayload: (state, payload) => ({
      ...state,
      data: { ...state.data, attributes: payload.attributes },
    }),
    projectPromise: (state, result, payload, addError) => {
      if (hasProjectedErrors(result)) {
        addError((current, timestampMs) =>
          projectAttributeErrors(current, result, payload.attributes, timestampMs),
        );
      }
      if (!result.cart || (result.userErrors?.length ?? 0) > 0) return state;
      return { ...state, data: { ...state.data, attributes: payload.attributes } };
    },
    getSignalKeys: () => ATTRIBUTES_KEY,
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
    return {
      ...reservation,
      id,
      sequence: id,
      generation: store.generation,
      requiresRevalidation: false,
    };
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
    requiresRevalidation: false,
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
  const {
    id,
    sequence,
    generation,
    owner,
    signalKeys,
    pendingKeys,
    errorKeys,
    requiresRevalidation,
  } = metadata;

  const transaction: PendingTransaction = {
    id,
    sequence,
    generation,
    type,
    payload,
    signalKeys,
    pendingKeys,
    errorKeys,
    requiresRevalidation,
    owner,
    promise,
    projectPayload: (current) => definition.projectPayload(current, payload),
    projectPromise: (current, result, addError) =>
      definition.projectPromise(current, result, payload, addError, {
        mergeServerCart: !transaction.requiresRevalidation,
      }),
    trimAfter: (successful) =>
      trimPendingTransaction(
        store,
        type,
        definition,
        payload,
        promise,
        {
          id,
          sequence,
          generation,
          owner,
          signalKeys,
          pendingKeys,
          errorKeys,
          requiresRevalidation: transaction.requiresRevalidation,
        },
        successful,
      ),
  };
  return transaction;
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
      updatedAt: cart.updatedAt ?? state.data.updatedAt,
      totalQuantity: cart.totalQuantity,
      cost: cart.cost,
    },
  };
}

function addSnapshotIdentity(state: CartState, result: CartMutationResult): CartState {
  if (!result.cart || state.data.id) return state;
  const cart = cartResponseFromStandardEvent(result.cart);
  return { ...state, data: { ...state.data, id: cart.id } };
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
    revalidateCartWhenIdle(store);
    return;
  }

  store.settled = transaction.projectPromise(store.settled, result, (projector, keys) =>
    addProjectedError(store, keys ?? transaction.errorKeys, projector),
  );
  store.settled = addSnapshotIdentity(store.settled, result);
  if (
    result.cart &&
    !transaction.requiresRevalidation &&
    transaction.sequence >= store.lastSnapshotSequence
  ) {
    store.settled = addSnapshotFields(store.settled, result);
    store.lastSnapshotSequence = transaction.sequence;
  }
  removeTransaction(store, transactionId);
  if (result.cart) trimOlderRelativeTransactions(store, transaction);
  releaseSignalKeys(store, transaction);
  publishVisibleState(store);
  revalidateCartWhenIdle(store);
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
      transaction.projectPromise(store.settled, rejectedResult(failure), (projector, keys) =>
        addProjectedError(store, keys ?? transaction.errorKeys, projector),
      );
    }
    if (!failure && !isAbortError(error)) {
      addProjectedError(store, transaction.errorKeys, (state, timestampMs) =>
        writeNetworkError(state, error, timestampMs),
      );
    }
  }
  publishVisibleState(store);
  revalidateCartWhenIdle(store);
}

function enqueueTransaction<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  payload: TransactionPayload<TType>,
  promise: PromiseLike<CartMutationResult>,
  reservedTransaction?: TransactionReservation,
  eventToken?: string,
): void {
  const expectedEventIndex = store.expectedEvents.findIndex(
    (expected) => expected.token === eventToken,
  );
  if (expectedEventIndex !== -1) {
    store.expectedEvents.splice(expectedEventIndex, 1);
    return;
  }
  if (store.observedPromises.has(promise)) return;
  store.observedPromises.add(promise);
  const releaseObservedPromise = () => {
    store.observedPromises.delete(promise);
  };
  promise.then(releaseObservedPromise, releaseObservedPromise);
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
  store.mutationRevision += 1;
  markOverlappingTransactionForRevalidation(store, transaction);
  clearProjectedErrors(store, transaction.errorKeys);
  store.transactions.push(transaction);
  if (!reservation) observeMutationTransport(store, promise);
  publishVisibleState(store);
  promise.then(
    (result) => fulfillTransaction(store, transaction.id, result),
    (error: unknown) => rejectTransaction(store, transaction.id, error),
  );
}

function markOverlappingTransactionForRevalidation(
  store: CartStoreContext,
  transaction: PendingTransaction,
): void {
  if (
    store.transactions.length === 0 &&
    !store.revalidation.active &&
    store.activeMutationTransports.size === 0
  ) {
    return;
  }
  transaction.requiresRevalidation = true;
  for (const pending of store.transactions) pending.requiresRevalidation = true;
  store.revalidation.requested = true;
  store.revalidation.visible = true;
  store.revalidation.active?.controller.abort();
}

function observeMutationTransport(
  store: CartStoreContext,
  promise: PromiseLike<CartMutationResult>,
): void {
  if (store.activeMutationTransports.has(promise)) return;
  store.activeMutationTransports.add(promise);
  const releaseTransport = () => {
    store.activeMutationTransports.delete(promise);
    revalidateCartWhenIdle(store);
  };
  promise.then(releaseTransport, releaseTransport);
}

function createTransactionEventToken(): string {
  return crypto.randomUUID();
}

function withTransactionEventToken(
  updateCart: UpdateCartTransport,
  token: string,
): UpdateCartTransport {
  return (payload, options) =>
    updateCart(payload, {
      ...options,
      event: {
        ...options?.event,
        detail: { ...options?.event?.detail, [TRANSACTION_EVENT_TOKEN_KEY]: token },
      },
    });
}

function getTransactionEventToken(detail: Record<string, unknown> | undefined): string | undefined {
  const token = detail?.[TRANSACTION_EVENT_TOKEN_KEY];
  return typeof token === "string" ? token : undefined;
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
  if (type === "add_to_cart" && !store.observable.state.data.id) {
    return dispatchInitialCartAdd(store, payload as AddToCartPayload);
  }
  return dispatchTransactionNow(store, type, payload);
}

async function dispatchTransactionNow<TType extends TransactionType>(
  store: CartStoreContext,
  type: TType,
  payload: TransactionPayload<TType>,
): Promise<void> {
  const generation = store.generation;
  const { updateCart } = await getShopifyStandardActions();
  if (generation !== store.generation) return;
  const reservation = reserveTransaction(store, type, payload);
  store.reservation = reservation;
  const signal = createTransactionSignal(store, reservation);
  const eventToken = createTransactionEventToken();
  // Standard Events can arrive asynchronously, so the reservation keeps signal ownership alive
  // until the correlated event consumes it.
  const correlatedUpdateCart = withTransactionEventToken(updateCart, eventToken);
  let promise: Promise<UpdateCartResult>;

  try {
    promise = getTransactionDefinition(type).transport(payload, signal, correlatedUpdateCart);
  } finally {
    store.reservation = null;
  }
  if (!reservation.consumed) {
    enqueueTransaction(store, type, payload, promise, reservation);
    store.expectedEvents.push({ token: eventToken });
  }
  observeMutationTransport(store, promise);

  try {
    await promise;
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  }
}

function createDeferredCartMutation(): DeferredCartMutation {
  let resolveMutation: ((result: CartMutationResult) => void) | undefined;
  let rejectMutation: ((error: unknown) => void) | undefined;
  const promise = new Promise<CartMutationResult>((resolve, reject) => {
    resolveMutation = resolve;
    rejectMutation = reject;
  });
  return {
    promise,
    resolve: (result) => resolveMutation?.(result),
    reject: (error) => rejectMutation?.(error),
  };
}

function startQueuedInitialAdd(
  store: CartStoreContext,
  queued: QueuedInitialAdd,
  cartId?: string,
): void {
  if (queued.generation !== store.generation || queued.signal.aborted) {
    queued.deferred.reject(new DOMException("The operation was aborted.", "AbortError"));
    return;
  }

  void getShopifyStandardActions().then(({ updateCart }) => {
    if (queued.generation !== store.generation || queued.signal.aborted) {
      queued.deferred.reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const eventToken = createTransactionEventToken();
    const expectedEvent = { token: eventToken };
    store.expectedEvents.push(expectedEvent);
    let transport: Promise<UpdateCartResult>;
    try {
      transport = transportAddToCart(
        queued.payload,
        queued.signal,
        withTransactionEventToken(updateCart, eventToken),
        cartId,
      );
    } catch (error) {
      const expectedIndex = store.expectedEvents.indexOf(expectedEvent);
      if (expectedIndex !== -1) store.expectedEvents.splice(expectedIndex, 1);
      queued.deferred.reject(error);
      return;
    }
    observeMutationTransport(store, transport);
    transport.then(queued.deferred.resolve, queued.deferred.reject);
  }, queued.deferred.reject);
}

function releaseQueuedInitialAdds(store: CartStoreContext): void {
  const gate = store.identityTransportGate;
  if (gate.active || gate.waiting.length === 0) return;

  const cartId = store.settled.data.id;
  if (cartId) {
    const waiting = gate.waiting.splice(0);
    for (const queued of waiting) startQueuedInitialAdd(store, queued, cartId);
    return;
  }

  const queued = gate.waiting.shift();
  if (!queued) return;
  gate.active = queued;
  const releaseNext = () => {
    if (gate.active !== queued) return;
    gate.active = null;
    releaseQueuedInitialAdds(store);
  };
  queued.deferred.promise.then(releaseNext, releaseNext);
  startQueuedInitialAdd(store, queued, store.settled.data.id ?? undefined);
}

async function dispatchInitialCartAdd(
  store: CartStoreContext,
  payload: AddToCartPayload,
): Promise<void> {
  const gate = store.identityTransportGate;
  const deferred = createDeferredCartMutation();
  const reservation = reserveTransaction(store, "add_to_cart", payload);
  const signal = createTransactionSignal(store, reservation);
  const queued = {
    deferred,
    generation: store.generation,
    payload,
    reservation,
    signal,
  };
  enqueueTransaction(store, "add_to_cart", payload, deferred.promise, reservation);
  gate.waiting.push(queued);
  releaseQueuedInitialAdds(store);
  signal.addEventListener(
    "abort",
    () => {
      const index = gate.waiting.indexOf(queued);
      if (index === -1) return;
      gate.waiting.splice(index, 1);
      deferred.reject(new DOMException("The operation was aborted.", "AbortError"));
    },
    { once: true },
  );

  try {
    await deferred.promise;
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
  const eventToken = getTransactionEventToken(event.detail);
  if (event.action === "add") {
    enqueueTransaction(
      store,
      "add_to_cart",
      payloadFromAddEvent(event),
      event.promise,
      undefined,
      eventToken,
    );
    return;
  }
  if (event.lines.length !== 1) return;
  const line = event.lines[0] as { id: string; quantity: number };
  enqueueTransaction(
    store,
    "change_line_quantity",
    { lineId: line.id, quantity: line.quantity },
    event.promise,
    undefined,
    eventToken,
  );
}

function handleDiscountEvent(store: CartStoreContext, event: CartDiscountUpdateEvent): void {
  enqueueTransaction(
    store,
    "set_discount_codes",
    { discountCodes: event.discountCodes.map((discount) => discount.code) },
    event.promise,
    undefined,
    getTransactionEventToken(event.detail),
  );
}

function handleNoteEvent(store: CartStoreContext, event: CartNoteUpdateEvent): void {
  enqueueTransaction(
    store,
    "set_note",
    { note: event.note },
    event.promise,
    undefined,
    getTransactionEventToken(event.detail),
  );
}

function handleAttributesEvent(store: CartStoreContext, event: CartAttributesUpdateEvent): void {
  enqueueTransaction(
    store,
    "set_attributes",
    { attributes: event.attributes },
    event.promise,
    undefined,
    getTransactionEventToken(event.detail),
  );
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
  document.addEventListener("shopify:cart:attributes-update", handlers.attributes);
  void getShopifyStandardActions().catch(() => {});
  return true;
}

function cancelCartRevalidation(store: CartStoreContext): void {
  store.revalidation.active?.controller.abort();
  store.revalidation.active = null;
  store.revalidation.requested = false;
  store.revalidation.visible = false;
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
  store.activeMutationTransports.clear();
  store.expectedEvents = [];
  store.reservation = null;
  store.identityTransportGate.active = null;
  for (const queued of store.identityTransportGate.waiting) {
    queued.deferred.reject(new DOMException("The operation was aborted.", "AbortError"));
  }
  store.identityTransportGate.waiting = [];
  cancelCartRevalidation(store);
}

function destroyCartStore(store: CartStoreContext, handlers: CartEventHandlers): void {
  clearPendingTransactions(store);
  if (typeof document !== "undefined" && store.cartSyncAttached) {
    document.removeEventListener("shopify:cart:lines-update", handlers.lines);
    document.removeEventListener("shopify:cart:discount-update", handlers.discount);
    document.removeEventListener("shopify:cart:note-update", handlers.note);
    document.removeEventListener("shopify:cart:attributes-update", handlers.attributes);
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
        if (prev.readyPromise) {
          onReadyPromiseRemoved();
          return withoutReadyPromise({ ...nextState, loading: false });
        }
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

function hasLocalCartData(state: CartState): boolean {
  return (
    state.data.id !== null ||
    state.data.totalQuantity > EMPTY_QUANTITY ||
    getLines(state.data).length > 0
  );
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
  cancelCartRevalidation(store);
  store.settled = createCartState(data);
  store.projectedErrors = [];
  publishVisibleState(store);
}

function resetCartStore(store: CartStoreContext): void {
  const hadActiveCartLoad = store.activeCartLoad !== null;
  const hadActiveRevalidation = store.revalidation.active !== null;
  const shouldReloadAfterReset =
    store.cartSyncAttached &&
    !hadActiveRevalidation &&
    (hadActiveCartLoad || hasLocalCartData(store.observable.state));

  clearPendingTransactions(store);
  invalidateActiveCartLoad(store);
  cancelCartRevalidation(store);
  store.lastSnapshotSequence = 0;
  store.settled = createEmptyCartState();
  publishVisibleState(store);

  if (shouldReloadAfterReset) {
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
    activeMutationTransports: new Set(),
    expectedEvents: [],
    nextTransactionId: 1,
    generation: 0,
    lifecycleController: new AbortController(),
    keyedOwners: new Map(),
    activeCartLoad: null,
    revalidation: { requested: false, active: null, visible: false },
    mutationRevision: 0,
    identityTransportGate: { active: null, waiting: [] },
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
    attributes: ((event: Event) =>
      handleAttributesEvent(store, event as CartAttributesUpdateEvent)) as EventListener,
  };
  if (asyncInitialData) {
    loadCartInStore(
      store,
      Promise.resolve(initialData).then((data) => data.cart),
    ).catch((error: unknown) => log.error("cart initial load failed", { error }));
  }

  let initialCartLoadStarted = syncInitialData || asyncInitialData;

  return {
    connect: () => {
      const connected = connectCartStore(store, handlers);
      if (!connected || initialCartLoadStarted) return;
      initialCartLoadStarted = true;
      loadCartInStore(store).catch((error: unknown) =>
        log.error("cart initial load failed", { error }),
      );
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
  if (intent === "attributes-update") {
    const attributes = getCartAttributeFormEntries(formData).map(({ key, value }) => ({
      key,
      value: String(value),
    }));
    return dispatchTransaction(store, "set_attributes", { attributes });
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
  configuredCartEndpoint = null;
  hasConfiguredUpdateCart = false;
  standardActionsPromise = null;
}

function extractNoteFromCart(cart: CartResponse): string {
  return ((cart as unknown as Record<string, unknown>).note as string) ?? "";
}

async function fetchCart(
  cartId?: string | null,
  callerSignal?: AbortSignal,
): Promise<{ cart: CartResponse | null }> {
  const timeoutSignal = AbortSignal.timeout(STANDARD_ACTION_TIMEOUT_IN_MS);
  const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
  if (configuredCartEndpoint) {
    const response = await fetch(configuredCartEndpoint, {
      cache: "no-store",
      signal,
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
    signal,
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
          attributes: cart.attributes ?? [],
        }
      : null,
  );
}

function mergeAuthoritativeCartData(previous: CartData, authoritative: CartData): CartData {
  const previousLines = new Map(getLines(previous).map((line) => [line.id, line]));
  const lines = getLines(authoritative).map((line) =>
    mergeServerLine(previousLines.get(line.id), line),
  );
  const {
    checkoutUrl,
    cost,
    lines: authoritativeConnection,
    note,
    ...authoritativeFields
  } = authoritative;
  return {
    ...previous,
    ...authoritativeFields,
    cost: { ...previous.cost, ...cost },
    lines: { ...previous.lines, ...authoritativeConnection, nodes: lines },
    ...(checkoutUrl !== undefined && { checkoutUrl }),
    ...(note !== undefined && { note }),
  };
}

function fetchCartRevalidationData(cartId: string, signal: AbortSignal): Promise<CartData | null> {
  return fetchCart(cartId, signal).then(({ cart }) =>
    cart ? cartResponseFromStandardEvent(cart as unknown as StandardEventCart) : null,
  );
}

function isCurrentCartRevalidationRequest(
  store: CartStoreContext,
  request: ActiveCartRevalidation,
): boolean {
  return (
    store.revalidation.active === request &&
    store.generation === request.generation &&
    store.mutationRevision === request.mutationRevision &&
    store.transactions.length === 0 &&
    store.settled.data.id === request.cartId
  );
}

function isCurrentCartRevalidation(
  store: CartStoreContext,
  request: ActiveCartRevalidation,
  cart: CartData,
): boolean {
  return isCurrentCartRevalidationRequest(store, request) && cart.id === request.cartId;
}

function revalidateCartWhenIdle(store: CartStoreContext): void {
  if (
    !store.revalidation.requested ||
    store.revalidation.active ||
    store.transactions.length > 0 ||
    store.activeMutationTransports.size > 0
  ) {
    return;
  }

  const cartId = store.settled.data.id;
  if (!cartId) {
    store.revalidation.requested = false;
    store.revalidation.visible = false;
    publishVisibleState(store);
    return;
  }

  store.revalidation.requested = false;
  clearProjectedErrors(store, [REVALIDATION_ERROR_KEY]);
  publishVisibleState(store);
  const controller = new AbortController();
  let request: ActiveCartRevalidation;
  const promise = fetchCartRevalidationData(cartId, controller.signal)
    .then((cart) => {
      if (!cart) throw new Error(CART_REVALIDATION_ERROR_MESSAGE);
      if (!isCurrentCartRevalidation(store, request, cart)) return;
      store.settled = {
        ...store.settled,
        data: mergeAuthoritativeCartData(store.settled.data, cart),
      };
      store.revalidation.visible = false;
      publishVisibleState(store);
    })
    .catch((error: unknown) => {
      if (isAbortError(error) || !isCurrentCartRevalidationRequest(store, request)) return;
      store.revalidation.visible = false;
      addProjectedError(store, [REVALIDATION_ERROR_KEY], (state, timestampMs) =>
        writeNetworkError(state, new Error(CART_REVALIDATION_ERROR_MESSAGE), timestampMs),
      );
      publishVisibleState(store);
    })
    .finally(() => {
      if (store.revalidation.active === request) store.revalidation.active = null;
      revalidateCartWhenIdle(store);
    });
  request = {
    cartId,
    controller,
    generation: store.generation,
    mutationRevision: store.mutationRevision,
    promise,
  };
  store.revalidation.active = request;
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
