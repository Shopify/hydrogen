import type { Page } from "playwright-core";
import { z } from "zod";

export const ADD_EVENT_NAME = "shopify:cart:lines-update";
const BINDING = "__agenticE2eAddEvent";
export const MAX_LINES = 50;
export const MAX_STRING = 200;
const MAX_MESSAGE_LENGTH = 16_384;

export type ScriptLimits = { binding: string; maxLines: number; maxString: number };

/**
 * Runs in the page before page scripts, on each document of the main page. It listens for
 * `shopify:cart:lines-update` in the capture phase on `document`, so events dispatched on the
 * document or on an element in it are seen. Events dispatched directly on `window` are not
 * recorded. For each event it sends one `input` message with a bounded copy of `action` and of
 * each line's `merchandiseId` and `quantity`, and whether `event.promise` is thenable. When it is,
 * it sends one `settled` (with the `userErrors` count) or `failed` message. It does not dispatch
 * events or throw into the page. Its rejection handler marks a native `event.promise` as handled, so the storefront may
 * not get an `unhandledrejection` for it.
 */
export function recordAddEvents({ binding, maxLines, maxString }: ScriptLimits): void {
  const send: unknown = Reflect.get(globalThis, binding);
  if (typeof send !== "function") return;
  // Captured now: page scripts that run later can replace these globals.
  const stringify = JSON.stringify;
  const toPromise = Promise.resolve.bind(Promise);
  const isArray = Array.isArray;
  const prefix = Math.random().toString(36).slice(2, 10);
  let counter = 0;
  const post = (message: Record<string, unknown>): void => {
    try {
      Promise.resolve(Reflect.apply(send, undefined, [stringify(message)])).catch(() => undefined);
    } catch {
      // Never throw into the page.
    }
  };
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- addInitScript sends only this function to the page.
  const field = (value: unknown, name: string): unknown =>
    typeof value === "object" && value !== null ? Reflect.get(value, name) : undefined;
  const text = (value: unknown): string | null =>
    typeof value === "string" ? value.slice(0, maxString) : null;
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- addInitScript sends only this function to the page.
  const number = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const record = (event: Event): void => {
    const id = `${prefix}-${++counter}`;
    const lines = field(event, "lines");
    const promise = field(event, "promise");
    const thenable = typeof field(promise, "then") === "function";
    post({
      name: event.type,
      phase: "input",
      id,
      action: text(field(event, "action")),
      lines: isArray(lines)
        ? lines.slice(0, maxLines).map((line: unknown) => ({
            merchandiseId: text(field(line, "merchandiseId")),
            quantity: number(field(line, "quantity")),
          }))
        : [],
      hasPromise: thenable,
    });
    if (!thenable) return;
    toPromise(promise).then(
      (result) => {
        const errors = field(result, "userErrors");
        post({
          name: event.type,
          phase: "settled",
          id,
          userErrors: isArray(errors) ? errors.length : 0,
        });
      },
      () => post({ name: event.type, phase: "failed", id }),
    );
  };
  document.addEventListener(
    "shopify:cart:lines-update",
    (event) => {
      try {
        record(event);
      } catch {
        // Never throw into the page.
      }
    },
    true,
  );
}

const id = z.string().min(1).max(64);
const name = z.literal(ADD_EVENT_NAME);
const text = z.string().max(MAX_STRING).nullable();
const messageSchema = z.discriminatedUnion("phase", [
  z.object({
    name,
    phase: z.literal("input"),
    id,
    action: text,
    lines: z
      .array(z.object({ merchandiseId: text, quantity: z.number().nullable() }))
      .max(MAX_LINES),
    hasPromise: z.boolean(),
  }),
  z.object({ name, phase: z.literal("settled"), id, userErrors: z.int().min(0) }),
  z.object({ name, phase: z.literal("failed"), id }),
]);

/** One recorded message. `order` is its receive order in Node, from 0. */
export type AddEvent = z.infer<typeof messageSchema> & { order: number };

/** Parses one page message. Returns `undefined` for an oversized or invalid message. */
export function parseAddEventMessage(message: unknown, order: number): AddEvent | undefined {
  if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(message);
  } catch {
    return undefined;
  }
  const parsed = messageSchema.safeParse(raw);
  return parsed.success ? { ...parsed.data, order } : undefined;
}

/** The in-memory list of add event messages from the main page, in receive order. */
export class AddEventLog {
  readonly events: AddEvent[] = [];
  readonly #listeners = new Set<() => void>();

  receive(message: unknown): void {
    const event = parseAddEventMessage(message, this.events.length);
    if (event === undefined) return;
    this.events.push(event);
    for (const listener of this.#listeners) listener();
  }

  /**
   * Calls `listener` once, as soon as an `input` with `action: "add"` at or after `from` (a receive
   * order) is in the log.
   */
  onFirstAdd(from: number, listener: () => void): void {
    const check = (): void => {
      const found = this.events.some(
        (event) => event.order >= from && event.phase === "input" && event.action === "add",
      );
      if (!found) return;
      this.#listeners.delete(check);
      listener();
    };
    this.#listeners.add(check);
    check();
  }

  /**
   * Resolves when `condition` is true, checked on each new message, after `ms`, or when `signal`
   * aborts.
   */
  async waitFor(condition: () => boolean, ms: number, signal: AbortSignal): Promise<void> {
    if (condition() || signal.aborted) return;
    const { promise, resolve } = Promise.withResolvers<void>();
    const check = (): void => {
      if (condition()) resolve();
    };
    const onAbort = (): void => resolve();
    const timer = setTimeout(resolve, ms);
    this.#listeners.add(check);
    signal.addEventListener("abort", onAbort, { once: true });
    try {
      await promise;
    } finally {
      clearTimeout(timer);
      this.#listeners.delete(check);
      signal.removeEventListener("abort", onAbort);
    }
  }
}

/**
 * Starts recording on `page`. Call it before the first navigation: the script then runs before
 * page scripts on each document of this page. Messages from frames are dropped: only the main
 * page is observed.
 */
export async function observeAddEvents(page: Page): Promise<AddEventLog> {
  const log = new AddEventLog();
  await page.exposeBinding(BINDING, (source, message: unknown) => {
    if (source.frame === page.mainFrame()) log.receive(message);
  });
  await page.addInitScript(recordAddEvents, {
    binding: BINDING,
    maxLines: MAX_LINES,
    maxString: MAX_STRING,
  });
  return log;
}
