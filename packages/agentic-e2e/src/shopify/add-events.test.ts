import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ADD_EVENT_NAME,
  AddEventLog,
  MAX_LINES,
  MAX_STRING,
  parseAddEventMessage,
  recordAddEvents,
} from "./add-events.ts";

const VARIANT = "gid://shopify/ProductVariant/1";
const LINE = "gid://shopify/CartLine/1?cart=secret-token";
const BINDING = "__testBinding";

const input = {
  name: ADD_EVENT_NAME,
  phase: "input",
  id: "abc-1",
  action: "add",
  lines: [{ id: null, merchandiseId: VARIANT, quantity: 1 }],
  hasPromise: true,
};
const settled = {
  name: ADD_EVENT_NAME,
  phase: "settled",
  id: "abc-1",
  isObject: true,
  hasCart: true,
  userErrors: 2,
  warningCodes: ["MERCHANDISE_OUT_OF_STOCK", null],
  lines: [{ id: LINE, quantity: 1 }],
};

describe("parseAddEventMessage", () => {
  it("parses input, settled, and failed messages with the receive order", () => {
    expect(parseAddEventMessage(JSON.stringify(input), 3)).toEqual({ ...input, order: 3 });
    expect(parseAddEventMessage(JSON.stringify(settled), 4)).toEqual({ ...settled, order: 4 });
    expect(
      parseAddEventMessage(JSON.stringify({ ...settled, userErrors: null, warningCodes: null }), 6),
    ).toEqual({ ...settled, userErrors: null, warningCodes: null, order: 6 });
    expect(
      parseAddEventMessage(JSON.stringify({ name: ADD_EVENT_NAME, phase: "failed", id: "x" }), 5),
    ).toEqual({ name: ADD_EVENT_NAME, phase: "failed", id: "x", order: 5 });
  });

  it.each([
    ["an unknown event name", { ...input, name: "shopify:cart:view" }],
    ["an unknown phase", { ...input, phase: "unsettled" }],
    [
      "a string quantity",
      { ...input, lines: [{ id: null, merchandiseId: VARIANT, quantity: "1" }] },
    ],
    ["no lines array", { ...input, lines: undefined }],
    ["an empty ID", { ...input, id: "" }],
    ["a negative user error count", { ...settled, userErrors: -1 }],
    ["no cart flag", { ...settled, hasCart: undefined }],
    [
      "too many warning codes",
      { ...settled, warningCodes: Array.from({ length: MAX_LINES + 1 }, () => "X") },
    ],
    ["a settled message without lines", { ...settled, lines: undefined }],
    ["a settled line with a string quantity", { ...settled, lines: [{ id: LINE, quantity: "1" }] }],
    [
      "too many settled lines",
      { ...settled, lines: Array.from({ length: MAX_LINES + 1 }, () => settled.lines[0]) },
    ],
    [
      "a too long settled line ID",
      { ...settled, lines: [{ id: "x".repeat(MAX_STRING + 1), quantity: 1 }] },
    ],
    [
      "a too long input line ID",
      {
        ...input,
        lines: [{ id: "x".repeat(MAX_STRING + 1), merchandiseId: VARIANT, quantity: 1 }],
      },
    ],
    ["a too long warning code", { ...settled, warningCodes: ["x".repeat(MAX_STRING + 1)] }],
    [
      "too many lines",
      { ...input, lines: Array.from({ length: MAX_LINES + 1 }, () => input.lines[0]) },
    ],
    [
      "a too long merchandise ID",
      { ...input, lines: [{ id: null, merchandiseId: "x".repeat(MAX_STRING + 1), quantity: 1 }] },
    ],
  ])("drops a message with %s", (_case, message) => {
    expect(parseAddEventMessage(JSON.stringify(message), 0)).toBeUndefined();
  });

  it("drops an oversized message, invalid JSON, and a non-string message", () => {
    const padded = JSON.stringify({ ...input, padding: "x".repeat(40_000) });
    expect(parseAddEventMessage(padded, 0)).toBeUndefined();
    expect(parseAddEventMessage("{", 0)).toBeUndefined();
    expect(parseAddEventMessage(input, 0)).toBeUndefined();
  });
});

