import { createFileRoute, Link } from "@tanstack/react-router";

import { CollectionCard, type CollectionCardData } from "~/components/CollectionCard";
import { toStorefrontSearch } from "~/lib/search-params";
import { getCollections } from "~/server/collections";

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Collections · CORE" },
      { name: "description", content: "Browse all CORE collections." },
    ],
  }),
  validateSearch: toStorefrontSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ location }) => getCollections({ data: { search: location.searchStr } }),
  component: CollectionsPage,
});

function BreadcrumbJsonLd({ origin }: { origin: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${origin}/collections` },
    ],
  };

  return <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>;
}

function Breadcrumb() {
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
            Collections
          </span>
        </li>
      </ol>
    </nav>
  );
}

function CollectionsGrid({ collections }: { collections: readonly CollectionCardData[] }) {
  if (collections.length === 0) {
    return (
      <div className="border-border bg-surface-secondary rounded-card border p-8 text-center">
        <h2 className="type-heading-md text-on-surface">No collections found</h2>
        <p className="text-on-surface-secondary mt-2 text-sm">
          Check back soon for curated collections.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="sr-only">Browse collections</h2>
      <div className="contain-paint">
        <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, index) => (
            <li key={collection.handle}>
              <CollectionCard collection={collection} priority={index === 0} />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function CollectionsPage() {
  const { collections, origin } = Route.useLoaderData();

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
        <BreadcrumbJsonLd origin={origin} />
        <Breadcrumb />
        <div className="mb-8">
          <h1 className="type-display text-on-surface">Collections</h1>
        </div>
        <CollectionsGrid collections={collections.nodes} />
        {collections.pageInfo.hasNextPage && collections.pageInfo.endCursor ? (
          <div className="mt-12 flex justify-center">
            <Link
              to="/collections"
              search={{ after: collections.pageInfo.endCursor }}
              className="button-outline rounded-button focus-visible:outline-accent inline-flex h-11 items-center justify-center gap-2 px-6 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Next page
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
