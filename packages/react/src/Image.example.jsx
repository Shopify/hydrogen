import {Image} from '@shopify/hydrogen-react';

export default function ProductImage({product}) {
  const image = product.featuredImage;

  if (!image) {
    return null;
  }

  return <Image data={image} />;
}
