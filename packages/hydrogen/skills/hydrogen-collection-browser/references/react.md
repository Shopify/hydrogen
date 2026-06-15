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
      filters: browse.filters.length > 0 ? browse.filters : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
  });

  if (!data?.collection) throw new Response("Collection not found", { status: 404 });

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    availableFilters: normalizeAvailableFilters(data.collection.products.filters),
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
        {/* options */}
      </select>
      <ProductGrid products={products} pending={isLoading} />
    </form>
  );
}

function requestFormSubmit(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
  event.currentTarget.form?.requestSubmit();
}
```

Use uncontrolled form controls plus a `key={serializeCollectionParams(state).toString()}` when a route needs to remount checkboxes after external navigation.

## Filters

For each Storefront `FilterValue`, parse `value.input` only enough to build form field names and values. Use Hydrogen helpers for active checks:

```tsx
<input
  type="checkbox"
  name={filterInputToParamEntries(value.input)[0]?.name}
  value={filterInputToParamEntries(value.input)[0]?.value}
  defaultChecked={isFilterInputActive(activeFilters, value.input)}
  onChange={(event) => {
    if (isMutuallyExclusive(filter) && event.currentTarget.checked) {
      uncheckSiblings(event.currentTarget);
    }
    requestFormSubmit(event);
  }}
/>
```

For active chips:

```tsx
const currentParams = serializeCollectionParams(state);
const removal = getFilterRemovalUrl(currentParams, filter);
const href = removal === "?" ? collectionPath : `${collectionPath}${removal}`;
```

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
