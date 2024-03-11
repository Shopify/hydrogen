import { useEffect, useRef, useState } from "react";
import { type CartReturn } from "../cart/queries/cart-types";
import { useAnalyticsProvider } from "./AnalyticsProvider";

export function AnalyticsCart({
  cart: currentCart,
}: {
  cart: Promise<CartReturn | null> | CartReturn | null;
}) {
  const {publish} = useAnalyticsProvider();
  const prevCartRef = useRef<CartReturn | null>(null);
  const [cart, setCart] = useState<CartReturn | null>(null);

  // resolve the cart that could have been deferred
  useEffect(() => {
    Promise.resolve(currentCart).then(setCart);
    return () => {};
  }, [setCart, currentCart]);

  useEffect(() => {
    if (!cart) return;
    if (cart?.updatedAt === prevCartRef.current?.updatedAt) return;

    publish('cart_updated', {
      currentCart: cart,
      previousCart: JSON.parse(JSON.stringify(prevCartRef.current)),
    })

    prevCartRef.current = cart;
  });
  return null;
}
