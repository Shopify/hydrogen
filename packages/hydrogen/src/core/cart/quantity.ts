/**
 * The minimum quantity that sanitizeQuantity uses when you omit `min`.
 *
 * @publicDocs
 */
export const DEFAULT_MINIMUM_QUANTITY = 1;

/**
 * The maximum quantity that sanitizeQuantity uses when you omit `max`. The value is `Infinity`, which means no limit.
 *
 * @publicDocs
 */
export const NO_QUANTITY_LIMIT = Infinity;

/**
 * Clamps a raw value to a whole-number quantity between a minimum and a maximum.
 *
 * The function parses strings, rounds decimals, and returns the minimum for input that it can't parse. The cart store clamps quantities from a set submission with this function. The store removes the line when the submitted quantity is empty or zero.
 *
 * @param raw The quantity to sanitize, such as a value typed into a quantity input.
 * @param options The lower and upper bounds. The `min` option defaults to `1`, and `max` has no default limit. Pass the variant's available quantity as `max` when your cart fragment selects it.
 * @returns The rounded quantity, clamped between the minimum and maximum.
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
