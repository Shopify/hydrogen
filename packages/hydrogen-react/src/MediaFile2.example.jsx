import {MediaFile} from '@shopify/hydrogen-react';

// An example query
const MEDIA_QUERY = `#graphql
  query {
    product {
      media(first: 1) {
        nodes {
          id
          ... on MediaImage {
            __typename
            image {
              id
              url
              width
              height
              altText
            }
          }
          presentation {
            asJson(format: IMAGE)
          }
        }
      }
    }
  }
`;

export function ProductFeatureImage({product}) {
  if (product.media.nodes.length === 0) {
    return null;
  }

  return (
    <MediaFile
      data={product.media.nodes[0]}
      mediaOptions={{
        image: {
          sizes: '(min-width: 45em) 50vw, 100vw',
          width: 300,
          height: 300,
        },
      }}
    />
  );
}
