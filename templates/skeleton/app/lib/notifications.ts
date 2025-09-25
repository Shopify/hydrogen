import {useFetcher, useFetchers} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {type CartActionReturnType} from '~/routes/cart';

export function useCartNotification(): null | CartActionReturnType {
  const {data: linesAdd} = useFetcher({key: CartForm.ACTIONS.LinesAdd});

  // these two fetchers set dynamic fetcherkeys so they won't be matched. :(
  const {data: linesUpdate} = useFetcher({key: CartForm.ACTIONS.LinesUpdate});
  const {data: linesRemove} = useFetcher({key: CartForm.ACTIONS.LinesRemove});

  const {data: giftCardCodesRemove} = useFetcher({
    key: CartForm.ACTIONS.GiftCardCodesRemove,
  });
  const {data: giftCardCodesUpdate} = useFetcher({
    key: CartForm.ACTIONS.GiftCardCodesUpdate,
  });
  const {data: deliveryAddressesAdd} = useFetcher({
    key: CartForm.ACTIONS.DeliveryAddressesAdd,
  });
  const {data: deliveryAddressesUpdate} = useFetcher({
    key: CartForm.ACTIONS.DeliveryAddressesUpdate,
  });
  const {data: deliveryAddressesRemove} = useFetcher({
    key: CartForm.ACTIONS.DeliveryAddressesRemove,
  });
  const {data: buyerIdentityUpdate} = useFetcher({
    key: CartForm.ACTIONS.BuyerIdentityUpdate,
  });
  const {data: discountCodesUpdate} = useFetcher({
    key: CartForm.ACTIONS.DiscountCodesUpdate,
  });
  const {data: noteUpdate} = useFetcher({
    key: CartForm.ACTIONS.NoteUpdate,
  });
  const {data: selectedDeliveryOptionsUpdate} = useFetcher({
    key: CartForm.ACTIONS.SelectedDeliveryOptionsUpdate,
  });
  const {data: metafieldsSet} = useFetcher({
    key: CartForm.ACTIONS.MetafieldsSet,
  });
  const {data: metafieldDelete} = useFetcher({
    key: CartForm.ACTIONS.MetafieldDelete,
  });

  return (
    linesAdd ||
    linesUpdate ||
    linesRemove ||
    giftCardCodesRemove ||
    giftCardCodesUpdate ||
    deliveryAddressesAdd ||
    deliveryAddressesRemove ||
    deliveryAddressesUpdate ||
    discountCodesUpdate ||
    noteUpdate ||
    selectedDeliveryOptionsUpdate ||
    metafieldDelete ||
    metafieldsSet ||
    buyerIdentityUpdate
  );
}

/* Alternative method with useFetchers (whcih would handle dynamic fetcherKeys) but the matched fetcher gets unmounted and data get lost on the next render (need to investigate why) */
// export function useCartNotification(): null | CartActionReturnType {
//   const fetchers = useFetchers();
//
//   if (!fetchers || !fetchers.length) return null;
//
//   function isCartAction(fetcherKey: string) {
//     const cartActions = Object.keys(CartForm.ACTIONS);
//
//     return cartActions
//       .filter((actionKey) => {
//         return fetcherKey.includes(actionKey);
//       })
//       .filter(Boolean).length;
//   }
//
//   const cartFetchers = fetchers
//     .filter(({key, data}) => {
//       if (!isCartAction(key)) return null;
//       return data;
//     })
//     .filter(Boolean);
//
//   let data = null;
//   if (Array.isArray(cartFetchers)) {
//     data = cartFetchers?.[0]?.data;
//   }
//
//   return data;
//
// }
