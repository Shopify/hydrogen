import {ProductProvider} from '@shopify/hydrogen-react';
import type {Product} from '@shopify/hydrogen-react/storefront-api-types';

export function Product({product}: {product: Product}) {
  return (
    <ProductProvider data={product} initialVariantId="some-id">
      {/* Your JSX */}
    </ProductProvider>
  );
}
