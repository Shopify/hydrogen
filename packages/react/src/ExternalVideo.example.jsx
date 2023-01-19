import {ExternalVideo} from '@shopify/storefront-kit-react';

export default function MyProductVideo({products}) {
  const firstMediaElement = products.nodes[0].media.nodes[0];

  if (firstMediaElement.__typename === 'ExternalVideo') {
    return <ExternalVideo data={firstMediaElement} />;
  }
}
