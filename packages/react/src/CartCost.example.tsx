import {CartCost} from '@shopify/storefront-kit-react';

export default function CartTotals() {
  return (
    <>
      <div>
        Subtotal: <CartCost amountType="subtotal" />
      </div>
      <div>
        Tax: <CartCost amountType="tax" />
      </div>
      <div>
        Total: <CartCost />
      </div>
    </>
  );
}
