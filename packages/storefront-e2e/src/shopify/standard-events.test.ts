import { describe, expect, it } from "vitest";

import {
  MAX_STANDARD_EVENT_MESSAGE_BYTES,
  parseStandardEventMessage,
  standardEventsRecorderScript,
  unsettledStandardEvent,
} from "./standard-events.ts";

const header = { id: "doc-1", name: "shopify:product:select", action: "select" };

const parse = (value: unknown) => parseStandardEventMessage(JSON.stringify(value));

describe("parseStandardEventMessage", () => {
  it("keeps only the typed input fields", () => {
    const record = parseStandardEventMessage(
      JSON.stringify({
        ...header,
        phase: "input",
        awaited: true,
        input: {
          product: {
            id: "gid://shopify/Product/1",
            handle: "shirt",
            title: "Shirt",
            extra: "drop",
          },
          selectedOptions: [{ name: "Size", value: "M", extra: { nested: true } }],
        },
      }),
      1,
    );

    expect(record).toEqual({
      kind: "standard-event",
      timestamp: 1,
      data: {
        event: { ...header, phase: "input" },
        input: {
          product: { id: "gid://shopify/Product/1", handle: "shirt", title: "Shirt" },
          selectedOptions: [{ name: "Size", value: "M" }],
        },
        awaited: true,
      },
    });
  });

  it("shapes settled results and failures", () => {
    const settled = parseStandardEventMessage(
      JSON.stringify({
        ...header,
        phase: "settled",
        result: {
          variant: {
            id: "gid://shopify/ProductVariant/2",
            availableForSale: true,
            price: { amount: "5.00", currencyCode: "CAD", raw: 1 },
            image: "drop",
          },
        },
      }),
      1,
    );
    const failed = parseStandardEventMessage(
      JSON.stringify({ ...header, phase: "failed", error: { name: "TypeError", message: "boom" } }),
      1,
    );

    expect(settled?.data.result).toEqual({
      variant: {
        id: "gid://shopify/ProductVariant/2",
        availableForSale: true,
        price: { amount: "5.00", currencyCode: "CAD" },
      },
    });
    expect(failed?.data.error).toEqual({ name: "TypeError", message: "boom" });
  });

  it("rejects unknown events, phases, actions, and oversized messages", () => {
    expect(parse({ ...header, name: "shopify:analytics:custom", phase: "input" })).toBeUndefined();
    expect(parse({ ...header, phase: "done" })).toBeUndefined();
    expect(
      parse({ id: "x", name: "shopify:cart:lines-update", action: "checkout", phase: "input" }),
    ).toBeUndefined();
    expect(parseStandardEventMessage("not json")).toBeUndefined();
    expect(
      parseStandardEventMessage("x".repeat(MAX_STANDARD_EVENT_MESSAGE_BYTES + 1)),
    ).toBeUndefined();
  });

  it("bounds strings and arrays", () => {
    const record = parseStandardEventMessage(
      JSON.stringify({
        id: "x",
        name: "shopify:cart:discount-update",
        action: "discount-update",
        phase: "input",
        input: { discountCodes: Array.from({ length: 80 }, () => ({ code: "c".repeat(600) })) },
      }),
    );
    const input = record?.data.input as { discountCodes?: { code: string }[] } | undefined;

    expect(input?.discountCodes).toHaveLength(50);
    expect(input?.discountCodes?.[0]?.code).toHaveLength(500);
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
