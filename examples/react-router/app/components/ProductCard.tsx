import { Link } from "react-router";

import { formatMoney } from "../lib/money";

export type ProductCardData = {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link to={`/products/${product.handle}`} className="group block">
      <div className="aspect-square overflow-hidden bg-neutral-100">
        {product.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : null}
      </div>
      <div className="mt-5">
        <h3 className="font-semibold">{product.title}</h3>
        <p className="mt-1 text-sm font-bold">{formatMoney(product.priceRange.minVariantPrice)}</p>
      </div>
    </Link>
  );
}
