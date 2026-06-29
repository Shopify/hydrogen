"use client";

import { CollectionProvider, useCollection } from "@shopify/hydrogen/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CollectionPageData } from "../lib/collection";
import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { CollectionViewedTracker } from "./AnalyticsTrackers";
import {
  ActiveFilterChips,
  COLLECTION_SORT_OPTIONS,
  FacetForm,
  FilterDrawer,
  LoadMore,
  Toolbar,
  useLoadMore,
} from "./CollectionBrowse";
import { ProductCard } from "./ProductCard";

const FILTER_DRAWER_ID = "collection-filter-drawer";

function breadcrumbJsonLd(collection: CollectionPageData["collection"], origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: collection.title,
        item: `${origin}/collections/${collection.handle}`,
      },
    ],
  };
}

function CollectionHeader({
  collection,
  origin,
}: {
  collection: CollectionPageData["collection"];
  origin: string;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(collection, origin)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-on-surface-secondary flex items-center gap-1.5 text-sm">
          <li>
            <Link
              href="/"
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
      <div className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h1 className="type-display text-on-surface mb-2">{collection.title}</h1>
          {collection.descriptionHtml ? (
            <div
              className="richtext text-on-surface-secondary type-body-sm max-w-2xl"
              dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }}
            />
          ) : collection.description ? (
            <div className="richtext text-on-surface-secondary type-body-sm max-w-2xl">
              <p>{collection.description}</p>
            </div>
          ) : null}
        </div>
        {collection.image ? (
          <div className="bg-surface-secondary aspect-landscape w-full overflow-hidden md:w-64">
            <img
              src={shopifyImageUrl(collection.image.url, {
                width: 800,
                height: 450,
                crop: "center",
              })}
              srcSet={srcSetFor(collection.image.url, {
                width: 800,
                height: 450,
                crop: "center",
              })}
              sizes="(min-width: 768px) 16rem, 100vw"
              alt={collection.image.altText ?? collection.title}
              className="h-full w-full object-cover"
              width={800}
              height={450}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}

function CollectionContent({ data }: { data: CollectionPageData }) {
  const state = useCollection();
  const basePath = `/collections/${data.collection.handle}`;
  const { items, pageInfo, pending, setPending } = useLoadMore({
    initialItems: data.products,
    pageInfo: data.pageInfo,
    dataSearch: data.dataSearch,
  });
  const isLoading = state.status === "loading";

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
        <CollectionViewedTracker collection={data.collection} />
        <CollectionHeader collection={data.collection} origin={data.origin} />

        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
          <aside className="hidden lg:block" aria-label="Filters">
            <div className="sticky top-8">
              <h2 className="type-heading-sm text-on-surface mb-2">Filters</h2>
              <FacetForm availableFilters={data.availableFilters} idPrefix="collection-desktop" />
            </div>
          </aside>

          <div className="min-w-0">
            <Toolbar
              countText={`Showing ${items.length}`}
              defaultSortValue={COLLECTION_SORT_OPTIONS[0].value}
              filterDrawerId={FILTER_DRAWER_ID}
            />
            <ActiveFilterChips
              basePath={basePath}
              clearHref={basePath}
              currencyCode={data.currencyCode}
            />

            <h2 className="sr-only">Products</h2>
            {items.length > 0 ? (
              <div className={`px-1 contain-paint ${isLoading ? "opacity-60" : ""}`}>
                <ul
                  id="product-grid"
                  role="list"
                  className="grid grid-cols-2 gap-x-1 gap-y-10 lg:grid-cols-3"
                  data-testid="product-grid"
                >
                  {items.map((product, index) => (
                    <li key={product.id}>
                      <ProductCard product={product} priority={index < 3} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : isLoading ? (
              <div
                className="border-border bg-surface-secondary rounded-lg border p-8 text-sm"
                data-testid="product-grid"
              >
                Updating products…
              </div>
            ) : (
              <div
                className="border-border bg-surface-secondary rounded-lg border p-8 text-center"
                data-testid="product-grid"
              >
                <p className="type-heading-sm text-on-surface">No products found</p>
                <p className="text-on-surface-secondary mt-2 text-sm">
                  Try clearing filters to see more products.
                </p>
                <Link
                  href={basePath}
                  className="button-outline rounded-button focus-visible:outline-accent min-h-touch-target mt-4 inline-flex items-center justify-center px-4 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Clear all filters
                </Link>
              </div>
            )}

            <LoadMore
              pageInfo={pageInfo}
              pending={pending}
              setPending={setPending}
              shownCount={items.length}
            />
          </div>
        </div>
      </div>
      <FilterDrawer id={FILTER_DRAWER_ID} availableFilters={data.availableFilters} />
    </main>
  );
}

export function CollectionPageClient({ data }: { data: CollectionPageData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.toString();

  return (
    <CollectionProvider
      data={{ handle: data.collection.handle, dataSearch: data.dataSearch }}
      urlSearch={urlSearch}
      onChange={(search) => {
        const next = new URLSearchParams(search);
        next.delete("after");
        const query = next.toString();
        const href = query ? `${pathname}?${query}` : pathname;
        if (urlSearch) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
        router.refresh();
      }}
    >
      <CollectionContent data={data} />
    </CollectionProvider>
  );
}
