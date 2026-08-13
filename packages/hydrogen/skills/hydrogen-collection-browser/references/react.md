# React

Shared React binding used by every React framework. Route-level wiring (loaders, navigation, hydrated pagination) is framework-specific: see `react-router.md` and `nextjs.md`.

## Contents

- Server Data
- Provider
- Browse Form
- Pagination
- Filters
- Search Pages

Use the React binding:

```tsx
import {
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  parseCollectionParams,
  serializeCollectionParams,
  type AvailableFilter,
  type CollectionState,
  type ProductFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
```

Use `getSortByValue(...)` for option values so the `sort_by` query param round-trips through `parseCollectionParams()`:

```ts
const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, old to new", value: getSortByValue("CREATED", false) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

const SEARCH_SORT_OPTIONS = [
  { label: "Relevance", value: getSortByValue("RELEVANCE", false) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
];
```

## Server Data

On the server, parse the request URL and query the Storefront API with the parsed browse state. This is plain server JavaScript — no framework types:

```ts
async function queryCollectionBrowse(request: Request, storefrontClient: StorefrontClient, handle: string) {
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);
  const browseSearch = serializeCollectionParams(browse).toString();
  const dataSearch = url.searchParams.toString();
  const before = url.searchParams.get("before") || undefined;
  const after = before ? undefined : url.searchParams.get("after") || undefined;

  const { data, errors } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      first: before ? undefined : 24,
      last: before ? 24 : undefined,
      before,
      after,
      filters:
        browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (errors || !data?.collection) return null;

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    pageInfo: data.collection.products.pageInfo,
    availableFilters: data.collection.products.filters,
    browseSearch,
    dataSearch,
  };
}
```

The framework route handler calls this and turns `null` into its own not-found or error response (see the framework references).

Keep `dataSearch` exactly aligned with the query used for the server data. Query `startCursor`, `endCursor`, `hasPreviousPage`, and `hasNextPage` in `pageInfo`.

## Provider

Wrap the browse UI in `CollectionProvider` and let it own filter/sort intent. The provider contract is framework-neutral:

- `data.handle`: the collection handle (or `search:${term}` for search pages).
- `data.dataSearch`: the exact search string used for the loaded server data.
- `urlSearch`: the live browser URL search string; it can be ahead of `dataSearch` during transitions.
- `onChange(search)`: navigate to the new search string with the framework's client router — replace history when params already exist, and preserve the current scroll position.

```tsx
<CollectionProvider
  data={{ handle, dataSearch }}
  urlSearch={urlSearch}
  onChange={(search) => {
    // Navigate with the framework's client router (see react-router.md / nextjs.md):
    // replace history when params already exist, preserve scroll position.
  }}
>
  <CollectionPage {...serverData} />
</CollectionProvider>
```

## Browse Form

Inside a collection browse UI:

```tsx
function CollectionPage({ availableFilters, products }: Props) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";

  return (
    <form {...formProps()} method="get" action={collectionPath} className="browse">
      <FilterSidebar
        availableFilters={availableFilters}
        activeFilters={state.filters}
        countPending={isLoading}
      />
      <div>
        <label>
          Sort by
          <select
            name="sort_by"
            defaultValue={currentSortValue(state)}
            onChange={requestFormSubmit}
          >
            {COLLECTION_SORT_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <ProductGrid products={products} pending={isLoading} />
      </div>
    </form>
  );
}

function FilterSidebar(props: FilterSidebarProps) {
  return (
    <aside>
      <h2>Filters</h2>
      <noscript>
        <button type="submit">Apply filters</button>
      </noscript>
      <FilterGroups {...props} />
    </aside>
  );
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}
```

Pass `method="get"` and an explicit `action={collectionPath}` (the current `/collections/:handle` route URL) literally — `formProps()` only wires the submit handler (see the SKILL.md UI rule). Render the filter sidebar, sorting, product grid, and pagination within this browse form so every browse control participates in the same GET submission.

Render the filter sidebar unconditionally — an empty filter list is fine. Place a `noscript` submit button labeled "Apply filters" immediately after the filter sidebar heading; it doubles as the no-JS submit control for sorting.

This structure preserves no-JS filtering and sorting while keeping the form focused on browse controls.

