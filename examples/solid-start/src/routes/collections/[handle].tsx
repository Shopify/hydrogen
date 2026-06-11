import { gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { createAsync, query, useParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, For, Show } from "solid-js";

import { ProductCard } from "../../components/ProductCard";
import { AnalyticsEvent, analyticsShop, getAnalytics } from "../../lib/analytics";
import { getRequestStorefrontClient } from "../../lib/request-storefront";

const COLLECTION_QUERY = gql(`
  query Collection($handle: String!) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: 24) {
        nodes {
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`);

const fetchCollection = query(async (handle: string) => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(COLLECTION_QUERY, {
    variables: { handle },
  });
  if (!data?.collection) {
    throw new Error(`Collection not found: ${handle}`);
  }
  return data.collection;
}, "collection");

export const route = {
  preload: ({ params }) => params.handle && fetchCollection(params.handle),
} satisfies RouteDefinition;

export default function Collection() {
  const params = useParams<{ handle: string }>();
  const collection = createAsync(() => fetchCollection(params.handle));

  createEffect(() => {
    const c = collection();
    if (!c) return;
    getAnalytics()?.publish(AnalyticsEvent.COLLECTION_VIEWED, {
      collection: { id: c.id, handle: c.handle },
      url: window.location.href,
      shop: analyticsShop,
    });
  });

  return (
    <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <Show when={collection()}>
        {(c) => (
          <>
            <Title>{c().title} — Mock.shop</Title>
            <header class="max-w-2xl">
              <h1 class="text-6xl font-black tracking-tight md:text-8xl">{c().title}</h1>
              {c().description ? (
                <p class="mt-6 text-base leading-relaxed text-black/70 md:text-lg">
                  {c().description}
                </p>
              ) : null}
            </header>

            <section class="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              <For each={c().products.nodes}>{(product) => <ProductCard product={product} />}</For>
            </section>
          </>
        )}
      </Show>
    </main>
  );
}
