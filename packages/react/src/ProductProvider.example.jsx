import {ProductProvider} from '@shopify/storefront-kit-react';

export function Product({product}) {
  return (
    <ProductProvider data={product} initialVariantId="some-id">
      {/* Your JSX */}
    </ProductProvider>
  );
}
