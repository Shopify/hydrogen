import {CartLineProvider, useCartLine} from '@shopify/storefront-kit-react';

export function CartWrapper({cart}) {
  const firstCartLine = cart.lines.nodes[0];
  return (
    <CartLineProvider line={firstCartLine}>
      <CartLineQuantity />
    </CartLineProvider>
  );
}

function CartLineQuantity() {
  const cartLine = useCartLine();

  return <div>{cartLine.quantity}</div>;
}
