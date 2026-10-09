import { getFormatter } from "./cache";
import type { FormatMoneyOptions, FormattedMoney, FormattedMoneyRange, MoneyV2 } from "./types";

/**
 * Intl.NumberFormat part types that make up the raw numeric amount.
 * Used to extract "19.99" from a formatted string like "$19.99" (or
 * "-19.99" from "-$19.99") by filtering out currency symbols and other
 * non-numeric parts. The minus sign is kept so negative amounts such as
 * refunds and discounts don't render as positive. Literals stay in the set
 * because RTL locales such as he-IL and ar-EG emit the bidi marks that bind
 * the minus sign to the digits as literals. Only the literal next to the
 * currency part, the spacer between number and symbol, is dropped.
 */
const NUMERIC_PART_TYPES = new Set([
  "decimal",
  "fraction",
  "group",
  "integer",
  "literal",
  "minusSign",
]);
const WELL_FORMED_CURRENCY_CODE = /^[a-z]{3}$/i;

type RangeFormatter = Intl.NumberFormat & {
  formatRange?: (start: number, end: number) => string;
};

type MoneyRangeEntry = {
  money: MoneyV2;
  amount: number;
  currencyCode: string;
};

function parseAmount(money: MoneyV2): number {
  const parsed = parseFloat(money.amount);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `formatMoney: "${money.amount}" is not a valid numeric amount for currency ${money.currencyCode}`,
    );
  }
  return parsed;
}

function normalizeCurrencyCode(currencyCode: string): string {
  return currencyCode.toUpperCase();
}

/**
 * Intl accepts well-formed three-letter currency codes and renders unknown ones as codes.
 * Intl throws for malformed codes such as USDC. The formatter formats those as decimals.
 */
function isWellFormedCurrencyCode(currencyCode: string): boolean {
  return WELL_FORMED_CURRENCY_CODE.test(currencyCode);
}

function hasTrailingZeros(amount: number): boolean {
  return amount % 1 === 0;
}

function shouldStripTrailingZeros(amount: number, options: FormatMoneyOptions): boolean {
  return options.withoutTrailingZeros === true && hasTrailingZeros(amount);
}

function hasExplicitFractionDigits(options: FormatMoneyOptions): boolean {
  return options.minimumFractionDigits != null || options.maximumFractionDigits != null;
}

function decimalFractionOptions(options: FormatMoneyOptions): Intl.NumberFormatOptions {
  return {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  };
}

function buildFormatOptions(
  currencyCode: string,
  supported: boolean,
  options: FormatMoneyOptions,
  amount: number,
): Intl.NumberFormatOptions {
  const withoutCurrency = options.withoutCurrency === true || !supported;
  const trailingZeros = shouldStripTrailingZeros(amount, options);

  if (withoutCurrency) {
    return trailingZeros
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : decimalFractionOptions(options);
  }

  return {
    style: "currency",
    currency: currencyCode,
    ...(options.currencyDisplay && { currencyDisplay: options.currencyDisplay }),
    ...(trailingZeros && {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }),
    ...(!trailingZeros &&
      options.minimumFractionDigits != null && {
        minimumFractionDigits: options.minimumFractionDigits,
      }),
    ...(!trailingZeros &&
      options.maximumFractionDigits != null && {
        maximumFractionDigits: options.maximumFractionDigits,
      }),
  };
}

function appendUnsupportedCurrencyCode(formatted: string, currencyCode: string): string {
  return `${formatted} ${currencyCode}`;
}

function extractNumericAmount(parts: Intl.NumberFormatPart[]): string {
  const currency = parts.findIndex((part) => part.type === "currency");
  const isCurrencySpacer = (part: Intl.NumberFormatPart, index: number) =>
    currency !== -1 && part.type === "literal" && Math.abs(index - currency) === 1;

  return parts
    .filter((part, index) => NUMERIC_PART_TYPES.has(part.type) && !isCurrencySpacer(part, index))
    .map((part) => part.value)
    .join("");
}

function findCurrencyPart(parts: Intl.NumberFormatPart[]): string {
  return parts.find((part) => part.type === "currency")?.value ?? "";
}

function formatRange(formatter: Intl.NumberFormat, min: number, max: number): string {
  const rangeFormatter = formatter as RangeFormatter;
  return rangeFormatter.formatRange
    ? rangeFormatter.formatRange(min, max)
    : `${formatter.format(min)} - ${formatter.format(max)}`;
}

function isMoneyRange(money: MoneyV2 | readonly MoneyV2[]): money is readonly MoneyV2[] {
  return Array.isArray(money);
}

