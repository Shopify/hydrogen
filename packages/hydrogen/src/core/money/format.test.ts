import { describe, it, expect } from "vitest";

import { formatMoney } from "./format";

describe("formatMoney", () => {
  describe("toString / template literal", () => {
    it("formats basic USD", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(`${price}`).toBe("$19.99");
    });

    it("localizedString matches toString", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.localizedString).toBe(`${price}`);
    });

    it("formats EUR in French locale", () => {
      const price = formatMoney({ amount: "1299.50", currencyCode: "EUR" }, { locale: "fr-FR" });
      expect(`${price}`).toBe("1\u202f299,50\u00a0€");
    });

    it("formats JPY (zero-decimal currency)", () => {
      const price = formatMoney({ amount: "1500", currencyCode: "JPY" }, { locale: "ja-JP" });
      expect(`${price}`).toBe("\uffe51,500");
    });

    it("uses narrowSymbol for CAD to show $ instead of CA$", () => {
      const price = formatMoney(
        { amount: "49.99", currencyCode: "CAD" },
        { locale: "en-CA", currencyDisplay: "narrowSymbol" },
      );
      expect(`${price}`).toBe("$49.99");
    });

    it("uses default symbol for CAD showing CA$ when viewed from a US locale", () => {
      const price = formatMoney({ amount: "49.99", currencyCode: "CAD" }, { locale: "en-US" });
      expect(`${price}`).toBe("CA$49.99");
    });

    it("falls back to decimal formatting for unsupported currencies", () => {
      const price = formatMoney({ amount: "100.00", currencyCode: "USDC" }, { locale: "en-US" });
      expect(`${price}`).toBe("100.00 USDC");
    });

    it("honors withoutCurrency for the main string", () => {
      const price = formatMoney(
        { amount: "19.99", currencyCode: "USD" },
        { locale: "en-US", withoutCurrency: true },
      );
      expect(`${price}`).toBe("19.99");
    });

    it("honors withoutTrailingZeros for the main string", () => {
      const price = formatMoney(
        { amount: "19.00", currencyCode: "USD" },
        { locale: "en-US", withoutTrailingZeros: true },
      );
      expect(`${price}`).toBe("$19");
    });
  });

  describe("withoutTrailingZeros", () => {
    it("strips trailing zeros from whole amounts", () => {
      const price = formatMoney({ amount: "19.00", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.withoutTrailingZeros).toBe("$19");
    });

    it("preserves non-zero fractions", () => {
      const price = formatMoney({ amount: "19.42", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.withoutTrailingZeros).toBe("$19.42");
    });
  });

  describe("withoutTrailingZerosAndCurrency", () => {
    it("strips both currency and trailing zeros", () => {
      const price = formatMoney({ amount: "19.00", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.withoutTrailingZerosAndCurrency).toBe("19");
    });

    it("strips currency but preserves non-zero fractions", () => {
      const price = formatMoney({ amount: "19.42", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.withoutTrailingZerosAndCurrency).toBe("19.42");
    });
  });

  describe("structured parts", () => {
    it("returns just the numeric amount without currency", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.amount).toBe("19.99");
    });

    it("returns the currency symbol", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.currencySymbol).toBe("$");
    });

    it("returns the narrow currency symbol", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "CAD" }, { locale: "en-CA" });
      expect(price.currencyNarrowSymbol).toBe("$");
    });

    it("returns the full currency name", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.currencyName).toBe("US dollars");
    });

    it("returns Intl.NumberFormat parts", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.parts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "currency", value: "$" }),
          expect.objectContaining({ type: "integer", value: "19" }),
          expect.objectContaining({ type: "decimal", value: "." }),
          expect.objectContaining({ type: "fraction", value: "99" }),
        ]),
      );
    });

    it("uses currency code as symbol for unsupported currencies", () => {
      const price = formatMoney({ amount: "100.00", currencyCode: "USDC" }, { locale: "en-US" });
      expect(price.amount).toBe("100.00");
      expect(price.currencySymbol).toBe("USDC");
      expect(price.currencyName).toBe("USDC");
    });

    it("returns the raw numeric amount as a number", () => {
      const price = formatMoney({ amount: "19.99", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.numericAmount).toBe(19.99);
    });

    it("returns the raw numeric amount for whole numbers", () => {
      const price = formatMoney({ amount: "20.00", currencyCode: "USD" }, { locale: "en-US" });
      expect(price.numericAmount).toBe(20);
    });

    it("returns the raw numeric amount for zero-decimal currencies", () => {
      const price = formatMoney({ amount: "1500", currencyCode: "JPY" }, { locale: "ja-JP" });
      expect(price.numericAmount).toBe(1500);
    });
  });

  describe("validation", () => {
    it("throws on non-numeric amount", () => {
      expect(() =>
        formatMoney({ amount: "not-a-number", currencyCode: "USD" }, { locale: "en-US" }),
      ).toThrow();
    });

    it("throws on empty amount", () => {
      expect(() => formatMoney({ amount: "", currencyCode: "USD" }, { locale: "en-US" })).toThrow();
    });
  });

  describe("ranges", () => {
    it("collapses equal values", () => {
      const price = formatMoney(
        [
          { amount: "25.0", currencyCode: "CAD" },
          { amount: "25.00", currencyCode: "CAD" },
        ],
        { locale: "en-CA" },
      );
      expect(`${price}`).toBe("$25");
    });

    it("sorts unordered values before formatting", () => {
      const price = formatMoney(
        [
          { amount: "30.00", currencyCode: "USD" },
          { amount: "25.00", currencyCode: "USD" },
        ],
        { locale: "en-US" },
      );
      expect(`${price}`).toBe("$25 \u2013 $30");
    });

    it("uses the minimum and maximum from any-length arrays", () => {
      const price = formatMoney(
        [
          { amount: "30.00", currencyCode: "USD" },
          { amount: "10.00", currencyCode: "USD" },
          { amount: "20.00", currencyCode: "USD" },
        ],
        { locale: "en-US" },
      );
      expect(`${price}`).toBe("$10 \u2013 $30");
    });

    it("throws when range values use different currencies", () => {
      expect(() =>
        formatMoney(
          [
            { amount: "25.00", currencyCode: "USD" },
            { amount: "30.00", currencyCode: "CAD" },
          ],
          { locale: "en-US" },
        ),
      ).toThrow();
    });

    it("falls back to decimal ranges for unsupported currencies", () => {
      const price = formatMoney(
        [
          { amount: "100.00", currencyCode: "USDC" },
          { amount: "120.00", currencyCode: "USDC" },
        ],
        { locale: "en-US" },
      );
      expect(`${price}`).toBe("100\u2013120 USDC");
    });
  });
});
