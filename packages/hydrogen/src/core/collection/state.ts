import type { ProductFilter } from "../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";

export type { ProductCollectionSortKeys, ProductFilter };

/** How a filter option is visually presented in the storefront UI. */
export type FilterPresentation = "IMAGE" | "SWATCH" | "TEXT";

/** The input mechanism a filter uses — boolean toggle, multi-select list, or price slider. */
export type FilterType = "BOOLEAN" | "LIST" | "PRICE_RANGE" | (string & {});

/** A single selectable value within an {@link AvailableFilter}. */
export interface AvailableFilterValue {
  /** Unique identifier for this filter value. */
  id: string;
  /** Human-readable label (e.g. "Red", "Nike", "$50–$100"). */
  label: string;
  /** Number of products matching this value in the current result set. */
  count: number;
  /** JSON-encoded `ProductFilter` input to apply this value. */
  input: string;
}

/**
 * A filter facet available for the current collection, returned by the
 * Storefront API. Used to render filter UI (checkboxes, swatches, sliders).
 */
export interface AvailableFilter {
  id: string;
  label: string;
  type: FilterType;
  presentation?: FilterPresentation | null;
  values: AvailableFilterValue[];
}

/**
 * Pure browse-intent state for a collection store. Represents what the user
 * wants to see (filters, sort), not what the server returned.
 *
 * Server response data (productsCount, availableFilters, collection id) lives
 * in the framework's loader data, not in the store.
 */
export interface CollectionState {
  /** URL-safe slug identifying the collection (e.g. `"shoes"`). */
  handle: string;

  /** Active product filters, synced bidirectionally with URL params (`filter.*`). */
  filters: ProductFilter[];
  /** Storefront API sort key. `undefined` means the collection's default sort order. */
  sortKey: ProductCollectionSortKeys | undefined;
  /** When `true`, the sort direction is descending (maps to `sort_by` suffix `-descending`). */
  reverse: boolean;
  /** `"idle"` when browse state matches the last-loaded data, `"loading"` after a browse change before the framework fetch settles. */
  status: "idle" | "loading";
}

/**
 * Creates a blank {@link CollectionState} for the given collection handle.
 * All browse fields start at their zero values.
 *
 * @param handle - URL-safe collection slug (e.g. `"shoes"`)
 */
export function createInitialCollectionState(handle: string): CollectionState {
  return {
    handle,
    filters: [],
    sortKey: undefined,
    reverse: false,
    status: "idle",
  };
}
