# React And React Router

## Contents

- Loader
- Provider
- Browse Form
- Filters
- Search Pages

Use the React binding:

```tsx
import {
  formatMoney,
  getFilterRemovalUrl,
  getSortByValue,
  isFilterInputActive,
  parseCollectionParams,
  serializeCollectionParams,
  type AvailableFilter,
  type CollectionState,
  type MoneyV2,
  type ProductFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { useEffect, useRef } from "react";
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
    // Market-aware stores: `data.localization.country.currency.isoCode` under `@inContext`.
    currencyCode: data.shop.paymentSettings.currencyCode,
    dataSearch: url.searchParams.toString(),
  };
}
```

Keep `dataSearch` exactly aligned with the query used for the server data. Load `currencyCode` in the same query so it matches the product prices.

For the single-currency loader above, include this root-level selection in `COLLECTION_QUERY`:

```graphql
shop { paymentSettings { currencyCode } }
```

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
function CollectionPage({ availableFilters, currencyCode, products }: Props) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";

  return (
    <form {...formProps()} method="get" action={collectionPath} className="browse">
      <FilterSidebar
        availableFilters={availableFilters}
        activeFilters={state.filters}
        currencyCode={currencyCode}
      />
      <select name="sort_by" value={currentSortValue(state)} onChange={requestFormSubmit}>
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

Pass `method="get"` and an explicit `action={collectionPath}` (the current `/collections/:handle` or `/search` route URL) literally — `formProps()` only wires the submit handler (see the SKILL.md UI rule).

Keep every filter control mounted and enabled during submission and loading, and show loading on the product grid (`pending`). Keep the filter subtree key stable across filter updates, so focused controls stay mounted. Bind the sort `value` and checkbox `checked` to browse state so chips and back/forward navigation update them in place. Keep price inputs uncontrolled and sync external bounds through input refs, as below.

## Filters

Choose the control at the filter-group level. `PRICE_RANGE` uses min/max number inputs; `LIST` and `BOOLEAN` use checkboxes. Do not use the number of serialized entries to choose the control—a price value serializes to both `gte` and `lte`.

```tsx
function FilterGroup({
  activeFilters,
  currencyCode,
  filter,
}: {
  activeFilters: ProductFilter[];
  currencyCode: MoneyV2["currencyCode"];
  filter: AvailableFilter;
}) {
  if (filter.type === "PRICE_RANGE") {
    return <PriceRangeInput activeFilters={activeFilters} currencyCode={currencyCode} />;
  }

  return filter.values.map((value) => (
    <CheckboxFilterValue
      key={value.id}
      activeFilters={activeFilters}
      filter={filter}
      value={value}
    />
  ));
}

// Use the resolved market locale in market-aware stores.
const LOCALE = "en-US";

function PriceRangeInput({
  activeFilters,
  currencyCode,
}: {
  activeFilters: ProductFilter[];
  currencyCode: MoneyV2["currencyCode"];
}) {
  // One timer for both inputs, so editing min then max submits once.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minInput = useRef<HTMLInputElement>(null);
  const maxInput = useRef<HTMLInputElement>(null);
  const price = activeFilters.find((filter) => filter.price)?.price;
  const min = price?.min ?? "";
  const max = price?.max ?? "";
  const symbol = formatMoney(
    { amount: "0", currencyCode },
    { locale: LOCALE },
  ).currencyNarrowSymbol;

  useEffect(() => {
    for (const [input, value] of [
      [minInput.current, min],
      [maxInput.current, max],
    ] as const) {
      if (!input) continue;
      const matches =
        value === "" ? input.value === "" : input.value !== "" && Number(input.value) === value;
      if (!matches) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        input.value = String(value);
      }
    }
  }, [min, max]);

  useEffect(() => {
    function cancelPendingSubmit() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    }

    function restoreHistoryPrice() {
      // Cancel drafts before history data loads, even if the price is unchanged.
      cancelPendingSubmit();
      const { filters } = parseCollectionParams(new URLSearchParams(window.location.search));
      const price = filters.find((filter) => filter.price)?.price;
      if (minInput.current) minInput.current.value = String(price?.min ?? "");
      if (maxInput.current) maxInput.current.value = String(price?.max ?? "");
    }

    // Any form submission (native Enter included) already carries the typed price.
    const form = minInput.current?.form;
    form?.addEventListener("submit", cancelPendingSubmit);
    window.addEventListener("popstate", restoreHistoryPrice);
    return () => {
      form?.removeEventListener("submit", cancelPendingSubmit);
      window.removeEventListener("popstate", restoreHistoryPrice);
      cancelPendingSubmit();
    };
  }, []);

  function submitAfterTyping(event: React.ChangeEvent<HTMLInputElement>) {
    if (timer.current) clearTimeout(timer.current);
    const form = event.currentTarget.form;
    timer.current = setTimeout(() => {
      timer.current = null;
      form?.requestSubmit();
    }, 350);
  }

  return (
    <>
      <PriceInput
        inputRef={minInput}
        name="filter.v.price.gte"
        defaultValue={min}
        label={`Minimum price in ${currencyCode}`}
        symbol={symbol}
        onChange={submitAfterTyping}
      />
      <PriceInput
        inputRef={maxInput}
        name="filter.v.price.lte"
        defaultValue={max}
        label={`Maximum price in ${currencyCode}`}
        symbol={symbol}
        onChange={submitAfterTyping}
      />
    </>
  );
}

function PriceInput({
  inputRef,
  name,
  defaultValue,
  label,
  symbol,
  onChange,
}: {
  inputRef: React.Ref<HTMLInputElement>;
  name: string;
  defaultValue: number | "";
  label: string;
  symbol: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <span className="price-input">
      <span aria-hidden="true">{symbol}</span>
      <input
        ref={inputRef}
        type="number"
        name={name}
        defaultValue={defaultValue}
        aria-label={label}
        min="0"
        step="any"
        onChange={onChange}
      />
    </span>
  );
}

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

function CheckboxFilterValue({
  activeFilters,
  filter,
  value,
}: {
  activeFilters: ProductFilter[];
  filter: AvailableFilter;
  value: AvailableFilter["values"][number];
}) {
  const entries = filterValueInputParamEntries(value.input);
  if (entries.length !== 1) return null;

  const [{ name, value: paramValue }] = entries;

  return (
    <input
      type="checkbox"
      name={name}
      value={paramValue}
      checked={isFilterInputActive(activeFilters, value.input)}
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

The symbol prefix sits outside the input, so the submitted value stays a plain number. Keep the wrapper simple so the prefix and input share one line at all widths:

```css
.price-input {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.price-input input {
  min-width: 0;
}
```

Use `filter.type` only to choose the control shape. For checkbox values, keep `filterValueInputParamEntries` as thin app glue: `JSON.parse(value.input)` plus `serializeCollectionParams(...)`. Do not derive checkbox params from IDs, labels, or filter types.

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

Use a stable form identity while filters update, so controls keep focus. Use the submitted search term as the key when the form must reset for a new search. Keep that identity unchanged while the shopper types.
