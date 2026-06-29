import { gql, type StorefrontApi } from "@shopify/hydrogen";
import Link from "next/link";

import { shopifyImageUrl, srcSetFor } from "../lib/image";
import { formatPrice } from "../lib/money";

export const PRODUCT_CARD_FRAGMENT = gql(`
  fragment ProductCard on Product {
    id
    handle
    title
    availableForSale
    featuredImage {
      url
      altText
      width
      height
    }
    images(first: 2) {
      nodes {
        url
        altText
        width
        height
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
`);

export const PRODUCT_CARD_SHAPE = gql(
  `
    query ProductCardShape {
      products(first: 1) {
        nodes {
          ...ProductCard
        }
      }
    }
  `,
  [PRODUCT_CARD_FRAGMENT],
);

export type ProductCardData = StorefrontApi.ResultOf<
  typeof PRODUCT_CARD_SHAPE
>["products"]["nodes"][number];

function moneyGreater(a: { amount: string } | null | undefined, b: { amount: string }) {
  return Number.parseFloat(a?.amount ?? "0") > Number.parseFloat(b.amount);
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData;
  priority?: boolean;
}) {
  const image = product.featuredImage ?? product.images.nodes[0] ?? null;
  const hoverImage = product.images.nodes.find((node) => node.url !== image?.url) ?? null;
  const price = product.priceRange.minVariantPrice;
  const compareAtPrice = product.compareAtPriceRange.minVariantPrice;
  const onSale = moneyGreater(compareAtPrice, price);
  const soldOut = !product.availableForSale;

  return (
    <article
      className="group card relative flex flex-col gap-2"
      aria-label={product.title}
      data-testid="product-card"
    >
      <div className="rounded-card bg-surface-secondary relative block aspect-square overflow-hidden">
        {image ? (
          <div className="h-full w-full motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-[1.04]">
            <img
              src={shopifyImageUrl(image.url, { width: 600, height: 600, crop: "center" })}
              srcSet={srcSetFor(image.url, { width: 600, height: 600, crop: "center" })}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 50vw"
              alt={image.altText ?? product.title}
              className="h-full w-full object-cover"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              width={600}
              height={600}
            />
          </div>
        ) : null}
        {hoverImage ? (
          <div className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:group-hover:opacity-100">
            <img
              src={shopifyImageUrl(hoverImage.url, { width: 600, height: 600, crop: "center" })}
              srcSet={srcSetFor(hoverImage.url, { width: 600, height: 600, crop: "center" })}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 50vw"
              alt={hoverImage.altText ?? `${product.title} alternate`}
              className="h-full w-full object-cover"
              loading="lazy"
              width={600}
              height={600}
            />
          </div>
        ) : null}
        {soldOut ? (
          <span className="badge-soldout absolute start-2 top-2 inline-flex items-center rounded-full font-medium">
            Sold out
          </span>
        ) : onSale ? (
          <span className="badge-sale absolute start-2 top-2 inline-flex items-center rounded-full font-medium">
            Sale
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
          {onSale ? (
            <>
              <span className="text-sale font-medium">
                <span className="sr-only">Sale price: </span>
                {formatPrice(price)}
              </span>
              <s className="text-compare text-sm">
                <span className="sr-only">Regular price: </span>
                {formatPrice(compareAtPrice)}
              </s>
            </>
          ) : (
            <span className="text-on-surface font-medium">
              <span className="sr-only">Price: </span>
              {formatPrice(price)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
