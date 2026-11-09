import { describe, it, expect, vi } from "vitest";

import type { UpdateCartPayload } from "../../../vendor/standard-actions";
import type { StorefrontClient } from "../../client";
import type { CartAction } from "./actions";
import { runCartAction } from "./run-cart-action";
import type { CartReadResult, CartTransport, CartWriteResult } from "./transport";

const CART_ID = "gid://shopify/Cart/123";
const ctx = { storefrontClient: {} as StorefrontClient, customerAccessToken: "token" };
const WRITE_RESULT: CartWriteResult = {
  cart: { id: CART_ID } as CartWriteResult["cart"],
  userErrors: [],
  warnings: [],
  headers: new Headers(),
};

function createTransport(read: Partial<CartReadResult> = {}) {
  const getCart = vi.fn<CartTransport["getCart"]>(async () => ({
    cart: null,
    headers: new Headers(),
    ...read,
  }));
  const updateCart = vi.fn<CartTransport["updateCart"]>(async () => WRITE_RESULT);
  return {
    getCart,
    updateCart,
    transport: { ordering: "concurrent" as const, sellers: false, getCart, updateCart },
  };
}

function cartWithCodes(...codes: string[]): CartReadResult["cart"] {
  return {
    id: CART_ID,
    discountCodes: codes.map((code) => ({ code, applicable: true })),
  } as CartReadResult["cart"];
}

describe("runCartAction", () => {
  const payloadCases: Array<{ action: CartAction; payload: UpdateCartPayload }> = [
    {
      action: { intent: "add", lines: [{ merchandiseId: "v1", quantity: 1 }] },
      payload: { cartId: CART_ID, lines: [{ merchandiseId: "v1", quantity: 1 }] },
    },
    {
      action: { intent: "update", lines: [{ id: "l1", quantity: 3 }] },
      payload: { cartId: CART_ID, lines: [{ id: "l1", quantity: 3 }] },
    },
    {
      action: { intent: "remove", lineIds: ["l1", "l2"] },
      payload: {
        cartId: CART_ID,
        lines: [
          { id: "l1", quantity: 0 },
          { id: "l2", quantity: 0 },
        ],
      },
    },
    {
      action: { intent: "discount-update", discountCodes: ["A", "B"] },
      payload: { cartId: CART_ID, discountCodes: ["A", "B"] },
    },
    {
      action: { intent: "attributes-update", attributes: [{ key: "k", value: "v" }] },
      payload: { cartId: CART_ID, attributes: [{ key: "k", value: "v" }] },
    },
    {
      action: { intent: "note-update", note: "Gift" },
      payload: { cartId: CART_ID, note: "Gift" },
    },
  ];

  it.each(payloadCases)(
    "turns $action.intent into one updateCart call",
    async ({ action, payload }) => {
      const { getCart, updateCart, transport } = createTransport();

      const result = await runCartAction(transport, CART_ID, action, ctx);

      expect(getCart).not.toHaveBeenCalled();
      expect(updateCart).toHaveBeenCalledExactlyOnceWith(payload, ctx);
      expect(result).toBe(WRITE_RESULT);
    },
  );

  it("leaves out the cart ID when an add has no cart, so the transport creates one", async () => {
    const { updateCart, transport } = createTransport();
    const lines = [{ merchandiseId: "v1", quantity: 1 }];

    await runCartAction(transport, null, { intent: "add", lines }, ctx);

    expect(updateCart).toHaveBeenCalledExactlyOnceWith({ lines }, ctx);
  });

  it.each([
    { intent: "discount-apply", code: "NEW", expected: ["SAVE10", "NEW"] },
    { intent: "discount-remove", code: "SAVE10", expected: [] },
  ] as const)(
    "$intent reads the current codes, then writes the new list",
    async ({ intent, code, expected }) => {
      const { getCart, updateCart, transport } = createTransport({
        cart: cartWithCodes("SAVE10"),
      });

      await runCartAction(transport, CART_ID, { intent, code }, ctx);

      expect(getCart).toHaveBeenCalledExactlyOnceWith({ cartId: CART_ID }, ctx);
      expect(updateCart).toHaveBeenCalledExactlyOnceWith(
        { cartId: CART_ID, discountCodes: expected },
        ctx,
      );
    },
  );

  it("applies a discount to a cart the read can't find", async () => {
    const { updateCart, transport } = createTransport({ cart: null });

    await runCartAction(transport, CART_ID, { intent: "discount-apply", code: "NEW" }, ctx);

    expect(updateCart).toHaveBeenCalledExactlyOnceWith(
      { cartId: CART_ID, discountCodes: ["NEW"] },
      ctx,
    );
  });

  it("throws the first read error without writing the discount codes", async () => {
    const { updateCart, transport } = createTransport({
      errors: [{ message: "Throttled" }, { message: "Other" }],
    });

    await expect(
      runCartAction(transport, CART_ID, { intent: "discount-apply", code: "NEW" }, ctx),
    ).rejects.toThrow("Throttled");
    expect(updateCart).not.toHaveBeenCalled();
  });

  it("rejects a non-add action without a cart ID before calling the transport", async () => {
    const { getCart, updateCart, transport } = createTransport();

    await expect(
      runCartAction(transport, null, { intent: "note-update", note: "x" }, ctx),
    ).rejects.toThrow("cartId is required for non-add mutations");
    expect(getCart).not.toHaveBeenCalled();
    expect(updateCart).not.toHaveBeenCalled();
  });
});
