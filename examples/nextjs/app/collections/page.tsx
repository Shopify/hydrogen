import { gql } from "@shopify/hydrogen";
import Link from "next/link";

import { getStorefrontClient } from "@/lib/storefront";

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

export const metadata = {
  title: "Collections — Mock.shop",
};

export default async function CollectionsPage() {
  const storefrontClient = await getStorefrontClient();
  const { data } = await storefrontClient.graphql(COLLECTIONS_QUERY);
  const collections = data?.collections?.nodes ?? [];

  return (
    <main className="mx-auto max-w-[1480px] px-6 py-16 md:py-20">
      <header>
        <h1 className="text-6xl font-black tracking-tight md:text-8xl">Collections</h1>
      </header>

      <section className="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.handle}
            href={`/collections/${collection.handle}`}
            className="group block"
          >
            <div className="aspect-square overflow-hidden bg-neutral-100">
              {collection.image ? (
                // eslint-disable-next-line @next/next/no-img-element
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
