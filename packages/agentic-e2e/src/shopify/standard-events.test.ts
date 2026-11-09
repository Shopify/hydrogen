import { describe, expect, it } from "vitest";

import {
  MAX_STANDARD_EVENT_MESSAGE_BYTES,
  parseStandardEventMessage,
  standardEventsRecorderScript,
  unsettledStandardEvent,
} from "./standard-events.ts";

const header = { id: "doc-1", name: "shopify:product:select", action: "select" };
const addHeader = { id: "doc-2", name: "shopify:cart:lines-update", action: "add" };
const addInput = {
  action: "add",
  context: "product",
  lines: [{ merchandiseId: "gid://shopify/ProductVariant/1", quantity: 1 }],
};

const parse = (value: unknown) => parseStandardEventMessage(JSON.stringify(value), 1);

describe("parseStandardEventMessage", () => {
  it("keeps the line-update input that correlates an add and drops other fields", () => {
    expect(
      parse({
        ...addHeader,
        phase: "input",
        awaited: true,
        extra: "drop",
        input: {
          ...addInput,
          lines: [{ ...addInput.lines[0], attributes: [{ key: "a", value: "b" }] }],
          detail: { drop: true },
        },
      }),
    ).toEqual({
      kind: "standard-event",
      timestamp: 1,
      data: { event: { ...addHeader, phase: "input" }, input: addInput, awaited: true },
    });
  });

  it("keeps settled line-update user errors, including null Storefront API fields", () => {
    const userErrors = [
      { code: "INVALID", field: ["lines", "0", "quantity"], message: "Quantity is invalid." },
      { code: null, field: null, message: "Line is unavailable." },
    ];
    const record = parse({
      ...addHeader,
      phase: "settled",
      result: {
        cart: { id: "gid://shopify/Cart/1", totalQuantity: 0, lines: [] },
        userErrors: userErrors.map((error) => ({ ...error, extra: "drop" })),
        warnings: [{ code: "MERCHANDISE_NOT_ENOUGH_STOCK", message: "Low stock." }],
      },
    });

    expect(record?.data).toEqual({
      event: { ...addHeader, phase: "settled" },
      result: { userErrors },
    });
  });

  it("accepts a settled line update without optional user errors", () => {
    expect(parse({ ...addHeader, phase: "settled", result: { cart: null } })?.data.result).toEqual(
      {},
    );
  });

  it("keeps cart error codes and messages", () => {
    const cartError = { id: "doc-3", name: "shopify:cart:error", action: "error" };

    expect(
      parse({
        ...cartError,
        phase: "input",
        awaited: false,
        input: { code: "INVALID", error: "Invalid line.", extra: "drop" },
      })?.data,
    ).toEqual({
      event: { ...cartError, phase: "input" },
      input: { code: "INVALID", error: "Invalid line." },
      awaited: false,
    });
  });

  it("keeps only the header and phase for other events on purpose", () => {
    const input = parse({
      ...header,
      phase: "input",
      awaited: true,
      input: { product: { id: "gid://shopify/Product/1" }, selectedOptions: "not checked" },
    });
    const settled = parse({ ...header, phase: "settled", result: { variant: { id: "x" } } });

    expect(input?.data).toEqual({ event: { ...header, phase: "input" }, awaited: true });
    expect(settled?.data).toEqual({ event: { ...header, phase: "settled" } });
  });

  it("keeps failed and unsettled diagnostics", () => {
    expect(
      parse({
        ...header,
        phase: "failed",
        error: { name: "TypeError", message: "boom", stack: "x" },
      })?.data,
    ).toEqual({
      event: { ...header, phase: "failed" },
      error: { name: "TypeError", message: "boom" },
    });
    expect(parse({ ...header, phase: "failed" })?.data.error).toEqual({ message: "Unknown error" });
    expect(parse({ ...header, phase: "unsettled", reason: "document-gone" })?.data).toEqual({
      event: { ...header, phase: "unsettled" },
      reason: "document-gone",
    });
  });

  it("rejects unknown events, phases, actions, ids, and malformed JSON", () => {
    expect(parse({ ...header, name: "shopify:analytics:custom", phase: "input" })).toBeUndefined();
    expect(parse({ ...header, phase: "done" })).toBeUndefined();
    expect(parse({ ...header, id: "", phase: "input" })).toBeUndefined();
    expect(parse({ ...header, id: 1, phase: "input" })).toBeUndefined();
    expect(
      parse({ ...addHeader, action: "checkout", phase: "input", input: addInput }),
    ).toBeUndefined();
    expect(parseStandardEventMessage("not json")).toBeUndefined();
    expect(parseStandardEventMessage("null")).toBeUndefined();
  });

  it.each([
    ["a header action that differs from the input", { ...addHeader, action: "remove" }],
    ["a string quantity", { input: { ...addInput, lines: [{ quantity: "1" }] } }],
    ["lines that are not an array", { input: { ...addInput, lines: "all" } }],
    ["a null line", { input: { ...addInput, lines: [null] } }],
    ["no input", { input: undefined }],
    ["a non-boolean awaited", { awaited: "yes" }],
  ])("rejects a line-update input with %s", (_case, override) => {
    expect(parse({ ...addHeader, phase: "input", input: addInput, ...override })).toBeUndefined();
  });

  it.each([
    ["no result", undefined],
    ["a null result", null],
    ["string user errors", { userErrors: "rejected" }],
    ["a numeric user error message", { userErrors: [{ message: 1 }] }],
    ["a string user error field", { userErrors: [{ field: "quantity", message: "x" }] }],
  ])("rejects a settled line update with %s", (_case, result) => {
    expect(parse({ ...addHeader, phase: "settled", result })).toBeUndefined();
  });

  it("rejects wrong types in other retained fields", () => {
    const cartError = { id: "doc-3", name: "shopify:cart:error", action: "error" };

    expect(parse({ ...cartError, phase: "input", input: { code: 1 } })).toBeUndefined();
    expect(parse({ ...header, phase: "failed", error: "boom" })).toBeUndefined();
    expect(parse({ ...header, phase: "failed", error: { name: 1, message: "x" } })).toBeUndefined();
    expect(parse({ ...header, phase: "unsettled", reason: 1 })).toBeUndefined();
  });

  it("does not copy prototype keys from the message", () => {
    const message = `{"id":"doc-2","name":"shopify:cart:lines-update","action":"add","phase":"input","__proto__":{"polluted":true},"input":{"action":"add","constructor":{"prototype":{"polluted":true}},"lines":[{"__proto__":{"polluted":true},"quantity":1}]}}`;
    const record = parseStandardEventMessage(message, 1);

    expect(record?.data).toEqual({
      event: { ...addHeader, phase: "input" },
      input: { action: "add", lines: [{ quantity: 1 }] },
      awaited: false,
    });
    expect(Object.getPrototypeOf(record?.data)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(record?.data.input)).toBe(Object.prototype);
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("rejects an otherwise valid event message over the size limit before parsing", () => {
    // A valid add whose extra field (dropped by the parser) sizes the message.
    const sized = (length: number) => {
      const event = { ...addHeader, phase: "input", awaited: true, input: addInput, extra: "" };
      const message = JSON.stringify({
        ...event,
        extra: "x".repeat(length - JSON.stringify(event).length),
      });
      expect(message).toHaveLength(length);
      return message;
    };

    expect(parseStandardEventMessage(sized(MAX_STANDARD_EVENT_MESSAGE_BYTES))).toMatchObject({
      data: { event: { name: "shopify:cart:lines-update", phase: "input" } },
    });
    expect(parseStandardEventMessage(sized(MAX_STANDARD_EVENT_MESSAGE_BYTES + 1))).toBeUndefined();
  });

  it("truncates strings, ids, and arrays before it checks items", () => {
    const record = parse({
      ...addHeader,
      id: "i".repeat(100),
      phase: "input",
      input: {
        action: "add",
        context: "c".repeat(600),
        // Items past the limit are cut before they are checked, as the browser recorder does.
        lines: [
          ...Array.from({ length: 50 }, () => ({ merchandiseId: "m".repeat(600), quantity: 1 })),
          { quantity: "not checked" },
        ],
      },
    });
    const input = record?.data.input as
      | { context?: string; lines?: { merchandiseId?: string }[] }
      | undefined;

    expect(record?.data.event.id).toHaveLength(64);
    expect(input?.context).toHaveLength(500);
    expect(input?.lines).toHaveLength(50);
    expect(input?.lines?.[0]?.merchandiseId).toHaveLength(500);
  });
});

describe("unsettledStandardEvent", () => {
  it("marks the event unsettled with a reason", () => {
    expect(
      unsettledStandardEvent(
        { ...header, name: "shopify:product:select", phase: "input" },
        "session-closed",
        2,
      ),
    ).toEqual({
      kind: "standard-event",
      timestamp: 2,
      data: { event: { ...header, phase: "unsettled" }, reason: "session-closed" },
    });
  });
});

describe("standardEventsRecorderScript", () => {
  it("is valid JavaScript that embeds the binding name safely", () => {
    const script = standardEventsRecorderScript('binding"name', ["shopify:cart:error"]);

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain(JSON.stringify('binding"name'));
    // Listeners are built for the selected names only.
    expect(script).toContain('"shopify:cart:error"');
    expect(script).not.toContain('"shopify:product:view"');
  });
});
