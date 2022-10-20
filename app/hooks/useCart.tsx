import {useParentRouteData} from './useRouteData';

import type {Cart} from '@shopify/hydrogen-ui-alpha/storefront-api-types';

/*
  This is an experimental pattern that helps prevent props drilling
*/
export function useCart(): Cart | null {
  const rootData = useParentRouteData('/');

  if (typeof rootData?.cart === 'undefined') {
    return null;
  }

  if (rootData?.cart?._data) {
    return rootData?.cart?._data;
  }

  throw rootData?.cart;
}
