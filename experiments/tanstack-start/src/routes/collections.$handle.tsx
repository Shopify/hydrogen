import { getSortByValue } from "@shopify/hydrogen";
import { CollectionProvider } from "@shopify/hydrogen/react";
import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

import {
  ActiveFilterChips,
  COLLECTION_SORT_OPTIONS,
  FacetForm,
  FilterDrawer,
  LoadMore,
  Toolbar,
  useLoadMore,
} from "~/components/CollectionBrowse";
import { ProductCard } from "~/components/ProductCard";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "~/lib/analytics";
import { searchFromString, toStorefrontSearch } from "~/lib/search-params";
import { getCollection } from "~/server/collections";

export const Route = createFileRoute("/collections/$handle")({
  validateSearch: toStorefrontSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ params, location }) =>
    getCollection({ data: { handle: params.handle, search: location.searchStr } }),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.collection.title ?? "Collection"} · CORE` },
      {
        name: "description",
        content: loaderData?.collection.description || "Shop the CORE collection page.",
      },
    ],
  }),
  component: CollectionPage,
});

type LoaderData = Awaited<ReturnType<typeof getCollection>>;
type CollectionData = LoaderData["collection"];

function CollectionViewedTracker({ collection }: { collection: CollectionData }) {
  useEffect(() => {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: collection.id, handle: collection.handle },
      url: window.location.href,
      shop: analyticsShop,
    });
  }, [collection.id, collection.handle]);

  return null;
}

function BreadcrumbJsonLd({ collection, origin }: { collection: CollectionData; origin: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: collection.title,
        item: `${origin}/collections/${collection.handle}`,
      },
    ],
  };

  return <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>;
}

function Breadcrumb({ collection }: { collection: CollectionData }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="text-on-surface-secondary flex items-center gap-1.5 text-sm">
        <li>
          <Link
            to="/"
            className="hover:text-on-surface rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current motion-safe:transition-colors"
          >
            Home
          </Link>
        </li>
        <li aria-hidden="true" className="text-on-surface-secondary">
          /
        </li>
        <li>
          <span aria-current="page" className="text-on-surface font-medium">
            {collection.title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

function CollectionHeader({ collection }: { collection: CollectionData }) {
  return (
    <div className="mb-8">
      <div className="grid gap-6 md:grid-cols-[1fr_16rem] md:items-start">
        <div>
          <h1 className="type-display text-on-surface mb-2">{collection.title}</h1>
          {collection.description ? (
            <div className="richtext text-on-surface-secondary type-body-sm max-w-2xl">
              <p>{collection.description}</p>
            </div>
          ) : null}
        </div>
        {collection.image ? (
          <div className="bg-surface-secondary aspect-landscape rounded-card overflow-hidden">
            <img
              src={collection.image.url}
              alt={collection.image.altText ?? collection.title}
              width={collection.image.width ?? undefined}
              height={collection.image.height ?? undefined}
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductGrid({ products }: { products: readonly LoaderData["products"][number][] }) {
  return (
    <div className="px-1 contain-paint">
      <ul
        id="product-grid"
        data-testid="product-grid"
        role="list"
        className="grid grid-cols-2 gap-x-1 gap-y-10 lg:grid-cols-3"
      >
        {products.map((product, index) => (
          <li key={`${product.handle}-${index}`}>
            <ProductCard product={product} priority={index < 3} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ handle }: { handle: string }) {
  return (
    <div className="border-border bg-surface-secondary rounded-card border p-8 text-center">
      <h2 className="type-heading-md text-on-surface">No products found</h2>
      <p className="text-on-surface-secondary mt-2 text-sm">
        Try removing filters to see more products in this collection.
      </p>
      <Link
        to="/collections/$handle"
        params={{ handle }}
        resetScroll={false}
        className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
      >
        Clear all filters
      </Link>
    </div>
  );
}

function CollectionResults({ loaderData }: { loaderData: LoaderData }) {
  const fetchCollection = useServerFn(getCollection);
  const { nodes, pageInfo, isLoading, loadMore } = useLoadMore(
    loaderData.products,
    loaderData.pageInfo,
    loaderData.dataSearch,
    (search) => fetchCollection({ data: { handle: loaderData.collection.handle, search } }),
  );

  return (
    <>
      <Toolbar
        countText={`Showing ${nodes.length}`}
        sortOptions={COLLECTION_SORT_OPTIONS}
        defaultSortValue={getSortByValue("COLLECTION_DEFAULT", false)}
      />
      <ActiveFilterChips currencyCode={loaderData.currencyCode} />
      <h2 className="sr-only">Products</h2>
      {nodes.length > 0 ? (
        <ProductGrid products={nodes} />
      ) : (
        <EmptyState handle={loaderData.collection.handle} />
      )}
      <LoadMore
        pageInfo={pageInfo}
        loadedCount={nodes.length}
        countLabel={`Showing ${nodes.length} products`}
        isLoading={isLoading}
        onLoad={loadMore}
      />
      <FilterDrawer availableFilters={loaderData.availableFilters} />
    </>
  );
}

function CollectionPage() {
  const loaderData = Route.useLoaderData();
  const searchStr = useLocation({ select: (location) => location.searchStr });
  const navigate = useNavigate();

  return (
    <CollectionProvider
      data={{ handle: loaderData.collection.handle, dataSearch: loaderData.dataSearch }}
      urlSearch={searchStr}
      onChange={(search) => {
        // A cursor belongs to the previous result set; drop it on any change.
        const next = new URLSearchParams(search);
        next.delete("after");
        void navigate({
          to: ".",
          search: searchFromString(next.toString()),
          replace: searchStr.length > 0,
          resetScroll: false,
        });
      }}
    >
      <CollectionViewedTracker collection={loaderData.collection} />
      <main className="flex-1" id="main-content" tabIndex={-1}>
        <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
          <BreadcrumbJsonLd collection={loaderData.collection} origin={loaderData.origin} />
          <Breadcrumb collection={loaderData.collection} />
          <CollectionHeader collection={loaderData.collection} />
          <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
            <aside className="hidden lg:block" aria-label="Filters">
              <div className="sticky top-8">
                <h2 className="type-heading-sm text-on-surface mb-2">Filters</h2>
                <FacetForm availableFilters={loaderData.availableFilters} />
              </div>
            </aside>
            <div>
              <CollectionResults loaderData={loaderData} />
            </div>
          </div>
        </div>
      </main>
    </CollectionProvider>
  );
}
