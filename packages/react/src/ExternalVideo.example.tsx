import {ExternalVideo} from '@shopify/hydrogen-react';
import type {ProductConnection} from '@shopify/hydrogen-react/storefront-api-types';

export default function MyProductVideo({
  products,
}: {
  products: ProductConnection;
}) {
  const firstMediaElement = products.nodes[0].media.nodes[0];
  if (firstMediaElement.__typename === 'ExternalVideo') {
    return <ExternalVideo data={firstMediaElement} />;
  }
}
