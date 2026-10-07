import type { ProductFilter } from "../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";

export type { ProductCollectionSortKeys, ProductFilter };

/** How the storefront UI displays a filter's values. */
export type FilterPresentation = "IMAGE" | "SWATCH" | "TEXT";

/** The kind of input a filter takes, such as a boolean toggle, a multi-select list, or a price range. */
export type FilterType = "BOOLEAN" | "LIST" | "PRICE_RANGE" | (string & {});

interface BaseAvailableFilterValue {
  /** Unique identifier of the filter value. */
  id: string;
  /** Label to display, such as "Red" or "Nike". */
  label: string;
  /** Number of products in the current results that match the value. */
  count: number;
  /** Product filter input as a JSON string. Pass it to `toggleFilterInput` or `isFilterInputActive`. */
  input: string;
}

type PickIfPresent<TValue, TKey extends PropertyKey> = TKey extends keyof TValue
  ? Pick<TValue, TKey>
  : {};

/**
 * A value that a customer can select within an available filter.
 *
 * Pass your Storefront API query's value type as `TValue` to expose the `swatch` field when your query selects it.
 */
export type AvailableFilterValue<
  TValue extends BaseAvailableFilterValue = BaseAvailableFilterValue,
> = BaseAvailableFilterValue & PickIfPresent<TValue, "swatch">;

/**
 * A filter that the Storefront API returns for the current collection or search results.
 * Render filter controls, such as checkboxes, swatches, and sliders, from its values.
 *
 * @publicDocs
 */
export interface AvailableFilter<
  TValue extends BaseAvailableFilterValue = BaseAvailableFilterValue,
> {
  /** Unique identifier of the filter. */
  id: string;
  /** Name to display, such as "Color", "Size", or "Price". */
  label: string;
  /** Kind of input, such as a boolean toggle, a multi-select list, or a price range. */
  type: FilterType;
  /**
   * How the storefront UI displays the filter's values. The Storefront API
   * returns a value only for `LIST` filters and `null` for other filters.
   */
  presentation?: FilterPresentation | null;
  /** Values that a customer can select, each with a label, a product count, and a filter input. */
  values: AvailableFilterValue<TValue>[];
}

/**
 * The customer's filter and sort choices in a collection store.
 *
 * Your framework's loader data holds the server response, such as product counts, available filters, and the collection ID.
 */
export interface CollectionState {
  /** URL-safe collection slug, such as `"shoes"`. */
  handle: string;

  /** Active product filters. The store keeps them in sync with the `filter.*` URL parameters. */
  filters: ProductFilter[];
  /** Storefront API sort key. Reads `undefined` for the collection's default sort order. */
  sortKey: ProductCollectionSortKeys | undefined;
  /** When `true`, the sort is descending and the URL's sort value ends in `-descending`. */
  reverse: boolean;
  /** Reads `"loading"` from a filter or sort change until the store settles. Reads `"idle"` when the filters and sort match the last loaded data. */
  status: "idle" | "loading";
}

/**
 * Creates a blank collection state for the given collection handle.
 *
 * @param handle - URL-safe collection slug, such as `"shoes"`.
 * @returns A state with no filters, the collection's default sort, an ascending direction, and an idle status.
 * @publicDocs
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
