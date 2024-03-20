import {useEffect, useRef} from "react";
import {useAnalytics, type AnalyticsProviderProps, type Carts} from "./AnalyticsProvider";
import {type CartUpdatePayload} from "./AnalyticsView";

export function CartAnalytics({cart: currentCart}: {cart: AnalyticsProviderProps['cart']}) {
  const {publish, shop, customData, canTrack, cart, prevCart, setCarts} = useAnalytics();
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

    const cartLastUpdatedAt = localStorage.getItem('cartLastUpdatedAt');
    if (cart.updatedAt === cartLastUpdatedAt) return;

    const payload: CartUpdatePayload = {
      eventTimestamp: Date.now(),
      cart,
      prevCart,
      shop,
      customData,
    };

    // prevent duplicate events
    if (cart.updatedAt === lastEventId.current) return;
    lastEventId.current = cart.updatedAt;

    publish('cart_updated', payload)

    // We store the last cart update timestamp in localStorage to be able
    // to detect if the cart has been updated since the last page render
    // this prevents sending duplicate cart_updated events on first render
    localStorage.setItem('cartLastUpdatedAt', cart.updatedAt);
  }, [cart, prevCart, setCarts, publish, shop, customData, canTrack]);

  return null;
}
