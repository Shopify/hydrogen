/**
 * Search-param encoding for the router.
 *
 * TanStack Router JSON-encodes search values by default (`?Size=1` becomes
 * `{ Size: 1 }`), which breaks Hydrogen's string-based URL contract:
 * `parseCollectionParams`, `getSelectedProductOptions`, and
 * `CollectionProvider.urlSearch`/`onChange` all speak `URLSearchParams`, and
 * collection filters rely on repeated keys (`filter.p.tag=A&filter.p.tag=B`).
 *
 * This module is the only place on the router/client side that converts between
 * the search object and the search string. Server functions never see
 * `StorefrontSearch`; they receive the raw `location.searchStr` and hand it to
 * Hydrogen's parsers.
 */
export type StorefrontSearch = Record<string, string | string[]>;

export function parseSearch(searchStr: string): StorefrontSearch {
  const params = new URLSearchParams(searchStr.startsWith("?") ? searchStr.slice(1) : searchStr);
  const search: StorefrontSearch = {};

  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    search[key] = values.length === 1 ? values[0] : values;
  }

  return search;
}

// TanStack Router concatenates `pathname + searchStr + hash`, so the serialized
// form carries its own leading `?` (or is empty).
export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(search)) {
    for (const item of toStringValues(value)) params.append(key, item);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function toStringValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

export const searchFromString = parseSearch;

// Route `validateSearch` pass-through: keeps only string / string[] values so
// route types line up with the encoding above without a second rule set.
export function toStorefrontSearch(input: Record<string, unknown>): StorefrontSearch {
  const search: StorefrontSearch = {};

  for (const [key, value] of Object.entries(input)) {
    const values = toStringValues(value);
    if (values.length === 1) search[key] = values[0];
    else if (values.length > 1) search[key] = values;
  }

  return search;
}
