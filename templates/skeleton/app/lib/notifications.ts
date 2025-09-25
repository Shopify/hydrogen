import {useFetchers} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {type CartActionReturnType} from '~/routes/cart';

export function useCartNotification(): null | CartActionReturnType {
  const fetchers = useFetchers();

  if (!fetchers || !fetchers.length) return null;

  function isCartAction(fetcherKey: string) {
    const cartActions = Object.keys(CartForm.ACTIONS);

    return cartActions
      .filter((actionKey) => {
        return fetcherKey.includes(actionKey);
      })
      .filter(Boolean).length;
  }

  const cartFetchers = fetchers
    .filter(({key, data}) => {
      if (!isCartAction(key)) return null;
      return data;
    })
    .filter(Boolean);

  let data = null;
  if (Array.isArray(cartFetchers)) {
    data = cartFetchers?.[0]?.data;
  }

  return data;
}
