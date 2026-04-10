import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';

const FILTER_URL_PREFIX = 'filter.';

/**
 * Safely parse a JSON filter input string from the Storefront API.
 * Returns null if parsing fails or the result is not a valid object.
 */
export function parseFilterInput(input: string): ProductFilter | null {
  try {
    const parsed: unknown = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as ProductFilter;
  } catch {
    return null;
  }
}

/**
 * Safely parse a price filter JSON string (from URL search params) into
 * min/max values. Returns null if parsing fails or the result is invalid.
 */
export function parsePriceParam(
  value: string,
): {min?: number; max?: number} | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const obj = parsed as Record<string, unknown>;
    return {
      ...(typeof obj.min === 'number' ? {min: obj.min} : {}),
      ...(typeof obj.max === 'number' ? {max: obj.max} : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Check whether a filter (given as a JSON input string from the Storefront API)
 * is currently active in the URL search params.
 */
export function isFilterActive(
  filterInput: string,
  searchParams: URLSearchParams,
): boolean {
  const filter = parseFilterInput(filterInput);
  if (!filter) return false;

  for (const [key, value] of Object.entries(filter)) {
    const paramKey = `${FILTER_URL_PREFIX}${key}`;
    if (searchParams.getAll(paramKey).includes(JSON.stringify(value))) {
      return true;
    }
  }
  return false;
}

/**
 * Parse filter parameters from URL search params into Storefront API
 * ProductFilter objects.
 *
 * Filters use the Hydrogen JSON format where each URL parameter key is
 * `filter.{graphqlKey}` and the value is a JSON-encoded filter value.
 *
 * @example
 * ```ts
 * // Single filter
 * const url = new URL('https://example.com/collections/all?filter.variantOption={"name":"Color","value":"Red"}');
 * parseFiltersFromParams(url.searchParams);
 * // → [{variantOption: {name: "Color", value: "Red"}}]
 *
 * // Price range filter
 * const url = new URL('https://example.com/collections/all?filter.price={"min":25,"max":100}');
 * parseFiltersFromParams(url.searchParams);
 * // → [{price: {min: 25, max: 100}}]
 * ```
 */
export function parseFiltersFromParams(
  searchParams: URLSearchParams,
): ProductFilter[] {
  const filters: ProductFilter[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (!key.startsWith(FILTER_URL_PREFIX)) continue;

    const filterKey = key.substring(FILTER_URL_PREFIX.length);

    try {
      const parsedValue = JSON.parse(value);
      filters.push({[filterKey]: parsedValue});
    } catch (error) {
      console.error(`Failed to parse filter ${key}:`, error);
    }
  }

  return filters;
}

/**
 * Add a filter to URL search params. Price filters use `set` (single value),
 * while all other filters use `append` (multi-select).
 *
 * Clears pagination cursors so stale cursors from a previous filter state
 * don't cause API errors.
 */
export function applyFilter(
  filter: ProductFilter,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  for (const [key, value] of Object.entries(filter)) {
    const paramKey = `${FILTER_URL_PREFIX}${key}`;
    const paramValue = JSON.stringify(value);

    const existingValues = params.getAll(paramKey);
    if (existingValues.includes(paramValue)) continue;

    if (key === 'price') {
      params.set(paramKey, paramValue);
    } else {
      params.append(paramKey, paramValue);
    }
  }

  params.delete('cursor');
  params.delete('direction');

  return params;
}

/**
 * Remove a filter from URL search params. If multiple values exist for the
 * same key only the matching value is removed.
 *
 * Clears pagination cursors so stale cursors from a previous filter state
 * don't cause API errors.
 */
export function removeFilter(
  filter: ProductFilter,
  searchParams: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(searchParams);

  for (const [key, value] of Object.entries(filter)) {
    const paramKey = `${FILTER_URL_PREFIX}${key}`;
    const paramValue = JSON.stringify(value);
    const remaining = params.getAll(paramKey).filter((v) => v !== paramValue);

    params.delete(paramKey);
    for (const v of remaining) {
      params.append(paramKey, v);
    }
  }

  params.delete('cursor');
  params.delete('direction');

  return params;
}
