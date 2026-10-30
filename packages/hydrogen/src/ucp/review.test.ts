import { expect, it, vi } from "vitest";

import fixture from "./__fixtures__/estimated-totals-mixed-messages.json";
import { cartPayloadToUcpUpdate, ucpCartToCartData } from "./mapping";
import { createUcpCartTransport, type UcpCartTransportOptions } from "./transport";
import type { UcpCart } from "./types";
const child: UcpCart = {
  ...fixture.response,
  messages: [],
  discounts: { codes: ["SAVE"], applied: [{ title: "SAVE" }] },
};
it("preserves string discount codes from the protocol fixture", () => {
  const cart = fixture.response as UcpCart;
  const update = cartPayloadToUcpUpdate(cart, {});
  expect(update.discounts?.codes).toEqual(cart.discounts?.codes);
  expect(JSON.stringify(update)).not.toContain("null");
  expect(ucpCartToCartData(child).discountCodes).toEqual([{ code: "SAVE", applicable: true }]);
});
it.each(["{", "[]", '{"":"id"}', '{"shop":""}', '{"shop":1}'])(
  "rejects invalid opaque ID %s",
  async (cartId) => {
    const t = createUcpCartTransport({ call: vi.fn(), resolveShop: () => "" });
    await expect(t.getCart({ cartId })).rejects.toThrow("Invalid UCP cart ID");
  },
);
it("applies a new shop when another shop rejects", async () => {
  const call = vi.fn<UcpCartTransportOptions["call"]>(async (op, args) => {
    if (op === "get_cart") return child;
    if (args.shop === "old") throw new Error("offline");
    return { ...child, id: "new-child" };
  });
  const t = createUcpCartTransport({ call, resolveShop: () => "new" });
  const result = await t.updateCart({
    cartId: JSON.stringify({ old: child.id }),
    lines: [{ merchandiseId: "new-item", quantity: 1 }],
    discountCodes: ["SAVE"],
  });
  expect(JSON.parse(result.cart.id ?? "{}")).toEqual({ old: child.id, new: "new-child" });
  expect(result.userErrors).toContainEqual(expect.objectContaining({ field: ["shops", "old"] }));
  expect(call).toHaveBeenCalledWith(
    "create_cart",
    expect.objectContaining({ shop: "new" }),
    expect.anything(),
  );
});
it("drops dead children on reads and updates", async () => {
  const call = vi.fn<UcpCartTransportOptions["call"]>(async (_op, args) =>
    args.shop === "dead" ? { ...child, messages: [{ type: "error", content: "expired" }] } : child,
  );
  const t = createUcpCartTransport({ call, resolveShop: () => "live" });
  const cartId = JSON.stringify({ dead: "expired", live: child.id });
  const read = await t.getCart({ cartId });
  expect(JSON.parse(read.cart?.id ?? "{}")).toEqual({ live: child.id });
  expect(read).toHaveProperty("userErrors", [
    expect.objectContaining({ field: ["shops", "dead"] }),
  ]);
  const result = await t.updateCart({ cartId, discountCodes: ["NEW"] });
  expect(JSON.parse(result.cart.id ?? "{}")).toEqual({ live: child.id });
  expect(result.userErrors).toContainEqual(expect.objectContaining({ field: ["shops", "dead"] }));
});
it("serializes overlapping adds and resolves the seller before known merchandise", async () => {
  let remote = structuredClone(child);
  const call = vi.fn<UcpCartTransportOptions["call"]>(async (op, args) => {
    if (op === "get_cart") return structuredClone(remote);
    await Promise.resolve();
    remote = {
      ...remote,
      line_items: (args.cart?.line_items ?? []).map((l, i) => ({
        ...l,
        id: l.id || `new-${i}`,
        item: { ...l.item, title: "item", price: 100 },
        totals: [{ type: "total", amount: 100 }],
      })),
    };
    return structuredClone(remote);
  });
  const resolveShop = vi.fn(() => "shop");
  const t = createUcpCartTransport({ call, resolveShop });
  const cartId = JSON.stringify({ shop: child.id });
  await Promise.all([
    t.updateCart({ cartId, lines: [{ merchandiseId: "x", quantity: 1 }] }),
    t.updateCart({ cartId, lines: [{ merchandiseId: "x", quantity: 1 }] }),
  ]);
  expect(remote.line_items.find((l) => l.item.id === "x")?.quantity).toBe(2);
  expect(resolveShop).toHaveBeenCalledTimes(2);
});
it("aggregates mixed currencies and applies discounts to both shops", async () => {
  const call = vi.fn<UcpCartTransportOptions["call"]>(async (_op, args) => ({
    ...child,
    currency: args.shop === "usd" ? "USD" : "JPY",
  }));
  const t = createUcpCartTransport({ call, resolveShop: () => "" });
  const result = await t.updateCart({
    cartId: JSON.stringify({ usd: "a", jpy: "b" }),
    discountCodes: ["BOTH"],
  });
  expect(result.cart).not.toHaveProperty("cost");
  expect(call.mock.calls.filter(([op]) => op === "update_cart")).toHaveLength(2);
  for (const [op, args] of call.mock.calls)
    if (op === "update_cart") expect(args.cart?.discounts?.codes).toEqual(["BOTH"]);
});
it("rethrows abort and complete network failure", async () => {
  const abort = new DOMException("cancelled", "AbortError");
  const call = vi.fn<UcpCartTransportOptions["call"]>().mockRejectedValue(abort);
  const t = createUcpCartTransport({ call, resolveShop: () => "shop" });
  await expect(t.updateCart({ lines: [{ merchandiseId: "x", quantity: 1 }] })).rejects.toBe(abort);
  call.mockRejectedValue(new Error("offline"));
  await expect(t.updateCart({ lines: [{ merchandiseId: "x", quantity: 1 }] })).rejects.toThrow(
    "UCP request failed",
  );
});
it("prefers resolved seller and falls back when resolution is empty", async () => {
  const call = vi.fn<UcpCartTransportOptions["call"]>().mockResolvedValue(child);
  const resolveShop = vi.fn().mockReturnValueOnce("new").mockReturnValueOnce("");
  const t = createUcpCartTransport({ call, resolveShop });
  const payload = {
    cartId: JSON.stringify({ known: child.id }),
    lines: [{ merchandiseId: child.line_items[0]?.item.id, quantity: 1 }],
  };
  await t.updateCart(payload);
  expect(call).toHaveBeenCalledWith(
    "create_cart",
    expect.objectContaining({ shop: "new" }),
    expect.anything(),
  );
  call.mockClear();
  await t.updateCart(payload);
  expect(call).toHaveBeenCalledWith(
    "update_cart",
    expect.objectContaining({ shop: expect.any(String) }),
    expect.anything(),
  );
});
it("uses the line index for an unknown id", async () => {
  const t = createUcpCartTransport({ call: vi.fn(), resolveShop: () => "" });
  expect(
    (await t.updateCart({ lines: [{ id: "unknown", quantity: 1 }] })).userErrors,
  ).toContainEqual(expect.objectContaining({ field: ["lines", "0"] }));
});