Use uncontrolled form controls. When a route needs to remount checkboxes after external navigation, put `key={serializeCollectionParams({ filters: state.filters, sortKey: undefined, reverse: false }).toString()}` on the filter subtree (for search, include the term in the key) — keyed by serialized **filter state**, not the live URL. The URL clears before the `CollectionProvider` reconciler settles `state.filters`, so a URL-keyed remount bakes in stale `defaultChecked`. This resets checkbox DOM state without coupling active filter chips to the form remount.

Keep all collection filter controls enabled while `state.status === "loading"`. Apply pending styles to numeric metadata that describes the pending results, including the displayed result count and the available-item count beside each filter value. Pass the loading state as a separate `countPending` prop for filter counts.

Use a persistent, visually hidden status region to announce that product and filter counts are updating. The refreshed displayed count remains a polite live region.

Keep the collection sort select enabled and visually unchanged while loading; its options and selected value remain current while product data refreshes.

## Pagination

Render pagination as native GET links carrying `before` or `after` cursors, per the SKILL.md UI rules. The hydrated enhancement is framework-specific: `react-router.md` documents an accumulated product window driven by `useFetcher`, and `nextjs.md` documents cursor links with a server refresh.

## Filters

For each Storefront `FilterValue`, treat `value.input` as the canonical JSON-encoded `ProductFilter`. Convert it to checkbox params by parsing the JSON, wrapping it in the minimal collection state shape, and calling `serializeCollectionParams(...)`. Use Hydrogen helpers for active checks:

```tsx
function filterValueInputParamEntries(input: string): Array<{ name: string; value: string }> {
  let filter: ProductFilter;
  try {
    filter = JSON.parse(input) as ProductFilter;
  } catch {
    return [];
  }

  return Array.from(
    serializeCollectionParams({ filters: [filter], sortKey: undefined, reverse: false }),
    ([name, value]) => ({ name, value }),
  );
}

function FilterValueInput({ activeFilters, countPending, filter, value }: Props) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;

  return (
    <label>
      <input
        type="checkbox"
        name={name}
        value={paramValue}
        defaultChecked={isFilterInputActive(activeFilters, value.input)}
        onChange={(event) => {
          if (isMutuallyExclusive(filter) && event.currentTarget.checked) {
            uncheckSiblings(event.currentTarget);
          }
          requestFormSubmit(event);
        }}
      />
      <span>{value.label}</span>
      <span className={countPending ? "opacity-40" : ""}>
        ({value.count})
      </span>
    </label>
  );
}
```

`filterValueInputParamEntries` is app glue code, not a Hydrogen export. Its body should stay this thin: `JSON.parse(value.input)` plus `serializeCollectionParams(...)`. Do not replace it with a custom mapping table for availability, product type, vendor, tags, options, metafields, or price. The app should not create its own `ProductFilter` from `filter.id`, `filter.label`, `filter.type`, `value.id`, or display labels; those are UI metadata, not the Storefront API filter contract.

For active chips, use parsed active `ProductFilter` values from collection state:

```tsx
function ActiveFilterChip({ collectionPath, filter, state }: Props) {
  const currentParams = serializeCollectionParams(state);
  const removal = getFilterRemovalUrl(currentParams, filter);
  const href = removal === "?" ? collectionPath : `${collectionPath}${removal}`;

  return <a href={href}>{describeFilter(filter)}</a>;
}
```

Render chips and the clear-filter link as real anchors for the non-JavaScript fallback. When hydrated, use the framework's scroll-preserving client navigation (see the framework references) so removal keeps the buyer's place in the product grid.

When passing `browse.filters` into a `gql()` query variable typed from Storefront API introspection, match the app's established pattern. The Hydrogen examples cast the parsed filters to the generated Storefront API `ProductFilter` type at the query variable boundary:

```ts
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";

variables: {
  filters:
    browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
}
```

Keep this as a generated-type cast scoped to the query variable boundary.

## Search Pages

Use the same binding with a synthetic handle:

```tsx
<CollectionProvider
  data={{ handle: `search:${term}`, dataSearch }}
  urlSearch={urlSearch}
  onChange={(search) => {
    // Same navigation contract as the Provider section.
  }}
>
  <input type="hidden" name="q" value={term} />
</CollectionProvider>
```

When the search term changes, include it in the browse form `key` so old unchecked/checked inputs do not carry over.
