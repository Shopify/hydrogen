import type { EvidenceRecord } from "../evidence.ts";

/** Shopify Standard Events the browser recorder listens to. Hydrogen analytics are not recorded. */
export const STANDARD_EVENT_NAMES = [
  "shopify:page:view",
  "shopify:product:view",
  "shopify:product:select",
  "shopify:collection:view",
  "shopify:collection:update",
  "shopify:search:update",
  "shopify:cart:view",
  "shopify:cart:error",
  "shopify:cart:lines-update",
  "shopify:cart:note-update",
  "shopify:cart:attributes-update",
  "shopify:cart:discount-update",
] as const;

export type StandardEventName = (typeof STANDARD_EVENT_NAMES)[number];
export type StandardEventPhase = "input" | "settled" | "failed" | "unsettled";

export type StandardEventEvidence = {
  event: { id: string; name: StandardEventName; action: string; phase: StandardEventPhase };
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { name?: string; message: string };
  reason?: string;
  /** Present on `input` records. `true` when a `settled`, `failed`, or `unsettled` record follows. */
  awaited?: boolean;
};

/** Payload keys copied in the browser. `promise` and `detail` are never copied. */
const INPUT_KEYS: Record<StandardEventName, string[]> = {
  "shopify:page:view": ["page"],
  "shopify:product:view": ["context", "product", "selectedOptions"],
  "shopify:product:select": ["product", "selectedOptions"],
  "shopify:collection:view": ["collection"],
  "shopify:collection:update": ["collection", "productFilters", "sortKey"],
  "shopify:search:update": ["search"],
  "shopify:cart:view": ["context", "cart"],
  "shopify:cart:error": ["code", "error"],
  "shopify:cart:lines-update": ["action", "context", "lines"],
  "shopify:cart:note-update": ["context", "note"],
  "shopify:cart:attributes-update": ["context", "attributes"],
  "shopify:cart:discount-update": ["discountCodes"],
};

const MAX_STRING = 500;
const MAX_ITEMS = 50;
export const MAX_STANDARD_EVENT_MESSAGE_BYTES = 64 * 1024;

/** Result of evaluating the recorder script: whether it armed a new document, and where. */
export type RecorderArmResult = { fresh: boolean; url: string };

/**
 * Read-only recorder script. It listens in the capture phase on `window`, copies bounded plain
 * data, awaits `event.promise`, and reports through the CDP binding. It never dispatches
 * events or changes page state. The session reports awaited events whose document goes away
 * first as `unsettled`.
 *
 * The script is idempotent per JavaScript realm and evaluates to a `RecorderArmResult`. A
 * second run re-arms the listeners for the current document. Chrome keeps the realm when a
 * popup or frame replaces its initial about:blank document with a same-origin page, and does
 * not run init scripts again there.
 */
export function standardEventsRecorderScript(bindingName: string): string {
  return `(() => {
  const armKey = Symbol.for(${JSON.stringify(bindingName)});
  if (typeof globalThis[armKey] === "function") return globalThis[armKey]();
  const binding = ${JSON.stringify(bindingName)};
  const send = globalThis[binding];
  if (typeof send !== "function") return undefined;
  try { delete globalThis[binding]; } catch {}
  const keys = ${JSON.stringify(INPUT_KEYS)};
  const stringify = JSON.stringify;
  const toPromise = Promise.resolve.bind(Promise);
  const then = Promise.prototype.then;
  const isArray = Array.isArray;
  const documentId = Math.random().toString(36).slice(2, 10);
  let counter = 0;
  const post = (message) => { try { send(stringify(message)); } catch {} };
  const plain = (value, depth) => {
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") return value.slice(0, ${MAX_STRING});
    if (depth > 6 || typeof value !== "object" || typeof value.then === "function") return undefined;
    if (isArray(value)) return value.slice(0, ${MAX_ITEMS}).map((item) => plain(item, depth + 1));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return undefined;
    const out = {};
    for (const key of Object.keys(value).slice(0, 30)) {
      if (key !== "promise" && key !== "detail") out[key] = plain(value[key], depth + 1);
    }
    return out;
  };
  const failure = (error) => ({
    name: typeof error?.name === "string" ? error.name.slice(0, 100) : undefined,
    message: String(error?.message ?? error).slice(0, ${MAX_STRING}),
  });
  const record = (name, event) => {
    const id = documentId + "-" + ++counter;
    const input = {};
    for (const key of keys[name]) input[key] = plain(event[key], 1);
    const action = name === "shopify:cart:lines-update" ? input.action : name.split(":")[2];
    const base = { id, name, action };
    const promise = event.promise;
    const awaited = promise !== null && typeof promise === "object" && typeof promise.then === "function";
    post({ ...base, phase: "input", input, awaited });
    if (!awaited) return;
    const finish = (message) => post({ ...base, ...message });
    try {
      then.call(toPromise(promise), (result) => finish({ phase: "settled", result: plain(result, 1) }),
        (error) => finish({ phase: "failed", error: failure(error) }));
    } catch (error) {
      finish({ phase: "failed", error: failure(error) });
    }
  };
  const seen = new WeakSet();
  const handlers = Object.keys(keys).map((name) => [name, (event) => {
    if (seen.has(event)) return;
    seen.add(event);
    record(name, event);
  }]);
  const armed = new WeakSet();
  // A reused realm keeps the window listeners, but events of the new document do not always
  // reach them. Listening on the current document too covers both cases.
  const arm = () => {
    const fresh = !armed.has(document);
    armed.add(document);
    for (const [name, handler] of handlers) {
      addEventListener(name, handler, true);
      document.addEventListener(name, handler, true);
    }
    return { fresh, url: location.href };
  };
  Object.defineProperty(globalThis, armKey, { value: arm });
  return arm();
})()`;
}

