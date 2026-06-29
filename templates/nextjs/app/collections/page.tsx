import Link from "next/link";

import { CollectionCard } from "../components/CollectionCard";
import { loadCollectionsPage } from "../lib/collections";
import { toURLSearchParams, type NextSearchParams } from "../lib/url";

export const dynamic = "force-dynamic";

type CollectionsPageProps = {
  searchParams: Promise<NextSearchParams>;
};

function breadcrumbJsonLd(origin: string) {
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
        name: "Collections",
        item: `${origin}/collections`,
      },
    ],
  };
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const urlSearch = toURLSearchParams(await searchParams);
  const data = await loadCollectionsPage({ after: urlSearch.get("after") || undefined });
  const collections = data.collections.nodes;

  return (
    <main className="flex-1" id="main-content" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(data.origin)) }}
      />
      <div className="max-w-page px-margin mx-auto w-full py-8 md:py-12">
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
                Collections
              </span>
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="type-display text-on-surface">Collections</h1>
        </div>

        <h2 className="sr-only">Browse collections</h2>
        {collections.length > 0 ? (
          <div className="contain-paint">
            <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection, index) => (
                <li key={collection.handle}>
                  <CollectionCard collection={collection} priority={index === 0} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="border-border bg-surface-secondary rounded-lg border p-8 text-center">
            <p className="type-heading-sm text-on-surface">No collections found</p>
            <p className="text-on-surface-secondary mt-2 text-sm">
              Check back soon for curated product collections.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
