import {Image, IMAGE_FRAGMENT} from '@shopify/hydrogen-react';

// An example query that includes the image fragment
const IMAGE_QUERY = `#graphql
  query {
    product {
      featuredImage {
        # The IMAGE_FRAGMENT defines a fragment called "Image" which we can spread here
        ...Image
      }
    }
  }
  ${IMAGE_FRAGMENT}
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
