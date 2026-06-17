import { gql } from "@shopify/hydrogen";
import { Title } from "@solidjs/meta";
import { A, createAsync, query, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";

import { getRequestStorefrontClient } from "../../lib/request-storefront";

const COLLECTIONS_QUERY = gql(`
  query Collections {
    collections(first: 12) {
      nodes {
        handle
        title
        image {
          url
          altText
        }
      }
    }
  }
`);

const fetchCollections = query(async () => {
  "use server";
  const storefrontClient = getRequestStorefrontClient();
  const { data } = await storefrontClient.graphql(COLLECTIONS_QUERY);
  return data?.collections?.nodes ?? [];
}, "collections");

export const route = {
  preload: () => fetchCollections(),
} satisfies RouteDefinition;

export default function Collections() {
  const collections = createAsync(() => fetchCollections());

  return (
    <main class="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <Title>Collections — Mock.shop</Title>
      <header>
        <h1 class="text-6xl font-black tracking-tight md:text-8xl">Collections</h1>
      </header>

      <section class="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <Show when={collections()}>
          {(items) => (
            <For each={items()}>
              {(collection) => (
                <A href={`/collections/${collection.handle}`} class="group block">
                  <div class="aspect-square overflow-hidden bg-neutral-100">
                    {collection.image ? (
                      <img
                        src={collection.image.url}
                        alt={collection.image.altText ?? collection.title}
                        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div class="mt-5">
                    <h3 class="text-base font-semibold">{collection.title}</h3>
                  </div>
                </A>
              )}
            </For>
          )}
        </Show>
      </section>
    </main>
  );
}
