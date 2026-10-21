import { gql, type MoneyV2 } from "@shopify/hydrogen";
import type { Handle } from "remix/component";

import { localizePath } from "../lib/public/i18n.ts";
import { formatMoney } from "../lib/public/money.ts";
import { Image, type ImageData } from "./public/image.tsx";

export const PRODUCT_ITEM_FRAGMENT = gql(`
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
`);

export type ProductItemData = {
  id: string;
  handle: string;
  title: string;
  featuredImage?: ImageData | null;
  priceRange: { minVariantPrice: MoneyV2 };
};

export function ProductItem(
  handle: Handle<{ product: ProductItemData; pathPrefix: string; loading?: "eager" | "lazy" }>,
) {
  return () => {
    const { loading, pathPrefix, product } = handle.props;
    const image = product.featuredImage;

    return (
      <a
        class="product-item"
        href={localizePath(`/products/${encodeURIComponent(product.handle)}`, pathPrefix)}
      >
        {image ? (
          <Image
            data={image}
            alt={image.altText || product.title}
            aspectRatio={1}
            loading={loading}
            sizes="(min-width: 45em) 400px, 100vw"
          />
        ) : null}
        <h4>{product.title}</h4>
        <small>{formatMoney(product.priceRange.minVariantPrice)}</small>
      </a>
    );
  };
}
