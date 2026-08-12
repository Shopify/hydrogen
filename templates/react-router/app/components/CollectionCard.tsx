import type { StorefrontApi } from "@shopify/hydrogen";
import { Link } from "react-router";

import type { COLLECTION_CARD_QUERY } from "~/lib/fragments";
import { shopifyImageUrl, srcSetFor } from "~/lib/image";

/** The typed collection card node. */
export type CollectionCardData = NonNullable<
  StorefrontApi.ResultOf<typeof COLLECTION_CARD_QUERY>["collection"]
>;

type CollectionCardProps = {
  collection: CollectionCardData;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

export function CollectionCard({
  collection,
  loading = "lazy",
  fetchPriority = "auto",
}: CollectionCardProps) {
  const image = collection.image ?? collection.products.nodes[0]?.featuredImage;
  const alt = collection.image?.altText ?? collection.title;

  return (
    <article className="group card relative overflow-hidden" aria-label={collection.title}>
      <div className="bg-surface-secondary relative block aspect-square overflow-hidden motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
        {image ? (
          <img
            src={shopifyImageUrl(image.url, { width: 600 })}
            srcSet={srcSetFor(image.url, { width: 600 })}
            alt={alt}
            className="h-full w-full object-cover"
            loading={loading}
            {...(fetchPriority !== "auto" ? { fetchPriority: fetchPriority } : {})}
          />
        ) : null}
      </div>
      <div className="overlay-dark pointer-events-none absolute inset-0" />
      <Link
        to={`/collections/${collection.handle}`}
        className="focus-visible:outline-accent rounded-card absolute inset-0 z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={collection.title}
      />
      <div className="text-interactive-text pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 text-left">
        <h3 className="type-body-lg text-interactive-text">{collection.title}</h3>
      </div>
    </article>
  );
}