describe("AddEventLog", () => {
  it("keeps valid messages in receive order and drops invalid ones", () => {
    const log = new AddEventLog();

    log.receive("not json");
    log.receive(JSON.stringify(input));
    log.receive(JSON.stringify({ name: ADD_EVENT_NAME, phase: "failed", id: "abc-1" }));

    expect(log.events.map((event) => [event.order, event.phase])).toEqual([
      [0, "input"],
      [1, "failed"],
    ]);
  });

  it("calls onFirstAdd once, for the first add input at or after the given order", () => {
    const log = new AddEventLog();
    log.receive(JSON.stringify(input));
    const calls: number[] = [];
    log.onFirstAdd(1, () => calls.push(log.events.length));

    // Before `from`, an update, and an outcome do not count.
    log.receive(JSON.stringify({ ...input, id: "u", action: "update" }));
    log.receive(JSON.stringify({ ...settled, userErrors: 0 }));
    expect(calls).toEqual([]);
    log.receive(JSON.stringify({ ...input, id: "b" }));
    log.receive(JSON.stringify({ ...input, id: "c" }));

    expect(calls).toEqual([4]);
  });

  it("calls onFirstAdd at once when the add is already in the log", () => {
    const log = new AddEventLog();
    log.receive(JSON.stringify(input));
    const calls: number[] = [];

    log.onFirstAdd(0, () => calls.push(1));

    expect(calls).toEqual([1]);
  });

  it("resolves waitFor when a new message makes the condition true", async () => {
    const log = new AddEventLog();
    const waiting = log.waitFor(() => log.events.length > 0, 60_000, new AbortController().signal);

    log.receive(JSON.stringify(input));

    await expect(waiting).resolves.toBeUndefined();
  });

  it("resolves waitFor when the signal aborts", async () => {
    const log = new AddEventLog();
    const interrupt = new AbortController();
    const waiting = log.waitFor(() => false, 60_000, interrupt.signal);

    interrupt.abort();

    await expect(waiting).resolves.toBeUndefined();
  });

  it("resolves waitFor at once when the signal already aborted", async () => {
    const interrupt = new AbortController();
    interrupt.abort();

    await expect(new AddEventLog().waitFor(() => false, 60_000, interrupt.signal)).resolves.toBe(
      undefined,
    );
  });

  it("resolves waitFor after the time limit", async () => {
    vi.useFakeTimers();
    try {
      const log = new AddEventLog();
      let done = false;
      const waiting = log
        .waitFor(() => false, 5_000, new AbortController().signal)
        .then(() => {
          done = true;
        });

      await vi.advanceTimersByTimeAsync(4_999);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await waiting;
      expect(done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

/** Lets settled promise callbacks run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("recordAddEvents", () => {
  let messages: unknown[];
  let target: EventTarget;

  beforeEach(() => {
    messages = [];
    target = new EventTarget();
    vi.stubGlobal("document", target);
    vi.stubGlobal(BINDING, (message: string) => {
      messages.push(JSON.parse(message));
    });
    recordAddEvents({ binding: BINDING, maxLines: MAX_LINES, maxString: MAX_STRING });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function dispatch(fields: Record<string, unknown>, name = ADD_EVENT_NAME): void {
    target.dispatchEvent(Object.assign(new Event(name), fields));
  }

  it("sends an input message and one settled message with the result fields", async () => {
    dispatch({
      action: "add",
      context: "standard-action",
      lines: [{ merchandiseId: VARIANT, quantity: 1, attributes: [{ key: "secret" }] }],
      promise: Promise.resolve({
        cart: { id: "secret" },
        userErrors: [{ message: "No" }],
        warnings: [{ code: "MERCHANDISE_OUT_OF_STOCK", message: "secret" }, { message: "secret" }],
      }),
      detail: { products: [] },
    });
    await flush();

    // The result's cart has no `lines` array: `lines` is null.
    expect(messages).toEqual([
      {
        name: ADD_EVENT_NAME,
        phase: "input",
        id: expect.any(String),
        action: "add",
        lines: [{ id: null, merchandiseId: VARIANT, quantity: 1 }],
        hasPromise: true,
      },
      {
        name: ADD_EVENT_NAME,
        phase: "settled",
        id: expect.any(String),
        isObject: true,
        hasCart: true,
        userErrors: 1,
        warningCodes: ["MERCHANDISE_OUT_OF_STOCK", null],
        lines: null,
      },
    ]);
    const [first, second] = messages as Array<{ id: string }>;
    expect(second?.id).toBe(first?.id);
  });

  it.each([
    [
      "absent userErrors and warnings as empty",
      { cart: {} },
      { isObject: true, hasCart: true, userErrors: 0, warningCodes: [] },
    ],
    [
      "a null cart",
      { cart: null, userErrors: [], warnings: [] },
      { isObject: true, hasCart: false, userErrors: 0, warningCodes: [] },
    ],
    [
      "userErrors and warnings that are not arrays as null",
      { cart: {}, userErrors: "No", warnings: { code: "MERCHANDISE_OUT_OF_STOCK" } },
      { isObject: true, hasCart: true, userErrors: null, warningCodes: null },
    ],
    [
      "an undefined value",
      undefined,
      { isObject: false, hasCart: false, userErrors: 0, warningCodes: [] },
    ],
    ["a string value", "ok", { isObject: false, hasCart: false, userErrors: 0, warningCodes: [] }],
  ])("records %s", async (_case, value, fields) => {
    dispatch({ action: "add", lines: [], promise: Promise.resolve(value) });
    await flush();

    expect(messages[1]).toEqual({
      name: ADD_EVENT_NAME,
      phase: "settled",
      id: expect.any(String),
      lines: null,
      ...fields,
    });
    expect(parseAddEventMessage(JSON.stringify(messages[1]), 0)).toBeDefined();
  });

  it("bounds the warning count and code length, and the message parses", async () => {
    const warnings = Array.from({ length: MAX_LINES + 10 }, () => ({
      code: "c".repeat(MAX_STRING + 50),
    }));
    dispatch({ action: "add", lines: [], promise: Promise.resolve({ cart: {}, warnings }) });
    await flush();

    const [, message] = messages as Array<{ warningCodes: string[] }>;
    expect(message?.warningCodes).toHaveLength(MAX_LINES);
    expect(message?.warningCodes[0]).toBe("c".repeat(MAX_STRING));
    expect(parseAddEventMessage(JSON.stringify(message), 0)).toBeDefined();
  });

  it("sends no settled message when reading the resolved value throws", async () => {
    const value = {
      get cart() {
        throw new Error("getter");
      },
    };
    dispatch({ action: "add", lines: [], promise: Promise.resolve(value) });
    await flush();

    expect(messages).toEqual([expect.objectContaining({ phase: "input" })]);
  });

  it("sends the input line ID and the result cart lines of an update, without other fields", async () => {
    dispatch({
      action: "update",
      context: "cart",
      lines: [{ id: LINE, quantity: 2 }],
      // Horizon-shaped: no `userErrors` key.
      promise: Promise.resolve({
        cart: {
          id: "secret-cart",
          checkoutUrl: "secret-url",
          lines: [{ id: LINE, quantity: 2, cost: {} }],
        },
      }),
    });
    await flush();

    expect(messages).toEqual([
      expect.objectContaining({
        action: "update",
        lines: [{ id: LINE, merchandiseId: null, quantity: 2 }],
      }),
      {
        name: ADD_EVENT_NAME,
        phase: "settled",
        id: expect.any(String),
        isObject: true,
        hasCart: true,
        userErrors: 0,
        warningCodes: [],
        lines: [{ id: LINE, quantity: 2 }],
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain("secret-cart");
    expect(JSON.stringify(messages)).not.toContain("secret-url");
  });

  it("sends empty result lines for a remove, and null lines for a result without a cart", async () => {
    dispatch({
      action: "remove",
      lines: [{ id: LINE, quantity: 0 }],
      promise: Promise.resolve({ cart: { lines: [] }, userErrors: [] }),
    });
    dispatch({
      action: "remove",
      lines: [{ id: LINE, quantity: 0 }],
      promise: Promise.resolve(null),
    });
    dispatch({
      action: "remove",
      lines: [{ id: LINE, quantity: 0 }],
      promise: Promise.resolve({ cart: null }),
    });
    await flush();

    expect(
      (messages as Array<{ phase: string; lines: unknown }>)
        .filter((message) => message.phase === "settled")
        .map((message) => message.lines),
    ).toEqual([[], null, null]);
  });

  it("does not throw into the page when the result throws on read", async () => {
    const hostile = {};
    Object.defineProperty(hostile, "cart", {
      get() {
        throw new Error("getter");
      },
    });
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);
    try {
      dispatch({ action: "update", lines: [], promise: Promise.resolve(hostile) });
      await flush();
      await flush();
    } finally {
      process.off("unhandledRejection", onRejection);
    }

    expect(rejections).toEqual([]);
    expect(messages).toEqual([expect.objectContaining({ phase: "input" })]);
  });

  it("sends a failed message for a rejected promise", async () => {
    dispatch({ action: "add", lines: [], promise: Promise.reject(new Error("down")) });
    await flush();

    expect(messages).toEqual([
      expect.objectContaining({ phase: "input", hasPromise: true }),
      expect.objectContaining({ phase: "failed" }),
    ]);
  });

  it("sends only an input message when there is no thenable promise", async () => {
    dispatch({ action: "add", lines: [{ merchandiseId: VARIANT, quantity: 1 }], promise: {} });
    await flush();

    expect(messages).toEqual([expect.objectContaining({ phase: "input", hasPromise: false })]);
  });

  it("bounds the line count and string length, and every message parses", async () => {
    const longLine = "l".repeat(MAX_STRING + 50);
    dispatch({
      action: "a".repeat(MAX_STRING + 50),
      lines: Array.from({ length: MAX_LINES + 10 }, () => ({
        id: longLine,
        merchandiseId: "m".repeat(MAX_STRING + 50),
        quantity: Number.NaN,
      })),
      promise: Promise.resolve({
        cart: {
          lines: Array.from({ length: MAX_LINES + 10 }, () => ({ id: longLine, quantity: "2" })),
        },
      }),
    });
    await flush();

    const [message, result] = messages as Array<{
      action: string;
      lines: Array<{ id: string }>;
    }>;
    expect(message?.action).toHaveLength(MAX_STRING);
    expect(message?.lines).toHaveLength(MAX_LINES);
    expect(message?.lines[0]).toEqual({
      id: "l".repeat(MAX_STRING),
      merchandiseId: "m".repeat(MAX_STRING),
      quantity: null,
    });
    expect(result?.lines).toHaveLength(MAX_LINES);
    expect(result?.lines[0]).toEqual({ id: "l".repeat(MAX_STRING), quantity: null });
    // The same truncation on both sides: the IDs compare equal.
    expect(result?.lines[0]?.id).toBe(message?.lines[0]?.id);
    expect(parseAddEventMessage(JSON.stringify(message), 0)).toBeDefined();
    expect(parseAddEventMessage(JSON.stringify(result), 1)).toBeDefined();
  });

  it("ignores other event names and never throws into the page", async () => {
    dispatch({ action: "add" }, "shopify:cart:view");
    const hostile = new Event(ADD_EVENT_NAME);
    Object.defineProperty(hostile, "lines", {
      get() {
        throw new Error("getter");
      },
    });

    expect(target.dispatchEvent(hostile)).toBe(true);
    await flush();
    expect(messages).toEqual([]);
  });
});
