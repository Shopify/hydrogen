import React from 'react';
import {Image} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

// An example query
const IMAGE_QUERY = `#graphql
  query {
    product {
      featuredImage {
        altText
        url
        height
        width
      }
    }
  }
`;

export default function ProductImage({product}: {product: Product}) {
  if (!product.featuredImage) {
    return null;
  }

  return (
    <Image
      data={product.featuredImage}
      sizes="(min-width: 45em) 50vw, 100vw"
      aspectRatio="2/3"
      focalPoint={{x: '0.5', y: '0.5'}} // Center focal point
    />
  );
}
