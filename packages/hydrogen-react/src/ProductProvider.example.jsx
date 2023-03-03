import {ProductProvider} from '@shopify/hydrogen-react';

export function Product({product}) {
  return (
    <ProductProvider data={product} initialVariantId="some-id">
      {/* Your JSX */}
    </ProductProvider>
  );
}
