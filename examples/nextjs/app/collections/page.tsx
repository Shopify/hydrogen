import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CollectionCard } from "@/components/CollectionCard";
import { content } from "@/lib/content";
import { COLLECTIONS_QUERY } from "@/lib/queries";
import { canonicalUrl } from "@/lib/site";
import { staticStorefrontClient } from "@/lib/storefront-static";

export const metadata: Metadata = {
  title: "Collections",
  description: "Browse all collections",
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Collections — CORE",
    type: "website",
    url: canonicalUrl("/collections"),
  },
};

async function fetchCollections(after?: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");

  const { data, errors } = await staticStorefrontClient.graphql(COLLECTIONS_QUERY, {
    variables: { first: 24, after },
  });
  if (errors) {
    console.error("[hydrogen] Collections query failed", errors);
  }
  return {
    collections: data?.collections?.nodes ?? [],
    pageInfo: data?.collections?.pageInfo ?? { hasNextPage: false },
  };
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const after = typeof params.after === "string" ? params.after : undefined;
  const { collections, pageInfo } = await fetchCollections(after);

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: content.collections.title }]} />
      </div>

      <h1 className="type-display mb-8">{content.collections.title}</h1>

      <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection, index) => (
          <li key={collection.id}>
            <CollectionCard
              collection={collection}
              loading={index < 3 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </li>
        ))}
      </ul>

      {pageInfo.hasNextPage ? (
        <div className="mt-12 text-center">
          <Link
            href={`/collections?after=${encodeURIComponent(pageInfo.endCursor ?? "")}`}
            className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
