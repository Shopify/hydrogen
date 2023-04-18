import React from 'react';
import {Image, IMAGE_FRAGMENT} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

// An example query that includes the image fragment
const IMAGE_QUERY = `#graphql
  ${IMAGE_FRAGMENT}
  query {
    product {
      featuredImage {
        ...Image
      }
    }
  }
`;

export default function ProductImage({product}: {product: Product}) {
  if (!image) {
    return null;
  }

  return (
    <Image
      data={product.featuredImage}
      sizes="(min-width: 45em) 50vw, 100vw"
      aspectRatio="4/5"
    />
  );
}
