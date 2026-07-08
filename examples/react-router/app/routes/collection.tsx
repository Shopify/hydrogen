import { gql } from "@shopify/hydrogen";
import {
  Cache,
  getFilterRemovalUrl,
  getSortByValue,
  parseCollectionParams,
  serializeCollectionParams,
  type AvailableFilter,
  type ProductFilter,
} from "@shopify/hydrogen";
import { CollectionProvider, useCollection, useCollectionForm } from "@shopify/hydrogen/react";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { ProductCard } from "~/components/ProductCard";
import { AnalyticsEvent, getAnalytics } from "~/lib/analytics";
import { content } from "~/lib/content";
import { FilterGroup } from "~/lib/filters";
import { PRODUCT_CARD_FRAGMENT } from "~/lib/fragments";
import { canonicalUrl } from "~/lib/site";
import { storefrontClientContext } from "~/lib/storefront-context";

import type { Route } from "./+types/collection";

const COLLECTION_SORT_OPTIONS = [
  { label: "Featured", value: getSortByValue("COLLECTION_DEFAULT", false) },
  { label: "Best selling", value: getSortByValue("BEST_SELLING", false) },
  { label: "Alphabetically, A-Z", value: getSortByValue("TITLE", false) },
  { label: "Alphabetically, Z-A", value: getSortByValue("TITLE", true) },
  { label: "Price, low to high", value: getSortByValue("PRICE", false) },
  { label: "Price, high to low", value: getSortByValue("PRICE", true) },
  { label: "Date, new to old", value: getSortByValue("CREATED", true) },
];

const COLLECTION_QUERY = gql(
  `
  query Collection($handle: String!, $first: Int!, $after: String, $sortKey: ProductCollectionSortKeys, $reverse: Boolean, $filters: [ProductFilter!], $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      descriptionHtml
      image {
        url
        altText
        width
        height
      }
      products(first: $first, after: $after, sortKey: $sortKey, reverse: $reverse, filters: $filters) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...ProductCard
        }
      }
    }
  }
`,
  [PRODUCT_CARD_FRAGMENT],
);

export const meta = ({ data, params }: Route.MetaArgs) => {
  const title = data?.collection?.title ?? "Collection";
  const description = data?.collection?.description ?? "";
  return [
    { title: `${title} — CORE` },
    { name: "description", content: description },
    {
      tagName: "link",
      rel: "canonical",
      href: canonicalUrl(`/collections/${params.handle ?? ""}`),
    },
    { property: "og:title", content: `${title} — CORE` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
  ];
};

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const browse = parseCollectionParams(url.searchParams);

  const { data, errors } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle: params.handle,
      first: 24,
      after: url.searchParams.get("after") ?? undefined,
      filters:
        browse.filters.length > 0
          ? // F13: skill-sanctioned generated-type cast at the query variable boundary
            // (hydrogen-collection-browser/references/react.md). Kept verbatim.
            (browse.filters as StorefrontApiProductFilter[])
          : undefined,
      sortKey: browse.sortKey,
      reverse: browse.reverse || undefined,
    },
    cache: Cache.short(),
  });

  if (errors) {
    console.error("[hydrogen] Collection query failed", errors);
    throw new Response("Collection query failed", { status: 500 });
  }

  if (!data?.collection) {
    throw new Response("Collection not found", { status: 404 });
  }

  return {
    collection: data.collection,
    products: data.collection.products.nodes,
    availableFilters: data.collection.products.filters,
    dataSearch: url.searchParams.toString(),
  };
}

export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectionPath = `/collections/${loaderData.collection.handle}`;

  return (
    <CollectionProvider
      data={{
        handle: loaderData.collection.handle,
        dataSearch: loaderData.dataSearch,
      }}
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
      <CollectionViewedTracker collection={loaderData.collection} />
      <CollectionPage
        collection={loaderData.collection}
        products={loaderData.products}
        availableFilters={loaderData.availableFilters}
        pageInfo={loaderData.collection.products.pageInfo}
        collectionPath={collectionPath}
      />
    </CollectionProvider>
  );
}

