import {Image, IMAGE_FRAGMENT} from '@shopify/hydrogen-react';

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

export default function ProductImage({product}) {
  const image = product.featuredImage;

  if (!image) {
    return null;
  }

  return (
    <Image
      data={image}
      sizes="(min-width: 45em) 50vw, 100vw"
      aspectRatio="4/5"
    />
  );
}
