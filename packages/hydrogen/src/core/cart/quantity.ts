/**
 * The minimum quantity that sanitizeQuantity uses when you omit `min`.
 *
 * @publicDocs
 */
export const DEFAULT_MINIMUM_QUANTITY = 1;

/**
 * The maximum quantity that sanitizeQuantity uses when you omit `max`. The value, `Infinity`, sets no upper limit.
 *
 * @publicDocs
 */
export const NO_QUANTITY_LIMIT = Infinity;

/**
 * Turns a raw value, such as text from a quantity input, into a whole-number quantity between a minimum and a maximum.
 *
 * The function parses strings and rounds decimals. Input that the function can't parse returns the minimum.
 *
 * @param raw The value to turn into a quantity.
 * @param options The lower and upper bounds. The `min` option defaults to `1`, and `max` defaults to no limit. To stop at available stock, pass the variant's available quantity as `max`.
 * @returns The rounded quantity, between the minimum and the maximum.
 * @example
 * ```ts
 * sanitizeQuantity("3")           // → 3
 * sanitizeQuantity("2.7")         // → 3
 * sanitizeQuantity("abc")         // → 1 (falls back to min)
 * sanitizeQuantity(5, { max: 3 }) // → 3
 * sanitizeQuantity(0, { min: 1 }) // → 1
 * ```
 * @publicDocs
 */
export function sanitizeQuantity(raw: unknown, options?: { min?: number; max?: number }): number {
  const min = options?.min ?? DEFAULT_MINIMUM_QUANTITY;
  const max = options?.max ?? NO_QUANTITY_LIMIT;

  const parsed = Number(String(raw).trim());
  if (Number.isNaN(parsed)) return min;

  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, min), max);
}
