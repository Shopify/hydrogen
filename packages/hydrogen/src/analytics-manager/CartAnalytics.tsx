import {useEffect, useRef} from 'react';
import {
  useAnalytics,
  type AnalyticsProviderProps,
  type Carts,
} from './AnalyticsProvider';
import {type CartUpdatePayload} from './AnalyticsView';
import {flattenConnection} from '@shopify/hydrogen-react';

function logMissingField(fieldName: string) {
  // eslint-disable-next-line no-console
  console.error(
    `[h2:error:CartAnalytics] Can't set up cart analytics events because the \`cart.${fieldName}\` value is missing from your GraphQL cart query. In your project, search for where \`fragment CartApiQuery on Cart\` is defined and make sure \`${fieldName}\` is part of your cart query. Check the Hydrogen Skeleton template for reference: https://github.com/Shopify/hydrogen/blob/main/templates/skeleton/app/lib/fragments.ts#L59.`,
  );
}

type CartStorage = {
  updatedAt: string;
  id: string;
};

export function CartAnalytics({
  cart: currentCart,
  setCarts,
}: {
  cart: AnalyticsProviderProps['cart'];
  setCarts: React.Dispatch<React.SetStateAction<Carts>>;
}) {
  const {publish, shop, customData, canTrack, cart, prevCart} = useAnalytics();
  const lastEventId = useRef<string | null>(null);

  // resolve the cart that could have been deferred
  useEffect(() => {
    if (!currentCart) return;

    Promise.resolve(currentCart).then((updatedCart) => {
      if (updatedCart && updatedCart.lines) {
        if (!updatedCart.id) {
          logMissingField('id');
          return;
        }
        if (!updatedCart.updatedAt) {
          logMissingField('updatedAt');
          return;
        }
      }

      setCarts(({cart, prevCart}: Carts) => {
        return updatedCart?.updatedAt !== cart?.updatedAt
          ? {cart: updatedCart, prevCart: cart}
          : {cart, prevCart};
      });
    });
    return () => {};
  }, [setCarts, currentCart]);

  useEffect(() => {
    if (!cart || !cart?.updatedAt) return;
    if (cart?.updatedAt === prevCart?.updatedAt) return;

    let cartLastUpdatedAt: CartStorage | null;
    try {
      cartLastUpdatedAt = JSON.parse(
        localStorage.getItem('cartLastUpdatedAt') || '',
      );
    } catch (e) {
      cartLastUpdatedAt = null;
    }

    if (
      cart.id === cartLastUpdatedAt?.id &&
      cart.updatedAt === cartLastUpdatedAt?.updatedAt
    )
      return;

    const payload: CartUpdatePayload = {
      eventTimestamp: Date.now(),
      cart,
      prevCart,
      shop,
      customData,
    };

    // prevent duplicate events
    // TODO: add cart id check
    if (cart.updatedAt === lastEventId.current) return;
    lastEventId.current = cart.updatedAt;

    publish('cart_updated', payload);

    // We store the last cart update timestamp in localStorage to be able
    // to detect if the cart has been updated since the last page render
    // this prevents sending duplicate cart_updated events on first render
    localStorage.setItem(
      'cartLastUpdatedAt',
      JSON.stringify({
        id: cart.id,
        updatedAt: cart.updatedAt,
      }),
    );

    const previousCartLines = prevCart?.lines
      ? flattenConnection(prevCart?.lines)
      : [];
    const currentCartLines = cart.lines ? flattenConnection(cart.lines) : [];

    // Detect quantity changes and missing cart lines
    previousCartLines?.forEach((prevLine) => {
      const matchedLineId = currentCartLines.filter(
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
    currentCartLines?.forEach((line) => {
      const matchedLineId = previousCartLines.filter(
        (previousLine) => line.id === previousLine.id,
      );
      if (!matchedLineId || matchedLineId.length === 0) {
        publish('product_added_to_cart', {
          ...payload,
          currentLine: line,
        });
      }
    });
  }, [cart, prevCart, publish, shop, customData, canTrack]);

  return null;
}
