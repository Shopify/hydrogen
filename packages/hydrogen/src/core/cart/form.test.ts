import { describe, it, expect } from "vitest";

import { createCartFormRegister, getCartLineAttributes } from "./form";
import { EMPTY_CART_STATE } from "./state";

describe("getCartLineAttributes", () => {
  const line = { id: "line-1", quantity: 2, merchandise: { id: "variant-1" } };

  it("describes the merchandise and quantity without a busy key while idle", () => {
    expect(getCartLineAttributes(line, EMPTY_CART_STATE)).toEqual({
      "data-shopify-testid": "cart-line",
      "data-shopify-merchandise-id": "variant-1",
      "data-shopify-quantity": "2",
      "data-shopify-pending": "false",
    });
  });

  it("marks only the pending line, then omits aria-busy after settlement", () => {
    const pending = { ...EMPTY_CART_STATE.pending, lines: new Set([line.id]) };
    expect(getCartLineAttributes(line, { pending })).toMatchObject({
      "data-shopify-pending": "true",
      "aria-busy": "true",
    });
    expect(getCartLineAttributes({ ...line, id: "other" }, { pending })).not.toHaveProperty(
      "aria-busy",
    );
    expect(getCartLineAttributes(line, EMPTY_CART_STATE)).not.toHaveProperty("aria-busy");
  });

  it("describes an optimistic removal with quantity zero without changing its inputs", () => {
    const removed = { ...line, quantity: 0 };
    const pending = { ...EMPTY_CART_STATE.pending, lines: new Set([line.id]) };
    expect(getCartLineAttributes(removed, { pending })).toMatchObject({
      "data-shopify-quantity": "0",
      "data-shopify-pending": "true",
    });
    expect(removed.quantity).toBe(0);
    expect([...pending.lines]).toEqual([line.id]);
  });

  it.each([undefined, null])("uses an empty ID for missing merchandise %s", (merchandise) => {
    expect(
      getCartLineAttributes({ ...line, merchandise }, EMPTY_CART_STATE)[
        "data-shopify-merchandise-id"
      ],
    ).toBe("");
  });
});

describe("createCartFormRegister", () => {
  const register = createCartFormRegister();

  describe("field registers", () => {
    it("lineId returns name and value", () => {
      const result = register("lineId", { value: "gid://shopify/CartLine/123" });
      expect(result).toEqual({
        name: "lineId",
        value: "gid://shopify/CartLine/123",
        readOnly: true,
      });
    });

    it("quantity returns name and stringified value", () => {
      const result = register("quantity", { value: 5 });
      expect(result).toEqual({
        name: "quantity",
        value: "5",
        "data-shopify-testid": "cart-line-quantity",
      });
    });

    it("quantity defaultValue and explicit noninteractive overloads keep the signifier", () => {
      expect(register("quantity", { defaultValue: 2 })).toEqual({
        name: "quantity",
        defaultValue: "2",
        "data-shopify-testid": "cart-line-quantity",
      });
      expect(register("quantity", { value: "3", interactive: false })).toEqual({
        name: "quantity",
        value: "3",
        "data-shopify-testid": "cart-line-quantity",
      });
    });

    it("discountCode returns name and value", () => {
      const result = register("discountCode", { value: "SAVE10" });
      expect(result).toEqual({ name: "discountCode", value: "SAVE10" });
    });

    it("merchandiseId returns name and value", () => {
      const result = register("merchandiseId", {
        value: "gid://shopify/ProductVariant/123",
      });
      expect(result).toEqual({
        name: "merchandiseId",
        value: "gid://shopify/ProductVariant/123",
      });
    });

    it("note returns name and value", () => {
      const result = register("note", { value: "Please gift wrap" });
      expect(result).toEqual({ name: "note", value: "Please gift wrap" });
    });

    it("sellingPlanId returns name and value", () => {
      const result = register("sellingPlanId", {
        value: "gid://shopify/SellingPlan/123",
      });
      expect(result).toEqual({
        name: "sellingPlanId",
        value: "gid://shopify/SellingPlan/123",
      });
    });

    it("discountCode with defaultValue returns name and defaultValue", () => {
      const result = register("discountCode", { defaultValue: "" });
      expect(result).toEqual({ name: "discountCode", defaultValue: "" });
    });

    it("note with defaultValue returns name and defaultValue", () => {
      const result = register("note", { defaultValue: "gift wrap" });
      expect(result).toEqual({ name: "note", defaultValue: "gift wrap" });
    });

    it("attribute values encode their key in the field name", () => {
      expect(
        register("attributeValue", {
          key: "gift-message",
          defaultValue: "Happy birthday!",
        }),
      ).toEqual({
        name: "attributes.gift-message",
        defaultValue: "Happy birthday!",
      });
    });

    it("rejects an empty attribute key", () => {
      expect(() => register("attributeValue", { key: "", value: "Happy birthday!" })).toThrow(
        /non-empty "key"/,
      );
    });

    it("sellingPlanId returns name and value", () => {
      const result = register("sellingPlanId", {
        value: "gid://shopify/SellingPlan/1",
      });
      expect(result).toEqual({
        name: "sellingPlanId",
        value: "gid://shopify/SellingPlan/1",
      });
    });
  });

  describe("intent registers", () => {
    it("add returns intent", () => {
      expect(register("add")).toEqual({ name: "intent", value: "add" });
    });

    it("increase returns intent", () => {
      expect(register("increase")).toEqual({
        name: "intent",
        value: "increase",
        "data-shopify-testid": "cart-line-increase",
      });
    });

    it("decrease returns intent", () => {
      expect(register("decrease")).toEqual({
        name: "intent",
        value: "decrease",
        "data-shopify-testid": "cart-line-decrease",
      });
    });

    it("remove returns intent", () => {
      expect(register("remove")).toEqual({
        name: "intent",
        value: "remove",
        "data-shopify-testid": "cart-line-remove",
      });
    });

    it("discount-apply returns intent", () => {
      expect(register("discount-apply")).toEqual({ name: "intent", value: "discount-apply" });
    });

    it("discount-remove returns intent", () => {
      expect(register("discount-remove")).toEqual({
        name: "intent",
        value: "discount-remove",
      });
    });

    it("note-update returns intent", () => {
      expect(register("note-update")).toEqual({
        name: "intent",
        value: "note-update",
      });
    });

    it("attributes-update returns intent", () => {
      expect(register("attributes-update")).toEqual({
        name: "intent",
        value: "attributes-update",
      });
    });

    it("set returns hidden submit button attributes with data marker", () => {
      expect(register("set")).toEqual({
        name: "intent",
        value: "set",
        type: "submit",
        hidden: true,
      });
    });
  });

  describe("interactive quantity", () => {
    it("returns extended attributes when interactive is true", () => {
      const result = register("quantity", { value: 3, interactive: true });
      expect(result).toEqual({
        "data-shopify-testid": "cart-line-quantity",
        name: "quantity",
        value: "3",
        type: "text",
        inputMode: "numeric",
        pattern: "\\d+",
        autoComplete: "off",
        autoCorrect: "off",
      });
    });

    it("returns only name and value when interactive is not set", () => {
      const result = register("quantity", { value: 3 });
      expect(result).toEqual({
        name: "quantity",
        value: "3",
        "data-shopify-testid": "cart-line-quantity",
      });
      expect(result).not.toHaveProperty("type");
    });
  });
});
