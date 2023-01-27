import {flattenConnection} from '@shopify/storefront-kit-react';
import type {ProductConnection} from '@shopify/storefront-kit-react/storefront-api-types';

export function ProductList({
  productConnection,
}: {
  productConnection: ProductConnection;
}) {
  const products = flattenConnection(productConnection);
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>{product.title}</li>
      ))}
    </ul>
  );
}
