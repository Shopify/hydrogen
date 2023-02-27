import {CartLineQuantity, CartLineProvider} from '@shopify/hydrogen-react';

export function Example({line}) {
  return (
    <CartLineProvider line={line}>
      <CartLineQuantity />
    </CartLineProvider>
  );
}
