import {Image} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

export default function ProductImage({product}: {product: Product}) {
  const image = product.featuredImage;

  if (!image) {
    return null;
  }

  return <Image data={image} />;
}
