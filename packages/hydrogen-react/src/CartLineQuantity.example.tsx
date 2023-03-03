import {CartLineQuantity, CartLineProvider} from '@shopify/hydrogen-react';
import type {CartLine} from '@shopify/hydrogen-react/storefront-api-types';

export function Example({line}: {line: CartLine}) {
  return (
    <CartLineProvider line={line}>
      <CartLineQuantity />
    </CartLineProvider>
  );
}
