import type { ProductFilter } from "../../../vendor/standard-events";
import type { ProductCollectionSortKeys } from "../../graphql/generated/storefront-api-types";

export type { ProductCollectionSortKeys, ProductFilter };

/** How the storefront displays a filter's values. */
export type FilterPresentation = "IMAGE" | "SWATCH" | "TEXT";

/** The kind of input a filter takes, such as a boolean toggle, a multi-select list, or a price range. */
export type FilterType = "BOOLEAN" | "LIST" | "PRICE_RANGE" | (string & {});

/** The ID, label, product count, and filter input that every filter value has. */
interface BaseAvailableFilterValue {
  /** ID of the filter value. */
  id: string;
  /** Label to display, such as "Red" or "Nike". */
  label: string;
  /** Number of products in the current results that match the value. */
  count: number;
  /** Filter input as a JSON string. Pass the string to `toggleFilterInput` or `isFilterInputActive`. */
  input: string;
}

/** Copies a field from your query's value type when your query selects the field. Otherwise, the type adds no fields. */
type PickIfPresent<TValue, TKey extends PropertyKey> = TKey extends keyof TValue
  ? Pick<TValue, TKey>
  : {};

/**
 * A value that a customer can select within an available filter.
 *
 * Pass your Storefront API query's value type as `TValue` to include the `swatch` field when your query selects it.
 */
export type AvailableFilterValue<
  TValue extends BaseAvailableFilterValue = BaseAvailableFilterValue,
> = BaseAvailableFilterValue & PickIfPresent<TValue, "swatch">;

/**
 * A filter that the Storefront API returns for the current collection or search results.
 * Render filter controls, such as checkboxes, swatches, and sliders, from the filter's values.
 *
 * @publicDocs
 */
export interface AvailableFilter<
  TValue extends BaseAvailableFilterValue = BaseAvailableFilterValue,
> {
  /** ID of the filter. */
  id: string;
  /** Name to display, such as "Color", "Size", or "Price". */
  label: string;
  /** Kind of input, such as a boolean toggle, a multi-select list, or a price range. */
  type: FilterType;
  /**
   * How the storefront displays the filter's values. The Storefront API
   * returns a value only for `LIST` filters and `null` for other filters.
   */
  presentation?: FilterPresentation | null;
  /** Values that a customer can select, each with a label, a product count, and a filter input. */
  values: AvailableFilterValue<TValue>[];
}

/**
 * The customer's filter and sort choices and the loading status.
 *
 * Products, product counts, available filters, and the collection ID come from your loader data.
 */
export interface CollectionState {
  /** Collection handle, such as `"shoes"`. */
  handle: string;

  /** Active product filters, matching the `filter.*` URL params. */
  filters: ProductFilter[];
  /** Storefront API sort key, or `undefined` for the collection's default sort. */
  sortKey: ProductCollectionSortKeys | undefined;
  /** `true` for a descending sort. The URL's sort value then ends in `-descending`. */
  reverse: boolean;
  /** Reads `"loading"` from a filter or sort change until the store settles, and `"idle"` when the results match the filters and sort. Show a loading state while the value is `"loading"`. */
  status: "idle" | "loading";
}

/**
 * Creates collection state with no filters and the default sort for a collection handle.
 *
 * @param handle - Collection handle, such as `"shoes"`.
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
