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
  const [lastCartUpdated, setLastCartUpdated] = useState<string | null>(null);

  // resolve the cart
  useEffect(() => {
    Promise.resolve(currentCart).then(setCart);
    return () => {};
  }, [setCart, currentCart, cart]);

  useEffect(() => {
    cartRef.current = cart;
    if (!isFirstLoad) {
      isFirstLoad = true;
      setLastCartUpdated(cart?.updatedAt || null);
      return;
    }
    if (!cart) return;
    if(lastCartUpdated !== cart.updatedAt) {
      setLastCartUpdated(cart.updatedAt);

      publish('cart_updated', {
        currentCart: cart,
        previousCart,
      })
    }

  }, [previousCart, cart]);
  return null;
}
