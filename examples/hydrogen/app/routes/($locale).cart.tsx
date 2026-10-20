import { CartMain } from "~/components/CartMain";

import type { Route } from "./+types/($locale).cart";

export const meta: Route.MetaFunction = () => {
  return [{ title: `Hydrogen | Cart` }];
};

export default function Cart() {
  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" />
    </div>
  );
}
