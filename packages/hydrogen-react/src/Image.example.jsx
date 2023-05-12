import {Image} from '@shopify/hydrogen-react';

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

export default function ProductImage({product}) {
  if (!product.featuredImage) {
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
