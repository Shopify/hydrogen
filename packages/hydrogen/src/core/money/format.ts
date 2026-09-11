import { getFormatter } from "./cache";
import type { FormatMoneyOptions, FormattedMoney, FormattedMoneyRange, MoneyV2 } from "./types";

/**
 * Intl.NumberFormat part types that make up the raw numeric amount.
 * Used to extract "19.99" from a formatted string like "$19.99" by
 * filtering out currency symbols, sign, and other non-numeric parts.
 */
const NUMERIC_PART_TYPES = new Set(["decimal", "fraction", "group", "integer", "literal"]);
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
 * Intl accepts well-formed three-letter currency codes. Non-standard but
 * well-formed codes render as codes; malformed codes such as USDC throw.
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
  return parts
    .filter((part) => NUMERIC_PART_TYPES.has(part.type))
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
  amounts: number[],
): Intl.NumberFormatOptions {
  const wholeRange = amounts.every(hasTrailingZeros);
  const rangeOptions = {
    ...options,
    withoutTrailingZeros:
      options.withoutTrailingZeros ?? (wholeRange && !hasExplicitFractionDigits(options)),
  };

  return buildFormatOptions(currencyCode, supported, rangeOptions, amounts[0] ?? 0);
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
      buildRangeOptions(
        first.currencyCode,
        supported,
        options,
        entries.map((entry) => entry.amount),
      ),
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
 * Format a MoneyV2 value or a same-currency range of MoneyV2 values for display.
 *
 * Returns an object that stringifies to the locale-formatted price via
 * toString(). Structured fields on single prices are computed lazily when
 * accessed, so the common string path stays cheap.
 */
export function formatMoney(money: MoneyV2, options: FormatMoneyOptions): FormattedMoney;
export function formatMoney(
  money: readonly MoneyV2[],
  options: FormatMoneyOptions,
): FormattedMoneyRange;

// This is the implementation of the formatMoney function overloading the other two.
// It checks if the input is a range and creates the appropriate object.
export function formatMoney(
  money: MoneyV2 | readonly MoneyV2[],
  options: FormatMoneyOptions,
): FormattedMoney | FormattedMoneyRange {
  return isMoneyRange(money)
    ? new FormattedMoneyRangeValue(money, options)
    : new FormattedMoneyValue(money, options);
}
