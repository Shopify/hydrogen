import type { StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import type { PRODUCT_CARD_QUERY } from "@/lib/fragments";
import { shopifyImageUrl, srcSetFor } from "@/lib/image";
import { formatPrice } from "@/lib/money";

/** The typed product card node consumed by grids across the storefront. */
export type ProductCardData = NonNullable<
  StorefrontApi.ResultOf<typeof PRODUCT_CARD_QUERY>["product"]
>;

type ProductCardProps = {
  product: ProductCardData;
  /** Eager-load the first row on hero-less pages (PLP/search LCP). */
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * Shared `ProductCard` — image with `images[1]` hover-swap, title
 * (`type-body-sm line-clamp-2`), price block (`text-sale` +
 * `<s class="text-compare">` on sale), and `badge-sale`/`badge-soldout`
 * positioned `absolute start-2 top-2`. Reused by home, collection, search, and
 * the PDP "you may also like" strip (engineering.md F13).
 *
 * The whole card is a stretched link via `.card-link::after` so the title
 * anchor's hit area climbs to the whole card. Server-rendered (no client
 * interactivity).
 */
export function ProductCard({
  product,
  loading = "lazy",
  fetchPriority = "auto",
}: ProductCardProps) {
  const primaryImage = product.featuredImage;
  const secondaryImage = product.images.nodes[1] ?? null;
  const minPrice = product.priceRange.minVariantPrice;
  const compareAt = product.compareAtPriceRange?.minVariantPrice ?? null;
  const onSale = compareAt && Number(compareAt.amount) > Number(minPrice.amount);
  const soldOut = !product.availableForSale;

  return (
    <article className="group card flex flex-col gap-2" aria-label={product.title}>
      <div className="rounded-card relative block aspect-square overflow-hidden">
        {primaryImage ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
            <img
              src={shopifyImageUrl(primaryImage.url, { width: 600 })}
              srcSet={srcSetFor(primaryImage.url, { width: 600 })}
              alt={primaryImage.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={loading}
              {...(fetchPriority !== "auto" ? { fetchPriority: fetchPriority } : {})}
            />
          </div>
        ) : (
          <div className="bg-surface-secondary h-full w-full" />
        )}
        {secondaryImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100">
            <img
              src={shopifyImageUrl(secondaryImage.url, { width: 600 })}
              srcSet={srcSetFor(secondaryImage.url, { width: 600 })}
              alt={secondaryImage.altText ?? `${product.title} alternate`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        {onSale ? (
          <span className="badge-sale absolute start-2 top-2 inline-flex items-center rounded-full font-medium">
            Sale
          </span>
        ) : null}
        {soldOut ? (
          <span className="badge-soldout absolute start-2 top-2 inline-flex items-center rounded-full font-medium">
            Sold out
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5 text-left">
        <h3 className="type-body-sm text-on-surface line-clamp-2 font-medium">
          <Link href={`/products/${product.handle}`} className="card-link text-on-surface">
            {product.title}
          </Link>
        </h3>
        <div className="inline-flex flex-wrap items-baseline gap-2 text-sm">
          <span className={onSale ? "text-sale font-medium" : "text-on-surface font-medium"}>
            <span className="sr-only">{onSale ? "Sale price: " : "Price: "}</span>
            {formatPrice(minPrice)}
          </span>
          {onSale && compareAt ? (
            <s className="text-compare text-sm">
              <span className="sr-only">Regular price: </span>
              {formatPrice(compareAt)}
            </s>
          ) : null}
        </div>
      </div>
    </article>
  );
}
