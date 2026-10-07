/**
 * A price in the Storefront API MoneyV2 shape.
 * The currency code accepts any string, including Customer Account API currencies such as USDC
 * that the Storefront API currency enum doesn't list.
 */
export type MoneyV2 = {
  /** Decimal amount as a string, such as `"19.99"`. The formatter throws when the amount doesn't parse as a number. */
  amount: string;
  /**
   * Currency code, such as `"USD"`. The formatter ignores letter case.
   *
   * A code that isn't three letters formats as a decimal amount followed by the code, such as `19.00 USDC`. A three-letter code that Intl doesn't recognize renders as the code, such as `XYZ 19.00`.
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

  /** When `true`, the output omits the currency symbol or code. */
  withoutCurrency?: boolean;

  /**
   * When `true`, the formatter drops the fraction digits of a whole amount, such as `$19.00` to `$19`. Amounts with a fraction keep their digits.
   *
   * For a range, the option defaults to `true` when every price is a whole amount and you set neither fraction digit option.
   */
  withoutTrailingZeros?: boolean;

  /** Minimum number of fraction digits. When the output has no currency, the default is 2. Otherwise Intl uses the currency's default. */
  minimumFractionDigits?: number;

  /** Maximum number of fraction digits. When the output has no currency, the default is 2. Otherwise Intl uses the currency's default. */
  maximumFractionDigits?: number;

  /**
   * How the currency appears: `"symbol"`, `"narrowSymbol"`, `"code"`, or `"name"`. Defaults to `"symbol"`.
   *
   * The `"symbol"` value tells dollar currencies apart, such as `CA$5.00`. The `"narrowSymbol"` value renders `$5.00` for every dollar currency.
   */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
};

/** A formatted price, with structured parts for custom price layouts. */
export type FormattedMoney = {
  /** The formatted string, such as `$1,299.00`. */
  localizedString: string;

  /** Numeric part of the formatted string, with group and decimal separators, such as `1,299.00`. */
  amount: string;

  /** Currency part of the formatted string, such as `$`, `€`, or `CA$`. The value follows `currencyDisplay` and is empty when `withoutCurrency` is `true`. A code that isn't three letters returns the code. */
  currencySymbol: string;

  /** Narrow currency symbol, such as `$` for both USD and CAD. A code that isn't three letters returns the code. */
  currencyNarrowSymbol: string;

  /** Currency name in the locale's language, such as `US dollars`. Falls back to the currency code. */
  currencyName: string;

  /** Amount as a number. */
  numericAmount: number;

  /** Intl.NumberFormat parts of the formatted string, for custom layouts. */
  parts: Intl.NumberFormatPart[];

  /** Formatted string without the fraction digits of a whole amount, such as `$19`. */
  withoutTrailingZeros: string;

  /** Formatted amount without the currency and without the fraction digits of a whole amount, such as `19`. */
  withoutTrailingZerosAndCurrency: string;

  /** Returns the formatted string. Template literals and string concatenation call this method. */
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

  /** Currency code of every price in the range, in uppercase. */
  currencyCode: string;

  /** Returns the formatted range. Template literals and string concatenation call this method. */
  toString(): string;
};
