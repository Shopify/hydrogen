import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";

export const COLLECTION_CARD_PRODUCT_COUNT_LIMIT = 100;

export const COLLECTION_CARD_FRAGMENT = gql(`
  fragment CollectionCard on Collection {
    handle
    title
    image {
      url
      altText
      width
      height
    }
    products(first: 1) {
      nodes {
        featuredImage {
          url
          altText
          width
          height
        }
      }
    }
    productCountProbe: products(first: 100) {
      nodes {
        id
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`);

export const COLLECTION_CARD_SHAPE = gql(
  `
    query CollectionCardShape {
      collections(first: 1) {
        nodes {
          ...CollectionCard
        }
      }
    }
  `,
  [COLLECTION_CARD_FRAGMENT],
);

export type CollectionCardData = StorefrontApi.ResultOf<
  typeof COLLECTION_CARD_SHAPE
>["collections"]["nodes"][number];

type CollectionCardImage = NonNullable<CollectionCardData["image"]>;

function collectionImage(collection: CollectionCardData): CollectionCardImage | null {
  return collection.image ?? collection.products.nodes[0]?.featuredImage ?? null;
}

function productCountText(collection: CollectionCardData) {
  if (collection.productCountProbe.pageInfo.hasNextPage) {
    return `${COLLECTION_CARD_PRODUCT_COUNT_LIMIT}+ products`;
  }

  const count = collection.productCountProbe.nodes.length;
  return `${count} ${count === 1 ? "product" : "products"}`;
}

export function CollectionCard({
  collection,
  priority = false,
}: {
  collection: CollectionCardData;
  priority?: boolean;
}) {
  const image = collectionImage(collection);
  const href = `/collections/${collection.handle}`;

  return (
    <article
      className="card group rounded-card relative overflow-hidden"
      data-testid="collection-card"
    >
      <div className="bg-surface-secondary relative block aspect-square overflow-hidden">
        {image ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
            <img
              src={shopifyImageUrl(image.url, { width: 600, height: 600, crop: "center" })}
              srcSet={srcSetFor(image.url, { width: 600, height: 600, crop: "center" })}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
              alt={image.altText ?? collection.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={600}
              height={600}
            />
          </div>
        ) : (
          <div className="bg-surface-secondary h-full w-full" aria-hidden="true" />
        )}
      </div>
      <div className="overlay-dark pointer-events-none absolute inset-0" />
      <div className="text-interactive-text absolute inset-x-0 bottom-0 z-10 p-4 text-left">
        <h3 className="type-body-lg font-medium">
          <Link
            href={href}
            className="card-link text-interactive-text"
            aria-label={`View ${collection.title} collection`}
          >
            {collection.title}
          </Link>
        </h3>
        <p className="type-body-sm mt-0.5 opacity-80">{productCountText(collection)}</p>
      </div>
    </article>
  );
}
