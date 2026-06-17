# Next.js App Router

Use a client component for browse controls. Server pages fetch products and filters, then pass the snapshot into the client browser component.

## Server Page

In `app/collections/[handle]/page.tsx`:

```tsx
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { handle } = await params;
  const urlSearch = toURLSearchParams(await searchParams);
  const storefront = await getStorefrontClient();
  const result = await queryCollection({ storefrontClient: storefront, handle, searchParams: urlSearch });
  if (!result) notFound();

  return <CollectionBrowser mode="collection" {...result} dataSearch={urlSearch.toString()} />;
}

function toURLSearchParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value != null) {
      params.set(key, value);
    }
  }
  return params;
}
```

The page may be dynamic when it reads request-scoped Storefront client data or search params.

## Client Browser

In a `"use client"` component:

```tsx
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CollectionBrowser(props: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  return (
    <CollectionProvider
      // dataSearch is the server-committed search string for the loaded products.
      // urlSearch is the live browser URL and can be ahead during transitions.
      data={{ handle: props.handle, dataSearch: props.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const href = `${pathname}${search}`;
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        router.refresh();
      }}
    >
      <BrowserContent {...props} />
    </CollectionProvider>
  );
}
```

`router.refresh()` is important when the client URL changes before the React Server Component payload catches up.

Build the actual `BrowserContent` controls from the React reference patterns: sort option values come from `getSortByValue(...)`, filter checkbox names/values come from parsing `FilterValue.input` and passing that exact parsed filter through `serializeCollectionParams(...)`, and uncontrolled checkbox reset keys belong on the filter subtree when external navigation can clear filters.

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
```

This helper is only an adapter from Storefront API `FilterValue.input` to Hydrogen's serializer. Do not replace it with an app-owned filter mapping table.

## Search Pages

Use the same component with a discriminated `mode`:

```tsx
const handle = props.mode === "collection" ? props.handle : `search:${props.term}`;
```

For search forms:

- Render a separate search form with `name="q"`.
- Inside the filter/sort form, include `<input type="hidden" name="q" value={term} />`.
- Use `SEARCH_SORT_OPTIONS` with `RELEVANCE` and `PRICE`; do not offer collection-only sorts.

## Links And Clear URLs

Use `next/link` for clear links and active filter chips. If a removal URL is `"?"`, link to the base pathname. For search pages, preserve `q` when removing filters.

## Gotchas

- Components that call `useSearchParams()` must be client components.
- Do not build browse links through Next route objects if filter param names contain dots. Use the serialized search string from Hydrogen.
- If a page mixes static data and request-scoped private clients, mark the route dynamic deliberately rather than accidentally calling `headers()` deep inside a helper.
