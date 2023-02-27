import {MediaFile} from '@shopify/hydrogen-react';
import type {ProductConnection} from '@shopify/hydrogen-react/storefront-api-types';

export function ProductsMediaFiles({products}: {products: ProductConnection}) {
  return (
    <ul>
      {products.nodes.map((product) => {
        return <MediaFile data={product.media.nodes[0]} key={product.id} />;
      })}
    </ul>
  );
}