function buildRangeOptions(
  currencyCode: string,
  supported: boolean,
  options: FormatMoneyOptions,
  min: number,
  max: number,
): Intl.NumberFormatOptions {
  const wholeRange = hasTrailingZeros(min) && hasTrailingZeros(max);
  const rangeOptions = {
    ...options,
    withoutTrailingZeros:
      wholeRange && (options.withoutTrailingZeros ?? !hasExplicitFractionDigits(options)),
  };

  return buildFormatOptions(currencyCode, supported, rangeOptions, min);
}

function sortMoneyRangeEntries(entries: MoneyRangeEntry[]): MoneyRangeEntry[] {
  const sorted: MoneyRangeEntry[] = [];

  for (const entry of entries) {
    const index = sorted.findIndex((candidate) => entry.amount < candidate.amount);
    if (index === -1) {
      sorted.push(entry);
    } else {
      sorted.splice(index, 0, entry);
    }
  }

  return sorted;
}

/**
 * All structured fields are computed lazily on first access and cached.
 * localizedString is the exception — it's computed eagerly in the constructor
 * so that the common `${price}` path never touches the getter machinery.
 */
class FormattedMoneyValue implements FormattedMoney {
  readonly #amount: number;
  readonly #options: FormatMoneyOptions;
  readonly #currencyCode: string;
  readonly #supported: boolean;
  readonly localizedString: string;

  readonly #defaultFormatter: Intl.NumberFormat;
  #formatterParts?: Intl.NumberFormatPart[];
  #parts?: Intl.NumberFormatPart[];
  #amountString?: string;
  #currencySymbol?: string;
  #currencyNarrowSymbol?: string;
  #currencyName?: string;
  #withoutTrailingZeros?: string;
  #withoutTrailingZerosAndCurrency?: string;

