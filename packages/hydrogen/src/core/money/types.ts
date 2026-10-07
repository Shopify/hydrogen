/**
 * A price with an amount and a currency code, in the MoneyV2 shape that the Storefront API and Customer Account API return.
 * The currency code accepts any string, including Customer Account API currencies such as USDC
 * that the Storefront API currency enum doesn't list.
 */
export type MoneyV2 = {
  /** Decimal amount as a string, such as `"19.99"`. formatMoney throws an error when the amount doesn't parse as a number. */
  amount: string;
  /**
   * Currency code, such as `"USD"`, in any letter case.
   *
   * A code that isn't three letters formats as a decimal amount followed by the code, such as `19.00 USDC`. An unrecognized three-letter code appears as the code, such as `XYZ 19.00`.
   */
  currencyCode: string;
};

/** Locale and display settings for a formatted price or price range. */
export type FormatMoneyOptions = {
  /**
   * BCP 47 locale, such as `"en-US"`, `"fr-CA"`, or `"ja-JP"`.
   *
   * In market-aware storefronts, pass the active market's locale. A hardcoded `"en-US"` formats every market as US English.
   */
  locale: string;

  /** Pass `true` to leave out the currency symbol or code. Defaults to `false`. */
  withoutCurrency?: boolean;

  /**
   * Pass `true` to drop the fraction digits of a whole amount, such as `$19.00` to `$19`. Amounts with a fraction keep their digits.
   *
   * Defaults to `false`. For a range, defaults to `true` when every price is a whole amount and you set neither fraction digit option.
   */
  withoutTrailingZeros?: boolean;

  /** Fewest fraction digits to show. Defaults to the currency's standard number of digits, such as 0 for JPY. Output without a currency symbol defaults to 2. */
  minimumFractionDigits?: number;

  /** Most fraction digits to show. Defaults to the currency's standard number of digits, such as 0 for JPY. Output without a currency symbol defaults to 2. */
  maximumFractionDigits?: number;

  /**
   * How the currency appears: `"symbol"`, `"narrowSymbol"`, `"code"`, or `"name"`. Defaults to `"symbol"`.
   *
   * In the `en-US` locale, the `"symbol"` value tells dollar currencies apart, such as `CA$5.00`. The `"narrowSymbol"` value shows `$5.00` for every dollar currency.
   */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
};

/** A formatted price, with structured parts for custom price layouts. */
export type FormattedMoney = {
  /** Formatted price, such as `$1,299.00`. */
  localizedString: string;

  /** Formatted number without the currency, such as `1,299.00` or `-19.99`. */
  amount: string;

  /** Currency part of the formatted price, such as `$`, `€`, or `CA$`. Follows the `currencyDisplay` option. For a code that isn't three letters, holds the code. For other codes, empty when `withoutCurrency` is `true`. */
  currencySymbol: string;

  /** Narrow currency symbol, such as `$` for both USD and CAD. For a code that isn't three letters, holds the code. */
  currencyNarrowSymbol: string;

  /** Currency name in the locale's language, such as `US dollars`. Falls back to the currency code. */
  currencyName: string;

  /** Amount as a number. */
  numericAmount: number;

  /** Typed pieces of the formatted price, such as the currency, integer, and fraction, for custom layouts. */
  parts: Intl.NumberFormatPart[];

  /** Formatted price without the fraction digits of a whole amount, such as `$19`. */
  withoutTrailingZeros: string;

  /** Formatted amount without the currency and without the fraction digits of a whole amount, such as `19`. */
  withoutTrailingZerosAndCurrency: string;

  /** Returns the formatted price. Template literals and string concatenation call the method for you. */
  toString(): string;
};

/** A formatted price range, with its lowest and highest prices. */
export type FormattedMoneyRange = {
  /** The formatted range, such as `$10 – $19`. */
  localizedString: string;

  /** Lowest price in the input. */
  min: MoneyV2;

  /** Highest price in the input. */
  max: MoneyV2;

  /** Currency code that every price in the range shares, in uppercase. */
  currencyCode: string;

  /** Returns the formatted range. Template literals and string concatenation call the method for you. */
  toString(): string;
};
