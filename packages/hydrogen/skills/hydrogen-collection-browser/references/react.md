# React And React Router

## Contents

- Loader
- Provider
- Browse Form
- Progressive Pagination
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

## Loader

In a route loader, parse the current URL and query the Storefront API with the parsed browse state:

```ts
export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);
  const browseSearch = serializeCollectionParams(browse).toString();
  const dataSearch = url.searchParams.toString();
  const isPaginationRequest = url.searchParams.get("_pagination") === "1";
  const before = url.searchParams.get("before") || undefined;
  const after = before ? undefined : url.searchParams.get("after") || undefined;

  const queryResult = await storefrontClient
    .graphql(COLLECTION_QUERY, {
      variables: {
        handle: params.handle,
        first: before ? undefined : 24,
        last: before ? 24 : undefined,
        before,
        after,
        filters:
          browse.filters.length > 0 ? (browse.filters as StorefrontApiProductFilter[]) : undefined,
        sortKey: browse.sortKey,
        reverse: browse.reverse || undefined,
      },
    })
    .catch((error: unknown) => {
      if (isPaginationRequest) return null;
      throw error;
    });

  if (!queryResult || queryResult.errors) {
    if (isPaginationRequest) return paginationErrorLoaderData(browseSearch, dataSearch);
    throw new Response("Collection query failed", { status: 500 });
  }

  const { data } = queryResult;

  if (!data?.collection) {
    if (isPaginationRequest) return paginationErrorLoaderData(browseSearch, dataSearch);
    throw new Response("Collection not found", { status: 404 });
  }

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    pageInfo: data.collection.products.pageInfo,
    availableFilters: data.collection.products.filters,
    browseSearch,
    dataSearch,
    paginationError: false as const,
  };
}

function paginationErrorLoaderData(browseSearch: string, dataSearch: string) {
  return {
    collection: null,
    products: [],
    pageInfo: null,
    availableFilters: [],
    browseSearch,
    dataSearch,
    paginationError: true as const,
  };
}
```

Keep `dataSearch` exactly aligned with the query used for the server data. Query `startCursor`, `endCursor`, `hasPreviousPage`, and `hasNextPage` in `pageInfo`.

## Provider

Wrap the browse UI in `CollectionProvider` and let it own filter/sort intent:

