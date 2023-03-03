import {MediaFile} from '@shopify/hydrogen-react';

export function ProductsMediaFiles({products}) {
  return (
    <ul>
      {products.nodes.map((product) => {
        return <MediaFile data={product.media.nodes[0]} key={product.id} />;
      })}
    </ul>
  );
}
