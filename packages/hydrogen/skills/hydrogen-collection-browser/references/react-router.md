# React Router

Route-level wiring for the shared React binding in `react.md`. Read that file first for the provider contract, browse form, filters, and search rules.

## Contents

- Loader
- Provider
- Progressive Pagination
- Links

## Loader

In a route loader, call the server data function from `react.md` and translate failures into route responses. For hydrated pagination requests (marked with `_pagination=1`), return a structured error instead of throwing so the client can keep the accumulated products rendered:

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

## Provider

Wire the `react.md` provider contract with React Router navigation:

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

For search pages, use the synthetic handle from `react.md` with the same `onChange`:

```tsx
<CollectionProvider
  data={{ handle: `search:${term}`, dataSearch }}
  urlSearch={searchParams.toString()}
  onChange={(search) => navigate({ search }, { replace: searchParams.size > 0 })}
>
  <input type="hidden" name="q" value={term} />
</CollectionProvider>
```

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

## Links

Use `<Link to={href} preventScrollReset>` for active-filter chips and the clear-filter link so client navigation keeps the buyer's place in the product grid. `Link` still renders an anchor for the non-JavaScript fallback.