/** Parses one browser recorder message into a typed, bounded evidence record. */
export function parseStandardEventMessage(
  message: string,
  timestamp = Date.now(),
): (EvidenceRecord & { data: StandardEventEvidence }) | undefined {
  if (message.length > MAX_STANDARD_EVENT_MESSAGE_BYTES) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(message);
  } catch {
    return undefined;
  }
  const event = parseEventHeader(raw);
  if (!event || !isObject(raw)) return undefined;
  const data: StandardEventEvidence = { event };
  if (event.phase === "input") {
    data.input = compact(INPUT_SHAPES[event.name](record(raw.input)));
    data.awaited = raw.awaited === true;
  }
  if (event.phase === "settled") data.result = compact(resultShape(event.name, record(raw.result)));
  if (event.phase === "failed") {
    const error = record(raw.error);
    data.error = compact({
      name: text(error.name),
      message: text(error.message) ?? "Unknown error",
    });
  }
  if (event.phase === "unsettled") data.reason = text(raw.reason);
  return { kind: "standard-event", timestamp, data: compact(data) };
}

/** Builds an `unsettled` record for an awaited event that never reported a result. */
export function unsettledStandardEvent(
  event: StandardEventEvidence["event"],
  reason: string,
  timestamp = Date.now(),
): EvidenceRecord {
  return {
    kind: "standard-event",
    timestamp,
    data: { event: { ...event, phase: "unsettled" }, reason },
  };
}

const PHASES = new Set<string>(["input", "settled", "failed", "unsettled"]);
const LINE_ACTIONS = new Set<string>(["add", "remove", "update"]);

function parseEventHeader(raw: unknown): StandardEventEvidence["event"] | undefined {
  if (!isObject(raw)) return undefined;
  const name = STANDARD_EVENT_NAMES.find((candidate) => candidate === raw.name);
  const phase = [...PHASES].find((candidate) => candidate === raw.phase);
  const id = text(raw.id);
  if (!name || !isPhase(phase) || !id) return undefined;
  const action = name === "shopify:cart:lines-update" ? text(raw.action) : name.split(":")[2];
  if (action === undefined) return undefined;
  if (name === "shopify:cart:lines-update" && !LINE_ACTIONS.has(action)) return undefined;
  return { id: id.slice(0, 64), name, action, phase };
}

function isPhase(value: string | undefined): value is StandardEventPhase {
  return value !== undefined && PHASES.has(value);
}

type Shape = (value: Record<string, unknown>) => Record<string, unknown>;

