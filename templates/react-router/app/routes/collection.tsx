import { getSortByValue } from "@shopify/hydrogen";
import { CollectionProvider } from "@shopify/hydrogen/react";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

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
import { AnalyticsEvent, getAnalytics, getAnalyticsShop } from "~/lib/analytics";
import { loadCollectionPage } from "~/lib/collection";
import { storefrontClientContext } from "~/lib/storefront";

import type { Route } from "./+types/collection";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Collection · CORE" },
    {
      name: "description",
      content: "Shop the CORE collection page.",
    },
  ];
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response("Not Found", { status: 404 });

  const storefrontClient = context.get(storefrontClientContext);
  return loadCollectionPage({ storefrontClient, handle, request });
}

type CollectionData = Route.ComponentProps["loaderData"]["collection"];
type ProductNode = Route.ComponentProps["loaderData"]["products"][number];

function CollectionViewedTracker({ collection }: { collection: CollectionData }) {
  useEffect(() => {
    const analytics = getAnalytics();
    const shop = getAnalyticsShop();
    if (!analytics || !shop) return;

    analytics.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: {
        id: collection.id,
        handle: collection.handle,
      },
      url: window.location.href,
      shop,
    });
  }, [collection.id, collection.handle]);

  return null;
}

function BreadcrumbJsonLd({ collection, origin }: { collection: CollectionData; origin: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${origin}/`,
      },
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

function ProductGrid({ products }: { products: readonly ProductNode[] }) {
  if (products.length === 0) return null;

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

function EmptyState({ collectionPath }: { collectionPath: string }) {
  return (
    <div className="border-border bg-surface-secondary rounded-card border p-8 text-center">
      <h2 className="type-heading-md text-on-surface">No products found</h2>
      <p className="text-on-surface-secondary mt-2 text-sm">
        Try removing filters to see more products in this collection.
      </p>
      <Link
        to={collectionPath}
        preventScrollReset
        className="rounded-button button-primary focus-visible:outline-accent mt-6 inline-flex h-11 items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[color,background-color,border-color,transform] motion-safe:active:scale-[0.97]"
      >
        Clear all filters
      </Link>
    </div>
  );
}

function CollectionResults({ loaderData }: { loaderData: Route.ComponentProps["loaderData"] }) {
  const collectionPath = `/collections/${loaderData.collection.handle}`;
  const { nodes, pageInfo, isLoading, loadMore } = useLoadMore(
    loaderData.products,
    loaderData.pageInfo,
    loaderData.dataSearch,
  );
  const countText = `Showing ${nodes.length}`;
  const defaultSortValue = getSortByValue("COLLECTION_DEFAULT", false);

  return (
    <>
      <Toolbar
        countText={countText}
        sortOptions={COLLECTION_SORT_OPTIONS}
        defaultSortValue={defaultSortValue}
      />
      <ActiveFilterChips
        basePath={collectionPath}
        clearAllTo={collectionPath}
        currencyCode={loaderData.currencyCode}
      />
      <h2 className="sr-only">Products</h2>
      {nodes.length > 0 ? (
        <ProductGrid products={nodes} />
      ) : (
        <EmptyState collectionPath={collectionPath} />
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

export default function CollectionRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  return (
    <CollectionProvider
      data={{ handle: loaderData.collection.handle, dataSearch: loaderData.dataSearch }}
      urlSearch={searchParams.toString()}
      onChange={(search) => {
        const nextParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
        nextParams.delete("after");
        const nextSearch = nextParams.toString();
        void navigate(
          { search: nextSearch ? `?${nextSearch}` : "" },
          {
            replace: searchParams.size > 0,
            preventScrollReset: true,
          },
        );
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
