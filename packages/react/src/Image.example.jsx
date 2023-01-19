import {Image} from '@shopify/storefront-kit-react';

export default function ProductImage({product}) {
  const image = product.featuredImage;

  if (!image) {
    return null;
  }

  return <Image data={image} />;
}
