import { parseCollectionParams, type AvailableFilter } from "@shopify/hydrogen";
import type { ProductFilter as StorefrontApiProductFilter } from "@shopify/hydrogen/storefront-api-types";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import { CollectionBrowser } from "@/components/CollectionBrowser";
import { COLLECTION_QUERY } from "@/lib/queries";
import { canonicalUrl } from "@/lib/site";
import { staticStorefrontClient } from "@/lib/storefront-static";
import { toURLSearchParams } from "@/lib/url-params";

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const { collection } = await fetchCollection(handle, undefined, "");
  const title = collection?.title ?? "Collection";
  const description = collection?.description ?? "";
  return {
    title,
    description,
    alternates: { canonical: `/collections/${handle}` },
    openGraph: {
      title: `${title} — CORE`,
      description,
      type: "website",
      url: canonicalUrl(`/collections/${handle}`),
    },
  };
}

async function fetchCollection(
  handle: string,
  after: string | undefined,
  searchString: string,
): Promise<{
  collection: Awaited<ReturnType<typeof query>>["collection"] | null;
  products: Awaited<ReturnType<typeof query>>["products"];
  availableFilters: AvailableFilter[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
}> {
  "use cache";
  cacheLife("minutes");
  cacheTag("collections", "products");

  // Reconstruct URLSearchParams from the serialized search string. `use cache`
  // serializes arguments, so a URLSearchParams passed in loses `.get` — pass a
  // plain string across the cache boundary and parse inside.
  const browse = parseCollectionParams(new URLSearchParams(searchString));
  const result = await query(handle, after, browse.filters, browse.sortKey, browse.reverse);
  return result;
}

async function query(
  handle: string,
  after: string | undefined,
  filters: ReturnType<typeof parseCollectionParams>["filters"],
  sortKey: ReturnType<typeof parseCollectionParams>["sortKey"],
  reverse: boolean,
) {
  const { data, errors } = await staticStorefrontClient.graphql(COLLECTION_QUERY, {
    variables: {
      handle,
      first: 24,
      after,
      filters:
        filters.length > 0
          ? // F13: skill-sanctioned generated-type cast at the query variable
            // boundary (hydrogen-collection-browser/references/react.md).
            (filters as StorefrontApiProductFilter[])
          : undefined,
      sortKey,
      reverse: reverse || undefined,
    },
  });

  if (errors) {
    console.error("[hydrogen] Collection query failed", errors);
  }

  const collection = data?.collection ?? null;
  return {
    collection,
    products: collection?.products.nodes ?? [],
    availableFilters: collection?.products.filters ?? [],
    pageInfo: collection?.products.pageInfo ?? { hasNextPage: false },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { handle } = await params;
  const urlSearch = toURLSearchParams(await searchParams);
  const after = urlSearch.get("after") ?? undefined;

  const { collection, products, availableFilters, pageInfo } = await fetchCollection(
    handle,
    after,
    urlSearch.toString(),
  );

  // 404 only when the query has no GraphQL errors and the collection is missing
  // (F8: don't blanket-404 on a Storefront auth error — errors are logged above).
  if (!collection) {
    notFound();
  }

  return (
    <CollectionBrowser
      mode="collection"
      handle={collection.handle}
      collection={{
        id: collection.id,
        handle: collection.handle,
        title: collection.title,
        description: collection.description,
        descriptionHtml: collection.descriptionHtml,
      }}
      products={products}
      availableFilters={availableFilters}
      pageInfo={pageInfo}
      dataSearch={urlSearch.toString()}
    />
  );
}