```tsx
export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  if (loaderData.paginationError || !loaderData.collection || !loaderData.pageInfo) {
    throw new Response("Collection query failed", { status: 500 });
  }

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

Inside a collection browse UI:

```tsx
function CollectionPage({ availableFilters, products }: Props) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const hasAvailableFilters = availableFilters.length > 0;
  const isLoading = state.status === "loading";

  return (
    <form {...formProps()} method="get" action={collectionPath} className="browse">
      {hasAvailableFilters ? (
        <FilterSidebar
          availableFilters={availableFilters}
          activeFilters={state.filters}
          countPending={isLoading}
        />
      ) : null}
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
        {!hasAvailableFilters ? (
          <noscript>
            <button type="submit">Apply sort</button>
          </noscript>
        ) : null}
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

Place a `noscript` submit button labeled "Apply filters" immediately after the filter sidebar heading. When no filters are available and the sidebar is omitted, render a `noscript` "Apply sort" submit button beside the sort control.

This structure preserves no-JS filtering and sorting while keeping the form focused on browse controls.

Use uncontrolled form controls. When a route needs to remount checkboxes after external navigation, put `key={serializeCollectionParams({ filters: state.filters, sortKey: undefined, reverse: false }).toString()}` on the filter subtree (for search, include the term in the key) — keyed by serialized **filter state**, not the live URL. The URL clears before the `CollectionProvider` reconciler settles `state.filters`, so a URL-keyed remount bakes in stale `defaultChecked`. This resets checkbox DOM state without coupling active filter chips to the form remount.

Keep all collection filter controls enabled while `state.status === "loading"`. Fade numeric metadata that describes the pending results, including the displayed result count and the available-item count beside each filter value. Pass the loading state as a separate `countPending` prop for filter counts.

Use a persistent, visually hidden status region to announce that product and filter counts are updating. The refreshed displayed count remains a polite live region.

Keep the collection sort select enabled and visually unchanged while loading; its options and selected value remain current while product data refreshes.

## Progressive Pagination

Query both cursor directions and all four page boundaries. Use `first` plus `after` for forward pages, and `last` plus `before` for previous pages. Return a normalized `browseSearch` containing only serialized filters and sort; use it as the accumulated product window's reset identity.

Render the "Load previous" anchor immediately before the results list and the "Load more" anchor after it. Enhance ordinary hydrated clicks with `useFetcher<typeof loader>().load(href)`. Forward pages append products and advance `endCursor` plus `hasNextPage`; previous pages prepend products and advance `startCursor` plus `hasPreviousPage`. Deduplicate by product ID.

After merging a successful page, push its cursor URL with React Router's `navigate(..., {defaultShouldRevalidate: false, preventScrollReset: true})`. With React Router's default revalidation behavior, the URL changes without rerunning the loader or replacing the accumulated window. A route-level `shouldRevalidate` should return its supplied default for this pagination navigation. A reload or shared link starts at that cursor and renders the available previous/next links.

After each successful load, focus the first added product link. Keep a persistent showing-count live region so assistive technology also announces the larger product count. While filters or sorting are pending, pause pagination controls until the loader's `browseSearch` matches the live serialized browse state.

```tsx
const pagination = useFetcher<typeof loader>();
const navigate = useNavigate();
const [productWindow, setProductWindow] = useState(() => ({ products, pageInfo }));

useEffect(() => {
  const page = pagination.data;
  if (
    !page ||
    page.browseSearch !== loaderBrowseSearch ||
    page.browseSearch !== currentBrowseSearch
  ) {
    return;
  }

  if (page.paginationError) {
    setPaginationError(true);
    return;
  }

  const isPrevious = new URLSearchParams(page.dataSearch).has("before");

  setProductWindow((current) => ({
    products: mergeUniqueProducts(current.products, page.products, isPrevious),
    pageInfo: isPrevious
      ? {
          ...current.pageInfo,
          startCursor: page.pageInfo.startCursor,
          hasPreviousPage: page.pageInfo.hasPreviousPage,
        }
      : {
          ...current.pageInfo,
          endCursor: page.pageInfo.endCursor,
          hasNextPage: page.pageInfo.hasNextPage,
        },
  }));

  const shareableParams = new URLSearchParams(page.dataSearch);
  shareableParams.delete("_pagination");
  void navigate(
    { search: `?${shareableParams.toString()}` },
    { defaultShouldRevalidate: false, preventScrollReset: true },
  );
}, [currentBrowseSearch, loaderBrowseSearch, navigate, pagination.data]);

<a
  href={nextPageUrl}
  onClick={(event) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    if (pagination.state === "idle") pagination.load(`${nextPageUrl}&_pagination=1`);
  }}
>
  {pagination.state === "idle" ? "Load more" : "Loading products..."}
</a>;
```

Set the collection page component's `key` from the loader's `browseSearch` so a completed filter or sort navigation creates a fresh product window. Rebase the window when authoritative loader products change under the same browse identity. Compare fetcher data against the live serialized browse state before merging so an older pagination response cannot add products after the buyer changes filters or sorting.

For enhanced pagination requests, return a structured pagination error from the loader. Keep existing products rendered, announce the inline error with `role="alert"`, and preserve the cursor anchor as the retry control. Native anchor navigations continue to use the route's normal error boundary.

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

  return (
    <Link to={href} preventScrollReset>
      {describeFilter(filter)}
    </Link>
  );
}
```

Use `preventScrollReset` on both active-filter chips and the clear-filter link so client navigation keeps the buyer's place in the product grid. `Link` still renders an anchor for the non-JavaScript fallback.

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
