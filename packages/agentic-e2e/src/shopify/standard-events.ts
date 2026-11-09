import { z } from "zod";

import type { EvidenceRecord } from "../evidence.ts";
import { STANDARD_EVENT_NAMES, type StandardEventName } from "../scenario.ts";

export { STANDARD_EVENT_NAMES, type StandardEventName };
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

/**
 * Payload keys copied in the browser. `promise` and `detail` are never copied. The runner keeps
 * a smaller set (see `PAYLOAD_SCHEMAS`).
 */
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
 * Read-only recorder script for the selected event names only. It listens in the capture phase on
 * the current `document`, copies bounded plain data, awaits `event.promise`, and reports through
 * the CDP binding. It never dispatches events or changes page state. The session reports awaited
 * events whose document goes away first as `unsettled`.
 *
 * Shopify dispatches Standard Events on the document or on an element in it, so the capture
 * listener sees them all. Events dispatched directly on `window` are not recorded.
 *
 * The script is idempotent per JavaScript realm and evaluates to a `RecorderArmResult`. A
 * second run re-arms the listeners for the current document. Chrome keeps the realm when a
 * popup or frame replaces its initial about:blank document with a same-origin page, and does
 * not run init scripts again there.
 */
export function standardEventsRecorderScript(
  bindingName: string,
  names: readonly StandardEventName[],
): string {
  const selected = Object.fromEntries(names.map((name) => [name, INPUT_KEYS[name]]));
  return `(() => {
  const armKey = Symbol.for(${JSON.stringify(bindingName)});
  if (typeof globalThis[armKey] === "function") return globalThis[armKey]();
  const binding = ${JSON.stringify(bindingName)};
  const send = globalThis[binding];
  if (typeof send !== "function") return undefined;
  try { delete globalThis[binding]; } catch {}
  const keys = ${JSON.stringify(selected)};
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
  const handlers = Object.keys(keys).map((name) => [name, (event) => record(name, event)]);
  const armed = new WeakSet();
  // One capture listener on the document sees each event once. The browser ignores a second
  // add of the same listener. Always add them: a replaced document has none, and document.open()
  // removes them from the same document.
  const arm = () => {
    const fresh = !armed.has(document);
    armed.add(document);
    for (const [name, handler] of handlers) document.addEventListener(name, handler, true);
    return { fresh, url: location.href };
  };
  Object.defineProperty(globalThis, armKey, { value: arm });
  return arm();
})()`;
}

/**
 * Parses one browser recorder message into a typed, bounded evidence record. Returns `undefined`
 * for oversized or malformed messages, and for retained fields with the wrong type, so a bad
 * message never becomes a misleading attempt or settled success.
 */
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
  const header = headerSchema.safeParse(raw);
  if (!header.success) return undefined;
  const { id, name, phase } = header.data;
  let action = name.split(":")[2];
  if (name === LINES_UPDATE) {
    const line = lineActionSchema.safeParse(raw);
    if (!line.success) return undefined;
    action = line.data.action;
  }
  const body = bodySchema(name, phase).safeParse(raw);
  if (!body.success) return undefined;
  const { input } = body.data;
  // The recorder derives the header action from `input.action`, so a mismatch is malformed.
  if (input && "action" in input && input.action !== action) return undefined;
  const data: StandardEventEvidence = { event: { id, name, action, phase }, ...body.data };
  return { kind: "standard-event", timestamp, data };
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

const LINES_UPDATE = "shopify:cart:lines-update";
const MAX_ID = 64;

// Bounds truncate first, like the browser recorder: a long string or array is cut, not rejected,
// so the runner keeps every message the recorder already bounded. Items past `MAX_ITEMS` are not
// checked.
const text = z.string().transform((value) => value.slice(0, MAX_STRING));
const list = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (value) => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : value),
    z.array(item),
  );

const headerSchema = z.object({
  id: z
    .string()
    .min(1)
    .transform((id) => id.slice(0, MAX_ID)),
  name: z.enum(STANDARD_EVENT_NAMES),
  phase: z.enum(["input", "settled", "failed", "unsettled"]),
});
const lineAction = z.enum(["add", "remove", "update"]);
const lineActionSchema = z.object({ action: lineAction });

type PhaseFields = Omit<StandardEventEvidence, "event">;

const awaited = z.boolean().default(false);
const failedSchema = z.object({
  error: z
    .object({ name: text.optional(), message: text.default("Unknown error") })
    .default({ message: "Unknown error" }),
});
const unsettledSchema = z.object({ reason: text.optional() });

/**
 * The runner keeps only the payload fields that current assertions read. Every supported event
 * keeps its header and phases, but the payload of other events is dropped on purpose. The browser
 * still copies the wider `INPUT_KEYS` set.
 */
const headerOnly = { input: z.object({ awaited }), settled: z.object({}) };
const PAYLOAD_SCHEMAS: Partial<
  Record<StandardEventName, Record<"input" | "settled", z.ZodType<PhaseFields>>>
> = {
  // Input lines correlate an add with the pinned variant. Settled user errors show a rejection.
  [LINES_UPDATE]: {
    input: z.object({
      awaited,
      input: z.object({
        action: lineAction,
        context: text.optional(),
        lines: list(
          z.object({
            id: text.optional(),
            merchandiseId: text.optional(),
            quantity: z.number().optional(),
          }),
        ).optional(),
      }),
    }),
    settled: z.object({
      result: z.object({
        userErrors: list(
          // The Storefront API can return a null `code` or `field`.
          z.object({ code: text.nullish(), field: list(text).nullish(), message: text.optional() }),
        ).optional(),
      }),
    }),
  },
  "shopify:cart:error": {
    input: z.object({
      awaited,
      input: z.object({ code: text.optional(), error: text.optional() }),
    }),
    settled: headerOnly.settled,
  },
};

function bodySchema(name: StandardEventName, phase: StandardEventPhase): z.ZodType<PhaseFields> {
  if (phase === "failed") return failedSchema;
  if (phase === "unsettled") return unsettledSchema;
  return (PAYLOAD_SCHEMAS[name] ?? headerOnly)[phase];
}
