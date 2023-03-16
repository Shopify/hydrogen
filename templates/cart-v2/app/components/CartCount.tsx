import {Link} from '@remix-run/react';
import {useCart} from '~/lib/cart/hooks';

export function CartCount() {
  const cart = useCart();
  return (
    <div>
      <Link to="/cart">Cart: {cart?.totalQuantity}</Link>
    </div>
  );
}
