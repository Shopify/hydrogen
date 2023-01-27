import {flattenConnection} from '@shopify/storefront-kit-react';

export function ProductList({productConnection}) {
  const products = flattenConnection(productConnection);
  return (
    <ul>
      {products.map((product) => (
        <li key={product.id}>{product.title}</li>
      ))}
    </ul>
  );
}
