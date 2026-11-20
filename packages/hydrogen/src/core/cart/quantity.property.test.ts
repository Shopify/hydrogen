import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { sanitizeQuantity } from "./quantity";

/** The ways JavaScript reads a number from text, including numbers too large for it to store. */
const numberText = fc.oneof(
  fc.double().map(String),
  fc.bigInt().map(String),
  fc.tuple(fc.nat(), fc.nat({ max: 999 })).map(([digits, exponent]) => `${digits}e${exponent}`),
);

/** What a quantity field, a query string, or a caller can pass: number text, junk, and numbers. */
const rawQuantity = fc.oneof(
  { weight: 3, arbitrary: numberText },
  fc.string(),
  fc.double(),
  fc.constantFrom(null, undefined),
);

const bounds = fc
  .tuple(fc.integer({ min: -1_000, max: 1_000 }), fc.nat({ max: 1_000 }))
  .map(([min, range]) => ({ min, max: min + range }));

describe("sanitizeQuantity", () => {
  it("returns a whole number, at least the default minimum, for any input", () => {
    fc.assert(
      fc.property(rawQuantity, (raw) => {
        const quantity = sanitizeQuantity(raw);

        expect(quantity).toSatisfy(Number.isInteger);
        expect(quantity).toBeGreaterThanOrEqual(1);
      }),
    );
  });

  it("returns a whole number within the bounds for any input", () => {
    fc.assert(
      fc.property(rawQuantity, bounds, (raw, { min, max }) => {
        const quantity = sanitizeQuantity(raw, { min, max });

        expect(quantity).toSatisfy(Number.isInteger);
        expect(quantity).toBeGreaterThanOrEqual(min);
        expect(quantity).toBeLessThanOrEqual(max);
      }),
    );
  });

  it("keeps a quantity that is already within the bounds, however it is written", () => {
    const padding = fc.constantFrom("", " ", "\t", "\n");
    const withinBounds = bounds.chain(({ min, max }) =>
      fc.record({
        min: fc.constant(min),
        max: fc.constant(max),
        quantity: fc.integer({ min, max }),
      }),
    );

    fc.assert(
      fc.property(withinBounds, padding, padding, ({ min, max, quantity }, before, after) => {
        expect(sanitizeQuantity(quantity, { min, max })).toBe(quantity);
        expect(sanitizeQuantity(`${before}${quantity}${after}`, { min, max })).toBe(quantity);
      }),
    );
  });
});
