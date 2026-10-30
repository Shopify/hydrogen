import { expect, it, vi } from "vitest";

import fixture from "./__fixtures__/aggregate-read.json";
import { createUcpCartTransport } from "./transport";
import type { UcpCart } from "./types";
it("routes an add and persists the child identifier", async () => {
  const child = fixture.response.carts[0] as UcpCart;
  const call = vi.fn().mockResolvedValue(child);
  const transport = createUcpCartTransport({ call, resolveShop: () => "a.example" });
  const result = await transport.updateCart({ lines: [{ merchandiseId: "new", quantity: 2 }] });
  expect(call).toHaveBeenCalledWith(
    "create_cart",
    {
      shop: "a.example",
      cart: { line_items: [{ item: { id: "new" }, quantity: 2 }], discounts: { codes: [] } },
    },
    { signal: undefined },
  );
  expect(JSON.parse(result.cart.id ?? "null")).toEqual({ "a.example": child.id });
  await transport.getCart({ cartId: result.cart.id });
  expect(call).toHaveBeenLastCalledWith(
    "get_cart",
    { shop: "a.example", id: child.id },
    { signal: undefined },
  );
});
it("updates and removes existing lines, and applies discounts per shop", async () => {
  const child = fixture.response.carts[0] as UcpCart;
  const line = child.line_items[0];
  if (!line) throw new Error("Missing fixture line");
  const call = vi.fn().mockResolvedValue(child);
  const transport = createUcpCartTransport({ call, resolveShop: vi.fn() });
  const cartId = JSON.stringify({ "a.example": child.id });
  await transport.updateCart({
    cartId,
    lines: [{ id: line.id, quantity: 3 }],
    discountCodes: ["SAVE"],
  });
  expect(call).toHaveBeenLastCalledWith(
    "update_cart",
    {
      shop: "a.example",
      id: child.id,
      cart: {
        line_items: [{ id: line.id, item: { id: line.item.id }, quantity: 3 }],
        discounts: { codes: ["SAVE"] },
      },
    },
    { signal: undefined },
  );
  call.mockClear();
  const removed = await transport.updateCart({ cartId, lines: [{ id: line.id, quantity: 0 }] });
  expect(call).toHaveBeenCalledTimes(2);
  expect(call).toHaveBeenLastCalledWith(
    "update_cart",
    {
      shop: "a.example",
      id: child.id,
      cart: {
        line_items: [],
        discounts: {
          codes: (child.discounts?.codes ?? []).filter((code) => typeof code === "string"),
        },
      },
    },
    { signal: undefined },
  );
  expect(removed.cart.id).toBe("{}");
});
it("retains other shops when a child returns errors", async () => {
  const child = fixture.response.carts[0] as UcpCart;
  const call = vi
    .fn()
    .mockResolvedValueOnce(child)
    .mockResolvedValueOnce({
      ...child,
      messages: [{ type: "error", code: "unavailable", content: "Unavailable" }],
    });
  const transport = createUcpCartTransport({ call, resolveShop: () => "a.example" });
  const result = await transport.updateCart({
    cartId: JSON.stringify({ "a.example": child.id }),
    discountCodes: ["SAVE"],
  });
  expect(result.userErrors).toEqual([
    { code: "unavailable", message: "Unavailable", field: ["shops", "a.example"] },
  ]);
  expect("groups" in result.cart && result.cart.groups).toHaveLength(1);
});
it("reports unsupported fields", async () => {
  const transport = createUcpCartTransport({ call: vi.fn(), resolveShop: () => "a.example" });
  expect((await transport.updateCart({ note: "x", attributes: [] })).userErrors).toHaveLength(2);
});
it("throws network failures", async () => {
  const transport = createUcpCartTransport({
    call: vi.fn().mockRejectedValue(new Error("offline")),
    resolveShop: () => "a.example",
  });
  await expect(
    transport.getCart({ cartId: JSON.stringify({ "a.example": "id" }) }),
  ).rejects.toThrow("UCP request failed");
});