type CollectionPageProps = {
  collection: Route.ComponentProps["loaderData"]["collection"];
  products: Route.ComponentProps["loaderData"]["products"];
  availableFilters: AvailableFilter[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  collectionPath: string;
};

function CollectionPage({
  collection,
  products,
  availableFilters,
  pageInfo,
  collectionPath,
}: CollectionPageProps) {
  const state = useCollection();
  const { formProps } = useCollectionForm();
  const isLoading = state.status === "loading";

  const showingCount = content.collection.showingCount
    .replace("{{ shown }}", String(products.length))
    .replace("{{ total }}", String(products.length));

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs
          items={[{ label: "Collections", href: "/collections" }, { label: collection.title }]}
        />
      </div>

      <h1 className="type-display mb-4">{collection.title}</h1>
      {collection.descriptionHtml ? (
        <div
          className="richtext type-body text-on-surface-secondary mb-6 max-w-prose"
          dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
        />
      ) : collection.description ? (
        <p className="type-body text-on-surface-secondary mb-6 max-w-prose">
          {collection.description}
        </p>
      ) : null}

      <form
        {...formProps()}
        method="get"
        action={collectionPath}
        className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8"
      >
        <FilterSidebar
          availableFilters={availableFilters}
          activeFilters={state.filters}
          disabled={isLoading}
        />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="type-body-sm text-on-surface-secondary" aria-live="polite">
              {showingCount}
            </p>
            <SortSelect isLoading={isLoading} />
          </div>

          <ActiveFilterChips activeFilters={state.filters} collectionPath={collectionPath} />

          {products.length === 0 ? (
            <p className="text-on-surface-secondary py-12 text-center">
              {content.collection.noProducts}
            </p>
          ) : (
            <ul
              role="list"
              className="grid grid-cols-2 gap-x-1 gap-y-10 contain-paint lg:grid-cols-3"
            >
              {products.map((product, index) => (
                <li key={product.id} className={isLoading ? "opacity-60" : ""}>
                  <ProductCard
                    product={product}
                    loading={index < 3 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                </li>
              ))}
            </ul>
          )}

          <LoadMore pageInfo={pageInfo} collectionPath={collectionPath} />

          {/* No-JS submit so the GET filter/sort form is submittable without JS (F4). */}
          <noscript>
            <button type="submit" className="rounded-button button-primary h-11 px-4">
              {content.collection.showResults}
            </button>
          </noscript>
        </div>
      </form>
    </div>
  );
}

function CollectionViewedTracker({
  collection,
}: {
  collection: Route.ComponentProps["loaderData"]["collection"];
}) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;
    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
    });
  }, [collection.handle, collection.id]);
  return null;
}

function SortSelect({ isLoading }: { isLoading: boolean }) {
  const state = useCollection();
  const currentSort = useMemo(() => {
    return serializeCollectionParams(state).toString();
  }, [state]);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-on-surface-secondary">{content.collection.sortBy}</span>
      <select
        name="sort_by"
        defaultValue={currentSort}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        aria-busy={isLoading}
        className="w-auto"
      >
        {COLLECTION_SORT_OPTIONS.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type FilterSidebarProps = {
  availableFilters: AvailableFilter[];
  activeFilters: ProductFilter[];
  disabled: boolean;
};

function FilterSidebar({ availableFilters, activeFilters, disabled }: FilterSidebarProps) {
  if (availableFilters.length === 0) return null;

  return (
    <aside className="hidden flex-col gap-6 lg:flex" aria-disabled={disabled}>
      <div className="flex items-center justify-between">
        <h2 className="type-heading-sm text-on-surface font-medium">
          {content.collection.filters}
        </h2>
      </div>
      {availableFilters.map((filter) => (
        <FilterGroup key={filter.id} filter={filter} activeFilters={activeFilters} />
      ))}
    </aside>
  );
}

function ActiveFilterChips({
  activeFilters,
  collectionPath,
}: {
  activeFilters: ProductFilter[];
  collectionPath: string;
}) {
  if (activeFilters.length === 0) return null;

  return (
    <ul role="list" className="flex flex-wrap gap-2">
      {activeFilters.map((filter, index) => {
        const currentParams = serializeCollectionParams({
          filters: activeFilters,
          sortKey: undefined,
          reverse: false,
        });
        const removal = getFilterRemovalUrl(currentParams, filter);
        const href = removal === "?" ? collectionPath : `${collectionPath}${removal}`;
        return (
          <li key={`${filter.toString()}-${index}`}>
            <a
              href={href}
              className="chip-filled inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm no-underline"
            >
              {describeFilter(filter)}
              <span aria-hidden="true">×</span>
            </a>
          </li>
        );
      })}
      <li>
        <a
          href={collectionPath}
          className="text-accent inline-flex items-center rounded-full px-3 py-1 text-sm no-underline underline"
        >
          {content.collection.clearAll}
        </a>
      </li>
    </ul>
  );
}

function describeFilter(filter: ProductFilter): string {
  if (filter.available !== undefined) return filter.available ? "In stock" : "Out of stock";
  if (filter.productType) return filter.productType;
  if (filter.productVendor) return filter.productVendor;
  if (filter.tag) return filter.tag;
  if (filter.variantOption) {
    const option = filter.variantOption;
    return option.value ?? option.name ?? "Variant";
  }
  if (filter.price) {
    const price = filter.price;
    const hasMin = price.min != null && Number(price.min) > 0;
    const hasMax = price.max != null;
    if (hasMin && hasMax) return `${price.min} ${content.collection.priceTo} ${price.max}`;
    if (hasMax) return `Up to ${price.max}`;
    if (hasMin) return `From ${price.min}`;
    return "Price";
  }
  return "Filter";
}

function LoadMore({
  pageInfo,
  collectionPath,
}: {
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
  collectionPath: string;
}) {
  if (!pageInfo.hasNextPage) return null;
  const cursor = pageInfo.endCursor ?? "";
  const href = `${collectionPath}?after=${encodeURIComponent(cursor)}`;

  return (
    <div className="mt-8 text-center">
      <Link
        to={href}
        className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {content.collection.loadMore}
      </Link>
    </div>
  );
}
