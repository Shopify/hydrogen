import {
  CartLineQuantityAdjustButton,
  CartLineProvider,
  CartProvider,
} from '@shopify/hydrogen-react';
import type {CartLine} from '@shopify/hydrogen-react/storefront-api-types';

export function Example({line}: {line: CartLine}) {
  return (
    <CartProvider>
      <CartLineProvider line={line}>
        <CartLineQuantityAdjustButton adjust="increase">
          Increase
        </CartLineQuantityAdjustButton>
        <CartLineQuantityAdjustButton adjust="decrease">
          Decrease
        </CartLineQuantityAdjustButton>
        <CartLineQuantityAdjustButton adjust="remove">
          Remove
        </CartLineQuantityAdjustButton>
      </CartLineProvider>
    </CartProvider>
  );
}
