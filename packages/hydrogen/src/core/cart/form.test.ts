import { describe, it, expect } from "vitest";

import { createCartFormRegister } from "./form";

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
      expect(result).toEqual({ name: "quantity", value: "5" });
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
      expect(register("increase")).toEqual({ name: "intent", value: "increase" });
    });

    it("decrease returns intent", () => {
      expect(register("decrease")).toEqual({ name: "intent", value: "decrease" });
    });

    it("remove returns intent", () => {
      expect(register("remove")).toEqual({ name: "intent", value: "remove" });
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
      expect(result).toEqual({ name: "quantity", value: "3" });
      expect(result).not.toHaveProperty("type");
    });
  });
});
