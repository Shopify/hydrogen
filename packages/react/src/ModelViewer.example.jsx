import {ModelViewer} from '@shopify/storefront-kit-react';

export default function MyProductModel({products}) {
  const firstMediaElement = products.nodes[0].media.nodes[0];

  if (firstMediaElement.__typename === 'Model3d') {
    return <ModelViewer data={firstMediaElement} />;
  }
}
