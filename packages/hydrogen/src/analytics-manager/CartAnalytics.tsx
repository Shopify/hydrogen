import {useEffect, useRef} from 'react';
import {
  useAnalytics,
  type AnalyticsProviderProps,
  type Carts,
} from './AnalyticsProvider';
import {type CartUpdatePayload} from './AnalyticsView';

export function CartAnalytics({
  cart: currentCart,
}: {
  cart: AnalyticsProviderProps['cart'];
}) {
  const {publish, shop, customData, canTrack, cart, prevCart, setCarts} =
    useAnalytics();
  const lastEventId = useRef<string | null>(null);

  // resolve the cart that could have been deferred
  useEffect(() => {
    if (!currentCart) return;
    Promise.resolve(currentCart).then((updatedCart) => {
      setCarts(({cart, prevCart}: Carts) => {
        if (updatedCart?.updatedAt !== cart?.updatedAt)
          return {cart: updatedCart, prevCart: cart};
        return {cart, prevCart};
      });
    });
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

    publish('cart_updated', payload);

    // We store the last cart update timestamp in localStorage to be able
    // to detect if the cart has been updated since the last page render
    // this prevents sending duplicate cart_updated events on first render
    localStorage.setItem('cartLastUpdatedAt', cart.updatedAt);

    // Detect quantity changes and missing cart lines
    prevCart?.lines?.nodes?.forEach((prevLine) => {
      const matchedLineId = cart?.lines.nodes.filter(
        (line) => prevLine.id === line.id,
      );
      if (matchedLineId?.length === 1) {
        const matchedLine = matchedLineId[0];
        if (prevLine.quantity < matchedLine.quantity) {
          publish('product_added_to_cart', {
            ...payload,
            prevLine,
            currentLine: matchedLine,
          });
        } else if (prevLine.quantity > matchedLine.quantity) {
          publish('product_removed_from_cart', {
            ...payload,
            prevLine,
            currentLine: matchedLine,
          });
        }
      } else {
        publish('product_removed_from_cart', {
          ...payload,
          prevLine,
        });
      }
    });

    // Detect added to cart
    cart?.lines?.nodes?.forEach((line) => {
      const matchedLineId = prevCart?.lines.nodes.filter(
        (previousLine) => line.id === previousLine.id,
      );
      if (!matchedLineId || matchedLineId.length === 0) {
        publish('product_added_to_cart', {
          ...payload,
          currentLine: line,
        });
      }
    });
  }, [cart, prevCart, setCarts, publish, shop, customData, canTrack]);

  return null;
}
