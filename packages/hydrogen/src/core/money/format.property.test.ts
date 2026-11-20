import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { formatMoney } from "./format";

const locale = fc.constantFrom("en-US", "en-IN", "fr-CA", "de-CH", "ja-JP", "ar-EG", "he-IL");

/**
 * Decimal amounts in the spellings the Storefront API uses, such as `19.99`, `5.0`, and `-0.5`.
 * Negative zero is left out: it formats as `-$0.00`, which is a separate question.
 */
const amount = fc
  .tuple(
    fc.constantFrom("", "-"),
    fc.nat({ max: 10_000_000 }),
    fc.constantFrom("", ".0", ".5", ".05", ".99", ".999"),
  )
  .map(([sign, whole, fraction]) => `${sign}${whole}${fraction}`)
  .filter((text) => !Object.is(Number(text), -0));

const knownCurrency = fc.constantFrom("USD", "CAD", "EUR", "JPY", "KWD", "usd");
/** A known code, an unknown three-letter code, a code such as USDC, or any other text. */
const currencyCode = fc.oneof(
  knownCurrency,
  fc.stringMatching(/^[A-Za-z]{3}$/),
  fc.stringMatching(/^[A-Z]{4,5}$/),
  fc.string(),
);

const displayOptions = fc.record(
  {
    locale,
    withoutCurrency: fc.boolean(),
    withoutTrailingZeros: fc.boolean(),
    currencyDisplay: fc.constantFrom("symbol", "narrowSymbol", "code", "name"),
  },
  { requiredKeys: ["locale"] },
);

/** Either fraction-digit limit, or both in a valid order, or neither. */
const fractionDigits = fc
  .record(
    { minimumFractionDigits: fc.nat({ max: 20 }), maximumFractionDigits: fc.nat({ max: 20 }) },
    { requiredKeys: [] },
  )
  .filter(
    ({ minimumFractionDigits: minimum, maximumFractionDigits: maximum }) =>
      minimum === undefined || maximum === undefined || minimum <= maximum,
  );

const LAZY_FIELDS = [
  "amount",
  "currencySymbol",
  "currencyNarrowSymbol",
  "currencyName",
  "withoutTrailingZeros",
  "withoutTrailingZerosAndCurrency",
] as const;

describe("formatMoney", () => {
  it("formats any price with any valid display options, and its parts spell the result", () => {
    fc.assert(
      fc.property(
        amount,
        currencyCode,
        displayOptions,
        fractionDigits,
        (price, currency, options, digits) => {
          const formatted = formatMoney(
            { amount: price, currencyCode: currency },
            { ...options, ...digits },
          );

          expect(formatted.parts.map((part) => part.value).join("")).toBe(
            formatted.localizedString,
          );
          expect(formatted.numericAmount).toBe(Number(price));
          // Each of these formats on first read.
          for (const field of LAZY_FIELDS) expect(formatted[field]).toBeTypeOf("string");
        },
      ),
    );
  });

  it("shows a range from its lowest to its highest price, whatever the order of the prices", () => {
    fc.assert(
      fc.property(
        fc.array(amount, { minLength: 1, maxLength: 5 }),
        knownCurrency,
        displayOptions,
        (amounts, currency, options) => {
          const prices = amounts.map((price) => ({ amount: price, currencyCode: currency }));
          const ascending = prices.toSorted(
            (left, right) => Number(left.amount) - Number(right.amount),
          );
          const lowest = ascending[0];
          const highest = ascending[ascending.length - 1];

          const range = formatMoney(prices, options);

          expect(Number(range.min.amount)).toBe(Number(lowest.amount));
          expect(Number(range.max.amount)).toBe(Number(highest.amount));
          expect(range.localizedString).toBe(
            formatMoney([lowest, highest], options).localizedString,
          );
          expect(range.localizedString).toBe(
            formatMoney([highest, lowest], options).localizedString,
          );
        },
      ),
    );
  });
});