const INPUT_SHAPES: Record<StandardEventName, Shape> = {
  "shopify:page:view": (v) => ({ page: pick(v.page, ["template", "title", "url"]) }),
  "shopify:product:view": (v) => ({
    context: text(v.context),
    product: productShape(v.product),
    selectedOptions: options(v.selectedOptions),
  }),
  "shopify:product:select": (v) => ({
    product: pick(v.product, ["id", "handle", "title"]),
    selectedOptions: options(v.selectedOptions),
  }),
  "shopify:collection:view": (v) => ({ collection: collectionShape(v.collection) }),
  "shopify:collection:update": (v) => ({
    collection: collectionShape(v.collection),
    productFilters: filters(v.productFilters),
    sortKey: text(v.sortKey),
  }),
  "shopify:search:update": (v) => {
    const search = record(v.search);
    return {
      search: compact({
        query: text(search.query),
        productFilters: filters(search.productFilters),
        sortKey: text(search.sortKey),
      }),
    };
  },
  "shopify:cart:view": (v) => ({ context: text(v.context), cart: cartShape(v.cart) }),
  "shopify:cart:error": (v) => ({ code: text(v.code), error: text(v.error) }),
  "shopify:cart:lines-update": (v) => ({
    action: text(v.action),
    context: text(v.context),
    lines: list(v.lines, (line) => pick(line, ["id", "merchandiseId", "quantity"])),
  }),
  "shopify:cart:note-update": (v) => ({ context: text(v.context), note: text(v.note) }),
  "shopify:cart:attributes-update": (v) => ({
    context: text(v.context),
    attributes: list(v.attributes, (attribute) => pick(attribute, ["key", "value"])),
  }),
  "shopify:cart:discount-update": (v) => ({
    discountCodes: list(v.discountCodes, (code) => pick(code, ["code"])),
  }),
};

function resultShape(name: StandardEventName, value: Record<string, unknown>) {
  if (name === "shopify:product:select") return { variant: variantShape(value.variant) };
  if (name === "shopify:search:update") return { totalCount: count(value.totalCount) };
  if (name === "shopify:collection:update") return { productsCount: count(value.productsCount) };
  return {
    cart: cartShape(value.cart),
    userErrors: list(value.userErrors, (error) => pick(error, ["code", "field", "message"])),
    warnings: list(value.warnings, (warning) => pick(warning, ["code", "message", "target"])),
  };
}

function cartShape(value: unknown) {
  if (!isObject(value)) return value === null ? null : undefined;
  return compact({
    id: text(value.id),
    totalQuantity: count(value.totalQuantity),
    totalAmount: money(record(record(value.cost).totalAmount)),
    lines: list(value.lines, (line) => pick(line, ["id", "quantity"])),
    discountCodes: list(value.discountCodes, (code) => pick(code, ["code", "applicable"])),
  });
}

function productShape(value: unknown) {
  const product = record(value);
  return compact({
    ...pick(product, ["id", "handle", "title"]),
    selectedVariant: variantShape(product.selectedVariant),
  });
}

function variantShape(value: unknown) {
  if (!isObject(value)) return value === null ? null : undefined;
  return compact({
    ...pick(value, ["id", "title", "availableForSale"]),
    price: money(record(value.price)),
    selectedOptions: options(value.selectedOptions),
  });
}

function collectionShape(value: unknown) {
  return pick(value, ["id", "handle", "productsCount"]);
}

function money(value: Record<string, unknown>) {
  return pick(value, ["amount", "currencyCode"]);
}

function options(value: unknown) {
  return list(value, (option) => pick(option, ["name", "value"]));
}

/** Product filters are nested; keep them as bounded plain records of scalars. */
function filters(value: unknown) {
  return list(value, (filter) => (isObject(filter) ? scalars(filter, 2) : undefined));
}

function scalars(value: Record<string, unknown>, depth: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 20)) {
    out[key] = isObject(item) && depth > 0 ? scalars(item, depth - 1) : scalar(item);
  }
  return compact(out);
}

function pick(value: unknown, keys: string[]): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const item = value[key];
    out[key] = Array.isArray(item) ? list(item, scalar) : scalar(item);
  }
  return compact(out);
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  return text(value);
}

function list<T>(value: unknown, map: (item: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: T[] = [];
  for (const item of value.slice(0, MAX_ITEMS)) {
    const mapped = map(item);
    if (mapped !== undefined) out.push(mapped);
  }
  return out;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value.slice(0, MAX_STRING) : undefined;
}

function count(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function record(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compact<T extends object>(value: T): T {
  for (const key of Object.keys(value)) {
    if (Reflect.get(value, key) === undefined) Reflect.deleteProperty(value, key);
  }
  return value;
}
