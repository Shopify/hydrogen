import {ModelViewer} from '@shopify/storefront-kit-react';
import type {ProductConnection} from '@shopify/storefront-kit-react/storefront-api-types';

export default function MyProductModel({
  products,
}: {
  products: ProductConnection;
}) {
  const firstMediaElement = products.nodes[0].media.nodes[0];
  if (firstMediaElement.__typename === 'Model3d') {
    return <ModelViewer data={firstMediaElement} />;
  }
}
