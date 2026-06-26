import { gql, type StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

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

const COLLECTION_CARD_SHAPE_QUERY = gql(
  `query CollectionCardShape { collections(first: 1) { nodes { ...CollectionCard } } }`,
  [COLLECTION_CARD_FRAGMENT],
);

export type CollectionCardData = StorefrontApi.ResultOf<
  typeof COLLECTION_CARD_SHAPE_QUERY
>["collections"]["nodes"][number];

export type CollectionCardProps = {
  collection: CollectionCardData;
  priority?: boolean;
  productCount?: number;
  useProductImageFallback?: boolean;
};

function productCountText(collection: CollectionCardData, productCount?: number) {
  if (typeof productCount === "number") {
    return `${productCount} ${productCount === 1 ? "product" : "products"}`;
  }

  if (collection.productCountProbe.pageInfo.hasNextPage) {
    return `${COLLECTION_CARD_PRODUCT_COUNT_LIMIT}+ products`;
  }

  const count = collection.productCountProbe.nodes.length;
  return `${count} ${count === 1 ? "product" : "products"}`;
}

export function CollectionCard({
  collection,
  priority = false,
  productCount,
  useProductImageFallback = true,
}: CollectionCardProps) {
  const fallbackImage = useProductImageFallback
    ? (collection.products.nodes[0]?.featuredImage ?? null)
    : null;
  const image = collection.image ?? fallbackImage;
  const imageWidth = collection.image?.width ?? undefined;
  const imageHeight = collection.image?.height ?? undefined;

  return (
    <article
      className="card group rounded-card relative overflow-hidden"
      aria-label={collection.title}
      data-testid="collection-card"
    >
      <div className="bg-surface-secondary relative block aspect-square overflow-hidden">
        {image ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
            <img
              src={image.url}
              alt={image.altText ?? collection.title}
              width={imageWidth}
              height={imageHeight}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
            />
          </div>
        ) : null}
      </div>
      <div className="overlay-dark pointer-events-none absolute inset-0" />
      <div className="text-interactive-text absolute inset-x-0 bottom-0 z-10 p-4 text-left">
        <h3 className="type-body-lg font-medium">
          <Link
            to={`/collections/${collection.handle}`}
            className="card-link text-interactive-text rounded-card focus-visible:outline-accent"
            aria-label={collection.title}
          >
            {collection.title}
          </Link>
        </h3>
        <p className="type-body-sm mt-0.5 opacity-80">
          {productCountText(collection, productCount)}
        </p>
      </div>
    </article>
  );
}
