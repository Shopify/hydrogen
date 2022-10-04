import {useParentRouteData} from './useRouteData';

import type {
  Cart,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";

export function useCart(): Cart | undefined {
  const rootData = useParentRouteData('/');

  return rootData?.cart?._data
}
