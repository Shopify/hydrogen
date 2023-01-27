import {CartProvider, useCart} from '@shopify/storefront-kit-react';

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

  const merchandise = {merchandiseId: '{id-here}'};

  return (
    <div>
      Cart Status: {status}
      <button onClick={() => linesAdd([merchandise])}>Add Line</button>
    </div>
  );
}
