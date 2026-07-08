import type { CurrencyCode } from "@shopify/hydrogen/storefront-api-types";
import { Link } from "react-router";

import { Image } from "~/components/Image";
import { formatMoney } from "~/lib/money";
import { useVariantUrl } from "~/lib/variants";

export type ProductItemData = {
  id: string;
  handle: string;
  title: string;
  featuredImage?: {
    altText?: string | null;
    height?: number | null;
    id?: string | null;
    url: string;
    width?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: CurrencyCode;
    };
  };
};

export function ProductItem({
  product,
  loading,
}: {
  product: ProductItemData;
  loading?: "eager" | "lazy";
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;
  return (
    <Link className="product-item" key={product.id} prefetch="intent" to={variantUrl}>
      {image && (
        <Image
          alt={image.altText || product.title}
          aspectRatio="1/1"
          data={image}
          loading={loading}
          sizes="(min-width: 45em) 400px, 100vw"
        />
      )}
      <h4>{product.title}</h4>
      <small>{formatMoney(product.priceRange.minVariantPrice)}</small>
    </Link>
  );
}
