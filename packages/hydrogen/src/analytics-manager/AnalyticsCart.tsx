import { useEffect } from "react";
import { type CartReturn } from "../cart/queries/cart-types";
import { useAnalyticsProvider } from "./AnalyticsProvider";

let isFirstLoad = false;
export function AnalyticsCart({
  currentCart,
}: {
  currentCart: CartReturn | null;
}) {
  const {publish, getCartRef} = useAnalyticsProvider();
  const cartRef = getCartRef();
  const previousCart = cartRef.current;

  useEffect(() => {
    cartRef.current = currentCart;
    if (!isFirstLoad) {
      isFirstLoad = true;
      return;
    }
    if (!currentCart) return;

    publish('cart_updated', {
      currentCart,
      previousCart,
    })

  }, [previousCart, currentCart]);
  return null;
}
