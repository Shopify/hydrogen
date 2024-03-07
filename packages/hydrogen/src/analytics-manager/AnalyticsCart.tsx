import { useEffect, useState } from "react";
import { type CartReturn } from "../cart/queries/cart-types";
import { useAnalyticsProvider } from "./AnalyticsProvider";

let isFirstLoad = false;
export function AnalyticsCart({
  currentCart,
}: {
  currentCart: Promise<CartReturn | null> | CartReturn | null;
}) {
  const {publish, getCartRef} = useAnalyticsProvider();
  const cartRef = getCartRef();
  const previousCart = cartRef.current;

  const [cart, setCart] = useState<CartReturn | null>(null);

  // resolve the cart (if it's a promise) and set it or just set it if it's not a promise
  useEffect(() => {
    Promise.resolve(currentCart).then(setCart);
    return () => {};
  }, [setCart, currentCart, cart]);

  useEffect(() => {
    cartRef.current = cart;
    if (!isFirstLoad) {
      isFirstLoad = true;
      return;
    }
    if (!cart) return;

    publish('cart_updated', {
      currentCart: cart,
      previousCart,
    })

  }, [previousCart, currentCart]);
  return null;
}
