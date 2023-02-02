import {CartProvider, useCart} from '@shopify/hydrogen-react';
import type {CartLineInput} from '@shopify/hydrogen-react/storefront-api-types';

export function App() {
  <CartProvider
    onLineAdd={() => {
      console.log('a line is being added');
    }}
    onLineAddComplete={() => {
      console.log('a line has been added');
    }}
  >
    <CartComponent />
  </CartProvider>;
}

function CartComponent() {
  const {linesAdd, status} = useCart();

  const merchandise: CartLineInput = {merchandiseId: '{id-here}'};

  return (
    <div>
      Cart Status: {status}
      <button onClick={() => linesAdd([merchandise])}>Add Line</button>
    </div>
  );
}
