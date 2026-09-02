export const DEFAULT_MINIMUM_QUANTITY = 1;
export const NO_QUANTITY_LIMIT = Infinity;

export function sanitizeQuantity(raw: unknown, options?: { min?: number; max?: number }): number {
  const min = options?.min ?? DEFAULT_MINIMUM_QUANTITY;
  const max = options?.max ?? NO_QUANTITY_LIMIT;

  const parsed = Number(String(raw).trim());
  if (Number.isNaN(parsed)) return min;

  const rounded = Math.round(parsed);
  return Math.min(Math.max(rounded, min), max);
}
