import {Image} from '@shopify/storefront-kit-react';
import type {Product} from '@shopify/storefront-kit-react/storefront-api-types';

export default function ProductImage({product}: {product: Product}) {
  const image = product.featuredImage;

  if (!image) {
    return null;
  }

  return <Image data={image} />;
}
