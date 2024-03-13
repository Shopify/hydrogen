import {useEffect, useRef} from "react";
import {useAnalyticsProvider, type AnalyticsProviderProps, type Carts} from "./AnalyticsProvider";
import {type CartUpdatePayload} from "./AnalyticsView";

export function CartAnalytics({cart: currentCart}: {cart: AnalyticsProviderProps['cart']}) {
  const {publish, shop, customPayload, canTrack, cart, prevCart, setCarts} = useAnalyticsProvider();
  const lastEventId = useRef<string | null>(null);

  // resolve the cart that could have been deferred
  useEffect(() => {
    if (!currentCart) return;
    Promise.resolve(currentCart).then((updatedCart) => {
      setCarts(({cart, prevCart}: Carts) => {
        if (updatedCart?.updatedAt !== cart?.updatedAt) return {cart: updatedCart, prevCart: cart};
        return {cart, prevCart};
      })
    })
    return () => {};
  }, [setCarts, currentCart]);


  useEffect(() => {
    if (!cart || !cart?.updatedAt) return;
    if (cart?.updatedAt === prevCart?.updatedAt) return;

    const payload: CartUpdatePayload = {
      eventTimestamp: Date.now(),
      cart,
      prevCart,
      shop,
      customPayload,
    };

    // prevent duplicate events
    if (cart.updatedAt === lastEventId.current) return;
    lastEventId.current = cart.updatedAt;

    publish('cart_updated', payload)
  }, [cart, prevCart, setCarts, publish, shop, customPayload, canTrack]);

  return null;
}
