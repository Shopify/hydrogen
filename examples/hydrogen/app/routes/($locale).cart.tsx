import { CartMain } from "~/components/CartMain";
import { cartHandlers } from "~/lib/cart-handlers";

import type { Route } from "./+types/($locale).cart";

// Renders the cart without JavaScript. The root CartProvider seeds from this data.
export async function loader({ context }: Route.LoaderArgs) {
  const { data } = await cartHandlers.get({ storefrontClient: context.storefront });
  return { cartData: data };
}

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
