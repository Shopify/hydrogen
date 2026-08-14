import { A } from "@solidjs/router";

import { formatMoney } from "../lib/money";

export type ProductCardData = {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

export function ProductCard(props: { product: ProductCardData }) {
  return (
    <A href={`/products/${props.product.handle}`} class="group block">
      <div class="aspect-square overflow-hidden bg-neutral-100">
        {props.product.featuredImage ? (
          <img
            src={props.product.featuredImage.url}
            alt={props.product.featuredImage.altText ?? props.product.title}
            class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div class="mt-5">
        <h3 class="font-semibold">{props.product.title}</h3>
        <p class="mt-1 text-sm font-bold">
          {formatMoney(props.product.priceRange.minVariantPrice)}
        </p>
      </div>
    </A>
  );
}
