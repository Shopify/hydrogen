import {UNSTABLE_Analytics} from '@shopify/hydrogen';

export default function CartView() {
  return (
    <div className="cart">
      <h1>Cart</h1>
      <UNSTABLE_Analytics.CartView />
    </div>
  );
}
