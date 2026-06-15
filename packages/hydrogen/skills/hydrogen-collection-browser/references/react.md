# React And React Router

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

## Loader

In a route loader, parse the current URL and query the Storefront API with the parsed browse state:

```ts
export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);

  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle: params.handle,
      first: 24,
      filters:
        browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (!data?.collection) throw new Response("Collection not found", { status: 404 });

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    availableFilters: data.collection.products.filters,
    dataSearch: url.searchParams.toString(),
  };
}
```

Keep `dataSearch` exactly aligned with the query used for the server data.

## Provider

Wrap the browse UI in `CollectionProvider` and let it own filter/sort intent:

```tsx
export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  return (
    <CollectionProvider
      data={{ handle: loaderData.collection.handle, dataSearch: loaderData.dataSearch }}
      urlSearch={searchParams.toString()}
      onChange={(search) =>
        navigate(
          { search },
          {
            replace: searchParams.size > 0,
            preventScrollReset: true,
          },
        )
      }
    >
      <CollectionPage {...loaderData} />
    </CollectionProvider>
  );
}
```

## Browse Form

Inside the browse UI:

```tsx
function CollectionPage({ availableFilters, products }: Props) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";

  return (
    <form {...formProps()} method="get" className="browse">
      <FilterSidebar
        availableFilters={availableFilters}
        activeFilters={state.filters}
        disabled={isLoading}
      />
      <select name="sort_by" defaultValue={currentSortValue(state)} onChange={requestFormSubmit}>
        {COLLECTION_SORT_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ProductGrid products={products} pending={isLoading} />
    </form>
  );
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}
```

Use uncontrolled form controls. When a route needs to remount checkboxes after external navigation, put `key={serializeCollectionParams(state).toString()}` on the filter subtree (for search, include the term in the key). This resets checkbox DOM state without coupling active filter chips to the form remount.

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

function FilterValueInput({ activeFilters, filter, value }: Props) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;

  return (
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

  return (
    <a href={href}>
      {describeFilter(filter)}
    </a>
  );
}
```

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
  urlSearch={searchParams.toString()}
  onChange={(search) => navigate({ search }, { replace: searchParams.size > 0 })}
>
  <input type="hidden" name="q" value={term} />
</CollectionProvider>
```

When the search term changes, include it in the browse form `key` so old unchecked/checked inputs do not carry over.
