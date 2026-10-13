import { describe, it, expect } from "vitest";

import { sanitizeQuantity, DEFAULT_MINIMUM_QUANTITY, NO_QUANTITY_LIMIT } from "./quantity";

describe("sanitizeQuantity", () => {
  describe("valid numeric inputs", () => {
    it("returns the value when already a valid integer", () => {
      expect(sanitizeQuantity(5)).toBe(5);
    });

    it("parses a numeric string", () => {
      expect(sanitizeQuantity("7")).toBe(7);
    });

    it("trims whitespace from string input", () => {
      expect(sanitizeQuantity(" 7 ")).toBe(7);
    });

    it("rounds a float to the nearest integer", () => {
      expect(sanitizeQuantity(3.7)).toBe(4);
    });

    it("rounds down when fractional part is below .5", () => {
      expect(sanitizeQuantity(3.2)).toBe(3);
    });
  });

  describe("unparseable inputs fall back to min", () => {
    it("returns min for NaN", () => {
      expect(sanitizeQuantity(NaN)).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("returns min for null", () => {
      expect(sanitizeQuantity(null)).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("returns min for undefined", () => {
      expect(sanitizeQuantity(undefined)).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("returns min for empty string", () => {
      expect(sanitizeQuantity("")).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("returns min for non-numeric string", () => {
      expect(sanitizeQuantity("abc")).toBe(DEFAULT_MINIMUM_QUANTITY);
    });
  });

  describe("clamping", () => {
    it("clamps negative values to min", () => {
      expect(sanitizeQuantity(-3)).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("clamps to custom max", () => {
      expect(sanitizeQuantity(10, { max: 4 })).toBe(4);
    });

    it("clamps zero to default min of 1", () => {
      expect(sanitizeQuantity(0)).toBe(DEFAULT_MINIMUM_QUANTITY);
    });

    it("allows zero when min is explicitly 0", () => {
      expect(sanitizeQuantity(0, { min: 0 })).toBe(0);
    });

    it("clamps to custom min", () => {
      expect(sanitizeQuantity(1, { min: 3 })).toBe(3);
    });
  });

  describe("constants", () => {
    it("DEFAULT_MINIMUM_QUANTITY is 1", () => {
      expect(DEFAULT_MINIMUM_QUANTITY).toBe(1);
    });

    it("NO_QUANTITY_LIMIT is Infinity", () => {
      expect(NO_QUANTITY_LIMIT).toBe(Infinity);
    });
  });
});
