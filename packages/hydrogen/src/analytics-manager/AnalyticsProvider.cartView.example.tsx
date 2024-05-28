import {Analytics} from '@shopify/hydrogen';

export default function CartView() {
  return (
    <div className="cart">
      <h1>Cart</h1>
      <Analytics.CartView />
    </div>
  );
}
