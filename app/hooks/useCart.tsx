import {useParentRouteData} from './useRouteData';

import type {
  Cart,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";

export function useCart(): Cart | undefined {
  const rootData = useParentRouteData('/');

  if (rootData?.cart?._data) {
    return rootData?.cart?._data;
  }

  throw rootData?.cart ?? new Promise(() => {})
}
