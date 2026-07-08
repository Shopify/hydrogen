import { Cache, gql } from "@shopify/hydrogen";
import type { MetaFunction } from "react-router";

import { Breadcrumbs } from "~/components/Breadcrumbs";
import { CollectionCard } from "~/components/CollectionCard";
import { content } from "~/lib/content";
import { COLLECTION_CARD_FRAGMENT } from "~/lib/fragments";
import { canonicalUrl } from "~/lib/site";
import { storefrontClientContext } from "~/lib/storefront-context";

import type { Route } from "./+types/collections";

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

export const meta: MetaFunction = () => {
  return [
    { title: "Collections — CORE" },
    { name: "description", content: "Browse all collections" },
    { tagName: "link", rel: "canonical", href: canonicalUrl("/collections") },
    { property: "og:title", content: "Collections — CORE" },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonicalUrl("/collections") },
  ];
};

export async function loader({ context, request }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const url = new URL(request.url);
  const after = url.searchParams.get("after") ?? undefined;

  const { data, errors } = await storefrontClient.graphql(COLLECTIONS_QUERY, {
    variables: { first: 24, after },
    cache: Cache.long(),
  });

  if (errors) {
    console.error("[hydrogen] Collections query failed", errors);
  }

  return {
    collections: data?.collections?.nodes ?? [],
    pageInfo: data?.collections?.pageInfo ?? { hasNextPage: false },
  };
}

export default function Collections({ loaderData }: Route.ComponentProps) {
  const { collections, pageInfo } = loaderData;

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
          <a
            href={`/collections?after=${encodeURIComponent(pageInfo.endCursor ?? "")}`}
            className="rounded-button button-outline focus-visible:outline-accent inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Load more
          </a>
        </div>
      ) : null}
    </div>
  );
}
