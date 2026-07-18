import { Cache, gql } from "@shopify/hydrogen";
import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { CollectionCard, type CollectionCardData } from "~/components/CollectionCard";
import { content } from "~/lib/content";
import { COLLECTION_CARD_FRAGMENT } from "~/lib/fragments";
import { canonicalUrl } from "~/lib/site";

const COLLECTIONS_QUERY = gql(
  `
  query CollectionsList($first: Int!, $after: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    collections(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...CollectionCard
      }
    }
  }
`,
  [COLLECTION_CARD_FRAGMENT],
);

type CollectionsInput = { after?: string };

const getCollectionsData = createServerFn({ method: "GET" })
  .validator((data: CollectionsInput) => data)
  .handler(async ({ data: input, context }) => {
    const { data, errors } = await context.storefrontClient.graphql(COLLECTIONS_QUERY, {
      variables: { first: 24, after: input.after },
      cache: Cache.long(),
    });

    if (errors) {
      console.error("[hydrogen] Collections query failed", errors);
    }

    return {
      collections: data?.collections?.nodes ?? [],
      pageInfo: data?.collections?.pageInfo ?? { hasNextPage: false, endCursor: null },
    };
  });

export const Route = createFileRoute("/collections")({
  validateSearch: (search: Record<string, unknown>): CollectionsInput => ({
    after: typeof search.after === "string" ? search.after : undefined,
  }),
  loaderDeps: ({ search }) => ({ after: search.after }),
  loader: ({ deps }) => getCollectionsData({ data: deps }),
  head: () => ({
    meta: [
      { title: "Collections — CORE" },
      { name: "description", content: "Browse all collections" },
      { property: "og:title", content: "Collections — CORE" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/collections") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/collections") }],
  }),
  component: Collections,
});

function Collections() {
  const loaderData = Route.useLoaderData();
  const { collections, pageInfo } = loaderData;

  const nextCursor = pageInfo.endCursor ?? undefined;

  return (
    <div className="max-w-page px-margin mx-auto w-full py-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: content.collections.title }]} />
      </div>

      <h1 className="type-display mb-8">{content.collections.title}</h1>

      <ul role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection: CollectionCardData, index: number) => (
          <li key={collection.id}>
            <CollectionCard
              collection={collection}
              loading={index < 3 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </li>
        ))}
      </ul>

      {pageInfo.hasNextPage && nextCursor ? (
        <div className="mt-12 text-center">
          <Link
            to="/collections"
            search={{ after: nextCursor }}
            className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
