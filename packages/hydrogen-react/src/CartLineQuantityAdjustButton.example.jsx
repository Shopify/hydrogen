import {
  CartLineQuantityAdjustButton,
  CartLineProvider,
  CartProvider,
} from '@shopify/hydrogen-react';

export function Example({line}) {
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
