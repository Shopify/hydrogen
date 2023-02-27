import {Video} from '@shopify/hydrogen-react';
import type {ProductConnection} from '@shopify/hydrogen-react/storefront-api-types';

export default function MyProductVideo({
  products,
}: {
  products: ProductConnection;
}) {
  const firstMediaElement = products.edges[0].node.media.edges[0].node;

  if (firstMediaElement.__typename === 'Video') {
    return <Video data={firstMediaElement} />;
  }
}
