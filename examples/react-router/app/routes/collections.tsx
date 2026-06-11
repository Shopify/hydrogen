import { gql } from "@shopify/hydrogen";
import { Link } from "react-router";

import { storefrontClientContext } from "../lib/storefront";
import type { Route } from "./+types/collections";

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

export function meta() {
  return [{ title: "Collections — Mock.shop" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const storefrontClient = context.get(storefrontClientContext);
  const { data } = await storefrontClient.graphql(COLLECTIONS_QUERY);
  const collections = data?.collections?.nodes ?? [];
  return { collections };
}

export default function Collections({ loaderData }: Route.ComponentProps) {
  const { collections } = loaderData;

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <header>
        <h1 className="text-6xl font-black tracking-tight md:text-8xl">Collections</h1>
      </header>

      <section className="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.handle}
            to={`/collections/${collection.handle}`}
            className="group block"
          >
            <div className="aspect-square overflow-hidden bg-neutral-100">
              {collection.image ? (
                <img
                  src={collection.image.url}
                  alt={collection.image.altText ?? collection.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="mt-5">
              <h3 className="text-base font-semibold">{collection.title}</h3>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
