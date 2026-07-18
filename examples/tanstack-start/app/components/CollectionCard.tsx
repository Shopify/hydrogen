import type { StorefrontApi } from "@shopify/hydrogen";
import { Link } from "@tanstack/react-router";

import { COLLECTION_CARD_QUERY } from "~/lib/fragments";
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

/**
 * Shared `CollectionCard` — an overlay tile (square image, `overlay-dark`
 * gradient, title-only, stretched link). Reused by the collections index and
 * the home "shop by category" grid (engineering.md F13). Title-only — no
 * product count (F5: the Storefront API has no cheap collection count).
 *
 * The `.card-link` is a direct child of the relative `.card` `<article>` so its
 * `::after` stretched hit area covers the whole card, not just the caption.
 * The caption is `pointer-events-none` so clicks over the title route to the
 * card link.
 */
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
        to="/collections/$handle"
        params={{ handle: collection.handle }}
        className="card-link"
        aria-label={collection.title}
      />
      <div className="text-interactive-text pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4 text-left">
        <h3 className="type-body-lg text-interactive-text">{collection.title}</h3>
      </div>
    </article>
  );
}
