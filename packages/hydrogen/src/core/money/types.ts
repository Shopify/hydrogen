/**
 * Matches the Storefront API's MoneyV2 shape.
 * Uses `string` for currencyCode instead of the generated CurrencyCode enum
 * so the utility also accepts Customer Account API currencies (e.g. USDC)
 * that may not be in the Storefront API's enum.
 */
export type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

export type FormatMoneyOptions = {
  /** BCP 47 locale string. e.g. 'en-US', 'fr-CA', 'ja-JP'. */
  locale: string;

  /** Omit the currency symbol/code from the output. */
  withoutCurrency?: boolean;

  /** Strip trailing fractional zeros. '$19.00' → '$19'. */
  withoutTrailingZeros?: boolean;

  /** Override Intl minimumFractionDigits. */
  minimumFractionDigits?: number;

  /** Override Intl maximumFractionDigits. */
  maximumFractionDigits?: number;

  /**
   * Intl.NumberFormat currencyDisplay option.
   * 'symbol' (default) | 'narrowSymbol' | 'code' | 'name'
   *
   * 'narrowSymbol' is useful for disambiguating $ across CAD/AUD/USD.
   */
  currencyDisplay?: Intl.NumberFormatOptions["currencyDisplay"];
};

export type FormattedMoney = {
  /** The full locale-formatted string. Also returned by toString(). */
  localizedString: string;

  /** Just the numeric portion, no currency. '19.99' or '1,299.00'. */
  amount: string;

  /** Currency symbol from Intl. '$', '€', '¥', 'CA$', etc. */
  currencySymbol: string;

  /** Narrow symbol. '$' even for CAD. Empty string if unavailable. */
  currencyNarrowSymbol: string;

  /** Full currency name. 'US dollars', 'Canadian dollars'. */
  currencyName: string;

  /** The raw numeric amount as a number. parseFloat(money.amount). */
  numericAmount: number;

  /** The raw Intl.NumberFormat parts array. */
  parts: Intl.NumberFormatPart[];

  /** Formatted string with trailing zeros removed. '$19.00' → '$19'. */
  withoutTrailingZeros: string;

  /** Amount without currency and without trailing zeros. '19.00' → '19'. */
  withoutTrailingZerosAndCurrency: string;

  /** Returns localizedString so the object works in template literals and string concatenation. */
  toString(): string;
};

export type FormattedMoneyRange = {
  /** The full locale-formatted range string. Also returned by toString(). */
  localizedString: string;

  /** Lowest value in the input range after sorting. */
  min: MoneyV2;

  /** Highest value in the input range after sorting. */
  max: MoneyV2;

  /** Shared currency code for every range member. */
  currencyCode: string;

  /** Returns localizedString so the object works in template literals and string concatenation. */
  toString(): string;
};