  constructor(money: MoneyV2, options: FormatMoneyOptions) {
    this.#amount = parseAmount(money);
    this.#options = options;
    this.#currencyCode = normalizeCurrencyCode(money.currencyCode);
    this.#supported = isWellFormedCurrencyCode(money.currencyCode);
    this.#defaultFormatter = getFormatter(
      options.locale,
      buildFormatOptions(this.#currencyCode, this.#supported, options, this.#amount),
    );

    const formatted = this.#defaultFormatter.format(this.#amount);
    this.localizedString =
      this.#supported || options.withoutCurrency === true
        ? formatted
        : appendUnsupportedCurrencyCode(formatted, this.#currencyCode);
  }

  get amount(): string {
    this.#amountString ??= extractNumericAmount(this.formatterParts);
    return this.#amountString;
  }

  get numericAmount(): number {
    return this.#amount;
  }

  get currencySymbol(): string {
    this.#currencySymbol ??= this.#supported ? findCurrencyPart(this.parts) : this.#currencyCode;
    return this.#currencySymbol;
  }

  get currencyNarrowSymbol(): string {
    this.#currencyNarrowSymbol ??= this.#supported
      ? findCurrencyPart(
          getFormatter(this.#options.locale, {
            style: "currency",
            currency: this.#currencyCode,
            currencyDisplay: "narrowSymbol",
            ...(this.#options.minimumFractionDigits != null && {
              minimumFractionDigits: this.#options.minimumFractionDigits,
            }),
            ...(this.#options.maximumFractionDigits != null && {
              maximumFractionDigits: this.#options.maximumFractionDigits,
            }),
          }).formatToParts(this.#amount),
        )
      : this.#currencyCode;
    return this.#currencyNarrowSymbol;
  }

  get currencyName(): string {
    this.#currencyName ??= this.#supported
      ? findCurrencyPart(
          getFormatter(this.#options.locale, {
            style: "currency",
            currency: this.#currencyCode,
            currencyDisplay: "name",
            ...(this.#options.minimumFractionDigits != null && {
              minimumFractionDigits: this.#options.minimumFractionDigits,
            }),
            ...(this.#options.maximumFractionDigits != null && {
              maximumFractionDigits: this.#options.maximumFractionDigits,
            }),
          }).formatToParts(this.#amount),
        ) || this.#currencyCode
      : this.#currencyCode;
    return this.#currencyName;
  }

  get parts(): Intl.NumberFormatPart[] {
    if (!this.#parts) {
      this.#parts =
        this.#supported || this.#options.withoutCurrency === true
          ? this.formatterParts
          : [
              ...this.formatterParts,
              { type: "literal" as const, value: " " },
              { type: "currency" as const, value: this.#currencyCode },
            ];
    }

    return this.#parts;
  }

  get withoutTrailingZeros(): string {
    if (!this.#withoutTrailingZeros) {
      const options = { ...this.#options, withoutTrailingZeros: true };
      const formatter = getFormatter(
        options.locale,
        buildFormatOptions(this.#currencyCode, this.#supported, options, this.#amount),
      );
      const formatted = formatter.format(this.#amount);
      this.#withoutTrailingZeros =
        this.#supported || this.#options.withoutCurrency === true
          ? formatted
          : appendUnsupportedCurrencyCode(formatted, this.#currencyCode);
    }

    return this.#withoutTrailingZeros;
  }

  get withoutTrailingZerosAndCurrency(): string {
    if (!this.#withoutTrailingZerosAndCurrency) {
      const options = { ...this.#options, withoutCurrency: true, withoutTrailingZeros: true };
      this.#withoutTrailingZerosAndCurrency = getFormatter(
        options.locale,
        buildFormatOptions(this.#currencyCode, this.#supported, options, this.#amount),
      ).format(this.#amount);
    }

    return this.#withoutTrailingZerosAndCurrency;
  }

  private get formatterParts(): Intl.NumberFormatPart[] {
    this.#formatterParts ??= this.#defaultFormatter.formatToParts(this.#amount);
    return this.#formatterParts;
  }

  toString(): string {
    return this.localizedString;
  }
}

class FormattedMoneyRangeValue implements FormattedMoneyRange {
  readonly localizedString: string;
  readonly min: MoneyV2;
  readonly max: MoneyV2;
  readonly currencyCode: string;

  constructor(range: readonly MoneyV2[], options: FormatMoneyOptions) {
    if (range.length === 0) {
      throw new Error("formatMoney: money range must contain at least one value");
    }

    const entries = sortMoneyRangeEntries(
      range.map((money) => ({
        money,
        amount: parseAmount(money),
        currencyCode: normalizeCurrencyCode(money.currencyCode),
      })),
    );

    const [first] = entries;
    if (!first) {
      throw new Error("formatMoney: money range must contain at least one value");
    }

    const mismatched = entries.find((entry) => entry.currencyCode !== first.currencyCode);
    if (mismatched) {
      throw new Error(
        `formatMoney: range values must share one currency, received ${first.currencyCode} and ${mismatched.currencyCode}`,
      );
    }

    const last = entries[entries.length - 1] ?? first;
    this.min = first.money;
    this.max = last.money;
    this.currencyCode = first.currencyCode;

    if (first.amount === last.amount) {
      this.localizedString = new FormattedMoneyValue(first.money, {
        ...options,
        withoutTrailingZeros: options.withoutTrailingZeros ?? !hasExplicitFractionDigits(options),
      }).localizedString;
      return;
    }

    const supported = isWellFormedCurrencyCode(first.currencyCode);
    const formatter = getFormatter(
      options.locale,
      buildRangeOptions(first.currencyCode, supported, options, first.amount, last.amount),
    );

    const formatted = formatRange(formatter, first.amount, last.amount);
    this.localizedString =
      supported || options.withoutCurrency === true
        ? formatted
        : appendUnsupportedCurrencyCode(formatted, first.currencyCode);
  }

  toString(): string {
    return this.localizedString;
  }
}

/**
 * Formats a price or a price range for display. Pass a `MoneyV2` price, or an array of `MoneyV2` prices in one currency for a range, with the active market's locale.
 *
 * The returned object converts to the formatted string in template literals and string concatenation. For custom price layouts, read the parts of the formatted price. A range shows the lowest and highest prices. When every price in the range matches, the output shows one price.
 *
 * The function throws an error when an amount isn't numeric, when a range is empty, or when the prices in a range use different currencies.
 *
 * @publicDocs
 */
export function formatMoney(money: MoneyV2, options: FormatMoneyOptions): FormattedMoney;
export function formatMoney(
  money: readonly MoneyV2[],
  options: FormatMoneyOptions,
): FormattedMoneyRange;

// This is the implementation of the formatMoney function overloading the other two.
// It checks if the input is a range and creates the appropriate object.
/**
 * @param money A price, or an array of prices in one currency for a range.
 * @param options Locale and display settings.
 * @returns The formatted price or range, which converts to a string in template literals.
 */
export function formatMoney(
  money: MoneyV2 | readonly MoneyV2[],
  options: FormatMoneyOptions,
): FormattedMoney | FormattedMoneyRange {
  return isMoneyRange(money)
    ? new FormattedMoneyRangeValue(money, options)
    : new FormattedMoneyValue(money, options);
}
