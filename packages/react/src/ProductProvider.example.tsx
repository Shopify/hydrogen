import {ProductProvider} from '@shopify/storefront-kit-react';
import type {Product} from '@shopify/storefront-kit-react/storefront-api-types';

export function Product({product}: {product: Product}) {
  return (
    <ProductProvider data={product} initialVariantId="some-id">
      {/* Your JSX */}
    </ProductProvider>
  );
}
