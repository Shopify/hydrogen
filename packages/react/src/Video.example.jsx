import {Video} from '@shopify/storefront-kit-react';

export default function MyProductVideo({products}) {
  const firstMediaElement = products.edges[0].node.media.edges[0].node;

  if (firstMediaElement.__typename === 'Video') {
    return <Video data={firstMediaElement} />;
  }
}
