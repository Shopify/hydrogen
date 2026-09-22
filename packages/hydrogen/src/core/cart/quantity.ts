export const DEFAULT_MINIMUM_QUANTITY = 1;

export const NO_QUANTITY_LIMIT = Infinity;

/**
 * Clamps a raw value to a valid integer quantity within `min`/`max` bounds.
 *
 * Parses strings, rounds floats, and falls back to `min` for unparseable input.
 * Used internally by the cart form system to sanitize user-typed quantities.
 *
 * @example
 * ```ts
 * sanitizeQuantity("3")           // → 3
 * sanitizeQuantity("2.7")         // → 3
 * sanitizeQuantity("abc")         // → 1 (falls back to min)
 * sanitizeQuantity(5, { max: 3 }) // → 3
 * sanitizeQuantity(0, { min: 1 }) // → 1
 * ```
 */
export function sanitizeQuantity(raw: unknown, options?: { min?: number; max?: number }): number {
  const min = options?.min ?? DEFAULT_MINIMUM_QUANTITY;
  const max = options?.max ?? NO_QUANTITY_LIMIT;

  const parsed = Number(String(raw).trim());
  if (Number.isNaN(parsed)) return min;

  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, min), max);
}
